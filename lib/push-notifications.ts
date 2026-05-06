import "server-only";

import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign as signCrypto } from "crypto";
import { executeQuery, queryRows, type DbRow } from "@/lib/db";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  vibrate?: number[];
};

type PushRow = DbRow & {
  user_id?: unknown;
  endpoint?: unknown;
  payload?: unknown;
};

type BrowserPushSubscription = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export async function notifyUser(userId: number, payload: PushPayload) {
  if (!userId) return;
  const rows = await queryRows<PushRow>("SELECT user_id, endpoint, payload FROM push_subscriptions WHERE user_id = ?", [userId]);
  await sendPushRows(rows, payload);
}

export async function notifyUsersByRole(role: "user" | "admin", payload: PushPayload) {
  const rows = await queryRows<PushRow>(
    `
      SELECT ps.user_id, ps.endpoint, ps.payload
      FROM push_subscriptions ps
      JOIN users u ON u.id = ps.user_id
      WHERE u.role = ?
    `,
    [role],
  );
  await sendPushRows(rows, payload);
}

export async function notifyAdmins(payload: PushPayload) {
  await notifyUsersByRole("admin", { url: "/admin", tag: "konnectly-admin-action", ...payload });
}

async function sendPushRows(rows: PushRow[], payload: PushPayload) {
  if (!rows.length || !getVapidConfig()) return;

  await Promise.all(
    rows.map(async (row) => {
      const endpoint = str(row.endpoint);
      try {
        const result = await sendWebPush(parseSubscription(row.payload), payload);
        if (result === "gone") await deleteSubscription(endpoint);
      } catch (error) {
        console.warn("Push notification failed:", error);
      }
    }),
  );
}

async function sendWebPush(subscription: BrowserPushSubscription | null, payload: PushPayload) {
  const vapid = getVapidConfig();
  if (!vapid || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) return "skipped";

  const body = encryptPushPayload(subscription, JSON.stringify(payload));
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${createVapidJwt(subscription.endpoint, vapid)}, k=${vapid.publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "2419200",
      Urgency: "normal",
    },
    body,
  });

  if (response.status === 404 || response.status === 410) return "gone";
  if (!response.ok) throw new Error(`Push service returned ${response.status}`);
  return "sent";
}

function encryptPushPayload(subscription: BrowserPushSubscription, value: string) {
  const userPublicKey = base64UrlToBuffer(subscription.keys?.p256dh ?? "");
  const authSecret = base64UrlToBuffer(subscription.keys?.auth ?? "");
  const localKey = createECDH("prime256v1");
  localKey.generateKeys();
  const serverPublicKey = localKey.getPublicKey();
  const sharedSecret = localKey.computeSecret(userPublicKey);
  const salt = randomBytes(16);

  const prkKey = hmac(authSecret, sharedSecret);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), userPublicKey, serverPublicKey]));
  const prk = hmac(salt, ikm);
  const contentEncryptionKey = hkdfExpand(prk, "Content-Encoding: aes128gcm\0", 16);
  const nonce = hkdfExpand(prk, "Content-Encoding: nonce\0", 12);
  const plaintext = Buffer.concat([Buffer.from(value, "utf8"), Buffer.from([0x02])]);
  const cipher = createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21 + serverPublicKey.length);

  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header[20] = serverPublicKey.length;
  serverPublicKey.copy(header, 21);

  return Buffer.concat([header, ciphertext]);
}

function createVapidJwt(endpoint: string, vapid: VapidConfig) {
  const audience = new URL(endpoint).origin;
  const publicKey = base64UrlToBuffer(vapid.publicKey);
  const privateKey = base64UrlToBuffer(vapid.privateKey);
  const key = createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      x: toBase64Url(publicKey.subarray(1, 33)),
      y: toBase64Url(publicKey.subarray(33, 65)),
      d: toBase64Url(privateKey),
    },
  });
  const header = toBase64Url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = toBase64Url(Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: vapid.subject })));
  const unsigned = `${header}.${claims}`;
  const signature = signCrypto("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");

  return `${unsigned}.${signature}`;
}

function parseSubscription(value: unknown): BrowserPushSubscription | null {
  try {
    if (typeof value === "string") return JSON.parse(value) as BrowserPushSubscription;
    if (value && typeof value === "object") return value as BrowserPushSubscription;
  } catch {
    return null;
  }
  return null;
}

async function deleteSubscription(endpoint: string) {
  if (!endpoint) return;
  await executeQuery("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
}

function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT || "mailto:admin@konnectly.com",
  };
}

function hkdfExpand(prk: Buffer, info: string, length: number) {
  return hmac(prk, Buffer.concat([Buffer.from(info, "utf8"), Buffer.from([1])])).subarray(0, length);
}

function hmac(key: Buffer, value: Buffer) {
  return createHmac("sha256", key).update(value).digest();
}

function base64UrlToBuffer(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function toBase64Url(value: Buffer) {
  return value.toString("base64url");
}

function str(value: unknown) {
  return value == null ? "" : String(value);
}

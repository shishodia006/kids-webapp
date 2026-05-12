import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign as signCrypto } from "crypto";
import { readFileSync } from "fs";
import { Client } from "pg";

loadEnv();

const connectionString = process.env.DATABASE_URL;
const vapid = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "",
  privateKey: process.env.VAPID_PRIVATE_KEY || "",
  subject: process.env.VAPID_SUBJECT || "mailto:admin@konnectly.com",
};

if (!connectionString) throw new Error("DATABASE_URL missing.");
if (!vapid.publicKey || !vapid.privateKey) throw new Error("VAPID keys missing.");

const client = new Client({
  connectionString,
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10_000,
});

try {
  await client.connect();
  const kidResult = await client.query(
    `
      SELECT k.id, k.child_name, k.status, u.id AS parent_id, u.parent_name
      FROM kids k
      JOIN users u ON u.id = k.parent_id
      WHERE lower(k.child_name) = 'rinkal'
      ORDER BY k.id DESC
      LIMIT 1
    `,
  );
  const kid = kidResult.rows[0];
  if (!kid) throw new Error("Rinkal profile not found.");

  const subscriptions = await client.query("SELECT id, endpoint, payload FROM push_subscriptions WHERE user_id = $1 ORDER BY updated_at DESC", [kid.parent_id]);
  if (!subscriptions.rows.length) throw new Error(`No push subscriptions found for user ${kid.parent_id}.`);

  const payload = {
    title: "Child profile approved",
    body: `${kid.child_name}'s profile has been approved. You can now register for events and activities.`,
    url: "/app?tab=Account",
    tag: `kid-status-${kid.id}-approved-test-${Date.now()}`,
    vibrate: [200, 100, 200],
  };

  const results = await Promise.all(
    subscriptions.rows.map(async (row) => {
      const endpoint = String(row.endpoint || "");
      const result = await sendWebPush(JSON.parse(row.payload), payload).catch((error) => `failed: ${error.message || error}`);
      if (result === "gone") await client.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
      return { id: row.id, host: endpointHost(endpoint), result };
    }),
  );

  console.log(JSON.stringify({ kid, results }, null, 2));
} finally {
  await client.end().catch(() => undefined);
}

async function sendWebPush(subscription, payload) {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) return "skipped";

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${createVapidJwt(subscription.endpoint)}, k=${vapid.publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "2419200",
      Urgency: "high",
    },
    body: encryptPushPayload(subscription, JSON.stringify(payload)),
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 404 || response.status === 410) return "gone";
  if (!response.ok) throw new Error(`Push service returned ${response.status}: ${await response.text().catch(() => "")}`);
  return "sent";
}

function encryptPushPayload(subscription, value) {
  const userPublicKey = base64UrlToBuffer(subscription.keys.p256dh);
  const authSecret = base64UrlToBuffer(subscription.keys.auth);
  const localKey = createECDH("prime256v1");
  localKey.generateKeys();
  const serverPublicKey = localKey.getPublicKey();
  const sharedSecret = localKey.computeSecret(userPublicKey);
  const salt = randomBytes(16);
  const prkKey = hmac(authSecret, sharedSecret);
  const ikm = hkdfExpandBuffer(prkKey, Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), userPublicKey, serverPublicKey]), 32);
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

function createVapidJwt(endpoint) {
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

function hkdfExpand(prk, info, length) {
  return hkdfExpandBuffer(prk, Buffer.from(info, "utf8"), length);
}

function hkdfExpandBuffer(prk, info, length) {
  return hmac(prk, Buffer.concat([info, Buffer.from([1])])).subarray(0, length);
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function base64UrlToBuffer(value) {
  return Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function toBase64Url(value) {
  return value.toString("base64url");
}

function endpointHost(endpoint) {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown-endpoint";
  }
}

function loadEnv() {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!match) continue;
    const name = match[1].trim();
    if (process.env[name]) continue;
    process.env[name] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

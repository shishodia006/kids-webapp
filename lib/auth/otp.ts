import "server-only";

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

export const OTP_TTL_SECONDS = 5 * 60;
const OTP_TTL_MS = OTP_TTL_SECONDS * 1000;
const OTP_SIGNING_VERSION = 1;
const SEND_LIMIT_WINDOW_MS = 60 * 1000;
const SEND_LIMIT_MAX = 1;
const VERIFY_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_LIMIT_MAX = 3;

type OtpPurpose = "login" | "register";

type OtpPayload = {
  v: number;
  phone: string;
  purpose: OtpPurpose;
  codeHash: string;
  nonce: string;
  expiresAt: number;
  issuedAt: number;
};

type RateRecord = {
  count: number;
  resetAt: number;
};

const globalForOtp = globalThis as typeof globalThis & {
  konnectlyOtpRateLimits?: Map<string, RateRecord>;
  konnectlyUsedOtpTokens?: Map<string, number>;
};

const rateLimits = globalForOtp.konnectlyOtpRateLimits ?? new Map<string, RateRecord>();
globalForOtp.konnectlyOtpRateLimits = rateLimits;
const usedOtpTokens = globalForOtp.konnectlyUsedOtpTokens ?? new Map<string, number>();
globalForOtp.konnectlyUsedOtpTokens = usedOtpTokens;

export function normalizeIndianPhone(phone: unknown) {
  if (typeof phone !== "string") return null;

  const digits = phone.replace(/\D/g, "");
  const withoutCountryCode = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;

  if (!/^[6-9]\d{9}$/.test(withoutCountryCode)) return null;

  return withoutCountryCode;
}

export function createOtp(phone: string, purpose: OtpPurpose) {
  const code = randomInt(100000, 1000000).toString();
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = Date.now() + OTP_TTL_MS;
  const payload: OtpPayload = {
    v: OTP_SIGNING_VERSION,
    phone,
    purpose,
    codeHash: hashOtp(code, nonce),
    nonce,
    expiresAt,
    issuedAt: Date.now(),
  };

  return { code, requestId: signOtpPayload(payload), expiresAt };
}

export function verifyOtp({
  requestId,
  phone,
  purpose,
  code,
}: {
  requestId: unknown;
  phone: string;
  purpose: OtpPurpose;
  code: unknown;
}) {
  if (typeof requestId !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { ok: false as const, message: "Please enter the 6-digit OTP." };
  }

  const payload = readOtpPayload(requestId);

  if (!payload || payload.phone !== phone || payload.purpose !== purpose) {
    return { ok: false as const, message: "OTP session not found. Please request a new OTP." };
  }

  cleanupUsedOtpTokens();

  if (usedOtpTokens.has(hashToken(requestId))) {
    return { ok: false as const, message: "OTP already used. Please request a new OTP." };
  }

  if (Date.now() > payload.expiresAt) {
    return { ok: false as const, message: "OTP expired. Please request a new OTP." };
  }

  if (!safeEqual(payload.codeHash, hashOtp(code, payload.nonce))) {
    return { ok: false as const, message: "Incorrect OTP. Please try again." };
  }

  usedOtpTokens.set(hashToken(requestId), payload.expiresAt);
  return { ok: true as const, message: "OTP verified." };
}

export function consumeOtpRateLimit(key: string, action: "send" | "verify") {
  const now = Date.now();
  const windowMs = action === "send" ? SEND_LIMIT_WINDOW_MS : VERIFY_LIMIT_WINDOW_MS;
  const max = action === "send" ? SEND_LIMIT_MAX : VERIFY_LIMIT_MAX;
  const rateKey = `${action}:${key}`;
  const current = rateLimits.get(rateKey);

  cleanupRateLimits(now);

  if (!current || current.resetAt <= now) {
    rateLimits.set(rateKey, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: max - 1, resetAt: now + windowMs };
  }

  if (current.count >= max) {
    return { ok: false as const, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { ok: true as const, remaining: max - current.count, resetAt: current.resetAt };
}

export function getClientRateKey(request: Request, phone: string, purpose: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${purpose}:${phone}:${forwardedFor || realIp || "unknown"}`;
}

export function validateLoginKode(konnectKode: unknown) {
  const expected = process.env.KONNECT_LOGIN_CODE?.trim();

  if (!expected) return true;
  if (typeof konnectKode !== "string") return false;

  return safeEqual(konnectKode.trim(), expected);
}

export async function sendOtpOnWhatsApp(phone: string, code: string) {
  const endpoint = getAnantyaTemplateEndpoint(getAnantyaOtpTemplateId());
  const apiKey = getAnantyaApiKey();

  if (!apiKey) {
    throw new Error("Anantya WhatsApp API is not configured.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "accept": "*/*",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Api-Key": apiKey,
    },
    body: buildAnantyaTemplateBody(phone, code),
  });

  const detail = await readAnantyaResponse(response);

  if (!isAnantyaSuccess(response.status, detail.decoded)) {
    throw new Error(`Anantya WhatsApp API failed: ${response.status} ${detail.raw}`);
  }

  return { success: true };
}

export async function sendWhatsAppText(phone: string, message: string, templateId = 1063) {
  const apiKey = getAnantyaApiKey();

  if (!apiKey || !phone || !message) return false;

  try {
    const response = await fetch(getAnantyaTemplateEndpoint(templateId.toString()), {
      method: "POST",
      headers: {
        "accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Api-Key": apiKey,
      },
      body: buildAnantyaTemplateBody(phone, message),
    });
    const detail = await readAnantyaResponse(response);

    return isAnantyaSuccess(response.status, detail.decoded);
  } catch (error) {
    console.error(error);
    return false;
  }
}

function signOtpPayload(payload: OtpPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function readOtpPayload(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<OtpPayload>;

    if (
      payload.v !== OTP_SIGNING_VERSION ||
      typeof payload.phone !== "string" ||
      (payload.purpose !== "login" && payload.purpose !== "register") ||
      typeof payload.codeHash !== "string" ||
      typeof payload.nonce !== "string" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.issuedAt !== "number"
    ) {
      return null;
    }

    return payload as OtpPayload;
  } catch {
    return null;
  }
}

function hashOtp(code: string, nonce: string) {
  return createHash("sha256").update(`${getOtpSecret()}:${nonce}:${code}`).digest("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sign(value: string) {
  return createHmac("sha256", getOtpSecret()).update(value).digest("base64url");
}

function getOtpSecret() {
  const secret = process.env.OTP_HASH_SECRET;

  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("OTP_HASH_SECRET must be at least 32 characters in production.");
  }

  return secret || "konnectly-local-otp-secret-change-me";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAnantyaTemplateEndpoint(templateId: string) {
  const baseUrl = process.env.ANANTYA_WHATSAPP_API_URL ?? "https://apiv1.anantya.ai/api/Campaign/SendSingleTemplateMessage";
  const url = new URL(baseUrl);
  url.searchParams.set("templateId", templateId);
  return url.toString();
}

function getAnantyaApiKey() {
  return process.env.ANANTYA_WHATSAPP_API_KEY ?? process.env.ANANTYA_API_KEY;
}

function getAnantyaOtpTemplateId() {
  return process.env.ANANTYA_OTP_TEMPLATE_ID ?? process.env.ANANTYA_TEMPLATE_ID ?? "1062";
}

function buildAnantyaTemplateBody(phone: string, attribute1: string) {
  const body = new URLSearchParams({
    ContactNo: `91${phone.replace(/\D/g, "").replace(/^0+/, "").replace(/^91(?=\d{10}$)/, "")}`,
    Attribute1: attribute1,
    MediaFile: "",
    MediaFileName: "",
    ContactName: "",
    Attribute2: "",
    Attribute3: "",
    Attribute4: "",
    Attribute5: "",
    Attribute6: "",
    Attribute7: "",
    Attribute8: "",
  });

  return body.toString();
}

async function readAnantyaResponse(response: Response) {
  const raw = await response.text();

  try {
    return { raw, decoded: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { raw, decoded: null };
  }
}

function isAnantyaSuccess(status: number, decoded: Record<string, unknown> | null) {
  return status === 200 && (decoded?.isSuccess === true || decoded?.responseCode === 200);
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function cleanupRateLimits(now: number) {
  for (const [key, record] of rateLimits.entries()) {
    if (record.resetAt <= now) {
      rateLimits.delete(key);
    }
  }
}

function cleanupUsedOtpTokens() {
  const now = Date.now();

  for (const [tokenHash, expiresAt] of usedOtpTokens.entries()) {
    if (expiresAt <= now) {
      usedOtpTokens.delete(tokenHash);
    }
  }
}

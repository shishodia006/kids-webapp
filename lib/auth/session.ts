import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-konnectly_session" : "konnectly_session";
export const ADMIN_SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-konnectly_admin_session" : "konnectly_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type AuthRole = "user" | "admin" | "brand";

export type AuthSession = {
  v: 1;
  sid: string;
  phone: string;
  role: AuthRole;
  brandUserId?: number;
  brandId?: number;
  issuedAt: number;
  expiresAt: number;
};

export function createSessionToken(phone: string, role?: AuthRole) {
  const now = Date.now();
  const payload: AuthSession = {
    v: 1,
    sid: randomUUID(),
    phone,
    role: role ?? getRoleForPhone(phone),
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
  };

  return signSessionPayload(payload);
}

export function createBrandSessionToken({
  phone,
  brandUserId,
  brandId,
}: {
  phone: string;
  brandUserId: number;
  brandId: number;
}) {
  const now = Date.now();
  const payload: AuthSession = {
    v: 1,
    sid: randomUUID(),
    phone,
    role: "brand",
    brandUserId,
    brandId,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
  };

  return signSessionPayload(payload);
}

export function createAdminSessionToken(email: string) {
  const now = Date.now();
  const payload: AuthSession = {
    v: 1,
    sid: randomUUID(),
    phone: email,
    role: "admin",
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
  };

  return signSessionPayload(payload);
}

export function verifySessionToken(token: unknown) {
  if (typeof token !== "string") return null;

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AuthSession>;

    if (
      payload.v !== 1 ||
      typeof payload.sid !== "string" ||
      typeof payload.phone !== "string" ||
      (payload.role !== "user" && payload.role !== "admin" && payload.role !== "brand") ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      Date.now() > payload.expiresAt
    ) {
      return null;
    }

    return payload as AuthSession;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

function getRoleForPhone(phone: string): AuthRole {
  const adminPhones = (process.env.ADMIN_PHONE_NUMBERS ?? "")
    .split(",")
    .map((value) => value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .filter(Boolean);

  return adminPhones.includes(phone) ? "admin" : "user";
}

function signSessionPayload(payload: AuthSession) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }

  return secret || "konnectly-local-session-secret-change-me";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

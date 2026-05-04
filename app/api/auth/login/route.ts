import { assertCanLogin } from "@/lib/auth/accounts";
import { normalizeIndianPhone } from "@/lib/auth/otp";
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianPhone(body.phone);
    const password = typeof body.password === "string" ? body.password : "";

    if (!phone) {
      return Response.json({ message: "Please enter a valid 10-digit Indian mobile number." }, { status: 400 });
    }

    const gate = await assertCanLogin(phone, password);
    if (!gate.ok) {
      return Response.json({ message: gate.message }, { status: 401 });
    }

    const response = NextResponse.json({ message: "Logged in successfully." });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(phone), getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error(error);
    if (isConnectionRefused(error)) {
      return Response.json({ message: "Database is not reachable. Please check DATABASE_URL in .env.local, then try again." }, { status: 503 });
    }

    return Response.json({ message: "Unable to login right now. Please try again." }, { status: 500 });
  }
}

function isConnectionRefused(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; errors?: Array<{ code?: unknown }> };
  return maybeError.code === "ECONNREFUSED" || Boolean(maybeError.errors?.some((item) => item.code === "ECONNREFUSED"));
}

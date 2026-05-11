import { ensureAdminAccount, isAdminCredentials, ADMIN_EMAIL } from "@/lib/auth/admin";
import { ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isAdminCredentials(body.email, body.password)) {
      return Response.json({ message: "Invalid admin email or password." }, { status: 401 });
    }

    await ensureAdminAccount();

    const response = NextResponse.json({ message: "Admin logged in successfully." });
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken(ADMIN_EMAIL), getSessionCookieOptions());
    response.cookies.set(SESSION_COOKIE_NAME, "", { ...getSessionCookieOptions(), maxAge: 0 });
    return response;
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to login admin right now. Please check DATABASE_URL and try again." }, { status: 500 });
  }
}

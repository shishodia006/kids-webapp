import { ADMIN_SESSION_COOKIE_NAME, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  const response = NextResponse.json({ message: "Logged out." });
  if (scope !== "admin") response.cookies.set(SESSION_COOKIE_NAME, "", { ...getSessionCookieOptions(), maxAge: 0 });
  if (scope !== "user") response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", { ...getSessionCookieOptions(), maxAge: 0 });
  return response;
}

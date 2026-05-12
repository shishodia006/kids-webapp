import { ADMIN_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userSession = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const adminSession =
    verifySessionToken(request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value) ??
    (userSession?.role === "admin" ? userSession : null);

  if (pathname.startsWith("/admin")) {
    if (!adminSession) {
      const loginUrl = new URL("/admin-login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (!userSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};

import { consumeOtpRateLimit, getClientRateKey, normalizeIndianPhone, verifyOtp } from "@/lib/auth/otp";
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianPhone(body.phone);
    const purpose = body.purpose === "register" ? "register" : "login";

    if (!phone) {
      return Response.json({ message: "Please enter a valid 10-digit Indian WhatsApp number." }, { status: 400 });
    }

    const rateLimit = consumeOtpRateLimit(getClientRateKey(request, phone, purpose), "verify");

    if (!rateLimit.ok) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return Response.json(
        { message: "Too many verification attempts. Please request a new OTP after a few minutes." },
        { status: 429, headers: { "Retry-After": retryAfter.toString() } },
      );
    }

    const result = verifyOtp({
      requestId: body.requestId,
      phone,
      purpose,
      code: body.code,
    });

    if (!result.ok) {
      return Response.json({ message: result.message }, { status: 400 });
    }

    const response = NextResponse.json({ message: result.message });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(phone), getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to verify OTP right now. Please try again." }, { status: 500 });
  }
}

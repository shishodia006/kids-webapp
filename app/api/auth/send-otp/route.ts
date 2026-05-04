import { createOtp, consumeOtpRateLimit, getClientRateKey, normalizeIndianPhone, OTP_TTL_SECONDS, sendOtpOnWhatsApp, validateLoginKode } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianPhone(body.phone);
    const purpose = body.purpose === "register" ? "register" : "login";

    if (!phone) {
      return Response.json({ message: "Please enter a valid 10-digit Indian WhatsApp number." }, { status: 400 });
    }

    if (purpose === "login" && !validateLoginKode(body.konnectKode)) {
      return Response.json({ message: "Invalid KonnektKode." }, { status: 401 });
    }

    const rateLimit = consumeOtpRateLimit(getClientRateKey(request, phone, purpose), "send");

    if (!rateLimit.ok) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      return Response.json(
        { message: "Too many OTP requests. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": retryAfter.toString() } },
      );
    }

    const otp = createOtp(phone, purpose);
    await sendOtpOnWhatsApp(phone, otp.code);

    return Response.json({
      message: "OTP sent on WhatsApp.",
      requestId: otp.requestId,
      expiresAt: otp.expiresAt,
      ttlSeconds: OTP_TTL_SECONDS,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to send OTP right now. Please try again." }, { status: 500 });
  }
}

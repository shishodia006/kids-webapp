import { assertCanRegister } from "@/lib/auth/accounts";
import { createOtp, consumeOtpRateLimit, getClientRateKey, normalizeIndianPhone, OTP_TTL_SECONDS, sendOtpOnWhatsApp } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianPhone(body.phone);
    const purpose = body.purpose === "register" ? "register" : "login";

    if (!phone) {
      return Response.json({ message: "Please enter a valid 10-digit Indian WhatsApp number." }, { status: 400 });
    }

    if (purpose === "register") {
      const childAge = Number(body.registration?.childAge);
      if (!Number.isFinite(childAge) || childAge < 1 || childAge > 18) {
        return Response.json({ message: "Child age must be between 1 and 18 years." }, { status: 400 });
      }

      const password = typeof body.registration?.password === "string" ? body.registration.password : "";
      const confirmPassword = typeof body.registration?.confirmPassword === "string" ? body.registration.confirmPassword : "";
      if (password.length < 8) {
        return Response.json({ message: "Password must be at least 8 characters." }, { status: 400 });
      }
      if (password !== confirmPassword) {
        return Response.json({ message: "Password and confirm password do not match." }, { status: 400 });
      }
    } else {
      return Response.json({ message: "Login now uses mobile number and password. Please login directly." }, { status: 410 });
    }

    const gate = await assertCanRegister(phone, body.registration?.referralCode);
    if (!gate.ok) {
      return Response.json({ message: gate.message }, { status: 400 });
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
    if (isConnectionRefused(error)) {
      return Response.json(
        { message: "Database is not reachable. Please check DATABASE_URL in .env.local, then try OTP again." },
        { status: 503 },
      );
    }

    return Response.json({ message: "Unable to send OTP right now. Please try again." }, { status: 500 });
  }
}

function isConnectionRefused(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; errors?: Array<{ code?: unknown }> };
  return maybeError.code === "ECONNREFUSED" || Boolean(maybeError.errors?.some((item) => item.code === "ECONNREFUSED"));
}

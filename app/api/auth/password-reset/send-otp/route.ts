import { findUserByPhone } from "@/lib/auth/accounts";
import { createOtp, normalizeIndianPhone, sendOtpOnWhatsApp, OTP_TTL_SECONDS } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianPhone(body.phone);

    if (!phone) {
      return Response.json({ message: "Please enter a valid 10-digit Indian mobile number." }, { status: 400 });
    }

    const user = await findUserByPhone(phone);
    if (!user) {
      return Response.json({ message: "This mobile number is not registered." }, { status: 404 });
    }

    const otp = createOtp(phone, "login");
    await sendOtpOnWhatsApp(phone, otp.code);

    return Response.json({
      message: "OTP sent on WhatsApp.",
      requestId: otp.requestId,
      expiresAt: otp.expiresAt,
      ttlSeconds: OTP_TTL_SECONDS,
    });
  } catch (error) {
    console.error("PASSWORD_RESET_SEND_OTP_ERROR:", error);
    return Response.json({ message: "Unable to send reset OTP right now." }, { status: 500 });
  }
}

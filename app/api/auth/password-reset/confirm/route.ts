import { setParentPassword } from "@/lib/auth/accounts";
import { markOtpUsed, normalizeIndianPhone, verifyOtp } from "@/lib/auth/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianPhone(body.phone);
    const code = String(body.code || body.otp || "").trim();
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!phone) {
      return Response.json({ message: "Please enter a valid 10-digit Indian mobile number." }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return Response.json({ message: "Password and confirm password do not match." }, { status: 400 });
    }

    const result = verifyOtp({ requestId: body.requestId, phone, purpose: "login", code });
    if (!result.ok) {
      return Response.json({ message: result.message }, { status: 400 });
    }

    await setParentPassword(phone, password);
    if (typeof body.requestId === "string") markOtpUsed(body.requestId);

    return Response.json({ message: "Password reset successfully. Please sign in with your new password." });
  } catch (error) {
    console.error("PASSWORD_RESET_CONFIRM_ERROR:", error);
    return Response.json({ message: "Unable to reset password right now." }, { status: 500 });
  }
}

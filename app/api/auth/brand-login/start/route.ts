import { createOtp, normalizeIndianPhone, sendOtpOnWhatsApp } from "@/lib/auth/otp";
import { verifyPhpPassword } from "@/lib/auth/password";
import { queryOne, type DbRow } from "@/lib/db";
import { createBrandSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { NextResponse } from "next/server";

type BrandUserRow = DbRow & {
  id: number;
  brand_id: number;
  email: string;
  password: string;
  partner_mobile: string | null;
  is_active: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const requestedPhone = normalizeIndianPhone(body.phone);
    const password = typeof body.password === "string" ? body.password : "";

    if (requestedPhone) {
      const brandUser = await queryOne<BrandUserRow>(
        `
          SELECT id, brand_id, email, password, partner_mobile, is_active
          FROM brand_users
          WHERE partner_mobile = ?
             OR RIGHT(REGEXP_REPLACE(COALESCE(partner_mobile, ''), '\\D', '', 'g'), 10) = ?
          LIMIT 1
        `,
        [requestedPhone, requestedPhone],
      );

      if (!brandUser) {
        return Response.json({ message: "No business account found for this mobile number. Please register your business." }, { status: 404 });
      }

      if (!brandUser.is_active) {
        return Response.json({ message: "Your business account is pending approval. Konnectly team will activate it shortly." }, { status: 403 });
      }

      const otp = createOtp(requestedPhone, "login");
      await sendOtpOnWhatsApp(requestedPhone, otp.code);

      return Response.json({
        message: "OTP sent on WhatsApp.",
        requiresOtp: true,
        requestId: otp.requestId,
        expiresAt: otp.expiresAt,
        brandUserId: brandUser.id,
        brandId: brandUser.brand_id,
        maskedMobile: maskMobile(requestedPhone),
      });
    }

    if (!email || !password) {
      return Response.json({ message: "Please enter a registered brand mobile number." }, { status: 400 });
    }

    const brandUser = await queryOne<BrandUserRow>(
      "SELECT id, brand_id, email, password, partner_mobile, is_active FROM brand_users WHERE email = ? LIMIT 1",
      [email],
    );

    if (!brandUser) {
      return Response.json({ message: "No account found for this email. Contact your Konnectly admin." }, { status: 401 });
    }

    if (!brandUser.is_active) {
      return Response.json({ message: "Your brand account is inactive. Contact your Konnectly admin to reactivate it." }, { status: 403 });
    }

    const passwordOk = await verifyPhpPassword(password, brandUser.password);

    if (!passwordOk) {
      return Response.json({ message: "Incorrect password. Ask your Konnectly admin to reset it from the admin panel." }, { status: 401 });
    }

    const phone = normalizeIndianPhone(brandUser.partner_mobile ?? "");

    if (!phone) {
      const response = NextResponse.json({ message: "Logged in.", authenticated: true, requiresOtp: false });
      response.cookies.set(
        SESSION_COOKIE_NAME,
        createBrandSessionToken({ phone: "", brandUserId: brandUser.id, brandId: brandUser.brand_id }),
        getSessionCookieOptions(),
      );
      return response;
    }

    const otp = createOtp(phone, "login");
    await sendOtpOnWhatsApp(phone, otp.code);

    return Response.json({
      message: "OTP sent on WhatsApp.",
      requiresOtp: true,
      requestId: otp.requestId,
      expiresAt: otp.expiresAt,
      brandUserId: brandUser.id,
      brandId: brandUser.brand_id,
      maskedMobile: maskMobile(phone),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to start brand login right now." }, { status: 500 });
  }
}

function maskMobile(phone: string) {
  return `••••${phone.slice(-4)}`;
}

import { normalizeIndianPhone, verifyOtp } from "@/lib/auth/otp";
import { createBrandSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { queryOne, type DbRow } from "@/lib/db";
import { NextResponse } from "next/server";

type BrandUserRow = DbRow & {
  id: number;
  brand_id: number;
  partner_mobile: string | null;
  is_active: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const brandUserId = Number(body.brandUserId);
    const brandId = Number(body.brandId);
    const requestId = body.requestId;
    const code = body.code;

    if (!brandUserId || !brandId) {
      return Response.json({ message: "Session expired. Please start over." }, { status: 400 });
    }

    const brandUser = await queryOne<BrandUserRow>(
      "SELECT id, brand_id, partner_mobile, is_active FROM brand_users WHERE id = ? AND brand_id = ? LIMIT 1",
      [brandUserId, brandId],
    );

    if (!brandUser || !brandUser.is_active) {
      return Response.json({ message: "Brand account is not active. Please contact your Konnectly admin." }, { status: 403 });
    }

    const phone = normalizeIndianPhone(brandUser.partner_mobile ?? "");

    if (!phone) {
      return Response.json({ message: "No WhatsApp number is linked to this brand account." }, { status: 400 });
    }

    const result = verifyOtp({ requestId, phone, purpose: "login", code });

    if (!result.ok) {
      return Response.json({ message: result.message }, { status: 400 });
    }

    const response = NextResponse.json({ message: "OTP verified.", authenticated: true });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createBrandSessionToken({ phone, brandUserId: brandUser.id, brandId: brandUser.brand_id }),
      getSessionCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to verify brand OTP right now." }, { status: 500 });
  }
}

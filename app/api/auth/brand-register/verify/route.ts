import { markOtpUsed, normalizeIndianPhone, verifyOtp } from "@/lib/auth/otp";
import { createBrandSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { queryOne, withTransaction, type DbRow } from "@/lib/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

type BrandRow = DbRow & {
  id: number;
};

type BrandUserRow = DbRow & {
  id: number;
  brand_id: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = body.requestId;
    const code = body.code;
    const details = readRegistration(body.registration);

    if (!details.ok) {
      return Response.json({ message: details.message }, { status: 400 });
    }

    const result = verifyOtp({ requestId, phone: details.value.mobile, purpose: "register", code });

    if (!result.ok) {
      return Response.json({ message: result.message }, { status: 400 });
    }

    const existing = await queryOne<BrandUserRow>(
      `
        SELECT id, brand_id
        FROM brand_users
        WHERE partner_mobile = ?
           OR RIGHT(REGEXP_REPLACE(COALESCE(partner_mobile, ''), '\\D', '', 'g'), 10) = ?
        LIMIT 1
      `,
      [details.value.mobile, details.value.mobile],
    );

    if (existing) {
      const response = NextResponse.json({ message: "Business already registered.", authenticated: true });
      response.cookies.set(
        SESSION_COOKIE_NAME,
        createBrandSessionToken({ phone: details.value.mobile, brandUserId: existing.id, brandId: existing.brand_id }),
        getSessionCookieOptions(),
      );
      if (typeof requestId === "string") markOtpUsed(requestId);
      return response;
    }

    const created = await withTransaction(async (connection) => {
      const brand = await connection.queryOne<BrandRow>(
        `INSERT INTO brands (name, description, note, points_cost, is_active)
         VALUES (?, ?, ?, ?, ?)
         RETURNING id`,
        [
          details.value.businessName,
          `${details.value.businessType} - ${details.value.area}`,
          `Owner: ${details.value.ownerName}${details.value.referralCode ? ` | Referred: ${details.value.referralCode}` : ""}`,
          0,
          true,
        ],
      );

      if (!brand) throw new Error("Unable to create brand.");

      const passwordHash = await bcrypt.hash(randomBytes(18).toString("hex"), 10);
      const brandUser = await connection.queryOne<BrandUserRow>(
        `INSERT INTO brand_users (brand_id, brand_name, email, password, partner_mobile, referral_code, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id, brand_id`,
        [
          brand.id,
          details.value.businessName,
          `${details.value.mobile}@brand.konnectly.local`,
          passwordHash,
          details.value.mobile,
          makeReferralCode(details.value.businessName),
          true,
        ],
      );

      if (!brandUser) throw new Error("Unable to create brand user.");
      return brandUser;
    });

    const response = NextResponse.json({ message: "Business verified.", authenticated: true });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createBrandSessionToken({ phone: details.value.mobile, brandUserId: created.id, brandId: created.brand_id }),
      getSessionCookieOptions(),
    );
    if (typeof requestId === "string") markOtpUsed(requestId);
    return response;
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to complete business registration right now." }, { status: 500 });
  }
}

function readRegistration(body: unknown) {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const businessName = stringValue(source.businessName);
  const businessType = stringValue(source.businessType);
  const ownerName = stringValue(source.ownerName);
  const mobile = normalizeIndianPhone(source.mobile);
  const area = stringValue(source.area);
  const referralCode = stringValue(source.referralCode).toUpperCase();

  if (!businessName || !businessType || !ownerName || !mobile || !area) {
    return { ok: false as const, message: "Please complete all required business details." };
  }

  return { ok: true as const, value: { businessName, businessType, ownerName, mobile, area, referralCode } };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function makeReferralCode(name: string) {
  const prefix = name.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "BRD";
  return `BR-${prefix}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

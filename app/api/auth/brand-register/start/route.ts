import { createOtp, normalizeIndianPhone, sendOtpOnWhatsApp } from "@/lib/auth/otp";
import { queryOne, type DbRow } from "@/lib/db";

type ExistingBrandUser = DbRow & {
  id: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const details = readRegistration(body);

    if (!details.ok) {
      return Response.json({ message: details.message }, { status: 400 });
    }

    const existing = await queryOne<ExistingBrandUser>(
      `
        SELECT id
        FROM brand_users
        WHERE partner_mobile = ?
           OR RIGHT(REGEXP_REPLACE(COALESCE(partner_mobile, ''), '\\D', '', 'g'), 10) = ?
        LIMIT 1
      `,
      [details.value.mobile, details.value.mobile],
    );

    if (existing) {
      return Response.json({ message: "This mobile number is already registered. Please login instead." }, { status: 409 });
    }

    const otp = createOtp(details.value.mobile, "register");
    await sendOtpOnWhatsApp(details.value.mobile, otp.code);

    return Response.json({
      message: "OTP sent on WhatsApp.",
      requestId: otp.requestId,
      expiresAt: otp.expiresAt,
      maskedMobile: maskMobile(details.value.mobile),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to start business registration right now." }, { status: 500 });
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

function maskMobile(phone: string) {
  return `+91 ${phone.slice(0, 2)}xxxx${phone.slice(-4)}`;
}

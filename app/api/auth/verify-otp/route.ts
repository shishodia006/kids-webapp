import { createRegisteredFamily, type RegisterDetails } from "@/lib/auth/accounts";
import {
  consumeOtpRateLimit,
  getClientRateKey,
  normalizeIndianPhone,
  verifyOtp,
} from "@/lib/auth/otp";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone = normalizeIndianPhone(body.phone);
    const purpose = body.purpose === "register" ? "register" : "login";
    const code = String(body.code || body.otp || "").trim();

    if (!phone) {
      return NextResponse.json(
        { message: "Please enter a valid 10-digit Indian WhatsApp number." },
        { status: 400 }
      );
    }

    if (purpose !== "register") {
      return NextResponse.json(
        { message: "Login now uses mobile number and password. Please login directly." },
        { status: 410 }
      );
    }

    if (!body.requestId || !code || code.length !== 6) {
      return NextResponse.json(
        { message: "Please enter a valid 6-digit OTP." },
        { status: 400 }
      );
    }

    const rateLimit = consumeOtpRateLimit(
      getClientRateKey(request, phone, purpose),
      "verify"
    );

    if (!rateLimit.ok) {
      const retryAfter = Math.max(
        1,
        Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      );

      return NextResponse.json(
        { message: "Too many verification attempts. Please request a new OTP after a few minutes." },
        {
          status: 429,
          headers: { "Retry-After": retryAfter.toString() },
        }
      );
    }

    const result = verifyOtp({
      requestId: body.requestId,
      phone,
      purpose,
      code,
    });

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: 400 }
      );
    }

    const registration = normalizeRegistration(body.registration, phone);

    if (!registration.ok) {
      return NextResponse.json(
        { message: registration.message },
        { status: 400 }
      );
    }

    try {
      await createRegisteredFamily(registration.details);
    } catch (dbError) {
      console.error("CREATE_REGISTERED_FAMILY_ERROR:", dbError);

      return NextResponse.json(
        {
          message:
            dbError instanceof Error
              ? dbError.message
              : "OTP verified but account creation failed.",
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      message: "OTP verified successfully.",
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken(phone),
      getSessionCookieOptions()
    );

    return response;
  } catch (error) {
    console.error("VERIFY_OTP_ROUTE_ERROR:", error);

    return NextResponse.json(
      { message: "Unable to verify OTP right now. Please try again." },
      { status: 500 }
    );
  }
}

function normalizeRegistration(value: unknown, phone: string) {
  if (!value || typeof value !== "object") {
    return {
      ok: false as const,
      message: "Registration details missing. Please start again.",
    };
  }

  const details = value as Record<string, unknown>;

  const fatherName = clean(details.fatherName);
  const motherName = clean(details.motherName);
  const childName = clean(details.childName);
  const childAge = Number(details.childAge);
  const pincode = clean(details.pincode);
  const address = clean(details.address);
  const locality = clean(details.locality);

  const password = typeof details.password === "string" ? details.password : "";
  const confirmPassword =
    typeof details.confirmPassword === "string"
      ? details.confirmPassword
      : "";

  if (
    !fatherName ||
    !motherName ||
    !childName ||
    !Number.isFinite(childAge) ||
    childAge < 1 ||
    childAge > 18 ||
    !address ||
    !locality ||
    !pincode
  ) {
    return {
      ok: false as const,
      message: "Please complete parent and child details before verifying OTP.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false as const,
      message: "Password must be at least 8 characters.",
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false as const,
      message: "Password and confirm password do not match.",
    };
  }

  const normalizedDetails: RegisterDetails = {
    fatherName,
    motherName,
    email: clean(details.email),
    password,
    phone,
    alternateMobile: clean(details.alternateMobile)
      .replace(/\D/g, "")
      .slice(-10),
    address,
    locality,
    city: clean(details.city) || locality,
    state: clean(details.state),
    pincode,
    childName,
    childAge,
    school: clean(details.school),
    referralCode: clean(details.referralCode).toUpperCase(),
  };

  return {
    ok: true as const,
    details: normalizedDetails,
  };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
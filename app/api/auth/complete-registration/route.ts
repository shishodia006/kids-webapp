import { assertEmailAvailable, createParentAccount, type ParentSignupDetails } from "@/lib/auth/accounts";
import { markOtpUsed, normalizeIndianPhone, verifyOtp } from "@/lib/auth/otp";
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianPhone(body.phone);
    const code = String(body.code || body.otp || "").trim();

    if (!phone) {
      return Response.json({ message: "Please enter a valid 10-digit Indian WhatsApp number." }, { status: 400 });
    }

    if (body.acceptedTerms !== true) {
      return Response.json({ message: "Please accept the Terms of Use and Privacy Policy to create your account." }, { status: 400 });
    }

    const registration = normalizeParentSignup(body.registration, phone);
    if (!registration.ok) {
      return Response.json({ message: registration.message }, { status: 400 });
    }

    const emailGate = await assertEmailAvailable(registration.details.email);
    if (!emailGate.ok) {
      return Response.json({ message: emailGate.message }, { status: 400 });
    }

    const result = verifyOtp({ requestId: body.requestId, phone, purpose: "register", code });
    if (!result.ok) {
      return Response.json({ message: result.message }, { status: 400 });
    }

    await createParentAccount(registration.details);
    markOtpUsed(body.requestId);

    const response = NextResponse.json({
      message: `Welcome to Konnectly, ${firstName(registration.details.fullName)}! Your account has been created.`,
      nextStep: "set-password",
    });

    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(phone), getSessionCookieOptions());
    response.cookies.set("konnectly_show_widget_setup", "1", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("COMPLETE_REGISTRATION_ERROR:", error);
    return Response.json(
      { message: getCreateAccountMessage(error) },
      { status: isDuplicateAccountError(error) ? 400 : 500 },
    );
  }
}

function getCreateAccountMessage(error: unknown) {
  if (isDuplicateAccountError(error)) {
    return "This email or mobile number is already registered. Please login or use different details.";
  }

  return error instanceof Error ? error.message : "Unable to create your account right now.";
}

function isDuplicateAccountError(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return text.includes("23505") || text.includes("duplicate key value") || text.includes("users_email_key") || text.includes("users_mobile_key");
}

function normalizeParentSignup(value: unknown, phone: string) {
  if (!value || typeof value !== "object") {
    return { ok: false as const, message: "Registration details missing. Please start again." };
  }

  const details = value as Record<string, unknown>;
  const fullName = clean(details.fullName);
  const email = clean(details.email).toLowerCase();
  const cityArea = clean(details.cityArea);

  if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !cityArea) {
    return { ok: false as const, message: "Please enter your full name, valid email, and city/area." };
  }

  const normalizedDetails: ParentSignupDetails = {
    fullName,
    email,
    phone,
    cityArea,
    referralCode: clean(details.referralCode).toUpperCase(),
  };

  return { ok: true as const, details: normalizedDetails };
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Parent";
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

"use client";

import { ArrowLeft, Bell, Check, Home, KeyRound, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

type Step = "details" | "otp" | "terms" | "password" | "widget";
type RegisterDetails = {
  fullName: string;
  phone: string;
  email: string;
  cityArea: string;
  referralCode: string;
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterFlow />
    </Suspense>
  );
}

function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const termsRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState<Step>("details");
  const [details, setDetails] = useState<RegisterDetails>({
    fullName: "",
    phone: "",
    email: "",
    cityArea: "",
    referralCode: searchParams.get("ref")?.toUpperCase() ?? "",
  });
  const [requestId, setRequestId] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [sentAt, setSentAt] = useState(0);
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [attempts, setAttempts] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsRead, setTermsRead] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);

  const phone = details.phone.replace(/\D/g, "").slice(-10);
  const otpCode = otp.join("");
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendSeconds = Math.max(0, Math.ceil((sentAt + 30_000 - now) / 1000));
  const timerLabel = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = String(remainingSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function update(key: keyof RegisterDetails, value: string) {
    setDetails((current) => ({ ...current, [key]: key === "referralCode" ? value.toUpperCase() : value }));
  }

  async function sendOtp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "register", registration: { ...details, phone } }),
      });
      const data = (await response.json()) as { message?: string; requestId?: string; expiresAt?: number; ttlSeconds?: number };

      if (!response.ok || !data.requestId || !data.expiresAt) {
        throw new Error(data.message ?? "Unable to send OTP.");
      }

      setRequestId(data.requestId);
      setExpiresAt(data.expiresAt);
      setSentAt(Date.now());
      setNow(Date.now());
      setAttempts(0);
      setOtp(Array(6).fill(""));
      setStep("otp");
      setStatus(data.message ?? "OTP sent on WhatsApp.");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send OTP.";
      if (message.includes("already registered") || message.includes("already linked")) {
        setStatus("This number is already linked to an account. Sign in instead?");
      } else {
        setStatus(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (attempts >= 3) {
      setStatus("Too many attempts. Please restart sign up and request a new OTP.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "register", requestId, code: otpCode, createAccount: false }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setAttempts((current) => current + 1);
        throw new Error(data.message ?? "Unable to verify OTP.");
      }

      setStep("terms");
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function createAccount() {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, requestId, code: otpCode, acceptedTerms, registration: { ...details, phone } }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to create account.");
      }

      setStatus(data.message ?? `Welcome to Konnectly, ${firstName(details.fullName)}! Your account has been created.`);
      setStep("password");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  async function setAccountPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to set password.");
      }

      setStep("widget");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to set password.");
    } finally {
      setLoading(false);
    }
  }

  function updateOtp(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleTermsScroll() {
    const element = termsRef.current;
    if (!element) return;
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 12;
    if (atBottom) setTermsRead(true);
  }

  return (
    <main className="grid h-dvh overflow-hidden bg-[linear-gradient(120deg,#4435a5_0%,#7667df_58%,#d7a719_100%)] text-[#2f2b55]">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-[#f7f5ff] shadow-2xl sm:rounded-[34px]">
        <div className="flex h-8 shrink-0 items-center justify-between bg-[#382c98] px-5 text-sm font-black text-white">
          <span>Konnectly</span>
          <span className="flex items-center gap-1.5">IN <MessageCircle size={15} /></span>
        </div>

        {step === "details" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Header eyebrow="Parent Sign Up" title="Create your Konnectly account" body="Start with parent details. Child profiles are added after account setup." />
            <form onSubmit={sendOtp} className="grid gap-3.5 px-5 py-5">
              <Field label="Full Name" required value={details.fullName} onChange={(value) => update("fullName", value)} placeholder="Parent full name" />
              <PhoneField value={details.phone} onChange={(value) => update("phone", value)} />
              <Field label="Email Address" required type="email" value={details.email} onChange={(value) => update("email", value)} placeholder="parent@example.com" />
              <Field label="City / Area" required value={details.cityArea} onChange={(value) => update("cityArea", value)} placeholder="Gurugram, Sector 50" />
              <Field label="Referral Code" value={details.referralCode} onChange={(value) => update("referralCode", value)} placeholder="Optional" mono />
              <PrimaryButton disabled={loading || phone.length !== 10 || !details.fullName.trim() || !details.email.trim() || !details.cityArea.trim()}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </PrimaryButton>
              <Status message={status} />
              {status.includes("Sign in instead") && <Link className="text-center text-xs font-black text-[#5f4bd3] underline" href="/login">Go to Sign In</Link>}
              <p className="text-center text-[11px] font-bold text-[#9290aa]">Already have an account? <Link href="/login" className="font-black text-[#5f4bd3]">Sign In</Link></p>
            </form>
          </div>
        )}

        {step === "otp" && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbf4e5] px-4 py-5">
            <BackButton onClick={() => setStep("details")} />
            <form onSubmit={verifyOtp} className="rounded-[24px] bg-white px-5 py-7 text-center shadow-xl">
              <IconBadge icon={<ShieldCheck size={30} />} />
              <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-[#8b2cf4]">OTP Verification</p>
              <h1 className="mt-2 text-3xl font-black">Enter OTP</h1>
              <p className="mx-auto mt-3 max-w-[300px] text-sm font-semibold leading-6 text-zinc-600">
                We sent a 6-digit code on WhatsApp to +91 {phone}. It is valid for 5 minutes.
              </p>
              <div className="mt-7 grid grid-cols-6 gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { otpRefs.current[index] = element; }}
                    value={digit}
                    onChange={(event) => updateOtp(index, event.target.value)}
                    className="aspect-square min-w-0 rounded-[14px] border-[3px] border-zinc-200 bg-white text-center text-xl font-black outline-none focus:border-[#f6c23c]"
                    inputMode="numeric"
                    maxLength={1}
                    type="text"
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>
              <PrimaryButton className="mt-7" disabled={loading || otpCode.length !== 6 || remainingSeconds <= 0 || attempts >= 3}>
                {loading ? "Verifying..." : "Verify OTP"}
              </PrimaryButton>
              <p className="mt-4 text-xs font-bold text-zinc-500">Expires in {timerLabel} | Attempts left {Math.max(0, 3 - attempts)}</p>
              <button type="button" disabled={loading || resendSeconds > 0} onClick={() => sendOtp()} className="mt-3 text-sm font-black text-[#8b2cf4] underline underline-offset-2 disabled:text-zinc-400">
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
              </button>
              <Status message={status} />
            </form>
          </div>
        )}

        {step === "terms" && (
          <div className="flex min-h-0 flex-1 flex-col bg-[#fbf4e5] px-4 py-5">
            <BackButton onClick={() => setStep("otp")} />
            <section className="flex min-h-0 flex-1 flex-col rounded-[24px] bg-white p-5 shadow-xl">
              <h1 className="text-2xl font-black">Disclaimer & Terms</h1>
              <div ref={termsRef} onScroll={handleTermsScroll} className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold leading-6 text-zinc-700">
                <TermsContent />
              </div>
              <label className="mt-4 flex items-start gap-3 text-xs font-black leading-5 text-[#2f2b55]">
                <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} disabled={!termsRead} className="mt-1 h-4 w-4" />
                <span>I have read, understood, and agree to Konnectly&apos;s Terms of Use, Privacy Policy, and consent to the use of my child&apos;s data as described above.</span>
              </label>
              {!termsRead && <p className="mt-2 text-xs font-bold text-[#8b2cf4]">Scroll through the full terms to enable acknowledgement.</p>}
              <PrimaryButton className="mt-4" disabled={loading || !acceptedTerms || !termsRead} onClick={createAccount} type="button">
                {loading ? "Creating Account..." : "I Agree & Create Account"}
              </PrimaryButton>
              <Status message={status} />
            </section>
          </div>
        )}

        {step === "password" && (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8">
            <IconBadge icon={<KeyRound size={30} />} />
            <h1 className="mt-6 text-3xl font-black">Set Password</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-zinc-600">{status || `Welcome to Konnectly, ${firstName(details.fullName)}! Your account has been created.`}</p>
            <form onSubmit={setAccountPassword} className="mt-6 grid gap-3.5">
              <Field label="Password" required type="password" value={password} onChange={setPassword} placeholder="Minimum 8 characters" />
              <Field label="Confirm Password" required type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" />
              <PrimaryButton disabled={loading || password.length < 8 || password !== confirmPassword}>{loading ? "Saving..." : "Continue"}</PrimaryButton>
              <Status message={status.includes("Welcome") ? "" : status} />
            </form>
          </div>
        )}

        {step === "widget" && (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 text-center">
            <IconBadge icon={<Home size={30} />} />
            <h1 className="mt-6 text-3xl font-black leading-tight">Never miss an event — add Konnectly to your home screen!</h1>
            <div className="mt-6 grid gap-3 text-left">
              <WidgetStep title="iOS" body="Tap Share in Safari, choose Add to Home Screen, then tap Add." />
              <WidgetStep title="Android" body="Open the browser menu, choose Install app or Add to Home screen, then confirm." />
            </div>
            <button type="button" onClick={() => window.konnectlyRequestNotifications?.()} className="mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white">
              <Bell size={18} /> Add to Home Screen
            </button>
            <button type="button" onClick={() => router.push("/app")} className="mt-3 w-full rounded-full border-2 border-[#dcd7ff] bg-white px-5 py-3 text-sm font-black text-[#5f4bd3]">
              Maybe Later
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Header({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="relative overflow-hidden bg-[#5444bf] px-6 pb-7 pt-7 text-white">
      <p className="inline-flex rounded-full bg-white/15 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]">{eyebrow}</p>
      <h1 className="mt-4 max-w-[310px] text-2xl font-black leading-tight">{title}</h1>
      <p className="mt-3 text-sm font-bold leading-6 text-white/75">{body}</p>
    </section>
  );
}

function RegisterFallback() {
  return (
    <main className="grid h-dvh place-items-center bg-[#fbf4e5] px-4 text-[#2f2b55]">
      <div className="rounded-[22px] bg-white px-6 py-5 text-sm font-black shadow-sm">Loading sign up...</div>
    </main>
  );
}

function TermsContent() {
  return (
    <div className="space-y-4">
      <h2 className="font-black text-[#2f2b55]">What Konnectly Gives You Access To</h2>
      <p>Discovery of curated kid-friendly activities, workshops, and events in your city. A verified profile system for children. Konnect Points redeemable at partner brands and Refer & Earn benefits for growing the community.</p>
      <h2 className="font-black text-[#2f2b55]">Consent: Use of Children&apos;s Data & Photos</h2>
      <p>By registering a child profile, you consent to Konnectly storing the child&apos;s name, date of birth, school name, and school ID card image for profile verification. Konnectly may use anonymised or credited event photos for promotional content. You may withdraw photo consent by contacting support.</p>
      <h2 className="font-black text-[#2f2b55]">Konnectly&apos;s Rights & Responsibilities</h2>
      <p>Konnectly may verify, approve, or reject child profile submissions, may modify, suspend, or terminate accounts that violate platform guidelines, and may update these terms. Parents will be notified of material changes via push notification and email.</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required, type = "text", mono }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; type?: string; mono?: boolean }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>{label} {required && <span className="text-[#e04572]">*</span>}</span>
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className={`h-12 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none focus:border-[#6655cf] ${mono ? "font-mono uppercase tracking-[0.12em]" : ""}`} />
    </label>
  );
}

function PhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>Primary Mobile Number <span className="text-[#e04572]">*</span></span>
      <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2">
        <div className="grid h-12 place-items-center rounded-2xl border-2 border-[#e3e0f4] bg-white text-xs font-black">IN +91</div>
        <input required value={value} onChange={(event) => onChange(event.target.value)} pattern="[0-9 ]{10,13}" placeholder="98765 43210" type="tel" className="h-12 min-w-0 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none focus:border-[#6655cf]" />
      </div>
    </label>
  );
}

function PrimaryButton({ children, disabled, onClick, type = "submit", className = "" }: { children: ReactNode; disabled?: boolean; onClick?: () => void; type?: "submit" | "button"; className?: string }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${className} w-full rounded-full bg-[#6655cf] px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-[#6655cf]/25 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55`}>
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[#6655cf] shadow-sm" type="button" aria-label="Back"><ArrowLeft size={20} /></button>;
}

function IconBadge({ icon }: { icon: ReactNode }) {
  return <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#25d366] text-white">{icon}</div>;
}

function WidgetStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[18px] border-2 border-[#e3e0f4] bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-black text-[#2f2b55]"><Check size={17} className="text-[#25d366]" /> {title}</p>
      <p className="mt-2 text-xs font-bold leading-5 text-zinc-600">{body}</p>
    </div>
  );
}

function Status({ message }: { message: string }) {
  return message ? <p className="mt-3 text-center text-xs font-black text-[#6655cf]">{message}</p> : null;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Parent";
}

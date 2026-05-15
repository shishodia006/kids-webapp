"use client";

import { ArrowLeft, Bell, BookOpen, Check, ChevronDown, Eye, EyeOff, Handshake, Home, KeyRound, MessageCircle, Palette, ShieldCheck, Trophy, Volleyball, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

type Step = "intro" | "details" | "otp" | "terms" | "password" | "widget";
type RegisterDetails = {
  fatherName: string;
  motherName: string;
  fullName: string;
  phone: string;
  alternateMobile: string;
  email: string;
  address: string;
  cityArea: string;
  pincode: string;
  referralCode: string;
};

const APP_ALREADY_INSTALLED_MESSAGE = "Konnectly is already installed. Open it from your home screen or use the browser's Open in app button.";
const LOCALITY_OPTIONS = [
  "Wazirpur",
  "Shalimar Bagh",
  "Model Town",
  "Azadpur",
  "Rana Pratap Bagh",
  "Shakti Nagar",
  "Pitampura",
  "Punjabi Bagh",
  "Tri Nagar",
  "Keshav Puram",
  "Sawan Park",
  "Bharat Nagar",
  "Satyawati Colony",
  "Kabir Nagar",
  "Nimri Colony",
  "GT Karnal Road Industrial Area",
  "Jahangirpuri",
  "Mukherjee Nagar",
];

const LOCALITIES_BY_PINCODE: Record<string, string[]> = {
  "110007": ["Rana Pratap Bagh", "Shakti Nagar"],
  "110009": ["Model Town", "Mukherjee Nagar"],
  "110026": ["Punjabi Bagh"],
  "110033": ["Azadpur", "GT Karnal Road Industrial Area", "Jahangirpuri"],
  "110034": ["Pitampura"],
  "110035": ["Tri Nagar", "Keshav Puram"],
  "110052": ["Wazirpur", "Sawan Park", "Ashok Vihar", "Bharat Nagar", "Satyawati Colony", "Nimri Colony"],
  "110088": ["Shalimar Bagh"],
  "110094": ["Kabir Nagar"],
};
const WELCOME_PILLARS: Array<{ Icon: LucideIcon; label: string }> = [
  { Icon: Palette, label: "Skills" },
  { Icon: Volleyball, label: "Sports" },
  { Icon: Handshake, label: "Friends" },
  { Icon: Trophy, label: "Rewards" },
  { Icon: BookOpen, label: "Learning" },
];

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
  const [step, setStep] = useState<Step>("intro");
  const [details, setDetails] = useState<RegisterDetails>({
    fatherName: "",
    motherName: "",
    fullName: "",
    phone: "",
    alternateMobile: "",
    email: "",
    address: "",
    cityArea: "",
    pincode: "",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);

  const phone = details.phone.replace(/\D/g, "").slice(-10);
  const alternatePhone = details.alternateMobile.replace(/\D/g, "").slice(-10);
  const pincode = details.pincode.replace(/\D/g, "").slice(0, 6);
  const emailValid = isValidEmailAddress(details.email);
  const parentDetailsReady =
    phone.length === 10 &&
    alternatePhone.length === 10 &&
    pincode.length === 6 &&
    Boolean(details.fatherName.trim()) &&
    Boolean(details.motherName.trim()) &&
    emailValid &&
    Boolean(details.address.trim()) &&
    Boolean(details.cityArea.trim());
  const otpCode = otp.join("");
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendSeconds = Math.max(0, Math.ceil((sentAt + 30_000 - now) / 1000));
  const detectedLocalities = pincode.length === 6 ? (LOCALITIES_BY_PINCODE[pincode] ?? []) : [];
  const localityOptions = detectedLocalities.length > 0 ? detectedLocalities : LOCALITY_OPTIONS;
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
    const normalized =
      key === "referralCode"
        ? value.toUpperCase()
        : key === "phone" || key === "alternateMobile"
          ? value.replace(/\D/g, "").slice(-10)
          : key === "pincode"
            ? value.replace(/\D/g, "").slice(0, 6)
            : value;

    setDetails((current) => {
      const next = { ...current, [key]: normalized };
      if (key === "fatherName" || key === "motherName") {
        next.fullName = [next.fatherName.trim(), next.motherName.trim()].filter(Boolean).join(" & ");
      }
      if (key === "pincode") {
        const localities = LOCALITIES_BY_PINCODE[normalized];
        if (localities?.length && !localities.includes(next.cityArea)) {
          next.cityArea = localities[0];
        }
      }
      return next;
    });
  }

  async function installAppFromWidget() {
    if (window.konnectlyIsAppInstalled?.()) {
      setStatus(APP_ALREADY_INSTALLED_MESSAGE);
      return;
    }

    if (isIosDevice()) {
      setStatus(getIosInstallMessage());
      return;
    }

    const installed = await window.konnectlyInstallApp?.();
    setStatus(
      installed
        ? "Konnectly has been installed. You can now open it from your home screen with one tap."
        : "Install prompt is not available here. On iPhone use Safari Share > Add to Home Screen. On Android use browser menu > Install app.",
    );
  }

  async function sendOtp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      if (!emailValid) {
        throw new Error("Please enter a valid email address.");
      }

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
      if (isPrimaryPhoneDuplicateMessage(message)) {
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

        {step === "intro" && <WelcomeSlide onGetStarted={() => setStep("details")} />}

        {step === "details" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Header eyebrow="Step 1 of 2 - Parent Details" title="Tell us about your family" body="Start with parent details. Child profiles are added after account setup." onBack={() => setStep("intro")} />
            <form onSubmit={sendOtp} className="grid gap-3.5 px-5 py-5">
              <Field label="Father's Full Name" required value={details.fatherName} onChange={(value) => update("fatherName", value)} placeholder="e.g. Rahul Sharma" />
              <Field label="Mother's Full Name" required value={details.motherName} onChange={(value) => update("motherName", value)} placeholder="e.g. Priya Sharma" />
              <PhoneField label="Primary Phone Number" value={details.phone} onChange={(value) => update("phone", value)} />
              <PhoneField label="Alternate Number" value={details.alternateMobile} onChange={(value) => update("alternateMobile", value)} placeholder="91234 56789" />
              <Field label="Email Address" required type="email" inputMode="email" pattern={EMAIL_PATTERN_SOURCE} value={details.email} onChange={(value) => update("email", value)} placeholder="parent@example.com" />
              {details.email.trim() && !emailValid && <p className="-mt-2 rounded-2xl bg-red-50 px-4 py-3 text-xs font-black text-red-600">Please enter a valid email address.</p>}
              <TextAreaField label="Home Address" required value={details.address} onChange={(value) => update("address", value)} placeholder="Flat / House No., Building, Street..." />
              <div className="grid gap-3.5 min-[390px]:grid-cols-2">
                <Field label="Pincode" required value={details.pincode} onChange={(value) => update("pincode", value)} placeholder="110052" inputMode="numeric" maxLength={6} />
                <LocalitySelect value={details.cityArea} onChange={(value) => update("cityArea", value)} options={localityOptions} autoDetected={detectedLocalities.length > 0} />
              </div>
              <Field label="Referred by KonnektKode" value={details.referralCode} onChange={(value) => update("referralCode", value)} placeholder="Optional" mono />
              <PrimaryButton disabled={loading || !parentDetailsReady}>
                {loading ? "Sending OTP..." : "Continue & Get OTP "}
              </PrimaryButton>
              <Status message={status} />
              {status.includes("Sign in instead") && <Link className="text-center text-xs font-black text-[#5f4bd3] underline" href="/login">Go to Sign In</Link>}
              <p className="text-center text-xs font-bold leading-5 text-[#9290aa]">Your data is safe with us. We never share your information with anyone.</p>
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
              <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Minimum 8 characters" visible={showPassword} onToggle={() => setShowPassword((current) => !current)} />
              <PasswordField label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} />
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
            <Status message={status.includes("Welcome") ? "" : status} />
            <button type="button" onClick={() => { void installAppFromWidget(); }} className="mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white">
              <Bell size={18} /> Add to Home Screen
            </button>
            <button type="button" onClick={() => router.push("/app?tab=Account")} className="mt-3 w-full rounded-full border-2 border-[#dcd7ff] bg-white px-5 py-3 text-sm font-black text-[#5f4bd3]">
              Maybe Later
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function WelcomeSlide({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#4d39b6]">
      <section className="relative overflow-hidden px-6 pb-8 pt-8 text-center text-white">
        <div className="absolute -right-14 top-0 h-44 w-44 rounded-full bg-white/12" />
        <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-white/10" />
        <p className="relative text-[11px] font-black uppercase tracking-[0.24em] text-white/55"> ✨ Welcome to</p>
 <div className="relative mx-auto mt-5 w-fit rounded-[20px] bg-white px-7 py-3 shadow-xl">
  <img
    src="https://www.konnectly.org/images/logo.png"
    alt="Konnectly Logo"
    className="h-8 object-contain"
  />
</div>
        <h1 className="relative mx-auto mt-8 max-w-[340px] text-xl font-black leading-snug">
          Your kid&apos;s journey to building <span className="text-[#f6c400]">life-ready skills</span> and lifelong friendships is about to begin!
        </h1>
     
      </section>

      <div className="grid grid-cols-5 gap-2 bg-[#4334a8] px-4 py-5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
        {WELCOME_PILLARS.map(({ Icon, label }) => (
          <div key={label} className="grid justify-items-center gap-2">
            <span className="grid h-8 place-items-center text-[#f6c400]" aria-hidden="true"><Icon size={25} strokeWidth={2.6} /></span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <section className="rounded-t-[38px] bg-[#f7f5ff] px-6 pb-8 pt-8">
        <p className="inline-flex rounded-full bg-[#eee7ff] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#5f4bd3]">New here?</p>
        <h2 className="mt-7 text-xl font-black leading-tight text-[#2f2b55]">Create your Parent Account</h2>
        <p className="mt-4 text-sm font-bold leading-7 text-[#9290aa]">Join thousands of families in your neighbourhood who are raising future-ready kids with Konnectly.</p>
        <PrimaryButton className="mt-8" type="button" onClick={onGetStarted}>Get Started - It&apos;s Free! 🚀</PrimaryButton>
        <p className="mt-5 text-center text-sm font-bold text-[#9290aa]">Already have an account? <Link href="/login" className="font-black text-[#5f4bd3]">Sign In</Link></p>
        <div className="mt-8 grid grid-cols-3 divide-x divide-[#ddd8f5] border-t border-[#ddd8f5] pt-6 text-center">
          <Stat value="5K+" label="Families" />
          <Stat value="200+" label="Activities" />
          <Stat value="50+" label="Localities" />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-lg font-black text-[#5f4bd3]">{value}</p>
      <p className="mt-1 text-xs font-black text-[#9290aa]">{label}</p>
    </div>
  );
}

function Header({ eyebrow, title, body, onBack }: { eyebrow: string; title: string; body: string; onBack?: () => void }) {
  return (
    <section className="relative overflow-hidden bg-[#5444bf] px-6 pb-7 pt-7 text-white">
      {onBack && <button onClick={onBack} className="mb-5 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white" type="button" aria-label="Back"><ArrowLeft size={20} /></button>}
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
      <p>Discovery of curated kid-friendly activities, workshops, and events in your city.</p>
      <p>A verified profile system for children.</p>
      <p>Konnect Points redeemable at partner brands and Refer & Earn benefits for growing the community.</p>
      <h2 className="font-black text-[#2f2b55]">Consent: Use of Children&apos;s Data & Photos</h2>
      <p>By registering a child profile, you consent to Konnectly storing the child&apos;s name, date of birth, school name, and school ID card image for profile verification. </p>
      <p> Konnectly may use anonymised or credited event photos for promotional content.</p>
      <p> You may withdraw photo consent by contacting support.</p>
      <h2 className="font-black text-[#2f2b55]">Konnectly&apos;s Rights & Responsibilities</h2>
      <p>Konnectly may verify, approve, or reject child profile submissions, may modify, suspend, or terminate accounts that violate platform guidelines, and may update these terms.</p>
      <p>Parents will be notified of material changes via push notification and email.</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  mono,
  inputMode,
  maxLength,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  mono?: boolean;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  maxLength?: number;
  pattern?: string;
}) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>{label} {required && <span className="text-[#e04572]">*</span>}</span>
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} inputMode={inputMode} maxLength={maxLength} pattern={pattern} className={`h-12 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none focus:border-[#6655cf] ${mono ? "font-mono uppercase tracking-[0.12em]" : ""}`} />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>{label} {required && <span className="text-[#e04572]">*</span>}</span>
      <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className="min-h-[86px] resize-none rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 py-3 text-xs font-bold outline-none focus:border-[#6655cf]" />
    </label>
  );
}

function PasswordField({ label, value, onChange, placeholder, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; visible: boolean; onToggle: () => void }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>{label} <span className="text-[#e04572]">*</span></span>
      <span className="relative">
        <input required value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={visible ? "text" : "password"} className="h-12 w-full rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 pr-12 text-xs font-bold outline-none focus:border-[#6655cf]" />
        <button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onClick={onToggle} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[#5f4bd3] transition hover:bg-[#eee7ff] focus:outline-none focus:ring-2 focus:ring-[#dcd7ff]">
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}

function LocalitySelect({ value, onChange, options, autoDetected }: { value: string; onChange: (value: string) => void; options: string[]; autoDetected: boolean }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>Locality <span className="text-[#e04572]">*</span>{autoDetected && <span className="ml-1 text-[10px] text-[#25a85a]">Auto-detected</span>}</span>
      <span className="relative">
        <select required value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 pr-10 text-xs font-bold outline-none focus:border-[#6655cf]">
          <option value="">Select locality</option>
          {options.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
        </select>
        <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9290aa]" />
      </span>
    </label>
  );
}

function PhoneField({ label = "Primary Mobile Number", value, onChange, placeholder = "98765 43210" }: { label?: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>{label} <span className="text-[#e04572]">*</span></span>
      <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2">
        <div className="grid h-12 place-items-center rounded-2xl border-2 border-[#e3e0f4] bg-white text-xs font-black">IN +91</div>
        <input required value={value} onChange={(event) => onChange(event.target.value)} pattern="[0-9 ]{10,13}" placeholder={placeholder} type="tel" className="h-12 min-w-0 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none focus:border-[#6655cf]" />
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

const EMAIL_PATTERN_SOURCE = "[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}";

function isValidEmailAddress(value: string) {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email) && !email.includes("..");
}

function isPrimaryPhoneDuplicateMessage(message: string) {
  const normalized = message.toLowerCase();
  return (normalized.includes("whatsapp number") || normalized.includes("mobile number")) && normalized.includes("already registered");
}

function isIosDevice() {
  const platform = window.navigator.platform || "";
  const userAgent = window.navigator.userAgent || "";
  const iPadOS = platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(userAgent) || iPadOS;
}

function isSafariBrowser() {
  const userAgent = window.navigator.userAgent || "";
  return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);
}

function getIosInstallMessage() {
if (!isSafariBrowser()) {
  return "To install on iPhone, open this page in Safari, then tap Share > Add to Home Screen.";
}

return "In iPhone Safari, tap the Share button, choose Add to Home Screen, then tap Add.";
}

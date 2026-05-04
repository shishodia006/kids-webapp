"use client";

import { ArrowLeft, BatteryFull, ShieldCheck, Wifi } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type MutableRefObject } from "react";

type RegisterStep = "details" | "otp";
type OtpResponse = {
  requestId: string;
  expiresAt: number;
  message: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);
  const [step, setStep] = useState<RegisterStep>("details");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [requestId, setRequestId] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);

  const normalizedPhone = primaryPhone.replace(/\D/g, "").slice(-10);
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const otpCode = otp.join("");

  const timerLabel = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60).toString();
    const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function sendOtp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, purpose: "register" }),
      });
      const data = (await response.json()) as Partial<OtpResponse>;

      if (!response.ok || !data.requestId || !data.expiresAt) {
        throw new Error(data.message ?? "Unable to send OTP.");
      }

      setRequestId(data.requestId);
      setExpiresAt(data.expiresAt);
      setOtp(Array(6).fill(""));
      setStep("otp");
      setStatus(data.message ?? "OTP sent on WhatsApp.");
      window.setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send OTP.");
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, purpose: "register", requestId, code: otpCode }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to verify OTP.");
      }

      router.push("/app");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to verify OTP.");
    } finally {
      verifyingRef.current = false;
      setLoading(false);
    }
  }

  function updateOtp(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function pasteOtp(event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (digits.length <= 1) return;

    event.preventDefault();
    const nextOtp = Array(6).fill("");

    digits.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);
    inputRefs.current[Math.min(digits.length, 6) - 1]?.focus();
  }

  return (
    <main className="grid h-screen overflow-hidden bg-[linear-gradient(120deg,#4435a5_0%,#7667df_58%,#d7a719_100%)] text-[#2f2b55]">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-[410px] flex-col overflow-hidden bg-[#f7f5ff] shadow-2xl sm:rounded-[38px]">
        <StatusBar />
        {step === "details" ? (
          <DetailsForm
            loading={loading}
            primaryPhone={primaryPhone}
            setPrimaryPhone={setPrimaryPhone}
            status={status}
            onSubmit={sendOtp}
          />
        ) : (
          <OtpForm
            inputRefs={inputRefs}
            loading={loading}
            normalizedPhone={normalizedPhone}
            otp={otp}
            otpCode={otpCode}
            remainingSeconds={remainingSeconds}
            status={status}
            timerLabel={timerLabel}
            onBack={() => {
              setStep("details");
              setStatus("");
            }}
            onResend={() => sendOtp()}
            onSubmit={verifyOtp}
            onPasteOtp={pasteOtp}
            onUpdateOtp={updateOtp}
          />
        )}
      </section>
    </main>
  );
}

function StatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function updateTime() {
      setTime(
        new Intl.DateTimeFormat("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    }

    updateTime();
    const timer = window.setInterval(updateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex h-8 shrink-0 items-center justify-between bg-[#382c98] px-5 text-sm font-black text-white">
      <span className="tabular-nums">{time || "--:--"}</span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <Wifi size={15} strokeWidth={3} />
        <BatteryFull size={16} strokeWidth={2.6} />
      </span>
    </div>
  );
}

function DetailsForm({
  loading,
  primaryPhone,
  setPrimaryPhone,
  status,
  onSubmit,
}: {
  loading: boolean;
  primaryPhone: string;
  setPrimaryPhone: (value: string) => void;
  status: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <section className="relative overflow-hidden bg-[#5444bf] px-6 pb-7 pt-7 text-white">
        <DecorativeShapes />
        <p className="relative inline-flex rounded-full bg-white/15 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
          Parent Account
        </p>
        <h1 className="relative mt-4 max-w-[290px] text-2xl font-black leading-tight">
          Create your Konnectly family profile
        </h1>
        <p className="relative mt-3 text-sm font-bold leading-6 text-white/70">
          Your WhatsApp number will be verified before account creation.
        </p>
      </section>

      <form onSubmit={onSubmit} className="-mt-1 rounded-t-[24px] bg-[#f7f5ff] px-5 pb-7 pt-5 sm:px-6">
        <div className="grid gap-3.5">
          <Field label="Father's Full Name" required placeholder="e.g. Rahul Sharma" />
          <Field label="Mother's Full Name" required placeholder="e.g. Priya Sharma" />
          <PhoneField label="Primary WhatsApp Number" value={primaryPhone} onChange={setPrimaryPhone} />
          <PhoneField label="Alternate Number" />
          <Field label="Home Address" required placeholder="Flat / House No., Building, Street..." tall />

          <div className="grid gap-3 min-[370px]:grid-cols-[1.35fr_1fr]">
            <label className="grid min-w-0 gap-1 text-[11px] font-black text-[#2f2b55]">
              <span>Locality <Required /></span>
              <select
                required
                className="h-12 w-full min-w-0 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-black text-[#2f2b55] outline-none focus:border-[#6655cf]"
                defaultValue=""
              >
                <option value="" disabled>
                  Select...
                </option>
                <option>Gurugram</option>
                <option>Ashok Vihar</option>
                <option>DLF Phase 2</option>
                <option>Sector 50</option>
              </select>
            </label>
            <Field label="Pincode" required placeholder="122001" />
          </div>

          <div className="rounded-[18px] border-2 border-[#ead387] bg-[#fff7d8] p-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-[#bd8900]">
              <span>Referred by KonnektKode</span>
              <span className="rounded-full bg-[#f0c500] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#2f2b55]">
                Optional
              </span>
            </div>
            <input
              className="mt-2.5 h-12 w-full min-w-0 rounded-2xl border-2 border-[#eadca7] bg-white px-3.5 font-mono text-xs font-black uppercase tracking-[0.12em] outline-none placeholder:text-[#77777c] focus:border-[#c99a00]"
              placeholder="e.g. KK-7X92M"
              type="text"
            />
          </div>
        </div>

        <button
          disabled={loading || primaryPhone.replace(/\D/g, "").slice(-10).length !== 10}
          type="submit"
          className="mt-6 w-full rounded-full bg-[#6655cf] px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-[#6655cf]/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? "Sending OTP..." : "Continue & Get OTP"}
        </button>
        {status && <p className="mt-4 text-center text-[11px] font-black text-[#6655cf]">{status}</p>}
        <p className="mt-4 text-center text-[11px] font-bold text-[#9290aa]">
          Already have an account?{" "}
          <Link href="/login" className="font-black text-[#5f4bd3]">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}

function OtpForm({
  inputRefs,
  loading,
  normalizedPhone,
  otp,
  otpCode,
  remainingSeconds,
  status,
  timerLabel,
  onBack,
  onResend,
  onSubmit,
  onPasteOtp,
  onUpdateOtp,
}: {
  inputRefs: MutableRefObject<Array<HTMLInputElement | null>>;
  loading: boolean;
  normalizedPhone: string;
  otp: string[];
  otpCode: string;
  remainingSeconds: number;
  status: string;
  timerLabel: string;
  onBack: () => void;
  onResend: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPasteOtp: (event: ClipboardEvent<HTMLInputElement>) => void;
  onUpdateOtp: (index: number, value: string) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbf4e5] px-4 py-5">
      <button
        onClick={onBack}
        className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-white text-[#6655cf] shadow-sm"
        type="button"
        aria-label="Back to details"
      >
        <ArrowLeft size={20} />
      </button>

      <form onSubmit={onSubmit} className="rounded-[30px] bg-white px-5 py-8 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#25d366] text-white">
          <ShieldCheck size={30} />
        </div>
        <p className="mt-7 text-[11px] font-black uppercase tracking-[0.26em] text-[#8b2cf4]">
          Secure Verification
        </p>
        <h1 className="mt-3 text-4xl font-black leading-none" style={{ fontFamily: "Georgia, serif" }}>
          Enter OTP
        </h1>
        <p className="mx-auto mt-5 max-w-[300px] text-sm font-semibold leading-6 text-zinc-600">
          We sent a 6-digit code to WhatsApp +91 {normalizedPhone}. It is valid for 5 minutes.
        </p>

        <div className="mt-8 grid grid-cols-6 gap-2.5">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              value={digit}
              onChange={(event) => onUpdateOtp(index, event.target.value)}
              onPaste={onPasteOtp}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !otp[index] && index > 0) {
                  inputRefs.current[index - 1]?.focus();
                }
              }}
              className="aspect-square min-w-0 rounded-[16px] border-[3px] border-zinc-200 bg-white text-center text-xl font-black outline-none transition focus:border-[#f6c23c] focus:bg-[#fffaf0]"
              inputMode="numeric"
              maxLength={1}
              type="text"
              aria-label={`OTP digit ${index + 1}`}
            />
          ))}
        </div>

        <button
          disabled={loading || otpCode.length !== 6 || remainingSeconds <= 0}
          type="submit"
          className="mt-8 h-14 w-full rounded-full bg-[#1b1b1b] px-5 text-base font-black text-[#ffc52e] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? "Verifying..." : "Verify & Continue"}
        </button>

        <p className="mt-6 text-sm font-bold text-zinc-500">OTP expires in {timerLabel}</p>
        <button
          type="button"
          onClick={onResend}
          disabled={loading || remainingSeconds > 240}
          className="mt-3 text-sm font-black text-[#8b2cf4] underline underline-offset-2 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          Resend OTP on WhatsApp
        </button>
        {status && <p className="mt-5 text-xs font-black text-[#6655cf]">{status}</p>}
      </form>
    </div>
  );
}

function DecorativeShapes() {
  return (
    <>
      <span className="absolute -right-16 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <span className="absolute -bottom-14 -left-12 h-36 w-36 rounded-full bg-white/10" />
      <span className="absolute left-7 top-20 h-16 w-16 rounded-full bg-white/10" />
    </>
  );
}

function Field({ label, placeholder, required, tall }: { label: string; placeholder: string; required?: boolean; tall?: boolean }) {
  return (
    <label className="grid min-w-0 gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>
        {label} {required && <Required />}
      </span>
      <input
        required={required}
        placeholder={placeholder}
        type="text"
        className={`${tall ? "h-16" : "h-12"} w-full min-w-0 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none placeholder:text-xs placeholder:text-[#77777c] focus:border-[#6655cf]`}
      />
    </label>
  );
}

function PhoneField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>
        {label} <Required />
      </span>
      <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-2 sm:grid-cols-[70px_minmax(0,1fr)]">
        <div className="grid h-12 place-items-center rounded-2xl border-2 border-[#e3e0f4] bg-white text-xs font-black">IN +91</div>
        <input
          required
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          pattern="[0-9 ]{10,13}"
          placeholder="98765 43210"
          type="tel"
          className="h-12 min-w-0 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none placeholder:text-xs placeholder:text-[#77777c] focus:border-[#6655cf]"
        />
      </div>
    </label>
  );
}

function Required() {
  return <span className="text-[#e04572]">*</span>;
}

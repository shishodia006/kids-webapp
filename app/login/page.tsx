"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent } from "react";

type OtpResponse = {
  requestId: string;
  expiresAt: number;
  message: string;
};

export default function LoginPage() {
  const router = useRouter();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const sendingRef = useRef(false);
  const verifyingRef = useRef(false);
  const [phone, setPhone] = useState("");
  const [konnectKode, setKonnectKode] = useState("");
  const [requestId, setRequestId] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);

  const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const otpCode = otp.join("");
  const hasOtp = Boolean(requestId);

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
        body: JSON.stringify({ phone: normalizedPhone, purpose: "login", konnectKode }),
      });
      const data = (await response.json()) as Partial<OtpResponse>;

      if (!response.ok || !data.requestId || !data.expiresAt) {
        throw new Error(data.message ?? "Unable to send OTP.");
      }

      setRequestId(data.requestId);
      setExpiresAt(data.expiresAt);
      setOtp(Array(6).fill(""));
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
        body: JSON.stringify({ phone: normalizedPhone, purpose: "login", requestId, code: otpCode }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to verify OTP.");
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.push(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/app");
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
    <main className="grid min-h-screen place-items-center bg-[#fbf4e5] px-4 py-4 text-[#1a1a1a]">
      <section
        className={`w-full max-w-[500px] rounded-[28px] border border-zinc-200 bg-white shadow-[0_24px_90px_rgba(38,26,7,0.14)] ${
          hasOtp ? "px-7 py-9 text-center sm:px-12 md:px-16" : "min-h-[590px] px-[clamp(22px,2.5vw,34px)] py-[clamp(30px,4.4vh,36px)] text-left"
        }`}
      >
        <p className={`${hasOtp ? "mt-0 text-center" : ""} text-[11px] font-black uppercase tracking-[0.22em] text-[#8b2cf4]`}>
          {hasOtp ? "Secure Verification" : "Welcome Back"}
        </p>
        <h1
          className={`${hasOtp ? "mt-4 text-center text-5xl sm:text-6xl" : "mt-3 text-[44px]"} font-black leading-[0.95] tracking-normal`}
          style={{ fontFamily: "Georgia, serif" }}
        >
          {hasOtp ? "Enter OTP" : "Login"}
        </h1>
        <p className={`${hasOtp ? "mx-auto text-center" : ""} mt-4 max-w-[430px] text-[16px] font-semibold leading-[1.55] text-zinc-600`}>
          {hasOtp
            ? `We sent a 6-digit code to WhatsApp +91 ${normalizedPhone}. It is valid for 5 minutes.`
            : "Use your email or mobile number, then confirm with WhatsApp OTP."}
        </p>

        {!hasOtp ? (
          <form onSubmit={sendOtp} className="mt-7 grid gap-3.5">
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="h-[54px] w-full min-w-0 rounded-[15px] border-[2px] border-[#cbd6e6] bg-[#e8f0fd] px-4 text-[15px] font-semibold text-black outline-none transition placeholder:text-black/45 focus:border-[#b9c7dc] focus:ring-0"
              placeholder="9811297908"
              type="tel"
            />
            <input
              required
              value={konnectKode}
              onChange={(event) => setKonnectKode(event.target.value)}
              className="h-[54px] w-full min-w-0 rounded-[15px] border-[2px] border-[#cbd6e6] bg-[#e8f0fd] px-4 text-[15px] font-semibold text-black outline-none transition placeholder:text-black/45 focus:border-[#b9c7dc] focus:ring-0"
              placeholder="KonnektKode"
              type="password"
            />

            <div className="flex min-h-[66px] items-center gap-3.5 rounded-[16px] border border-[#b9efcb] bg-[#ebfff3] px-4 text-[14px] font-semibold leading-[1.4] text-[#008333]">
              <span className="shrink-0 font-bold">WhatsApp</span>
              <span>An OTP will be sent to your registered WhatsApp number.</span>
            </div>

            <button
              disabled={loading || normalizedPhone.length !== 10 || konnectKode.trim().length === 0}
              type="submit"
              className="mt-1 h-[56px] rounded-full bg-[#1a1a1a] px-6 text-[16px] font-black text-[#ffc52e] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? "Sending..." : "Send OTP & Login"}
            </button>

            <p className="mt-2 text-center text-[13px] font-black uppercase tracking-[0.08em] text-zinc-600">
              New Here?{" "}
              <Link href="/register" className="text-[#8b2cf4]">
                Create Account
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-9">
            <div className="mx-auto grid max-w-[492px] grid-cols-6 gap-3 sm:gap-4">
             
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) => updateOtp(index, event.target.value)}
                  onPaste={pasteOtp}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !otp[index] && index > 0) {
                      inputRefs.current[index - 1]?.focus();
                    }
                  }}
                  className="aspect-square min-w-0 rounded-[20px] border-[3px] border-zinc-200 bg-white text-center text-2xl font-black outline-none transition focus:border-[#f6c23c] focus:bg-[#fffaf0]"
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
              className="mx-auto mt-9 flex h-16 w-full max-w-[586px] items-center justify-center rounded-full bg-[#1b1b1b] px-6 text-lg font-black text-[#ffc52e] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </button>

            <p className="mt-7 text-sm font-bold text-zinc-500">OTP expires in {timerLabel}</p>
            <button
              type="button"
              onClick={() => sendOtp()}
              disabled={loading || remainingSeconds > 240}
              className="mt-3 text-base font-black text-[#8b2cf4] underline underline-offset-2 disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              Resend OTP on WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                setRequestId("");
                setOtp(Array(6).fill(""));
                setStatus("");
              }}
              className="mt-8 block w-full text-sm font-black uppercase tracking-[0.18em] text-[#8b2cf4]"
            >
              Go Back
            </button>
          </form>
        )}

        {status && <p className="mx-auto mt-6 max-w-[520px] text-sm font-black text-[#6d5fde]">{status}</p>}

        {hasOtp && (
          <p className="mt-7 text-sm font-bold text-zinc-500">
            New to Konnectly?{" "}
            <Link href="/register" className="font-black text-[#8b2cf4] underline underline-offset-2">
              Register now
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}


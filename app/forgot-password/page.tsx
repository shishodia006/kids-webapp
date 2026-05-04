"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Step = "phone" | "reset" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [requestId, setRequestId] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const phone = phoneInput.replace(/\D/g, "").slice(-10);

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/password-reset/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok || !data.requestId) throw new Error(data.message || "Unable to send OTP.");
      setRequestId(data.requestId);
      setStep("reset");
      setStatus(data.message || "OTP sent on WhatsApp.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, requestId, code: otp, password, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to reset password.");
      setStatus(data.message || "Password reset successfully.");
      setStep("done");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid h-dvh overflow-hidden bg-[#fbf4e5] px-4 py-3 text-[#1a1a1a]">
      <section className="mx-auto my-auto w-full max-w-[430px] rounded-[22px] border border-zinc-200 bg-white px-6 py-7 text-left shadow-[0_20px_70px_rgba(38,26,7,0.14)]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b2cf4]">Account Recovery</p>
        <h1 className="mt-2 text-[34px] font-black leading-none">Forgot Password?</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-zinc-600">Verify your registered mobile number with OTP, then set a new password.</p>

        {step === "phone" && (
          <form onSubmit={sendOtp} className="mt-5 grid gap-3">
            <input required value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} className="h-[48px] rounded-[14px] border-[2px] border-[#cbd6e6] bg-[#e8f0fd] px-4 text-sm font-semibold outline-none" placeholder="Registered mobile number" type="tel" />
            <button disabled={loading || phone.length !== 10} className="h-[50px] rounded-full bg-[#1a1a1a] px-6 text-sm font-black text-[#ffc52e] disabled:opacity-55" type="submit">{loading ? "Sending..." : "Send OTP"}</button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="mt-5 grid gap-3">
            <input required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="h-[48px] rounded-[14px] border-[2px] border-[#cbd6e6] bg-[#e8f0fd] px-4 text-sm font-semibold outline-none" placeholder="6-digit OTP" inputMode="numeric" />
            <div className="relative">
              <input required value={password} onChange={(event) => setPassword(event.target.value)} className="h-[48px] w-full rounded-[14px] border-[2px] border-[#cbd6e6] bg-[#e8f0fd] px-4 pr-12 text-sm font-semibold outline-none" placeholder="New password" type={showPassword ? "text" : "password"} />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[#5f4bd3] transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#b9c7dc]"
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            <div className="relative">
              <input required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-[48px] w-full rounded-[14px] border-[2px] border-[#cbd6e6] bg-[#e8f0fd] px-4 pr-12 text-sm font-semibold outline-none" placeholder="Confirm new password" type={showConfirmPassword ? "text" : "password"} />
              <button
                type="button"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[#5f4bd3] transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#b9c7dc]"
              >
                {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            <button disabled={loading || otp.length !== 6 || password.length < 8 || password !== confirmPassword} className="h-[50px] rounded-full bg-[#1a1a1a] px-6 text-sm font-black text-[#ffc52e] disabled:opacity-55" type="submit">{loading ? "Saving..." : "Set New Password"}</button>
          </form>
        )}

        {step === "done" && (
          <button onClick={() => router.push("/login")} className="mt-5 h-[50px] w-full rounded-full bg-[#1a1a1a] px-6 text-sm font-black text-[#ffc52e]" type="button">Back to Sign In</button>
        )}

        {status && <p className="mt-4 text-sm font-black text-[#6655cf] text-center">{status}</p>}
        <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.08em] text-zinc-500"><Link href="/login" className="text-[#5f4bd3]">Return to Sign In</Link></p>
      </section>
    </main>
  );
}

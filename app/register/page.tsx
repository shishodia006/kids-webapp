"use client";

import Link from "next/link";
import { BatteryFull, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const features = [
  { icon: "🎨", label: "Skills" },
  { icon: "⚽", label: "Sports" },
  { icon: "🤝", label: "Friends" },
  { icon: "🏆", label: "Rewards" },
  { icon: "📚", label: "Learning" },
];

const stats = [
  { value: "5K+", label: "Families" },
  { value: "200+", label: "Activities" },
  { value: "50+", label: "Localities" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "details">("welcome");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/app");
  }

  return (
    <main className="grid h-screen overflow-hidden bg-[linear-gradient(120deg,#4435a5_0%,#7667df_58%,#c99822_100%)] p-0 text-[#2f2b55]">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-[390px] flex-col overflow-hidden rounded-[30px] bg-[#f7f5ff] shadow-2xl sm:rounded-[38px]">
        <StatusBar />
        {step === "welcome" ? (
          <WelcomeScreen onStart={() => setStep("details")} />
        ) : (
          <DetailsForm onBack={() => setStep("welcome")} onSubmit={handleSubmit} />
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

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f7f5ff]">
      <section className="relative overflow-hidden bg-[#5444bf] px-6 pb-8 pt-9 text-center text-white sm:px-8 sm:pb-10 sm:pt-12">
        <DecorativeShapes />
        <p className="relative text-xs font-black uppercase tracking-[0.2em] text-white/55">✨ Welcome To</p>
        <div className="relative mx-auto mt-4 grid h-16 w-44 place-items-center rounded-[24px] bg-white shadow-lg">
          <p className="text-xl font-black text-[#6655cf]">
            Ko<span className="text-[#c99a00]">nn</span>ectly
          </p>
        </div>
        <h1 className="relative mx-auto mt-7 max-w-[300px] text-[21px] font-black leading-[1.4] sm:text-[23px]">
          Your kid&apos;s journey to building <span className="text-[#ffd214]">life-ready skills</span> & lifelong
          friendships is about to begin!
        </h1>
        <p className="relative mt-5 text-xs font-black text-white/55">Learn · Connect · Grow</p>
      </section>

      <FeatureStrip />

      <section className="-mt-1 rounded-t-[30px] bg-[#f7f5ff] px-6 pb-8 pt-7 sm:px-8 sm:pb-10 sm:pt-8">
        <span className="inline-flex rounded-full bg-[#ece8ff] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#6655cf]">
          🎉 New Here?
        </span>
        <h2 className="mt-7 text-2xl font-black leading-tight text-[#2f2b55]">Create your Parent Account</h2>
        <p className="mt-4 text-sm font-bold leading-6 text-[#9290aa]">
          Join thousands of families in your neighbourhood who are raising future-ready kids with Konnectly.
        </p>
        <button
          onClick={onStart}
          className="mt-7 w-full rounded-full bg-[#6655cf] px-5 py-4 text-base font-black text-white shadow-xl shadow-[#6655cf]/30 transition active:scale-[0.98]"
          type="button"
        >
          Get Started - It&apos;s Free! 🚀
        </button>
        <p className="mt-4 text-center text-xs font-black text-[#9290aa]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#5f4bd3]">
            Sign In
          </Link>
        </p>

        <div className="mt-7 border-t border-[#dedbf4] pt-5">
          <div className="grid grid-cols-3 text-center">
            {stats.map((item, index) => (
              <div key={item.label} className={index === 1 ? "border-x border-[#dedbf4]" : ""}>
                <p className="text-lg font-black text-[#6655cf]">{item.value}</p>
                <p className="mt-1 text-[11px] font-black text-[#9290aa]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailsForm({ onBack, onSubmit }: { onBack: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f7f5ff]">
      <section className="relative overflow-hidden bg-[#5444bf] px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-6 sm:pt-6">
        <DecorativeShapes />
        <button
          onClick={onBack}
          className="relative grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xl font-black text-white"
          type="button"
          aria-label="Back"
        >
          ←
        </button>
        <p className="relative mt-4 inline-flex rounded-full bg-white/15 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]">
          Step 1 of 2 · Parent Details
        </p>
        <h1 className="relative mt-3 max-w-[230px] text-[22px] font-black leading-tight">Tell us about your family 👨‍👩‍👧‍👦</h1>
        <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-1/2 rounded-full bg-[#ffd214]" />
        </div>
      </section>

      <form onSubmit={onSubmit} className="-mt-1 rounded-t-[24px] bg-[#f7f5ff] px-5 pb-7 pt-5 sm:px-6">
        <div className="grid gap-3.5">
          <Field label="👨 Father's Full Name" required placeholder="e.g. Rahul Sharma" />
          <Field label="👩 Mother's Full Name" required placeholder="e.g. Priya Sharma" />
          <PhoneField label="📱 Primary Phone Number" placeholder="98765 43210" />
          <PhoneField label="📞 Alternate Number" placeholder="91234 56789" />
          <Field label="🏠 Home Address" required placeholder="Flat / House No., Building, Street..." tall />

          <div className="grid gap-3 min-[370px]:grid-cols-[1.35fr_1fr]">
            <label className="grid min-w-0 gap-1 text-[11px] font-black text-[#2f2b55]">
              <span>📍 Locality <Required /></span>
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
            <Field label="🔢 Pincode" required placeholder="122001" />
          </div>

          <div className="rounded-[18px] border-2 border-[#ead387] bg-[#fff7d8] p-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-[#bd8900]">
              <span>🎟 Referred by KonnektKode</span>
              <span className="rounded-full bg-[#f0c500] px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#2f2b55]">Optional</span>
            </div>
            <input
              className="mt-2.5 h-12 w-full min-w-0 rounded-2xl border-2 border-[#eadca7] bg-white px-3.5 font-mono text-xs font-black uppercase tracking-[0.12em] outline-none placeholder:text-[#77777c] focus:border-[#c99a00]"
              placeholder="e.g. KK-7X92M"
              type="text"
            />
            <p className="mt-2.5 text-[11px] font-black text-[#d29900]">🎁 Earn bonus points when you join with a KonnektKode!</p>
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-[#6655cf] px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-[#6655cf]/30 transition active:scale-[0.98]"
        >
          Continue & Get OTP →
        </button>
        <p className="mt-4 text-center text-[11px] font-bold text-[#9290aa]">🔒 Your data is safe with us. We never share your information.</p>
      </form>
    </div>
  );
}

function FeatureStrip() {
  return (
    <div className="grid grid-cols-5 bg-[#4435ac] px-6 py-7 text-center">
      {features.map((feature) => (
        <div key={feature.label}>
          <p className="text-3xl">{feature.icon}</p>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/55">{feature.label}</p>
        </div>
      ))}
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

function PhoneField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="grid min-w-0 gap-1 text-[11px] font-black text-[#2f2b55]">
      <span>
        {label} <Required />
      </span>
      <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-2 sm:grid-cols-[70px_minmax(0,1fr)]">
        <div className="grid h-12 place-items-center rounded-2xl border-2 border-[#e3e0f4] bg-white text-xs font-black">IN +91</div>
        <input
          required
          pattern="[0-9 ]{10,13}"
          placeholder={placeholder}
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

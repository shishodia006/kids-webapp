"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function RegisterPage() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/app");
  }

  return (
    <main className="min-h-screen bg-[#fff9ec] px-5 py-8 text-[#1a1a1a]">
      <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:grid md:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-[#1a1a1a] p-8 text-white md:p-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/images/logo.png" alt="Konnectly" width={150} height={45} />
          </Link>

          <div className="mt-14">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f5c842]">
              Join Konnectly
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
             Create your parent account
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/70">
             Register your first child and verify your WhatsApp number with OTP
            </p>
          </div>

          <div className="mt-12 grid gap-3 text-sm text-white/80">
       
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              Hyperlocal events and skill labs
            </div>
          </div>
        </section>

        <section className="p-6 md:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Create Account</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Already registered?{" "}
                <Link href="/login" className="font-bold text-[#0f9f95]">
                  Login
                </Link>
              </p>
            </div>
          </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">

  {/* Child Info */}
  <div className="grid gap-4 md:grid-cols-2">
    <label className="grid gap-2 text-sm font-semibold">
      Child's Full Name
      <input
        required
        placeholder="Raju Sharma"
        type="text"
        className="rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#f5c842] focus:ring-4 focus:ring-[#f5c842]/20"
      />
    </label>

 <label className="grid gap-2 text-sm font-semibold">
  Age
  <div className="flex items-center border border-zinc-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:ring-[#f5c842]/20">
    


    {/* Input */}
    <input
      id="age"
      required
      type="number"
      min="1"
      max="18"
      placeholder="Enter age"
      className="w-full text-center outline-none py-3"
      onChange={(e) => {
        if (Number(e.target.value) > 18) {
          alert("Age must be 18 or below");
          e.target.value = "18";
        }
      }}
    />

    {/* Increase */}
  

  </div>
</label>
  </div>

  {/* School */}
  <label className="grid gap-2 text-sm font-semibold">
    School Name
    <input
      required
      placeholder="ABC Public School"
      type="text"
      className="rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#f5c842] focus:ring-4 focus:ring-[#f5c842]/20"
    />
  </label>

  {/* Parent Info */}
  <div className="grid gap-4 md:grid-cols-2">
    <label className="grid gap-2 text-sm font-semibold">
      Parent's Full Name
      <input
        required
        placeholder="Mr. Sharma"
        type="text"
        className="rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#f5c842] focus:ring-4 focus:ring-[#f5c842]/20"
      />
    </label>

    <label className="grid gap-2 text-sm font-semibold">
      WhatsApp Number
      <input
        required
        pattern="[0-9]{10}"
        maxLength={10}
        placeholder="9876543210"
        type="tel"
        className="rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/20"
      />
    </label>
  </div>

  {/* Address */}
  <label className="grid gap-2 text-sm font-semibold">
    Home Address / Colony
    <input
      placeholder="Colony, City"
      type="text"
      className="rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-[#f5c842] focus:ring-4 focus:ring-[#f5c842]/20"
    />
  </label>

  {/* Info Box */}
  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
    WhatsApp OTP will be sent for verification
  </div>

  {/* Button */}
  <button
    type="submit"
    className="mt-2 rounded-xl bg-[#f5c842] px-5 py-4 font-black text-[#1a1a1a] transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
  >
    Send OTP & Join
  </button>

</form>
        </section>
      </div>
    </main>
  );
}

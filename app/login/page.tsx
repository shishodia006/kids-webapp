"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/app");
  }

  return (
    <main className="min-h-screen bg-[#fafaf7] px-5 py-8 text-[#1a1a1a]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-2xl bg-white p-6 shadow-2xl md:p-8">
          <Link href="/" className="inline-flex">
            <Image src="/images/logo.png" alt="Konnectly" width={150} height={45} />
          </Link>

          <div className="mt-10">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#0f9f95]">
              Welcome Back
            </p>
            <h1 className="mt-3 text-3xl font-black">Login to Konnectly</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Use your WhatsApp number and KonnectKode to open the kid&apos;s web app.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">
              WhatsApp Number
              <input
                required
                className="rounded-xl border border-zinc-200 px-4 py-3 font-normal outline-none transition focus:border-[#f5c842] focus:ring-4 focus:ring-[#f5c842]/20"
                placeholder="9876543210"
                type="tel"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              KonnectKode
              <input
                required
                className="rounded-xl border border-zinc-200 px-4 py-3 font-normal uppercase outline-none transition focus:border-[#f5c842] focus:ring-4 focus:ring-[#f5c842]/20"
                placeholder="KK-AV-25-0026"
                type="text"
              />
            </label>

            <button
              type="submit"
              className="mt-2 rounded-xl bg-[#1a1a1a] px-5 py-4 font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              Login
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            New to Konnectly?{" "}
            <Link href="/register" className="font-bold text-[#0f9f95]">
              Register now
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

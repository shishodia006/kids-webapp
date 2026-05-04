"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedPhone = phone.replace(/\D/g, "").slice(-10);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, password }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to login.");
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.push(nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/app");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid h-dvh overflow-hidden bg-[#fbf4e5] px-4 py-3 text-[#1a1a1a]">
      <section className="mx-auto my-auto w-full max-w-[430px] rounded-[22px] border border-zinc-200 bg-white px-6 py-7 text-left shadow-[0_20px_70px_rgba(38,26,7,0.14)]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b2cf4]">Welcome Back</p>
        <h1 className="mt-2 text-[36px] font-black leading-none tracking-normal" style={{ fontFamily: "Georgia, serif" }}>
          Login
        </h1>
        <p className="mt-3 max-w-[360px] text-[14px] font-semibold leading-6 text-zinc-600">
          Use your registered mobile number and password to continue.
        </p>

        <form onSubmit={login} className="mt-5 grid gap-3">
          <input
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="h-[48px] w-full min-w-0 rounded-[14px] border-[2px] border-[#cbd6e6] bg-[#e8f0fd] px-4 text-[14px] font-semibold text-black outline-none transition placeholder:text-black/45 focus:border-[#b9c7dc] focus:ring-0"
            placeholder="9811297908"
            type="tel"
          />
          <input
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-[48px] w-full min-w-0 rounded-[14px] border-[2px] border-[#cbd6e6] bg-[#e8f0fd] px-4 text-[14px] font-semibold text-black outline-none transition placeholder:text-black/45 focus:border-[#b9c7dc] focus:ring-0"
            placeholder="Password"
            type="password"
          />
          <button
            disabled={loading || normalizedPhone.length !== 10 || password.length === 0}
            type="submit"
            className="mt-1 h-[50px] rounded-full bg-[#1a1a1a] px-6 text-[15px] font-black text-[#ffc52e] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <Link href="/forgot-password" className="text-center text-[12px] font-black uppercase tracking-[0.08em] text-[#5f4bd3]">
            Forgot Password?
          </Link>

          <p className="mt-1 text-center text-[12px] font-black uppercase tracking-[0.08em] text-zinc-600">
            New Here?{" "}
            <Link href="/register" className="text-[#8b2cf4]">
              Create Account
            </Link>
          </p>
          <p className="text-center text-[12px] font-black uppercase tracking-[0.08em] text-zinc-500">
            Admin?{" "}
            <Link href="/admin-login" className="text-[#5f4bd3]">
              Admin Login
            </Link>
          </p>
        </form>

        {status && <p className="mx-auto mt-4 max-w-[360px] text-sm font-black text-[#6d5fde]">{status}</p>}
      </section>
    </main>
  );
}

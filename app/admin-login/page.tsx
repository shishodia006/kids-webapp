"use client";

import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to login admin.");
      }

      const nextPath = new URLSearchParams(window.location.search).get("next");
      window.location.assign(nextPath?.startsWith("/admin") ? nextPath : "/admin");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to login admin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#3D32A8,#7B6FD8_62%,#E8B800)] px-5">
      <section className="w-full max-w-[460px] rounded-[24px] border border-white/10 bg-white px-6 py-7 text-[#1a1a1a] shadow-[0_28px_90px_rgba(0,0,0,0.32)] sm:px-8">
        {/* <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f6c400] text-[#111827]">
          <ShieldCheck size={30} strokeWidth={2.5} />
        </div>
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-[#5f4bd3]">Admin Access</p> */}
        <h1 className="mt-3 text-4xl font-black leading-none">Admin Login</h1>
        <p className="mt-4 text-sm font-semibold leading-6 text-zinc-600">
          Sign in with the Konnectly admin email and password to manage the dashboard.
        </p>

        <form onSubmit={login} className="mt-7 grid gap-3.5">
          <label className="grid gap-1.5 text-xs font-black text-zinc-700">
            Email
            <span className="grid h-[52px] grid-cols-[42px_minmax(0,1fr)] items-center rounded-[15px] border-2 border-[#d9e2ef] bg-[#eef4ff] px-3">
              <Mail size={19} className="text-[#5f4bd3]" />
              <input
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-full min-w-0 bg-transparent text-sm font-bold outline-none placeholder:text-zinc-500"
                placeholder="admin@konnectly.com"
                type="email"
              />
            </span>
          </label>

          <label className="grid gap-1.5 text-xs font-black text-zinc-700">
            Password
            <span className="grid h-[52px] grid-cols-[42px_minmax(0,1fr)_42px] items-center rounded-[15px] border-2 border-[#d9e2ef] bg-[#eef4ff] px-3">
              <LockKeyhole size={19} className="text-[#5f4bd3]" />
              <input
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-full min-w-0 bg-transparent text-sm font-bold outline-none placeholder:text-zinc-500"
                placeholder="Admin password"
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="grid h-9 w-9 place-items-center rounded-full text-[#5f4bd3] transition hover:bg-white/70"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </label>

          <button
            disabled={loading || !email.trim() || !password}
            type="submit"
            className="mt-2 flex h-14 items-center justify-center gap-2 rounded-full bg-[#111827] px-6 text-sm font-black text-[#f6c400] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-[#f6c400]/30 border-t-[#f6c400]"
              />
            )}
            {loading ? "Logging in..." : "Open Admin Dashboard"}
          </button>

          <p className="text-center text-[11px] font-black  tracking-[0.18em] text-zinc-400">
            Version · v1.0.5
          </p>
        </form>

        {status && <p className="mt-5 text-sm font-black text-[#5f4bd3]">{status}</p>}

        <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.08em] text-zinc-500">
          Parent login?{" "}
          <Link href="/login" className="text-[#5f4bd3]">
            Go to user login
          </Link>
        </p>
      </section>
    </main>
  );
}

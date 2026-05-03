"use client";

import { Gift, LogOut, Share2, TrendingUp, Users } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

const AFFILIATE_EMAIL = "affiliate@konnectly.com";
const AFFILIATE_PASSWORD = "Affiliate@123";

export default function AffiliatePage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState("");

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("email") === AFFILIATE_EMAIL && form.get("password") === AFFILIATE_PASSWORD) {
      setIsAuthed(true);
      setError("");
    } else {
      setError("Wrong affiliate email or password.");
    }
  }

  if (!isAuthed) {
    return (
      <main className="grid min-h-screen place-items-center bg-emerald-50 px-5">
        <form onSubmit={login} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h1 className="text-3xl font-black">Affiliate Login</h1>
          <p className="mt-2 text-sm text-zinc-500">Demo ID: <b>{AFFILIATE_EMAIL}</b><br />Password: <b>{AFFILIATE_PASSWORD}</b></p>
          <input name="email" className="mt-6 w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder={AFFILIATE_EMAIL} type="email" />
          <input name="password" className="mt-3 w-full rounded-xl border px-4 py-3 outline-none focus:border-emerald-500" placeholder={AFFILIATE_PASSWORD} type="password" />
          {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
          <button className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-black text-white" type="submit">Login</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-emerald-50 p-4 text-zinc-950 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-2xl bg-white p-5 shadow-sm md:flex md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600">Konnectly Affiliate</p>
            <h1 className="mt-2 text-3xl font-black">Referral Command Center</h1>
            <p className="mt-2 text-sm text-zinc-500">Track referral links, onboarding and rewards.</p>
          </div>
          <button onClick={() => setIsAuthed(false)} className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 font-bold text-red-600 md:mt-0" type="button">
            <LogOut size={17} /> Logout
          </button>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <Stat icon={<Users />} value="18" label="Families Referred" />
          <Stat icon={<Gift />} value="₹4,500" label="Rewards Earned" />
          <Stat icon={<TrendingUp />} value="6" label="Active Leads" />
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Your Referral Link</h2>
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 font-mono text-sm">https://konnectly.org/register?ref=AFF-DK-2026</div>
          <button className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white" type="button">
            <Share2 size={18} /> Share Link
          </button>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-emerald-600">{icon}</div>
      <p className="mt-4 text-3xl font-black">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
}

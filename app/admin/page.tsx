"use client";

import { Bell, Check, LogOut, ShieldCheck, Store, Ticket, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { AdminData, AdminKid } from "@/lib/admin-data";

type Tab = "Overview" | "Approvals" | "Events" | "Rewards" | "Broadcasts";

const tabs: Tab[] = ["Overview", "Approvals", "Events", "Rewards", "Broadcasts"];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [data, setData] = useState<AdminData | null>(null);
  const [status, setStatus] = useState("Loading admin dashboard...");

  async function loadData() {
    try {
      const response = await fetch("/api/admin/data", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/admin-login?next=/admin";
        return;
      }
      const nextData = await response.json();
      if (!response.ok) throw new Error(nextData.message || "Unable to load admin data.");
      setData(nextData);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load admin data.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function updateKid(kid: AdminKid, nextStatus: "approved" | "rejected") {
    try {
      const response = await fetch("/api/admin/kids/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kidId: kid.id, status: nextStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Unable to update profile.");
      await loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update profile.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin-login";
  }

  return (
    <main className="min-h-screen bg-[#f6f3ff] text-[#161332]">
      <header className="sticky top-0 z-20 border-b border-[#e8e0ff] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#6655cf]">Konnectly Admin</p>
            <h1 className="text-xl font-black">Operations Dashboard</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-2 rounded-full bg-[#161332] px-4 py-2 text-xs font-black text-[#f6c400]" type="button">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5">
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${activeTab === tab ? "bg-[#6655cf] text-white" : "bg-white text-[#6655cf] ring-1 ring-[#e8e0ff]"}`} type="button">
              {tab}
            </button>
          ))}
        </nav>

        {status && <div className="rounded-[18px] bg-white p-4 text-sm font-black text-[#6655cf] shadow-sm">{status}</div>}

        {data && activeTab === "Overview" && (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<Users size={22} />} label="Parents" value={data.stats.parents} />
            <Metric icon={<ShieldCheck size={22} />} label="Kids" value={data.stats.kids} />
            <Metric icon={<Ticket size={22} />} label="Bookings" value={data.stats.registered} />
            <Metric icon={<Store size={22} />} label="Referral Points" value={data.stats.referralPoints} />
          </section>
        )}

        {data && activeTab === "Approvals" && (
          <section className="grid gap-3">
            {data.pendingKids.length === 0 && <Empty text="No pending child profiles." />}
            {data.pendingKids.map((kid) => (
              <article key={kid.id} className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-[#e8e0ff]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black">{kid.name}</h2>
                    <p className="mt-1 text-xs font-bold text-zinc-500">{kid.age} | {kid.school || "School not added"} | {kid.locality || "Area not added"}</p>
                    <p className="mt-2 text-sm font-bold text-[#6655cf]">{kid.parent} | {kid.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateKid(kid, "approved")} className="grid h-10 w-10 place-items-center rounded-full bg-[#25d366] text-white" type="button" aria-label="Approve child"><Check size={18} /></button>
                    <button onClick={() => updateKid(kid, "rejected")} className="grid h-10 w-10 place-items-center rounded-full bg-[#ef4444] text-white" type="button" aria-label="Reject child"><X size={18} /></button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {data && activeTab === "Events" && (
          <section className="grid gap-3 md:grid-cols-2">
            {data.events.length === 0 && <Empty text="No events created yet." />}
            {data.events.map((event) => (
              <Card key={event.id} title={event.title} meta={`${event.date} | ${event.venue}`} body={`${event.category || "Activity"} | Rs ${event.price}`} />
            ))}
          </section>
        )}

        {data && activeTab === "Rewards" && (
          <section className="grid gap-3 md:grid-cols-2">
            {data.brands.length === 0 && <Empty text="No reward brands active yet." />}
            {data.brands.map((brand) => (
              <Card key={brand.id} title={brand.name} meta={`${brand.pointsCost} points`} body={brand.active ? "Active reward" : "Inactive reward"} />
            ))}
          </section>
        )}

        {data && activeTab === "Broadcasts" && (
          <section className="grid gap-3">
            {data.notifications.length === 0 && <Empty text="No broadcasts sent yet." />}
            {data.notifications.map((notification) => (
              <Card key={notification.id} title={notification.type || "Announcement"} meta={notification.createdAt} body={notification.message} icon={<Bell size={20} />} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-[#e8e0ff]">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eee7ff] text-[#6655cf]">{icon}</div>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function Card({ title, meta, body, icon }: { title: string; meta: string; body: string; icon?: ReactNode }) {
  return (
    <article className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-[#e8e0ff]">
      <div className="flex items-start gap-3">
        {icon && <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eee7ff] text-[#6655cf]">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-base font-black">{title}</h2>
          <p className="mt-1 text-xs font-bold text-zinc-500">{meta}</p>
          <p className="mt-3 text-sm font-bold text-[#6655cf]">{body}</p>
        </div>
      </div>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-[18px] bg-white p-5 text-sm font-black text-zinc-500 shadow-sm ring-1 ring-[#e8e0ff]">{text}</div>;
}

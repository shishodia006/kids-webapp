"use client";

import type { AdminBookingVerification } from "@/lib/admin-data";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Ticket, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const ADMIN_FONT_STYLE = { fontFamily: "'Nunito', sans-serif" };

export default function AdminCheckInPage() {
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  }, []);
  const [ticket, setTicket] = useState<AdminBookingVerification | null>(null);
  const [status, setStatus] = useState("Verifying ticket...");
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const loadTicket = useCallback(async function loadTicket() {
    if (!token) {
      setStatus("Ticket QR token missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const response = await fetch(`/api/admin/bookings/verify?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = `/admin-login?next=${encodeURIComponent(`/admin/check-in?token=${token}`)}`;
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.message || "Ticket not found.");
      setTicket(null);
    } else {
      setTicket(data);
      setStatus("");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTicket();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTicket]);

  async function confirmCheckIn() {
    if (!ticket || ticket.checkedIn || !ticket.paid) return;
    setCheckingIn(true);
    setStatus("Checking in participant...");
    const response = await fetch("/api/admin/bookings/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (response.status === 401) {
      window.location.href = `/admin-login?next=${encodeURIComponent(`/admin/check-in?token=${token}`)}`;
      return;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.message || "Unable to check in ticket.");
    } else {
      setStatus("Check-in completed.");
      await loadTicket();
    }
    setCheckingIn(false);
  }

  return (
    <main className="min-h-screen bg-[#f6f3ff] px-4 py-5 text-[#161332]" style={ADMIN_FONT_STYLE}>
      <div className="mx-auto max-w-md">
        <Link href="/admin" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[#5b45d1] shadow-sm ring-1 ring-[#e7e1fb]">
          <ArrowLeft size={17} /> Admin
        </Link>

        <section className="mt-5 overflow-hidden rounded-[28px] bg-white shadow-xl shadow-[#d9d2f5]/60 ring-1 ring-[#e7e1fb]">
          <div className="bg-[#4d39b6] px-5 py-6 text-center text-white">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f8c400] text-[#25166f]">
              <ShieldCheck size={34} />
            </div>
            <h1 className="mt-4 text-2xl font-black">Ticket Check-in</h1>
            <p className="mt-1 text-xs font-bold text-white/65">Scan result verification</p>
          </div>

          <div className="p-5">
            {loading && (
              <div className="flex items-center justify-center gap-3 rounded-2xl bg-[#f8f7ff] p-5 text-sm font-black text-[#5b45d1]">
                <Loader2 className="animate-spin" size={20} /> {status}
              </div>
            )}

            {!loading && !ticket && (
              <div className="rounded-2xl bg-red-50 p-5 text-center text-sm font-black text-red-600">
                <XCircle className="mx-auto mb-3" size={36} /> {status}
              </div>
            )}

            {ticket && (
              <div className="space-y-4">
                <div className={`rounded-2xl p-4 text-center ${ticket.checkedIn ? "bg-green-50 text-green-700" : ticket.paid ? "bg-[#f0ebff] text-[#5b45d1]" : "bg-red-50 text-red-600"}`}>
                  {ticket.checkedIn ? <CheckCircle2 className="mx-auto mb-2" size={36} /> : <Ticket className="mx-auto mb-2" size={36} />}
                  <p className="text-sm font-black">{ticket.checkedIn ? "Already Checked In" : ticket.paid ? "Valid Paid Ticket" : "Payment Pending"}</p>
                </div>

                <Info label="Child" value={ticket.childName} />
                <Info label="Parent" value={ticket.parentName} />
                <Info label="Phone" value={ticket.phone} />
                <Info label="Activity" value={ticket.eventTitle} />
                <Info label="Date" value={ticket.eventDate} />
                <Info label="Venue" value={ticket.eventLocation} />
                <Info label="Backup Code" value={ticket.backupCode || "-"} />

                {ticket.checkedIn && <p className="rounded-2xl bg-green-50 px-4 py-3 text-xs font-black text-green-700">Checked in at {ticket.checkedInAt}</p>}
                {status && <p className="rounded-2xl bg-[#f8f7ff] px-4 py-3 text-xs font-black text-[#5b45d1]">{status}</p>}

                <button
                  onClick={confirmCheckIn}
                  disabled={checkingIn || ticket.checkedIn || !ticket.paid}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#604bd1] px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-[#604bd1]/25 disabled:cursor-not-allowed disabled:opacity-45"
                  type="button"
                >
                  {checkingIn && <Loader2 className="animate-spin" size={18} />}
                  {ticket.checkedIn ? "Check-in Done" : ticket.paid ? `Confirm Check-in${ticket.pointsPending ? ` (+${ticket.pointsPending} pts)` : ""}` : "Cannot Check In"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8f7ff] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8f8ba6]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#161332]">{value || "-"}</p>
    </div>
  );
}

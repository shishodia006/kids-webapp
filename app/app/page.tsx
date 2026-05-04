"use client";

import type { AppBooking, AppBrand, AppData, AppEvent, AppKid, AppNotification, AppRewardHistory } from "@/lib/app-data";
import {
  ArrowLeft,
  BatteryFull,
  Bell,
  CalendarDays,
  ChevronRight,
  Download,
  Gift,
  Grid2X2,
  History,
  Home,
  MapPin,
  Plus,
  Printer,
  QrCode,
  Send,
  Shield,
  Star,
  User,
  Users,
  Wifi,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type NavLabel = "Home" | "Activities" | "Updates" | "Account";
type Voucher = { brandName: string; coupon: string; qrCode?: string; expiresAt?: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    konnectlyInstallApp?: () => Promise<boolean>;
  }
}

const navItems: Array<{ label: NavLabel; icon: typeof Home }> = [
  { label: "Home", icon: Home },
  { label: "Activities", icon: Grid2X2 },
  { label: "Updates", icon: Bell },
  { label: "Account", icon: User },
];

export default function UserApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState("Loading your Konnectly dashboard...");
  const [activeNav, setActiveNav] = useState<NavLabel>("Home");
  const [referOpen, setReferOpen] = useState(false);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [addKidOpen, setAddKidOpen] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<AppBooking | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [installWorking, setInstallWorking] = useState(false);
  const [installMessage, setInstallMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function updateTime() {
      const formatted = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: false }).format(new Date());
      setCurrentTime(formatted);
    }

    updateTime();
    const timer = window.setInterval(updateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadData() {
    try {
      const response = await fetch("/api/app/data", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/login?next=/app";
        return;
      }
      const nextData = await response.json();
      if (!response.ok) throw new Error(nextData.message || "Unable to load app data.");
      setData(nextData);
      setWidgetOpen(Boolean(nextData.showWidgetSetup));
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load app data.");
    }
  }

  async function switchKid(kidId: number) {
    await postJson("/api/app/switch-kid", { kidId });
    await loadData();
  }

  async function dismissNotification(notificationId: number) {
    await postJson("/api/app/notifications/dismiss", { notificationId });
    setData((current) =>
      current
        ? {
            ...current,
            latestNotification: current.latestNotification ? { ...current.latestNotification, seen: true } : null,
          }
        : current,
    );
  }

  async function redeem(brand: AppBrand) {
    if (!window.confirm(`Redeem ${brand.pointsCost} points for a ${brand.name} voucher?`)) return;
    try {
      const issued = (await postJson("/api/app/redeem", { brandId: brand.id })) as Voucher;
      setVoucher(issued);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to issue voucher.");
    }
  }

  async function dismissWidget() {
    await postJson("/api/app/widget/dismiss", {});
    setWidgetOpen(false);
  }

  async function handleInstallApp(showFallback = true) {
    setStatus("");
    setInstallMessage("Checking install option...");
    setInstallWorking(true);

    try {
      if (isStandaloneApp()) {
        const message = "Konnectly is already installed. Tap the browser's Open in app button to launch it.";
        setStatus(message);
        setInstallMessage(message);
        return true;
      }

      const installed = await window.konnectlyInstallApp?.();
      if (installed) {
        const message = "Konnectly app installed. You can open it from your home screen or browser Open in app button.";
        setWidgetOpen(false);
        setStatus(message);
        setInstallMessage(message);
        return true;
      }

      const message = "Browser install prompt is not available right now. Use browser menu > Install app or Add to home screen.";
      setInstallMessage(message);
      if (showFallback) {
        setWidgetOpen(true);
      } else {
        setStatus(message);
      }

      return false;
    } catch {
      const message = "Unable to open install prompt here. Use browser menu > Install app or Add to home screen.";
      setInstallMessage(message);
      if (showFallback) setWidgetOpen(true);
      else setStatus(message);
      return false;
    } finally {
      setInstallWorking(false);
    }
  }

  async function bookEvent(event: AppEvent, kidIds: number[]) {
    if (!data || kidIds.length === 0) return;
    await loadRazorpay();
    const amount = kidIds.length * event.price;

    if (!window.Razorpay || !data.razorpayKeyId) {
      alert("Razorpay is not ready. Please check payment configuration.");
      return;
    }

    new window.Razorpay({
      key: data.razorpayKeyId,
      amount: Math.round(amount * 100),
      name: "Konnectly Kids",
      description: event.title,
      prefill: { contact: data.user.mobile, email: data.user.email },
      theme: { color: "#5B4EC8" },
      handler: async (response: { razorpay_payment_id?: string }) => {
        try {
          await postJson("/api/app/bookings/confirm", {
            eventId: event.id,
            kidIds,
            amount,
            razorpayPaymentId: response.razorpay_payment_id,
          });
          setStatus("Passes issued. Konnect Points added.");
          setActiveNav("Activities");
          await loadData();
        } catch (error) {
          alert(error instanceof Error ? error.message : "Payment captured, but booking could not be saved.");
        }
      },
    }).open();
  }

  const latestNotification = data?.latestNotification && !data.latestNotification.seen ? data.latestNotification : null;

  return (
    <main className="h-dvh overflow-hidden bg-[linear-gradient(120deg,#3f2ca3_0%,#6d5fde_55%,#d6a20f_100%)] md:grid md:place-items-center">
      <section className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#f7f5ff] text-[12px] shadow-2xl md:rounded-[46px] md:border md:border-white/30">
        {selectedPass ? (
          <EventPassHeader currentTime={currentTime} onBack={() => setSelectedPass(null)} />
        ) : activeNav === "Home" ? (
          <HomeHeader
            currentTime={currentTime}
            data={data}
            notification={latestNotification}
            onDismissNotification={dismissNotification}
            onAddKid={() => setAddKidOpen(true)}
            onInstallApp={handleInstallApp}
            installWorking={installWorking}
            onSwitchKid={switchKid}
          />
        ) : (
        <ScreenHeader currentTime={currentTime} title={activeNav === "Account" ? "My Account" : activeNav} subtitle={getSubtitle(activeNav)} showPoints={activeNav === "Activities"} points={data?.user.konnectPoints ?? 0} />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pb-22 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {status && <div className="m-4 rounded-[18px] bg-white p-4 text-sm font-black text-[#5f4bd2] shadow-sm ring-1 ring-[#e9e4fb]">{status}</div>}
          {data && selectedPass && <EventPassScreen booking={selectedPass} onBack={() => setSelectedPass(null)} />}
          {data && !selectedPass && activeNav === "Home" && <HomeContent data={data} onOpenRefer={() => setReferOpen(true)} onRedeem={redeem} onOpenActivities={() => setActiveNav("Activities")} onInstallApp={handleInstallApp} installWorking={installWorking} installMessage={installMessage} />}
          {data && !selectedPass && activeNav === "Activities" && <ActivitiesScreen data={data} onBook={bookEvent} onOpenPass={setSelectedPass} />}
          {data && !selectedPass && activeNav === "Updates" && <UpdatesScreen notifications={data.notifications} />}
          {data && !selectedPass && activeNav === "Account" && <AccountScreen data={data} onSwitchKid={switchKid} onAddKid={() => setAddKidOpen(true)} />}
        </div>

        <a
          href="https://wa.me/919810889180"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-[82px] right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_14px_34px_rgba(37,211,102,0.45)] ring-4 ring-white/80 transition hover:scale-105 hover:bg-[#1ebe5d]"
          aria-label="Open WhatsApp support"
        >
          <WhatsAppIcon />
        </a>

        <BottomNav activeNav={activeNav} onSelect={(nav) => { setSelectedPass(null); setActiveNav(nav); }} />
        {data && referOpen && <ReferBottomSheet data={data} onClose={() => setReferOpen(false)} />}
        {voucher && <VoucherSheet voucher={voucher} onClose={() => setVoucher(null)} />}
        {data && addKidOpen && <AddKidSheet onClose={() => setAddKidOpen(false)} onSaved={async () => { setAddKidOpen(false); await loadData(); }} />}
        {widgetOpen && <WidgetPrompt onClose={dismissWidget} onInstallApp={handleInstallApp} installWorking={installWorking} installMessage={installMessage} />}
      </section>
    </main>
  );
}

function getSubtitle(activeNav: NavLabel) {
  if (activeNav === "Activities") return "Events, bookings and QR passes";
  if (activeNav === "Updates") return "Community alerts and announcements";
  if (activeNav === "Account") return "Parent and kids profiles";
  return "";
}

function HomeHeader({
  currentTime,
  data,
  notification,
  onDismissNotification,
  onAddKid,
  onInstallApp,
  installWorking,
  onSwitchKid,
}: {
  currentTime: string;
  data: AppData | null;
  notification: AppNotification | null;
  onDismissNotification: (id: number) => void;
  onAddKid: () => void;
  onInstallApp: () => void;
  installWorking: boolean;
  onSwitchKid: (id: number) => void;
}) {
  const activeKid = data?.activeKid;

  return (
    <div className="relative shrink-0 overflow-visible bg-[#4d39b6] px-4 pb-4 pt-2.5 text-white">
      <div className="absolute -right-10 top-8 h-44 w-44 rounded-full bg-white/14" />
      <StatusBar currentTime={currentTime} />
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <LogoBox />
        <div className="flex items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-full bg-[#f6c400] px-3 text-[11px] font-black text-[#1c1740]" type="button">
            <Star size={15} /> {data?.user.konnectPoints ?? 0}
          </button>
          <IconCircle icon={<Download size={19} />} onClick={onInstallApp} label="Install Konnectly app" busy={installWorking} />
          <IconCircle icon={<Bell size={19} />} />
        </div>
      </div>

      {notification && (
        <div className="absolute left-5 right-5 top-9 z-20 flex items-center gap-2.5 rounded-2xl bg-[#3f2fa6] px-3 py-2.5 shadow-xl">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f6c400] text-[#1c1740]">
            <Send size={17} />
          </div>
          <p className="min-w-0 flex-1 text-xs font-black">{notification.message}</p>
          <button onClick={() => onDismissNotification(notification.id)} className="text-white/70" type="button" aria-label="Close alert">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="relative mt-6 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {data?.kids.map((kid) => (
          <button
            key={kid.id}
            onClick={() => onSwitchKid(kid.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-black ${
              activeKid?.id === kid.id ? "bg-white text-[#4d39b6]" : "bg-white/14 text-white"
            }`}
            type="button"
          >
            <KidAvatar kid={kid} size={30} />
            {initials(kid.childName)}
          </button>
        ))}
        <button onClick={onAddKid} disabled={(data?.kids.length ?? 0) >= 3} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-dashed border-white/35 bg-white/10 text-white disabled:opacity-40" type="button" aria-label="Add member">
          <Plus size={20} />
        </button>
      </div>

      <div className="relative mt-3 flex items-center gap-2.5">
        {activeKid ? <KidAvatar kid={activeKid} size={56} large /> : <div className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-[#ffe05a] bg-[#f6c400] text-lg font-black text-[#1c1740]">K</div>}
        <div>
          <p className="text-xs font-black text-white/60">Good day</p>
          <h1 className="text-lg font-black leading-tight">Hello, {activeKid?.childName || data?.user.parentName || "Parent"}!</h1>
          <p className="mt-1 text-[11px] font-black tracking-wide text-[#f6c400]">{data?.user.konnektKode || activeKid?.konnektKode || "KK-XXXXX"}</p>
        </div>
      </div>
    </div>
  );
}

function ScreenHeader({ currentTime, title, subtitle, showPoints, points }: { currentTime: string; title: string; subtitle: string; showPoints?: boolean; points: number }) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-[#4d39b6] px-4 pb-5 pt-2.5 text-white">
      <div className="absolute -right-12 top-7 h-44 w-44 rounded-full bg-white/14" />
      <StatusBar currentTime={currentTime} />
      <div className="relative mt-5 flex items-center justify-between gap-2.5">
        <LogoBox compact />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black leading-tight">{title}</h1>
          <p className="mt-1.5 text-xs font-bold text-white/60">{subtitle}</p>
        </div>
        {showPoints && (
          <button className="flex h-8 items-center gap-1.5 rounded-full bg-[#f6c400] px-3 text-[11px] font-black text-[#1c1740]" type="button">
            <Star size={15} /> {points}
          </button>
        )}
      </div>
    </div>
  );
}

function EventPassHeader({ currentTime, onBack }: { currentTime: string; onBack: () => void }) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-[#4d39b6] px-5 pb-6 pt-2.5 text-white">
      <StatusBar currentTime={currentTime} />
      <div className="relative mt-6 flex items-center gap-4">
        <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/12 text-[#f6c400]" type="button" aria-label="Back to activities">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">Event Pass</h1>
          <p className="mt-2 text-xs font-bold text-white/60">Show at the gate</p>
        </div>
      </div>
    </div>
  );
}

function HomeContent({ data, onOpenRefer, onRedeem, onOpenActivities, onInstallApp, installWorking, installMessage }: { data: AppData; onOpenRefer: () => void; onRedeem: (brand: AppBrand) => void; onOpenActivities: () => void; onInstallApp: () => void; installWorking: boolean; installMessage: string }) {
  const activeKid = data.activeKid;
  const nextEvent = data.events[0];
  const offer = data.brands[0];
  const nextTierRemaining = Math.max(0, 500 - data.user.konnectPoints);

  return (
    <div className="space-y-3 px-4 py-4">
      <button onClick={nextEvent ? onOpenActivities : offer ? () => onRedeem(offer) : undefined} className="block w-full text-left" type="button">
      <section className="relative overflow-hidden rounded-[20px] bg-[#6754d6] px-4 py-5 text-white shadow-sm">
        <div className="relative">
          <span className="rounded-full bg-[#f6c400] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#1c1740]">Upcoming Event</span>
          <h2 className="mt-3 text-lg font-black">{nextEvent?.title || "New activities coming soon"}</h2>
          <p className="mt-2 text-xs font-black text-white/80">{nextEvent ? `${formatDate(nextEvent.eventDate)} | ${nextEvent.location}` : offer ? `${offer.name} voucher is available` : "Watch this space for community events"}</p>
        </div>
      </section>
      </button>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#292444]">Konnect Points</h2>
          <span className="flex items-center gap-1 text-xs font-black text-[#5f4bd2]">Redeem <ChevronRight size={16} /></span>
        </div>
        <div className="relative overflow-hidden rounded-[20px] bg-[#4d39b6] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#f6c400] text-2xl font-black text-[#2a2451]">{data.user.konnectPoints}</div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black">{activeKid?.childName || "Member"}&apos;s Balance</h3>
              <p className="mt-1.5 text-xs font-bold text-white/70">{nextTierRemaining} pts to next tier</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/20">
                <div className="h-full rounded-full bg-[#f6c400]" style={{ width: `${Math.min(100, (data.user.konnectPoints / 500) * 100)}%` }} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-center">
              <p className="text-[10px] font-black uppercase text-white/50">Cash Value</p>
              <p className="mt-1 text-base font-black text-[#f6c400]">₹{Math.floor(data.user.konnectPoints / 10)}</p>
            </div>
          </div>
        </div>
      </section>

      <ActionCard tone="gold" icon={<Gift size={24} />} title="Refer to Earn Points!" body="Invite a family and share your KonnektKode" onClick={onOpenRefer} />
      <ActionCard tone="purple" icon={<Download size={25} />} title={installWorking ? "Checking Install..." : "Install Konnectly App"} body={installMessage || "Use browser install or add to home screen"} onClick={onInstallApp} busy={installWorking} />

      <section>
        <h2 className="mb-2 text-sm font-black text-[#292444]">Redeem Rewards</h2>
        <div className="grid grid-cols-2 gap-3">
          {data.brands.length === 0 && <EmptyState text="No rewards are active yet." />}
          {data.brands.map((brand) => {
            const locked = data.user.konnectPoints < brand.pointsCost;
            return (
              <div key={brand.id} className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-[#e9e4fb]">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#fff5d9] text-[#c99000]">
                  <Gift size={28} />
                </div>
                <h3 className="mt-3 text-sm font-black text-[#292444]">{brand.name}</h3>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#eee7ff] px-3 py-1 text-xs font-black text-[#5f4bd2]">
                  <Star size={14} /> {brand.pointsCost} pts
                </span>
                <button onClick={() => onRedeem(brand)} disabled={locked} className="mt-3 w-full rounded-full bg-[#f2f0fb] py-2 text-xs font-black text-[#5f4bd2] disabled:text-[#8d89a6]" type="button">
                  {locked ? "Locked" : "Redeem"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ActivitiesScreen({ data, onBook, onOpenPass }: { data: AppData; onBook: (event: AppEvent, kidIds: number[]) => void; onOpenPass: (booking: AppBooking) => void }) {
  const [tab, setTab] = useState("Upcoming");
  const upcoming = data.events.filter((event) => !event.eventDate || new Date(event.eventDate).getTime() >= startOfToday());
  const past = data.events.filter((event) => event.eventDate && new Date(event.eventDate).getTime() < startOfToday());

  return (
    <div className="min-h-full px-4 py-4">
      <SegmentedTabs tabs={["Upcoming", "Past", "Registered"]} active={tab} onSelect={setTab} />
      {tab === "Upcoming" && <EventList events={upcoming} kids={data.kids} onBook={onBook} />}
      {tab === "Past" && <PastList events={past} />}
      {tab === "Registered" && (
        <div className="mt-4 space-y-4">
          {data.bookings.length === 0 && <EmptyState text="No registered activities yet." />}
          {data.bookings.map((booking) => (
            <button key={booking.id} onClick={() => onOpenPass(booking)} className="block w-full overflow-hidden rounded-[20px] bg-white text-left shadow-sm ring-1 ring-[#e9e4fb] transition active:scale-[0.99]" type="button">
              <div className="grid h-28 place-items-center bg-[#6754d6] text-white">
                <QrCode size={42} />
              </div>
              <div className="p-3.5">
                <h3 className="text-sm font-black text-[#292444]">{booking.eventTitle}</h3>
                <p className="mt-2.5 text-xs font-bold text-[#8d89a6]">{booking.childName} · {formatDate(booking.eventDate)} · {booking.location}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventList({ events, kids, onBook }: { events: AppEvent[]; kids: AppKid[]; onBook: (event: AppEvent, kidIds: number[]) => void }) {
  const [selected, setSelected] = useState<Record<number, number[]>>({});

  if (events.length === 0) return <EmptyState text="No upcoming events. Check back soon!" />;

  return (
    <div className="mt-4 space-y-4">
      {events.map((event) => {
        const kidIds = selected[event.id] ?? [];
        return (
          <article key={event.id} className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-[#e9e4fb]">
            {event.image ? (
              <Image src={event.image} alt="" width={360} height={150} className="h-32 w-full object-cover" />
            ) : (
              <div className="grid h-32 place-items-center bg-[#6754d6] text-white"><Grid2X2 size={42} /></div>
            )}
            <div className="p-3.5">
              <h3 className="text-sm font-black text-[#292444]">{event.title}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#8d89a6]"><CalendarDays size={15} /> {formatDate(event.eventDate)}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#8d89a6]"><MapPin size={15} /> {event.location}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#8d89a6]"><Star size={15} /> Earn {event.pointsEarnable} pts | Age {event.minAge || 0}-{event.maxAge || "All"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {kids.map((kid) => {
                  const active = kidIds.includes(kid.id);
                  const verified = kid.status === "approved";
                  return (
                    <button
                      key={kid.id}
                      disabled={!verified}
                      onClick={() => setSelected((current) => ({ ...current, [event.id]: active ? kidIds.filter((id) => id !== kid.id) : [...kidIds, kid.id] }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-black disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 ${active ? "bg-[#5f4bd2] text-white" : "bg-[#eee7ff] text-[#5f4bd2]"}`}
                      type="button"
                      title={verified ? kid.childName : "Verification pending"}
                    >
                      {kid.childName}{verified ? "" : " | Pending"}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => onBook(event, kidIds)} disabled={kidIds.length === 0 || event.price <= 0} className="mt-3 w-full rounded-full bg-[#6754d6] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#b9b4df]" type="button">
                {kidIds.length ? `Enroll ${kidIds.length} · ₹${(kidIds.length * event.price).toLocaleString("en-IN")}` : "Select a member to enroll"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PastList({ events }: { events: AppEvent[] }) {
  if (events.length === 0) return <EmptyState text="No past activities yet." />;
  return (
    <div className="mt-4 space-y-4">
      {events.map((event) => (
        <div key={event.id} className="overflow-hidden rounded-[20px] bg-white text-left shadow-sm ring-1 ring-[#e9e4fb]">
          <div className="grid h-28 place-items-center bg-[#969696] text-white"><History size={42} /></div>
          <div className="p-3.5">
            <h3 className="text-sm font-black text-[#292444]">{event.title}</h3>
            <p className="mt-2.5 text-xs font-bold text-[#8d89a6]">{formatDate(event.eventDate)} · {event.location}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventPassScreen({ booking, onBack }: { booking: AppBooking; onBack: () => void }) {
  return (
    <div className="px-5 py-5">
      <div className="relative mx-auto max-w-[340px] overflow-hidden rounded-[24px] bg-white shadow-sm">
        <div className="bg-[#4432ad] px-5 py-4 text-center text-[#f6c400]">
          <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-[#f6c400] text-sm font-black text-[#1c1740]">K</span>
          <span className="ml-3 text-xs font-black uppercase tracking-[0.32em]">Official Konnectly Pass</span>
        </div>
        <div className="px-6 py-8 text-center">
          <div className="mx-auto grid h-52 w-52 place-items-center rounded-2xl border-2 border-[#e9e4fb] bg-white">
            <QrMock seed={booking.qrToken} />
          </div>
          <h2 className="mt-8 text-2xl font-black text-[#292444]">{booking.childName}</h2>
          <p className="mt-3 break-all text-sm font-black tracking-[0.1em] text-[#c99000]">{booking.qrToken}</p>
          <div className="mx-auto mt-6 w-4/5 border-t-2 border-dashed border-[#e9e4fb]" />
          <h3 className="mt-6 text-base font-black text-[#292444]">{booking.eventTitle}</h3>
          <p className="mt-2 text-sm font-bold text-[#8d89a6]">{formatDate(booking.eventDate)} · {booking.location}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <button onClick={() => window.print()} className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-[#e9e4fb] bg-white px-5 py-3 text-sm font-black text-[#5f4bd2]" type="button">
          <Printer size={20} /> Download / Print Pass
        </button>
        <button onClick={onBack} className="flex w-full items-center justify-center gap-3 rounded-full bg-[#6754d6] px-5 py-3 text-sm font-black text-white shadow-xl shadow-[#6754d6]/25" type="button">
          <ArrowLeft size={20} /> Back to Activities
        </button>
      </div>
    </div>
  );
}

function UpdatesScreen({ notifications }: { notifications: AppNotification[] }) {
  return (
    <div className="space-y-3 px-4 py-4">
      {notifications.length === 0 && <EmptyState text="No alerts yet. You're all caught up!" />}
      {notifications.map((update) => (
        <div key={update.id} className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-[#e9e4fb]">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${update.type === "alert" ? "bg-red-100 text-red-700" : "bg-[#eee7ff] text-[#5f4bd2]"}`}>
              {update.type === "alert" ? "Alert" : "Announcement"}
            </span>
            <span className="shrink-0 text-xs font-bold text-[#8d89a6]">{formatDate(update.createdAt)}</span>
          </div>
          <p className="mt-3 text-sm font-black text-[#292444]">{update.message}</p>
        </div>
      ))}
    </div>
  );
}

function AccountScreen({ data, onSwitchKid, onAddKid }: { data: AppData; onSwitchKid: (id: number) => void; onAddKid: () => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-[20px] bg-white p-5 text-center shadow-sm ring-1 ring-[#e9e4fb]">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-[#f6c400] bg-[#6754d6] text-3xl font-black text-white">{initials(data.user.parentName)}</div>
        <h2 className="mt-4 text-lg font-black text-[#292444]">{data.user.parentName || data.user.fatherName || "Parent"}</h2>
        <p className="mt-1.5 text-xs font-bold text-[#8d89a6]">{data.user.email || data.user.mobile}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <AccountTile icon={<Shield size={17} />} label="Account" value={data.user.locality || data.user.city || "Active"} tone="purple" />
          <AccountTile icon={<Users size={17} />} label="Kids" value={`${data.kids.length} Profiles`} tone="purple" />
          <AccountTile icon={<User size={17} />} label="Mobile" value={data.user.mobile} tone="gold" />
          <AccountTile icon={<MapPin size={17} />} label="City" value={data.user.city || data.user.state || "-"} tone="gold" />
        </div>
        <div className="mx-auto mt-4 w-fit rounded-full bg-[#5f4bd2] px-5 py-2 text-xs font-black tracking-[0.22em] text-[#f6c400]">{data.user.konnektKode || "KK-XXXXX"}</div>
        <p className="mt-3 text-xs font-black text-[#8d89a6]">Your KonnektKode - share to refer families</p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-[#292444]">Kids Profiles</h2>
          <button onClick={onAddKid} disabled={data.kids.length >= 3} className="rounded-full bg-[#5f4bd2] px-3 py-1.5 text-xs font-black text-white disabled:opacity-45" type="button">Add Child</button>
        </div>
        <div className="space-y-3">
          {data.kids.length === 0 && <EmptyState text="No kid profiles found for this account." />}
          {data.kids.map((kid) => (
            <button key={kid.id} onClick={() => onSwitchKid(kid.id)} className={`flex w-full items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-sm ring-1 transition active:scale-[0.99] ${data.activeKid?.id === kid.id ? "ring-2 ring-[#e6b800]" : "ring-[#e9e4fb]"}`} type="button">
              <KidAvatar kid={kid} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-black text-[#292444]">
                  {kid.childName}
                  {data.activeKid?.id === kid.id && <span className="ml-2 text-xs font-black uppercase tracking-[0.14em] text-[#c99000]">· Active</span>}
                </span>
                <span className="mt-1 block text-xs font-bold text-[#8d89a6]">{kid.school || "School not added"}</span>
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${kid.status === "approved" ? "bg-green-100 text-green-700" : "bg-[#fff8df] text-[#c99000]"}`}>{kid.status === "approved" ? "Verified" : "Verification Pending"}</span>
            </button>
          ))}
        </div>
      </section>
      <RewardsHistory history={data.rewardHistory} />
      <button
        onClick={async () => {
          if (!window.confirm("Are you sure you want to sign out?")) return;
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/login";
        }}
        className="w-full rounded-full bg-[#1b1b1b] px-5 py-3 text-sm font-black text-[#ffc52e]"
        type="button"
      >
        Sign Out
      </button>
    </div>
  );
}

function RewardsHistory({ history }: { history: AppRewardHistory[] }) {
  const grouped = history.reduce<Record<string, AppRewardHistory[]>>((acc, item) => {
    acc[item.month] = [...(acc[item.month] ?? []), item];
    return acc;
  }, {});

  return (
    <section>
      <h2 className="mb-3 text-base font-black text-[#292444]">Rewards History</h2>
      <div className="space-y-3">
        {history.length === 0 && <EmptyState text="No vouchers or redemptions yet." />}
        {Object.entries(grouped).map(([month, entries]) => (
          <div key={month} className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-[#e9e4fb]">
            <h3 className="text-sm font-black text-[#292444]">{month}</h3>
            <div className="mt-3 space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-[#f7f5ff] p-3">
                  <p className="text-sm font-black text-[#292444]">{entry.brandName}</p>
                  <p className="mt-1 text-xs font-bold text-[#8d89a6]">{entry.pointsSpent} pts | {entry.voucherCode} | {entry.status}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AddKidSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState("");
  const [schoolIdCard, setSchoolIdCard] = useState("");
  const [schoolIdCardData, setSchoolIdCardData] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      await postJson("/api/app/kids", { childName, dob, school, schoolIdCard, schoolIdCardData });
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add child profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#161332]/55 backdrop-blur-sm">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close add child" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" />
        <button onClick={onClose} className="absolute right-5 top-5 text-[#8d89a6]" type="button" aria-label="Close"><X size={20} /></button>
        <h2 className="text-xl font-black text-[#292444]">Add Child Profile</h2>
        <p className="mt-2 text-sm font-bold text-[#8d89a6]">Profiles are reviewed before event registration is enabled.</p>
        <div className="mt-5 grid gap-3">
          <SheetInput label="Child's Full Name" value={childName} onChange={setChildName} placeholder="As per school records" />
          <SheetInput label="Date of Birth" value={dob} onChange={setDob} placeholder="" type="date" />
          <SheetInput label="School Name" value={school} onChange={setSchool} placeholder="School name" />
          <label className="grid gap-1 text-[11px] font-black text-[#292444]">
            School ID Card Photo
            <input required type="file" accept="image/png,image/jpeg" onChange={(event) => {
              const file = event.target.files?.[0];
              setSchoolIdCard(file?.name || "");
              if (!file) {
                setSchoolIdCardData("");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setSchoolIdCardData(typeof reader.result === "string" ? reader.result : "");
              reader.readAsDataURL(file);
            }} className="rounded-2xl border-2 border-[#e3e0f4] bg-white px-3 py-3 text-xs font-bold" />
          </label>
        </div>
        {status && <p className="mt-3 text-xs font-black text-[#6655cf]">{status}</p>}
        <button disabled={loading || !childName || !dob || !school || !schoolIdCard} className="mt-5 w-full rounded-full bg-[#6754d6] px-5 py-3 text-sm font-black text-white disabled:opacity-50" type="submit">
          {loading ? "Submitting..." : "Submit for Verification"}
        </button>
      </form>
    </div>
  );
}

function SheetInput({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#292444]">
      {label}
      <input required value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className="h-12 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none focus:border-[#6655cf]" />
    </label>
  );
}

function WidgetPrompt({ onClose, onInstallApp, installWorking, installMessage }: { onClose: () => void; onInstallApp: (showFallback?: boolean) => Promise<boolean>; installWorking: boolean; installMessage: string }) {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-[#161332]/70 px-5 backdrop-blur-sm">
      <div className="w-full rounded-[28px] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#25d366] text-white"><Download size={28} /></div>
        <h2 className="mt-5 text-2xl font-black leading-tight text-[#292444]">Never miss an event — add Konnectly to your home screen!</h2>
        <div className="mt-5 grid gap-3 text-left">
          <div className="rounded-2xl bg-[#f7f5ff] p-3 text-xs font-bold leading-5 text-[#292444]"><b>iOS:</b> Tap Share in Safari, choose Add to Home Screen, then tap Add.</div>
          <div className="rounded-2xl bg-[#f7f5ff] p-3 text-xs font-bold leading-5 text-[#292444]"><b>Android:</b> Open browser menu, choose Install app or Add to Home screen, then confirm.</div>
        </div>
        {installMessage && <p className="mt-4 rounded-2xl bg-[#fff8df] p-3 text-xs font-black leading-5 text-[#8a6500]">{installMessage}</p>}
        <button disabled={installWorking} onClick={async () => { if (await onInstallApp(false)) onClose(); }} className="mt-5 w-full rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-65" type="button">{installWorking ? "Checking..." : "Add to Home Screen"}</button>
        <button onClick={onClose} className="mt-3 w-full rounded-full border-2 border-[#e3e0f4] px-5 py-3 text-sm font-black text-[#6655cf]" type="button">Maybe Later</button>
      </div>
    </div>
  );
}

function ReferBottomSheet({ data, onClose }: { data: AppData; onClose: () => void }) {
  const referCode = data.user.konnektKode || data.activeKid?.konnektKode || "KK-XXXXX";
  const name = data.user.parentName || "a parent";
  const referText = `Hi! I'm ${name}, a proud Konnectly member. Join us and use my KonnektKode ${referCode} to earn bonus points: ${data.referralUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(referText)}`;

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#161332]/55 backdrop-blur-sm">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close referral sheet" onClick={onClose} />
      <div className="relative w-full rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" />
        <button onClick={onClose} className="absolute right-5 top-5 text-[#8d89a6]" type="button" aria-label="Close"><X size={20} /></button>
        <h2 className="text-xl font-black text-[#292444]">Refer & Earn Points!</h2>
        <p className="mt-2 text-sm font-bold text-[#8d89a6]">Share with a fellow parent or child&apos;s family</p>
        <div className="mt-5 rounded-[18px] border-2 border-[#e6b800] bg-[#fff8df] p-4 text-[#161332]">
          <p className="text-sm font-black">Hi! I&apos;m {name}, a proud Konnectly member.</p>
          <p className="mt-5 text-sm font-black leading-relaxed">Konnectly is a hyperlocal community platform for kids and parents - activities, rewards and more.</p>
          <p className="mt-5 text-sm font-black leading-relaxed">Join us and use my KonnektKode:</p>
          <div className="mt-2 inline-block rounded-full bg-[#4d39b6] px-4 py-2 text-sm font-black tracking-[0.18em] text-[#f6c400]">{referCode}</div>
          <p className="mt-5 break-words text-xs font-black leading-relaxed text-[#8d89a6]">{data.referralUrl}</p>
        </div>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-5 flex h-13 items-center justify-center gap-3 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white shadow-xl shadow-[#25d366]/30">
          <WhatsAppIcon /> Share on WhatsApp
        </a>
      </div>
    </div>
  );
}

function VoucherSheet({ voucher, onClose }: { voucher: Voucher; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#161332]/55 backdrop-blur-sm">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close voucher sheet" onClick={onClose} />
      <div className="relative w-full rounded-t-[32px] bg-white px-5 pb-7 pt-3 text-center shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" />
        <h2 className="text-xl font-black text-[#292444]">{voucher.brandName} Voucher</h2>
        <p className="mt-2 text-sm font-bold text-[#8d89a6]">Show this QR at the partner counter</p>
        <div className="mx-auto mt-5 w-fit rounded-[24px] bg-[#4d39b6] p-5 text-white">
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-2xl bg-white"><QrMock seed={voucher.coupon} small /></div>
          <div className="mt-4 rounded-full bg-[#f6c400] px-5 py-2 text-sm font-black tracking-[0.18em] text-[#1c1740]">{voucher.coupon}</div>
        </div>
        <button onClick={onClose} className="mt-5 w-full rounded-full bg-[#6754d6] px-5 py-3 text-sm font-black text-white" type="button">Done</button>
      </div>
    </div>
  );
}

function BottomNav({ activeNav, onSelect }: { activeNav: NavLabel; onSelect: (nav: NavLabel) => void }) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-10 grid grid-cols-4 border-t border-[#ece8fb] bg-white px-3 pb-2.5 pt-2 shadow-[0_-12px_30px_rgba(40,31,91,0.08)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeNav === item.label;
        return (
          <button key={item.label} onClick={() => onSelect(item.label)} className={`grid place-items-center gap-1 text-[11px] font-black ${active ? "text-[#5f4bd2]" : "text-[#b8b6c8]"}`} type="button">
            <Icon size={21} strokeWidth={active ? 2.6 : 2.2} />
            <span>{item.label}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#f6c400]" : "bg-transparent"}`} />
          </button>
        );
      })}
    </nav>
  );
}

function SegmentedTabs({ tabs, active, onSelect }: { tabs: string[]; active: string; onSelect: (tab: string) => void }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <button key={tab} onClick={() => onSelect(tab)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black shadow-sm ${active === tab ? "bg-[#5f4bd2] text-white shadow-[#5f4bd2]/25" : "bg-white text-[#8d89a6] ring-2 ring-[#e9e4fb]"}`} type="button">
          {tab}
        </button>
      ))}
    </div>
  );
}

function StatusBar({ currentTime }: { currentTime: string }) {
  return (
    <div className="relative z-10 flex items-center justify-between px-2 text-xs font-black text-white">
      <span>{currentTime || "--:--"}</span>
      <span className="flex items-center gap-1.5"><Wifi size={14} /><span>WiFi</span><BatteryFull size={15} /></span>
    </div>
  );
}

function LogoBox({ compact }: { compact?: boolean }) {
  return (
    <div className={`inline-flex items-center rounded-[12px] bg-white px-3 py-[5px] font-extrabold text-[#5f4bd2] shadow-[0_4px_14px_rgba(0,0,0,0.10)] ${compact ? "scale-95" : ""}`}>
      <Image src="/images/logo.png" alt="Konnectly" width={118} height={28} className="block h-7 w-auto object-contain" priority />
    </div>
  );
}

function KidAvatar({ kid, size, large }: { kid: AppKid; size: number; large?: boolean }) {
  const className = `${large ? "border-[3px] border-[#ffe05a]" : ""} rounded-full object-cover`;
  if (kid.photo) return <Image src={kid.photo} alt="" width={size} height={size} className={className} style={{ width: size, height: size }} />;
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-[#f6c400] font-black text-[#1c1740] ${large ? "border-[3px] border-[#ffe05a] text-lg" : "text-xs"}`} style={{ width: size, height: size }}>
      {initials(kid.childName)}
    </span>
  );
}

function IconCircle({ icon, onClick, label, busy }: { icon: ReactNode; onClick?: () => void; label?: string; busy?: boolean }) {
  return (
    <button onClick={() => onClick?.()} disabled={busy} className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/12 text-white transition active:scale-90 disabled:opacity-65" type="button" aria-label={label}>
      {icon}
    </button>
  );
}

function ActionCard({ tone, icon, title, body, onClick, busy }: { tone: "gold" | "purple"; icon: ReactNode; title: string; body: string; onClick?: () => void; busy?: boolean }) {
  const isGold = tone === "gold";
  return (
    <button onClick={() => onClick?.()} disabled={busy} className={`flex w-full items-center gap-3 rounded-[20px] border-2 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80 ${isGold ? "border-[#e6b800] bg-[#fff6c9] hover:shadow-[#e6b800]/20" : "border-[#7765dd] bg-[#e9e3ff] hover:shadow-[#7765dd]/20"}`} type="button">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white transition ${busy ? "animate-pulse" : ""} ${isGold ? "text-[#c99000]" : "text-[#5f4bd2]"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-black ${isGold ? "text-[#c99000]" : "text-[#5f4bd2]"}`}>{title}</span>
        <span className="mt-1 block text-xs font-bold text-[#8d89a6]">{body}</span>
      </span>
      <ChevronRight className={`shrink-0 transition ${busy ? "translate-x-1" : ""} ${isGold ? "text-[#c99000]" : "text-[#5f4bd2]"}`} />
    </button>
  );
}

function AccountTile({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "purple" | "gold" }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone === "purple" ? "border-[#eee7ff] bg-[#eee7ff]" : "border-[#efd071] bg-[#fff8df]"}`}>
      <p className={`flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] ${tone === "purple" ? "text-[#5f4bd2]" : "text-[#c99000]"}`}>{icon} {label}</p>
      <p className="mt-2 truncate text-sm font-black text-[#292444]">{value || "-"}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full grid min-h-[180px] place-items-center rounded-[20px] bg-white p-6 text-center text-sm font-black text-[#8d89a6] shadow-sm ring-1 ring-[#e9e4fb]">
      {text}
    </div>
  );
}

function QrMock({ seed, small }: { seed: string; small?: boolean }) {
  const bits = useMemo(() => {
    let hash = 0;
    for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return Array.from({ length: 361 }, (_, index) => {
      const row = Math.floor(index / 19);
      const col = index % 19;
      const finder = (row < 6 && col < 6) || (row < 6 && col > 12) || (row > 12 && col < 6);
      return finder || Math.abs(Math.sin(hash + index * 13)) > 0.46;
    });
  }, [seed]);

  return (
    <div className={`grid ${small ? "h-20 w-20" : "h-44 w-44"} grid-cols-[repeat(19,minmax(0,1fr))] grid-rows-[repeat(19,minmax(0,1fr))] gap-0.5`}>
      {bits.map((filled, index) => <span key={index} className={filled ? "bg-[#4432ad]" : "bg-white"} />)}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 32 32" fill="none">
      <path d="M16.02 4.2c-6.34 0-11.5 5.05-11.5 11.27 0 2.13.61 4.2 1.76 6l-1.16 5.95 6.12-1.44a11.75 11.75 0 0 0 4.78 1c6.34 0 11.5-5.05 11.5-11.27S22.36 4.2 16.02 4.2Z" fill="white" />
      <path d="M22.5 18.72c-.08-.14-.3-.22-.63-.38-.33-.15-1.94-.94-2.24-1.05-.3-.11-.52-.16-.74.16-.22.32-.85 1.05-1.04 1.27-.19.21-.38.24-.71.08a8.8 8.8 0 0 1-2.6-1.57 9.63 9.63 0 0 1-1.8-2.2c-.19-.32-.02-.49.14-.65.15-.14.33-.38.49-.57.16-.19.22-.32.33-.54.11-.21.05-.4-.03-.56-.08-.16-.74-1.75-1.01-2.4-.27-.63-.54-.54-.74-.55h-.63c-.22 0-.57.08-.87.4-.3.32-1.14 1.1-1.14 2.68 0 1.58 1.17 3.11 1.33 3.32.16.21 2.3 3.45 5.58 4.84.78.33 1.39.53 1.86.68.78.24 1.49.21 2.05.13.63-.09 1.94-.78 2.21-1.53.27-.75.27-1.4.19-1.54Z" fill="#25D366" />
    </svg>
  );
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Razorpay.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay."));
    document.body.appendChild(script);
  });
}

function initials(name: string) {
  return (name || "K").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "K";
}

function formatDate(value: string) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

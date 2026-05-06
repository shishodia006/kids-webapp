"use client";

/* eslint-disable @next/next/no-img-element */

import type { AppBooking, AppBrand, AppData, AppEvent, AppHeroSlide, AppKid, AppNotification, AppPointHistory, AppRewardHistory } from "@/lib/app-data";
import {
  ArrowLeft,
  BatteryFull,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Download,
  Gift,
  Grid2X2,
  History,
  Home,
  LogOut,
  MapPin,
  Paperclip,
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
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

type NavLabel = "Home" | "Activities" | "Updates" | "Account";
type Voucher = { brandName: string; coupon: string; qrCode?: string; expiresAt?: string };
type AccountPanel = "" | "add-kid" | "parent" | `kid-${number}`;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    konnectlyInstallApp?: () => Promise<boolean>;
    konnectlyIsAppInstalled?: () => boolean;
    konnectlyRequestNotifications?: () => Promise<NotificationPermission>;
  }
}

const navItems: Array<{ label: NavLabel; icon: typeof Home }> = [
  { label: "Home", icon: Home },
  { label: "Activities", icon: Grid2X2 },
  { label: "Updates", icon: Bell },
  { label: "Account", icon: User },
];

const APP_DATA_CACHE_KEY = "konnectly_app_data_v1";
const APP_ALREADY_INSTALLED_MESSAGE = "Konnectly app already installed hai. Home screen se open kijiye ya browser ke Open in app button par tap kijiye.";

export default function UserApp() {
  const navInitializedRef = useRef(false);
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState("Loading your Konnectly dashboard...");
  const [activeNav, setActiveNav] = useState<NavLabel>("Home");
  const [referOpen, setReferOpen] = useState(false);
  const [pointsHistoryOpen, setPointsHistoryOpen] = useState(false);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [addKidOpen, setAddKidOpen] = useState(false);
  const [editParentOpen, setEditParentOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<AppKid | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<AppBooking | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [installWorking, setInstallWorking] = useState(false);
  const [installMessage, setInstallMessage] = useState("");
  const [appInstalled, setAppInstalled] = useState(false);

  const setInitialNav = useCallback((nextData: AppData) => {
    if (navInitializedRef.current) return;
    setActiveNav(getPreferredNav(nextData));
    navInitializedRef.current = true;
  }, []);

  const loadData = useCallback(async function loadData() {
    try {
      const response = await fetch("/api/app/data", { cache: "no-store" });
      if (response.status === 401) {
        clearCachedAppData();
        window.location.href = "/login?next=/app";
        return;
      }
      const nextData = await response.json();
      if (!response.ok) throw new Error(nextData.message || "Unable to load app data.");
      setData(nextData);
      cacheAppData(nextData);
      setInitialNav(nextData);
      setWidgetOpen(Boolean(nextData.showWidgetSetup));
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load app data.");
    }
  }, [setInitialNav]);

  useEffect(() => {
    const cached = readCachedAppData();
    if (cached) {
      window.setTimeout(() => {
        setData(cached);
        setInitialNav(cached);
        setWidgetOpen(Boolean(cached.showWidgetSetup));
        setStatus("");
      }, 0);
    }
    const loadTimer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadData, setInitialNav]);

  useEffect(() => {
    function updateTime() {
      const formatted = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date()).toUpperCase();
      setCurrentTime(formatted);
    }

    updateTime();
    const timer = window.setInterval(updateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");

    function refreshInstallState() {
      const installed = isStandaloneApp() || window.konnectlyIsAppInstalled?.() === true;
      setAppInstalled(installed);
      if (installed) {
        setWidgetOpen(false);
        setInstallMessage(APP_ALREADY_INSTALLED_MESSAGE);
      }
    }

    refreshInstallState();
    const deferredCheck = window.setTimeout(refreshInstallState, 150);
    window.addEventListener("appinstalled", refreshInstallState);
    media.addEventListener?.("change", refreshInstallState);
    return () => {
      window.clearTimeout(deferredCheck);
      window.removeEventListener("appinstalled", refreshInstallState);
      media.removeEventListener?.("change", refreshInstallState);
    };
  }, []);

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
      if (appInstalled || isStandaloneApp() || window.konnectlyIsAppInstalled?.()) {
        setAppInstalled(true);
        setStatus(APP_ALREADY_INSTALLED_MESSAGE);
        setInstallMessage(APP_ALREADY_INSTALLED_MESSAGE);
        setWidgetOpen(false);
        return true;
      }

      const installed = await window.konnectlyInstallApp?.();
      if (installed) {
        const message = "Konnectly app install ho gaya hai. Ab aap ise home screen se one-tap open kar sakte hain.";
        setAppInstalled(true);
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

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setStatus("Notifications are not supported on this device/browser.");
      return;
    }

    const permission = window.konnectlyRequestNotifications ? await window.konnectlyRequestNotifications() : await Notification.requestPermission();
    if (permission === "granted" || Notification.permission === "granted") {
      setStatus("Notifications enabled for this profile.");
      return;
    }

    setStatus("Notifications are blocked or not allowed yet. Allow notifications from your browser settings.");
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
            appInstalled={appInstalled}
            onEnableNotifications={enableNotifications}
            onSwitchKid={switchKid}
          />
        ) : (
        <ScreenHeader currentTime={currentTime} title={activeNav === "Account" ? "My Account" : activeNav} subtitle={getSubtitle(activeNav)} showPoints={activeNav === "Activities"} points={data?.user.konnectPoints ?? 0} />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pb-22 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {status && <div className="m-4 rounded-[18px] bg-white p-4 text-sm font-black text-[#5f4bd2] shadow-sm ring-1 ring-[#e9e4fb]">{status}</div>}
          {data && selectedPass && <EventPassScreen booking={selectedPass} onBack={() => setSelectedPass(null)} />}
          {data && !selectedPass && activeNav === "Home" && <HomeContent data={data} onOpenRefer={() => setReferOpen(true)} onOpenPointsHistory={() => setPointsHistoryOpen(true)} onRedeem={redeem} onOpenVoucher={setVoucher} onOpenActivities={() => setActiveNav("Activities")} onInstallApp={handleInstallApp} installWorking={installWorking} installMessage={installMessage} appInstalled={appInstalled} />}
          {data && !selectedPass && activeNav === "Activities" && <ActivitiesScreen data={data} onBook={bookEvent} onOpenPass={setSelectedPass} />}
          {data && !selectedPass && activeNav === "Updates" && <UpdatesScreen notifications={data.notifications} />}
          {data && !selectedPass && activeNav === "Account" && (
            <AccountScreen
              data={data}
              onSwitchKid={switchKid}
              onDataChanged={loadData}
              onAddKidSheet={() => setAddKidOpen(true)}
              onEditParentSheet={() => setEditParentOpen(true)}
              onOpenVoucher={setVoucher}
              onOpenRefer={() => setReferOpen(true)}
              onOpenUpdates={() => setActiveNav("Updates")}
              onInstallApp={handleInstallApp}
              installWorking={installWorking}
              appInstalled={appInstalled}
            />
          )}
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
        {data && pointsHistoryOpen && <PointsHistorySheet data={data} onClose={() => setPointsHistoryOpen(false)} />}
        {voucher && <VoucherSheet voucher={voucher} onClose={() => setVoucher(null)} />}
        {data && addKidOpen && <AddKidSheet onClose={() => setAddKidOpen(false)} onSaved={async () => { setAddKidOpen(false); await loadData(); }} />}
        {data && editParentOpen && <EditParentSheet data={data} onClose={() => setEditParentOpen(false)} onSaved={async () => { setEditParentOpen(false); await loadData(); }} />}
        {editingKid && <EditKidSheet kid={editingKid} onClose={() => setEditingKid(null)} onSaved={async () => { setEditingKid(null); await loadData(); }} />}
        {widgetOpen && <WidgetPrompt onClose={dismissWidget} onInstallApp={handleInstallApp} installWorking={installWorking} installMessage={installMessage} appInstalled={appInstalled} />}
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
  appInstalled,
  onEnableNotifications,
  onSwitchKid,
}: {
  currentTime: string;
  data: AppData | null;
  notification: AppNotification | null;
  onDismissNotification: (id: number) => void;
  onAddKid: () => void;
  onInstallApp: () => void;
  installWorking: boolean;
  appInstalled: boolean;
  onEnableNotifications: () => void;
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
          <IconCircle icon={<Download size={19} />} onClick={onInstallApp} label={appInstalled ? "Konnectly app already installed" : "Install Konnectly app"} busy={installWorking} disabled={appInstalled} />
          <IconCircle icon={<Bell size={19} />} onClick={onEnableNotifications} label="Enable notifications" />
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
          <p className="text-xs font-black text-white/60">{getGreeting()}</p>
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

function HomeContent({
  data,
  onOpenRefer,
  onOpenPointsHistory,
  onRedeem,
  onOpenVoucher,
  onOpenActivities,
  onInstallApp,
  installWorking,
  installMessage,
  appInstalled,
}: {
  data: AppData;
  onOpenRefer: () => void;
  onOpenPointsHistory: () => void;
  onRedeem: (brand: AppBrand) => void;
  onOpenVoucher: (voucher: Voucher) => void;
  onOpenActivities: () => void;
  onInstallApp: () => void;
  installWorking: boolean;
  installMessage: string;
  appInstalled: boolean;
}) {
  const activeKid = data.activeKid;
  const nextEvent = data.events[0];
  const offer = data.brands[0];
  const nextTierRemaining = Math.max(0, 500 - data.user.konnectPoints);

  return (
    <div className="space-y-3 px-4 py-4">
      <HeroSlider
        slides={data.heroSlides ?? []}
        fallbackEvent={nextEvent}
        fallbackOffer={offer}
        onOpenActivities={onOpenActivities}
        onOpenRefer={onOpenRefer}
        onRedeemOffer={offer ? () => onRedeem(offer) : undefined}
        onInstallApp={onInstallApp}
      />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#292444]">Konnect Points</h2>
          <a href="#redeem-rewards" className="flex items-center gap-1 text-xs font-black text-[#5f4bd2]">Redeem <ChevronRight size={16} /></a>
        </div>
        <button onClick={onOpenPointsHistory} className="relative block w-full overflow-hidden rounded-[20px] bg-[#4d39b6] p-4 text-left text-white shadow-sm transition active:scale-[0.99]" type="button">
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
        </button>
      </section>

      <ActiveVouchers history={data.rewardHistory} onOpenVoucher={onOpenVoucher} compact />

      <ActionCard tone="gold" icon={<Gift size={24} />} title="Refer to Earn Points!" body="Invite a family and share your KonnektKode" onClick={onOpenRefer} />
      <ActionCard
        tone="purple"
        icon={<Download size={25} />}
        title={appInstalled ? "App Already Installed" : installWorking ? "Checking Install..." : "Install Konnectly App"}
        body={appInstalled ? "Open it from your home screen" : installMessage || "Use browser install or add to home screen"}
        onClick={onInstallApp}
        busy={installWorking}
        disabled={appInstalled}
      />

      <section id="redeem-rewards">
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

function HeroSlider({
  slides,
  fallbackEvent,
  fallbackOffer,
  onOpenActivities,
  onOpenRefer,
  onRedeemOffer,
  onInstallApp,
}: {
  slides: AppHeroSlide[];
  fallbackEvent?: AppEvent;
  fallbackOffer?: AppBrand;
  onOpenActivities: () => void;
  onOpenRefer: () => void;
  onRedeemOffer?: () => void;
  onInstallApp: () => void;
}) {
  if (slides.length === 0) {
    return (
      <button onClick={fallbackEvent ? onOpenActivities : fallbackOffer ? onRedeemOffer : undefined} className="block w-full text-left" type="button">
        <section className="relative overflow-hidden rounded-[20px] bg-[#6754d6] px-4 py-5 text-white shadow-sm">
          <div className="relative">
            <span className="rounded-full bg-[#f6c400] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#1c1740]">Upcoming Event</span>
            <h2 className="mt-3 text-lg font-black">{fallbackEvent?.title || "New activities coming soon"}</h2>
            <p className="mt-2 text-xs font-black text-white/80">{fallbackEvent ? `${formatDate(fallbackEvent.eventDate)} | ${fallbackEvent.location}` : fallbackOffer ? `${fallbackOffer.name} voucher is available` : "Watch this space for community events"}</p>
          </div>
        </section>
      </button>
    );
  }

  function handleSlide(slide: AppHeroSlide) {
    if (slide.target === "activities") onOpenActivities();
    if (slide.target === "refer") onOpenRefer();
    if (slide.target === "install") onInstallApp();
    if (slide.target === "rewards") onRedeemOffer?.();
  }

  return (
    <section className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3">
        {slides.map((slide) => (
          <button key={slide.id} onClick={() => handleSlide(slide)} className="relative h-44 w-[86%] shrink-0 overflow-hidden rounded-[22px] bg-[#33257e] text-left text-white shadow-sm" type="button">
            <img src={slide.image} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1c1740]/86 via-[#1c1740]/42 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-4">
              <span className="w-fit rounded-full bg-[#f6c400] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#1c1740]">Featured</span>
              <h2 className="mt-3 text-lg font-black leading-tight">{slide.title}</h2>
              <p className="mt-1.5 line-clamp-2 text-xs font-bold text-white/80">{slide.subtitle}</p>
              <span className="mt-3 w-fit rounded-full bg-white/18 px-3.5 py-1.5 text-xs font-black">{slide.ctaLabel}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
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
                  const eligibility = getKidEventEligibility(kid, event);
                  return (
                    <button
                      key={kid.id}
                      disabled={!eligibility.eligible}
                      onClick={() => setSelected((current) => ({ ...current, [event.id]: active ? kidIds.filter((id) => id !== kid.id) : [...kidIds, kid.id] }))}
                      className={`rounded-full px-3 py-1.5 text-xs font-black disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 ${active ? "bg-[#5f4bd2] text-white" : "bg-[#eee7ff] text-[#5f4bd2]"}`}
                      type="button"
                      title={eligibility.reason || kid.childName}
                    >
                      {kid.childName}{eligibility.reason ? ` | ${eligibility.reason}` : ""}
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
      <div className="relative mx-auto max-w-[340px] overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-[#e9e4fb]">
        <div className="bg-[#4432ad] px-5 py-4 text-center text-[#f6c400]">
          <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-[#f6c400] text-sm font-black text-[#1c1740]">K</span>
          <span className="ml-3 text-xs font-black uppercase tracking-[0.28em]">Official Konnectly Pass</span>
        </div>
        <div className="px-6 py-7 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8d89a6]">Scan at check-in</p>
          <div className="mx-auto mt-4 grid h-56 w-56 place-items-center rounded-[28px] border border-[#eee9fb] bg-[#fbfaff] p-3 shadow-sm">
            <QrMock seed={booking.qrToken} />
          </div>
          <h2 className="mt-7 text-2xl font-black text-[#292444]">{booking.childName}</h2>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-[#8d89a6]">Ticket ID</p>
          <p className="mx-auto mt-2 w-fit max-w-full break-all rounded-full bg-[#fff6c9] px-4 py-2 text-xs font-black tracking-[0.12em] text-[#c99000]">{booking.qrToken}</p>
          {booking.backupCode && <p className="mt-3 text-xs font-black text-[#5f4bd2]">Backup code: {booking.backupCode}</p>}
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
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${update.type === "alert" ? "bg-red-100 text-red-700" : "bg-[#eee7ff] text-[#5f4bd2]"}`}>
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

function AccountScreen({
  data,
  onSwitchKid,
  onDataChanged,
  onAddKidSheet,
  onEditParentSheet,
  onOpenVoucher,
  onOpenRefer,
  onOpenUpdates,
  onInstallApp,
  installWorking,
  appInstalled,
}: {
  data: AppData;
  onSwitchKid: (id: number) => void;
  onDataChanged: () => Promise<void>;
  onAddKidSheet: () => void;
  onEditParentSheet: () => void;
  onOpenVoucher: (voucher: Voucher) => void;
  onOpenRefer: () => void;
  onOpenUpdates: () => void;
  onInstallApp: () => void;
  installWorking: boolean;
  appInstalled: boolean;
}) {
  const [openPanel, setOpenPanel] = useState<AccountPanel>("");

  async function signOut() {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    clearCachedAppData();
    window.location.href = "/login";
  }

  async function refreshProfiles() {
    setOpenPanel("");
    await onDataChanged();
  }

  function togglePanel(panel: AccountPanel) {
    setOpenPanel((current) => (current === panel ? "" : panel));
  }

  const onInlineAddKid = () => togglePanel("add-kid");

  return (
    <div className="space-y-3 px-4 py-3">
      <AccountSummaryCard data={data} onOpenRefer={onOpenRefer} onEditProfile={onEditParentSheet} />

      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-[13px] font-black text-[#292444]">Kids Profiles</h2>
          <span className="text-[11px] font-black text-[#8d89a6]">{data.kids.length} Profiles</span>
        </div>
        {data.kids.length === 0 && <EmptyState text="No kid profiles found for this account." />}
        {data.kids.map((kid) => {
          const active = data.activeKid?.id === kid.id;
          return (
            <button
              key={kid.id}
              onClick={() => onSwitchKid(kid.id)}
              className={`flex w-full items-center gap-2.5 rounded-[22px] border-2 bg-white p-3 text-left shadow-sm transition active:scale-[0.99] ${
                active ? "border-[#f6c400]" : "border-transparent ring-1 ring-[#e9e4fb]"
              }`}
              type="button"
            >
              <KidAvatar kid={kid} size={50} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[#292444]">
                  {kid.childName}
                  {active && <span className="ml-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#c99000]">- Active</span>}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-bold text-[#8d89a6]">{kid.school || "School not added"}</span>
              </span>
              <span className="shrink-0 rounded-full bg-[#eee7ff] px-2.5 py-1.5 text-[11px] font-black text-[#5f4bd2]">Age {kid.age || "-"}</span>
            </button>
          );
        })}

        <button
          onClick={onInlineAddKid}
          disabled={data.kids.length >= 3}
          className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[#bdb2f4] bg-transparent px-4 py-4 text-[13px] font-black text-[#5f4bd2] disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
        >
          <Plus size={21} />
          {data.kids.length >= 3 ? "3 Kid Profiles Added" : "Add Kid Profile"}
        </button>
        {openPanel === "add-kid" && <InlineAddKidForm onCancel={() => setOpenPanel("")} onSaved={refreshProfiles} />}
      </section>

      <section className="space-y-2.5">
        <ProfileAccordionCard
          icon={<User size={22} />}
          title="Edit Parent Profile"
          subtitle="Name, email, address"
          open={openPanel === "parent"}
          onToggle={() => togglePanel("parent")}
        >
          <InlineParentProfileForm data={data} onSaved={refreshProfiles} />
        </ProfileAccordionCard>

        {data.kids.map((kid) => (
          <ProfileAccordionCard
            key={kid.id}
            icon={<KidAvatar kid={kid} size={42} />}
            title={`Edit ${kid.childName || "Kid"}`}
            subtitle={kid.konnektKode || (kid.status === "approved" ? "Verified profile" : "ID Pending Review")}
            badge={kid.status === "approved" ? "Verified" : "Pending"}
            open={openPanel === `kid-${kid.id}`}
            onToggle={() => togglePanel(`kid-${kid.id}`)}
          >
            <InlineKidProfileForm kid={kid} onSaved={refreshProfiles} />
          </ProfileAccordionCard>
        ))}
      </section>

      <ActiveVouchers history={data.rewardHistory} onOpenVoucher={onOpenVoucher} />
      <RewardsHistory history={data.rewardHistory} />
      <div className="space-y-2.5">
        <AccountActionCard
          icon={<Download size={19} />}
          title={appInstalled ? "App Already Installed" : installWorking ? "Checking Install..." : "Install Konnectly App"}
          body={appInstalled ? "Open it from your home screen" : "Add to home screen for quick access"}
          tone="gold"
          onClick={onInstallApp}
          disabled={installWorking || appInstalled}
        />
        <AccountActionCard icon={<Plus size={19} />} title="Add Another Child" tone="purple" onClick={onAddKidSheet} disabled={data.kids.length >= 3} />
        <AccountActionCard icon={<Bell size={19} />} title="Updates & Alerts" tone="amber" onClick={onOpenUpdates} />
        <AccountActionCard icon={<Gift size={19} />} title="Refer a Family & Earn" tone="green" onClick={onOpenRefer} />
        <AccountActionCard icon={<LogOut size={19} />} title="Sign Out" tone="red" onClick={signOut} />
      </div>
    </div>
  );
}

function AccountSummaryCard({ data, onOpenRefer, onEditProfile }: { data: AppData; onOpenRefer: () => void; onEditProfile: () => void }) {
  const user = data.user;
  const parentName = user.parentName || user.fatherName || "Parent";

  return (
    <section className="rounded-[22px] bg-white px-3.5 pb-3.5 pt-4 text-center shadow-sm ring-1 ring-[#e9e4fb]">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-[3px] border-[#f6c400] bg-[#6754d6] text-xl font-black text-white">
        {initials(parentName)}
      </div>
      <h2 className="mt-2.5 text-base font-black leading-tight text-[#292444]">{parentName}</h2>
      <p className="mt-0.5 text-[11px] font-bold text-[#8d89a6]">{user.email || user.mobile}</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <AccountStatTile icon={<Shield size={15} />} label="Account" value={user.locality || user.city || "Active"} tone="purple" />
        <AccountStatTile icon={<Users size={15} />} label="Kids" value={`${data.kids.length} Profiles`} tone="purple" />
        <AccountStatTile icon={<User size={15} />} label="Mobile" value={user.mobile} tone="gold" />
        <AccountStatTile icon={<MapPin size={15} />} label="City" value={user.city || user.locality || user.state || "-"} tone="gold" />
      </div>

      <div className="mx-auto mt-3.5 w-fit max-w-full rounded-full bg-[#5f4bd2] px-4 py-1.5 text-[10px] font-black tracking-[0.16em] text-[#f6c400]">
        {user.konnektKode || "KK-XXXXX"}
      </div>
      <p className="mt-1.5 text-[11px] font-black text-[#8d89a6]">Your KonnektKode - share to refer families</p>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <button onClick={onOpenRefer} className="rounded-full bg-[#f6c400] px-4 py-2.5 text-xs font-black text-[#292444]" type="button">
          Refer & Earn
        </button>
        <button onClick={onEditProfile} className="rounded-full bg-[#eee7ff] px-4 py-2.5 text-xs font-black text-[#5f4bd2]" type="button">
          Edit Profile
        </button>
      </div>
    </section>
  );
}

function AccountStatTile({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "purple" | "gold" }) {
  const purple = tone === "purple";
  return (
    <div className={`min-w-0 rounded-[17px] border px-2.5 py-3 ${purple ? "border-[#eee7ff] bg-[#eee7ff]" : "border-[#efd071] bg-[#fff8df]"}`}>
      <p className={`flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${purple ? "text-[#5f4bd2]" : "text-[#c99000]"}`}>
        {icon} {label}
      </p>
      <p className="mt-1.5 truncate text-xs font-black text-[#292444]">{value || "-"}</p>
    </div>
  );
}

function ProfileAccordionCard({
  icon,
  title,
  subtitle,
  badge,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] bg-white shadow-sm ring-1 ring-[#e9e4fb]">
      <button onClick={onToggle} className="flex w-full items-center gap-2.5 px-3.5 py-3.5 text-left" type="button">
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#eee7ff] text-[#5f4bd2]">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-[#292444]">{title}</span>
          <span className="mt-0.5 block truncate text-xs font-bold text-[#8d89a6]">{subtitle}</span>
        </span>
        {badge && <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-black sm:inline-flex ${badge === "Verified" ? "bg-green-100 text-green-700" : "bg-[#fff8df] text-[#c99000]"}`}>{badge}</span>}
        <ChevronRight size={18} className={`shrink-0 text-[#8d89a6] transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <div className="border-t border-[#eee9fb] bg-[#fbfaff] px-4 py-4">{children}</div>}
    </div>
  );
}

function InlineAddKidForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => Promise<void> }) {
  const [childName, setChildName] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState("");
  const [gender, setGender] = useState("All");
  const [photo, setPhoto] = useState("");
  const [photoData, setPhotoData] = useState("");
  const [schoolIdCard, setSchoolIdCard] = useState("");
  const [schoolIdCardData, setSchoolIdCardData] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const age = Number(ageInput);
  const ageInvalid = Boolean(ageInput) && (!Number.isFinite(age) || age < 0 || age > 18);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ageInvalid) {
      setStatus("Child age cannot be more than 18 years.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      await postJson("/api/app/kids", { childName, dob, school, gender, photo, photoData, schoolIdCard, schoolIdCardData });
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add child profile.");
    } finally {
      setLoading(false);
    }
  }

  function updateDob(value: string) {
    setDob(value);
    const nextAge = getAgeFromDob(value);
    setAgeInput(nextAge ? String(nextAge) : "");
  }

  function updateAge(value: string) {
    const nextValue = value.replace(/\D/g, "").slice(0, 2);
    setAgeInput(nextValue);
    if (Number(nextValue) > 18) setStatus("Child age cannot be more than 18 years.");
    else if (status === "Child age cannot be more than 18 years.") setStatus("");
  }

  function uploadFile(file: File | undefined, type: "photo" | "schoolId") {
    setStatus("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatus("File size should be 5MB or less.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (type === "photo") {
        setPhoto(file.name);
        setPhotoData(value);
      } else {
        setSchoolIdCard(file.name);
        setSchoolIdCardData(value);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={submit} className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-[#e9e4fb]">
      <label className="mx-auto grid w-fit place-items-center">
        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => { event.currentTarget.blur(); uploadFile(event.target.files?.[0], "photo"); }} />
        <span className="relative h-20 w-20">
          <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-2 border-dashed border-[#bdb2f4] bg-[#f3f0ff] text-[#5f4bd2]">
            {photoData ? <img src={photoData} alt="" className="h-full w-full rounded-full object-cover" /> : <Camera size={30} />}
          </span>
          <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl border-2 border-white bg-[#f6c400] text-[#292444] shadow-lg">
            <Camera size={16} strokeWidth={2.6} />
          </span>
        </span>
        <span className="mt-2 text-xs font-black text-[#8d89a6]">{photo ? "Photo selected" : "Upload child photo"}</span>
      </label>

      <div className="mt-4 grid gap-3">
        <KidFormInput label="Child's Full Name" value={childName} onChange={setChildName} placeholder="e.g. Aarav Sharma" />
        <div className="grid grid-cols-2 gap-3">
          <KidFormInput label="Age" value={ageInput} onChange={updateAge} placeholder="Age" type="number" min="0" max="18" />
          <KidFormInput label="Date of Birth" value={dob} onChange={updateDob} placeholder="" type="date" min={dateYearsAgo(18)} max={todayDateInput()} />
        </div>
        {ageInvalid && <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-black text-red-600">Age cannot be more than 18 years.</p>}
        <KidFormInput label="School Name" value={school} onChange={setSchool} placeholder="e.g. DPS R.K. Puram" />
        <ProfileSelect label="Gender" value={gender} onChange={setGender} options={["All", "Boy", "Girl"]} />
        <ProfileFileDrop label={schoolIdCard ? schoolIdCard : "Tap to upload School ID"} onFile={(file) => uploadFile(file, "schoolId")} />
      </div>

      {status && <p className="mt-3 rounded-2xl bg-[#f3f0ff] px-4 py-3 text-xs font-black leading-5 text-[#6655cf]">{status}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={onCancel} className="rounded-full border-2 border-[#e3def8] bg-white px-4 py-3 text-xs font-black text-[#5f4bd2]" type="button">Cancel</button>
        <button disabled={loading || !childName.trim() || !ageInput || !dob || ageInvalid || !school.trim() || !photo || !schoolIdCard} className="rounded-full bg-[#6754d6] px-4 py-3 text-xs font-black text-white disabled:opacity-50" type="submit">
          {loading ? "Saving..." : "Submit"}
        </button>
      </div>
    </form>
  );
}

function InlineParentProfileForm({ data, onSaved }: { data: AppData; onSaved: () => Promise<void> }) {
  const user = data.user;
  const [parentName, setParentName] = useState(user.parentName);
  const [email, setEmail] = useState(user.email);
  const [fatherName, setFatherName] = useState(user.fatherName);
  const [motherName, setMotherName] = useState(user.motherName);
  const [alternateMobile, setAlternateMobile] = useState(user.alternateMobile);
  const [profession, setProfession] = useState(user.profession);
  const [address, setAddress] = useState(user.address);
  const [locality, setLocality] = useState(user.locality);
  const [city, setCity] = useState(user.city);
  const [state, setState] = useState(user.state);
  const [pincode, setPincode] = useState(user.pincode);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      await postJson("/api/app/profile", { parentName, email, fatherName, motherName, alternateMobile, profession, address, locality, city, state, pincode });
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update parent profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <SheetInput label="Parent Name" value={parentName} onChange={setParentName} placeholder="Parent name" />
      <SheetInput label="Email" value={email} onChange={setEmail} placeholder="parent@example.com" type="email" required={false} />
      <div className="grid grid-cols-2 gap-3">
        <SheetInput label="Father Name" value={fatherName} onChange={setFatherName} placeholder="Father name" required={false} />
        <SheetInput label="Mother Name" value={motherName} onChange={setMotherName} placeholder="Mother name" required={false} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SheetInput label="Alternate Mobile" value={alternateMobile} onChange={setAlternateMobile} placeholder="Alternate mobile" required={false} />
        <SheetInput label="Profession" value={profession} onChange={setProfession} placeholder="Profession" required={false} />
      </div>
      <SheetInput label="Address" value={address} onChange={setAddress} placeholder="Address" required={false} />
      <div className="grid grid-cols-2 gap-3">
        <SheetInput label="Locality" value={locality} onChange={setLocality} placeholder="Locality" required={false} />
        <SheetInput label="City" value={city} onChange={setCity} placeholder="City" required={false} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SheetInput label="State" value={state} onChange={setState} placeholder="State" required={false} />
        <SheetInput label="Pincode" value={pincode} onChange={setPincode} placeholder="Pincode" required={false} />
      </div>
      <p className="rounded-2xl bg-[#f3f0ff] px-4 py-3 text-xs font-black text-[#8d89a6]">Login mobile locked hai: {user.mobile}</p>
      {status && <p className="text-xs font-black text-[#6655cf]">{status}</p>}
      <button disabled={loading || !parentName.trim()} className="rounded-full bg-[#6754d6] px-5 py-3 text-sm font-black text-white disabled:opacity-50" type="submit">
        {loading ? "Saving..." : "Save Parent Profile"}
      </button>
    </form>
  );
}

function InlineKidProfileForm({ kid, onSaved }: { kid: AppKid; onSaved: () => Promise<void> }) {
  const [childName, setChildName] = useState(kid.childName);
  const [dob, setDob] = useState(toDateInputValue(kid.dob));
  const [school, setSchool] = useState(kid.school);
  const [gender, setGender] = useState(kid.gender || "All");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      await postJson("/api/app/kids/update", { kidId: kid.id, childName, dob, school, gender });
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update kid profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <SheetInput label="Child's Full Name" value={childName} onChange={setChildName} placeholder="As per school records" />
      <div className="grid grid-cols-2 gap-3">
        <SheetInput label="Date of Birth" value={dob} onChange={setDob} placeholder="" type="date" />
        <ProfileSelect label="Gender" value={gender} onChange={setGender} options={["All", "Boy", "Girl"]} />
      </div>
      <SheetInput label="School Name" value={school} onChange={setSchool} placeholder="School name" />
      <p className="rounded-2xl bg-[#f3f0ff] px-4 py-3 text-xs font-black text-[#8d89a6]">Status: {kid.status === "approved" ? "Verified" : "Pending Review"} - Age {kid.age || "-"}</p>
      {status && <p className="text-xs font-black text-[#6655cf]">{status}</p>}
      <button disabled={loading || !childName.trim() || !dob || !school.trim()} className="rounded-full bg-[#6754d6] px-5 py-3 text-sm font-black text-white disabled:opacity-50" type="submit">
        {loading ? "Saving..." : "Save Kid Profile"}
      </button>
    </form>
  );
}

function ProfileSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#292444]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none focus:border-[#6655cf]">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ProfileFileDrop({ label, onFile }: { label: string; onFile: (file: File | undefined) => void }) {
  return (
    <label className="grid min-h-28 place-items-center rounded-[22px] border-2 border-dashed border-[#bdb2f4] bg-[#f7f5ff] px-4 py-5 text-center">
      <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(event) => { event.currentTarget.blur(); onFile(event.target.files?.[0]); }} />
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#5f4bd2] shadow-sm">
        <Paperclip size={21} />
      </span>
      <span className="mt-3 text-sm font-black text-[#5f4bd2]">{label}</span>
      <span className="mt-1 text-[11px] font-black text-[#9a96b8]">PDF, JPG or PNG - Max 5MB</span>
    </label>
  );
}

function AccountActionCard({
  icon,
  title,
  body,
  tone,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  tone: "gold" | "purple" | "amber" | "green" | "red";
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneStyles = {
    gold: "border-[#e6b800] bg-[#fff6d8] text-[#c99000]",
    purple: "border-[#e9e4fb] bg-white text-[#5f4bd2]",
    amber: "border-[#e9e4fb] bg-white text-[#d49b00]",
    green: "border-[#e9e4fb] bg-white text-[#20c767]",
    red: "border-[#e9e4fb] bg-white text-[#ef4444]",
  };
  const iconStyles = {
    gold: "bg-white text-[#d49b00]",
    purple: "bg-[#eee7ff] text-[#5f4bd2]",
    amber: "bg-[#fff8df] text-[#d49b00]",
    green: "bg-[#dcfce7] text-[#16bf62]",
    red: "bg-red-50 text-[#ef4444]",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-[17px] border-2 px-3.5 py-2.5 text-left shadow-sm disabled:cursor-not-allowed disabled:opacity-45 ${toneStyles[tone]}`}
      type="button"
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${iconStyles[tone]}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-black text-[#2a2448]">{title}</span>
        {body && <span className="mt-0.5 block text-[11px] font-bold text-[#8d89a6]">{body}</span>}
      </span>
      <ChevronRight size={17} className={tone === "gold" ? "text-[#d49b00]" : "text-[#c4c0d4]"} />
    </button>
  );
}

function ActiveVouchers({ history, onOpenVoucher, compact }: { history: AppRewardHistory[]; onOpenVoucher: (voucher: Voucher) => void; compact?: boolean }) {
  const activeVouchers = history.filter(isActiveRewardVoucher);
  if (activeVouchers.length === 0) return null;

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-[#292444]">Active Vouchers</h2>
        <span className="text-[11px] font-black text-[#16a34a]">QR valid for 15 days</span>
      </div>
      <div className="space-y-2.5">
        {activeVouchers.map((entry) => {
          const voucher = rewardEntryToVoucher(entry);
          return (
            <button
              key={entry.id}
              onClick={() => onOpenVoucher(voucher)}
              className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-sm ring-1 ring-[#e9e4fb] transition active:scale-[0.99]"
              type="button"
            >
              <span className={`grid shrink-0 place-items-center rounded-2xl bg-[#f7f5ff] ${compact ? "h-16 w-16" : "h-20 w-20"}`}>
                <QrMock seed={entry.qrCode || entry.voucherCode} small />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[#292444]">{entry.brandName} Voucher</span>
                <span className="mt-1 block truncate text-[11px] font-black tracking-[0.12em] text-[#5f4bd2]">{entry.voucherCode}</span>
                <span className="mt-1 block text-[11px] font-bold text-[#8d89a6]">{formatVoucherValidity(entry)}</span>
              </span>
              <span className="shrink-0 rounded-full bg-green-100 px-3 py-1.5 text-[10px] font-black text-green-700">View QR</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RewardsHistory({ history }: { history: AppRewardHistory[] }) {
  const grouped = history.reduce<Record<string, AppRewardHistory[]>>((acc, item) => {
    acc[item.month] = [...(acc[item.month] ?? []), item];
    return acc;
  }, {});

  return (
    <section>
      <h2 className="mb-2.5 text-sm font-black text-[#292444]">Rewards History</h2>
      <div className="space-y-2.5">
        {history.length === 0 && <EmptyState text="No vouchers or redemptions yet." />}
        {Object.entries(grouped).map(([month, entries]) => (
          <div key={month} className="rounded-[18px] bg-white p-3.5 shadow-sm ring-1 ring-[#e9e4fb]">
            <h3 className="text-xs font-black text-[#292444]">{month}</h3>
            <div className="mt-3 space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="rounded-[14px] bg-[#f7f5ff] p-2.5">
                  <p className="text-xs font-black text-[#292444]">{entry.brandName}</p>
                  <p className="mt-1 text-[11px] font-bold text-[#8d89a6]">{entry.pointsSpent} pts | {entry.voucherCode} | {entry.status}</p>
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
  const [ageInput, setAgeInput] = useState("");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoData, setPhotoData] = useState("");
  const [schoolIdCard, setSchoolIdCard] = useState("");
  const [schoolIdCardData, setSchoolIdCardData] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const age = Number(ageInput);
  const ageInvalid = Boolean(ageInput) && (!Number.isFinite(age) || age < 0 || age > 18);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ageInvalid) {
      setStatus("Child age cannot be more than 18 years.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      await postJson("/api/app/kids", { childName, dob, school, photo, photoData, schoolIdCard, schoolIdCardData });
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add child profile.");
    } finally {
      setLoading(false);
    }
  }

  function updateDob(value: string) {
    setDob(value);
    const nextAge = getAgeFromDob(value);
    setAgeInput(nextAge ? String(nextAge) : "");
  }

  function updateAge(value: string) {
    const nextValue = value.replace(/\D/g, "").slice(0, 2);
    setAgeInput(nextValue);
    if (Number(nextValue) > 18) setStatus("Child age cannot be more than 18 years.");
    else if (status === "Child age cannot be more than 18 years.") setStatus("");
  }

  function uploadFile(file: File | undefined, type: "photo" | "schoolId") {
    setStatus("");
    if (!file) {
      if (type === "photo") {
        setPhoto("");
        setPhotoData("");
      } else {
        setSchoolIdCard("");
        setSchoolIdCardData("");
      }
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus("File size should be 5MB or less.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (type === "photo") {
        setPhoto(file.name);
        setPhotoData(value);
      } else {
        setSchoolIdCard(file.name);
        setSchoolIdCardData(value);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="absolute bottom-[72px] left-0 right-0 top-0 z-[15] flex flex-col overflow-hidden bg-[#f7f5ff]">
      <div className="relative shrink-0 overflow-hidden bg-[#4d39b6] px-5 pb-7 pt-2.5 text-white">
        <div className="absolute -right-12 top-0 h-36 w-36 rounded-full bg-white/14" />
        <StatusBar currentTime={new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date()).toUpperCase()} />
        <div className="relative mt-5 flex items-center gap-4">
          <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/12 text-[#f6c400]" type="button" aria-label="Back to account">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-black leading-tight">Add Kid Profile</h2>
            <p className="mt-1.5 text-xs font-black text-white/55">Tell us about your child</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-h-full flex-col rounded-[26px] bg-white p-4 shadow-sm ring-2 ring-[#e8e2fb]">
          <label className="mx-auto grid w-fit place-items-center">
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => { event.currentTarget.blur(); uploadFile(event.target.files?.[0], "photo"); }} />
            <span className="relative h-24 w-24">
              <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-dashed border-[#bdb2f4] bg-[#f3f0ff] text-[#5f4bd2]">
                {photoData ? <img src={photoData} alt="" className="h-full w-full rounded-full object-cover" /> : <Camera size={34} />}
              </span>
              <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl border-2 border-white bg-[#f6c400] text-[#292444] shadow-lg">
                <Camera size={16} strokeWidth={2.6} />
              </span>
            </span>
            <span className="mt-2 text-xs font-black text-[#8d89a6]">{photo ? "Photo selected" : "Upload child photo"}</span>
          </label>

          <div className="mt-5 grid gap-3.5">
            <KidFormInput label="Child's Full Name" value={childName} onChange={setChildName} placeholder="e.g. Aarav Sharma" />
            <div className="grid grid-cols-2 gap-3">
              <KidFormInput label="Age" value={ageInput} onChange={updateAge} placeholder="Age" type="number" min="0" max="18" />
              <KidFormInput label="Date of Birth" value={dob} onChange={updateDob} placeholder="" type="date" min={dateYearsAgo(18)} max={todayDateInput()} />
            </div>
            {ageInvalid && <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-black text-red-600">Age cannot be more than 18 years.</p>}
            <KidFormInput label="School Name" value={school} onChange={setSchool} placeholder="e.g. DPS R.K. Puram" />

            <label className="grid min-h-32 place-items-center rounded-[22px] border-2 border-dashed border-[#bdb2f4] bg-[#f7f5ff] px-4 py-5 text-center">
              <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(event) => { event.currentTarget.blur(); uploadFile(event.target.files?.[0], "schoolId"); }} />
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#5f4bd2] shadow-sm">
                <Paperclip size={21} />
              </span>
              <span className="mt-3 text-sm font-black text-[#5f4bd2]">{schoolIdCard ? schoolIdCard : "Tap to upload School ID"}</span>
              <span className="mt-1 text-[11px] font-black text-[#9a96b8]">PDF, JPG or PNG - Max 5MB</span>
            </label>
          </div>

          <div className="mt-auto pt-5">
            {status && <p className="mb-4 rounded-2xl bg-[#f3f0ff] px-4 py-3 text-xs font-black leading-5 text-[#6655cf]">{status}</p>}
            <button disabled={loading || !childName.trim() || !ageInput || !dob || ageInvalid || !school.trim() || !photo || !schoolIdCard} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#6754d6] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_28px_rgba(103,84,214,0.25)] disabled:opacity-50" type="submit">
              <Check size={18} /> {loading ? "Saving..." : "Submit for Verification"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function KidFormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  readOnly?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#292444]">
      {label}
      <input
        required={!readOnly}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => {
          if (type !== "date") return;
          const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
          input.showPicker?.();
        }}
        placeholder={placeholder}
        type={type}
        min={min}
        max={max}
        className="h-13 rounded-[16px] border-2 border-[#ddd8f5] bg-[#f7f5ff] px-4 text-sm font-black normal-case tracking-normal text-[#292444] outline-none transition placeholder:text-sm placeholder:font-black placeholder:text-[#8d89a6] focus:border-[#6655cf] read-only:text-[#8d89a6]"
      />
    </label>
  );
}

function EditParentSheet({ data, onClose, onSaved }: { data: AppData; onClose: () => void; onSaved: () => void }) {
  const user = data.user;
  const [parentName, setParentName] = useState(user.parentName);
  const [email, setEmail] = useState(user.email);
  const [fatherName, setFatherName] = useState(user.fatherName);
  const [motherName, setMotherName] = useState(user.motherName);
  const [alternateMobile, setAlternateMobile] = useState(user.alternateMobile);
  const [profession, setProfession] = useState(user.profession);
  const [address, setAddress] = useState(user.address);
  const [locality, setLocality] = useState(user.locality);
  const [city, setCity] = useState(user.city);
  const [state, setState] = useState(user.state);
  const [pincode, setPincode] = useState(user.pincode);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      await postJson("/api/app/profile", { parentName, email, fatherName, motherName, alternateMobile, profession, address, locality, city, state, pincode });
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update parent profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#161332]/55 backdrop-blur-sm">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close edit parent" onClick={onClose} />
      <form onSubmit={submit} className="relative max-h-[88%] w-full overflow-y-auto rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" />
        <button onClick={onClose} className="absolute right-5 top-5 text-[#8d89a6]" type="button" aria-label="Close"><X size={20} /></button>
        <h2 className="text-xl font-black text-[#292444]">Edit Parent Profile</h2>
        <p className="mt-2 text-sm font-bold text-[#8d89a6]">Mobile number stays locked because it is used for login.</p>
        <div className="mt-5 grid gap-3">
          <SheetInput label="Parent Name" value={parentName} onChange={setParentName} placeholder="Parent name" />
          <SheetInput label="Email" value={email} onChange={setEmail} placeholder="parent@example.com" type="email" required={false} />
          <SheetInput label="Father Name" value={fatherName} onChange={setFatherName} placeholder="Father name" required={false} />
          <SheetInput label="Mother Name" value={motherName} onChange={setMotherName} placeholder="Mother name" required={false} />
          <SheetInput label="Alternate Mobile" value={alternateMobile} onChange={setAlternateMobile} placeholder="Alternate mobile" required={false} />
          <SheetInput label="Profession" value={profession} onChange={setProfession} placeholder="Profession" required={false} />
          <SheetInput label="Address" value={address} onChange={setAddress} placeholder="Address" required={false} />
          <div className="grid grid-cols-2 gap-3">
            <SheetInput label="Locality" value={locality} onChange={setLocality} placeholder="Locality" required={false} />
            <SheetInput label="City" value={city} onChange={setCity} placeholder="City" required={false} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SheetInput label="State" value={state} onChange={setState} placeholder="State" required={false} />
            <SheetInput label="Pincode" value={pincode} onChange={setPincode} placeholder="Pincode" required={false} />
          </div>
        </div>
        {status && <p className="mt-3 text-xs font-black text-[#6655cf]">{status}</p>}
        <button disabled={loading || !parentName.trim()} className="mt-5 w-full rounded-full bg-[#6754d6] px-5 py-3 text-sm font-black text-white disabled:opacity-50" type="submit">
          {loading ? "Saving..." : "Save Parent Profile"}
        </button>
      </form>
    </div>
  );
}

function EditKidSheet({ kid, onClose, onSaved }: { kid: AppKid; onClose: () => void; onSaved: () => void }) {
  const [childName, setChildName] = useState(kid.childName);
  const [dob, setDob] = useState(toDateInputValue(kid.dob));
  const [school, setSchool] = useState(kid.school);
  const [gender, setGender] = useState(kid.gender || "All");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      await postJson("/api/app/kids/update", { kidId: kid.id, childName, dob, school, gender });
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update kid profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#161332]/55 backdrop-blur-sm">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close edit child" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" />
        <button onClick={onClose} className="absolute right-5 top-5 text-[#8d89a6]" type="button" aria-label="Close"><X size={20} /></button>
        <h2 className="text-xl font-black text-[#292444]">Edit Kid Profile</h2>
        <p className="mt-2 text-sm font-bold text-[#8d89a6]">Keep details accurate so event eligibility is shown before payment.</p>
        <div className="mt-5 grid gap-3">
          <SheetInput label="Child's Full Name" value={childName} onChange={setChildName} placeholder="As per school records" />
          <SheetInput label="Date of Birth" value={dob} onChange={setDob} placeholder="" type="date" />
          <SheetInput label="School Name" value={school} onChange={setSchool} placeholder="School name" />
          <label className="grid gap-1 text-[11px] font-black text-[#292444]">
            Gender
            <select value={gender} onChange={(event) => setGender(event.target.value)} className="h-12 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none focus:border-[#6655cf]">
              <option>All</option>
              <option>Boy</option>
              <option>Girl</option>
            </select>
          </label>
        </div>
        {status && <p className="mt-3 text-xs font-black text-[#6655cf]">{status}</p>}
        <button disabled={loading || !childName.trim() || !dob || !school.trim()} className="mt-5 w-full rounded-full bg-[#6754d6] px-5 py-3 text-sm font-black text-white disabled:opacity-50" type="submit">
          {loading ? "Saving..." : "Save Kid Profile"}
        </button>
      </form>
    </div>
  );
}

function SheetInput({ label, value, onChange, placeholder, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-[11px] font-black text-[#292444]">
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className="h-12 rounded-2xl border-2 border-[#e3e0f4] bg-white px-3.5 text-xs font-bold outline-none focus:border-[#6655cf]" />
    </label>
  );
}

function WidgetPrompt({ onClose, onInstallApp, installWorking, installMessage, appInstalled }: { onClose: () => void; onInstallApp: (showFallback?: boolean) => Promise<boolean>; installWorking: boolean; installMessage: string; appInstalled: boolean }) {
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-[#161332]/70 px-5 backdrop-blur-sm">
      <div className="w-full rounded-[28px] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#25d366] text-white"><Download size={28} /></div>
        <h2 className="mt-5 text-2xl font-black leading-tight text-[#292444]">Never miss an event — add Konnectly to your home screen!</h2>
        <div className="mt-5 grid gap-3 text-left">
          <div className="rounded-[14px] bg-[#f7f5ff] p-2.5 text-xs font-bold leading-5 text-[#292444]"><b>iOS:</b> Tap Share in Safari, choose Add to Home Screen, then tap Add.</div>
          <div className="rounded-[14px] bg-[#f7f5ff] p-2.5 text-xs font-bold leading-5 text-[#292444]"><b>Android:</b> Open browser menu, choose Install app or Add to Home screen, then confirm.</div>
        </div>
        {installMessage && <p className="mt-4 rounded-2xl bg-[#fff8df] p-3 text-xs font-black leading-5 text-[#8a6500]">{installMessage}</p>}
        <button disabled={installWorking || appInstalled} onClick={async () => { if (await onInstallApp(false)) onClose(); }} className="mt-5 w-full rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-65" type="button">{appInstalled ? "Already Installed" : installWorking ? "Checking..." : "Add to Home Screen"}</button>
        <button onClick={onClose} className="mt-3 w-full rounded-full border-2 border-[#e3e0f4] px-5 py-3 text-sm font-black text-[#6655cf]" type="button">Maybe Later</button>
      </div>
    </div>
  );
}

function PointsHistorySheet({ data, onClose }: { data: AppData; onClose: () => void }) {
  const history = data.pointHistory ?? [];
  const earned = history.reduce((total, entry) => total + Math.max(0, entry.points), 0);
  const used = history.reduce((total, entry) => total + Math.abs(Math.min(0, entry.points)), 0);
  const grouped = history.reduce<Record<string, AppPointHistory[]>>((acc, item) => {
    acc[item.month] = [...(acc[item.month] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#161332]/55 backdrop-blur-sm">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close points history" onClick={onClose} />
      <div className="relative max-h-[88dvh] w-full overflow-hidden rounded-t-[32px] bg-white shadow-2xl">
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-zinc-300" />
        <button onClick={onClose} className="absolute right-5 top-5 text-[#8d89a6]" type="button" aria-label="Close"><X size={20} /></button>

        <div className="px-5 pb-4 pt-5">
          <h2 className="text-xl font-black text-[#292444]">Konnect Points History</h2>
          <div className="mt-5 overflow-hidden rounded-[22px] bg-[#4d39b6] p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Current Balance</p>
                <p className="mt-1 text-3xl font-black">{data.user.konnectPoints} pts</p>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[#f6c400] text-xl font-black text-[#292444]">
                <Star size={26} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <PointSummary label="Earned" value={earned > 0 ? `+${earned}` : "0"} tone="green" />
              <PointSummary label="Used" value={used > 0 ? `-${used}` : "0"} tone="gold" />
            </div>
          </div>
        </div>

        <div className="max-h-[52dvh] overflow-y-auto px-5 pb-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {history.length === 0 ? (
            <div className="grid place-items-center rounded-[22px] border-2 border-dashed border-[#e9e4fb] bg-[#f7f5ff] px-5 py-8 text-center">
              <History size={34} className="text-[#5f4bd2]" />
              <p className="mt-3 text-sm font-black text-[#292444]">No point history yet.</p>
              <p className="mt-1 text-xs font-bold text-[#8d89a6]">Bookings, attendance, referrals and rewards will appear here.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(grouped).map(([month, entries]) => (
                <div key={month}>
                  <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#8d89a6]">{month}</h3>
                  <div className="space-y-2.5">
                    {entries.map((entry) => {
                      const positive = entry.points >= 0;
                      return (
                        <div key={entry.id} className="flex gap-3 rounded-[18px] bg-[#f7f5ff] p-3 ring-1 ring-[#e9e4fb]">
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${positive ? "bg-[#dcfce7] text-[#16bf62]" : "bg-[#fff5d9] text-[#c99000]"}`}>
                            {positive ? <Star size={19} /> : <Gift size={19} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block text-sm font-black text-[#292444]">{pointHistoryTitle(entry)}</span>
                                <span className="mt-0.5 block text-[11px] font-bold leading-4 text-[#8d89a6]">{pointHistoryDetail(entry)}</span>
                              </span>
                              <span className={`shrink-0 text-sm font-black ${positive ? "text-[#16bf62]" : "text-[#c99000]"}`}>{formatSignedPoints(entry.points)}</span>
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#aaa5bc]">
                              {entry.childName && <span>{entry.childName}</span>}
                              <span>{formatPointHistoryDate(entry.createdAt)}</span>
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PointSummary({ label, value, tone }: { label: string; value: string; tone: "green" | "gold" }) {
  return (
    <div className="rounded-2xl bg-white/12 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">{label}</p>
      <p className={`mt-1 text-base font-black ${tone === "green" ? "text-[#9effbd]" : "text-[#f6c400]"}`}>{value} pts</p>
    </div>
  );
}

function ReferBottomSheet({ data, onClose }: { data: AppData; onClose: () => void }) {
  const referCode = data.user.konnektKode || data.activeKid?.konnektKode || "KK-XXXXX";
  const name = data.user.parentName || "a parent";
  const referText = `Hi! I'm ${name}, a proud Konnectly member. Join us and use my KonnektKode ${referCode}. Bonus points unlock after the first child profile is verified: ${data.referralUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(referText)}`;

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#161332]/55 backdrop-blur-sm">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close referral sheet" onClick={onClose} />
      <div className="relative w-full rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" />
        <button onClick={onClose} className="absolute right-5 top-5 text-[#8d89a6]" type="button" aria-label="Close"><X size={20} /></button>
        <h2 className="text-xl font-black text-[#292444]">Refer & Earn Points!</h2>
        <p className="mt-2 text-sm font-bold text-[#8d89a6]">Share with a family. Points unlock after their first child profile is verified.</p>
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
      <div className="relative w-full rounded-t-[32px] bg-white px-5 pb-7 pt-3 text-center shadow-2xl ring-1 ring-white/40">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" />
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8d89a6]">Active voucher</p>
        <h2 className="mt-2 text-xl font-black text-[#292444]">{voucher.brandName}</h2>
        <p className="mt-2 text-sm font-bold text-[#8d89a6]">Show this QR at the partner counter</p>
        <div className="mx-auto mt-5 w-fit rounded-[26px] bg-[#f7f5ff] p-5 text-[#292444] ring-1 ring-[#e9e4fb]">
          <div className="mx-auto grid h-52 w-52 place-items-center rounded-[22px] bg-white p-2 shadow-sm"><QrMock seed={voucher.qrCode || voucher.coupon} /></div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#8d89a6]">Voucher code</p>
          <div className="mt-2 rounded-full bg-[#f6c400] px-5 py-2 text-sm font-black tracking-[0.18em] text-[#1c1740]">{voucher.coupon}</div>
        </div>
        {voucher.expiresAt && <p className="mt-3 text-xs font-black text-[#8d89a6]">Valid until {formatPointHistoryDate(voucher.expiresAt)}</p>}
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
    <div className={`inline-flex items-center rounded-[12px] bg-white px-3 py-[8px] font-extrabold text-[#5f4bd2] shadow-[0_4px_14px_rgba(0,0,0,0.10)] ${compact ? "scale-95" : ""}`}>
      <Image src="/images/logo.png" alt="Konnectly" width={108} height={28} className="block h-5 w-auto object-contain" priority />
    </div>
  );
}

function KidAvatar({ kid, size, large }: { kid: AppKid; size: number; large?: boolean }) {
  const className = `${large ? "border-[3px] border-[#ffe05a]" : ""} rounded-full object-cover`;
  if (kid.photo?.startsWith("data:")) return <img src={kid.photo} alt="" className={className} style={{ width: size, height: size }} />;
  if (kid.photo) return <Image src={kid.photo} alt="" width={size} height={size} className={className} style={{ width: size, height: size }} />;
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-[#f6c400] font-black text-[#1c1740] ${large ? "border-[3px] border-[#ffe05a] text-lg" : "text-xs"}`} style={{ width: size, height: size }}>
      {initials(kid.childName)}
    </span>
  );
}

function IconCircle({ icon, onClick, label, busy, disabled }: { icon: ReactNode; onClick?: () => void; label?: string; busy?: boolean; disabled?: boolean }) {
  return (
    <button onClick={() => onClick?.()} disabled={busy || disabled} className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/12 text-white transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-45" type="button" aria-label={label} title={label}>
      {icon}
    </button>
  );
}

function ActionCard({ tone, icon, title, body, onClick, busy, disabled }: { tone: "gold" | "purple"; icon: ReactNode; title: string; body: string; onClick?: () => void; busy?: boolean; disabled?: boolean }) {
  const isGold = tone === "gold";
  return (
    <button onClick={() => onClick?.()} disabled={busy || disabled} className={`flex w-full items-center gap-3 rounded-[20px] border-2 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65 ${isGold ? "border-[#e6b800] bg-[#fff6c9] hover:shadow-[#e6b800]/20" : "border-[#7765dd] bg-[#e9e3ff] hover:shadow-[#7765dd]/20"}`} type="button">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white transition ${busy ? "animate-pulse" : ""} ${isGold ? "text-[#c99000]" : "text-[#5f4bd2]"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-black ${isGold ? "text-[#c99000]" : "text-[#5f4bd2]"}`}>{title}</span>
        
        <span className="mt-0.5 block text-[11px] font-bold text-[#8d89a6]">{body}</span>
      </span>
      <ChevronRight className={`shrink-0 transition ${busy ? "translate-x-1" : ""} ${isGold ? "text-[#c99000]" : "text-[#5f4bd2]"}`} />
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="col-span-full grid min-h-[180px] place-items-center rounded-[20px] bg-white p-6 text-center mt-4 text-sm font-black text-[#8d89a6] shadow-sm ring-1 ring-[#e9e4fb]">
      {text}
    </div>
  );
}

function QrMock({ seed, small }: { seed: string; small?: boolean }) {
  const qr = useMemo(() => createQrMatrix(seed || "KONNECTLY"), [seed]);
  const quietZone = 4;
  const viewSize = qr.length + quietZone * 2;
  const darkPath = useMemo(() => {
    const parts: string[] = [];
    qr.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) parts.push(`M${x + quietZone} ${y + quietZone}h1v1h-1z`);
      });
    });
    return parts.join("");
  }, [qr]);

  return (
    <div className={`grid place-items-center rounded-[16px] bg-white ${small ? "h-20 w-20 p-1" : "h-44 w-44 p-2"} shadow-[inset_0_0_0_1px_rgba(41,36,68,0.08)]`}>
      <svg viewBox={`0 0 ${viewSize} ${viewSize}`} role="img" aria-label="Scannable QR code" className="h-full w-full" shapeRendering="crispEdges">
        <rect width={viewSize} height={viewSize} fill="#fff" />
        <path d={darkPath} fill="#111827" />
      </svg>
    </div>
  );
}

function createQrMatrix(value: string) {
  const version = 5;
  const size = 17 + version * 4;
  const dataCodewords = 108;
  const eccCodewords = 26;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(x: number, y: number, dark: boolean) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    reserved[y][x] = true;
  }

  drawFinderPattern(3, 3, setFunction);
  drawFinderPattern(size - 4, 3, setFunction);
  drawFinderPattern(3, size - 4, setFunction);
  drawAlignmentPattern(30, 30, setFunction);

  for (let i = 8; i < size - 8; i += 1) {
    setFunction(i, 6, i % 2 === 0);
    setFunction(6, i, i % 2 === 0);
  }
  setFunction(8, size - 8, true);
  reserveFormatModules(size, reserved);

  const data = encodeQrData(value, dataCodewords);
  const ecc = reedSolomonRemainder(data, reedSolomonDivisor(eccCodewords));
  drawCodewords([...data, ...ecc], modules, reserved);

  let bestMask = 0;
  let bestModules = modules;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = modules.map((row) => [...row]);
    applyQrMask(candidate, reserved, mask);
    drawFormatBits(candidate, size, mask);
    const penalty = qrPenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestModules = candidate;
    }
  }

  drawFormatBits(bestModules, size, bestMask);
  return bestModules;
}

function drawFinderPattern(centerX: number, centerY: number, setFunction: (x: number, y: number, dark: boolean) => void) {
  for (let y = -4; y <= 4; y += 1) {
    for (let x = -4; x <= 4; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setFunction(centerX + x, centerY + y, distance !== 2 && distance !== 4);
    }
  }
}

function drawAlignmentPattern(centerX: number, centerY: number, setFunction: (x: number, y: number, dark: boolean) => void) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      const distance = Math.max(Math.abs(x), Math.abs(y));
      setFunction(centerX + x, centerY + y, distance !== 1);
    }
  }
}

function reserveFormatModules(size: number, reserved: boolean[][]) {
  for (let i = 0; i <= 5; i += 1) {
    reserved[i][8] = true;
    reserved[8][i] = true;
  }
  reserved[7][8] = true;
  reserved[8][8] = true;
  reserved[8][7] = true;
  for (let i = 9; i < 15; i += 1) reserved[8][14 - i] = true;
  for (let i = 0; i < 8; i += 1) reserved[8][size - 1 - i] = true;
  for (let i = 8; i < 15; i += 1) reserved[size - 15 + i][8] = true;
}

function encodeQrData(value: string, dataCodewords: number) {
  const bytes = Array.from(new TextEncoder().encode(value)).slice(0, dataCodewords - 3);
  const bits: number[] = [];
  appendQrBits(bits, 0x4, 4);
  appendQrBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendQrBits(bits, byte, 8));

  const capacity = dataCodewords * 8;
  appendQrBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(Number.parseInt(bits.slice(i, i + 8).join(""), 2));
  }
  for (let pad = 0; data.length < dataCodewords; pad += 1) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
  }
  return data;
}

function appendQrBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function drawCodewords(codewords: number[], modules: boolean[][], reserved: boolean[][]) {
  const size = modules.length;
  const bits = codewords.flatMap((codeword) => Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1));
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let row = 0; row < size; row += 1) {
      const y = upward ? size - 1 - row : row;
      for (let col = 0; col < 2; col += 1) {
        const x = right - col;
        if (!reserved[y][x]) {
          modules[y][x] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
          bitIndex += 1;
        }
      }
    }
    upward = !upward;
  }
}

function applyQrMask(modules: boolean[][], reserved: boolean[][], mask: number) {
  modules.forEach((row, y) => {
    row.forEach((_, x) => {
      if (!reserved[y][x] && qrMask(mask, x, y)) modules[y][x] = !modules[y][x];
    });
  });
}

function qrMask(mask: number, x: number, y: number) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function drawFormatBits(modules: boolean[][], size: number, mask: number) {
  const bits = getQrFormatBits(mask);
  const bit = (index: number) => ((bits >>> index) & 1) !== 0;
  for (let i = 0; i <= 5; i += 1) modules[i][8] = bit(i);
  modules[7][8] = bit(6);
  modules[8][8] = bit(7);
  modules[8][7] = bit(8);
  for (let i = 9; i < 15; i += 1) modules[8][14 - i] = bit(i);
  for (let i = 0; i < 8; i += 1) modules[8][size - 1 - i] = bit(i);
  for (let i = 8; i < 15; i += 1) modules[size - 15 + i][8] = bit(i);
  modules[size - 8][8] = true;
}

function getQrFormatBits(mask: number) {
  const errorCorrectionLevelLow = 1;
  const data = (errorCorrectionLevelLow << 3) | mask;
  let bits = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if (((bits >>> i) & 1) !== 0) bits ^= 0x537 << (i - 10);
  }
  return (((data << 10) | bits) ^ 0x5412) & 0x7fff;
}

function reedSolomonDivisor(degree: number) {
  const result = Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]) {
  const result = Array(divisor.length).fill(0);
  data.forEach((byte) => {
    const factor = byte ^ (result.shift() ?? 0);
    result.push(0);
    divisor.forEach((coefficient, index) => {
      result[index] ^= gfMultiply(coefficient, factor);
    });
  });
  return result;
}

const GF_EXP = (() => {
  const result = Array(255).fill(0);
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    result[i] = value;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  return result;
})();

const GF_LOG = (() => {
  const result = Array(256).fill(0);
  GF_EXP.forEach((value, index) => {
    result[value] = index;
  });
  return result;
})();

function gfMultiply(x: number, y: number) {
  return x === 0 || y === 0 ? 0 : GF_EXP[(GF_LOG[x] + GF_LOG[y]) % 255];
}

function qrPenalty(modules: boolean[][]) {
  const size = modules.length;
  let penalty = 0;
  for (let y = 0; y < size; y += 1) penalty += qrRunPenalty(modules[y]);
  for (let x = 0; x < size; x += 1) penalty += qrRunPenalty(modules.map((row) => row[x]));
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y][x];
      if (modules[y][x + 1] === color && modules[y + 1][x] === color && modules[y + 1][x + 1] === color) penalty += 3;
    }
  }
  const dark = modules.flat().filter(Boolean).length;
  penalty += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  return penalty;
}

function qrRunPenalty(line: boolean[]) {
  let penalty = 0;
  let runColor = line[0];
  let runLength = 1;
  for (let i = 1; i <= line.length; i += 1) {
    if (line[i] === runColor) {
      runLength += 1;
    } else {
      if (runLength >= 5) penalty += runLength - 2;
      runColor = line[i];
      runLength = 1;
    }
  }
  return penalty;
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

function readCachedAppData() {
  try {
    if (typeof window === "undefined") return null;
    const value = window.sessionStorage.getItem(APP_DATA_CACHE_KEY);
    if (!value) return null;
    return JSON.parse(value) as AppData;
  } catch {
    return null;
  }
}

function cacheAppData(data: AppData) {
  try {
    window.sessionStorage.setItem(APP_DATA_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable in private mode; fresh network data still works.
  }
}

function clearCachedAppData() {
  try {
    window.sessionStorage.removeItem(APP_DATA_CACHE_KEY);
  } catch {
    // Ignore storage failures during auth redirects.
  }
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

function formatPointHistoryDate(value: string) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function isActiveRewardVoucher(entry: AppRewardHistory) {
  if (entry.status !== "issued") return false;
  if (!entry.voucherCode) return false;
  if (!entry.expiresAt) return true;
  const expiresAt = new Date(entry.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return true;
  return expiresAt.getTime() >= Date.now();
}

function rewardEntryToVoucher(entry: AppRewardHistory): Voucher {
  return {
    brandName: entry.brandName,
    coupon: entry.voucherCode,
    qrCode: entry.qrCode,
    expiresAt: entry.expiresAt,
  };
}

function formatVoucherValidity(entry: AppRewardHistory) {
  if (!entry.expiresAt) return "Show this QR at the partner counter";
  const expiresAt = new Date(entry.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return "Show this QR at the partner counter";
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000));
  return `Valid until ${formatPointHistoryDate(entry.expiresAt)}${daysLeft ? ` - ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}`;
}

function formatSignedPoints(points: number) {
  return `${points >= 0 ? "+" : ""}${points} pts`;
}

function pointHistoryTitle(entry: AppPointHistory) {
  if (entry.source === "event_payment") return "Activity booking reward";
  if (entry.source === "event_attendance") return "Attendance reward";
  if (entry.source === "voucher_redemption") return "Reward redeemed";
  if (entry.source === "successful_referral") return "Referral reward";
  if (entry.source === "referral_welcome_bonus") return "Welcome bonus";
  if (entry.points > 0) return "Points added";
  if (entry.points < 0) return "Points used";
  return "Points update";
}

function pointHistoryDetail(entry: AppPointHistory) {
  if (entry.description) return entry.description;
  if (entry.refType === "event") return "Activity points";
  if (entry.refType === "redemption") return "Reward points";
  if (entry.refType === "referral") return "Referral points";
  return entry.points >= 0 ? "Added to your balance" : "Deducted from your balance";
}

function toDateInputValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function getAgeFromDob(value: string) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) age -= 1;
  return Math.max(0, age);
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function dateYearsAgo(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function getKidEventEligibility(kid: AppKid, event: AppEvent) {
  if (kid.status !== "approved") return { eligible: false, reason: "Verification Pending" };
  if (event.minAge && kid.age < event.minAge) return { eligible: false, reason: `Min age ${event.minAge}` };
  if (event.maxAge && kid.age > event.maxAge) return { eligible: false, reason: `Max age ${event.maxAge}` };
  return { eligible: true, reason: "" };
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function getPreferredNav(data: AppData): NavLabel {
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  if (isNavLabel(requestedTab)) return requestedTab;
  return data.kids.length === 0 ? "Account" : "Home";
}

function isNavLabel(value: string | null): value is NavLabel {
  return value === "Home" || value === "Activities" || value === "Updates" || value === "Account";
}

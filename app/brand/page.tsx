"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BatteryFull,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronDown,
  Gift,
  Handshake,
  Home,
  KeyRound,
  LogOut,
  QrCode,
  TrendingUp,
  Upload,
  User,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type Tab = "Dashboard" | "Scan QR" | "Opportunities" | "Upgrade" | "Profile";
type AuthView = "login" | "otp" | "register";

type BrandLoginStartResponse = {
  message?: string;
  authenticated?: boolean;
  requiresOtp?: boolean;
  requestId?: string;
  expiresAt?: number;
  brandUserId?: number;
  brandId?: number;
  maskedMobile?: string;
};

type BrandData = {
  brand: {
    id: number;
    name: string;
    email: string;
    mobile: string;
    referralCode: string;
    tier: string;
    description: string;
    note: string;
    createdAt: string;
  };
  metrics: {
    vouchersRedeemed: number;
    revenue: number;
    newCustomers: number;
  };
  redemptions: Array<{
    id: number;
    member: string;
    brand: string;
    points: number;
    coupon: string;
    qrCode: string;
    expiresAt: string;
    redeemedAt: string;
    createdAt: string;
    status: string;
  }>;
  updates: Array<{
    id: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    target: string;
    type: "hero" | "notification";
  }>;
};

const BUSINESS_TYPES = ["Cafe / Food", "Kids Activity", "Retail", "Learning Center", "Health / Wellness", "Other"];

export default function BrandPanel() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");
  const [authView, setAuthView] = useState<AuthView>("login");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [requestId, setRequestId] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [brandUserId, setBrandUserId] = useState(0);
  const [brandId, setBrandId] = useState(0);
  const [maskedMobile, setMaskedMobile] = useState("");
  const [phone, setPhone] = useState("");
  const [registerDetails, setRegisterDetails] = useState({
    businessName: "",
    businessType: "",
    ownerName: "",
    mobile: "",
    area: "",
    referralCode: "",
  });
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(formatCurrentTime());
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/brand-login/status", { cache: "no-store" });
        if (!active) return;
        setIsAuthed(response.ok);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    let active = true;

    async function loadBrandData() {
      try {
        const response = await fetch("/api/brand/data", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as BrandData;
        if (active) setBrandData(data);
      } catch {
        if (active) setBrandData(null);
      }
    }

    loadBrandData();

    return () => {
      active = false;
    };
  }, [isAuthed]);

  useEffect(() => {
    function updateTime() {
      setCurrentTime(formatCurrentTime());
    }

    updateTime();
    const timer = window.setInterval(updateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function refreshBrandData() {
    const response = await fetch("/api/brand/data", { cache: "no-store" });
    if (!response.ok) return;
    setBrandData((await response.json()) as BrandData);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/brand-login/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await response.json()) as BrandLoginStartResponse;

      if (!response.ok) throw new Error(data.message ?? "Unable to send OTP.");
      if (data.authenticated && !data.requiresOtp) {
        setIsAuthed(true);
        return;
      }
      if (!data.requestId || !data.expiresAt || !data.brandUserId || !data.brandId) {
        throw new Error(data.message ?? "Unable to send OTP.");
      }

      setAuthMode("login");
      setRequestId(data.requestId);
      setExpiresAt(data.expiresAt);
      setBrandUserId(data.brandUserId);
      setBrandId(data.brandId);
      setMaskedMobile(data.maskedMobile ?? maskPhone(phone));
      setAuthView("otp");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to send OTP.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function registerBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/brand-register/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerDetails),
      });
      const data = (await response.json()) as BrandLoginStartResponse;

      if (!response.ok || !data.requestId || !data.expiresAt) {
        throw new Error(data.message ?? "Unable to send OTP.");
      }

      setAuthMode("register");
      setRequestId(data.requestId);
      setExpiresAt(data.expiresAt);
      setMaskedMobile(data.maskedMobile ?? maskPhone(registerDetails.mobile));
      setAuthView("otp");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to register business.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function verifyBrandOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const otp = String(form.get("otp") || "").replace(/\D/g, "");
    const endpoint = authMode === "register" ? "/api/auth/brand-register/verify" : "/api/auth/brand-login/verify";
    const payload =
      authMode === "register"
        ? { requestId, code: otp, registration: registerDetails }
        : { requestId, code: otp, brandUserId, brandId };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string; authenticated?: boolean };

      if (!response.ok || !data.authenticated) {
        throw new Error(data.message ?? "Unable to verify OTP.");
      }

      setIsAuthed(true);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to verify OTP.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#3d32a8,#7b6fd8_62%,#d8a819)] px-5">
        <p className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#5b4ec8] shadow">Checking brand session...</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <AuthShell
        error={error}
        expiresAt={expiresAt}
        loading={loading}
        maskedMobile={maskedMobile}
        phone={phone}
        registerDetails={registerDetails}
        view={authView}
        onBack={() => {
          setAuthView(authMode === "register" ? "register" : "login");
          setError("");
        }}
        onLoginSubmit={login}
        onOtpSubmit={verifyBrandOtp}
        onPhoneChange={(value) => setPhone(value.replace(/\D/g, "").slice(-10))}
        onRegisterChange={(key, value) => {
          setRegisterDetails((current) => ({
            ...current,
            [key]: key === "mobile" ? value.replace(/\D/g, "").slice(-10) : key === "referralCode" ? value.toUpperCase() : value,
          }));
        }}
        onRegisterSubmit={registerBusiness}
        onShowLogin={() => {
          setAuthMode("login");
          setAuthView("login");
          setError("");
        }}
        onShowRegister={() => {
          setAuthMode("register");
          setAuthView("register");
          setError("");
        }}
      />
    );
  }

  const brand = brandData?.brand;

  return (
    <main className="h-dvh overflow-hidden bg-[linear-gradient(120deg,#3f2ca3_0%,#6d5fde_55%,#d6a20f_100%)] md:grid md:place-items-center">
      <section className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#f7f5ff] text-[#171330] shadow-2xl md:rounded-[46px] md:border md:border-white/30">
        <BrandHeader brand={brand} currentTime={currentTime} activeTab={activeTab} />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeTab === "Dashboard" && <Dashboard data={brandData} setActiveTab={setActiveTab} />}
          {activeTab === "Scan QR" && <ScanQr data={brandData} onVerified={refreshBrandData} />}
          {activeTab === "Opportunities" && <Opportunities data={brandData} />}
          {activeTab === "Upgrade" && <Upgrade data={brandData} />}
          {activeTab === "Profile" && <Profile data={brandData} setIsAuthed={setIsAuthed} setActiveTab={setActiveTab} />}
        </div>

        <a
          href="https://wa.me/919810889180"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-[92px] right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_14px_34px_rgba(37,211,102,0.45)] ring-4 ring-white/80 transition hover:scale-105"
          aria-label="Open WhatsApp support"
        >
         <svg width="35" height="35" viewBox="0 0 1024 1024" fill="none"><rect width="1024" height="1024" rx="265"></rect><path d="M522 141C320.419 141 157 304.419 157 506C157 572.322 174.689 634.507 205.606 688.101L157 871L346.617 826.173C398.664 854.744 458.429 871 522 871C723.581 871 887 707.581 887 506C887 304.419 723.581 141 522 141ZM522 805.624C460.998 805.624 404.254 787.388 356.919 756.079L244.891 784.61L276.314 677.536C242.322 628.944 222.376 569.801 222.376 506C222.376 340.52 356.52 206.376 522 206.376C687.48 206.376 821.624 340.52 821.624 506C821.624 671.48 687.48 805.624 522 805.624Z" fill="white"></path><path d="M607.527 554.187L695.836 595.825C699.892 597.737 702.488 601.847 702.123 606.315C701.163 617.934 696.506 641.226 675.626 662.099C616.692 721.033 510.876 654.36 506.577 651.778C480.554 637.799 455.815 619.09 432.374 595.642C408.933 572.201 390.217 547.462 376.238 521.439C373.656 517.14 306.983 411.317 365.917 352.39C386.796 331.51 410.082 326.853 421.701 325.893C426.169 325.528 430.279 328.124 432.192 332.18L473.829 420.489C475.802 424.667 474.937 429.635 471.666 432.899L440.627 463.938C433.915 470.65 431.942 481.1 436.565 489.393C447.887 509.705 463.115 529.259 480.764 547.252C498.757 564.894 518.318 580.129 538.623 591.451C546.917 596.075 557.366 594.108 564.078 587.389L595.117 556.35C598.381 553.086 603.35 552.221 607.527 554.187Z" fill="white"></path></svg>
        </a>

        <BrandBottomNav activeTab={activeTab} onSelect={setActiveTab} />
      </section>
    </main>
  );
}

function BrandHeader({ brand, currentTime, activeTab }: { brand: BrandData["brand"] | undefined; currentTime: string; activeTab: Tab }) {
  if (activeTab !== "Dashboard") {
    return (
      <header className="relative shrink-0 overflow-hidden bg-[#4d39b6] px-4 pb-5 pt-2.5 text-white">
        <div className="absolute -right-12 top-5 h-36 w-36 rounded-full bg-white/14" />
        <StatusBar currentTime={currentTime} />
        <div className="relative mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-white/60">Konnectly Business</p>
            <h1 className="mt-1 text-xl font-black leading-tight">{activeTab}</h1>
          </div>
          <BrandLogo compact />
        </div>
      </header>
    );
  }

  return (
    <header className="relative shrink-0 overflow-hidden bg-[#4d39b6] px-4 pb-7 pt-2.5 text-white">
      <div className="absolute -right-12 top-8 h-44 w-44 rounded-full bg-white/14" />
      <StatusBar currentTime={currentTime} />
      <div className="relative mt-4 flex items-center justify-between gap-3">
        <BrandLogo compact />
        <button className="grid h-12 w-12 place-items-center rounded-full bg-white/14 text-[#f6c400]" type="button" aria-label="Notifications">
          <Bell size={23} fill="currentColor" />
        </button>
      </div>
      <div className="relative mt-6 flex items-center gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-[3px] border-[#ffe05a] bg-[#f6c400] text-2xl font-black text-[#2a2252]">
          {brand?.name?.charAt(0).toUpperCase() || "B"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-white/55">Welcome back, Partner</p>
          <h1 className="truncate text-[22px] font-black leading-tight">{brand?.name || "Your Business"}</h1>
          {brand?.mobile && <p className="mt-1 text-[11px] font-black text-[#f6c400]">+91 {brand.mobile}</p>}
        </div>
      </div>
    </header>
  );
}

function StatusBar({ currentTime }: { currentTime: string }) {
  return (
    <div className="relative flex h-7 items-center justify-between text-[13px] font-black text-white">
      <span>{currentTime}</span>
      <span className="flex items-center gap-1.5">
        <Wifi size={15} fill="currentColor" />
        <BatteryFull size={16} />
      </span>
    </div>
  );
}

function BrandBottomNav({ activeTab, onSelect }: { activeTab: Tab; onSelect: (tab: Tab) => void }) {
  const items: Array<{ label: Tab; icon: ReactNode; center?: boolean }> = [
    { label: "Dashboard", icon: <Home size={22} /> },
    { label: "Opportunities", icon: <Handshake size={22} /> },
    { label: "Scan QR", icon: <Camera size={30} />, center: true },
    { label: "Upgrade", icon: <Upload size={22} /> },
    { label: "Profile", icon: <User size={22} /> },
  ];

  return (
    <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-[#ebe7f7] bg-white/95 px-3 pb-3 pt-2 shadow-[0_-12px_36px_rgba(42,36,72,0.12)] backdrop-blur">
      <div className="grid grid-cols-5 items-end">
        {items.map((item) => {
          const active = activeTab === item.label;
          return (
            <button key={item.label} onClick={() => onSelect(item.label)} className={`relative grid justify-items-center gap-1 font-black ${item.center ? "-mt-10" : ""}`} type="button">
              <span
                className={
                  item.center
                    ? `grid h-[62px] w-[62px] place-items-center rounded-full border-[5px] border-white text-white shadow-[0_16px_34px_rgba(91,78,200,0.35)] ${active ? "bg-[#5b4ec8]" : "bg-[#6655cf]"}`
                    : `grid h-9 w-9 place-items-center rounded-full ${active ? "text-[#5b4ec8]" : "text-[#b9b5c8]"}`
                }
              >
                {item.icon}
              </span>
              <span className={`max-w-[74px] truncate text-[11px] ${active ? "text-[#5b4ec8]" : "text-[#c7c3cf]"}`}>{item.label}</span>
              {active && !item.center && <span className="h-1.5 w-1.5 rounded-full bg-[#f6c400]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AuthShell({
  error,
  expiresAt,
  loading,
  maskedMobile,
  phone,
  registerDetails,
  view,
  onBack,
  onLoginSubmit,
  onOtpSubmit,
  onPhoneChange,
  onRegisterChange,
  onRegisterSubmit,
  onShowLogin,
  onShowRegister,
}: {
  error: string;
  expiresAt: number;
  loading: boolean;
  maskedMobile: string;
  phone: string;
  registerDetails: { businessName: string; businessType: string; ownerName: string; mobile: string; area: string; referralCode: string };
  view: AuthView;
  onBack: () => void;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOtpSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPhoneChange: (value: string) => void;
  onRegisterChange: (key: keyof typeof registerDetails, value: string) => void;
  onRegisterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onShowLogin: () => void;
  onShowRegister: () => void;
}) {
  const [now, setNow] = useState(0);
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const resendSeconds = Math.max(0, Math.min(30, secondsLeft));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[linear-gradient(120deg,#4639ad_0%,#7466da_62%,#d1a217_100%)] px-0 text-[#14112f] sm:px-5">
      <section className="relative flex h-auto w-full max-w-[430px] flex-col overflow-hidden bg-[#4434ad] shadow-2xl sm:rounded-[34px]">
        <div className="flex h-8 shrink-0 items-center justify-between bg-[#3c2fa0] px-5 text-xs font-black text-white">
          <span>{formatCurrentTime()}</span>
          <span>WiFi</span>
        </div>
        <div className="relative shrink-0 overflow-hidden bg-[#4e40b8] px-5 pb-5 pt-5 text-center text-white">
          <div className="absolute -right-20 -top-9 h-40 w-40 rounded-full bg-white/12" />
          <div className="absolute -left-16 bottom-0 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative mx-auto w-fit">
            <BrandLogo />
          </div>
          {view !== "login" && (
            <div className="relative mt-4 inline-flex rounded-full bg-[#f4bf00] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#14112f]">
              {view === "otp" ? "Partner Portal" : "Register Business"}
            </div>
          )}
          {view === "otp" && <h1 className="relative mx-auto mt-2 max-w-[300px] text-xl font-black leading-tight">Grow Locally,<br />Grow with Konnectly!</h1>}
        </div>

        <div className={`shrink-0 rounded-t-[28px] bg-white px-5 ${view === "register" ? "pb-2 pt-4" : view === "otp" ? "pb-4 pt-4" : "py-5"} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
          {view === "login" && (
            <form onSubmit={onLoginSubmit}>
              <AuthPill icon={<KeyRound size={15} />} label="Business Login" />
              <PhoneInput label="Registered Mobile Number" value={phone} onChange={onPhoneChange} />
              <p className="mt-3 text-xs font-bold leading-5 text-[#9290aa]">You&apos;ll receive a 6-digit OTP on WhatsApp to verify your business account.</p>
              <PrimaryButton className="mt-5" disabled={loading || phone.length !== 10}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </PrimaryButton>
              <Divider />
              <button type="submit" disabled={loading || phone.length !== 10} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25d366] text-sm font-black text-white shadow-xl shadow-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-55">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg> Continue with WhatsApp
              </button>
              <button type="button" className="mt-3 w-full text-xs font-black text-[#5b4ec8]">
                Key Referred by someone? Enter their Konnect Kode
              </button>
              <p className="mt-4 text-center text-xs font-bold text-[#9290aa]">
                New partner? <button type="button" onClick={onShowRegister} className="font-black text-[#5b4ec8]">Register your business</button>
              </p>
            </form>
          )}

          {view === "otp" && (
            <form onSubmit={onOtpSubmit}>
              <button type="button" onClick={onBack} className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-[#f2efff] text-[#5b4ec8]" aria-label="Back">
                <ArrowLeft size={19} />
              </button>
              <AuthPill icon={<Check size={15} />} label="Enter OTP" />
              <p className="mt-2 text-sm font-bold text-[#9290aa]">
                Sent to <span className="font-black text-[#14112f]">{maskedMobile || "your mobile"}</span> via WhatsApp
              </p>
              <input
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                name="otp"
                pattern="\d{6}"
                placeholder="000000"
                type="text"
                className="mt-4 h-12 w-full rounded-[16px] border-2 border-[#6655cf] bg-[#f7f6ff] px-5 text-center text-xl font-black tracking-[0.26em] outline-none"
              />
              <PrimaryButton className="mt-4" disabled={loading || secondsLeft <= 0}>
                {loading ? "Verifying..." : "Verify & Enter /"}
              </PrimaryButton>
              <p className="mt-3 text-center text-xs font-bold text-[#9290aa]">
                Didn&apos;t receive? <span className="font-black text-[#5b4ec8]">Resend in {resendSeconds}s</span>
              </p>
            </form>
          )}

          {view === "register" && (
            <form onSubmit={onRegisterSubmit}>
              <AuthPill icon={<BriefcaseBusiness size={15} />} label="Register Business" />
              <TextInput label="Business Name" value={registerDetails.businessName} onChange={(value) => onRegisterChange("businessName", value)} placeholder="e.g. Sharma Sweet House" />
              <SelectInput label="Business Type" value={registerDetails.businessType} onChange={(value) => onRegisterChange("businessType", value)} />
              <TextInput label="Owner Name" value={registerDetails.ownerName} onChange={(value) => onRegisterChange("ownerName", value)} placeholder="Full name" />
              <PhoneInput label="Mobile Number" value={registerDetails.mobile} onChange={(value) => onRegisterChange("mobile", value)} />
              <TextInput label="Area / Locality" value={registerDetails.area} onChange={(value) => onRegisterChange("area", value)} placeholder="e.g. Ashok Vihar, Delhi" />
            
              <PrimaryButton className="mt-4" disabled={loading || !canSubmitRegister(registerDetails)}>
                {loading ? "Sending OTP..." : "Submit & Get OTP"}
              </PrimaryButton>
              <p className="mt-2  py-2 text-center text-xs font-bold text-[#9290aa]">
                Already registered? <button type="button" onClick={onShowLogin} className="font-black text-[#5b4ec8]">Login</button>
              </p>
            </form>
          )}

          {error && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-600">{error}</p>}
        </div>
      </section>
    </main>
  );
}

function Dashboard({ data, setActiveTab }: { data: BrandData | null; setActiveTab: (tab: Tab) => void }) {
  const metrics = data?.metrics;
  const recent = data?.redemptions ?? [];
  const issuedCount = recent.filter((item) => item.status === "issued").length;
  const updates = data?.updates ?? [];
  const [updateIndex, setUpdateIndex] = useState(0);
  const activeUpdate = updates[updateIndex % Math.max(1, updates.length)] ?? {
    id: "fallback",
    title: "Konnectly Partner Updates",
    subtitle: `${data?.brand.name || "Your brand"} spotlight slots and campaigns will appear here.`,
    ctaLabel: "View Opportunities",
    target: "opportunities",
    type: "hero" as const,
  };

  useEffect(() => {
    if (updates.length <= 1) return;
    const timer = window.setInterval(() => setUpdateIndex((current) => (current + 1) % updates.length), 4500);
    return () => window.clearInterval(timer);
  }, [updates.length]);

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-3 text-[15px] font-black">Konnectly Updates</h2>
        <div className="relative overflow-hidden rounded-[22px] bg-[#5b4ec8] p-5 text-white shadow-sm">
          <div className="absolute -right-8 top-0 h-32 w-32 rounded-full bg-white/16" />
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6c400]">{activeUpdate.type === "hero" ? "Spotlight" : "Update"}</p>
          <h3 className="relative mt-5 text-xl font-black">{activeUpdate.title}</h3>
          <p className="relative mt-2 text-sm font-black text-white/70">{activeUpdate.subtitle}</p>
          <button onClick={() => setActiveTab(activeUpdate.target === "upgrade" ? "Upgrade" : "Opportunities")} className="relative mt-5 rounded-full bg-[#f6c400] px-5 py-3 text-xs font-black text-[#1c1740]" type="button">
            {activeUpdate.ctaLabel || "View"}
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {(updates.length ? updates : [activeUpdate]).slice(0, 5).map((item, index) => (
            <button
              key={item.id ?? index}
              onClick={() => setUpdateIndex(index)}
              className={`${index === updateIndex ? "h-2 w-7 bg-[#5b4ec8]" : "h-2 w-2 bg-zinc-300"} rounded-full transition`}
              type="button"
              aria-label={`Show update ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black">Partnership Status</h2>
          <button onClick={() => setActiveTab("Upgrade")} className="text-xs font-black text-[#5b4ec8]" type="button">Upgrade</button>
        </div>
        <Card className="overflow-hidden bg-[#5b4ec8] text-white">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-[18px] bg-white/20 text-sm font-black">Silver</div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-black">{data?.brand.tier || "Silver Partner"}</h3>
              <p className="mt-1 text-xs font-bold text-white/70">{issuedCount} active vouchers waiting for scan</p>
            </div>
            <button onClick={() => setActiveTab("Scan QR")} className="grid h-12 w-12 place-items-center rounded-full bg-[#f6c400] text-[#1c1740]" type="button" aria-label="Scan voucher">
              <QrCode size={24} />
            </button>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-black">This Month&apos;s Performance</h2>
        <div className="grid grid-cols-3 gap-3">
          <Metric value={String(metrics?.vouchersRedeemed ?? 0)} label="Vouchers Redeemed" />
          <Metric value={`Rs ${metrics?.revenue ?? 0}`} label="Revenue Generated" tone="text-amber-600" />
          <Metric value={String(metrics?.newCustomers ?? 0)} label="New Customers" tone="text-emerald-600" />
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-base font-black">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <ActionCard icon={<QrCode />} title="Scan & Approve Voucher" body="Redeem a member's Konnect Points" onClick={() => setActiveTab("Scan QR")} />
          <ActionCard icon={<Handshake />} title="Partnership Opportunities" body="Events, sponsorships and more" onClick={() => setActiveTab("Opportunities")} />
          <ActionCard icon={<Upload />} title="Upgrade Tier" body="Unlock Gold or Platinum perks" onClick={() => setActiveTab("Upgrade")} />
          <ActionCard icon={<Gift />} title="Refer a Business" body="Earn rewards for every referral" onClick={() => setActiveTab("Profile")} />
        </div>
      </section>

      <Card className="bg-white">
        <h3 className="font-black">Recent Redemptions</h3>
        <div className="mt-4 grid gap-3">
          {recent.slice(0, 4).map((item) => <RedemptionRow key={item.id} item={item} />)}
          {recent.length === 0 && <p className="text-sm font-bold text-zinc-500">No redemptions yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function ScanQr({ data, onVerified }: { data: BrandData | null; onVerified: () => Promise<void> }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const busyRef = useRef(false);
  const lastScanRef = useRef("");
  const [manualCode, setManualCode] = useState("");
  const [scannerOn, setScannerOn] = useState(false);
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState<BrandData["redemptions"][number] | null>(null);
  const [busy, setBusy] = useState(false);
  const activeIssued = data?.redemptions.filter((item) => item.status === "issued") ?? [];

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!scannerOn) return;
    let cancelled = false;
    lastScanRef.current = "";

    async function startScanner() {
      try {
        if (!videoRef.current) return;
        const { default: QrScanner } = await import("qr-scanner");
        (QrScanner as unknown as { WORKER_PATH?: string }).WORKER_PATH = "/qr-scanner-worker.min.js";
        if (cancelled || !videoRef.current) return;

        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          setStatus("Camera available nahi hai. Voucher code manually enter kar dijiye.");
          setScannerOn(false);
          return;
        }

        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            const code = normalizeVoucherCode(typeof result === "string" ? result : result.data);
            if (!code || busyRef.current || lastScanRef.current === code) return;
            lastScanRef.current = code;
            void verifyCode(code);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: "environment",
            returnDetailedScanResult: true,
          },
        );

        qrScannerRef.current = scanner;
        await scanner.start();
        setStatus("Camera ready. Please place the voucher QR inside the frame.");
      } catch {
        setStatus("Camera permission nahi mili. Voucher code manually enter kar sakte hain.");
        setScannerOn(false);
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      qrScannerRef.current?.stop();
      qrScannerRef.current?.destroy();
      qrScannerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  // Scanner loop intentionally calls the latest verifier only after QR detection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOn]);

  async function verifyCode(rawCode = manualCode) {
    const code = normalizeVoucherCode(rawCode);
    if (!code || busy) return;
    setBusy(true);
    setStatus("");
    setVerified(null);

    try {
      const response = await fetch("/api/brand/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json()) as { message?: string; redemption?: BrandData["redemptions"][number] };
      if (!response.ok || !result.redemption) throw new Error(result.message || "Unable to verify voucher.");
      setVerified(result.redemption);
      setManualCode("");
      setStatus(result.message || "Voucher approved.");
      setScannerOn(false);
      await onVerified();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to verify voucher.");
    } finally {
      setBusy(false);
    }
  }

  async function scanQrImage(file: File | undefined) {
    if (!file || busy) return;
    setStatus("QR image scan kar rahe hain...");
    setVerified(null);

    try {
      const { default: QrScanner } = await import("qr-scanner");
      (QrScanner as unknown as { WORKER_PATH?: string }).WORKER_PATH = "/qr-scanner-worker.min.js";
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const code = normalizeVoucherCode(typeof result === "string" ? result : result.data);
      if (!code) throw new Error("Is image me voucher QR read nahi ho paaya.");
      await verifyCode(code);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "QR image read nahi ho paaya. Code manually enter kijiye.");
    }
  }

  return (
    <div className="space-y-5">
      <Title title="Scan & Approve" subtitle={`${activeIssued.length} active vouchers available`} />
      <Card className="overflow-hidden bg-[#171330] p-0 text-white">
        <div className="relative rounded-2xl aspect-[4/5] bg-[#2a2252]">
          {scannerOn ? (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <button onClick={() => setScannerOn(false)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur" type="button" aria-label="Close scanner">
                <X size={20} />
              </button>
            </>
          ) : (
            <button onClick={() => setScannerOn(true)} className="grid h-full w-full place-items-center text-center" type="button">
              <span className="grid justify-items-center">
                <span className="grid h-24 w-24 place-items-center rounded-full bg-white/12 text-[#f6c400] ring-1 ring-white/20">
                  <Camera size={44} />
                </span>
                <span className="mt-5 text-xl font-black">Open Camera</span>
                <span className="mt-2 max-w-[240px] text-sm font-bold text-white/60">Scan parent app voucher QR to approve instantly.</span>
              </span>
            </button>
          )}
          {scannerOn && <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-[28px] border-4 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />}
        </div>
      </Card>

      <Card className="bg-white">
        <h3 className="font-black">QR not working? Enter manually</h3>
        <div className="mt-4 grid gap-2">
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#bdb2f4] bg-[#f7f6ff] px-4 text-sm font-black text-[#5b4ec8]">
            <Upload size={18} />
            Upload QR Photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void scanQrImage(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <input value={manualCode} onChange={(event) => setManualCode(event.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-xl border-2 border-[#e3e0f4] bg-[#f7f6ff] px-4 py-3 text-sm font-black uppercase outline-none focus:border-[#6655cf]" placeholder="KON-XXX-XXXX" />
          <button onClick={() => verifyCode()} disabled={busy || !manualCode.trim()} className="rounded-xl bg-[#6655cf] px-5 text-sm font-black text-white disabled:opacity-50" type="button">
            {busy ? "..." : "Verify"}
          </button>
        </div>
        {status && <p className="mt-4 rounded-2xl bg-[#f2efff] px-4 py-3 text-sm font-black text-[#5b4ec8]">{status}</p>}
        {verified && <RedemptionRow item={verified} />}
      </Card>

      <Card className="bg-white">
        <h3 className="font-black">Pending Vouchers</h3>
        <div className="mt-4 grid gap-3">
          {activeIssued.slice(0, 5).map((item) => (
            <div key={item.id} className="grid gap-2 rounded-[18px] border border-[#ebe7f7] bg-[#fbfaff] p-2">
              <RedemptionRow item={item} />
              <button onClick={() => verifyCode(item.qrCode || item.coupon)} disabled={busy} className="h-10 rounded-full bg-[#25d366] px-4 text-xs font-black text-white disabled:opacity-50" type="button">
                Approve This Voucher
              </button>
            </div>
          ))}
          {activeIssued.length === 0 && <p className="text-sm font-bold text-zinc-500">No issued vouchers waiting right now.</p>}
        </div>
      </Card>
    </div>
  );
}

function normalizeVoucherCode(value: string) {
  const cleanValue = value.trim().toUpperCase();
  const match = cleanValue.match(/(?:QR-)?KON-[A-Z0-9]+-[A-Z0-9-]+/);
  return (match?.[0] || cleanValue).replace(/^QR-/i, "");
}

function Opportunities({ data }: { data: BrandData | null }) {
  return (
    <div className="space-y-5">
      <Title title="Opportunities" subtitle="Events, sponsorships and partnership" />
      <Card className="bg-[#6655cf] text-white">
        <h3 className="text-2xl font-black">Grow Locally with Konnectly</h3>
        <p className="mt-3 text-sm leading-6 text-white/80">{data?.brand.name || "Your brand"} can reach neighbourhood families through co-hosted events, in-app spotlights and WhatsApp campaigns.</p>
      </Card>
      <div className="grid gap-3">
        <ActionCard icon={<Handshake />} title="Event Sponsorship" body="Sponsor an upcoming event with full visibility" />
        <ActionCard icon={<TrendingUp />} title="In-App Spotlight" body="Featured placement in the parent app" />
        <ActionCard icon={<Bell />} title="WhatsApp Campaign" body="Co-branded outreach to all members" />
      </div>
    </div>
  );
}

function Upgrade({ data }: { data: BrandData | null }) {
  const brand = data?.brand;
  const profile = parseBrandProfile(brand);
  const [upgradeTier, setUpgradeTier] = useState<"Gold" | "Platinum" | null>(null);
  const [upgradeSubmitted, setUpgradeSubmitted] = useState(false);

  return (
    <div className="space-y-4">
      
      <div className="rounded-[20px] bg-[#eee7ff] px-4 py-3 text-xs font-black leading-5 text-[#5b4ec8]">
        You&apos;re currently on <span className="text-[#4638b8]">Silver Tier</span>. Upgrade to unlock in-app spotlights, event co-hosting and more revenue opportunities.
      </div>
      <Tier
        current
        tone="silver"
        title="Silver Partner"
        subtitle="Entry level - Revenue share active"
        items={["Increased footfall & new client acquisition", "Coupon redemption at your outlet", "Shared revenue model (you pay only on real sales)", "Basic monthly performance report", "Contest & challenge sponsorship eligibility"]}
        locked={["In-app brand spotlight (Gold+)", "Co-hosted events (Gold+)", "WhatsApp outreach campaigns (Gold+)", "Patron / CSR visibility (Platinum)"]}
      />
      <Tier
        tone="gold"
        title="Gold Partner"
        subtitle="Most popular - High visibility"
        cta="Upgrade to Gold"
        onCta={() => {
          setUpgradeTier("Gold");
          setUpgradeSubmitted(false);
        }}
        items={["Everything in Silver", "In-app brand spotlight to all neighbourhood members", "Co-hosted hyperlocal events - drive real footfall", "WhatsApp outreach campaigns to Konnectly families", "New client acquisition support", "Detailed weekly analytics dashboard"]}
        locked={["Patron / CSR badge (Platinum only)"]}
      />
      <Tier
        tone="platinum"
        title="Platinum Partner"
        subtitle="Top tier - Maximum community impact"
        cta="Upgrade to Platinum"
        onCta={() => {
          setUpgradeTier("Platinum");
          setUpgradeSubmitted(false);
        }}
        items={["Everything in Gold", "Community Patron badge - PR coverage & social media", "Club Partner - offer space and mentorship to community", "Priority placement in all Konnectly events", "Dedicated account manager from Konnectly", "Custom co-branded campaigns with Konnectly"]}
      />
      {upgradeTier && !upgradeSubmitted && (
        <UpgradeRequestSheet
          brand={brand}
          profile={profile}
          tier={upgradeTier}
          onClose={() => setUpgradeTier(null)}
          onSubmit={() => setUpgradeSubmitted(true)}
        />
      )}
      {upgradeTier && upgradeSubmitted && (
        <UpgradeSuccessOverlay tier={upgradeTier} onDone={() => {
          setUpgradeSubmitted(false);
          setUpgradeTier(null);
        }} />
      )}
    </div>
  );
}

function Profile({ data, setIsAuthed, setActiveTab }: { data: BrandData | null; setIsAuthed: (value: boolean) => void; setActiveTab: (tab: Tab) => void }) {
  const brand = data?.brand;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gstInputRef = useRef<HTMLInputElement | null>(null);
  const licenceInputRef = useRef<HTMLInputElement | null>(null);
  const businessPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [documents, setDocuments] = useState({ gst: "", licence: "", businessPhoto: "" });
  const profile = parseBrandProfile(brand);
  const bizKode = brand?.referralCode || "BK-PARTNER";
  const shareText = `Hi! I'm ${profile.owner} from ${brand?.name || "our business"}, a proud Konnectly business partner!\n\nKonnectly is ${profile.area}'s hyperlocal marketing platform connecting families to local businesses through events, rewards and more.\n\nJoin as a partner and use my BizKode when signing up to get priority onboarding:\n${bizKode}\n\nContact: +91-${brand?.mobile || "9810889180"} | konnectly.org\nLet's grow the community together!`;

  function handlePhotoUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Please upload a JPG or PNG business photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(typeof reader.result === "string" ? reader.result : "");
      setStatus("Business photo preview updated.");
    };
    reader.readAsDataURL(file);
  }

  function handleDocumentUpload(key: keyof typeof documents, file: File | undefined) {
    if (!file) return;
    setDocuments((current) => ({ ...current, [key]: file.name }));
    setStatus(`${file.name} uploaded for review.`);
  }

  async function shareBusiness() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Konnectly BizKode", text: shareText });
        return;
      } catch {
        // Fall back to WhatsApp when native share is unavailable/cancelled.
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
     
      <Card className="p-3 text-center">
        <button onClick={() => fileInputRef.current?.click()} className="relative mx-auto grid h-[72px] w-[72px] place-items-center overflow-visible rounded-full border-[4px] border-[#f6c400] bg-[#6655cf] text-2xl font-black text-white" type="button">
          <span className="grid h-full w-full place-items-center overflow-hidden rounded-full">
            {photoPreview ? <span aria-label="Business profile preview" className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${photoPreview})` }} /> : brand?.name?.charAt(0).toUpperCase() || "B"}
          </span>
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[#f6c400] text-[#33266f] shadow-md">
            <Camera size={14} />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => handlePhotoUpload(event.target.files?.[0])} />
        <button onClick={() => fileInputRef.current?.click()} className="mt-1.5 text-[10px] font-black text-[#9290aa]" type="button">Tap to upload your photo</button>
        <h2 className="mt-2 text-lg font-black">{brand?.name || "Business"}</h2>
        <p className="text-[11px] font-bold text-zinc-500">{profile.category} - {profile.area}</p>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <span className="inline-flex min-h-9 items-center justify-center rounded-full bg-emerald-50 px-3 text-[11px] font-black text-emerald-700">Verified Partner</span>
          <span className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#4638b8] px-3 font-mono text-xs font-black tracking-[0.14em] text-[#f6c400]">{bizKode}</span>
        </div>
        <button onClick={() => setReferOpen(true)} className="mt-3 w-full px-3 py-0 text-[11px] font-black text-[#9290aa]" type="button">
          Your BizKode - share to refer other businesses ✨
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2 text-left text-sm">
          <Info label="Owner" value={profile.owner} />
          <Info label="Partnership Tier" value={brand?.tier || "Silver Partner"} />
          <Info label="Primary" value={brand?.mobile ? `+91 ${brand.mobile}` : "-"} />
          <Info label="Alternate" value={profile.alternateMobile} />
          <div className="col-span-2">
            <Info label="Member Since" value={profile.memberSince} />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <h3 className="text-sm font-black">Business Documents</h3>
        <div className="mt-3 grid gap-2">
          <ProfileRow icon="GST" title="GST Certificate" meta={documents.gst ? "Uploaded for review" : "Tap to upload"} onClick={() => gstInputRef.current?.click()} />
          <ProfileRow icon="Shop" title="Shop Licence" meta={documents.licence ? "Uploaded for review" : "Tap to upload"} onClick={() => licenceInputRef.current?.click()} />
          <ProfileRow icon="Photo" title="Business Photo" meta={documents.businessPhoto || photoPreview ? "Uploaded for review" : "Tap to upload"} onClick={() => businessPhotoInputRef.current?.click()} />
        </div>
        <input ref={gstInputRef} type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(event) => handleDocumentUpload("gst", event.target.files?.[0])} />
        <input ref={licenceInputRef} type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(event) => handleDocumentUpload("licence", event.target.files?.[0])} />
        <input ref={businessPhotoInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(event) => {
          const file = event.target.files?.[0];
          handleDocumentUpload("businessPhoto", file);
          handlePhotoUpload(file);
        }} />
      </Card>

      <Card className="p-3">
        <h3 className="text-sm font-black">Account</h3>
        <div className="mt-3 grid gap-2">
          <ProfileButton icon={<User size={18} />} title="Edit Business Profile" onClick={() => setEditOpen(true)} />
          <ProfileButton icon={<TrendingUp size={18} />} title="View Analytics & Reports" onClick={() => setActiveTab("Dashboard")} />
          <ProfileButton icon={<Handshake size={18} />} title="Refer a Business & Earn" onClick={() => setReferOpen(true)} />
        </div>
      </Card>

      {status && <p className="rounded-2xl bg-[#f2efff] px-4 py-3 text-center text-xs font-black text-[#5b4ec8]">{status}</p>}
      <button
        onClick={async () => {
          await fetch("/api/auth/logout?scope=user", { method: "POST" });
          setIsAuthed(false);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-black text-red-600 shadow-sm"
        type="button"
      >
        <LogOut size={18} /> Sign Out
      </button>
      {editOpen && <EditBusinessSheet brand={brand} profile={profile} onClose={() => setEditOpen(false)} onSaved={(message) => { setStatus(message); setEditOpen(false); }} />}
      {referOpen && <ReferBusinessSheet brand={brand} profile={profile} shareText={shareText} onShare={shareBusiness} onClose={() => setReferOpen(false)} />}
    </div>
  );
}

function ProfileRow({ icon, title, meta, onClick }: { icon: string; title: string; meta: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-2xl bg-[#f7f6ff] p-2.5 text-left" type="button">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-[10px] font-black text-[#5b4ec8] shadow-sm">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black">{title}</span>
        <span className="block text-[11px] font-bold text-amber-600">{meta}</span>
      </span>
      <span className="text-xl font-black text-zinc-300">›</span>
    </button>
  );
}

function ProfileButton({ icon, title, onClick }: { icon: ReactNode; title: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-2xl bg-[#f7f6ff] p-2.5 text-left" type="button">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-[#5b4ec8] shadow-sm">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-black">{title}</span>
      <span className="text-xl font-black text-zinc-300">›</span>
    </button>
  );
}

function ReferBusinessSheet({
  brand,
  profile,
  shareText,
  onShare,
  onClose,
}: {
  brand: BrandData["brand"] | undefined;
  profile: ReturnType<typeof parseBrandProfile>;
  shareText: string;
  onShare: () => Promise<void>;
  onClose: () => void;
}) {
  const bizKode = brand?.referralCode || "BK-PARTNER";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#171330]/55 px-0 sm:px-3">
      <section className="max-h-[86dvh] w-full max-w-[430px] overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]">
        <div className="flex justify-center px-5 pt-3">
          <span className="h-1.5 w-14 rounded-full bg-[#d9d5ec]" />
        </div>
        <div className="max-h-[calc(86dvh-20px)] overflow-y-auto px-5 pb-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="rounded-[20px] border-2 border-[#e8b900] bg-[#fff8df] p-4 text-left text-[12px] font-bold leading-5 text-[#171330]">
          <p className="font-black">Hi! I&apos;m {profile.owner} from {brand?.name || "our business"}, a proud Konnectly business partner!</p>
          <p className="mt-3">Konnectly is {profile.area}&apos;s biggest hyperlocal marketing platform - connecting families to local businesses through events, rewards and more.</p>
          <p className="mt-3">Join as a partner and use my BizKode when signing up to get priority onboarding:</p>
          <span className="mt-2 inline-flex rounded-full bg-[#4638b8] px-4 py-2 font-mono text-xs font-black tracking-[0.16em] text-[#f6c400]">{bizKode}</span>
          <p className="mt-3">Contact: +91-{brand?.mobile || "9810889180"} | konnectly.org</p>
          <p>Let&apos;s grow the community together!</p>
        </div>
        <button onClick={onShare} className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-[#25d366] text-sm font-black text-white shadow-xl shadow-emerald-300/40" type="button">
          <span className="text-xl"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg></span>
          Share on WhatsApp
        </button>
        <button onClick={onClose} className="mt-3 h-12 w-full rounded-full bg-[#f7f6ff] text-sm font-black text-[#9290aa]" type="button">
          Maybe Later
        </button>
        <p className="sr-only">{shareText}</p>
        </div>
      </section>
    </div>
  );
}

function EditBusinessSheet({
  brand,
  profile,
  onClose,
  onSaved,
}: {
  brand: BrandData["brand"] | undefined;
  profile: ReturnType<typeof parseBrandProfile>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [owner, setOwner] = useState(profile.owner);
  const [alternateMobile, setAlternateMobile] = useState(profile.alternateMobile.replace(/\D/g, "").slice(-10));
  const [area, setArea] = useState(profile.area);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 px-3 pb-3 sm:place-items-center">
      <section className="w-full max-w-[430px] rounded-[26px] bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">Edit Business Profile</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-[#f2efff] text-[#5b4ec8]" type="button" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <TextInput label="Business Name" value={brand?.name || ""} onChange={() => undefined} placeholder="Business name" />
          <TextInput label="Owner Name" value={owner} onChange={setOwner} placeholder="Owner name" />
          <TextInput label="Alternate Mobile" value={alternateMobile} onChange={(value) => setAlternateMobile(value.replace(/\D/g, "").slice(-10))} placeholder="91234 12345" />
          <TextInput label="Area / Locality" value={area} onChange={setArea} placeholder="Ashok Vihar, Phase 2" />
        </div>
        <button onClick={() => onSaved("Profile details updated on this device. Admin sync can be connected next.")} className="mt-5 h-12 w-full rounded-full bg-[#6655cf] text-sm font-black text-white shadow-xl shadow-[#6655cf]/25" type="button">
          Save Changes
        </button>
      </section>
    </div>
  );
}

function parseBrandProfile(brand: BrandData["brand"] | undefined) {
  const description = brand?.description || "";
  const note = brand?.note || "";
  const [categoryRaw, areaRaw] = description.split(" - ");
  const ownerMatch = note.match(/Owner:\s*([^|]+)/i);
  const alternateMatch = note.match(/Alternate:\s*([^|]+)/i);

  return {
    category: categoryRaw?.trim() || "Food & Beverage",
    area: areaRaw?.trim() || "Ashok Vihar, Phase 2",
    owner: ownerMatch?.[1]?.trim() || "Rajesh Kapoor",
    alternateMobile: alternateMatch?.[1]?.trim() || "+91 91234 12345",
    memberSince: brand?.createdAt ? `${formatMonthYear(brand.createdAt)} · ${areaRaw?.trim() || "Partner onboarding"}` : "Partner onboarding",
  };
}

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`inline-flex items-center ${compact ? "rounded-[14px] px-3.5 py-2" : "gap-3 rounded-[18px] px-4 py-2"} bg-white shadow-xl`}>
      <span className={`${compact ? "text-sm" : "text-base"} font-black text-[#5b4ec8]`}>
        Ko<span className="text-[#c8991e]">nn</span>ectly
      </span>
      {!compact && <span className="rounded-full bg-[#f4bf00] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#14112f]">For Business</span>}
    </div>
  );
}

function AuthPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="my-1 inline-flex items-center gap-2 rounded-full bg-[#eee7ff] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#5b4ec8]">
      {icon} {label}
    </span>
  );
}

function TextInput({ label, value, onChange, placeholder, optional }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; optional?: boolean }) {
  return (
    <label className="mt-2.5 grid gap-1.5 text-xs font-black text-[#14112f]">
      <span>{label}{optional ? "" : ""}</span>
      <input required={!optional} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 rounded-[14px] border-2 border-[#e3e0f4] bg-[#f7f6ff] px-4 text-sm font-bold outline-none focus:border-[#6655cf]" />
    </label>
  );
}

function SelectInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-2.5 grid gap-1.5 text-xs font-black text-[#14112f]">
      <span>{label}</span>
      <span className="relative">
        <select required value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-[14px] border-2 border-[#e3e0f4] bg-[#f7f6ff] px-4 pr-10 text-sm font-bold outline-none focus:border-[#6655cf]">
          <option value="">Select category...</option>
          {BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#14112f]" size={17} />
      </span>
    </label>
  );
}

function PhoneInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 grid gap-1.5 text-xs font-black text-[#14112f]">
      <span>{label}</span>
      <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-2 mt-1">
        <div className="grid h-11 place-items-center rounded-[14px] border-2 border-[#e3e0f4] bg-[#f7f6ff] text-sm font-black">IN +91</div>
        <input required value={value} onChange={(event) => onChange(event.target.value)} inputMode="numeric" pattern="[0-9]{10}" placeholder="98100 00000" type="tel" className="h-11 min-w-0 rounded-[14px] border-2 border-[#e3e0f4] bg-[#f7f6ff] px-4 text-sm font-bold outline-none focus:border-[#6655cf]" />
      </div>
    </label>
  );
}

function PrimaryButton({ children, disabled, className = "" }: { children: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button type="submit" disabled={disabled} className={`${className} h-12 w-full rounded-full bg-[#6655cf] px-5 text-sm font-black text-white shadow-xl shadow-[#6655cf]/25 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55`}>
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-xs font-black text-zinc-300">
      <span className="h-px bg-zinc-200" />
      or
      <span className="h-px bg-zinc-200" />
    </div>
  );
}

function RedemptionRow({ item }: { item: BrandData["redemptions"][number] }) {
  const redeemed = item.status === "redeemed";

  return (
    <div className="flex items-center gap-3 rounded-[16px] bg-[#f7f6ff] p-3">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${redeemed ? "bg-emerald-100 text-emerald-700" : "bg-[#eee7ff] text-[#5b4ec8]"}`}>
        {redeemed ? <Check size={20} /> : <QrCode size={20} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{item.member}</p>
        <p className="truncate text-xs font-bold text-zinc-500">{item.coupon} - {item.points} pts</p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-black ${redeemed ? "text-emerald-600" : "text-amber-600"}`}>{redeemed ? "Approved" : "Issued"}</p>
        <p className="mt-1 text-[10px] font-bold text-zinc-400">{formatShortDate(item.redeemedAt || item.createdAt)}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

function Metric({ value, label, tone = "" }: { value: string; label: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className={`text-xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold leading-4 text-zinc-500">{label}</p>
    </div>
  );
}

function ActionCard({ icon, title, body, onClick }: { icon: ReactNode; title: string; body: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="grid min-h-[132px] w-full content-between rounded-[18px] bg-white p-3 text-left shadow-sm ring-1 ring-[#ebe7f7] transition active:scale-[0.99]" type="button">
      <span className="grid h-10 w-10 place-items-center rounded-[15px] bg-[#f2efff] text-[#5b4ec8] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <span className="mt-3 block">
        <span className="block text-[13px] font-black leading-[1.15] text-[#27213f]">{title}</span>
        <span className="mt-2 block text-[11px] font-bold leading-4 text-[#9290aa]">{body}</span>
      </span>
      <ArrowRight size={15} className="ml-auto mt-2 text-[#7a6de2]" />
    </button>
  );
}

function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
    </div>
  );
}

function Tier({
  title,
  subtitle,
  items,
  locked = [],
  current = false,
  cta,
  tone = "silver",
  onCta,
}: {
  title: string;
  subtitle: string;
  items: string[];
  locked?: string[];
  current?: boolean;
  cta?: string;
  tone?: "silver" | "gold" | "platinum";
  onCta?: () => void;
}) {
  const styles = {
    silver: {
      card: "border-[#d8d8d8] bg-[#f8f8f8]",
      badge: "bg-[#b9b9b9] text-[#5b4ec8]",
      title: "text-[#858585]",
      cta: "bg-[#f0be00] text-[#171330]",
      current: "bg-[#f0be00] text-[#171330]",
    },
    gold: {
      card: "border-[#e8b900] bg-[#fff6d4]",
      badge: "bg-[#e4b000] text-white",
      title: "text-[#c39204]",
      cta: "bg-[#e4b000] text-[#171330]",
      current: "bg-[#e4b000] text-[#171330]",
    },
    platinum: {
      card: "border-[#7a6de2] bg-[#eee9ff]",
      badge: "bg-[#7566dc] text-white",
      title: "text-[#5b4ec8]",
      cta: "bg-[#6655cf] text-white",
      current: "bg-[#6655cf] text-white",
    },
  }[tone];

  return (
    <div className={`rounded-[22px] border-2 p-3.5 shadow-sm ${styles.card}`}>
      <div className="flex items-start gap-3">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-[18px] text-xs font-black ${styles.badge}`}>
          {tone === "silver" ? "S2" : tone === "gold" ? "G1" : "VIP"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={`truncate text-lg font-black ${styles.title}`}>{title}</h3>
              <p className="mt-0.5 text-xs font-bold text-[#9290aa]">{subtitle}</p>
            </div>
            {current && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${styles.current}`}>Current</span>}
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {items.map((item) => <TierItem key={item} text={item} />)}
        {locked.map((item) => <TierItem key={item} text={item} locked />)}
      </div>
      {cta && <button onClick={onCta} className={`mt-5 h-12 w-full rounded-full text-sm font-black shadow-xl ${styles.cta}`} type="button">{cta}</button>}
    </div>
  );
}

function TierItem({ text, locked }: { text: string; locked?: boolean }) {
  return (
    <div className={`flex gap-2.5 text-xs font-bold leading-5 ${locked ? "text-[#9d9ab2]" : "text-[#27213f]"}`}>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${locked ? "bg-white/65 text-[#b7b4c5]" : "bg-emerald-100 text-emerald-600"}`}>
        {locked ? "x" : "✓"}
      </span>
      <span>{text}</span>
    </div>
  );
}

function UpgradeRequestSheet({
  brand,
  profile,
  tier,
  onClose,
  onSubmit,
}: {
  brand: BrandData["brand"] | undefined;
  profile: ReturnType<typeof parseBrandProfile>;
  tier: "Gold" | "Platinum";
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [name, setName] = useState(profile.owner);
  const [mobile, setMobile] = useState(brand?.mobile ? `+91 ${brand.mobile}` : "+91 98100 88180");
  const [bestTime, setBestTime] = useState("Morning (9am - 12pm)");

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#171330]/55 px-3 pb-3 sm:place-items-center">
      <section className="w-full max-w-[430px] rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px]">
        <h3 className="text-2xl font-black text-[#171330]">Upgrade to {tier}</h3>
        <p className="mt-3 text-sm font-bold leading-5 text-[#9290aa]">Our team will call you to complete the upgrade. Your details are pre-filled.</p>
        <div className="mt-5 grid gap-4">
          <SheetField label="Your Name" value={name} onChange={setName} />
          <SheetField label="Mobile (for callback)" value={mobile} onChange={setMobile} />
          <label className="grid gap-2 text-sm font-black text-[#171330]">
            Best time to call
            <select value={bestTime} onChange={(event) => setBestTime(event.target.value)} className="h-14 w-full rounded-2xl border-2 border-[#e3e0f4] bg-[#f7f6ff] px-4 text-sm font-black outline-none focus:border-[#6655cf]">
              <option>Morning (9am - 12pm)</option>
              <option>Afternoon (12pm - 4pm)</option>
              <option>Evening (4pm - 8pm)</option>
            </select>
          </label>
        </div>
        <button onClick={onSubmit} className="mt-5 h-14 w-full rounded-full bg-[#6655cf] text-base font-black text-white shadow-xl shadow-[#6655cf]/25" type="button">
          Confirm Upgrade Request
        </button>
        <button onClick={onClose} className="mt-3 h-12 w-full rounded-full bg-[#f7f6ff] text-sm font-black text-[#9290aa]" type="button">
          Maybe Later
        </button>
        <p className="sr-only">{name} {mobile} {bestTime}</p>
      </section>
    </div>
  );
}

function SheetField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#171330]">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-14 rounded-2xl border-2 border-[#e3e0f4] bg-[#f7f6ff] px-4 text-sm font-black outline-none focus:border-[#6655cf]" />
    </label>
  );
}

function UpgradeSuccessOverlay({ tier, onDone }: { tier: "Gold" | "Platinum"; onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#171330]/65 px-8 text-center text-white">
      <div className="grid justify-items-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-[#22c55e] text-3xl shadow-[0_20px_50px_rgba(34,197,94,0.35)]">📞</div>
        <h3 className="mt-8 text-2xl font-black">Upgrade Requested!</h3>
        <p className="mt-4 max-w-[330px] text-sm font-black leading-7 text-white/85">Our team will call you within 24 hours to complete your {tier} upgrade. Thank you!💜</p>
        <button onClick={onDone} className="mt-8 h-12 min-w-[170px] rounded-full bg-white px-8 text-lg font-black text-[#5b4ec8]" type="button">
          Done ✓
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const softYellow = label === "Primary" || label === "Alternate";

  return (
    <div className={`rounded-2xl p-2.5 ${softYellow ? "bg-[#fff6df]" : "bg-[#eee7ff]"}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${softYellow ? "text-[#c99a08]" : "text-[#5b4ec8]"}`}>{label}</p>
      <p className="mt-1 break-words text-xs font-black text-[#27213f]">{value}</p>
    </div>
  );
}

function canSubmitRegister(details: { businessName: string; businessType: string; ownerName: string; mobile: string; area: string }) {
  return Boolean(details.businessName.trim() && details.businessType && details.ownerName.trim() && details.mobile.length === 10 && details.area.trim());
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `+91 ${digits.slice(0, 2)}xxxx${digits.slice(-4)}` : "your mobile";
}

function formatShortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}

function formatMonthYear(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "January 2026";
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

function formatCurrentTime() {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date()).toUpperCase();
}

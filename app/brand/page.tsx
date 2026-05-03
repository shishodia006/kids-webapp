"use client";

import {
  ArrowRight,
  Bell,
  Camera,
  ChevronRight,
  Download,
  Gift,
  Handshake,
  Home,
  LogOut,
  QrCode,
  Share2,
  TrendingUp,
  Upload,
  User,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

const BRAND_EMAIL = "brand@konnectly.com";
const BRAND_PASSWORD = "Brand@123";

type Tab = "Dashboard" | "Scan QR" | "Opportunities" | "Upgrade" | "Profile";

export default function BrandPanel() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Dashboard");

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    if (email === BRAND_EMAIL && password === BRAND_PASSWORD) {
      setIsAuthed(true);
      setError("");
      return;
    }

    setError("Wrong brand email or password.");
  }

  if (!isAuthed) {
    return <LoginShell error={error} onSubmit={login} />;
  }

  return (
    <main className="min-h-screen bg-[#f5f0ff] pb-24 text-zinc-950">
      <header className="bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-500 px-4 pb-8 pt-4 text-white">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950 shadow">
              Konnectly <span className="text-violet-600">Business</span>
            </div>
            <div className="flex gap-2">
              <IconButton label="Install">
                <Download size={18} />
              </IconButton>
              <IconButton label="Notifications">
                <Bell size={18} />
              </IconButton>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-yellow-300 text-xl font-black text-zinc-950">
              C
            </div>
            <div>
              <p className="text-sm text-white/75">Welcome back, Partner 👋</p>
              <h1 className="text-2xl font-black">Costa</h1>
            </div>
          </div>
        </div>
      </header>

      <section className="-mt-4 rounded-t-[28px] bg-[#f7f7fb] px-4 pt-5">
        <div className="mx-auto max-w-md">
          {activeTab === "Dashboard" && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === "Scan QR" && <ScanQr />}
          {activeTab === "Opportunities" && <Opportunities />}
          {activeTab === "Upgrade" && <Upgrade />}
          {activeTab === "Profile" && <Profile setIsAuthed={setIsAuthed} setActiveTab={setActiveTab} />}
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-3 pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {[
            { label: "Dashboard" as const, icon: <Home size={20} /> },
            { label: "Scan QR" as const, icon: <QrCode size={20} /> },
            { label: "Opportunities" as const, icon: <Handshake size={20} /> },
            { label: "Upgrade" as const, icon: <Upload size={20} /> },
            { label: "Profile" as const, icon: <User size={20} /> },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className="flex flex-col items-center gap-1 text-[11px] font-semibold text-zinc-500"
              type="button"
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-full transition ${
                  activeTab === item.label
                    ? "bg-gradient-to-r from-violet-700 to-fuchsia-500 text-white shadow-lg"
                    : "text-zinc-500"
                }`}
              >
                {item.icon}
              </span>
              <span className={activeTab === item.label ? "text-violet-700" : ""}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function Dashboard({ setActiveTab }: { setActiveTab: (tab: Tab) => void }) {
  return (
    <div className="space-y-5">
      <Card className="bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/75">Partnership Status</p>
            <h2 className="mt-2 text-2xl font-black">🥈 Silver Partner</h2>
            <p className="mt-2 text-sm text-white/80">Coupon redeem · Revenue share active</p>
          </div>
          <button onClick={() => setActiveTab("Upgrade")} className="rounded-full bg-white px-3 py-2 text-xs font-black text-violet-700" type="button">
            Upgrade →
          </button>
        </div>
        <p className="mt-4 rounded-xl bg-white/12 p-3 text-sm">
          Upgrade to Gold for in-app spotlights ✨
        </p>
      </Card>

      <section>
        <h2 className="mb-3 font-black">This Month&apos;s Performance</h2>
        <div className="grid grid-cols-3 gap-3">
          <Metric value="0" label="Vouchers Redeemed" />
          <Metric value="₹0" label="Revenue Generated" tone="text-amber-600" />
          <Metric value="0" label="New Customers" tone="text-emerald-600" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-black">Quick Actions</h2>
        <div className="grid gap-3">
          <ActionCard icon={<QrCode />} title="Scan & Approve Voucher" body="Redeem a member's Konnect Points" onClick={() => setActiveTab("Scan QR")} />
          <ActionCard icon={<Handshake />} title="Partnership Opportunities" body="Events, sponsorships & more" onClick={() => setActiveTab("Opportunities")} />
          <ActionCard icon={<Upload />} title="Upgrade Tier" body="Unlock Gold or Platinum perks" onClick={() => setActiveTab("Upgrade")} />
          <ActionCard icon={<Gift />} title="Refer a Business" body="Earn rewards for every referral" onClick={() => setActiveTab("Profile")} />
        </div>
      </section>

      <Card className="border-2 border-violet-200 bg-violet-50">
        <div className="flex items-center gap-3">
          <Download className="text-violet-700" />
          <div className="flex-1">
            <h3 className="font-black">Install Konnectly Business</h3>
            <p className="text-sm text-zinc-600">Add to home screen — scan QR & approve faster 🚀</p>
          </div>
          <ChevronRight size={18} />
        </div>
      </Card>

      <Card className="bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-black">Recent Redemptions</h3>
            <p className="mt-3 text-sm"><b>Anuj</b> redeemed</p>
            <p className="text-sm text-zinc-500">Costa · 50 pts · ₹88</p>
          </div>
          <span className="text-xs font-bold text-violet-700">See all →</span>
        </div>
      </Card>
    </div>
  );
}

function ScanQr() {
  return (
    <div className="space-y-5">
      <Title title="Scan & Approve" subtitle="Verify member vouchers" />
      <Card>
        <h3 className="font-black">Scan Member QR</h3>
        <p className="mt-1 text-sm text-zinc-500">Ask the Konnectly member to show their voucher QR</p>
        <button className="mt-5 grid w-full place-items-center rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 py-10 text-violet-700" type="button">
          <Camera size={34} />
          <span className="mt-2 font-black">Tap to start</span>
          <span className="text-sm">Open Camera</span>
        </button>
      </Card>
      <Card>
        <h3 className="font-black">QR not working? Enter manually</h3>
        <p className="mt-1 text-sm text-zinc-500">Enter Coupon Code shown on the member voucher.</p>
        <input className="mt-4 w-full rounded-xl border border-zinc-200 px-4 py-3 uppercase outline-none focus:border-violet-500" placeholder="KON-XXX-XXXX" />
        <button className="mt-3 w-full rounded-xl bg-violet-700 py-3 font-black text-white" type="button">Verify</button>
      </Card>
      <Card>
        <h3 className="font-black">Recent Redemptions</h3>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-violet-100 font-black text-violet-700">A</div>
          <div className="flex-1">
            <p className="font-bold">Anuj</p>
            <p className="text-sm text-zinc-500">Costa · 50 pts · KON-C-355655</p>
          </div>
          <span className="font-black text-emerald-600">+₹88</span>
        </div>
      </Card>
    </div>
  );
}

function Opportunities() {
  return (
    <div className="space-y-5">
      <Title title="Opportunities" subtitle="Events · Sponsorships · Partnership" />
      <Card className="bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white">
        <h3 className="text-2xl font-black">Grow Locally with Konnectly 🚀</h3>
        <p className="mt-3 text-sm leading-6 text-white/80">Reach neighbourhood families through co-hosted events, in-app spotlights and WhatsApp campaigns.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          {["📍 Hyperlocal", "👨‍👩‍👧 Family-first", "💰 Revenue Share", "📲 In-App Visibility"].map((tag) => (
            <span key={tag} className="rounded-full bg-white/15 px-3 py-2">{tag}</span>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-black">Upcoming Community Events</h3>
        <div className="mt-4 flex items-center gap-4 rounded-xl bg-amber-50 p-3">
          <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
            <p className="text-xs font-bold text-zinc-500">May</p>
            <p className="text-xl font-black">01</p>
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase text-violet-700">Engage</p>
            <p className="font-black">Cyclathon</p>
            <p className="text-sm text-zinc-500">📍 Ashok Vihar</p>
          </div>
          <ChevronRight />
        </div>
      </Card>
      <div className="grid gap-3">
        <ActionCard icon={<Handshake />} title="Event Sponsorship" body="Sponsor an upcoming event — full visibility" />
        <ActionCard icon={<TrendingUp />} title="In-App Spotlight" body="Featured placement in the parent app" />
        <ActionCard icon={<Bell />} title="WhatsApp Campaign" body="Co-branded outreach to all members" />
      </div>
    </div>
  );
}

function Upgrade() {
  return (
    <div className="space-y-5">
      <Title title="Partnership Tiers" subtitle="Upgrade to unlock more growth" />
      <Card className="bg-amber-50">
        <p className="text-sm text-zinc-700">💡 You&apos;re currently on Silver Tier. Upgrade to unlock in-app spotlights, event co-hosting & more revenue opportunities.</p>
      </Card>
      <Tier current emoji="🥈" title="Silver Partner" subtitle="Entry level · Revenue share active" items={["Increased footfall & new client acquisition", "Coupon redemption at your outlet", "Shared revenue model", "Basic monthly performance report"]} locked={["In-app brand spotlight (Gold+)", "Co-hosted events (Gold+)", "Patron / CSR visibility (Platinum)"]} />
      <Tier emoji="🥇" title="Gold Partner" subtitle="Most popular · High visibility" cta="Upgrade to Gold" items={["Everything in Silver", "In-app brand spotlight", "Co-hosted hyperlocal events", "WhatsApp outreach campaigns", "Weekly analytics dashboard"]} />
      <Tier emoji="💎" title="Platinum Partner" subtitle="Top tier · Maximum community impact" cta="Upgrade to Platinum" items={["Everything in Gold", "Community Patron badge", "Club Partner visibility", "Priority placement in events", "Dedicated account manager"]} />
    </div>
  );
}

function Profile({ setIsAuthed, setActiveTab }: { setIsAuthed: (value: boolean) => void; setActiveTab: (tab: Tab) => void }) {
  const shareText = `Hi! 👋 I'm Deepak, a proud Konnectly business partner! 🌟

Konnectly is the hyperlocal marketing platform connecting families to local businesses through events, rewards & more!

Use my BizKode for priority onboarding:
BR-C-C61A

https://konnectly.org/index.php?view=register&ref=BR-C-C61A

Let's grow the community together! 💜`;

  return (
    <div className="space-y-5">
      <Title title="Business Profile" subtitle="Your Konnectly partner account" />
      <Card>
        <div className="text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-yellow-300 text-3xl font-black">C</div>
          <h2 className="mt-3 text-2xl font-black">Costa</h2>
          <p className="text-sm text-zinc-500">Business Partner · Verified</p>
          <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">✓ Verified Partner BR-C-C61A</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Info label="Owner" value="Deepak" />
          <Info label="Tier" value="🥈 Silver" />
          <Info label="Primary" value="—" />
          <Info label="Member Since" value="April 2026" />
        </div>
      </Card>
      <Card className="bg-violet-50">
        <h3 className="font-black">Refer a Business!</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-700">{shareText}</p>
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 py-3 font-black text-white" type="button">
          <Share2 size={18} /> Share on WhatsApp
        </button>
        <button className="mt-2 w-full rounded-xl py-2 text-sm font-bold text-zinc-500" type="button">Maybe Later</button>
      </Card>
      <div className="grid gap-3">
        <ActionCard icon={<User />} title="Edit Business Profile" body="Update owner, contact and outlet details" />
        <ActionCard icon={<Handshake />} title="View Opportunities" body="Explore campaigns and events" onClick={() => setActiveTab("Opportunities")} />
        <ActionCard icon={<Gift />} title="Refer a Business & Earn" body="Share your BizKode with partners" />
        <ActionCard icon={<Download />} title="Install Konnectly Business App" body="Add to home screen for one-tap access" />
      </div>
      <button onClick={() => setIsAuthed(false)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 font-black text-red-600 shadow-sm" type="button">
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
}

function LoginShell({ error, onSubmit }: { error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fff9ec] px-5">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-[30px] bg-white/80 p-8 shadow-xl backdrop-blur-md">
        <p className="text-xs font-semibold tracking-widest text-purple-600">WELCOME BACK</p>
        <h1 className="mt-2 text-5xl font-black text-black">Login</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Use your email or mobile number, then confirm with WhatsApp OTP.
        </p>
        <input
          name="email"
          type="text"
          placeholder="Enter mobile or email"
          className="mt-6 w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-purple-400"
        />
        <input
          name="password"
          type="password"
          placeholder="Enter password / OTP"
          className="mt-4 w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-purple-400"
        />
        <div className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-sm text-green-700">
          <span className="font-semibold">WhatsApp</span> - An OTP will be sent to your registered WhatsApp number.
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" className="mt-6 w-full rounded-full bg-black py-4 text-base font-bold text-yellow-400 transition hover:opacity-90">
          Send OTP & Login
        </button>
        <p className="mt-6 text-center text-sm text-gray-600">
          NEW HERE? <span className="cursor-pointer font-semibold text-purple-600">CREATE ACCOUNT</span>
        </p>
      </form>
    </main>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

function IconButton({ children, label }: { children: ReactNode; label: string }) {
  return <button aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-white/15" type="button">{children}</button>;
}

function Metric({ value, label, tone = "" }: { value: string; label: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold leading-4 text-zinc-500">{label}</p>
    </div>
  );
}

function ActionCard({ icon, title, body, onClick }: { icon: ReactNode; title: string; body: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]" type="button">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700">{icon}</span>
      <span className="flex-1">
        <span className="block font-black">{title}</span>
        <span className="block text-sm text-zinc-500">{body}</span>
      </span>
      <ArrowRight size={17} className="text-zinc-400" />
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

function Tier({ emoji, title, subtitle, items, locked = [], current = false, cta }: { emoji: string; title: string; subtitle: string; items: string[]; locked?: string[]; current?: boolean; cta?: string }) {
  return (
    <Card className={current ? "border-2 border-violet-300" : ""}>
      {current && <p className="mb-2 text-xs font-black text-violet-700">✓ Your Current Tier</p>}
      <h3 className="text-xl font-black">{emoji} {title}</h3>
      <p className="text-sm text-zinc-500">{subtitle}</p>
      <div className="mt-4 space-y-2 text-sm">
        {items.map((item) => <p key={item}>✓ {item}</p>)}
        {locked.map((item) => <p key={item} className="text-zinc-400">✗ {item}</p>)}
      </div>
      {cta && <button className="mt-4 w-full rounded-xl bg-violet-700 py-3 font-black text-white" type="button">{cta}</button>}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3">
      <p className="text-xs font-bold text-zinc-500">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

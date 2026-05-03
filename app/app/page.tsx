"use client";

import {
  BatteryFull,
  Bell,
  CalendarDays,
  ArrowLeft,
  ChevronRight,
  CircleDot,
  Download,
  Gift,
  Grid2X2,
  History,
  Home,
  MapPin,
  Printer,
  Plus,
  Send,
  Shield,
  Star,
  User,
  Users,
  Wifi,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

const members = [
  { name: "dk", initials: "DK", active: true },
  { name: "Maya", initials: "MK", image: "/images/event1.jpg" },
  { name: "Meera", initials: "MK", image: "/images/event2.jpg" },
  { name: "Kabir", initials: "MK", image: "/images/event3.jpg" },
  { name: "Riya", initials: "MK", image: "/images/event4.jpg" },
];

const rewards = [
  { brand: "Decathlon", points: "5000 pts" },
  { brand: "Hamleys", points: "10000 pts" },
  { brand: "Cafe Coffee Day", points: "2500 pts" },
  { brand: "Domino's", points: "3500 pts" },
];

const pastActivities = [
  { title: "Cyclathon", date: "May 01, 2026", place: "Ashok Vihar", category: "Engage" },
  { title: "Little Chefs Pop-up", date: "Apr 10, 2026", place: "Community Center", category: "Explore" },
  { title: "RideFest 2025", date: "Mar 15, 2026", place: "Phase 2 Main Park", category: "Experience" },
];

const registeredActivities = [
  { title: "Test Event", date: "Apr 30, 2026", place: "Delhi", status: "Confirmed" },
  { title: "Summer Art Camp", date: "May 15, 2026", place: "DLF Phase 2", status: "Confirmed" },
];

const updates = [
  { title: "Cyclathon is coming up!", body: "yAYYY", date: "4 days ago", detail: "" },
  { title: "hi", body: "Mon, Apr 27 · 05:30 PM", date: "5 days ago", detail: "" },
  { title: "hi", body: "Mon, Apr 27 · 05:29 PM", date: "5 days ago", detail: "" },
  { title: "Cyclathon reminder", body: "Bring your helmet and water bottle.", date: "Apr 26", detail: "" },
  { title: "Weekend points bonanza", body: "Earn 2x points on selected activities.", date: "Apr 24", detail: "" },
  { title: "New partner reward added", body: "Cafe Coffee Day offer is now live.", date: "Apr 22", detail: "" },
  { title: "Summer Art Camp update", body: "Registration is closing soon. Only a few seats left.", date: "Apr 21", detail: "" },
  { title: "Reward reminder", body: "Show your membership card to redeem partner offers.", date: "Apr 20", detail: "" },
  { title: "Welcome to Konnectly", body: "Your family profile is ready. Explore activities and rewards.", date: "Apr 18", detail: "" },
];

const kidsProfiles = [
  { name: "dk", initials: "D", age: "Age 12", active: false },
  { name: "MK", subtitle: "Khms", age: "Age 8", image: "/images/event1.jpg", active: false },
  { name: "MK", subtitle: "Khms", age: "Age 8", image: "/images/event2.jpg", active: true },
  { name: "MK", subtitle: "Khms", age: "Age 8", image: "/images/event3.jpg", active: false },
  { name: "Aarav", subtitle: "DPS RK Puram", age: "Age 10", initials: "A", active: false },
  { name: "Meera", subtitle: "Grade 1", age: "Age 6", initials: "M", active: false },
];

const navItems = [
  { label: "Home", icon: Home },
  { label: "Activities", icon: CircleDot },
  { label: "Updates", icon: Bell },
  { label: "Account", icon: User },
];

type NavLabel = (typeof navItems)[number]["label"];

export default function UserApp() {
  const [showAlert, setShowAlert] = useState(true);
  const [activeNav, setActiveNav] = useState<NavLabel>("Home");
  const [referOpen, setReferOpen] = useState(false);
  const [eventPassOpen, setEventPassOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    function updateTime() {
      const formatted = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());
      setCurrentTime(formatted.replace(/\s?(AM|PM)$/i, ""));
    }

    updateTime();
    const timer = window.setInterval(updateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="h-dvh overflow-hidden bg-[linear-gradient(120deg,#3f2ca3_0%,#6d5fde_55%,#d6a20f_100%)] md:grid md:place-items-center">
      <section className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#f7f5ff] text-[12px] shadow-2xl md:rounded-[46px] md:border md:border-white/30">
        {eventPassOpen ? (
          <EventPassHeader currentTime={currentTime} onBack={() => setEventPassOpen(false)} />
        ) : activeNav === "Home" ? (
          <HomeHeader currentTime={currentTime} showAlert={showAlert} onCloseAlert={() => setShowAlert(false)} />
        ) : (
          <ScreenHeader currentTime={currentTime} title={activeNav === "Account" ? "My Account" : activeNav} subtitle={getSubtitle(activeNav)} showPoints={activeNav === "Activities"} />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pb-22 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {eventPassOpen && <EventPassScreen onBack={() => setEventPassOpen(false)} />}
          {!eventPassOpen && activeNav === "Home" && <HomeContent onOpenRefer={() => setReferOpen(true)} />}
          {!eventPassOpen && activeNav === "Activities" && <ActivitiesScreen onOpenPass={() => setEventPassOpen(true)} />}
          {!eventPassOpen && activeNav === "Updates" && <UpdatesScreen />}
          {!eventPassOpen && activeNav === "Account" && <AccountScreen />}
        </div>

        <a
          href="https://wa.me/919811297908"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-[82px] right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_14px_34px_rgba(37,211,102,0.45)] ring-4 ring-white/80 transition hover:scale-105 hover:bg-[#1ebe5d]"
          aria-label="Open WhatsApp chat with +91 98112 97908"
        >
          <WhatsAppIcon />
        </a>

        <BottomNav activeNav={activeNav} onSelect={setActiveNav} />
        {referOpen && <ReferBottomSheet onClose={() => setReferOpen(false)} />}
      </section>
    </main>
  );
}

function getSubtitle(activeNav: NavLabel) {
  if (activeNav === "Activities") return "Events & workshops for your kids";
  if (activeNav === "Updates") return "Latest from the community";
  if (activeNav === "Account") return "Parent & kids profiles";
  return "";
}

function HomeHeader({ currentTime, showAlert, onCloseAlert }: { currentTime: string; showAlert: boolean; onCloseAlert: () => void }) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-[#4d39b6] px-4 pb-4 pt-2.5 text-white">
      <div className="absolute -right-10 top-8 h-44 w-44 rounded-full bg-white/14" />
      <StatusBar currentTime={currentTime} />

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <LogoBox />
        <div className="flex items-center gap-2">
          <button className="flex h-8 items-center gap-1.5 rounded-full bg-[#f6c400] px-3 text-[11px] font-black text-[#1c1740]" type="button">
            <Star size={15} /> 6
          </button>
          <IconCircle icon={<Download size={20} />} />
          <IconCircle icon={<Bell size={20} />} />
        </div>
      </div>

      {showAlert && (
        <div className="absolute left-5 right-5 top-9 z-20 flex items-center gap-2.5 rounded-2xl bg-[#3f2fa6] px-3 py-2.5 shadow-xl">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f6c400] text-[#1c1740]">
            <Send size={17} />
          </div>
          <p className="min-w-0 flex-1 text-xs font-black">Cyclathon is coming up! yAYYY</p>
          <button onClick={onCloseAlert} className="text-white/70" type="button" aria-label="Close alert">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="relative mt-6 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {members.map((member) => (
          <button
            key={member.name}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-black ${
              member.active ? "bg-white text-[#4d39b6]" : "bg-white/14 text-white"
            }`}
            type="button"
          >
            {member.image ? (
              <Image src={member.image} alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-full object-cover" />
            ) : (
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#f6c400] text-[#1c1740]">{member.initials}</span>
            )}
            {member.initials}
          </button>
        ))}
        <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-dashed border-white/35 bg-white/10 text-white" type="button" aria-label="Add member">
          <Plus size={20} />
        </button>
      </div>

      <div className="relative mt-3 flex items-center gap-2.5">
        <div className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-[#ffe05a] bg-[#f6c400] text-lg font-black text-[#1c1740] shadow-lg">
          D
        </div>
        <div>
          <p className="text-xs font-black text-white/60">Good morning</p>
          <h1 className="text-lg font-black leading-tight">Hello, dk!</h1>
          <p className="mt-1 text-[11px] font-black tracking-wide text-[#f6c400]">KK-AV-25-0015</p>
        </div>
      </div>
    </div>
  );
}

function ScreenHeader({ currentTime, title, subtitle, showPoints }: { currentTime: string; title: string; subtitle: string; showPoints?: boolean }) {
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
            <Star size={15} /> 6
          </button>
        )}
      </div>
    </div>
  );
}

function EventPassHeader({ currentTime, onBack }: { currentTime: string; onBack: () => void }) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-[#4d39b6] px-5 pb-6 pt-2.5 text-white">
      <div className="absolute -right-12 top-7 h-44 w-44 rounded-full bg-white/14" />
      <StatusBar currentTime={currentTime} />
      <div className="relative mt-6 flex items-center gap-4">
        <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/12 text-[#f6c400]" type="button" aria-label="Back to activities">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">Event Pass</h1>
          <p className="mt-2 text-xs font-bold text-white/60">1 pass · Show at the gate</p>
        </div>
      </div>
    </div>
  );
}

function LogoBox({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`inline-flex items-center rounded-[12px] bg-white px-3 py-[5px] font-extrabold text-[#5f4bd2] shadow-[0_4px_14px_rgba(0,0,0,0.10)] ${
        compact ? "scale-95" : ""
      }`}
      style={{ fontFamily: "'Baloo 2', cursive" }}
    >
      <Image src="/images/logo.png" alt="Konnectly" width={118} height={28} className="block h-7 w-auto object-contain" priority />
    </div>
  );
}

function StatusBar({ currentTime }: { currentTime: string }) {
  return (
    <div className="relative z-10 flex items-center justify-between px-2 text-xs font-black text-white">
      <span>{currentTime || "--:--"}</span>
      <span className="flex items-center gap-1.5">
        <Wifi size={14} />
        <span>WiFi</span>
        <BatteryFull size={15} />
      </span>
    </div>
  );
}

function IconCircle({ icon }: { icon: ReactNode }) {
  return (
    <button className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-white/12 text-white" type="button">
      {icon}
    </button>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 32 32" fill="none">
      <path
        d="M16.02 4.2c-6.34 0-11.5 5.05-11.5 11.27 0 2.13.61 4.2 1.76 6l-1.16 5.95 6.12-1.44a11.75 11.75 0 0 0 4.78 1c6.34 0 11.5-5.05 11.5-11.27S22.36 4.2 16.02 4.2Z"
        fill="white"
      />
      <path
        d="M22.5 18.72c-.08-.14-.3-.22-.63-.38-.33-.15-1.94-.94-2.24-1.05-.3-.11-.52-.16-.74.16-.22.32-.85 1.05-1.04 1.27-.19.21-.38.24-.71.08a8.8 8.8 0 0 1-2.6-1.57 9.63 9.63 0 0 1-1.8-2.2c-.19-.32-.02-.49.14-.65.15-.14.33-.38.49-.57.16-.19.22-.32.33-.54.11-.21.05-.4-.03-.56-.08-.16-.74-1.75-1.01-2.4-.27-.63-.54-.54-.74-.55h-.63c-.22 0-.57.08-.87.4-.3.32-1.14 1.1-1.14 2.68 0 1.58 1.17 3.11 1.33 3.32.16.21 2.3 3.45 5.58 4.84.78.33 1.39.53 1.86.68.78.24 1.49.21 2.05.13.63-.09 1.94-.78 2.21-1.53.27-.75.27-1.4.19-1.54Z"
        fill="#25D366"
      />
    </svg>
  );
}

function BottomNav({ activeNav, onSelect }: { activeNav: NavLabel; onSelect: (nav: NavLabel) => void }) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-10 grid grid-cols-4 border-t border-[#ece8fb] bg-white px-3 pb-2.5 pt-2 shadow-[0_-12px_30px_rgba(40,31,91,0.08)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeNav === item.label;
        return (
          <button
            key={item.label}
            onClick={() => onSelect(item.label)}
                className={`grid place-items-center gap-1 text-[11px] font-black ${active ? "text-[#5f4bd2]" : "text-[#b8b6c8]"}`}
            type="button"
          >
            <Icon size={21} strokeWidth={active ? 2.6 : 2.2} />
            <span>{item.label}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#f6c400]" : "bg-transparent"}`} />
          </button>
        );
      })}
    </nav>
  );
}

function HomeContent({ onOpenRefer }: { onOpenRefer: () => void }) {
  return (
    <div className="space-y-3 px-4 py-4">
      <section className="relative overflow-hidden rounded-[20px] bg-[#6754d6] px-4 py-5 text-white shadow-sm">
        <div className="absolute -right-10 -top-8 h-40 w-40 rounded-full bg-white/20" />
        <div className="relative">
          <span className="rounded-full bg-[#f6c400] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#1c1740]">
            Upcoming Event
          </span>
          <h2 className="mt-3 text-lg font-black">New activities coming soon</h2>
          <p className="mt-2 text-xs font-black text-white/80">Watch this space for community events</p>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#292444]">Konnect Points</h2>
          <button className="flex items-center gap-1 text-xs font-black text-[#5f4bd2]" type="button">
            Redeem <ChevronRight size={16} />
          </button>
        </div>
        <div className="relative overflow-hidden rounded-[20px] bg-[#4d39b6] p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#f6c400] text-2xl font-black text-[#2a2451]">6</div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black">dk&apos;s Balance</h3>
              <p className="mt-1.5 text-xs font-bold text-white/70">404 pts to next tier</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/20">
                <div className="h-full w-[28%] rounded-full bg-[#f6c400]" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-center">
              <p className="text-[10px] font-black uppercase text-white/50">Cash Value</p>
              <p className="mt-1 text-base font-black text-[#f6c400]">₹1</p>
            </div>
          </div>
        </div>
      </section>

      <ActionCard tone="gold" icon={<Gift size={24} />} title="Refer to Earn Points!" body="Invite a family - both earn bonus points" onClick={onOpenRefer} />
      <ActionCard tone="purple" icon={<Download size={25} />} title="Install Konnectly App" body="Add to your home screen for one-tap access & alerts" />

      <section>
        <h2 className="mb-2 text-sm font-black text-[#292444]">Redeem Rewards</h2>
        <div className="grid grid-cols-2 gap-3">
          {rewards.map((reward) => (
            <div key={reward.brand} className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-[#e9e4fb]">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#fff5d9] text-[#c99000]">
                <Gift size={28} />
              </div>
              <h3 className="mt-3 text-sm font-black text-[#292444]">{reward.brand}</h3>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#eee7ff] px-3 py-1 text-xs font-black text-[#5f4bd2]">
                <Star size={14} /> {reward.points}
              </span>
              <button className="mt-3 w-full rounded-full bg-[#f2f0fb] py-2 text-xs font-black text-[#8d89a6]" type="button">
                Locked
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ActivitiesScreen({ onOpenPass }: { onOpenPass: () => void }) {
  const [tab, setTab] = useState("Upcoming");

  return (
    <div className="min-h-full px-4 py-4">
      <SegmentedTabs tabs={["Upcoming", "Past", "Registered"]} active={tab} onSelect={setTab} />
      {tab === "Upcoming" && (
        <div className="grid min-h-[380px] place-items-center text-center">
          <div>
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#eee7ff] text-[#5f4bd2]">
              <CalendarDays size={36} />
            </div>
            <p className="mt-4 text-sm font-black text-[#8d89a6]">No upcoming events. Check back soon!</p>
          </div>
        </div>
      )}
      {tab === "Past" && (
        <div className="mt-4 space-y-4">
          {pastActivities.map((activity) => (
            <ActivityCard key={activity.title} activity={activity} kind="past" />
          ))}
        </div>
      )}
      {tab === "Registered" && (
        <div className="mt-4 space-y-4">
          {registeredActivities.map((activity) => (
            <ActivityCard key={activity.title} activity={activity} kind="registered" onClick={onOpenPass} />
          ))}
        </div>
      )}
    </div>
  );
}

function SegmentedTabs({ tabs, active, onSelect }: { tabs: string[]; active: string; onSelect: (tab: string) => void }) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onSelect(tab)}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-black shadow-sm ${
            active === tab ? "bg-[#5f4bd2] text-white shadow-[#5f4bd2]/25" : "bg-white text-[#8d89a6] ring-2 ring-[#e9e4fb]"
          }`}
          type="button"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function ActivityCard({
  activity,
  kind,
  onClick,
}: {
  activity: { title: string; date: string; place: string; category?: string; status?: string };
  kind: "past" | "registered";
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="block w-full overflow-hidden rounded-[20px] bg-white text-left shadow-sm ring-1 ring-[#e9e4fb] transition active:scale-[0.99]" type="button">
      <div className={`grid h-32 place-items-center ${kind === "past" ? "bg-[#969696]" : "bg-[#6754d6]"} text-white`}>
        {kind === "past" ? <History size={42} /> : <Grid2X2 size={42} />}
      </div>
      <div className="p-3.5">
        <h3 className="text-sm font-black text-[#292444]">{activity.title}</h3>
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-[#8d89a6]">
          <CalendarDays size={16} /> {activity.date}
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${kind === "past" ? "bg-[#ededed] text-[#8d89a6]" : "bg-green-100 text-green-700"}`}>
            {activity.category ?? activity.status}
          </span>
        </p>
        <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-[#8d89a6]">
          <MapPin size={16} /> {activity.place}
        </p>
      </div>
    </button>
  );
}

function EventPassScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-5 py-5">
      <div className="relative mx-auto max-w-[340px] overflow-hidden rounded-[24px] bg-white shadow-sm">
        <div className="bg-[#4432ad] px-5 py-4 text-center text-[#f6c400]">
          <span className="inline-grid h-8 w-8 place-items-center rounded-lg bg-[#f6c400] text-sm font-black text-[#1c1740]">K</span>
          <span className="ml-3 text-xs font-black uppercase tracking-[0.32em]">Official Konnectly Pass</span>
        </div>
        <div className="px-6 py-8 text-center">
          <div className="mx-auto grid h-52 w-52 place-items-center rounded-2xl border-2 border-[#e9e4fb] bg-white">
            <QrMock />
          </div>
          <h2 className="mt-8 text-2xl font-black text-[#292444]">dk</h2>
          <p className="mt-3 text-sm font-black tracking-[0.2em] text-[#c99000]">KK-AV-25-0015</p>
          <div className="mx-auto mt-6 w-4/5 border-t-2 border-dashed border-[#e9e4fb]" />
          <h3 className="mt-6 text-base font-black text-[#292444]">Test Event</h3>
          <p className="mt-2 text-sm font-bold text-[#8d89a6]">Thu, Apr 30 2026 · Delhi</p>
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

function QrMock() {
  const cells = [
    "1111111001001111111",
    "1000001011011000001",
    "1011101000111011101",
    "1011101110101011101",
    "1011101011101011101",
    "1000001010101000001",
    "1111111010101111111",
    "0000000011100000000",
    "1110101110010111011",
    "0101110011110100101",
    "1100101100101110110",
    "0011110111010011101",
    "1110011000111010011",
    "0000000010111000100",
    "1111111011101010111",
    "1000001010011010001",
    "1011101011111111101",
    "1011101010001010100",
    "1111111011011110111",
  ];

  return (
    <div className="grid h-44 w-44 grid-cols-[repeat(19,minmax(0,1fr))] grid-rows-[repeat(19,minmax(0,1fr))] gap-0.5">
      {cells.join("").split("").map((cell, index) => (
        <span key={index} className={cell === "1" ? "bg-[#4432ad]" : "bg-white"} />
      ))}
    </div>
  );
}

function UpdatesScreen() {
  return (
    <div className="space-y-3 px-4 py-4">
      {updates.map((update, index) => (
        <div key={`${update.title}-${index}`} className={`rounded-[18px] bg-white p-4 shadow-sm ring-1 ${index === 1 ? "ring-2 ring-[#7765dd]" : "ring-[#e9e4fb]"}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#eee7ff] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#5f4bd2]">
              Announcement
            </span>
            <span className="shrink-0 text-xs font-bold text-[#8d89a6]">{update.date}</span>
          </div>
          <h3 className="mt-3 text-sm font-black text-[#292444]">{update.title}</h3>
          <p className="mt-2 text-xs font-bold text-[#8d89a6]">{update.body}</p>
        </div>
      ))}
    </div>
  );
}

function AccountScreen() {
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-[20px] bg-white p-5 text-center shadow-sm ring-1 ring-[#e9e4fb]">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-[#f6c400] bg-[#6754d6] text-3xl font-black text-white">
          K
        </div>
        <h2 className="mt-4 text-lg font-black text-[#292444]">kk</h2>
        <p className="mt-1.5 text-xs font-bold text-[#8d89a6]">diviniti@politicsforimpact.com</p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <AccountTile icon={<Shield size={17} />} label="Account" value="kk" tone="purple" />
          <AccountTile icon={<Users size={17} />} label="Kids" value="9 Profiles" tone="purple" />
          <AccountTile icon={<User size={17} />} label="Mobile" value="9811297908" tone="gold" />
          <AccountTile icon={<MapPin size={17} />} label="City" value="New Delhi" tone="gold" />
        </div>

        <div className="mx-auto mt-4 w-fit rounded-full bg-[#5f4bd2] px-5 py-2 text-xs font-black tracking-[0.22em] text-[#f6c400]">
          KP-KON-8C26
        </div>
        <p className="mt-3 text-xs font-black text-[#8d89a6]">Your KonnektCode - share to refer families</p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-black text-[#292444]">Kids Profiles</h2>
        <div className="space-y-3">
          {kidsProfiles.map((kid, index) => (
            <KidProfileRow key={`${kid.name}-${index}`} kid={kid} />
          ))}
        </div>
      </section>
    </div>
  );
}

function KidProfileRow({ kid }: { kid: (typeof kidsProfiles)[number] }) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-sm ring-1 transition active:scale-[0.99] ${
        kid.active ? "ring-2 ring-[#e6b800]" : "ring-[#e9e4fb]"
      }`}
      type="button"
    >
      {kid.image ? (
        <Image src={kid.image} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eee7ff] text-lg font-black text-[#5f4bd2]">{kid.initials}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black text-[#292444]">
          {kid.name}
          {kid.active && <span className="ml-2 text-xs font-black uppercase tracking-[0.14em] text-[#c99000]">· Active</span>}
        </span>
        {kid.subtitle && <span className="mt-1 block text-xs font-bold text-[#8d89a6]">{kid.subtitle}</span>}
      </span>
      <span className="rounded-full bg-[#eee7ff] px-3 py-1 text-xs font-black text-[#5f4bd2]">{kid.age}</span>
    </button>
  );
}

function AccountTile({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "purple" | "gold" }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone === "purple" ? "border-[#eee7ff] bg-[#eee7ff]" : "border-[#efd071] bg-[#fff8df]"}`}>
      <p className={`flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-[0.12em] ${tone === "purple" ? "text-[#5f4bd2]" : "text-[#c99000]"}`}>
        {icon} {label}
      </p>
      <p className="mt-2 text-sm font-black text-[#292444]">{value}</p>
    </div>
  );
}

function ReferBottomSheet({ onClose }: { onClose: () => void }) {
  const referCode = "KP-KON-8C26";
  const referText = `Hi! I'm kk, a proud Konnectly member! Join us and use my KonnektKode ${referCode} to earn your initial bonus points: https://konnectly.org/index.php?view=register&ref=${referCode}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(referText)}`;

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-[#161332]/55 backdrop-blur-sm">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close referral sheet" onClick={onClose} />
      <div className="relative w-full rounded-t-[32px] bg-white px-5 pb-7 pt-3 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-zinc-300" />
        <button onClick={onClose} className="absolute right-5 top-5 text-[#8d89a6]" type="button" aria-label="Close">
          <X size={20} />
        </button>

        <h2 className="text-xl font-black text-[#292444]">🎉 Refer & Earn Points!</h2>
        <p className="mt-2 text-sm font-bold text-[#8d89a6]">Share with a fellow parent or child&apos;s family</p>

        <div className="mt-5 rounded-[18px] border-2 border-[#e6b800] bg-[#fff8df] p-4 text-[#161332]">
          <p className="text-sm font-black">Hi! 👋 I&apos;m kk, a proud Konnectly member! 🌟</p>
          <p className="mt-5 text-sm font-black leading-relaxed">
            Konnectly is an amazing hyperlocal community platform for kids & parents - activities, rewards and more! 🎨 ⚽
          </p>
          <p className="mt-5 text-sm font-black leading-relaxed">Join us and use my KonnektKode to earn your initial bonus points:</p>
          <div className="mt-2 inline-block rounded-full bg-[#4d39b6] px-4 py-2 text-sm font-black tracking-[0.18em] text-[#f6c400]">{referCode}</div>
          <p className="mt-5 break-words text-xs font-black leading-relaxed text-[#8d89a6]">
            https://konnectly.org/index.php?view=register&ref=KP-KON-8C26
          </p>
          <p className="mt-5 text-sm font-black">Let&apos;s grow our community together! 💜</p>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex h-13 items-center justify-center gap-3 rounded-full bg-[#25d366] px-5 py-3 text-sm font-black text-white shadow-xl shadow-[#25d366]/30"
        >
          <WhatsAppIcon /> Share on WhatsApp
        </a>
      </div>
    </div>
  );
}

function ActionCard({ tone, icon, title, body, onClick }: { tone: "gold" | "purple"; icon: ReactNode; title: string; body: string; onClick?: () => void }) {
  const isGold = tone === "gold";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[20px] border-2 p-3.5 text-left ${
        isGold ? "border-[#e6b800] bg-[#fff6c9]" : "border-[#7765dd] bg-[#e9e3ff]"
      }`}
      type="button"
    >
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white ${isGold ? "text-[#c99000]" : "text-[#5f4bd2]"}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-black ${isGold ? "text-[#c99000]" : "text-[#5f4bd2]"}`}>{title}</span>
        <span className="mt-1 block text-xs font-bold text-[#8d89a6]">{body}</span>
      </span>
      <ChevronRight className={isGold ? "text-[#c99000]" : "text-[#5f4bd2]"} />
    </button>
  );
}

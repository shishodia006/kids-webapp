"use client";

import {
  BarChart3,
  Camera,
  Check,
  ChevronDown,
  CirclePlus,
  Download,
  Grid2X2,
  Link,
  List,
  LogOut,
  Search,
  Settings,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { AdminBrand, AdminData, AdminEvent, AdminKid, AdminMember, AdminParticipant, AdminRedemption } from "@/lib/admin-data";

const ADMIN_FONT_STYLE = { fontFamily: "'Nunito', sans-serif" };

type Section = "Memberships" | "Activities" | "Promotions & Updates" | "Business" | "Referral Dashboard";

const navItems: { section: Section | "Analytics" | "Settings"; icon: ReactNode; count?: number; group: "main" | "system" }[] = [
  { section: "Memberships", icon: "👥", count: 4, group: "main" },
  { section: "Activities", icon: "🎯", group: "main" },
  { section: "Promotions & Updates", icon: "📣", group: "main" },
  { section: "Business", icon: "🏢", group: "main" },
  { section: "Referral Dashboard", icon: <Link size={22} />, group: "main" },
  { section: "Analytics", icon: <BarChart3 size={22} />, group: "system" },
  { section: "Settings", icon: <Settings size={22} />, group: "system" },
];

const members = [
  {
    initials: "R",
    family: "Rohit & Sunita Sharma",
    father: "Rohit Sharma",
    mother: "Sunita Sharma",
    fatherPhone: "+91 98765 43210",
    motherPhone: "+91 98123 45678",
    address: "A-204, Vatika City, DLF Phase 2, Gurugram - 122002",
    plan: "Gold Plan",
    code: "KK-7X92M",
    active: true,
  },
  {
    initials: "A",
    family: "Amit & Neha Kapoor",
    father: "Amit Kapoor",
    mother: "Neha Kapoor",
    fatherPhone: "+91 99887 77665",
    motherPhone: "+91 88776 66554",
    address: "Sector 50, Gurugram - 122018",
    plan: "Silver Plan",
    code: "KK-2V71P",
    active: true,
  },
];

const pendingApprovals = [
  {
    initials: "A",
    name: "Arjun Kapoor",
    age: "8 years",
    grade: "Grade 3",
    dob: "12 Mar 2018",
    school: "DPS RK Puram",
    schoolId: "SCH-0234",
    parent: "Anita Kapoor",
    phone: "+91 95432 10987",
    locality: "DLF Phase 3",
    requested: "Requested 2h ago",
  },
  {
    initials: "M",
    name: "Meera Kapoor",
    age: "6 years",
    grade: "Grade 1",
    dob: "04 Aug 2020",
    school: "DPS RK Puram",
    schoolId: "SCH-0235",
    parent: "Anita Kapoor",
    phone: "+91 95432 10987",
    locality: "DLF Phase 3",
    requested: "Requested 2h ago",
  },
  {
    initials: "D",
    name: "Dev Reddy",
    age: "12 years",
    grade: "Grade 7",
    dob: "21 Jan 2014",
    school: "Lotus Valley School",
    schoolId: "SCH-1048",
    parent: "Suresh Reddy",
    phone: "+91 91234 56789",
    locality: "Sector 48",
    requested: "Requested 5h ago",
  },
  {
    initials: "T",
    name: "Tara Mehta",
    age: "9 years",
    grade: "Grade 4",
    dob: "18 Sep 2017",
    school: "Amity International",
    schoolId: "SCH-0871",
    parent: "Richa Mehta",
    phone: "+91 90012 33445",
    locality: "Sohna Road",
    requested: "Requested 1d ago",
  },
];

const liveParticipants = [
  {
    participant: "Aarav Sharma",
    parent: "Rohit Sharma",
    phone: "+91 98765 43210",
    paid: true,
    checkIn: "Not yet",
    points: "-",
  },
  {
    participant: "Kavya Gupta",
    parent: "Neha Gupta",
    phone: "+91 87654 32109",
    paid: true,
    checkIn: "09:14 AM",
    points: "80",
  },
  {
    participant: "Rohan Malhotra",
    parent: "Vikram Malhotra",
    phone: "+91 76543 21098",
    paid: true,
    checkIn: "09:22 AM",
    points: "80",
  },
];

const voucherRedemptions = [
  {
    voucher: "CCD-20%-V4X",
    member: "Rohit Sharma",
    brand: "Cafe Coffee Day",
    date: "28 Apr 2026",
  },
];

const topReferrers = [
  ["1", "Vikram Malhotra", "KK-2V71P - Sector 50", "600 pts earned", "12"],
  ["2", "Rohit Sharma", "KK-7X92M - DLF Phase 2", "400 pts earned", "8"],
  ["3", "Anita Verma", "KK-9K18A - Ashok Vihar", "300 pts earned", "6"],
];

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>("Memberships");
  const [comingSoon, setComingSoon] = useState<"Analytics" | "Settings" | null>(null);
  const [referralSettingsOpen, setReferralSettingsOpen] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [status, setStatus] = useState("Loading admin data...");

  useEffect(() => {
    loadData();
  }, []);

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

  function selectNav(section: (typeof navItems)[number]["section"]) {
    if (section === "Analytics" || section === "Settings") {
      setComingSoon(section);
      return;
    }

    setActiveSection(section);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f3ff] text-sm text-[#161332]" style={ADMIN_FONT_STYLE}>
      <div className="min-h-screen lg:block">
        <aside className="z-[200] flex overflow-hidden bg-gradient-to-b from-[#37278f] to-[#523fc0] text-white shadow-[4px_0_24px_rgba(61,50,168,0.25)] lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-[240px] lg:flex-col">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 p-3">
            <div className="rounded-2xl bg-white px-3 py-2 text-lg font-black text-[#4633a8] shadow-sm">
              Ko<span className="text-[#f8c400]">nn</span>ectly
            </div>
            <span className="rounded-full border border-[#f8c400] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#f8c400]">
              Admin
            </span>
          </div>

          <nav className="flex flex-1 gap-3 overflow-x-auto p-3 lg:grid lg:content-start lg:gap-3 lg:overflow-hidden">
            <NavGroup
              title="Main"
              items={navItems.filter((item) => item.group === "main")}
              activeSection={activeSection}
              onSelect={selectNav}
            />
            <NavGroup
              title="System"
              items={navItems.filter((item) => item.group === "system")}
              activeSection={activeSection}
              onSelect={selectNav}
            />
          </nav>

          <div className="mt-auto hidden shrink-0 border-t border-white/10 p-3 lg:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f8c400] text-sm font-black text-[#25166f]">
                A
              </div>
              <div>
                <p className="text-xs font-black">Admin User</p>
                <p className="text-xs font-bold text-white/60">Super Admin</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/admin-login";
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15"
              type="button"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0 lg:ml-[240px]">
          <DashboardHeader section={activeSection} onReferralSettings={() => setReferralSettingsOpen(true)} />
          <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:pt-[98px]">
            {status && <Panel><p className="font-black text-[#5b45d1]">{status}</p></Panel>}
            {data && activeSection === "Memberships" && <Memberships data={data} onRefresh={loadData} />}
            {data && activeSection === "Activities" && <Activities data={data} onRefresh={loadData} />}
            {data && activeSection === "Promotions & Updates" && <Promotions data={data} onRefresh={loadData} />}
            {data && activeSection === "Business" && <Business data={data} onRefresh={loadData} />}
            {data && activeSection === "Referral Dashboard" && <ReferralDashboard data={data} />}
          </div>
        </section>
      </div>

      {comingSoon && <ComingSoonModal title={comingSoon} onClose={() => setComingSoon(null)} />}
      {referralSettingsOpen && <ReferralSettingsModal onClose={() => setReferralSettingsOpen(false)} />}
    </main>
  );
}

function DashboardHeader({ section, onReferralSettings }: { section: Section; onReferralSettings: () => void }) {
  const copy: Record<Section, string> = {
    Memberships: "Manage member profiles and approvals",
    Activities: "Manage events, participants and live tracking",
    "Promotions & Updates": "Manage hero slides, live updates and add-on promotions",
    Business: "Manage partner brands and vouchers",
    "Referral Dashboard": "Track who's referring whom and reward top referrers",
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-[#e7e1fb] bg-white px-4 py-3 shadow-sm sm:px-6 lg:fixed lg:left-[240px] lg:right-0 lg:top-0 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">{section}</h1>
          <p className="mt-1 text-xs font-semibold text-[#8f8ba6] sm:text-sm">{copy[section]}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(section === "Memberships" || section === "Referral Dashboard") && <PillButton icon={<Download size={17} />} label="Export" muted />}
          {section === "Business" && <PillButton icon={<CirclePlus size={18} />} label="Add Brand" />}
          {section === "Referral Dashboard" && <PillButton icon={<Settings size={18} />} label="Referral Settings" onClick={onReferralSettings} />}
        </div>
      </div>
    </header>
  );
}

function Memberships({ data, onRefresh }: { data: AdminData; onRefresh: () => Promise<void> }) {
  const [membershipTab, setMembershipTab] = useState(0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Parent Members" value={String(data.stats.parents)} note="Live from database" tone="dark" />
        <StatCard title="Kids Members" value={String(data.stats.kids)} note="Live from database" tone="purple" />
        <StatCard title="Pending Approvals" value={String(data.stats.pendingKids)} note="Kid profiles awaiting" tone="amber" />
        <StatCard title="Active Memberships" value={String(data.stats.activeKids)} note="Approved kids" tone="dark" />
      </div>

      <SegmentedTabs
        tabs={["Active Memberships", "Pending Approvals"]}
        activeIndex={membershipTab}
        badge={`${data.pendingKids.length}`}
        onSelect={setMembershipTab}
      />

      {membershipTab === 0 ? (
        <>
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,0.75fr))_auto]">
            <SearchBox placeholder="Search by name, phone, Konnect code" />
            {["All Ages", "All Schools", "All Localities", "All Points"].map((item) => (
              <SelectButton key={item} label={item} />
            ))}
            <div className="flex gap-2">
              <IconToggle active icon={<Grid2X2 size={20} />} />
              <IconToggle icon={<List size={22} />} />
            </div>
          </div>

          <div className="space-y-4">
            {data.members.length === 0 && <Panel><p className="font-black text-[#8f8ba6]">No parent members yet.</p></Panel>}
            {data.members.map((member) => (
              <MemberCard key={member.code} member={member} />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-[#e6b800] bg-[#fff6c9] px-5 py-4 text-sm font-black text-[#c98b00]">
            Warning: Parent profiles are auto-approved. Kid profiles require manual approval. Tap any card to view full profile and take action.
          </div>
          <PendingApprovals profiles={data.pendingKids} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  );
}

function PendingApprovals({ profiles, onRefresh }: { profiles: AdminKid[]; onRefresh: () => Promise<void> }) {
  const [openId, setOpenId] = useState(profiles[0]?.name ?? "");
  const [statusByName, setStatusByName] = useState<Record<string, "pending" | "approved" | "rejected">>({});

  async function updateStatus(profile: AdminKid, status: "approved" | "rejected") {
    await postJson("/api/admin/kids/status", { kidId: profile.id, status });
    setStatusByName((current) => ({ ...current, [profile.name]: status }));
    await onRefresh();
  }

  return (
    <div className="space-y-4">
      {profiles.length === 0 && <Panel><p className="font-black text-[#8f8ba6]">No pending approvals.</p></Panel>}
      {profiles.map((profile) => (
        <PendingApprovalCard
          key={profile.name}
          profile={profile}
          isOpen={openId === profile.name}
          status={statusByName[profile.name] ?? "pending"}
          onToggle={() => setOpenId((current) => (current === profile.name ? "" : profile.name))}
          onApprove={() => updateStatus(profile, "approved")}
          onReject={() => updateStatus(profile, "rejected")}
        />
      ))}
    </div>
  );
}

function PendingApprovalCard({
  profile,
  isOpen,
  status,
  onToggle,
  onApprove,
  onReject,
}: {
  profile: AdminKid;
  isOpen: boolean;
  status: "pending" | "approved" | "rejected";
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const statusStyles = {
    pending: "bg-[#fff0c2] text-[#e28a00]",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
  };

  return (
    <div className="overflow-hidden rounded-[20px] border-2 border-[#ff9800] bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 bg-[#fff7d7] px-5 py-4 text-left transition hover:bg-[#fff1bd]"
        type="button"
      >
        <Avatar label={profile.initials} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black">{profile.name}</h3>
          <p className="mt-1 text-xs font-semibold text-[#8f8ba6]">
            Age {profile.age.replace(" years", "")} - {profile.grade} - Parent: {profile.parent} ({profile.phone})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-black capitalize ${statusStyles[status]}`}>⏳ {status}</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-black text-blue-700">{profile.locality}</span>
            <span className="text-xs font-semibold text-[#8f8ba6]">{profile.requested}</span>
          </div>
        </div>
        <span className="text-xl font-black text-[#ff9800]">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[150px_1fr]">
            <button className="grid min-h-32 place-items-center rounded-2xl border-2 border-[#ddd6fb] bg-[#f3efff] text-center text-xs font-black text-[#8f8ba6]" type="button">
              <span>
                <span className="block text-3xl">👦</span>
                View Photo
              </span>
            </button>

            <div className="grid gap-3 md:grid-cols-2">
              <InfoTile label="Full Name" value={profile.name} />
              <InfoTile label="Date of Birth" value={profile.dob} />
              <InfoTile label="Age" value={profile.age} />
              <InfoTile label="Grade" value={profile.grade} />
              <InfoTile label="School Name" value={profile.school} />
              <InfoTile label="School ID" value={profile.schoolId} />
              <InfoTile label="Parent" value={profile.parent} />
              <InfoTile label="WhatsApp" value={profile.phone} green />
            </div>
          </div>

          <label className="grid gap-2 rounded-2xl bg-[#f5f2ff] p-4">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f8ba6]">Add Comment (will be sent via WhatsApp)</span>
            <textarea
              className="min-h-20 rounded-xl border border-[#ddd6fb] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#604bd1]"
              placeholder="Add a note for the parent - this will be sent as a WhatsApp message when you approve or reject..."
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={onApprove} className="rounded-full bg-green-500 px-5 py-2.5 text-xs font-black text-white transition hover:bg-green-600" type="button">
              ✓ Approve Profile
            </button>
            <button onClick={onReject} className="rounded-full bg-red-500 px-5 py-2.5 text-xs font-black text-white transition hover:bg-red-600" type="button">
              × Reject
            </button>
            <span className="text-xs font-bold text-[#8f8ba6]">WhatsApp message will be sent automatically</span>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTile({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-2xl bg-[#f5f2ff] px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8f8ba6]">{label}</p>
      <p className={`mt-1 text-sm font-black ${green ? "text-green-600" : "text-[#161332]"}`}>{value}</p>
    </div>
  );
}

function Activities({ data, onRefresh }: { data: AdminData; onRefresh: () => Promise<void> }) {
  const [activityTab, setActivityTab] = useState(0);

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postJson("/api/admin/events", Object.fromEntries(form.entries()));
    event.currentTarget.reset();
    await onRefresh();
  }

  return (
    <div className="space-y-5">
      <SegmentedTabs tabs={["Add / Edit Event", "Live Event Status"]} activeIndex={activityTab} onSelect={setActivityTab} />
      {activityTab === 0 ? (
        <>
          <h2 className="text-lg font-black sm:text-xl">Create New Activity</h2>
          <Panel>
          <form onSubmit={saveEvent}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field name="title" label="Activity Name *" placeholder="e.g. Summer Art Camp 2026" required />
              <Field name="venue" label="Venue *" placeholder="e.g. DLF Phase 2, Community Hall" required />
              <Field name="date" label="Date *" type="date" required />
              <Field name="time" label="Time" type="time" />
              <Field name="price" label="Registration Fee (Rs)" placeholder="0 for free" type="number" min={0} />
              <Field name="points" label="Konnect Points Earned" placeholder="e.g. 50" type="number" min={0} />
              <Field name="capacity" label="Max Participants" placeholder="Leave blank for unlimited" type="number" min={0} />
              <SelectField name="category" label="Category" value="Arts & Crafts" />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <PillButton label="Save Activity" submit />
              <PillButton label="Preview" muted />
            </div>
          </form>
          </Panel>
          <div className="grid gap-4 xl:grid-cols-2">
            {data.events.map((item) => (
              <Panel key={item.id}>
                <h3 className="text-base font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-bold text-[#8f8ba6]">{item.date} - {item.venue}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="soft">{item.category}</Badge>
                  <Badge tone="gold">Rs {item.price}</Badge>
                </div>
              </Panel>
            ))}
          </div>
        </>
      ) : (
        <LiveEventStatus data={data} />
      )}
    </div>
  );
}

function LiveEventStatus({ data }: { data: AdminData }) {
  const liveTitle = data.events[0] ? `${data.events[0].title} - ${data.events[0].date}` : "No event selected";
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <h2 className="text-lg font-black sm:text-xl">Live Event Status</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="flex h-11 items-center justify-between gap-4 rounded-2xl border border-[#e7e1fb] bg-white px-5 text-sm font-black shadow-sm"
            type="button"
          >
            {liveTitle} <ChevronDown size={17} />
          </button>
          <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-xs font-black text-green-700">● Live</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Registered" value={String(data.stats.registered)} note="" tone="dark" />
        <StatCard title="Checked In" value={String(data.stats.checkedIn)} note="" tone="purple" />
        <StatCard title="Payment Status" value={`${data.stats.paidBookings}/${data.stats.registered}`} note="paid bookings" tone="amber" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <SearchBox placeholder="Search participant..." />
        <button
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#604bd1] px-6 text-xs font-black text-white shadow-xl shadow-[#604bd1]/25 transition hover:bg-[#503bc1]"
          type="button"
        >
          <Camera size={16} /> Scan QR Check-in
        </button>
      </div>

      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#e7e1fb] bg-[#f5f2ff] text-xs uppercase tracking-[0.18em] text-[#8f8ba6]">
              {["#", "Participant", "Parent", "Phone", "Payment", "Check-in", "Points"].map((head) => (
                <th key={head} className="px-5 py-4 font-black">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.liveParticipants.map((participant, index) => (
              <tr key={participant.participant} className="border-b border-[#eee9fb] last:border-b-0">
                <td className="px-5 py-4 font-black">{index + 1}</td>
                <td className="px-5 py-4 font-black">{participant.participant}</td>
                <td className="px-5 py-4 font-bold">{participant.parent}</td>
                <td className="px-5 py-4 font-bold">{participant.phone}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">Paid</span>
                </td>
                <td className="px-5 py-4">
                  {participant.checkIn === "Not yet" ? (
                    <span className="rounded-full bg-[#fff0c2] px-3 py-1 text-xs font-black text-[#e28a00]">Not yet</span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">✓ {participant.checkIn}</span>
                  )}
                </td>
                <td className="px-5 py-4 font-black">{participant.points === "-" ? "-" : `🌟 ${participant.points}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Promotions({ data, onRefresh }: { data: AdminData; onRefresh: () => Promise<void> }) {
  const [promoTab, setPromoTab] = useState(0);
  const [modal, setModal] = useState<"post-update" | "add-promotion" | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedTabs tabs={["Hero Slides", "Updates & Push", "Add-on Promos"]} activeIndex={promoTab} onSelect={setPromoTab} />
        {promoTab === 0 && <PillButton icon={<CirclePlus size={18} />} label="Add New Slide" />}
        {promoTab === 1 && <PillButton icon={<CirclePlus size={18} />} label="Post Update" onClick={() => setModal("post-update")} />}
        {promoTab === 2 && <PillButton icon={<CirclePlus size={18} />} label="Add Promotion" onClick={() => setModal("add-promotion")} />}
      </div>

      {promoTab === 0 && (
        <>
          <h2 className="text-lg font-black sm:text-xl">Hero Slides</h2>
          <div className="grid gap-4 xl:grid-cols-3">
            <PromoCard color="bg-[#4d39b6]" title="Summer Art Camp 2026" body="Join us for a fun-filled week of art and creativity. Ages 6-14." badge="Slide 1" />
            <PromoCard color="bg-[#ddb000]" title="Weekend Points Bonanza" body="Participate in any activity and earn double Konnect Points!" badge="Slide 2" />
            <button
              className="grid min-h-[260px] place-items-center rounded-[24px] border-2 border-dashed border-[#ddd6fb] bg-white/30 p-6 text-[#5f4bd2] transition hover:border-[#6a55d9] hover:bg-white"
              type="button"
            >
              <span className="text-center">
                <CirclePlus className="mx-auto mb-5" size={54} />
                <span className="text-base font-black">Add New Slide</span>
              </span>
            </button>
          </div>
        </>
      )}

      {promoTab === 1 && <UpdatesPush data={data} />}
      {promoTab === 2 && <AddonPromos />}
      {modal === "post-update" && <PostUpdateModal onClose={() => setModal(null)} onRefresh={onRefresh} />}
      {modal === "add-promotion" && <AddPromotionModal onClose={() => setModal(null)} onRefresh={onRefresh} />}
    </div>
  );
}

function UpdatesPush({ data }: { data: AdminData }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-black sm:text-xl">Live Updates & Push Notifications</h2>
      {data.notifications.map((item) => (
        <Panel key={item.id} className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f0ebff] text-xs font-black text-[#5b45d1]">Push</div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black">{item.title}</h3>
              <p className="mt-1 text-sm font-semibold text-[#8f8ba6]">{item.message}</p>
              <p className="mt-3 text-xs font-bold text-[#8f8ba6]">{item.createdAt} - visible in member app</p>
            </div>
            <div className="flex shrink-0 flex-row gap-2 lg:flex-col lg:items-end">
              <Badge tone="green">Live</Badge>
            </div>
          </div>
        </Panel>
      ))}
      <Panel className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f0ebff] text-2xl">🎉</div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black">Summer Art Camp registration closing soon!</h3>
            <p className="mt-1 text-sm font-semibold text-[#8f8ba6]">Only 6 spots remaining for Summer Art Camp 2026.</p>
            <p className="mt-3 text-xs font-bold text-[#8f8ba6]">🗓️ 28 Apr 2026 · 📲 Sent to 128 members</p>
          </div>
          <div className="flex shrink-0 flex-row gap-2 lg:flex-col lg:items-end">
            <Badge tone="green">Live</Badge>
            <SmallButton label="Edit" />
            <SmallButton label="Remove" danger />
          </div>
        </div>
      </Panel>
    </div>
  );
}

function AddonPromos() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-black sm:text-xl">Add-on Promotions</h2>
      <div className="rounded-[20px] border-2 border-[#e6b800] bg-[#fff6c9] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[#604bd1] text-3xl">☕</div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black">Cafe Coffee Day - Special Offer</h3>
            <p className="mt-1 text-sm font-semibold text-[#8f8ba6]">Get 20% off on all beverages when you show your Konnectly membership card.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge tone="green">Active</Badge>
            <SmallButton label="Edit" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PostUpdateModal({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postJson("/api/admin/notifications", { message: form.get("message"), type: form.get("type") });
    await onRefresh();
    onClose();
  }

  return (
    <AdminFormModal title="Post Update" icon="📡" onClose={onClose} primaryLabel="Post Update" onSubmit={submit}>
      <Field name="title" label="Title *" placeholder="e.g. Registration closing soon!" />
      <ModalTextarea name="message" label="Message *" placeholder="Write your update..." />
      <SelectField name="type" label="Type" value="announcement" />
      <label className="flex items-center gap-3 rounded-2xl bg-[#eee7ff] px-4 py-3 text-sm font-black text-[#5b45d1]">
        <input className="h-5 w-5 accent-[#604bd1]" type="checkbox" defaultChecked />
        Send as Push Notification to all 128 members
      </label>
    </AdminFormModal>
  );
}

function AddPromotionModal({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postJson("/api/admin/brands", { name: form.get("name"), note: form.get("note"), description: form.get("description"), pointsCost: form.get("pointsCost") });
    await onRefresh();
    onClose();
  }

  return (
    <AdminFormModal title="Add Promotion" icon="🎯" onClose={onClose} primaryLabel="Publish" onSubmit={submit}>
      <Field name="name" label="Brand Name *" placeholder="e.g. Domino's Pizza" />
      <Field name="note" label="Promotion Title *" placeholder="e.g. Weekend Deal" />
      <Field name="pointsCost" label="Points Cost" placeholder="250" type="number" />
      <ModalTextarea name="description" label="Description *" placeholder="Describe the offer..." />
    </AdminFormModal>
  );
}

function AdminFormModal({
  title,
  icon,
  children,
  onClose,
  primaryLabel,
  onSubmit,
}: {
  title: string;
  icon: string;
  children: ReactNode;
  onClose: () => void;
  primaryLabel: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-[#161332]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl" onSubmit={onSubmit ?? ((event) => event.preventDefault())}>
        <div className="flex items-center justify-between border-b border-[#e7e1fb] px-6 py-5">
          <h2 className="flex items-center gap-3 text-xl font-black"><span>{icon}</span>{title}</h2>
          <button
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-[#f6f3ff] text-[#8f8ba6] transition hover:bg-[#e7ddff] hover:text-[#5b45d1]"
            type="button"
            aria-label="Close popup"
          >
            <X size={22} />
          </button>
        </div>
        <div className="grid gap-4 px-6 py-6">{children}</div>
        <div className="flex justify-end gap-3 border-t border-[#e7e1fb] px-6 py-5">
          <button onClick={onClose} className="rounded-full border-2 border-[#e7e1fb] px-6 py-3 text-sm font-black text-[#5b45d1]" type="button">
            Cancel
          </button>
          <button className="rounded-full bg-[#604bd1] px-7 py-3 text-sm font-black text-white shadow-xl shadow-[#604bd1]/25" type={onSubmit ? "submit" : "button"} onClick={onSubmit ? undefined : onClose}>
            {primaryLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModalTextarea({ label, placeholder, name }: { label: string; placeholder: string; name?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black">{label}</span>
      <textarea name={name} className="min-h-28 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#604bd1]" placeholder={placeholder} />
    </label>
  );
}

function Business({ data, onRefresh }: { data: AdminData; onRefresh: () => Promise<void> }) {
  const [businessTab, setBusinessTab] = useState(0);
  const [revoked, setRevoked] = useState<Record<string, boolean>>({});

  async function revoke(voucher: AdminRedemption) {
    await postJson("/api/admin/redemptions/status", { redemptionId: voucher.id, status: "cancelled" });
    setRevoked((current) => ({ ...current, [voucher.voucher]: true }));
    await onRefresh();
  }

  return (
    <div className="space-y-5">
      <SegmentedTabs tabs={["Brands", "Voucher Redemptions"]} activeIndex={businessTab} onSelect={setBusinessTab} />
      {businessTab === 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.brands.map((brand) => (
            <BrandCard key={brand.id} color={brand.color} icon={brand.icon} name={brand.name} email={brand.email} code={brand.code} />
          ))}
          <BrandCard color="bg-[#6754d6]" icon="☕" name="Cafe Coffee Day" email="partner@ccd.in" code="REF-CCD-2026" />
          <BrandCard color="bg-[#f4484d]" icon="🍕" name="Domino's Pizza" email="partner@dominos.in" code="REF-DOM-2026" />
        </div>
      ) : (
        <Panel className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#ddd6fb] bg-[#f5f2ff] text-xs uppercase tracking-[0.22em] text-[#8f8ba6]">
                {["Voucher", "Member", "Brand", "Date", "Status", "Actions"].map((head) => (
                  <th key={head} className="px-5 py-4 font-black">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.redemptions.map((voucher) => {
                const isRevoked = revoked[voucher.voucher];
                return (
                  <tr key={voucher.voucher} className="border-b border-[#eee9fb] last:border-b-0">
                    <td className="px-5 py-5 font-black">{voucher.voucher}</td>
                    <td className="px-5 py-5 font-black">{voucher.member}</td>
                    <td className="px-5 py-5 font-bold">{voucher.brand}</td>
                    <td className="px-5 py-5 font-bold">{voucher.date}</td>
                    <td className="px-5 py-5">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${isRevoked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                        {isRevoked ? "Revoked" : "Redeemed"}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <button
                        onClick={() => revoke(voucher)}
                        className="rounded-full bg-red-500 px-5 py-2.5 text-xs font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        disabled={isRevoked}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

function ReferralDashboard({ data }: { data: AdminData }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Referrals" value={String(data.stats.totalReferrals)} note="Live referrals" icon={<Link size={24} />} />
        <MetricCard title="Conversions" value={String(data.stats.totalReferrals)} note="Joined members" icon={<Check size={24} />} green />
        <MetricCard title="Points Awarded" value={String(data.stats.referralPoints)} note="50 pts per referral" icon={<Target size={24} />} amber />
        <MetricCard title="Top Referrer" value={data.topReferrers[0]?.name || "-"} note={`${data.topReferrers[0]?.referrals || 0} referrals`} icon={<Trophy size={24} />} />
      </div>

      <div className="rounded-[22px] border-2 border-[#6754d6] bg-[#f0ebff] p-5">
        <div className="flex gap-4">
          <div className="text-2xl">💡</div>
          <div>
            <h2 className="text-lg font-black text-[#5b45d1]">How Referrals Work on Konnectly</h2>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-[#8f8ba6] sm:text-base">
              Each member has a unique Konnect Code. When a new family signs up using this code, both get 50 Konnect Points.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-7 xl:grid-cols-[1fr_1.05fr]">
        <div>
          <h2 className="mb-4 flex items-center gap-3 text-lg font-black"><Trophy className="text-[#d49b00]" /> Top Referrers</h2>
          <Panel className="overflow-hidden p-0">
            <div className="flex items-center justify-between bg-[#f0ebff] px-6 py-5">
              <p className="font-black">This Month</p>
              <span className="rounded-full bg-[#e7ddff] px-4 py-2 text-sm font-black text-[#5b45d1]">May 2026</span>
            </div>
            {data.topReferrers.map(({ rank, name, meta, points, referrals }) => (
              <div key={rank} className="grid gap-4 border-t border-[#e7e1fb] px-6 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f8c400] font-black text-white">{rank}</div>
                <div>
                  <p className="font-black">{name}</p>
                  <p className="text-sm font-semibold text-[#8f8ba6]">{meta}</p>
                  <p className="mt-2 text-sm font-black text-[#5b45d1]">{points}</p>
                </div>
                <p className="text-right text-2xl font-black text-[#5b45d1]">{referrals}<span className="block text-sm text-[#8f8ba6]">referrals</span></p>
              </div>
            ))}
          </Panel>
        </div>

        <div>
          <h2 className="mb-4 flex items-center gap-3 text-lg font-black">📋 Recent Referrals</h2>
          <Panel className="overflow-x-auto p-0">
            <div className="flex items-center justify-between bg-[#f0ebff] px-6 py-5">
              <p className="font-black">Last 30 days</p>
              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700">62 converted</span>
            </div>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-t border-[#e7e1fb] text-xs uppercase tracking-[0.2em] text-[#8f8ba6]">
                  {["Referred By", "New Member", "Date", "Status", "Pts Awarded"].map((head) => (
                    <th key={head} className="px-4 py-3">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentReferrals.map((referral) => (
                  <tr key={`${referral.code}-${referral.newMember}`} className="border-t border-[#e7e1fb]">
                    <td className="px-4 py-3"><span className="rounded-full bg-[#5b45d1] px-3 py-1 text-xs font-black text-white">{referral.code}</span></td>
                    <td className="px-4 py-3 font-black">{referral.newMember}</td>
                    <td className="px-4 py-3 font-bold">{referral.date}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">Joined</span></td>
                    <td className="px-4 py-3 font-black">+{referral.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
      </div>

      <ReferralNetwork />
    </div>
  );
}

function ReferralNetwork() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-3 text-lg font-black">🌐 Referral Network - Vikram Malhotra</h2>
        <button className="w-fit rounded-full border-2 border-[#ddd6fb] bg-white px-5 py-2 text-xs font-black text-[#5b45d1]" type="button">
          View Full Network
        </button>
      </div>

      <Panel className="overflow-x-auto p-0">
        <div className="flex min-w-[860px] items-center gap-3 border-b border-[#e7e1fb] bg-[#fff9e8] px-6 py-5">
          <h3 className="text-base font-black">KK-2V71P - Top Referrer Chain</h3>
          <span className="rounded-full bg-[#fff0c2] px-3 py-1 text-xs font-black text-[#c99000]">12 total referrals</span>
        </div>
        <div className="min-w-[860px] p-7">
          <div className="grid grid-cols-[190px_26px_240px_26px_240px] items-center gap-4">
            <div className="grid place-items-center">
              <div className="rounded-[20px] bg-[#6754d6] px-8 py-6 text-center text-white shadow-xl shadow-[#6754d6]/25">
                <p className="text-base font-black">Vikram M.</p>
                <p className="mt-2 text-sm font-bold text-white/75">KK-2V71P</p>
                <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-black">12 refs · 600 pts</span>
              </div>
              <div className="mt-3 h-8 w-px bg-[#ddd6fb]" />
              <p className="text-xs font-bold text-[#8f8ba6]">Invited</p>
            </div>

            <p className="text-2xl font-bold text-[#8f8ba6]">→</p>

            <div className="grid gap-3">
              <NetworkMiniCard name="Priya Agarwal" meta="KK-8P33A · 2 refs" status="Joined" />
              <NetworkMiniCard name="Deepak Singh" meta="KK-3D91S · 1 ref" status="Joined" />
              <div className="rounded-2xl border border-[#e7e1fb] bg-white px-5 py-4">
                <p className="font-black">+10 more</p>
                <button className="mt-1 text-xs font-black text-[#5b45d1]" type="button">View all →</button>
              </div>
            </div>

            <p className="text-2xl font-bold text-[#8f8ba6]">→</p>

            <div className="grid gap-3">
              <NetworkMiniCard dashed name="Manisha Jain" meta="via Priya A." status="Joined" />
              <NetworkMiniCard dashed name="Rajat Mehra" meta="via Deepak S." status="Pending" pending />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function NetworkMiniCard({
  name,
  meta,
  status,
  dashed,
  pending,
}: {
  name: string;
  meta: string;
  status: string;
  dashed?: boolean;
  pending?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-white px-5 py-4 ${dashed ? "border-2 border-dashed border-[#ddd6fb] bg-[#faf8ff]" : "border border-[#e7e1fb]"}`}>
      <p className="font-black">{name}</p>
      <p className="mt-1 text-xs font-bold text-[#8f8ba6]">{meta}</p>
      <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${pending ? "bg-[#fff0c2] text-[#e28a00]" : "bg-green-100 text-green-700"}`}>
        {status}
      </span>
    </div>
  );
}

function NavGroup({
  title,
  items,
  activeSection,
  onSelect,
}: {
  title: string;
  items: typeof navItems;
  activeSection: Section;
  onSelect: (section: (typeof navItems)[number]["section"]) => void;
}) {
  return (
    <div>
      <p className="mb-1 hidden px-2 text-[9px] font-black uppercase tracking-[0.24em] text-white/35 lg:block">{title}</p>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = item.section === activeSection;
          return (
            <button
              key={item.section}
              onClick={() => onSelect(item.section)}
              className={`relative flex min-w-fit items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-black transition lg:w-full ${
                active ? "bg-white/18 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
              type="button"
            >
              {active && <span className="absolute left-0 top-2 h-8 w-1 rounded-r-full bg-[#f8c400]" />}
              <span className="grid h-5 w-5 place-items-center text-base text-white/70">{item.icon}</span>
              <span className="truncate">{item.section}</span>
              {item.count && <span className="ml-auto rounded-full bg-[#f8c400] px-2.5 py-0.5 text-xs font-black text-[#25166f]">{item.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentedTabs({
  tabs,
  activeIndex,
  badge,
  onSelect,
}: {
  tabs: string[];
  activeIndex: number;
  badge?: string;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="flex w-full gap-2 overflow-x-auto rounded-[18px] border border-[#e7e1fb] bg-white p-1.5 shadow-sm sm:w-fit">
      {tabs.map((tab, index) => (
        <button
          key={tab}
          onClick={() => onSelect?.(index)}
          className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-black transition ${
            index === activeIndex ? "bg-[#604bd1] text-white shadow-lg shadow-[#604bd1]/20" : "text-[#8f8ba6] hover:bg-[#f6f3ff]"
          }`}
          type="button"
        >
          {index === 0 ? "✅" : index === 1 ? "⏳" : "🎯"} {tab}
          {badge && index === 1 && <span className="rounded-full bg-[#ff9d00] px-2 py-0.5 text-xs text-white">{badge}</span>}
        </button>
      ))}
    </div>
  );
}

function MemberCard({ member }: { member: (typeof members)[number] }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="relative bg-white px-4 py-4 sm:px-5">
        <span className="absolute right-6 top-6 h-4 w-4 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar label={member.initials} large />
          <div className="min-w-0">
            <h3 className="text-lg font-black sm:text-xl">{member.family}</h3>
            <p className="mt-2 text-xs font-semibold text-[#8f8ba6] sm:text-sm">📞 Rohit: {member.fatherPhone} - 📞 Sunita: {member.motherPhone}</p>
            <p className="mt-1 text-xs font-bold text-[#5b45d1] sm:text-sm">📍 {member.address}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Badge tone="gold">{member.plan}</Badge>
              <Badge tone="green">Active</Badge>
              <Badge tone="purple">🔑 {member.code}</Badge>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 border-t border-[#e7e1fb] bg-[#f0ebff] p-4 md:grid-cols-2">
        <ParentMini role="Father" name={member.father} phone={member.fatherPhone} initials={member.initials} />
        <ParentMini role="Mother" name={member.mother} phone={member.motherPhone} initials="S" pink />
      </div>
    </Panel>
  );
}

function PromoCard({ color, title, body, badge }: { color: string; title: string; body: string; badge: string }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className={`grid min-h-36 place-items-center ${color} px-5 text-center text-xl font-black leading-relaxed text-white`}>{title}</div>
      <div className="p-5">
        <h3 className="text-base font-black">{title}</h3>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-[#8f8ba6] sm:text-sm">{body}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Badge tone="green">Visible</Badge>
          <Badge tone="soft">{badge}</Badge>
        </div>
        <div className="mt-5 flex gap-3">
          <SmallButton label="Edit" />
          <SmallButton label="Remove" danger />
        </div>
      </div>
    </Panel>
  );
}

function BrandCard({ color, icon, name, email, code }: { color: string; icon: string; name: string; email: string; code: string }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className={`h-28 ${color}`} />
      <div className="relative p-5 pt-10">
        <div className="absolute -top-9 grid h-16 w-16 place-items-center rounded-2xl bg-white text-2xl shadow-lg">{icon}</div>
        <h3 className="text-lg font-black">{name}</h3>
        <p className="mt-2 text-xs font-semibold text-[#8f8ba6] sm:text-sm">{email}</p>
        <div className="mt-5"><Badge tone="soft">{code}</Badge></div>
        <div className="mt-5 flex gap-3">
          <SmallButton label="Edit" />
          <SmallButton label="Remove" danger />
        </div>
      </div>
    </Panel>
  );
}

function ReferralSettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <AdminFormModal title="Referral Settings" icon="⚙️" onClose={onClose} primaryLabel="Save Settings">
      <Field label="Points for Referrer (per successful referral)" type="number" defaultValue="50" />
      <Field label="Points for New Member (welcome bonus)" type="number" defaultValue="50" />
      <SettingsSelect label="Referral Code Format" value="KK-XXXXX (current)" />
      <SettingsSelect label="Referral Expiry" value="Never expires" />
    </AdminFormModal>
  );
}

function SettingsSelect({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black">{label}</span>
      <select className="h-11 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-2 text-sm font-bold outline-none transition focus:border-[#604bd1]" defaultValue={value}>
        <option>{value}</option>
        {label === "Referral Code Format" ? (
          <>
            <option>KK-YYYY-###</option>
            <option>KON-XXXXX</option>
          </>
        ) : (
          <>
            <option>30 days</option>
            <option>90 days</option>
            <option>1 year</option>
          </>
        )}
      </select>
    </label>
  );
}

function ComingSoonModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#161332]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-[#f6f3ff] text-[#5b45d1] transition hover:bg-[#e7ddff]"
          type="button"
          aria-label="Close popup"
        >
          <X size={20} />
        </button>
        <div className="mx-auto mt-2 grid h-20 w-20 place-items-center rounded-3xl bg-[#f0ebff] text-[#5b45d1]">
          {title === "Analytics" ? <BarChart3 size={38} /> : <Settings size={38} />}
        </div>
        <h2 className="mt-5 text-3xl font-black">{title}</h2>
        <p className="mt-3 text-base font-semibold leading-relaxed text-[#8f8ba6]">
          Coming soon. This section is being prepared for the next Konnectly admin update.
        </p>
        <button onClick={onClose} className="mt-6 w-full rounded-full bg-[#161332] py-4 font-black text-[#f8c400]" type="button">
          Got it
        </button>
      </div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-[#e7e1fb] bg-white p-4 shadow-sm shadow-[#d9d2f5]/50 ${className}`}>{children}</div>;
}

function StatCard({ title, value, note, tone }: { title: string; value: string; note: string; tone: "dark" | "purple" | "amber" }) {
  const colors = {
    dark: "text-[#1c173d]",
    purple: "text-[#604bd1]",
    amber: "text-[#ff9d00]",
  };
  return (
    <Panel>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8f8ba6]">{title}</p>
      <p className={`mt-2 text-2xl font-black ${colors[tone]}`}>{value}</p>
      <p className={`mt-1 text-xs font-bold ${tone === "amber" ? "text-[#ff9d00]" : "text-green-600"}`}>{note}</p>
    </Panel>
  );
}

function MetricCard({ title, value, note, icon, green, amber }: { title: string; value: string; note: string; icon: ReactNode; green?: boolean; amber?: boolean }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8f8ba6]">{title}</p>
          <p className={`mt-2 text-2xl font-black ${green ? "text-green-600" : amber ? "text-[#c99000]" : "text-[#1c173d]"}`}>{value}</p>
          <p className="mt-1 text-xs font-bold text-green-600">{note}</p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f0ebff] text-[#8f6d19]">{icon}</div>
      </div>
    </Panel>
  );
}

function SearchBox({ placeholder }: { placeholder: string }) {
  return (
    <label className="flex h-11 min-w-0 items-center gap-3 rounded-2xl border border-[#e7e1fb] bg-white px-4 text-xs font-semibold text-[#8f8ba6] shadow-sm">
      <Search size={19} className="text-[#5b45d1]" />
      <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder={placeholder} />
    </label>
  );
}

function SelectButton({ label }: { label: string }) {
  return (
    <button className="flex h-11 min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#e7e1fb] bg-white px-4 text-left text-xs font-black shadow-sm" type="button">
      {label} <ChevronDown size={18} />
    </button>
  );
}

function IconToggle({ icon, active }: { icon: ReactNode; active?: boolean }) {
  return (
    <button className={`grid h-11 w-12 place-items-center rounded-2xl border border-[#e7e1fb] shadow-sm ${active ? "bg-[#604bd1] text-white" : "bg-white text-[#8f8ba6]"}`} type="button">
      {icon}
    </button>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black">{label}</span>
      <input {...props} className="h-11 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-2 text-sm font-bold outline-none transition focus:border-[#604bd1]" />
    </label>
  );
}

function SelectField({ label, value, name }: { label: string; value: string; name?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black">{label}</span>
      <select name={name} className="h-11 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-2 text-sm font-bold outline-none" defaultValue={value}>
        <option>{value}</option>
        <option>announcement</option>
        <option>alert</option>
        <option>Experience</option>
        <option>Engage</option>
        <option>Explore</option>
      </select>
    </label>
  );
}

function PillButton({ icon, label, muted, onClick, submit }: { icon?: ReactNode; label: string; muted?: boolean; onClick?: () => void; submit?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-fit items-center justify-center gap-2 rounded-full px-6 py-3 font-black transition ${
        muted ? "border border-[#e7e1fb] bg-white text-xs text-[#5b45d1] hover:bg-[#f6f3ff]" : "bg-[#604bd1] text-xs text-white shadow-xl shadow-[#604bd1]/25 hover:bg-[#503bc1]"
      }`}
      type={submit ? "submit" : "button"}
    >
      {icon} {label}
    </button>
  );
}

function SmallButton({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <button
      className={`rounded-full px-6 py-3 font-black transition ${
        danger ? "bg-[#fa535b] text-xs text-white hover:bg-[#ee3f48]" : "border-2 border-[#e7e1fb] bg-white text-xs text-[#5b45d1] hover:bg-[#f6f3ff]"
      }`}
      type="button"
    >
      {label}
    </button>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "gold" | "green" | "purple" | "soft" }) {
  const styles = {
    gold: "bg-[#fff2c7] text-[#c99000]",
    green: "bg-green-100 text-green-700",
    purple: "bg-[#604bd1] text-white",
    soft: "bg-[#e7ddff] text-[#5b45d1]",
  };
  return <span className={`rounded-full px-3 py-1.5 text-xs font-black ${styles[tone]}`}>{children}</span>;
}

function Avatar({ label, large, pink }: { label: string; large?: boolean; pink?: boolean }) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full font-black text-white shadow-lg ${
        large ? "h-16 w-16 border-4 border-white text-xl" : "h-9 w-9 text-sm"
      } ${pink ? "bg-pink-500" : "bg-[#6754d6]"}`}
    >
      {label}
    </div>
  );
}

function ParentMini({ role, name, phone, initials, pink }: { role: string; name: string; phone: string; initials: string; pink?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
      <Avatar label={initials} pink={pink} />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8f8ba6]">{role}</p>
        <p className="text-xs font-black sm:text-sm">{name}</p>
        <p className="text-xs font-bold text-[#5b45d1]">{phone}</p>
      </div>
    </div>
  );
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

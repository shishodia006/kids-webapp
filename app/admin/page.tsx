"use client";

/* eslint-disable @next/next/no-img-element */

import type {
  AdminBrand,
  AdminData,
  AdminEvent,
  AdminKid,
  AdminMember,
  AdminNotification,
  AdminRedemption,
} from "@/lib/admin-data";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CirclePlus,
  Gift,
  Link,
  Loader2,
  LogOut,
  Megaphone,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

const ADMIN_FONT_STYLE = { fontFamily: "'Nunito', sans-serif" };

type Section = "Memberships" | "Activities" | "Promotions & Updates" | "Business" | "Referral Dashboard";
type Modal = "brand" | "notification" | "referral-settings" | null;

const navItems: { section: Section | "Analytics" | "Settings"; icon: ReactNode; group: "main" | "system" }[] = [
  { section: "Memberships", icon: <Users size={21} />, group: "main" },
  { section: "Activities", icon: <CalendarDays size={21} />, group: "main" },
  { section: "Promotions & Updates", icon: <Megaphone size={21} />, group: "main" },
  { section: "Business", icon: <Store size={21} />, group: "main" },
  { section: "Referral Dashboard", icon: <Link size={21} />, group: "main" },
  { section: "Analytics", icon: <BarChart3 size={21} />, group: "system" },
  { section: "Settings", icon: <Settings size={21} />, group: "system" },
];

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>("Memberships");
  const [data, setData] = useState<AdminData | null>(null);
  const [status, setStatus] = useState("Loading live admin dashboard...");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [comingSoon, setComingSoon] = useState<"Analytics" | "Settings" | null>(null);

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

  async function runAction(message: string, action: () => Promise<void>) {
    setBusy(true);
    setStatus(message);
    try {
      await action();
      await loadData();
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  function selectNav(section: (typeof navItems)[number]["section"]) {
    if (section === "Analytics" || section === "Settings") {
      setComingSoon(section);
      return;
    }

    setActiveSection(section);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin-login";
  }

  const counts = {
    Memberships: data?.stats.pendingKids,
    Activities: data?.stats.registered,
    "Promotions & Updates": data?.notifications.length,
    Business: data?.redemptions.length,
    "Referral Dashboard": data?.stats.totalReferrals,
  };

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
            <NavGroup title="Main" items={navItems.filter((item) => item.group === "main")} activeSection={activeSection} counts={counts} onSelect={selectNav} />
            <NavGroup title="System" items={navItems.filter((item) => item.group === "system")} activeSection={activeSection} counts={counts} onSelect={selectNav} />
          </nav>

          <div className="mt-auto hidden shrink-0 border-t border-white/10 p-3 lg:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f8c400] text-sm font-black text-[#25166f]">A</div>
              <div>
                <p className="text-xs font-black">Admin User</p>
                <p className="text-xs font-bold text-white/60">Super Admin</p>
              </div>
            </div>
            <button onClick={logout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15" type="button">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </aside>

        <section className="min-w-0 lg:ml-[240px]">
          <DashboardHeader section={activeSection} loading={busy} onRefresh={loadData} onAddBrand={() => setModal("brand")} onPostUpdate={() => setModal("notification")} onReferralSettings={() => setModal("referral-settings")} />
          <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:pt-[98px]">
            {status && <StatusBanner message={status} loading={busy || status.startsWith("Loading")} />}
            {!data && !status && <StatusBanner message="No admin data loaded yet." />}
            {data && activeSection === "Memberships" && (
              <Memberships
                data={data}
                onKidStatus={(kidId, nextStatus) =>
                  runAction("Updating child profile...", () => postJson("/api/admin/kids/status", { kidId, status: nextStatus }))
                }
              />
            )}
            {data && activeSection === "Activities" && (
              <Activities
                data={data}
                onCreateEvent={(body) => runAction("Saving activity...", () => postJson("/api/admin/events", body))}
                onCheckIn={(bookingId) => runAction("Checking in participant and awarding points...", () => postJson("/api/admin/bookings/check-in", { bookingId }))}
              />
            )}
            {data && activeSection === "Promotions & Updates" && <Promotions data={data} onPostUpdate={() => setModal("notification")} />}
            {data && activeSection === "Business" && (
              <Business
                data={data}
                onAddBrand={() => setModal("brand")}
                onRedemptionStatus={(redemptionId, nextStatus) =>
                  runAction("Updating voucher status...", () => postJson("/api/admin/redemptions/status", { redemptionId, status: nextStatus }))
                }
              />
            )}
            {data && activeSection === "Referral Dashboard" && <ReferralDashboard data={data} />}
          </div>
        </section>
      </div>

      {modal === "brand" && <BrandModal onClose={() => setModal(null)} onSubmit={(body) => runAction("Adding reward brand...", () => postJson("/api/admin/brands", body)).then(() => setModal(null))} />}
      {modal === "notification" && <NotificationModal onClose={() => setModal(null)} onSubmit={(body) => runAction("Publishing update...", () => postJson("/api/admin/notifications", body)).then(() => setModal(null))} />}
      {modal === "referral-settings" && <ReferralSettingsModal onClose={() => setModal(null)} />}
      {comingSoon && <ComingSoonModal title={comingSoon} onClose={() => setComingSoon(null)} />}
    </main>
  );
}

function DashboardHeader({
  section,
  loading,
  onRefresh,
  onAddBrand,
  onPostUpdate,
  onReferralSettings,
}: {
  section: Section;
  loading: boolean;
  onRefresh: () => void;
  onAddBrand: () => void;
  onPostUpdate: () => void;
  onReferralSettings: () => void;
}) {
  const copy: Record<Section, string> = {
    Memberships: "Live member profiles, child verification, and approval workflow",
    Activities: "Create events, watch registrations, and check in attendees",
    "Promotions & Updates": "Broadcast updates and review live community notifications",
    Business: "Manage reward partners, vouchers, and redemptions",
    "Referral Dashboard": "Track referral conversions and point awards",
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-[#e7e1fb] bg-white px-4 py-3 shadow-sm sm:px-6 lg:fixed lg:left-[240px] lg:right-0 lg:top-0 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">{section}</h1>
          <p className="mt-1 text-xs font-semibold text-[#8f8ba6] sm:text-sm">{copy[section]}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PillButton icon={<RefreshCw size={17} className={loading ? "animate-spin" : ""} />} label="Refresh" muted onClick={onRefresh} />
          {section === "Business" && <PillButton icon={<CirclePlus size={18} />} label="Add Brand" onClick={onAddBrand} />}
          {section === "Promotions & Updates" && <PillButton icon={<CirclePlus size={18} />} label="Post Update" onClick={onPostUpdate} />}
          {section === "Referral Dashboard" && <PillButton icon={<Settings size={18} />} label="Referral Settings" onClick={onReferralSettings} />}
        </div>
      </div>
    </header>
  );
}

function Memberships({ data, onKidStatus }: { data: AdminData; onKidStatus: (kidId: number, status: "approved" | "rejected") => void }) {
  const [membershipTab, setMembershipTab] = useState(0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Parent Members" value={data.stats.parents.toString()} note="Live DB count" tone="dark" />
        <StatCard title="Kids Members" value={data.stats.kids.toString()} note={`${data.stats.activeKids} approved`} tone="purple" />
        <StatCard title="Pending Approvals" value={data.stats.pendingKids.toString()} note="Child profiles awaiting" tone="amber" />
        <StatCard title="Paid Bookings" value={data.stats.paidBookings.toString()} note={`${data.stats.checkedIn} checked in`} tone="dark" />
      </div>

      <SegmentedTabs tabs={["Active Memberships", "Pending Approvals"]} activeIndex={membershipTab} badge={`${data.pendingKids.length}`} onSelect={setMembershipTab} />

      {membershipTab === 0 ? (
        <div className="space-y-4">
          <SearchBox placeholder="Search by name, phone, Konnect code" />
          {data.members.length === 0 ? <EmptyState text="No parent members found." /> : data.members.map((member) => <MemberCard key={member.id} member={member} />)}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-[#e6b800] bg-[#fff6c9] px-5 py-4 text-sm font-black text-[#c98b00]">
            Parent profiles are auto-approved. Child profiles require manual approval before event booking.
          </div>
          <PendingApprovals kids={data.pendingKids} onKidStatus={onKidStatus} />
        </div>
      )}
    </div>
  );
}

function PendingApprovals({ kids, onKidStatus }: { kids: AdminKid[]; onKidStatus: (kidId: number, status: "approved" | "rejected") => void }) {
  const [openId, setOpenId] = useState(kids[0]?.id ?? 0);

  if (kids.length === 0) return <EmptyState text="No pending child profiles. You are all caught up." />;

  return (
    <div className="space-y-4">
      {kids.map((profile) => (
        <PendingApprovalCard
          key={profile.id}
          profile={profile}
          isOpen={openId === profile.id}
          onToggle={() => setOpenId((current) => (current === profile.id ? 0 : profile.id))}
          onApprove={() => onKidStatus(profile.id, "approved")}
          onReject={() => onKidStatus(profile.id, "rejected")}
        />
      ))}
    </div>
  );
}

function PendingApprovalCard({
  profile,
  isOpen,
  onToggle,
  onApprove,
  onReject,
}: {
  profile: AdminKid;
  isOpen: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border-2 border-[#ff9800] bg-white shadow-sm">
      <button onClick={onToggle} className="flex w-full items-center gap-4 bg-[#fff7d7] px-5 py-4 text-left transition hover:bg-[#fff1bd]" type="button">
        <Avatar label={profile.initials} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black">{profile.name}</h3>
          <p className="mt-1 text-xs font-semibold text-[#8f8ba6]">
            Age {profile.age.replace(" years", "")} - {profile.grade} - Parent: {profile.parent} ({profile.phone})
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="gold">{profile.status}</Badge>
            <Badge tone="soft">{profile.locality}</Badge>
            <span className="text-xs font-semibold text-[#8f8ba6]">{profile.requested}</span>
          </div>
        </div>
        <span className="text-xl font-black text-[#ff9800]">{isOpen ? "Hide" : "View"}</span>
      </button>

      {isOpen && (
        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="grid gap-3">
              <AdminFilePreview title="Child Photo" source={profile.photo} fallback="No child photo uploaded" />
              <AdminFilePreview title="School ID" source={profile.schoolIdPreview} fallback="No school ID preview" fileName={profile.schoolId} />
            </div>

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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button onClick={onApprove} className="rounded-full bg-green-500 px-5 py-2.5 text-xs font-black text-white transition hover:bg-green-600" type="button">
              Approve Profile
            </button>
            <button onClick={onReject} className="rounded-full bg-red-500 px-5 py-2.5 text-xs font-black text-white transition hover:bg-red-600" type="button">
              Reject
            </button>
            <span className="text-xs font-bold text-[#8f8ba6]">Approval sends WhatsApp and unlocks event booking.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminFilePreview({ title, source, fallback, fileName }: { title: string; source: string; fallback: string; fileName?: string }) {
  const [failedSource, setFailedSource] = useState("");
  const hasSource = Boolean(source) && failedSource !== source;
  const isPdf = source.startsWith("data:application/pdf") || /\.pdf($|\?)/i.test(source) || Boolean(fileName && /\.pdf$/i.test(fileName));

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff]">
      <div className="flex items-center justify-between gap-2 border-b border-[#e6e0fb] px-3 py-2">
        <p className="text-xs font-black text-[#2d2856]">{title}</p>
        {hasSource && (
          <a href={source} target="_blank" rel="noreferrer" className="rounded-full bg-[#604bd1] px-3 py-1 text-[10px] font-black text-white">
            Open
          </a>
        )}
      </div>
      {hasSource ? (
        isPdf ? (
          <div className="grid min-h-36 place-items-center p-3 text-center">
            <object data={source} type="application/pdf" className="h-32 w-full rounded-xl bg-white" onError={() => setFailedSource(source)}>
              <a href={source} target="_blank" rel="noreferrer" className="font-black text-[#604bd1]">Open PDF</a>
            </object>
            <p className="mt-2 max-w-full truncate text-[11px] font-black text-[#8f8ba6]">{fileName || "PDF document"}</p>
          </div>
        ) : (
          <img src={source} alt={title} className="h-40 w-full object-cover" onError={() => setFailedSource(source)} />
        )
      ) : (
        <div className="grid min-h-36 place-items-center px-4 py-5 text-center text-xs font-black text-[#8f8ba6]">
          <ShieldCheck size={34} className="text-[#604bd1]" />
          <span>{fallback}</span>
        </div>
      )}
    </div>
  );
}

function Activities({
  data,
  onCreateEvent,
  onCheckIn,
}: {
  data: AdminData;
  onCreateEvent: (body: Record<string, FormDataEntryValue>) => void;
  onCheckIn: (bookingId: number) => void;
}) {
  const [activityTab, setActivityTab] = useState(0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateEvent(Object.fromEntries(new FormData(event.currentTarget)));
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-5">
      <SegmentedTabs tabs={["Add / Edit Event", "Live Event Status"]} activeIndex={activityTab} onSelect={setActivityTab} />
      {activityTab === 0 ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel>
            <h2 className="text-lg font-black sm:text-xl">Create New Activity</h2>
            <form onSubmit={submit} className="mt-5 grid gap-4 lg:grid-cols-2">
              <Field name="title" label="Activity Name *" placeholder="Summer Art Camp 2026" required />
              <Field name="venue" label="Venue *" placeholder="DLF Phase 2 Community Hall" required />
              <Field name="date" label="Date" type="date" />
              <Field name="time" label="Time" type="time" />
              <Field name="price" label="Registration Fee (Rs)" type="number" min="0" defaultValue="0" />
              <Field name="pointsEarnable" label="Konnect Points Earned" type="number" min="0" defaultValue="100" />
              <Field name="capacity" label="Max Participants" type="number" min="1" placeholder="Leave blank for unlimited" />
              <SelectField name="category" label="Category" options={["Explore", "Engage", "Experience", "Arts & Crafts", "Sports"]} />
              <Field name="minAge" label="Min Age" type="number" min="0" />
              <Field name="maxAge" label="Max Age" type="number" min="0" />
              <SelectField name="gender" label="Gender" options={["All", "Boy", "Girl"]} />
              <Field name="restrictedArea" label="Restricted Area" placeholder="Optional city/locality" />
              <label className="grid gap-2 lg:col-span-2">
                <span className="text-xs font-black">Description</span>
                <textarea name="description" className="min-h-24 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#604bd1]" />
              </label>
              <div className="lg:col-span-2">
                <PillButton label="Save Activity" submit />
              </div>
            </form>
          </Panel>
          <EventList events={data.events} />
        </div>
      ) : (
        <LiveEventStatus data={data} onCheckIn={onCheckIn} />
      )}
    </div>
  );
}

function EventList({ events }: { events: AdminEvent[] }) {
  return (
    <Panel>
      <h2 className="text-lg font-black sm:text-xl">Published Activities</h2>
      <div className="mt-4 grid gap-3">
        {events.length === 0 && <EmptyState text="No events created yet. Add one and it will appear in the user app." />}
        {events.map((event) => (
          <div key={event.id} className="rounded-2xl bg-[#f5f2ff] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-black">{event.title}</h3>
                <p className="mt-1 text-xs font-bold text-[#8f8ba6]">{event.date} - {event.venue || "Venue TBA"}</p>
                <p className="mt-2 text-xs font-black text-[#5b45d1]">{event.category} - Rs {event.price} - Capacity {event.capacity || "Open"}</p>
              </div>
              <Badge tone="green">Live in app</Badge>
            </div>
            {event.description && <p className="mt-3 text-sm font-semibold text-[#8f8ba6]">{event.description}</p>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LiveEventStatus({ data, onCheckIn }: { data: AdminData; onCheckIn: (bookingId: number) => void }) {
  const checkedIn = data.liveParticipants.filter((participant) => participant.checkIn !== "Not yet").length;
  const paid = data.liveParticipants.filter((participant) => participant.paid).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Registered" value={data.stats.registered.toString()} note="Paid bookings" tone="dark" />
        <StatCard title="Checked In" value={checkedIn.toString()} note="Attendance marked" tone="purple" />
        <StatCard title="Payment Status" value={`${paid}/${data.liveParticipants.length}`} note="Success bookings" tone="amber" />
      </div>

      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#e7e1fb] bg-[#f5f2ff] text-xs uppercase tracking-[0.18em] text-[#8f8ba6]">
              {["#", "Participant", "Parent", "Phone", "Payment", "Check-in", "Points", "Action"].map((head) => (
                <th key={head} className="px-5 py-4 font-black">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.liveParticipants.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center font-black text-[#8f8ba6]" colSpan={8}>No bookings yet.</td>
              </tr>
            )}
            {data.liveParticipants.map((participant, index) => {
              const done = participant.checkIn !== "Not yet";
              return (
                <tr key={participant.id} className="border-b border-[#eee9fb] last:border-b-0">
                  <td className="px-5 py-4 font-black">{index + 1}</td>
                  <td className="px-5 py-4 font-black">{participant.participant}</td>
                  <td className="px-5 py-4 font-bold">{participant.parent}</td>
                  <td className="px-5 py-4 font-bold">{participant.phone}</td>
                  <td className="px-5 py-4"><Badge tone={participant.paid ? "green" : "gold"}>{participant.paid ? "Paid" : "Pending"}</Badge></td>
                  <td className="px-5 py-4"><Badge tone={done ? "green" : "gold"}>{done ? participant.checkIn : "Not yet"}</Badge></td>
                  <td className="px-5 py-4 font-black">{participant.points}</td>
                  <td className="px-5 py-4">
                    <button disabled={done || !participant.paid} onClick={() => onCheckIn(participant.id)} className="rounded-full bg-[#604bd1] px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45" type="button">
                      Check In
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Promotions({ data, onPostUpdate }: { data: AdminData; onPostUpdate: () => void }) {
  const [promoTab, setPromoTab] = useState(0);
  const slides = data.events.slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedTabs tabs={["Hero Slides", "Updates & Push", "Reward Promos"]} activeIndex={promoTab} onSelect={setPromoTab} />
        {promoTab === 1 && <PillButton icon={<CirclePlus size={18} />} label="Post Update" onClick={onPostUpdate} />}
      </div>

      {promoTab === 0 && (
        <div className="grid gap-4 xl:grid-cols-3">
          {slides.length === 0 && <EmptyState text="No events available for hero slides yet." />}
          {slides.map((event, index) => <PromoCard key={event.id} title={event.title} body={`${event.date} - ${event.venue || "Venue TBA"}`} badge={`Slide ${index + 1}`} />)}
        </div>
      )}
      {promoTab === 1 && <UpdatesPush notifications={data.notifications} />}
      {promoTab === 2 && <RewardPromos brands={data.brands} />}
    </div>
  );
}

function UpdatesPush({ notifications }: { notifications: AdminNotification[] }) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-black sm:text-xl">Live Updates & Push Notifications</h2>
      {notifications.length === 0 && <EmptyState text="No updates sent yet." />}
      {notifications.map((notification) => (
        <Panel key={notification.id} className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f0ebff] text-[#604bd1]"><Bell /></div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black">{notification.title}</h3>
              <p className="mt-1 text-sm font-semibold text-[#8f8ba6]">{notification.message}</p>
              <p className="mt-3 text-xs font-bold text-[#8f8ba6]">{notification.createdAt}</p>
            </div>
            <Badge tone={notification.type === "alert" ? "gold" : "green"}>{notification.type || "announcement"}</Badge>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function RewardPromos({ brands }: { brands: AdminBrand[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {brands.length === 0 && <EmptyState text="No reward partners are active yet." />}
      {brands.map((brand) => (
        <Panel key={brand.id}>
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#604bd1] text-white"><Gift /></div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black">{brand.name}</h3>
              <p className="mt-1 text-sm font-semibold text-[#8f8ba6]">{brand.pointsCost} Konnect Points</p>
            </div>
            <Badge tone={brand.active ? "green" : "gold"}>{brand.active ? "Active" : "Inactive"}</Badge>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Business({
  data,
  onAddBrand,
  onRedemptionStatus,
}: {
  data: AdminData;
  onAddBrand: () => void;
  onRedemptionStatus: (redemptionId: number, status: "issued" | "redeemed" | "cancelled") => void;
}) {
  const [businessTab, setBusinessTab] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedTabs tabs={["Brands", "Voucher Redemptions"]} activeIndex={businessTab} onSelect={setBusinessTab} />
        {businessTab === 0 && <PillButton icon={<CirclePlus size={18} />} label="Add Brand" onClick={onAddBrand} />}
      </div>
      {businessTab === 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.brands.length === 0 && <EmptyState text="No reward brands yet." />}
          {data.brands.map((brand) => <BrandCard key={brand.id} brand={brand} />)}
        </div>
      ) : (
        <RedemptionsTable redemptions={data.redemptions} onRedemptionStatus={onRedemptionStatus} />
      )}
    </div>
  );
}

function RedemptionsTable({
  redemptions,
  onRedemptionStatus,
}: {
  redemptions: AdminRedemption[];
  onRedemptionStatus: (redemptionId: number, status: "issued" | "redeemed" | "cancelled") => void;
}) {
  return (
    <Panel className="overflow-x-auto p-0">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-[#ddd6fb] bg-[#f5f2ff] text-xs uppercase tracking-[0.22em] text-[#8f8ba6]">
            {["Voucher", "Member", "Brand", "Date", "Status", "Actions"].map((head) => <th key={head} className="px-5 py-4 font-black">{head}</th>)}
          </tr>
        </thead>
        <tbody>
          {redemptions.length === 0 && (
            <tr>
              <td className="px-5 py-8 text-center font-black text-[#8f8ba6]" colSpan={6}>No voucher redemptions yet.</td>
            </tr>
          )}
          {redemptions.map((voucher) => (
            <tr key={voucher.id} className="border-b border-[#eee9fb] last:border-b-0">
              <td className="px-5 py-5 font-black">{voucher.voucher}</td>
              <td className="px-5 py-5 font-black">{voucher.member}</td>
              <td className="px-5 py-5 font-bold">{voucher.brand}</td>
              <td className="px-5 py-5 font-bold">{voucher.date}</td>
              <td className="px-5 py-5"><Badge tone={voucher.status === "cancelled" ? "gold" : voucher.status === "redeemed" ? "green" : "soft"}>{voucher.status}</Badge></td>
              <td className="px-5 py-5">
                <div className="flex flex-wrap gap-2">
                  <SmallButton label="Mark Redeemed" disabled={voucher.status === "redeemed"} onClick={() => onRedemptionStatus(voucher.id, "redeemed")} />
                  <SmallButton label="Reissue" disabled={voucher.status === "issued"} onClick={() => onRedemptionStatus(voucher.id, "issued")} />
                  <SmallButton label="Cancel" danger disabled={voucher.status === "cancelled"} onClick={() => onRedemptionStatus(voucher.id, "cancelled")} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ReferralDashboard({ data }: { data: AdminData }) {
  const topName = data.topReferrers[0]?.name || "No referrals yet";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Referrals" value={data.stats.totalReferrals.toString()} note="Converted accounts" icon={<Link size={24} />} />
        <MetricCard title="Conversions" value={data.recentReferrals.length.toString()} note="Recent referral records" icon={<Check size={24} />} green />
        <MetricCard title="Points Awarded" value={data.stats.referralPoints.toString()} note="Referral point ledger" icon={<Target size={24} />} amber />
        <MetricCard title="Top Referrer" value={topName} note={data.topReferrers[0]?.referrals ? `${data.topReferrers[0].referrals} referrals` : "None yet"} icon={<Trophy size={24} />} />
      </div>

      <div className="grid gap-7 xl:grid-cols-[1fr_1.05fr]">
        <Panel>
          <h2 className="mb-4 flex items-center gap-3 text-lg font-black"><Trophy className="text-[#d49b00]" /> Top Referrers</h2>
          {data.topReferrers.length === 0 && <EmptyState text="No referral conversions yet." />}
          <div className="grid gap-3">
            {data.topReferrers.map((item) => (
              <div key={`${item.rank}-${item.name}`} className="grid gap-3 rounded-2xl border border-[#e7e1fb] bg-[#faf8ff] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#f8c400] font-black text-white">{item.rank}</div>
                <div>
                  <p className="font-black">{item.name}</p>
                  <p className="text-sm font-semibold text-[#8f8ba6]">{item.meta}</p>
                  <p className="mt-2 text-sm font-black text-[#5b45d1]">{item.points}</p>
                </div>
                <p className="text-right text-2xl font-black text-[#5b45d1]">{item.referrals}<span className="block text-sm text-[#8f8ba6]">referrals</span></p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="overflow-x-auto p-0">
          <div className="flex items-center justify-between bg-[#f0ebff] px-6 py-5">
            <p className="font-black">Recent Referrals</p>
            <Badge tone="green">{data.recentReferrals.length} records</Badge>
          </div>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-t border-[#e7e1fb] text-xs uppercase tracking-[0.2em] text-[#8f8ba6]">
                {["Referral Code", "New Member", "Date", "Status", "Pts Awarded"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.recentReferrals.length === 0 && (
                <tr><td className="px-4 py-8 text-center font-black text-[#8f8ba6]" colSpan={5}>No recent referrals yet.</td></tr>
              )}
              {data.recentReferrals.map((referral, index) => (
                <tr key={`${referral.code}-${referral.newMember}-${index}`} className="border-t border-[#e7e1fb]">
                  <td className="px-4 py-3"><Badge tone="purple">{referral.code || "N/A"}</Badge></td>
                  <td className="px-4 py-3 font-black">{referral.newMember}</td>
                  <td className="px-4 py-3 font-bold">{referral.date}</td>
                  <td className="px-4 py-3"><Badge tone="green">{referral.status}</Badge></td>
                  <td className="px-4 py-3 font-black">+{referral.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}

function NotificationModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (body: Record<string, FormDataEntryValue>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <AdminFormModal title="Post Update" icon={<Bell />} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <SelectField name="type" label="Type" options={["announcement", "alert"]} />
        <label className="grid gap-2">
          <span className="text-xs font-black">Message *</span>
          <textarea name="message" required className="min-h-28 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#604bd1]" placeholder="Write your update..." />
        </label>
        <FormActions onClose={onClose} primaryLabel="Post Update" />
      </form>
    </AdminFormModal>
  );
}

function BrandModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (body: Record<string, FormDataEntryValue>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <AdminFormModal title="Add Reward Brand" icon={<Gift />} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field name="name" label="Brand Name *" required placeholder="Domino's Pizza" />
        <Field name="pointsCost" label="Points Required" type="number" min="0" defaultValue="250" />
        <Field name="note" label="Reward Note" placeholder="Flat 20% off on selected items" />
        <label className="grid gap-2">
          <span className="text-xs font-black">Description</span>
          <textarea name="description" className="min-h-24 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#604bd1]" />
        </label>
        <FormActions onClose={onClose} primaryLabel="Add Brand" />
      </form>
    </AdminFormModal>
  );
}

function ReferralSettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <AdminFormModal title="Referral Settings" icon={<Settings />} onClose={onClose}>
      <div className="rounded-2xl bg-[#f8f7ff] p-5 text-sm font-bold leading-6 text-[#8f8ba6]">
        Referral points are currently production-fixed at 50 points per successful verified referral. This keeps app, admin, and ledger accounting consistent.
      </div>
      <FormActions onClose={onClose} primaryLabel="Got It" />
    </AdminFormModal>
  );
}

function AdminFormModal({ title, icon, children, onClose }: { title: string; icon: ReactNode; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-[#161332]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e7e1fb] px-6 py-5">
          <h2 className="flex items-center gap-3 text-xl font-black"><span className="text-[#604bd1]">{icon}</span>{title}</h2>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-[#f6f3ff] text-[#8f8ba6] transition hover:bg-[#e7ddff] hover:text-[#5b45d1]" type="button" aria-label="Close popup">
            <X size={22} />
          </button>
        </div>
        <div className="grid gap-4 px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function FormActions({ onClose, primaryLabel }: { onClose: () => void; primaryLabel: string }) {
  return (
    <div className="flex justify-end gap-3 border-t border-[#e7e1fb] pt-5">
      <button onClick={onClose} className="rounded-full border-2 border-[#e7e1fb] px-6 py-3 text-sm font-black text-[#5b45d1]" type="button">
        Cancel
      </button>
      <button className="rounded-full bg-[#604bd1] px-7 py-3 text-sm font-black text-white shadow-xl shadow-[#604bd1]/25" type="submit">
        {primaryLabel}
      </button>
    </div>
  );
}

function NavGroup({
  title,
  items,
  activeSection,
  counts,
  onSelect,
}: {
  title: string;
  items: typeof navItems;
  activeSection: Section;
  counts: Partial<Record<Section, number | undefined>>;
  onSelect: (section: (typeof navItems)[number]["section"]) => void;
}) {
  return (
    <div>
      <p className="mb-1 hidden px-2 text-[9px] font-black uppercase tracking-[0.24em] text-white/35 lg:block">{title}</p>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = item.section === activeSection;
          const count = item.section === "Analytics" || item.section === "Settings" ? undefined : counts[item.section];
          return (
            <button key={item.section} onClick={() => onSelect(item.section)} className={`relative flex min-w-fit items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-black transition lg:w-full ${active ? "bg-white/18 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`} type="button">
              {active && <span className="absolute left-0 top-2 h-8 w-1 rounded-r-full bg-[#f8c400]" />}
              <span className="grid h-5 w-5 place-items-center text-white/70">{item.icon}</span>
              <span className="truncate">{item.section}</span>
              {typeof count === "number" && count > 0 && <span className="ml-auto rounded-full bg-[#f8c400] px-2.5 py-0.5 text-xs font-black text-[#25166f]">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: AdminMember }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="relative bg-white px-4 py-4 sm:px-5">
        <span className="absolute right-6 top-6 h-4 w-4 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar label={member.initials} large />
          <div className="min-w-0">
            <h3 className="text-lg font-black sm:text-xl">{member.family}</h3>
            <p className="mt-2 text-xs font-semibold text-[#8f8ba6] sm:text-sm">Primary: {member.fatherPhone} - Alternate: {member.motherPhone}</p>
            <p className="mt-1 text-xs font-bold text-[#5b45d1]">{member.address || "Address not added"}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Badge tone="gold">{member.plan}</Badge>
              <Badge tone={member.active ? "green" : "gold"}>{member.active ? "Active" : "Inactive"}</Badge>
              <Badge tone="purple">{member.code}</Badge>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 border-t border-[#e7e1fb] bg-[#f0ebff] p-4 md:grid-cols-2">
        <ParentMini role="Primary Parent" name={member.father} phone={member.fatherPhone} initials={member.initials} />
        <ParentMini role="Alternate Parent" name={member.mother} phone={member.motherPhone} initials={member.mother.slice(0, 1) || "P"} pink />
      </div>
    </Panel>
  );
}

function PromoCard({ title, body, badge }: { title: string; body: string; badge: string }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="grid min-h-36 place-items-center bg-[#604bd1] px-5 text-center text-xl font-black leading-relaxed text-white">{title}</div>
      <div className="p-5">
        <h3 className="text-base font-black">{title}</h3>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-[#8f8ba6] sm:text-sm">{body}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Badge tone="green">Visible</Badge>
          <Badge tone="soft">{badge}</Badge>
        </div>
      </div>
    </Panel>
  );
}

function BrandCard({ brand }: { brand: AdminBrand }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className={`h-28 ${brand.color || "bg-[#6754d6]"}`} />
      <div className="relative p-5 pt-10">
        <div className="absolute -top-9 grid h-16 w-16 place-items-center rounded-2xl bg-white text-[#604bd1] shadow-lg"><Gift /></div>
        <h3 className="text-lg font-black">{brand.name}</h3>
        <p className="mt-2 text-xs font-semibold text-[#8f8ba6] sm:text-sm">{brand.email}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Badge tone="soft">{brand.code}</Badge>
          <Badge tone="gold">{brand.pointsCost} pts</Badge>
          <Badge tone={brand.active ? "green" : "gold"}>{brand.active ? "Active" : "Inactive"}</Badge>
        </div>
      </div>
    </Panel>
  );
}

function ComingSoonModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#161332]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-2xl">
        <button onClick={onClose} className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-[#f6f3ff] text-[#5b45d1] transition hover:bg-[#e7ddff]" type="button" aria-label="Close popup">
          <X size={20} />
        </button>
        <div className="mx-auto mt-2 grid h-20 w-20 place-items-center rounded-3xl bg-[#f0ebff] text-[#5b45d1]">
          {title === "Analytics" ? <BarChart3 size={38} /> : <Settings size={38} />}
        </div>
        <h2 className="mt-5 text-3xl font-black">{title}</h2>
        <p className="mt-3 text-base font-semibold leading-relaxed text-[#8f8ba6]">This admin area is reserved for the next operational release.</p>
        <button onClick={onClose} className="mt-6 w-full rounded-full bg-[#161332] py-4 font-black text-[#f8c400]" type="button">Got it</button>
      </div>
    </div>
  );
}

function SegmentedTabs({ tabs, activeIndex, badge, onSelect }: { tabs: string[]; activeIndex: number; badge?: string; onSelect?: (index: number) => void }) {
  return (
    <div className="flex w-full gap-2 overflow-x-auto rounded-[18px] border border-[#e7e1fb] bg-white p-1.5 shadow-sm sm:w-fit">
      {tabs.map((tab, index) => (
        <button key={tab} onClick={() => onSelect?.(index)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-black transition ${index === activeIndex ? "bg-[#604bd1] text-white shadow-lg shadow-[#604bd1]/20" : "text-[#8f8ba6] hover:bg-[#f6f3ff]"}`} type="button">
          {tab}
          {badge && index === 1 && <span className="rounded-full bg-[#ff9d00] px-2 py-0.5 text-xs text-white">{badge}</span>}
        </button>
      ))}
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[20px] border border-[#e7e1fb] bg-white p-4 shadow-sm shadow-[#d9d2f5]/50 ${className}`}>{children}</div>;
}

function StatCard({ title, value, note, tone }: { title: string; value: string; note: string; tone: "dark" | "purple" | "amber" }) {
  const colors = { dark: "text-[#1c173d]", purple: "text-[#604bd1]", amber: "text-[#ff9d00]" };
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
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8f8ba6]">{title}</p>
          <p className={`mt-2 truncate text-2xl font-black ${green ? "text-green-600" : amber ? "text-[#c99000]" : "text-[#1c173d]"}`}>{value}</p>
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

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black">{label}</span>
      <input {...props} className="h-11 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-2 text-sm font-bold outline-none transition focus:border-[#604bd1]" />
    </label>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black">{label}</span>
      <select name={name} className="h-11 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-2 text-sm font-bold outline-none transition focus:border-[#604bd1]">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function PillButton({ icon, label, muted, onClick, submit }: { icon?: ReactNode; label: string; muted?: boolean; onClick?: () => void; submit?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-fit items-center justify-center gap-2 rounded-full px-6 py-3 font-black transition ${muted ? "border border-[#e7e1fb] bg-white text-xs text-[#5b45d1] hover:bg-[#f6f3ff]" : "bg-[#604bd1] text-xs text-white shadow-xl shadow-[#604bd1]/25 hover:bg-[#503bc1]"}`} type={submit ? "submit" : "button"}>
      {icon} {label}
    </button>
  );
}

function SmallButton({ label, danger, disabled, onClick }: { label: string; danger?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-full px-4 py-2 font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${danger ? "bg-[#fa535b] text-xs text-white hover:bg-[#ee3f48]" : "border-2 border-[#e7e1fb] bg-white text-xs text-[#5b45d1] hover:bg-[#f6f3ff]"}`} type="button">
      {label}
    </button>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "gold" | "green" | "purple" | "soft" }) {
  const styles = { gold: "bg-[#fff2c7] text-[#c99000]", green: "bg-green-100 text-green-700", purple: "bg-[#604bd1] text-white", soft: "bg-[#e7ddff] text-[#5b45d1]" };
  return <span className={`rounded-full px-3 py-1.5 text-xs font-black capitalize ${styles[tone]}`}>{children}</span>;
}

function Avatar({ label, large, pink }: { label: string; large?: boolean; pink?: boolean }) {
  return (
    <div className={`grid shrink-0 place-items-center rounded-full font-black text-white shadow-lg ${large ? "h-16 w-16 border-4 border-white text-xl" : "h-9 w-9 text-sm"} ${pink ? "bg-pink-500" : "bg-[#6754d6]"}`}>
      {label || "K"}
    </div>
  );
}

function ParentMini({ role, name, phone, initials, pink }: { role: string; name: string; phone: string; initials: string; pink?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
      <Avatar label={initials} pink={pink} />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8f8ba6]">{role}</p>
        <p className="text-xs font-black sm:text-sm">{name || "-"}</p>
        <p className="text-xs font-bold text-[#5b45d1]">{phone || "-"}</p>
      </div>
    </div>
  );
}

function InfoTile({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="rounded-2xl bg-[#f5f2ff] px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8f8ba6]">{label}</p>
      <p className={`mt-1 text-sm font-black ${green ? "text-green-600" : "text-[#161332]"}`}>{value || "-"}</p>
    </div>
  );
}

function StatusBanner({ message, loading }: { message: string; loading?: boolean }) {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-[18px] bg-white p-4 text-sm font-black text-[#6655cf] shadow-sm ring-1 ring-[#e9e4fb]">
      {loading && <Loader2 className="animate-spin" size={18} />}
      {message}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[18px] bg-white p-5 text-center text-sm font-black text-[#8f8ba6] shadow-sm ring-1 ring-[#e8e0ff]">{text}</div>;
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

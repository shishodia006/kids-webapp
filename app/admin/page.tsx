"use client";

/* eslint-disable @next/next/no-img-element */

import type {
  AdminBrand,
  AdminData,
  AdminEvent,
  AdminHeroSlide,
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
  ChevronDown,
  CirclePlus,
  Download,
  Gift,
  Grid2X2,
  Link,
  List,
  Loader2,
  LogOut,
  Megaphone,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Store,
  Target,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

const ADMIN_FONT_STYLE = { fontFamily: "'Nunito', sans-serif" };

type Section = "Memberships" | "Activities" | "Promotions & Updates" | "Business" | "Referral Dashboard" | "Analytics";
type Modal = "brand" | "notification" | "referral-settings" | null;
type MembershipAgeFilter = "all" | "4-6" | "7-9" | "10-12" | "12-18";
type MembershipPointsFilter = "all" | "0-200" | "200-500" | "500+";
type MembershipViewMode = "grid" | "list";

declare global {
  interface Window {
    konnectlyRequestNotifications?: () => Promise<NotificationPermission>;
  }
}

const navItems: { section: Section | "Settings"; icon: ReactNode; group: "main" | "system" }[] = [
  { section: "Memberships", icon: <Users size={21} />, group: "main" },
  { section: "Activities", icon: <CalendarDays size={21} />, group: "main" },
  { section: "Promotions & Updates", icon: <Megaphone size={21} />, group: "main" },
  { section: "Business", icon: <Store size={21} />, group: "main" },
  { section: "Referral Dashboard", icon: <Link size={21} />, group: "main" },
  { section: "Analytics", icon: <BarChart3 size={21} />, group: "system" },
  { section: "Settings", icon: <Settings size={21} />, group: "system" },
];

const membershipAgeOptions: Array<{ value: MembershipAgeFilter; label: string }> = [
  { value: "all", label: "All Ages" },
  { value: "4-6", label: "4-6 years" },
  { value: "7-9", label: "7-9 years" },
  { value: "10-12", label: "10-12 years" },
  { value: "12-18", label: "12-18 years" },
];

const membershipPointsOptions: Array<{ value: MembershipPointsFilter; label: string }> = [
  { value: "all", label: "All Points" },
  { value: "0-200", label: "0-200 pts" },
  { value: "200-500", label: "200-500 pts" },
  { value: "500+", label: "500+ pts" },
];

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>("Memberships");
  const [data, setData] = useState<AdminData | null>(null);
  const [status, setStatus] = useState("Loading live admin dashboard...");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [editingBrand, setEditingBrand] = useState<AdminBrand | null>(null);
  const [comingSoon, setComingSoon] = useState<"Settings" | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotificationPermission("Notification" in window ? Notification.permission : "unsupported");
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
    if (section === "Settings") {
      setComingSoon(section);
      return;
    }

    setActiveSection(section);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin-login";
  }

  async function enableAdminNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setStatus("Notifications are not supported on this browser.");
      return;
    }

    const permission = window.konnectlyRequestNotifications ? await window.konnectlyRequestNotifications() : await Notification.requestPermission();
    setNotificationPermission(permission);
    setStatus(permission === "granted" ? "Admin notifications enabled." : "Notifications are blocked or not allowed yet.");
  }

  const counts = {
    Memberships: data?.stats.pendingKids,
    Activities: data?.stats.registered,
    "Promotions & Updates": data?.notifications.length,
    Business: data?.redemptions.length,
    "Referral Dashboard": data?.stats.totalReferrals,
    Analytics: data?.analytics.appInstalls,
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
          <DashboardHeader
            section={activeSection}
            loading={busy}
            notificationPermission={notificationPermission}
            onRefresh={loadData}
            onEnableNotifications={enableAdminNotifications}
            onAddBrand={() => setModal("brand")}
            onPostUpdate={() => setModal("notification")}
            onReferralSettings={() => setModal("referral-settings")}
          />
          <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:pt-[98px]">
            {status && <StatusBanner message={status} loading={busy || status.startsWith("Loading")} />}
            {!data && !status && <StatusBanner message="No admin data loaded yet." />}
            {data && activeSection === "Memberships" && (
              <Memberships
                data={data}
                onKidStatus={(kidId, nextStatus) =>
                  runAction("Updating child profile...", () => postJson("/api/admin/kids/status", { kidId, status: nextStatus }))
                }
                onRemoveMember={(member) => {
                  if (!window.confirm(`Remove ${member.family}? This deletes the parent account and child profiles, so the same mobile number can register again.`)) return;
                  void runAction("Removing member profile...", () => requestJson("/api/admin/members", { method: "DELETE", body: { memberId: member.id } }));
                }}
              />
            )}
            {data && activeSection === "Activities" && (
              <Activities
                data={data}
                onCreateEvent={(body) => runAction("Saving activity...", () => postJson("/api/admin/events", body))}
                onUpdateEvent={(eventId, body) => runAction("Updating activity...", () => requestJson("/api/admin/events", { method: "PATCH", body: { ...body, eventId } }))}
                onDeleteEvent={(eventId) => runAction("Deleting activity...", () => requestJson("/api/admin/events", { method: "DELETE", body: { eventId } }))}
                onCheckIn={(bookingId) => runAction("Checking in participant and awarding points...", () => postJson("/api/admin/bookings/check-in", { bookingId }))}
              />
            )}
            {data && activeSection === "Promotions & Updates" && (
              <Promotions
                data={data}
                onPostUpdate={() => setModal("notification")}
                onCreateHeroSlide={(body) => runAction("Adding hero slide...", () => postJson("/api/admin/hero-slides", body))}
                onUpdateHeroSlide={(slideId, body) => runAction("Updating hero slide...", () => requestJson("/api/admin/hero-slides", { method: "PATCH", body: { ...body, slideId } }))}
                onDeleteHeroSlide={(slideId) => runAction("Removing hero slide...", () => requestJson("/api/admin/hero-slides", { method: "DELETE", body: { slideId } }))}
              />
            )}
            {data && activeSection === "Business" && (
              <Business
                data={data}
                onAddBrand={() => setModal("brand")}
                onBrandStatus={(brandId, active) =>
                  runAction(`${active ? "Enabling" : "Disabling"} brand...`, () => requestJson("/api/admin/brands", { method: "PATCH", body: { brandId, active } }))
                }
                onEditBrand={setEditingBrand}
                onRemoveBrand={(brand) => {
                  if (!window.confirm(`Remove ${brand.name}? Existing issued vouchers will stay in history.`)) return;
                  void runAction("Removing reward brand...", () => requestJson("/api/admin/brands", { method: "DELETE", body: { brandId: brand.id } }));
                }}
                onRedemptionStatus={(redemptionId, nextStatus) =>
                  runAction("Updating voucher status...", () => postJson("/api/admin/redemptions/status", { redemptionId, status: nextStatus }))
                }
              />
            )}
            {data && activeSection === "Referral Dashboard" && <ReferralDashboard data={data} />}
            {data && activeSection === "Analytics" && <Analytics data={data} />}
          </div>
        </section>
      </div>

      {modal === "brand" && <BrandModal onClose={() => setModal(null)} onSubmit={(body) => runAction("Adding reward brand...", () => postJson("/api/admin/brands", body)).then(() => setModal(null))} />}
      {editingBrand && (
        <BrandModal
          brand={editingBrand}
          onClose={() => setEditingBrand(null)}
          onSubmit={(body) => runAction("Updating reward brand...", () => requestJson("/api/admin/brands", { method: "PATCH", body: { ...body, brandId: editingBrand.id } })).then(() => setEditingBrand(null))}
        />
      )}
      {modal === "notification" && <NotificationModal onClose={() => setModal(null)} onSubmit={(body) => runAction("Publishing update...", () => postJson("/api/admin/notifications", body)).then(() => setModal(null))} />}
      {modal === "referral-settings" && <ReferralSettingsModal onClose={() => setModal(null)} />}
      {comingSoon && <ComingSoonModal title={comingSoon} onClose={() => setComingSoon(null)} />}
    </main>
  );
}

function DashboardHeader({
  section,
  loading,
  notificationPermission,
  onRefresh,
  onEnableNotifications,
  onAddBrand,
  onPostUpdate,
  onReferralSettings,
}: {
  section: Section;
  loading: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  onRefresh: () => void;
  onEnableNotifications: () => void;
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
    Analytics: "Track app installs and high-level platform usage",
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-[#e7e1fb] bg-white px-4 py-3 shadow-sm sm:px-6 lg:fixed lg:left-[240px] lg:right-0 lg:top-0 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">{section}</h1>
          <p className="mt-1 text-xs font-semibold text-[#8f8ba6] sm:text-sm">{copy[section]}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {notificationPermission !== "granted" && notificationPermission !== "unsupported" && <PillButton icon={<Bell size={17} />} label="Enable Alerts" muted onClick={onEnableNotifications} />}
          <PillButton icon={<RefreshCw size={17} className={loading ? "animate-spin" : ""} />} label="Refresh" muted onClick={onRefresh} />
          {section === "Business" && <PillButton icon={<CirclePlus size={18} />} label="Add Brand" onClick={onAddBrand} />}
          {section === "Promotions & Updates" && <PillButton icon={<CirclePlus size={18} />} label="Post Update" onClick={onPostUpdate} />}
          {section === "Referral Dashboard" && <PillButton icon={<Settings size={18} />} label="Referral Settings" onClick={onReferralSettings} />}
        </div>
      </div>
    </header>
  );
}

function Memberships({
  data,
  onKidStatus,
  onRemoveMember,
}: {
  data: AdminData;
  onKidStatus: (kidId: number, status: "approved" | "rejected") => void;
  onRemoveMember: (member: AdminMember) => void;
}) {
  const [membershipTab, setMembershipTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [ageFilter, setAgeFilter] = useState<MembershipAgeFilter>("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [localityFilter, setLocalityFilter] = useState("all");
  const [pointsFilter, setPointsFilter] = useState<MembershipPointsFilter>("all");
  const [viewMode, setViewMode] = useState<MembershipViewMode>("grid");
  const schoolOptions = useMemo(() => uniqueKidValues(data.members, "school"), [data.members]);
  const localityOptions = useMemo(() => uniqueKidValues(data.members, "locality"), [data.members]);
  const filteredMembers = useMemo(
    () => filterMembers(data.members, { searchTerm, ageFilter, schoolFilter, localityFilter, pointsFilter }),
    [ageFilter, data.members, localityFilter, pointsFilter, schoolFilter, searchTerm],
  );
  const filtersActive = Boolean(searchTerm.trim()) || ageFilter !== "all" || schoolFilter !== "all" || localityFilter !== "all" || pointsFilter !== "all";
  const visibleKids = filteredMembers.reduce((total, member) => total + member.kids.length, 0);

  function clearFilters() {
    setSearchTerm("");
    setAgeFilter("all");
    setSchoolFilter("all");
    setLocalityFilter("all");
    setPointsFilter("all");
  }

  function exportFilteredMembers() {
    downloadCsv(`konnectly-members-${new Date().toISOString().slice(0, 10)}.csv`, buildMembersCsv(filteredMembers));
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Parent Members" value={data.stats.parents.toString()} note="Live DB count" tone="dark" />
        <StatCard title="Kids Members" value={data.stats.kids.toString()} note={`${data.stats.activeKids} approved`} tone="purple" />
        <StatCard title="Pending Approvals" value={data.stats.pendingKids.toString()} note="Child profiles awaiting" tone="amber" />
        <StatCard title="Paid Bookings" value={data.stats.paidBookings.toString()} note={`${data.stats.checkedIn} checked in`} tone="dark" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedTabs tabs={["Active Memberships", "Pending Approvals"]} activeIndex={membershipTab} badges={[data.members.length, data.pendingKids.length]} onSelect={setMembershipTab} />
        {membershipTab === 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <PillButton icon={<Download size={17} />} label="Export Filtered" muted onClick={exportFilteredMembers} />
            <MembershipViewToggle viewMode={viewMode} onViewMode={setViewMode} />
          </div>
        )}
      </div>

      {membershipTab === 0 ? (
        <div className="space-y-4">
          <MembershipFilterBar
            searchTerm={searchTerm}
            ageFilter={ageFilter}
            schoolFilter={schoolFilter}
            localityFilter={localityFilter}
            pointsFilter={pointsFilter}
            schools={schoolOptions}
            localities={localityOptions}
            onSearch={setSearchTerm}
            onAgeFilter={setAgeFilter}
            onSchoolFilter={setSchoolFilter}
            onLocalityFilter={setLocalityFilter}
            onPointsFilter={setPointsFilter}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-black text-[#8f8ba6]">
              Showing {filteredMembers.length} of {data.members.length} families
              <span className="ml-1 text-[#5b45d1]">({visibleKids} kids)</span>
            </p>
            {filtersActive && <SmallButton label="Clear Filters" onClick={clearFilters} />}
          </div>
          {data.members.length === 0 ? (
            <EmptyState text="No parent members found." />
          ) : filteredMembers.length === 0 ? (
            <EmptyState text="No memberships match these filters." />
          ) : (
            <div className={viewMode === "grid" ? "grid gap-4 2xl:grid-cols-2" : "space-y-4"}>
              {filteredMembers.map((member) => <MemberCard key={member.id} member={member} onRemove={() => onRemoveMember(member)} />)}
            </div>
          )}
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

function MembershipFilterBar({
  searchTerm,
  ageFilter,
  schoolFilter,
  localityFilter,
  pointsFilter,
  schools,
  localities,
  onSearch,
  onAgeFilter,
  onSchoolFilter,
  onLocalityFilter,
  onPointsFilter,
}: {
  searchTerm: string;
  ageFilter: MembershipAgeFilter;
  schoolFilter: string;
  localityFilter: string;
  pointsFilter: MembershipPointsFilter;
  schools: string[];
  localities: string[];
  onSearch: (value: string) => void;
  onAgeFilter: (value: MembershipAgeFilter) => void;
  onSchoolFilter: (value: string) => void;
  onLocalityFilter: (value: string) => void;
  onPointsFilter: (value: MembershipPointsFilter) => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(220px,1.45fr)_minmax(140px,0.7fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(140px,0.7fr)] xl:items-center">
      <SearchBox placeholder="Search by name, phone, Konnect code" value={searchTerm} onChange={onSearch} />
      <FilterSelect
        ariaLabel="Filter memberships by age"
        value={ageFilter}
        options={membershipAgeOptions}
        onChange={(value) => onAgeFilter(value as MembershipAgeFilter)}
      />
      <FilterSelect
        ariaLabel="Filter memberships by school"
        value={schoolFilter}
        options={[{ value: "all", label: "All Schools" }, ...schools.map((school) => ({ value: school, label: school }))]}
        onChange={onSchoolFilter}
      />
      <FilterSelect
        ariaLabel="Filter memberships by locality"
        value={localityFilter}
        options={[{ value: "all", label: "All Localities" }, ...localities.map((locality) => ({ value: locality, label: locality }))]}
        onChange={onLocalityFilter}
      />
      <FilterSelect
        ariaLabel="Filter memberships by points"
        value={pointsFilter}
        options={membershipPointsOptions}
        onChange={(value) => onPointsFilter(value as MembershipPointsFilter)}
      />
    </div>
  );
}

function MembershipViewToggle({ viewMode, onViewMode }: { viewMode: MembershipViewMode; onViewMode: (value: MembershipViewMode) => void }) {
  return (
    <div className="grid w-fit grid-cols-2 gap-1 rounded-2xl border border-[#e7e1fb] bg-white p-1 shadow-sm">
      <MembershipViewButton label="Grid view" active={viewMode === "grid"} onClick={() => onViewMode("grid")} icon={<Grid2X2 size={18} />} />
      <MembershipViewButton label="List view" active={viewMode === "list"} onClick={() => onViewMode("list")} icon={<List size={19} />} />
    </div>
  );
}

function FilterSelect({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block min-w-0">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full min-w-0 appearance-none rounded-2xl border border-[#e7e1fb] bg-white py-2 pl-4 pr-10 text-sm font-black text-[#161332] shadow-sm outline-none transition focus:border-[#604bd1] focus:ring-2 focus:ring-[#604bd1]/15"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#161332]" />
    </label>
  );
}

function MembershipViewButton({ label, active, icon, onClick }: { label: string; active: boolean; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-xl transition ${
        active ? "bg-[#604bd1] text-white shadow-lg shadow-[#604bd1]/20" : "bg-transparent text-[#8f8ba6] hover:bg-[#f6f3ff] hover:text-[#5b45d1]"
      }`}
      type="button"
    >
      {icon}
    </button>
  );
}

function filterMembers(
  members: AdminMember[],
  filters: {
    searchTerm: string;
    ageFilter: MembershipAgeFilter;
    schoolFilter: string;
    localityFilter: string;
    pointsFilter: MembershipPointsFilter;
  },
) {
  const hasProfileFilters = filters.ageFilter !== "all" || filters.schoolFilter !== "all" || filters.localityFilter !== "all" || filters.pointsFilter !== "all";
  return members.flatMap((member) => {
    const parentMatchesSearch = matchesSearch(
      [member.family, member.father, member.mother, member.fatherPhone, member.motherPhone, member.address, member.code],
      filters.searchTerm,
    );
    const matchingKids = member.kids.filter((kid) => {
      if (!kidMatchesMembershipFilters(kid, filters)) return false;
      if (!filters.searchTerm.trim() || parentMatchesSearch) return true;
      return matchesSearch([kid.name, kid.school, kid.locality, kid.grade, kid.phone, kid.parent], filters.searchTerm);
    });

    if (!hasProfileFilters && (!filters.searchTerm.trim() || parentMatchesSearch)) return [{ ...member, kids: member.kids }];
    if (matchingKids.length > 0) return [{ ...member, kids: matchingKids }];
    return [];
  });
}

function kidMatchesMembershipFilters(
  kid: AdminKid,
  filters: {
    ageFilter: MembershipAgeFilter;
    schoolFilter: string;
    localityFilter: string;
    pointsFilter: MembershipPointsFilter;
  },
) {
  if (!matchesAgeFilter(parseKidAge(kid.age), filters.ageFilter)) return false;
  if (filters.schoolFilter !== "all" && kid.school.trim() !== filters.schoolFilter) return false;
  if (filters.localityFilter !== "all" && kid.locality.trim() !== filters.localityFilter) return false;
  return matchesPointsFilter(kid.points, filters.pointsFilter);
}

function matchesAgeFilter(age: number, filter: MembershipAgeFilter) {
  if (filter === "all") return true;
  if (filter === "4-6") return age >= 4 && age <= 6;
  if (filter === "7-9") return age >= 7 && age <= 9;
  if (filter === "10-12") return age >= 10 && age <= 12;
  return age >= 12 && age <= 18;
}

function matchesPointsFilter(points: number, filter: MembershipPointsFilter) {
  if (filter === "all") return true;
  if (filter === "0-200") return points >= 0 && points <= 200;
  if (filter === "200-500") return points >= 200 && points <= 500;
  return points >= 500;
}

function parseKidAge(age: string) {
  return Number(age.match(/\d+/)?.[0] ?? 0);
}

function uniqueKidValues(members: AdminMember[], key: "school" | "locality") {
  return Array.from(
    new Set(
      members.flatMap((member) =>
        member.kids
          .map((kid) => kid[key].trim())
          .filter((value) => value && value !== "-"),
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function matchesSearch(values: string[], searchTerm: string) {
  const query = normalizeSearch(searchTerm);
  if (!query) return true;
  const haystack = normalizeSearch(values.join(" "));
  const compactQuery = compactSearch(query);
  return haystack.includes(query) || Boolean(compactQuery && compactSearch(haystack).includes(compactQuery));
}

function normalizeSearch(value: string) {
  return value.toLowerCase().trim();
}

function compactSearch(value: string) {
  return value.replace(/[^a-z0-9]/g, "");
}

function buildMembersCsv(members: AdminMember[]) {
  const rows = members.flatMap((member) => {
    const base = [
      member.family,
      member.father,
      member.fatherPhone,
      member.mother,
      member.motherPhone,
      member.address,
      member.code,
      member.plan,
      member.active ? "Active" : "Inactive",
    ];

    if (member.kids.length === 0) return [[...base, "", "", "", "", "", "", "", ""]];
    return member.kids.map((kid) => [
      ...base,
      kid.name,
      kid.age,
      kid.grade,
      kid.dob,
      kid.school,
      kid.locality,
      String(kid.points),
      kid.status,
    ]);
  });

  return [
    [
      "Family",
      "Primary Parent",
      "Primary Phone",
      "Alternate Parent",
      "Alternate Phone",
      "Address",
      "Konnect Code",
      "Plan",
      "Membership Status",
      "Kid Name",
      "Kid Age",
      "Grade",
      "DOB",
      "School",
      "Locality",
      "Kid Points",
      "Kid Status",
    ],
    ...rows,
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

function csvCell(value: string) {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  return /[",\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
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
  onUpdateEvent,
  onDeleteEvent,
  onCheckIn,
}: {
  data: AdminData;
  onCreateEvent: (body: Record<string, unknown>) => void;
  onUpdateEvent: (eventId: number, body: Record<string, unknown>) => void;
  onDeleteEvent: (eventId: number) => void;
  onCheckIn: (bookingId: number) => void;
}) {
  const [activityTab, setActivityTab] = useState(0);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = Object.fromEntries(form) as Record<string, unknown>;
    body.image = await fileToDataUrl(form.get("image"));
    if (editingEvent) {
      onUpdateEvent(editingEvent.id, body);
      setEditingEvent(null);
    } else {
      onCreateEvent(body);
    }
    formElement.reset();
  }

  function deleteEvent(event: AdminEvent) {
    if (!window.confirm(`Delete ${event.title}? It will be removed from the user app.`)) return;
    onDeleteEvent(event.id);
    if (editingEvent?.id === event.id) setEditingEvent(null);
  }

  return (
    <div className="space-y-5">
      <SegmentedTabs tabs={["Add / Edit Event", "Live Event Status"]} activeIndex={activityTab} onSelect={setActivityTab} />
      {activityTab === 0 ? (
        <div className="space-y-5">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black sm:text-xl">{editingEvent ? "Edit Activity" : "Create New Activity"}</h2>
              {editingEvent && <SmallButton label="Cancel Edit" onClick={() => setEditingEvent(null)} />}
            </div>
            <ActivityForm key={editingEvent?.id ?? "new"} event={editingEvent} onSubmit={submit} />
          </Panel>
          <EventList events={data.events} participants={data.liveParticipants} onEdit={setEditingEvent} onDelete={deleteEvent} />
        </div>
      ) : (
        <LiveEventStatus data={data} onCheckIn={onCheckIn} />
      )}
    </div>
  );
}

function ActivityForm({ event, onSubmit }: { event: AdminEvent | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4 lg:grid-cols-2">
      <Field name="title" label="Activity Name *" placeholder="Summer Art Camp 2026" required defaultValue={event?.title ?? ""} />
      <Field name="venue" label="Venue *" placeholder="DLF Phase 2 Community Hall" required defaultValue={event?.venue ?? ""} />
      <Field name="date" label="Date" type="date" defaultValue={event?.dateValue ?? ""} />
      <Field name="time" label="Time" type="time" defaultValue={event?.timeValue ?? ""} />
      <Field name="price" label="Registration Fee (Rs)" type="number" min="0" defaultValue={event?.price ?? 0} />
      <Field name="pointsEarnable" label="Konnect Points Earned" type="number" min="0" defaultValue={event?.pointsEarnable ?? 100} />
      <Field name="capacity" label="Max Participants" type="number" min="1" placeholder="Leave blank for unlimited" defaultValue={event?.capacity || ""} />
      <SelectField name="category" label="Category" options={["Explore", "Engage", "Experience", "Arts & Crafts", "Sports"]} defaultValue={event?.category ?? "Experience"} />
      <FileField name="image" label="Event Image / Banner" />
      {event?.image && (
        <div className="grid gap-2">
          <span className="text-xs font-black">Current Banner</span>
          <img src={event.image} alt={`${event.title} banner`} className="h-32 w-full rounded-2xl object-cover ring-2 ring-[#ddd6fb]" />
        </div>
      )}
      <Field name="minAge" label="Min Age" type="number" min="0" defaultValue={event?.minAge || ""} />
      <Field name="maxAge" label="Max Age" type="number" min="0" defaultValue={event?.maxAge || ""} />
      <SelectField name="gender" label="Gender" options={["All", "Boy", "Girl"]} defaultValue={event?.gender ?? "All"} />
      <Field name="restrictedArea" label="Restricted Area" placeholder="Optional city/locality" defaultValue={event?.restrictedArea ?? ""} />
      <label className="grid gap-2 lg:col-span-2">
        <span className="text-xs font-black">Description</span>
        <textarea name="description" defaultValue={event?.description ?? ""} className="min-h-24 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#604bd1]" />
      </label>
      <div className="lg:col-span-2">
        <PillButton label={event ? "Update Activity" : "Save Activity"} submit />
      </div>
    </form>
  );
}

function EventList({
  events,
  participants,
  onEdit,
  onDelete,
}: {
  events: AdminEvent[];
  participants: AdminData["liveParticipants"];
  onEdit: (event: AdminEvent) => void;
  onDelete: (event: AdminEvent) => void;
}) {
  const registeredCounts = participants.reduce<Record<number, number>>((acc, participant) => {
    acc[participant.eventId] = (acc[participant.eventId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-black text-[#161332]">Existing Activities</h2>
      <Panel className="overflow-x-auto p-0">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#ddd6fb] bg-[#f5f2ff] text-xs uppercase tracking-[0.2em] text-[#8f8ba6]">
              {["Activity", "Date", "Venue", "Fee", "Points", "Registered", "Actions"].map((head) => (
                <th key={head} className="px-5 py-4 font-black">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center font-black text-[#8f8ba6]" colSpan={7}>No events created yet. Add one and it will appear in the user app.</td>
              </tr>
            )}
            {events.map((event, index) => {
              const registered = registeredCounts[event.id] ?? 0;
              return (
                <tr key={event.id} className="border-b border-[#eee9fb] last:border-b-0">
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      {event.image && <img src={event.image} alt="" className="h-12 w-16 rounded-xl object-cover" />}
                      <div className="min-w-0">
                        <p className="font-black">{event.title}</p>
                        {index === 0 && <span className="mt-1 inline-flex rounded-full bg-green-100 px-3 py-1 text-[11px] font-black text-green-700">Live</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-5 font-bold">{event.date}</td>
                  <td className="px-5 py-5 font-bold">{event.venue || "Venue TBA"}</td>
                  <td className="px-5 py-5 font-black">{event.price > 0 ? `Rs ${event.price}` : "Free"}</td>
                  <td className="px-5 py-5 font-black"><span className="text-[#d49b00]">★</span> {event.pointsEarnable} pts</td>
                  <td className="px-5 py-5 font-black">{event.capacity ? `${registered}/${event.capacity}` : registered}</td>
                  <td className="px-5 py-5">
                    <div className="flex flex-wrap gap-2">
                      <SmallButton label="Edit" onClick={() => onEdit(event)} />
                      <SmallButton label="Delete" danger onClick={() => onDelete(event)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </section>
  );
}

function LiveEventStatus({ data, onCheckIn }: { data: AdminData; onCheckIn: (bookingId: number) => void }) {
  const eventCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const participant of data.liveParticipants) counts.set(participant.eventId, (counts.get(participant.eventId) ?? 0) + 1);
    return counts;
  }, [data.liveParticipants]);
  const defaultEventId = data.events.find((event) => eventCounts.has(event.id))?.id ?? data.events[0]?.id ?? 0;
  const [selectedEventId, setSelectedEventId] = useState(0);
  const activeEventId = selectedEventId && data.events.some((event) => event.id === selectedEventId) ? selectedEventId : defaultEventId;
  const selectedEvent = data.events.find((event) => event.id === activeEventId) ?? null;
  const selectedParticipants = data.liveParticipants.filter((participant) => participant.eventId === activeEventId);
  const checkedIn = selectedParticipants.filter((participant) => participant.checkIn !== "Not yet").length;
  const paid = selectedParticipants.filter((participant) => participant.paid).length;
  const eventOptions = data.events.map((event) => ({
    value: String(event.id),
    label: `${event.title} - ${formatAdminEventDate(event.date)}`,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-[#e9e4fb] xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-black sm:text-xl">Live Event Status</h2>
          <p className="mt-1 text-xs font-bold text-[#8f8ba6]">
            {selectedEvent ? `${selectedEvent.venue || "Venue TBA"} | ${formatAdminEventDate(selectedEvent.date)}` : "Select an event to view check-in status"}
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center xl:w-[520px]">
          <FilterSelect
            ariaLabel="Select event for live status"
            value={activeEventId ? String(activeEventId) : ""}
            options={eventOptions.length ? eventOptions : [{ value: "", label: "No events available" }]}
            onChange={(value) => setSelectedEventId(Number(value))}
          />
          <span className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-green-100 px-4 text-xs font-black text-green-700">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Live
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Registered" value={selectedParticipants.length.toString()} note={selectedEvent?.title || "Selected event"} tone="dark" />
        <StatCard title="Checked In" value={checkedIn.toString()} note="Attendance marked" tone="purple" />
        <StatCard title="Payment Status" value={`${paid}/${selectedParticipants.length}`} note="Success bookings" tone="amber" />
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
            {selectedParticipants.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center font-black text-[#8f8ba6]" colSpan={8}>No bookings for this event yet.</td>
              </tr>
            )}
            {selectedParticipants.map((participant, index) => {
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

function Promotions({
  data,
  onPostUpdate,
  onCreateHeroSlide,
  onUpdateHeroSlide,
  onDeleteHeroSlide,
}: {
  data: AdminData;
  onPostUpdate: () => void;
  onCreateHeroSlide: (body: Record<string, unknown>) => void;
  onUpdateHeroSlide: (slideId: number, body: Record<string, unknown>) => void;
  onDeleteHeroSlide: (slideId: number) => void;
}) {
  const [promoTab, setPromoTab] = useState(0);
  const [editingSlide, setEditingSlide] = useState<AdminHeroSlide | null>(null);

  function submitHeroSlide(body: Record<string, unknown>) {
    if (editingSlide) {
      onUpdateHeroSlide(editingSlide.id, body);
      setEditingSlide(null);
      return;
    }
    onCreateHeroSlide(body);
  }

  function removeHeroSlide(slide: AdminHeroSlide) {
    if (!window.confirm(`Remove ${slide.title}? It will be removed from the user app.`)) return;
    onDeleteHeroSlide(slide.id);
    if (editingSlide?.id === slide.id) setEditingSlide(null);
  }

  function focusHeroSlideForm() {
    window.setTimeout(() => document.getElementById("hero-slide-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function startNewHeroSlide() {
    setEditingSlide(null);
    focusHeroSlideForm();
  }

  function startEditHeroSlide(slide: AdminHeroSlide) {
    setEditingSlide(slide);
    focusHeroSlideForm();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedTabs tabs={["Hero Slides", "Updates & Push", "Reward Promos"]} activeIndex={promoTab} onSelect={setPromoTab} />
        {promoTab === 0 && <PillButton icon={<CirclePlus size={18} />} label="Add New Slide" onClick={startNewHeroSlide} />}
        {promoTab === 1 && <PillButton icon={<CirclePlus size={18} />} label="Post Update" onClick={onPostUpdate} />}
      </div>

      {promoTab === 0 && (
        <div className="space-y-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-black sm:text-xl">Hero Slides</h2>
            <p className="max-w-2xl text-sm font-bold text-[#8f8ba6]">Manage the banners families see on the app home screen. Keep images bright, readable, and event-focused.</p>
          </div>
          <HeroSlidesList slides={data.heroSlides} onEdit={startEditHeroSlide} onRemove={removeHeroSlide} />
          <div id="hero-slide-form">
            <HeroSlideForm key={editingSlide?.id ?? "new"} slide={editingSlide} onSubmit={submitHeroSlide} onCancel={() => setEditingSlide(null)} nextOrder={data.heroSlides.length + 1} />
          </div>
        </div>
      )}
      {promoTab === 1 && <UpdatesPush notifications={data.notifications} />}
      {promoTab === 2 && <RewardPromos brands={data.brands} />}
    </div>
  );
}

function HeroSlideForm({
  slide,
  onSubmit,
  onCancel,
  nextOrder,
}: {
  slide: AdminHeroSlide | null;
  onSubmit: (body: Record<string, unknown>) => void;
  onCancel: () => void;
  nextOrder: number;
}) {
  const editing = Boolean(slide);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    onSubmit({
      title: form.get("title"),
      subtitle: form.get("subtitle"),
      ctaLabel: form.get("ctaLabel"),
      target: form.get("target"),
      sortOrder: form.get("sortOrder"),
      active: form.get("active") === "on",
      image: await fileToDataUrl(form.get("image")),
    });
    formElement.reset();
  }

  return (
    <Panel className="min-w-0 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f8ba6]">{editing ? "Editing selected slide" : "Create new banner"}</p>
          <h2 className="mt-1 text-lg font-black">{editing ? "Edit Hero Slide" : "Add Hero Slide"}</h2>
          <p className="mt-1 text-sm font-bold text-[#8f8ba6]">Form is placed below the slide list so the current banners stay easy to scan.</p>
        </div>
        {editing && <SmallButton label="Cancel" onClick={onCancel} />}
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="title" label="Slide Title *" required placeholder="Summer Creative Camp" defaultValue={slide?.title ?? ""} />
            <Field name="subtitle" label="Subtitle" placeholder="Book activities and earn Konnect Points" defaultValue={slide?.subtitle ?? ""} />
          </div>
          <FileField name="image" label={editing ? "Replace Hero Image" : "Hero Image *"} required={!editing} />
          <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(112px,150px)]">
            <Field name="ctaLabel" label="Button Text" placeholder="Explore" defaultValue={slide?.ctaLabel ?? ""} />
            <Field name="sortOrder" label="Order" type="number" min="0" defaultValue={String(slide?.sortOrder ?? nextOrder)} />
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
            <SelectField label="Click Action" name="target" options={["activities", "rewards", "refer", "install", "none"]} defaultValue={slide?.target ?? "activities"} />
            <label className="flex items-center justify-between gap-4 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3">
              <span className="text-xs font-black">Active</span>
              <input name="active" type="checkbox" defaultChecked={slide?.active ?? true} className="h-5 w-5 accent-[#604bd1]" />
            </label>
          </div>
          <PillButton label={editing ? "Save Changes" : "Save Slide"} submit />
        </div>
        <div className="min-w-0">
          {editing && slide?.image ? (
            <div className="grid gap-2">
              <span className="text-xs font-black">Current Hero Image</span>
              <div className="overflow-hidden rounded-[18px] border border-[#ddd6fb] bg-[#f8f7ff]">
                <img src={slide.image} alt={`${slide.title} hero`} className="h-44 w-full object-cover" />
              </div>
              <p className="text-xs font-bold text-[#8f8ba6]">Leave image blank to keep the current banner.</p>
            </div>
          ) : (
            <div className="grid min-h-[190px] place-items-center rounded-[18px] border-2 border-dashed border-[#ddd6fb] bg-[#f8f7ff] px-5 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#604bd1] text-white"><Grid2X2 size={21} /></div>
                <p className="mt-3 text-sm font-black text-[#5b45d1]">Banner preview appears here while editing</p>
                <p className="mt-1 text-xs font-bold text-[#8f8ba6]">Use a wide event or reward image for best results.</p>
              </div>
            </div>
          )}
        </div>
      </form>
    </Panel>
  );
}

function HeroSlidesList({ slides, onEdit, onRemove }: { slides: AdminHeroSlide[]; onEdit: (slide: AdminHeroSlide) => void; onRemove: (slide: AdminHeroSlide) => void }) {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {slides.length === 0 && <EmptyState text="No hero slides added yet." />}
      {slides.map((slide, index) => (
        <Panel key={slide.id} className="overflow-hidden p-0">
          <div className="relative h-48 bg-[#6754d6]">
            <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1c173d]/78 via-[#1c173d]/16 to-transparent" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <Badge tone={slide.active ? "green" : "gold"}>{slide.active ? "Visible" : "Hidden"}</Badge>
              <Badge tone="soft">Slide {index + 1}</Badge>
            </div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Home banner</p>
              <h3 className="mt-1 line-clamp-2 text-xl font-black">{slide.title}</h3>
            </div>
          </div>
          <div className="p-5">
            <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#8f8ba6]">{slide.subtitle || "No subtitle added"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="purple">{slide.target}</Badge>
              <Badge tone="soft">{slide.ctaLabel || "Explore"}</Badge>
              <Badge tone="soft">Order {slide.sortOrder}</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <SmallButton label="Edit" onClick={() => onEdit(slide)} />
              <SmallButton label="Remove" danger onClick={() => onRemove(slide)} />
            </div>
          </div>
        </Panel>
      ))}
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
  onBrandStatus,
  onEditBrand,
  onRemoveBrand,
  onRedemptionStatus,
}: {
  data: AdminData;
  onAddBrand: () => void;
  onBrandStatus: (brandId: number, active: boolean) => void;
  onEditBrand: (brand: AdminBrand) => void;
  onRemoveBrand: (brand: AdminBrand) => void;
  onRedemptionStatus: (redemptionId: number, status: "issued" | "redeemed" | "cancelled") => void;
}) {
  const [businessTab, setBusinessTab] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedTabs tabs={["Brands", "Voucher Redemptions"]} activeIndex={businessTab} badges={[data.brands.length, data.redemptions.length]} onSelect={setBusinessTab} />
        {businessTab === 0 && <PillButton icon={<CirclePlus size={18} />} label="Add Brand" onClick={onAddBrand} />}
      </div>
      {businessTab === 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.brands.length === 0 && <EmptyState text="No reward brands yet." />}
          {data.brands.map((brand) => <BrandCard key={brand.id} brand={brand} onStatusChange={onBrandStatus} onEdit={() => onEditBrand(brand)} onRemove={() => onRemoveBrand(brand)} />)}
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

function Analytics({ data }: { data: AdminData }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="App Installs" value={data.analytics.appInstalls.toString()} note="Installed devices tracked" icon={<Download size={24} />} green />
        <MetricCard title="Installed Users" value={data.analytics.uniqueInstalledUsers.toString()} note="Unique parent accounts" icon={<Users size={24} />} />
        <MetricCard title="Today" value={data.analytics.installsToday.toString()} note="Installs since midnight" icon={<BarChart3 size={24} />} amber />
        <MetricCard title="Last 7 Days" value={data.analytics.installsLast7Days.toString()} note="Recent install activity" icon={<CalendarDays size={24} />} />
      </div>

      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">App Install Analytics</h2>
            <p className="mt-1 text-sm font-bold text-[#8f8ba6]">
              Latest install tracked: <span className="text-[#5b45d1]">{data.analytics.latestInstall}</span>
            </p>
          </div>
          <Badge tone="green">{data.analytics.appInstalls} installs</Badge>
        </div>
        <div className="mt-5 rounded-2xl bg-[#f8f7ff] p-4 text-sm font-bold leading-6 text-[#8f8ba6]">
          Counts update when a logged-in parent installs the PWA or opens it from home screen in standalone mode. Browser support can vary, so standalone opens help catch iPhone installs too.
        </div>
      </Panel>

      <Panel className="overflow-x-auto p-0">
        <div className="flex items-center justify-between bg-[#f0ebff] px-6 py-5">
          <p className="font-black">Installed By</p>
          <Badge tone="green">{data.analytics.recentInstalls.length} recent</Badge>
        </div>
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-t border-[#e7e1fb] text-xs uppercase tracking-[0.2em] text-[#8f8ba6]">
              {["Parent", "Mobile", "Source", "Installed", "Last Seen"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.analytics.recentInstalls.length === 0 && (
              <tr><td className="px-4 py-8 text-center font-black text-[#8f8ba6]" colSpan={5}>No app installs tracked yet.</td></tr>
            )}
            {data.analytics.recentInstalls.map((install) => (
              <tr key={install.id} className="border-t border-[#e7e1fb]">
                <td className="px-4 py-3 font-black">{install.parentName}</td>
                <td className="px-4 py-3 font-bold">{install.mobile}</td>
                <td className="px-4 py-3"><Badge tone="soft">{install.source.replace(/_/g, " ")}</Badge></td>
                <td className="px-4 py-3 font-bold">{install.installedAt}</td>
                <td className="px-4 py-3 font-bold">{install.lastSeenAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
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

function BrandModal({ brand, onClose, onSubmit }: { brand?: AdminBrand; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      name: form.get("name"),
      pointsCost: form.get("pointsCost"),
      note: form.get("note"),
      description: form.get("description"),
      active: form.get("active") === "on",
      logo: await fileToDataUrl(form.get("logo")),
      image: await fileToDataUrl(form.get("image")),
    });
  }

  const editing = Boolean(brand);

  return (
    <AdminFormModal title={editing ? "Edit Reward Brand" : "Add Reward Brand"} icon={<Gift />} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field name="name" label="Brand Name *" required placeholder="Domino's Pizza" defaultValue={brand?.name ?? ""} />
        <Field name="pointsCost" label="Points Required" type="number" min="0" defaultValue={brand?.pointsCost ?? 250} />
        <Field name="note" label="Reward Note" placeholder="Flat 20% off on selected items" defaultValue={brand?.note ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FileField name="logo" label="Brand Logo" />
          <FileField name="image" label="Reward Photo / Banner" />
        </div>
        {editing && (
          <div className="rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3 text-xs font-bold leading-5 text-[#8f8ba6]">
            Leave logo/photo blank to keep the current images.
          </div>
        )}
        <label className="flex items-center justify-between gap-4 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3">
          <span>
            <span className="block text-xs font-black">Brand Active</span>
            <span className="text-xs font-bold text-[#8f8ba6]">Turning this off hides the reward in the user app.</span>
          </span>
          <input name="active" type="checkbox" defaultChecked={brand?.active ?? true} className="h-5 w-5 accent-[#604bd1]" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black">Description</span>
          <textarea name="description" defaultValue={brand?.description ?? ""} className="min-h-24 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#604bd1]" />
        </label>
        <FormActions onClose={onClose} primaryLabel={editing ? "Save Changes" : "Add Brand"} />
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
    <div className="fixed inset-0 z-[300] grid place-items-center overflow-y-auto bg-[#161332]/55 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 flex items-center justify-between border-b border-[#e7e1fb] px-5 py-4 sm:px-6 sm:py-5">
          <h2 className="flex items-center gap-3 text-xl font-black"><span className="text-[#604bd1]">{icon}</span>{title}</h2>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-[#f6f3ff] text-[#8f8ba6] transition hover:bg-[#e7ddff] hover:text-[#5b45d1]" type="button" aria-label="Close popup">
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}

function FormActions({ onClose, primaryLabel }: { onClose: () => void; primaryLabel: string }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-1 flex justify-end gap-3 border-t border-[#e7e1fb] bg-white/95 px-5 pt-5 backdrop-blur sm:-mx-6 sm:px-6">
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
          const count = item.section === "Settings" ? undefined : counts[item.section];
          return (
            <button key={item.section} onClick={() => onSelect(item.section)} className={`relative flex min-w-fit items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs font-black transition lg:w-full ${active ? "bg-white/18 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`} type="button">
              {active && <span className="absolute left-0 top-2 h-8 w-1 rounded-r-full bg-[#f8c400]" />}
              <span className="grid h-5 w-5 place-items-center text-white/70">{item.icon}</span>
              <span className="truncate">{item.section}</span>
              {typeof count === "number" && <span className="ml-auto rounded-full bg-[#f8c400] px-2.5 py-0.5 text-xs font-black text-[#25166f]">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MemberCard({ member, onRemove }: { member: AdminMember; onRemove: () => void }) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="relative bg-white px-4 py-4 sm:px-5">
        <span className="absolute right-6 top-6 h-4 w-4 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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
          <button
            onClick={onRemove}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
            type="button"
          >
            <Trash2 size={16} /> Remove Profile
          </button>
        </div>
      </div>
      <div className="grid gap-4 border-t border-[#e7e1fb] bg-[#f0ebff] p-4 md:grid-cols-2">
        <ParentMini role="Primary Parent" name={member.father} phone={member.fatherPhone} initials={member.initials} />
        <ParentMini role="Alternate Parent" name={member.mother} phone={member.motherPhone} initials={member.mother.slice(0, 1) || "P"} pink />
      </div>
      <div className="border-t border-[#e7e1fb] bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f8ba6]">Kids Profiles ({member.kids.length})</h4>
          {member.kids.length > 0 && <Badge tone="soft">{member.kids.filter((kid) => kid.status === "approved").length} approved</Badge>}
        </div>
        {member.kids.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#ddd6fb] bg-[#f8f7ff] px-4 py-4 text-xs font-black text-[#8f8ba6]">
            No child profiles added for this parent yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {member.kids.map((kid) => (
              <MemberKidRow key={kid.id} kid={kid} />
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function MemberKidRow({ kid }: { kid: AdminKid }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3">
      <KidPhoto kid={kid} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h5 className="text-sm font-black text-[#161332]">{kid.name}</h5>
          <Badge tone="gold">Age {kid.age.replace(" years", "")}</Badge>
          <Badge tone="purple">{kid.points} pts</Badge>
        </div>
        <p className="mt-1 text-xs font-bold text-[#8f8ba6]">
          {kid.grade} - {kid.school || "School not added"} - {kid.dob}
        </p>
      </div>
      <KidStatusPill status={kid.status} />
    </div>
  );
}

function KidPhoto({ kid }: { kid: AdminKid }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#ffe0ef] text-sm font-black text-[#161332]">
      {kid.photo ? <img src={kid.photo} alt="" className="h-full w-full object-cover" /> : kid.initials}
    </div>
  );
}

function KidStatusPill({ status }: { status: AdminKid["status"] }) {
  const styles = {
    approved: "bg-green-100 text-green-700",
    pending: "bg-[#fff2c7] text-[#c99000]",
    rejected: "bg-red-100 text-red-700",
  };

  return <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black capitalize ${styles[status]}`}>{status}</span>;
}

function BrandCard({
  brand,
  onStatusChange,
  onEdit,
  onRemove,
}: {
  brand: AdminBrand;
  onStatusChange: (brandId: number, active: boolean) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className={`relative h-32 overflow-hidden ${brand.color || "bg-[#6754d6]"}`}>
        {brand.image ? <img src={brand.image} alt={`${brand.name} reward`} className="h-full w-full object-cover" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.1),rgba(0,0,0,0.18))]" />}
      </div>
      <div className="relative p-5 pt-10">
        <div className="absolute -top-9 grid h-16 w-16 place-items-center rounded-2xl bg-white text-[#604bd1] shadow-lg">
          {brand.logo ? <img src={brand.logo} alt={`${brand.name} logo`} className="h-full w-full rounded-2xl object-contain p-2" /> : <Gift size={30} strokeWidth={2.4} />}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black">{brand.name}</h3>
            <p className="mt-2 text-xs font-semibold text-[#8f8ba6] sm:text-sm">{brand.email}</p>
          </div>
          <ToggleSwitch checked={brand.active} onChange={(active) => onStatusChange(brand.id, active)} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Badge tone="soft">{brand.code}</Badge>
          <Badge tone="gold">{brand.pointsCost} pts</Badge>
          <Badge tone={brand.active ? "green" : "gold"}>{brand.active ? "Active" : "Inactive"}</Badge>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <SmallButton label="Edit" onClick={onEdit} />
          <SmallButton label="Remove" danger onClick={onRemove} />
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

function SegmentedTabs({
  tabs,
  activeIndex,
  badge,
  badges,
  onSelect,
}: {
  tabs: string[];
  activeIndex: number;
  badge?: string;
  badges?: Array<number | string>;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="flex w-full gap-2 overflow-x-auto rounded-[18px] border border-[#e7e1fb] bg-white p-1.5 shadow-sm sm:w-fit">
      {tabs.map((tab, index) => {
        const tabBadge = badges?.[index] ?? (badge && index === 1 ? badge : undefined);
        return (
          <button key={tab} onClick={() => onSelect?.(index)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-black transition ${index === activeIndex ? "bg-[#604bd1] text-white shadow-lg shadow-[#604bd1]/20" : "text-[#8f8ba6] hover:bg-[#f6f3ff]"}`} type="button">
            {tab}
            {tabBadge !== undefined && <span className={`rounded-full px-2 py-0.5 text-xs font-black ${index === activeIndex ? "bg-white/20 text-white" : "bg-[#ff9d00] text-white"}`}>{tabBadge}</span>}
          </button>
        );
      })}
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
          <p className={`mt-2 truncate text-md font-black ${green ? "text-green-600" : amber ? "text-[#c99000]" : "text-[#1c173d]"}`}>{value}</p>
          <p className="mt-1 text-xs font-bold text-green-600">{note}</p>
        </div>
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f0ebff] text-[#8f6d19]">{icon}</div>
      </div>
    </Panel>
  );
}

function SearchBox({ placeholder, value, onChange }: { placeholder: string; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[#e7e1fb] bg-white px-4 text-xs font-semibold text-[#8f8ba6] shadow-sm">
      <Search size={19} className="text-[#5b45d1]" />
      <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder={placeholder} value={value} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-black">{label}</span>
      <input {...props} className="h-11 w-full min-w-0 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-2 text-sm font-bold outline-none transition focus:border-[#604bd1]" />
    </label>
  );
}

function FileField({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-black">{label}</span>
      <input name={name} type="file" accept="image/png,image/jpeg,image/webp" required={required} className="w-full min-w-0 rounded-2xl border-2 border-dashed border-[#ddd6fb] bg-[#f8f7ff] px-4 py-3 text-xs font-bold file:mr-3 file:rounded-full file:border-0 file:bg-[#604bd1] file:px-4 file:py-2 file:text-xs file:font-black file:text-white" />
    </label>
  );
}

function SelectField({ label, name, options, defaultValue }: { label: string; name: string; options: string[]; defaultValue?: string }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-black">{label}</span>
      <select name={name} defaultValue={defaultValue} className="h-11 w-full min-w-0 rounded-2xl border-2 border-[#ddd6fb] bg-[#f8f7ff] px-4 py-2 text-sm font-bold outline-none transition focus:border-[#604bd1]">
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

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${checked ? "bg-green-500" : "bg-[#d8d1ee]"}`}
    >
      <span className={`h-6 w-6 rounded-full bg-white shadow-md transition ${checked ? "translate-x-6" : "translate-x-0"}`} />
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

function formatAdminEventDate(value: string) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}

async function postJson(url: string, body: unknown) {
  return requestJson(url, { method: "POST", body });
}

async function requestJson(url: string, options: { method: "POST" | "PATCH" | "DELETE"; body: unknown }) {
  const response = await fetch(url, { method: options.method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.href = "/admin-login?next=/admin";
    throw new Error("Admin session expired. Please login again.");
  }
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

async function fileToDataUrl(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return "";
  if (!value.type.startsWith("image/")) throw new Error("Please upload only image files.");
  if (value.size > 1_500_000) throw new Error("Images must be smaller than 1.5 MB.");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(value);
  });
}

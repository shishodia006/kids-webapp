import "server-only";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { queryOne, queryRows, executeQuery, type DbRow } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export type AdminData = {
  stats: {
    parents: number;
    kids: number;
    pendingKids: number;
    activeKids: number;
    registered: number;
    checkedIn: number;
    paidBookings: number;
    totalReferrals: number;
    referralPoints: number;
  };
  members: AdminMember[];
  pendingKids: AdminKid[];
  events: AdminEvent[];
  liveParticipants: AdminParticipant[];
  notifications: AdminNotification[];
  brands: AdminBrand[];
  redemptions: AdminRedemption[];
  topReferrers: AdminReferrer[];
  recentReferrals: AdminReferral[];
};

export type AdminMember = {
  id: number;
  initials: string;
  family: string;
  father: string;
  mother: string;
  fatherPhone: string;
  motherPhone: string;
  address: string;
  plan: string;
  code: string;
  active: boolean;
};

export type AdminKid = {
  id: number;
  initials: string;
  name: string;
  age: string;
  grade: string;
  dob: string;
  school: string;
  schoolId: string;
  parent: string;
  phone: string;
  locality: string;
  requested: string;
  status: "pending" | "approved" | "rejected";
};

export type AdminEvent = {
  id: number;
  title: string;
  venue: string;
  date: string;
  category: string;
  price: number;
  capacity: number;
  description: string;
};

export type AdminParticipant = {
  id: number;
  participant: string;
  parent: string;
  phone: string;
  paid: boolean;
  checkIn: string;
  points: string;
};

export type AdminNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};

export type AdminBrand = {
  id: number;
  name: string;
  email: string;
  code: string;
  color: string;
  icon: string;
  pointsCost: number;
  active: boolean;
};

export type AdminRedemption = {
  id: number;
  voucher: string;
  member: string;
  brand: string;
  date: string;
  status: string;
};

export type AdminReferrer = {
  rank: string;
  name: string;
  meta: string;
  points: string;
  referrals: string;
};

export type AdminReferral = {
  code: string;
  newMember: string;
  date: string;
  status: string;
  points: number;
};

type AnyRow = DbRow & Record<string, unknown>;

export async function requireAdmin() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") throw new Error("Unauthorized");
  return session;
}

export async function getAdminData(): Promise<AdminData> {
  await requireAdmin();

  const [statsRows, users, pendingKids, events, participants, notifications, brands, redemptions, topReferrers, recentReferrals] =
    await Promise.all([
      queryRows<AnyRow>(`
        SELECT
          (SELECT COUNT(*)::int FROM users) AS parents,
          (SELECT COUNT(*)::int FROM kids) AS kids,
          (SELECT COUNT(*)::int FROM kids WHERE status = 'pending') AS pending_kids,
          (SELECT COUNT(*)::int FROM kids WHERE status = 'approved') AS active_kids,
          (SELECT COUNT(*)::int FROM bookings WHERE payment_status = 'success') AS registered,
          (SELECT COUNT(*)::int FROM bookings WHERE checked_in_at IS NOT NULL) AS checked_in,
          (SELECT COUNT(*)::int FROM bookings WHERE payment_status = 'success') AS paid_bookings,
          (SELECT COUNT(*)::int FROM referral_rewards) AS total_referrals,
          (SELECT COALESCE(SUM(points_awarded), 0)::int FROM referral_rewards) AS referral_points
      `),
      queryRows<AnyRow>("SELECT * FROM users ORDER BY created_at DESC LIMIT 80"),
      queryRows<AnyRow>(`
        SELECT k.*, u.parent_name, u.father_name, u.mother_name, u.mobile, u.alternate_mobile, u.locality, u.city, u.address
        FROM kids k
        JOIN users u ON u.id = k.parent_id
        WHERE k.status = 'pending'
        ORDER BY k.created_at DESC
        LIMIT 50
      `),
      queryRows<AnyRow>("SELECT * FROM events ORDER BY event_date DESC NULLS LAST, created_at DESC LIMIT 80"),
      queryRows<AnyRow>(`
        SELECT b.*, k.child_name, u.parent_name, u.mobile
        FROM bookings b
        JOIN kids k ON k.id = b.kid_id
        JOIN users u ON u.id = b.user_id
        ORDER BY b.created_at DESC
        LIMIT 80
      `),
      queryRows<AnyRow>("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30"),
      queryRows<AnyRow>(`
        SELECT b.*, bu.email, bu.referral_code
        FROM brands b
        LEFT JOIN brand_users bu ON bu.brand_id = b.id
        ORDER BY b.created_at DESC
        LIMIT 80
      `),
      queryRows<AnyRow>(`
        SELECT r.*, k.child_name
        FROM redemptions r
        LEFT JOIN kids k ON k.id = r.kid_id
        ORDER BY r.created_at DESC
        LIMIT 80
      `),
      queryRows<AnyRow>(`
        SELECT u.parent_name, u.konnekt_kode, u.locality, COUNT(rr.id)::int AS referrals, COALESCE(SUM(rr.points_awarded), 0)::int AS points
        FROM referral_rewards rr
        JOIN users u ON u.id = rr.referrer_parent_id
        GROUP BY u.id
        ORDER BY referrals DESC, points DESC
        LIMIT 10
      `),
      queryRows<AnyRow>(`
        SELECT rr.*, u.parent_name AS referred_name
        FROM referral_rewards rr
        JOIN users u ON u.id = rr.referred_parent_id
        ORDER BY rr.created_at DESC
        LIMIT 30
      `),
    ]);

  const statsRow = statsRows[0] ?? {};

  return {
    stats: {
      parents: num(statsRow.parents),
      kids: num(statsRow.kids),
      pendingKids: num(statsRow.pending_kids),
      activeKids: num(statsRow.active_kids),
      registered: num(statsRow.registered),
      checkedIn: num(statsRow.checked_in),
      paidBookings: num(statsRow.paid_bookings),
      totalReferrals: num(statsRow.total_referrals),
      referralPoints: num(statsRow.referral_points),
    },
    members: users.map(mapMember),
    pendingKids: pendingKids.map(mapPendingKid),
    events: events.map(mapEvent),
    liveParticipants: participants.map(mapParticipant),
    notifications: notifications.map(mapNotification),
    brands: brands.map(mapBrand),
    redemptions: redemptions.map(mapRedemption),
    topReferrers: topReferrers.map((row, index) => ({
      rank: String(index + 1),
      name: str(row.parent_name) || "Member",
      meta: `${str(row.konnekt_kode) || "KK-XXXXX"} - ${str(row.locality) || "Konnectly"}`,
      points: `${num(row.points)} pts earned`,
      referrals: String(num(row.referrals)),
    })),
    recentReferrals: recentReferrals.map((row) => ({
      code: str(row.referral_code),
      newMember: str(row.referred_name) || "New member",
      date: formatShortDate(row.created_at),
      status: "Joined",
      points: num(row.points_awarded),
    })),
  };
}

export async function createAdminEvent(input: Record<string, unknown>) {
  await requireAdmin();
  const title = clean(input.title);
  if (!title) throw new Error("Activity name is required.");

  const date = clean(input.date);
  const time = clean(input.time) || "00:00";
  const eventDate = date ? new Date(`${date}T${time}:00`) : null;

  await executeQuery(
    "INSERT INTO events (title, location, event_date, price, capacity, category, description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, true)",
    [
      title,
      clean(input.venue),
      eventDate,
      Number(input.price || 0),
      input.capacity ? Number(input.capacity) : null,
      clean(input.category) || "Experience",
      clean(input.description),
    ],
  );
}

export async function createAdminNotification(input: Record<string, unknown>) {
  await requireAdmin();
  const message = clean(input.message);
  if (!message) throw new Error("Message is required.");
  await executeQuery("INSERT INTO notifications (message, type) VALUES (?, ?)", [message, clean(input.type) === "alert" ? "alert" : "announcement"]);
}

export async function createAdminBrand(input: Record<string, unknown>) {
  await requireAdmin();
  const name = clean(input.name);
  if (!name) throw new Error("Brand name is required.");
  await executeQuery("INSERT INTO brands (name, description, note, points_cost, is_active) VALUES (?, ?, ?, ?, true)", [
    name,
    clean(input.description),
    clean(input.note),
    Number(input.pointsCost || 250),
  ]);
}

export async function updateKidStatus(kidId: number, status: "approved" | "rejected") {
  await requireAdmin();
  const kode = status === "approved" ? await generateKidCode(kidId) : null;
  if (status === "approved") {
    await executeQuery("UPDATE kids SET status = 'approved', konnekt_kode = COALESCE(konnekt_kode, ?) WHERE id = ?", [kode, kidId]);
  } else {
    await executeQuery("UPDATE kids SET status = 'rejected' WHERE id = ?", [kidId]);
  }
}

export async function updateRedemptionStatus(redemptionId: number, status: "issued" | "redeemed" | "cancelled" | "expired") {
  await requireAdmin();
  await executeQuery("UPDATE redemptions SET status = ? WHERE id = ?", [status, redemptionId]);
}

async function generateKidCode(kidId: number) {
  const kid = await queryOne<AnyRow>("SELECT child_name FROM kids WHERE id = ? LIMIT 1", [kidId]);
  const base = str(kid?.child_name).replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "KID";
  for (let i = 0; i < 20; i += 1) {
    const code = `KK-${base}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const exists = await queryOne<AnyRow>("SELECT 1 FROM users WHERE konnekt_kode = ? UNION SELECT 1 FROM kids WHERE konnekt_kode = ? LIMIT 1", [code, code]);
    if (!exists) return code;
  }
  return `KK-${base}-${Date.now().toString(36).toUpperCase()}`;
}

function mapMember(row: AnyRow): AdminMember {
  const father = str(row.father_name) || str(row.parent_name);
  const mother = str(row.mother_name);
  return {
    id: num(row.id),
    initials: initials(str(row.parent_name) || father || "K"),
    family: str(row.parent_name) || [father, mother].filter(Boolean).join(" & ") || "Konnectly Family",
    father,
    mother: mother || "Parent",
    fatherPhone: formatPhone(str(row.mobile)),
    motherPhone: formatPhone(str(row.alternate_mobile)),
    address: [str(row.address), str(row.locality), str(row.city), str(row.pincode)].filter(Boolean).join(", "),
    plan: "Member",
    code: str(row.konnekt_kode) || "KK-XXXXX",
    active: true,
  };
}

function mapPendingKid(row: AnyRow): AdminKid {
  return {
    id: num(row.id),
    initials: initials(str(row.child_name)),
    name: str(row.child_name) || "Child",
    age: `${num(row.age)} years`,
    grade: str(row.block_rank) || "Newbie",
    dob: row.dob ? formatDate(row.dob) : "-",
    school: str(row.school) || "-",
    schoolId: str(row.school_id_card) || "-",
    parent: str(row.parent_name) || [str(row.father_name), str(row.mother_name)].filter(Boolean).join(" & ") || "Parent",
    phone: formatPhone(str(row.mobile)),
    locality: str(row.locality) || str(row.city) || "-",
    requested: formatRelative(row.created_at),
    status: "pending",
  };
}

function mapEvent(row: AnyRow): AdminEvent {
  return {
    id: num(row.id),
    title: str(row.title),
    venue: str(row.location),
    date: row.event_date ? formatDate(row.event_date) : "Date TBA",
    category: str(row.category) || "Experience",
    price: num(row.price),
    capacity: num(row.capacity),
    description: str(row.description),
  };
}

function mapParticipant(row: AnyRow): AdminParticipant {
  return {
    id: num(row.id),
    participant: str(row.child_name),
    parent: str(row.parent_name),
    phone: formatPhone(str(row.mobile)),
    paid: str(row.payment_status) === "success",
    checkIn: row.checked_in_at ? formatTime(row.checked_in_at) : "Not yet",
    points: row.checked_in_at ? "100" : "-",
  };
}

function mapNotification(row: AnyRow): AdminNotification {
  return {
    id: num(row.id),
    title: str(row.type) === "alert" ? "Alert" : "Announcement",
    message: str(row.message),
    type: str(row.type),
    createdAt: formatDate(row.created_at),
  };
}

function mapBrand(row: AnyRow): AdminBrand {
  const name = str(row.name);
  return {
    id: num(row.id),
    name,
    email: str(row.email) || "No login user",
    code: str(row.referral_code) || `REF-${name.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "BRD"}`,
    color: name.toLowerCase().includes("domino") ? "bg-[#f4484d]" : "bg-[#6754d6]",
    icon: name.toLowerCase().includes("pizza") || name.toLowerCase().includes("domino") ? "Pizza" : "Gift",
    pointsCost: num(row.points_cost),
    active: Boolean(row.is_active),
  };
}

function mapRedemption(row: AnyRow): AdminRedemption {
  return {
    id: num(row.id),
    voucher: str(row.coupon_code),
    member: str(row.child_name) || "Member",
    brand: str(row.brand_name),
    date: formatShortDate(row.created_at),
    status: str(row.status) || "issued",
  };
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function str(value: unknown) {
  return value == null ? "" : String(value);
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "K";
}

function formatPhone(phone: string) {
  if (!phone) return "-";
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  return cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : phone;
}

function formatDate(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatShortDate(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}

function formatTime(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatRelative(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Recently";
  const hours = Math.max(1, Math.round((Date.now() - date.getTime()) / 36e5));
  return hours < 24 ? `Requested ${hours}h ago` : `Requested ${Math.round(hours / 24)}d ago`;
}

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
  photo: string;
  schoolIdPreview: string;
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
  await ensureAdminProductSchema();
  const title = clean(input.title);
  if (!title) throw new Error("Activity name is required.");

  const date = clean(input.date);
  const time = clean(input.time) || "00:00";
  const eventDate = date ? new Date(`${date}T${time}:00`) : null;

  await executeQuery(
    "INSERT INTO events (title, location, event_date, price, capacity, category, description, min_age, max_age, gender, restricted_area, points_earnable, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)",
    [
      title,
      clean(input.venue),
      eventDate,
      Number(input.price || 0),
      input.capacity ? Number(input.capacity) : null,
      clean(input.category) || "Experience",
      clean(input.description),
      input.minAge ? Number(input.minAge) : null,
      input.maxAge ? Number(input.maxAge) : null,
      clean(input.gender) || "All",
      clean(input.restrictedArea),
      Number(input.pointsEarnable || 100),
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
  await ensureAdminProductSchema();
  const kode = status === "approved" ? await generateKidCode(kidId) : null;
  if (status === "approved") {
    await executeQuery("UPDATE kids SET status = 'approved', konnekt_kode = COALESCE(konnekt_kode, ?) WHERE id = ?", [kode, kidId]);
    await awardReferralOnApproval(kidId);
    const kid = await queryOne<AnyRow>(
      `SELECT k.child_name, u.mobile
       FROM kids k
       JOIN users u ON u.id = k.parent_id
       WHERE k.id = ?
       LIMIT 1`,
      [kidId],
    );
    if (kid?.mobile) {
      const { sendWhatsAppText } = await import("@/lib/auth/otp");
      await sendWhatsAppText(
        str(kid.mobile),
        `Great news! ${str(kid.child_name) || "Your child"}'s profile has been verified. You can now register for events. Explore what's on for them!`,
      );
    }
  } else {
    await executeQuery("UPDATE kids SET status = 'rejected' WHERE id = ?", [kidId]);
  }
}

export async function getAdminKidFile(kidId: number, type: "photo" | "schoolId") {
  await requireAdmin();
  await ensureAdminProductSchema();
  if (!kidId) throw new Error("File not found.");

  const row = await queryOne<AnyRow>(
    "SELECT photo, photo_data, school_id_card, school_id_card_data FROM kids WHERE id = ? LIMIT 1",
    [kidId],
  );
  if (!row) throw new Error("File not found.");

  const dataUrl = type === "photo" ? str(row.photo_data) : str(row.school_id_card_data);
  const fileName = type === "photo" ? str(row.photo) || "child-photo" : str(row.school_id_card) || "school-id";
  if (dataUrl) return dataUrlToFile(dataUrl, fileName);

  const storedPath = type === "photo" ? previewablePublicPath(str(row.photo)) : previewablePublicPath(str(row.school_id_card));
  if (storedPath) return { redirectTo: storedPath };

  throw new Error("File preview is not available.");
}

async function awardReferralOnApproval(kidId: number) {
  const approvedKid = await queryOne<AnyRow>(
    `SELECT k.parent_id, u.parent_name, u.block_sector AS referral_code
     FROM kids k
     JOIN users u ON u.id = k.parent_id
     WHERE k.id = ?
     LIMIT 1`,
    [kidId],
  );
  const referredParentId = num(approvedKid?.parent_id);
  const referralCode = str(approvedKid?.referral_code).trim().toUpperCase();
  if (!referredParentId || !referralCode) return;

  const existingReward = await queryOne<AnyRow>(
    "SELECT id FROM referral_rewards WHERE referred_parent_id = ? LIMIT 1",
    [referredParentId],
  );
  if (existingReward) return;

  const referrer = await findReferrerByCode(referralCode);
  if (!referrer || referrer.parentId === referredParentId) return;

  const points = 50;
  await executeQuery("UPDATE users SET konnect_points = konnect_points + ? WHERE id = ?", [points, referrer.parentId]);
  await executeQuery(
    "INSERT INTO point_ledger (user_id, source, points, description, ref_type, ref_id) VALUES (?, 'successful_referral', ?, ?, 'referral', ?)",
    [referrer.parentId, points, `${str(approvedKid?.parent_name) || "A parent"} joined Konnectly using your referral.`, referredParentId],
  );

  const referrerKids = await queryRows<AnyRow>("SELECT id FROM kids WHERE parent_id = ? ORDER BY id ASC", [referrer.parentId]);
  const baseShare = referrerKids.length ? Math.floor(points / referrerKids.length) : 0;
  const remainder = referrerKids.length ? points % referrerKids.length : 0;
  for (const [index, kid] of referrerKids.entries()) {
    const share = baseShare + (index < remainder ? 1 : 0);
    if (share > 0) await executeQuery("UPDATE kids SET konnekt_points = konnekt_points + ? WHERE id = ?", [share, num(kid.id)]);
  }

  await executeQuery("UPDATE users SET konnect_points = konnect_points + ? WHERE id = ?", [points, referredParentId]);
  await executeQuery("UPDATE kids SET konnekt_points = konnekt_points + ? WHERE id = ?", [points, kidId]);
  await executeQuery(
    "INSERT INTO point_ledger (user_id, kid_id, source, points, description, ref_type, ref_id) VALUES (?, ?, 'referral_welcome_bonus', ?, ?, 'referral', ?)",
    [referredParentId, kidId, points, "Welcome bonus for joining Konnectly through a referral.", referrer.parentId],
  );

  await executeQuery(
    "INSERT INTO referral_rewards (referrer_parent_id, referred_parent_id, referral_code, points_awarded) VALUES (?, ?, ?, ?)",
    [referrer.parentId, referredParentId, referralCode, points],
  );
}

async function ensureAdminProductSchema() {
  await executeQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS konnect_points INTEGER NOT NULL DEFAULT 0");
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS photo_data TEXT");
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS school_id_card_data TEXT");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS min_age INTEGER");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS max_age INTEGER");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS gender VARCHAR(20)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS restricted_area VARCHAR(190)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS points_earnable INTEGER NOT NULL DEFAULT 100");
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS point_ledger (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kid_id INTEGER,
      source VARCHAR(80) NOT NULL,
      points INTEGER NOT NULL,
      description TEXT,
      ref_type VARCHAR(80),
      ref_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function findReferrerByCode(code: string) {
  const parent = await queryOne<AnyRow>(
    "SELECT id AS parent_id FROM users WHERE UPPER(konnekt_kode) = ? LIMIT 1",
    [code],
  );
  if (parent) return { parentId: num(parent.parent_id) };

  const kid = await queryOne<AnyRow>(
    `SELECT parent_id
     FROM kids
     WHERE UPPER(konnekt_kode) = ?
     LIMIT 1`,
    [code],
  );
  if (kid) return { parentId: num(kid.parent_id) };

  return null;
}

export async function updateRedemptionStatus(redemptionId: number, status: "issued" | "redeemed" | "cancelled" | "expired") {
  await requireAdmin();
  await executeQuery("UPDATE redemptions SET status = ? WHERE id = ?", [status, redemptionId]);
}

export async function checkInBooking(bookingId: number) {
  await requireAdmin();
  await ensureAdminProductSchema();

  const booking = await queryOne<AnyRow>(
    `SELECT b.*, e.title AS event_title
     FROM bookings b
     LEFT JOIN events e ON e.id = b.event_id
     WHERE b.id = ?
     LIMIT 1`,
    [bookingId],
  );

  if (!booking) throw new Error("Booking not found.");
  if (booking.checked_in_at) return;

  const attendancePoints = Math.max(0, num(booking.points_total) - num(booking.points_awarded_on_payment) - num(booking.points_awarded_on_attendance));

  await executeQuery(
    "UPDATE bookings SET checked_in_at = NOW(), points_awarded_on_attendance = points_awarded_on_attendance + ? WHERE id = ?",
    [attendancePoints, bookingId],
  );

  if (attendancePoints > 0) {
    await executeQuery("UPDATE users SET konnect_points = konnect_points + ? WHERE id = ?", [attendancePoints, num(booking.user_id)]);
    await executeQuery("UPDATE kids SET konnekt_points = konnekt_points + ? WHERE id = ?", [attendancePoints, num(booking.kid_id)]);
    await executeQuery(
      "INSERT INTO point_ledger (user_id, kid_id, source, points, description, ref_type, ref_id) VALUES (?, ?, 'event_attendance', ?, ?, 'booking', ?)",
      [
        num(booking.user_id),
        num(booking.kid_id),
        attendancePoints,
        `${attendancePoints} points credited for attending ${str(booking.event_title) || "an event"}`,
        bookingId,
      ],
    );
  }
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
  const id = num(row.id);
  const photoData = str(row.photo_data);
  const schoolIdData = str(row.school_id_card_data);

  return {
    id,
    initials: initials(str(row.child_name)),
    name: str(row.child_name) || "Child",
    age: `${num(row.age)} years`,
    grade: str(row.block_rank) || "Newbie",
    dob: row.dob ? formatDate(row.dob) : "-",
    school: str(row.school) || "-",
    schoolId: str(row.school_id_card) || "-",
    photo: photoData ? adminKidFileUrl(id, "photo") : previewablePublicPath(str(row.photo)),
    schoolIdPreview: schoolIdData ? adminKidFileUrl(id, "schoolId") : previewablePublicPath(str(row.school_id_card)),
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

function publicPath(path: string) {
  if (!path) return "";
  if (path.startsWith("data:")) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `/${path.replace(/^\.?\//, "")}`;
}

function previewablePublicPath(path: string) {
  const value = path.trim().replace(/\\/g, "/");
  if (!value) return "";
  if (value.startsWith("data:") || /^https?:\/\//i.test(value) || value.startsWith("/") || value.includes("/")) return publicPath(value);
  return "";
}

function adminKidFileUrl(kidId: number, type: "photo" | "schoolId") {
  return `/api/admin/kids/file?kidId=${kidId}&type=${type}`;
}

function dataUrlToFile(dataUrl: string, fallbackName: string) {
  const match = dataUrl.match(/^data:([^;,]+)?((?:;[^,]*)?),(.*)$/);
  if (!match) throw new Error("File preview is not available.");

  const contentType = match[1] || contentTypeFromName(fallbackName);
  const meta = match[2] || "";
  const payload = match[3] || "";
  const bytes = meta.includes(";base64")
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload));

  return {
    bytes,
    contentType,
    fileName: fallbackName || `kid-file.${extensionFromContentType(contentType)}`,
  };
}

function contentTypeFromName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function extensionFromContentType(contentType: string) {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/jpeg") return "jpg";
  return "bin";
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

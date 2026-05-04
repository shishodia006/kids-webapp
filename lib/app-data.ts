import "server-only";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { executeQuery, queryOne, queryRows, withTransaction, type DbRow } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/auth/otp";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export type AppUser = {
  id: number;
  parentName: string;
  fatherName: string;
  motherName: string;
  email: string;
  mobile: string;
  alternateMobile: string;
  profession: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  konnektKode: string;
  konnectPoints: number;
};

export type AppKid = {
  id: number;
  childName: string;
  age: number;
  school: string;
  dob: string;
  photo: string;
  schoolIdCard: string;
  status: string;
  konnektPoints: number;
  konnektKode: string;
};

export type AppEvent = {
  id: number;
  title: string;
  eventDate: string;
  location: string;
  price: number;
  category: string;
  description: string;
  image: string;
  minAge: number;
  maxAge: number;
  gender: string;
  restrictedArea: string;
  pointsEarnable: number;
};

export type AppBooking = {
  id: number;
  kidId: number;
  childName: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  location: string;
  qrToken: string;
  backupCode: string;
  amount: number;
  pointsTotal: number;
};

export type AppBrand = {
  id: number;
  name: string;
  pointsCost: number;
  note: string;
  isActive: boolean;
};

export type AppNotification = {
  id: number;
  message: string;
  type: string;
  createdAt: string;
  seen?: boolean;
};

export type AppRewardHistory = {
  id: number;
  month: string;
  brandName: string;
  pointsSpent: number;
  voucherCode: string;
  qrCode: string;
  expiresAt: string;
  redeemedAt: string;
  status: string;
};

export type AppData = {
  user: AppUser;
  kids: AppKid[];
  activeKid: AppKid | null;
  events: AppEvent[];
  bookings: AppBooking[];
  brands: AppBrand[];
  notifications: AppNotification[];
  latestNotification: AppNotification | null;
  rewardHistory: AppRewardHistory[];
  showWidgetSetup: boolean;
  razorpayKeyId: string;
  referralUrl: string;
};

type UserRow = DbRow & Record<string, unknown>;
type KidRow = DbRow & Record<string, unknown>;
type EventRow = DbRow & Record<string, unknown>;
type BookingRow = DbRow & Record<string, unknown>;
type BrandRow = DbRow & Record<string, unknown>;
type NotificationRow = DbRow & Record<string, unknown>;
type RewardHistoryRow = DbRow & Record<string, unknown>;

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireCurrentUser() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Unauthorized");

  const user = await queryOne<UserRow>("SELECT * FROM users WHERE mobile = ? LIMIT 1", [session.phone]);
  if (!user) throw new Error("User not found");

  return mapUser(user);
}

export async function getAppData(origin = ""): Promise<AppData> {
  await ensureProductSchema();
  const user = await requireCurrentUser();
  const cookieStore = await cookies();
  const seenNotifId = Number(cookieStore.get("konnectly_seen_notif")?.value || 0);

  const [kids, events, bookings, brands, notifications, rewardHistory] = await Promise.all([
    queryRows<KidRow>("SELECT * FROM kids WHERE parent_id = ? ORDER BY id ASC", [user.id]).then((rows) => rows.map(mapKid)),
    safeRows<EventRow>("SELECT * FROM events ORDER BY event_date ASC, created_at DESC LIMIT 50").then((rows) => rows.map(mapEvent)),
    safeRows<BookingRow>(
      `SELECT b.*, k.child_name, e.title AS event_title, e.event_date, e.location
       FROM bookings b
       LEFT JOIN kids k ON k.id = b.kid_id
       LEFT JOIN events e ON e.id = b.event_id
       WHERE b.user_id = ?
       ORDER BY b.id DESC`,
      [user.id],
    ).then((rows) => rows.map(mapBooking)),
    safeRows<BrandRow>("SELECT * FROM brands WHERE COALESCE(is_active, true) = true ORDER BY points_cost ASC, id ASC").then((rows) => rows.map(mapBrand)),
    safeRows<NotificationRow>("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20").then((rows) => rows.map(mapNotification)),
    safeRows<RewardHistoryRow>(
      `SELECT r.*
       FROM redemptions r
       JOIN kids k ON k.id = r.kid_id
       WHERE k.parent_id = ?
       ORDER BY r.created_at DESC`,
      [user.id],
    ).then((rows) => rows.map(mapRewardHistory)),
  ]);

  let activeKidId = Number(cookieStore.get("konnectly_active_kid_id")?.value || 0);
  if (!kids.some((kid) => kid.id === activeKidId)) activeKidId = kids[0]?.id ?? 0;
  const activeKid = kids.find((kid) => kid.id === activeKidId) ?? null;
  const latestNotification = notifications[0] ? { ...notifications[0], seen: notifications[0].id === seenNotifId } : null;
  const referralCode = user.konnektKode || activeKid?.konnektKode || "KK-XXXXX";

  return {
    user,
    kids,
    activeKid,
    events,
    bookings,
    brands,
    notifications,
    latestNotification,
    rewardHistory,
    showWidgetSetup: cookieStore.get("konnectly_show_widget_setup")?.value === "1",
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
    referralUrl: `${origin}/register?ref=${encodeURIComponent(referralCode)}`,
  };
}

export async function addChildProfile(input: Record<string, unknown>) {
  await ensureProductSchema();
  const user = await requireCurrentUser();
  const currentKids = await queryRows<KidRow>("SELECT id FROM kids WHERE parent_id = ?", [user.id]);
  if (currentKids.length >= 3) throw new Error("You can add up to 3 child profiles.");

  const childName = clean(input.childName);
  const dob = clean(input.dob);
  const school = clean(input.school);
  const schoolIdCard = clean(input.schoolIdCard);
  const schoolIdCardData = clean(input.schoolIdCardData);
  const gender = clean(input.gender) || "All";

  if (!childName || !dob || !school || (!schoolIdCard && !schoolIdCardData)) {
    throw new Error("Child name, date of birth, school name, and school ID card photo are required.");
  }

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) throw new Error("Please enter a valid date of birth.");

  const age = calculateAge(birthDate);

  const inserted = await queryOne<{ id: number }>(
    `
    INSERT INTO kids
      (parent_id, child_name, age, dob, school, school_id_card, block_rank, status, konnekt_points)
    VALUES
      (?, ?, ?, ?, ?, ?, 'Newbie', 'pending', 0)
    RETURNING id
    `,
    [user.id, childName, age, birthDate, school, schoolIdCard],
  );
  const kidId = Number(inserted?.id);
  if (kidId) {
    await executeQuery("UPDATE kids SET school_id_card_data = ?, gender = ? WHERE id = ?", [schoolIdCardData || null, gender, kidId]);
  }

  await sendWhatsAppText(
    user.mobile,
    `${childName}'s profile is currently under verification. You'll be notified once it's approved. Meanwhile, explore upcoming events for your child!`,
  );

  return { message: `${childName}'s profile is currently under verification.` };
}

export async function switchActiveKid(kidId: number) {
  const user = await requireCurrentUser();
  const kid = await queryOne<KidRow>("SELECT id FROM kids WHERE id = ? AND parent_id = ? LIMIT 1", [kidId, user.id]);
  if (!kid) throw new Error("Kid not found");

  const cookieStore = await cookies();
  cookieStore.set("konnectly_active_kid_id", String(kidId), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
}

export async function dismissNotification(notificationId: number) {
  const cookieStore = await cookies();
  cookieStore.set("konnectly_seen_notif", String(notificationId), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
}

export async function dismissWidgetSetup() {
  const cookieStore = await cookies();
  cookieStore.set("konnectly_show_widget_setup", "", { path: "/", sameSite: "lax", maxAge: 0 });
}

export async function savePushSubscription(subscription: unknown) {
  await ensureProductSchema();
  const user = await requireCurrentUser();
  const value = subscription && typeof subscription === "object" ? subscription as Record<string, unknown> : null;
  const endpoint = typeof value?.endpoint === "string" ? value.endpoint : "";
  if (!endpoint) throw new Error("Push subscription endpoint missing.");

  await executeQuery(
    `
    INSERT INTO push_subscriptions (user_id, endpoint, payload)
    VALUES (?, ?, ?)
    ON CONFLICT (endpoint)
    DO UPDATE SET user_id = EXCLUDED.user_id, payload = EXCLUDED.payload, updated_at = NOW()
    `,
    [user.id, endpoint, JSON.stringify(value)],
  );

  return { message: "Push subscription saved." };
}

export async function redeemBrand(brandId: number) {
  await ensureProductSchema();
  const user = await requireCurrentUser();
  const cookieStore = await cookies();
  const activeKidId = Number(cookieStore.get("konnectly_active_kid_id")?.value || 0);
  const kid = await queryOne<KidRow>("SELECT * FROM kids WHERE id = ? AND parent_id = ? LIMIT 1", [activeKidId, user.id]);
  if (!kid) throw new Error("Select a kid before redeeming.");

  const brand = await queryOne<BrandRow>("SELECT * FROM brands WHERE id = ? AND COALESCE(is_active, true) = true LIMIT 1", [brandId]);
  if (!brand) throw new Error("Reward not found.");

  const mappedKid = mapKid(kid);
  const mappedBrand = mapBrand(brand);
  if (user.konnectPoints < mappedBrand.pointsCost) throw new Error("Not enough points.");

  const coupon = `KON-${mappedBrand.name.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "RWD"}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const qrCode = `QR-${coupon}`;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await withTransaction(async (connection) => {
    await connection.execute("UPDATE users SET konnect_points = konnect_points - ? WHERE id = ?", [mappedBrand.pointsCost, user.id]);
    try {
      await connection.execute(
        "INSERT INTO redemptions (kid_id, brand_id, brand_name, points_spent, coupon_code, qr_code, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'issued')",
        [mappedKid.id, mappedBrand.id, mappedBrand.name, mappedBrand.pointsCost, coupon, qrCode, expiresAt],
      );
    } catch {
      await connection.execute(
        "INSERT INTO redemptions (kid_id, brand_name, points_spent, coupon_code, status) VALUES (?, ?, ?, ?, 'issued')",
        [mappedKid.id, mappedBrand.name, mappedBrand.pointsCost, coupon],
      );
    }
    await connection.execute(
      "INSERT INTO point_ledger (user_id, kid_id, source, points, description, ref_type) VALUES (?, ?, 'voucher_redemption', ?, ?, 'redemption')",
      [user.id, mappedKid.id, -mappedBrand.pointsCost, `${mappedBrand.name} voucher generated`],
    );
  });

  await sendWhatsAppText(user.mobile, `Your ${mappedBrand.name} voucher has been generated! Use code ${coupon} or show the QR code at the outlet. Valid until ${formatDate(expiresAt.toISOString())}.`);

  return { coupon, brandName: mappedBrand.name, qrCode, expiresAt: expiresAt.toISOString() };
}

export async function confirmBooking({ eventId, kidIds, amount, razorpayPaymentId, origin }: { eventId: number; kidIds: number[]; amount: number; razorpayPaymentId: string; origin: string }) {
  await ensureProductSchema();
  const user = await requireCurrentUser();
  const cleanKidIds = [...new Set(kidIds.filter(Number))];
  if (!cleanKidIds.length) throw new Error("Select at least one kid.");

  const ownedKids = await queryRows<KidRow>(
    `SELECT * FROM kids WHERE parent_id = ? AND id IN (${cleanKidIds.map(() => "?").join(",")})`,
    [user.id, ...cleanKidIds],
  );
  if (ownedKids.length !== cleanKidIds.length) throw new Error("Invalid kid selection.");
  if (ownedKids.some((kid) => str(kid.status) !== "approved")) {
    throw new Error("Only verified child profiles can register for events.");
  }

  const event = await queryOne<EventRow>("SELECT * FROM events WHERE id = ? LIMIT 1", [eventId]);
  if (!event) throw new Error("Event not found.");
  const mappedEvent = mapEvent(event);
  const ineligible = ownedKids.map(mapKid).filter((kid) => !isEligibleForEvent(kid, user, mappedEvent));
  if (ineligible.length) {
    throw new Error(`${ineligible.map((kid) => kid.childName).join(", ")} is not eligible for this event.`);
  }

  const perKidAmount = Math.round((amount / cleanKidIds.length) * 100) / 100;
  const pointsTotal = mappedEvent.pointsEarnable || 100;
  const pointsOnPurchase = Math.floor(pointsTotal / 2);
  const pointsOnAttendance = pointsTotal - pointsOnPurchase;
  let lastQr = "";
  let lastBackupCode = "";

  await withTransaction(async (connection) => {
    for (const kidId of cleanKidIds) {
      const qr = `TK-${randomBytes(3).toString("hex").toUpperCase()}-K${kidId}-E${eventId}`;
      const backupCode = randomBytes(3).toString("hex").toUpperCase();
      lastQr = qr;
      lastBackupCode = backupCode;
      await connection.execute(
        "INSERT INTO bookings (user_id,kid_id,event_id,razorpay_payment_id,amount,qr_token,backup_code,points_total,points_awarded_on_payment,points_awarded_on_attendance,payment_status) VALUES (?,?,?,?,?,?,?,?,?,?,'success')",
        [user.id, kidId, eventId, razorpayPaymentId, perKidAmount, qr, backupCode, pointsTotal, pointsOnPurchase, 0],
      );
      await connection.execute("UPDATE users SET konnect_points = konnect_points + ? WHERE id = ?", [pointsOnPurchase, user.id]);
      await connection.execute(
        "INSERT INTO point_ledger (user_id, kid_id, source, points, description, ref_type, ref_id) VALUES (?, ?, 'event_payment', ?, ?, 'event', ?)",
        [user.id, kidId, pointsOnPurchase, `${pointsOnPurchase} points credited for ${mappedEvent.title}`, eventId],
      );
    }
  });

  if (user.mobile) {
    const ticketUrl = `${origin}/app?view=ticket&token=${encodeURIComponent(lastQr)}`;
    await sendWhatsAppText(
      user.mobile,
      `Hi ${user.parentName || "there"}! Your child is registered for ${mappedEvent.title} on ${formatDate(mappedEvent.eventDate)} at ${mappedEvent.location}. Show this QR code at entry: ${ticketUrl}. Backup code: ${lastBackupCode}. See you there! - Konnectly\n\n${pointsOnPurchase} Konnect Points have been added to your profile. Unlock the remaining ${pointsOnAttendance} Konnect Points by showing up!`,
    );
  }

  return { message: `Passes issued! +${pointsOnPurchase} Konnect pts added.` };
}

async function safeRows<T extends DbRow>(sql: string, values: unknown[] = []) {
  try {
    return await queryRows<T>(sql, values as never[]);
  } catch {
    return [];
  }
}

function mapUser(row: UserRow): AppUser {
  return {
    id: num(row.id),
    parentName: str(row.parent_name),
    fatherName: str(row.father_name),
    motherName: str(row.mother_name),
    email: str(row.email),
    mobile: str(row.mobile),
    alternateMobile: str(row.alternate_mobile),
    profession: str(row.profession),
    address: str(row.address),
    locality: str(row.locality),
    city: str(row.city),
    state: str(row.state),
    pincode: str(row.pincode),
    konnektKode: str(row.konnekt_kode),
    konnectPoints: num(row.konnect_points),
  };
}

function mapKid(row: KidRow): AppKid {
  return {
    id: num(row.id),
    childName: str(row.child_name),
    age: num(row.age),
    school: str(row.school),
    dob: dateStr(row.dob),
    photo: publicPath(str(row.photo)),
    schoolIdCard: str(row.school_id_card_data) || publicPath(str(row.school_id_card)),
    status: str(row.status) || "pending",
    konnektPoints: num(row.konnekt_points),
    konnektKode: str(row.konnekt_kode),
  };
}

function mapRewardHistory(row: RewardHistoryRow): AppRewardHistory {
  const createdAt = dateStr(row.created_at);
  return {
    id: num(row.id),
    month: formatMonth(createdAt),
    brandName: str(row.brand_name) || "Reward",
    pointsSpent: num(row.points_spent),
    voucherCode: str(row.coupon_code),
    qrCode: str(row.qr_code),
    expiresAt: dateStr(row.expires_at),
    redeemedAt: createdAt,
    status: str(row.status) || "issued",
  };
}

function mapEvent(row: EventRow): AppEvent {
  return {
    id: num(row.id),
    title: str(row.title) || "Untitled event",
    eventDate: dateStr(row.event_date),
    location: str(row.location),
    price: num(row.price ?? row.amount),
    category: str(row.category) || "Experience",
    description: str(row.description),
    image: publicPath(str(row.image ?? row.photo ?? row.banner)),
    minAge: num(row.min_age),
    maxAge: num(row.max_age),
    gender: str(row.gender) || "All",
    restrictedArea: str(row.restricted_area),
    pointsEarnable: num(row.points_earnable) || 100,
  };
}

function mapBooking(row: BookingRow): AppBooking {
  return {
    id: num(row.id),
    kidId: num(row.kid_id),
    childName: str(row.child_name),
    eventId: num(row.event_id),
    eventTitle: str(row.event_title) || "Event",
    eventDate: dateStr(row.event_date),
    location: str(row.location),
    qrToken: str(row.qr_token),
    backupCode: str(row.backup_code),
    amount: num(row.amount),
    pointsTotal: num(row.points_total),
  };
}

function mapBrand(row: BrandRow): AppBrand {
  return {
    id: num(row.id),
    name: str(row.name) || "Reward",
    pointsCost: num(row.points_cost),
    note: str(row.note ?? row.description),
    isActive: num(row.is_active ?? 1) === 1,
  };
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: num(row.id),
    message: str(row.message),
    type: str(row.type) || "announcement",
    createdAt: dateStr(row.created_at),
  };
}

function isEligibleForEvent(kid: AppKid, user: AppUser, event: AppEvent) {
  if (kid.status !== "approved") return false;
  if (event.minAge && kid.age < event.minAge) return false;
  if (event.maxAge && kid.age > event.maxAge) return false;
  if (event.gender && event.gender !== "All") return false;
  if (event.restrictedArea && ![user.locality, user.city].some((value) => value.toLowerCase() === event.restrictedArea.toLowerCase())) return false;
  return true;
}

function str(value: unknown) {
  return value == null ? "" : String(value);
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateStr(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function publicPath(path: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return `/${path.replace(/^\.?\//, "")}`;
}

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatMonth(value: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

function calculateAge(date: Date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) age -= 1;
  return Math.max(0, age);
}

async function ensureProductSchema() {
  await executeQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS konnect_points INTEGER NOT NULL DEFAULT 0");
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS school_id_card_data TEXT");
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS gender VARCHAR(20)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS min_age INTEGER");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS max_age INTEGER");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS gender VARCHAR(20)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS restricted_area VARCHAR(190)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS points_earnable INTEGER NOT NULL DEFAULT 100");
  await executeQuery("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS backup_code VARCHAR(40)");
  await executeQuery("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS points_total INTEGER NOT NULL DEFAULT 100");
  await executeQuery("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS points_awarded_on_payment INTEGER NOT NULL DEFAULT 50");
  await executeQuery("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS points_awarded_on_attendance INTEGER NOT NULL DEFAULT 0");
  await executeQuery("ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255)");
  await executeQuery("ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ");
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
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

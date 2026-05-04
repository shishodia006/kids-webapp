import "server-only";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { queryOne, queryRows, withTransaction, type DbRow } from "@/lib/db";
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
};

export type AppKid = {
  id: number;
  childName: string;
  age: number;
  school: string;
  dob: string;
  photo: string;
  schoolIdCard: string;
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
  amount: number;
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

export type AppData = {
  user: AppUser;
  kids: AppKid[];
  activeKid: AppKid | null;
  events: AppEvent[];
  bookings: AppBooking[];
  brands: AppBrand[];
  notifications: AppNotification[];
  latestNotification: AppNotification | null;
  razorpayKeyId: string;
  referralUrl: string;
};

type UserRow = DbRow & Record<string, unknown>;
type KidRow = DbRow & Record<string, unknown>;
type EventRow = DbRow & Record<string, unknown>;
type BookingRow = DbRow & Record<string, unknown>;
type BrandRow = DbRow & Record<string, unknown>;
type NotificationRow = DbRow & Record<string, unknown>;

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
  const user = await requireCurrentUser();
  const cookieStore = await cookies();
  const seenNotifId = Number(cookieStore.get("konnectly_seen_notif")?.value || 0);

  const [kids, events, bookings, brands, notifications] = await Promise.all([
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
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
    referralUrl: `${origin}/register?ref=${encodeURIComponent(referralCode)}`,
  };
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

export async function redeemBrand(brandId: number) {
  const user = await requireCurrentUser();
  const cookieStore = await cookies();
  const activeKidId = Number(cookieStore.get("konnectly_active_kid_id")?.value || 0);
  const kid = await queryOne<KidRow>("SELECT * FROM kids WHERE id = ? AND parent_id = ? LIMIT 1", [activeKidId, user.id]);
  if (!kid) throw new Error("Select a kid before redeeming.");

  const brand = await queryOne<BrandRow>("SELECT * FROM brands WHERE id = ? AND COALESCE(is_active, true) = true LIMIT 1", [brandId]);
  if (!brand) throw new Error("Reward not found.");

  const mappedKid = mapKid(kid);
  const mappedBrand = mapBrand(brand);
  if (mappedKid.konnektPoints < mappedBrand.pointsCost) throw new Error("Not enough points.");

  const coupon = `KON-${mappedBrand.name.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "RWD"}-${randomBytes(3).toString("hex").toUpperCase()}`;

  await withTransaction(async (connection) => {
    await connection.execute("UPDATE kids SET konnekt_points = konnekt_points - ? WHERE id = ? AND parent_id = ?", [mappedBrand.pointsCost, mappedKid.id, user.id]);
    try {
      await connection.execute(
        "INSERT INTO redemptions (kid_id, brand_id, brand_name, points_spent, coupon_code, status) VALUES (?, ?, ?, ?, ?, 'issued')",
        [mappedKid.id, mappedBrand.id, mappedBrand.name, mappedBrand.pointsCost, coupon],
      );
    } catch {
      await connection.execute(
        "INSERT INTO redemptions (kid_id, brand_name, points_spent, coupon_code, status) VALUES (?, ?, ?, ?, 'issued')",
        [mappedKid.id, mappedBrand.name, mappedBrand.pointsCost, coupon],
      );
    }
  });

  return { coupon, brandName: mappedBrand.name };
}

export async function confirmBooking({ eventId, kidIds, amount, razorpayPaymentId, origin }: { eventId: number; kidIds: number[]; amount: number; razorpayPaymentId: string; origin: string }) {
  const user = await requireCurrentUser();
  const cleanKidIds = [...new Set(kidIds.filter(Number))];
  if (!cleanKidIds.length) throw new Error("Select at least one kid.");

  const ownedKids = await queryRows<KidRow>(
    `SELECT id FROM kids WHERE parent_id = ? AND id IN (${cleanKidIds.map(() => "?").join(",")})`,
    [user.id, ...cleanKidIds],
  );
  if (ownedKids.length !== cleanKidIds.length) throw new Error("Invalid kid selection.");

  const event = await queryOne<EventRow>("SELECT * FROM events WHERE id = ? LIMIT 1", [eventId]);
  if (!event) throw new Error("Event not found.");

  const perKidAmount = Math.round((amount / cleanKidIds.length) * 100) / 100;
  const pointsOnPurchase = 50;
  let lastQr = "";

  await withTransaction(async (connection) => {
    for (const kidId of cleanKidIds) {
      const qr = `TK-${randomBytes(3).toString("hex").toUpperCase()}-K${kidId}-E${eventId}`;
      lastQr = qr;
      await connection.execute(
        "INSERT INTO bookings (user_id,kid_id,event_id,razorpay_payment_id,amount,qr_token,payment_status) VALUES (?,?,?,?,?,?,'success')",
        [user.id, kidId, eventId, razorpayPaymentId, perKidAmount, qr],
      );
      await connection.execute("UPDATE kids SET konnekt_points = konnekt_points + ? WHERE id = ? AND parent_id = ?", [pointsOnPurchase, kidId, user.id]);
    }
  });

  if (user.mobile) {
    const mappedEvent = mapEvent(event);
    const ticketUrl = `${origin}/app?view=ticket&token=${encodeURIComponent(lastQr)}`;
    await sendWhatsAppText(
      user.mobile,
      `Konnectly Event Pass Confirmed!\n\nHi ${user.parentName || "there"}! Your registration for ${mappedEvent.title} is confirmed.\n\nDate: ${formatDate(mappedEvent.eventDate)}\nVenue: ${mappedEvent.location}\n\n+${pointsOnPurchase} Konnect Points have been added. Unlock ${pointsOnPurchase} more by attending.\n\nYour QR Entry Code: ${lastQr}\nView Pass: ${ticketUrl}`,
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
    schoolIdCard: publicPath(str(row.school_id_card)),
    konnektPoints: num(row.konnekt_points),
    konnektKode: str(row.konnekt_kode),
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
    amount: num(row.amount),
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

function str(value: unknown) {
  return value == null ? "" : String(value);
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

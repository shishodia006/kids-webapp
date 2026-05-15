import "server-only";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { executeQuery, queryOne, queryRows, withTransaction, type DbRow } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/auth/otp";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { notifyAdmins, notifyUser } from "@/lib/push-notifications";

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
  gender: string;
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
  logo: string;
  image: string;
  isActive: boolean;
};

export type AppNotification = {
  id: number;
  message: string;
  type: string;
  createdAt: string;
  seen?: boolean;
};

export type AppHeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  ctaLabel: string;
  target: string;
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

export type AppPointHistory = {
  id: number;
  month: string;
  source: string;
  points: number;
  description: string;
  refType: string;
  childName: string;
  createdAt: string;
};

export type AppData = {
  user: AppUser;
  kids: AppKid[];
  activeKid: AppKid | null;
  events: AppEvent[];
  bookings: AppBooking[];
  brands: AppBrand[];
  notifications: AppNotification[];
  heroSlides: AppHeroSlide[];
  latestNotification: AppNotification | null;
  rewardHistory: AppRewardHistory[];
  pointHistory: AppPointHistory[];
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
type HeroSlideRow = DbRow & Record<string, unknown>;
type RewardHistoryRow = DbRow & Record<string, unknown>;
type PointHistoryRow = DbRow & Record<string, unknown>;

let productSchemaReady: Promise<void> | null = null;
let expireIssuedVouchersReady: Promise<void> | null = null;
let expireIssuedVouchersLastRun = 0;
const EXPIRE_ISSUED_VOUCHERS_INTERVAL_MS = 60_000;
const PARENT_ACCOUNT_REQUIRED = "Please login with a parent account to use the app.";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireCurrentUser(options: { parentOnly?: boolean } = {}) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Unauthorized");
  if (options.parentOnly && session.role !== "user") throw new Error(PARENT_ACCOUNT_REQUIRED);

  const user = await queryOne<UserRow>("SELECT * FROM users WHERE mobile = ? LIMIT 1", [session.phone]);
  if (!user) throw new Error("User not found");

  return mapUser(user);
}

export async function getAppData(origin = ""): Promise<AppData> {
  const user = await requireCurrentUser({ parentOnly: true });
  await ensureProductSchemaOnce();
  await expireIssuedVouchers();
  const cookieStore = await cookies();
  const seenNotifId = Number(cookieStore.get("konnectly_seen_notif")?.value || 0);

  const [kids, events, bookings, brands, notifications, heroSlides, rewardHistory, pointHistory] = await Promise.all([
    queryRows<KidRow>("SELECT * FROM kids WHERE parent_id = ? ORDER BY id ASC", [user.id]).then((rows) => rows.map(mapKid)),
    safeRows<EventRow>("SELECT * FROM events WHERE COALESCE(is_active, true) = true ORDER BY event_date ASC, created_at DESC LIMIT 50").then((rows) => rows.map(mapEvent)),
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
    safeRows<NotificationRow>(
      `
        SELECT *
        FROM notifications
        WHERE user_id IS NULL OR user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [user.id],
    ).then((rows) => rows.map(mapNotification)),
    safeRows<HeroSlideRow>("SELECT * FROM hero_slides WHERE COALESCE(is_active, true) = true ORDER BY sort_order ASC, created_at DESC LIMIT 5").then((rows) => rows.map(mapHeroSlide)),
    safeRows<RewardHistoryRow>(
      `SELECT r.*
       FROM redemptions r
       JOIN kids k ON k.id = r.kid_id
       WHERE k.parent_id = ?
       ORDER BY r.created_at DESC`,
      [user.id],
    ).then((rows) => rows.map(mapRewardHistory)),
    safeRows<PointHistoryRow>(
      `SELECT pl.*, k.child_name
       FROM point_ledger pl
       LEFT JOIN kids k ON k.id = pl.kid_id
       WHERE pl.user_id = ?
       ORDER BY pl.created_at DESC
       LIMIT 120`,
      [user.id],
    ).then((rows) => rows.map(mapPointHistory)),
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
    heroSlides,
    latestNotification,
    rewardHistory,
    pointHistory,
    showWidgetSetup: false,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
    referralUrl: `${origin}/register?ref=${encodeURIComponent(referralCode)}`,
  };
}

export async function addChildProfile(input: Record<string, unknown>) {
  await ensureProductSchemaOnce();
  const user = await requireCurrentUser({ parentOnly: true });
  const currentKids = await queryRows<KidRow>("SELECT id FROM kids WHERE parent_id = ?", [user.id]);
  if (currentKids.length >= 3) throw new Error("You can add up to 3 child profiles.");

  const childName = clean(input.childName);
  const dob = clean(input.dob);
  const school = clean(input.school);
  const schoolIdCard = clean(input.schoolIdCard);
  const schoolIdCardData = clean(input.schoolIdCardData);
  const photo = clean(input.photo);
  const photoData = clean(input.photoData);
  const gender = clean(input.gender) || "All";

  if (!childName || !dob || !school || (!photo && !photoData) || (!schoolIdCard && !schoolIdCardData)) {
    throw new Error("Child name, date of birth, school name, child photo, and school ID document are required.");
  }

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) throw new Error("Please enter a valid date of birth.");

  const age = calculateAge(birthDate);
  if (age > 18) throw new Error("Child age cannot be more than 18 years.");

  const inserted = await queryOne<{ id: number }>(
    `
    INSERT INTO kids
      (parent_id, child_name, age, dob, school, school_id_card, photo, block_rank, status, konnekt_points)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, 'Newbie', 'pending', 0)
    RETURNING id
    `,
    [user.id, childName, age, birthDate, school, schoolIdCard, photo],
  );
  const kidId = Number(inserted?.id);
  if (kidId) {
    await runBestEffort("child profile supplemental fields", async () => {
      await executeQuery("UPDATE kids SET school_id_card_data = ?, photo_data = ?, gender = ? WHERE id = ?", [schoolIdCardData || null, photoData || null, gender, kidId]);
    });
  }

  await runBestEffort("child profile notifications", async () => {
    const notificationResults = await Promise.allSettled([
      sendWhatsAppText(
        user.mobile,
        `${childName}'s profile is currently under verification.  be notified once it's approved. Meanwhile, explore upcoming events for your child!`,
      ),
      notifyUser(user.id, {
        title: "Child profile submitted",
        body: `${childName}'s profile is pending admin review.`,
        url: "/app?tab=Account",
        tag: `kid-submitted-${kidId || childName}`,
      }),
      notifyAdmins({
        title: "New child profile pending",
        body: `${childName} was added by ${user.parentName || "a parent"}.`,
        url: "/admin",
        tag: `admin-kid-pending-${kidId || Date.now()}`,
      }),
    ]);
    notificationResults.forEach((result) => {
      if (result.status === "rejected") console.warn("child profile notification failed:", result.reason);
    });
  });

  return { message: `${childName}'s profile is currently under verification.` };
}

export async function updateParentProfile(input: Record<string, unknown>) {
  await ensureProductSchemaOnce();
  const user = await requireCurrentUser({ parentOnly: true });

  const parentName = clean(input.parentName);
  const email = clean(input.email).toLowerCase();
  const fatherName = clean(input.fatherName);
  const motherName = clean(input.motherName);
  const alternateMobile = clean(input.alternateMobile);
  const profession = clean(input.profession);
  const address = clean(input.address);
  const locality = clean(input.locality);
  const city = clean(input.city);
  const state = clean(input.state);
  const pincode = clean(input.pincode);

  if (!parentName) throw new Error("Parent name is required.");
  if (email && !isValidEmailAddress(email)) throw new Error("Please enter a valid email address.");

  await executeQuery(
    `
    UPDATE users
    SET
      parent_name = ?,
      email = ?,
      father_name = ?,
      mother_name = ?,
      alternate_mobile = ?,
      profession = ?,
      address = ?,
      locality = ?,
      city = ?,
      state = ?,
      pincode = ?
    WHERE id = ?
    `,
    [parentName, email || null, fatherName || null, motherName || null, alternateMobile || null, profession || null, address || null, locality || null, city || null, state || null, pincode || null, user.id],
  );

  await notifyUser(user.id, {
    title: "Profile updated",
    body: "Your parent profile details were updated successfully.",
    url: "/app?tab=Account",
    tag: `parent-profile-${user.id}`,
  });
  await notifyAdmins({
    title: "Parent profile updated",
    body: `${parentName} updated their parent profile.`,
    url: "/admin",
    tag: `admin-parent-profile-${user.id}`,
  });

  return { message: "Parent profile updated." };
}

export async function updateChildProfile(input: Record<string, unknown>) {
  await ensureProductSchemaOnce();
  const user = await requireCurrentUser({ parentOnly: true });
  const kidId = Number(input.kidId);
  if (!kidId) throw new Error("Kid profile is required.");

  const childName = clean(input.childName);
  const dob = clean(input.dob);
  const school = clean(input.school);
  const gender = clean(input.gender) || "All";
  const schoolIdCard = clean(input.schoolIdCard);
  const schoolIdCardData = clean(input.schoolIdCardData);

  if (!childName || !dob || !school) {
    throw new Error("Child name, date of birth, and school name are required.");
  }

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) throw new Error("Please enter a valid date of birth.");
  const age = calculateAge(birthDate);

  const result = schoolIdCard || schoolIdCardData
    ? await executeQuery(
      `
      UPDATE kids
      SET child_name = ?, dob = ?, age = ?, school = ?, gender = ?, school_id_card = ?, school_id_card_data = ?
      WHERE id = ? AND parent_id = ?
      `,
      [childName, birthDate, age, school, gender, schoolIdCard || null, schoolIdCardData || null, kidId, user.id],
    )
    : await executeQuery(
      `
      UPDATE kids
      SET child_name = ?, dob = ?, age = ?, school = ?, gender = ?
      WHERE id = ? AND parent_id = ?
      `,
      [childName, birthDate, age, school, gender, kidId, user.id],
    );

  if (!result.affectedRows) throw new Error("Kid profile not found.");
  await notifyUser(user.id, {
    title: "Kid profile updated",
    body: `${childName}'s profile details were updated.`,
    url: "/app?tab=Account",
    tag: `kid-profile-${kidId}`,
  });
  await notifyAdmins({
    title: "Kid profile updated",
    body: `${childName}'s profile was updated by ${user.parentName || "a parent"}.`,
    url: "/admin",
    tag: `admin-kid-profile-${kidId}`,
  });

  return { message: "Kid profile updated." };
}

export async function switchActiveKid(kidId: number) {
  const user = await requireCurrentUser({ parentOnly: true });
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

export async function trackAppInstall(input: Record<string, unknown>) {
  await ensureProductSchemaOnce();
  const user = await requireCurrentUser({ parentOnly: true });
  const installKey = clean(input.installKey) || `user-${user.id}`;
  const source = clean(input.source).slice(0, 80) || "appinstalled";
  const userAgent = clean(input.userAgent).slice(0, 500);

  await executeQuery(
    `
      INSERT INTO app_installs (user_id, install_key, source, user_agent, installed_at, last_seen_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
      ON CONFLICT (install_key)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        source = EXCLUDED.source,
        user_agent = EXCLUDED.user_agent,
        last_seen_at = NOW()
    `,
    [user.id, installKey, source, userAgent],
  );

  return { message: "Install tracked." };
}

export async function savePushSubscription(subscription: unknown) {
  await ensureProductSchemaOnce();
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
  await ensureProductSchemaOnce();
  const user = await requireCurrentUser({ parentOnly: true });
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
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 15);

  await withTransaction(async (connection) => {
    await connection.execute("UPDATE users SET konnect_points = konnect_points - ? WHERE id = ?", [mappedBrand.pointsCost, user.id]);
    try {
      await connection.execute(
        "INSERT INTO redemptions (kid_id, brand_id, brand_name, points_spent, coupon_code, qr_code, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'issued')",
        [mappedKid.id, mappedBrand.id, mappedBrand.name, mappedBrand.pointsCost, coupon, qrCode, expiresAt],
      );
    } catch {
      await connection.execute(
        "INSERT INTO redemptions (kid_id, brand_name, points_spent, coupon_code, qr_code, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, 'issued')",
        [mappedKid.id, mappedBrand.name, mappedBrand.pointsCost, coupon, qrCode, expiresAt],
      );
    }
    await connection.execute(
      "INSERT INTO point_ledger (user_id, kid_id, source, points, description, ref_type) VALUES (?, ?, 'voucher_redemption', ?, ?, 'redemption')",
      [user.id, mappedKid.id, -mappedBrand.pointsCost, `${mappedBrand.name} voucher generated`],
    );
  });

  await sendWhatsAppText(user.mobile, `Your ${mappedBrand.name} voucher has been generated! Use code ${coupon} or show the QR code at the outlet. Valid until ${formatDate(expiresAt.toISOString())}.`);
  await notifyUser(user.id, {
    title: "Voucher generated",
    body: `${mappedBrand.name} voucher ${coupon} is ready.`,
    url: "/app?tab=Account",
    tag: `voucher-${coupon}`,
  });
  await notifyAdmins({
    title: "Voucher issued",
    body: `${user.parentName || "A parent"} redeemed ${mappedBrand.name} for ${mappedBrand.pointsCost} points.`,
    url: "/admin",
    tag: `admin-voucher-${coupon}`,
  });

  return { coupon, brandName: mappedBrand.name, qrCode, expiresAt: expiresAt.toISOString() };
}

export async function confirmBooking({ eventId, kidIds, amount, razorpayPaymentId, origin }: { eventId: number; kidIds: number[]; amount: number; razorpayPaymentId: string; origin: string }) {
  await ensureProductSchemaOnce();
  const user = await requireCurrentUser({ parentOnly: true });
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
      await connection.execute("UPDATE kids SET konnekt_points = konnekt_points + ? WHERE id = ?", [pointsOnPurchase, kidId]);
      await connection.execute(
        "INSERT INTO point_ledger (user_id, kid_id, source, points, description, ref_type, ref_id) VALUES (?, ?, 'event_payment', ?, ?, 'event', ?)",
        [user.id, kidId, pointsOnPurchase, `${pointsOnPurchase} registration points credited for ${mappedEvent.title}. Remaining ${pointsOnAttendance} points unlock at check-in.`, eventId],
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

  await notifyUser(user.id, {
    title: "Activity booked",
    body: `${mappedEvent.title} pass issued. +${pointsOnPurchase} Konnect Points added.`,
    url: "/app?tab=Activities",
    tag: `booking-${eventId}-${lastQr}`,
  });
  await notifyAdmins({
    title: "New activity booking",
    body: `${user.parentName || "A parent"} booked ${mappedEvent.title} for ${cleanKidIds.length} kid${cleanKidIds.length === 1 ? "" : "s"}.`,
    url: "/admin",
    tag: `admin-booking-${eventId}-${Date.now()}`,
  });

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
    photo: str(row.photo_data) || publicPath(str(row.photo)),
    schoolIdCard: str(row.school_id_card_data) || publicPath(str(row.school_id_card)),
    status: str(row.status) || "pending",
    gender: str(row.gender) || "All",
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
    redeemedAt: dateStr(row.redeemed_at),
    status: str(row.status) || "issued",
  };
}

function mapPointHistory(row: PointHistoryRow): AppPointHistory {
  const createdAt = dateStr(row.created_at);
  return {
    id: num(row.id),
    month: formatMonth(createdAt),
    source: str(row.source),
    points: num(row.points),
    description: str(row.description),
    refType: str(row.ref_type),
    childName: str(row.child_name),
    createdAt,
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
    logo: publicPath(str(row.logo)),
    image: publicPath(str(row.image)),
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

function mapHeroSlide(row: HeroSlideRow): AppHeroSlide {
  return {
    id: num(row.id),
    title: str(row.title),
    subtitle: str(row.subtitle),
    image: publicPath(str(row.image)),
    ctaLabel: str(row.cta_label) || "Explore",
    target: str(row.target) || "activities",
  };
}

function isEligibleForEvent(kid: AppKid, user: AppUser, event: AppEvent) {
  if (kid.status !== "approved") return false;
  if (event.minAge && kid.age < event.minAge) return false;
  if (event.maxAge && kid.age > event.maxAge) return false;
  return true;
}

function str(value: unknown) {
  return value == null ? "" : String(value);
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmailAddress(value: string) {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email) && !email.includes("..");
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
  if (path.startsWith("data:")) return path;
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
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS photo_data TEXT");
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS school_id_card_data TEXT");
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS gender VARCHAR(20)");
  await executeQuery("ALTER TABLE kids ALTER COLUMN konnekt_points SET DEFAULT 0");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS min_age INTEGER");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS max_age INTEGER");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS gender VARCHAR(20)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS restricted_area VARCHAR(190)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS points_earnable INTEGER NOT NULL DEFAULT 100");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS image TEXT");
  await executeQuery("ALTER TABLE events ALTER COLUMN image TYPE TEXT");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true");
  await executeQuery("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS backup_code VARCHAR(40)");
  await executeQuery("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS points_total INTEGER NOT NULL DEFAULT 100");
  await executeQuery("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS points_awarded_on_payment INTEGER NOT NULL DEFAULT 50");
  await executeQuery("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS points_awarded_on_attendance INTEGER NOT NULL DEFAULT 0");
  await executeQuery("ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255)");
  await executeQuery("ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ");
  await executeQuery("ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ");
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(190),
      message TEXT NOT NULL,
      type VARCHAR(40) NOT NULL DEFAULT 'announcement',
      url VARCHAR(255),
      tag VARCHAR(120),
      seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await executeQuery("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE");
  await executeQuery("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(190)");
  await executeQuery("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS url VARCHAR(255)");
  await executeQuery("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tag VARCHAR(120)");
  await executeQuery("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ");
  await executeQuery("CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC)");
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS hero_slides (
      id SERIAL PRIMARY KEY,
      title VARCHAR(190) NOT NULL,
      subtitle TEXT,
      image TEXT NOT NULL,
      cta_label VARCHAR(80),
      target VARCHAR(80) NOT NULL DEFAULT 'activities',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await executeQuery("CREATE INDEX IF NOT EXISTS idx_hero_slides_active_sort ON hero_slides (is_active, sort_order)");
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
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS app_installs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      install_key VARCHAR(120) NOT NULL UNIQUE,
      source VARCHAR(80),
      user_agent TEXT,
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await executeQuery("CREATE INDEX IF NOT EXISTS idx_app_installs_user_id ON app_installs (user_id)");
  await executeQuery("CREATE INDEX IF NOT EXISTS idx_app_installs_installed_at ON app_installs (installed_at)");
}

async function expireIssuedVouchers() {
  const now = Date.now();
  if (expireIssuedVouchersReady) {
    await expireIssuedVouchersReady;
    return;
  }
  if (now - expireIssuedVouchersLastRun < EXPIRE_ISSUED_VOUCHERS_INTERVAL_MS) return;

  expireIssuedVouchersLastRun = now;
  expireIssuedVouchersReady = executeQuery("UPDATE redemptions SET status = 'expired' WHERE status = 'issued' AND expires_at IS NOT NULL AND expires_at < NOW()")
    .then(() => undefined)
    .catch((error) => {
      expireIssuedVouchersLastRun = 0;
      throw error;
    })
    .finally(() => {
      expireIssuedVouchersReady = null;
    });
  await expireIssuedVouchersReady;
}

async function ensureProductSchemaOnce() {
  productSchemaReady ??= ensureProductSchema().catch((error) => {
    productSchemaReady = null;
    throw error;
  });
  await productSchemaReady;
}

async function runBestEffort(label: string, task: () => Promise<void>) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed:`, error);
  }
}

import "server-only";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { queryOne, queryRows, executeQuery, withTransaction, type DbRow } from "@/lib/db";
import { ADMIN_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { notifyUser, notifyUsersByRole } from "@/lib/push-notifications";

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
  analytics: AdminAnalytics;
  members: AdminMember[];
  pendingKids: AdminKid[];
  events: AdminEvent[];
  liveParticipants: AdminParticipant[];
  notifications: AdminNotification[];
  heroSlides: AdminHeroSlide[];
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
  kids: AdminKid[];
};

export type AdminAnalytics = {
  appInstalls: number;
  uniqueInstalledUsers: number;
  installsToday: number;
  installsLast7Days: number;
  latestInstall: string;
  recentInstalls: AdminInstall[];
};

export type AdminInstall = {
  id: number;
  parentName: string;
  mobile: string;
  source: string;
  installedAt: string;
  lastSeenAt: string;
};

export type AdminKid = {
  id: number;
  parentId: number;
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
  points: number;
  status: "pending" | "approved" | "rejected";
};

export type AdminEvent = {
  id: number;
  title: string;
  venue: string;
  date: string;
  dateValue: string;
  timeValue: string;
  image: string;
  category: string;
  price: number;
  capacity: number;
  description: string;
  minAge: number;
  maxAge: number;
  gender: string;
  restrictedArea: string;
  pointsEarnable: number;
};

export type AdminParticipant = {
  id: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  participant: string;
  parent: string;
  phone: string;
  paid: boolean;
  checkIn: string;
  points: string;
};

export type AdminBookingVerification = {
  id: number;
  childName: string;
  parentName: string;
  phone: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  paid: boolean;
  checkedIn: boolean;
  checkedInAt: string;
  backupCode: string;
  pointsPending: number;
};

export type AdminNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};

export type AdminHeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  ctaLabel: string;
  target: string;
  sortOrder: number;
  active: boolean;
};

export type AdminBrand = {
  id: number;
  name: string;
  email: string;
  code: string;
  description: string;
  note: string;
  color: string;
  icon: string;
  logo: string;
  image: string;
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

let adminProductSchemaReady: Promise<void> | null = null;

export async function requireAdmin() {
  const cookieStore = await cookies();
  const session =
    verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value) ??
    verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session || session.role !== "admin") throw new Error("Unauthorized");
  return session;
}

export async function getAdminData(): Promise<AdminData> {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();

  const [statsRows, analyticsRows, installRows, users, memberKids, pendingKids, events, participants, notifications, heroSlides, brands, redemptions, topReferrers, recentReferrals] =
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
      queryRows<AnyRow>(`
        SELECT
          (SELECT COUNT(*)::int FROM app_installs) AS app_installs,
          (SELECT COUNT(DISTINCT user_id)::int FROM app_installs) AS unique_installed_users,
          (SELECT COUNT(*)::int FROM app_installs WHERE installed_at >= CURRENT_DATE) AS installs_today,
          (SELECT COUNT(*)::int FROM app_installs WHERE installed_at >= NOW() - INTERVAL '7 days') AS installs_last_7_days,
          (SELECT MAX(installed_at) FROM app_installs) AS latest_install
      `).catch(() => []),
      queryRows<AnyRow>(`
        SELECT ai.id, ai.source, ai.installed_at, ai.last_seen_at, u.parent_name, u.mobile
        FROM app_installs ai
        JOIN users u ON u.id = ai.user_id
        ORDER BY ai.installed_at DESC
        LIMIT 50
      `).catch(() => []),
      queryRows<AnyRow>("SELECT * FROM users ORDER BY created_at DESC LIMIT 80"),
      queryRows<AnyRow>(`
        SELECT
          k.id, k.parent_id, k.child_name, k.age, k.block_rank, k.dob, k.school, k.school_id_card,
          k.photo, k.status, k.konnekt_points, k.created_at, k.updated_at,
          (NULLIF(k.photo_data, '') IS NOT NULL) AS has_photo_data,
          (NULLIF(k.school_id_card_data, '') IS NOT NULL) AS has_school_id_card_data,
          u.parent_name, u.father_name, u.mother_name, u.mobile, u.alternate_mobile, u.locality, u.city, u.address, u.pincode
        FROM kids k
        JOIN users u ON u.id = k.parent_id
        ORDER BY k.created_at DESC
        LIMIT 240
      `),
      queryRows<AnyRow>(`
        SELECT
          k.id, k.parent_id, k.child_name, k.age, k.block_rank, k.dob, k.school, k.school_id_card,
          k.photo, k.status, k.konnekt_points, k.created_at, k.updated_at,
          (NULLIF(k.photo_data, '') IS NOT NULL) AS has_photo_data,
          (NULLIF(k.school_id_card_data, '') IS NOT NULL) AS has_school_id_card_data,
          u.parent_name, u.father_name, u.mother_name, u.mobile, u.alternate_mobile, u.locality, u.city, u.address, u.pincode
        FROM kids k
        JOIN users u ON u.id = k.parent_id
        WHERE k.status = 'pending'
        ORDER BY k.created_at DESC
        LIMIT 50
      `),
      queryRows<AnyRow>("SELECT * FROM events WHERE COALESCE(is_active, true) = true ORDER BY event_date DESC NULLS LAST, created_at DESC LIMIT 80"),
      queryRows<AnyRow>(`
        SELECT b.*, k.child_name, u.parent_name, u.mobile, e.title AS event_title, e.event_date, e.location AS event_location
        FROM bookings b
        JOIN kids k ON k.id = b.kid_id
        JOIN users u ON u.id = b.user_id
        LEFT JOIN events e ON e.id = b.event_id
        ORDER BY b.created_at DESC
        LIMIT 500
      `),
      queryRows<AnyRow>("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30"),
      queryRows<AnyRow>("SELECT * FROM hero_slides ORDER BY sort_order ASC, created_at DESC LIMIT 20"),
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
  const analyticsRow = analyticsRows[0] ?? {};
  const kidsByParent = groupKidsByParent(memberKids.map(mapAdminKid));

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
    analytics: {
      appInstalls: num(analyticsRow.app_installs),
      uniqueInstalledUsers: num(analyticsRow.unique_installed_users),
      installsToday: num(analyticsRow.installs_today),
      installsLast7Days: num(analyticsRow.installs_last_7_days),
      latestInstall: analyticsRow.latest_install ? formatDate(analyticsRow.latest_install) : "No installs tracked yet",
      recentInstalls: installRows.map((row) => ({
        id: num(row.id),
        parentName: str(row.parent_name) || "Parent",
        mobile: formatPhone(str(row.mobile)),
        source: str(row.source) || "install",
        installedAt: formatDate(row.installed_at),
        lastSeenAt: formatDate(row.last_seen_at),
      })),
    },
    members: users.map((row) => mapMember(row, kidsByParent.get(num(row.id)) ?? [])),
    pendingKids: pendingKids.map(mapAdminKid),
    events: events.map(mapEvent),
    liveParticipants: participants.map(mapParticipant),
    notifications: notifications.map(mapNotification),
    heroSlides: heroSlides.map(mapHeroSlide),
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
  await ensureAdminProductSchemaOnce();
  const event = normalizeEventInput(input);

  await executeQuery(
    "INSERT INTO events (title, location, event_date, price, capacity, category, description, image, min_age, max_age, gender, restricted_area, points_earnable, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)",
    [
      event.title,
      event.venue,
      event.eventDate,
      event.price,
      event.capacity,
      event.category,
      event.description,
      event.image || null,
      event.minAge,
      event.maxAge,
      event.gender,
      event.restrictedArea,
      event.pointsEarnable,
    ],
  );

  await runBestEffort("activity create notification", async () => {
    await notifyUsersByRole("user", {
      title: "New activity added",
      body: `${event.title} is now live. Earn up to ${event.pointsEarnable} Konnect Points.`,
      url: "/app?tab=Activities",
      tag: `event-created-${Date.now()}`,
    });
  });
}

export async function updateAdminEvent(eventId: number, input: Record<string, unknown>) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  if (!eventId) throw new Error("Activity not found.");
  const event = normalizeEventInput(input);

  await executeQuery(
    `UPDATE events
     SET title = ?, location = ?, event_date = ?, price = ?, capacity = ?, category = ?, description = ?, image = COALESCE(NULLIF(?, ''), image), min_age = ?, max_age = ?, gender = ?, restricted_area = ?, points_earnable = ?
     WHERE id = ?`,
    [
      event.title,
      event.venue,
      event.eventDate,
      event.price,
      event.capacity,
      event.category,
      event.description,
      event.image,
      event.minAge,
      event.maxAge,
      event.gender,
      event.restrictedArea,
      event.pointsEarnable,
      eventId,
    ],
  );

  await runBestEffort("activity update notification", async () => {
    await notifyUsersByRole("user", {
      title: "Activity updated",
      body: `${event.title} details were updated.`,
      url: "/app?tab=Activities",
      tag: `event-updated-${eventId}`,
    });
  });
}

export async function deleteAdminEvent(eventId: number) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  if (!eventId) throw new Error("Activity not found.");
  const event = await queryOne<AnyRow>("SELECT title FROM events WHERE id = ? LIMIT 1", [eventId]);
  await executeQuery("UPDATE events SET is_active = false WHERE id = ?", [eventId]);
  await notifyUsersByRole("user", {
    title: "Activity update",
    body: `${str(event?.title) || "An activity"} was removed from the app.`,
    url: "/app?tab=Activities",
    tag: `event-deleted-${eventId}`,
  });
}

export async function createAdminNotification(input: Record<string, unknown>) {
  await requireAdmin();
  const message = clean(input.message);
  if (!message) throw new Error("Message is required.");
  await executeQuery("INSERT INTO notifications (message, type) VALUES (?, ?)", [message, clean(input.type) === "alert" ? "alert" : "announcement"]);
  await notifyUsersByRole("user", {
    title: clean(input.type) === "alert" ? "Konnectly Alert" : "Konnectly Update",
    body: message,
    url: "/app?tab=Updates",
    tag: `admin-update-${Date.now()}`,
  });
}

export async function createHeroSlide(input: Record<string, unknown>) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  const title = clean(input.title);
  const image = cleanImageData(input.image);
  const active = isTruthy(input.active);
  if (!title) throw new Error("Slide title is required.");
  if (!image) throw new Error("Hero slide image is required.");

  await executeQuery(
    "INSERT INTO hero_slides (title, subtitle, image, cta_label, target, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      title,
      clean(input.subtitle),
      image,
      clean(input.ctaLabel) || "Explore",
      clean(input.target) || "activities",
      Number(input.sortOrder || 0),
      active,
    ],
  );

  if (active) {
    await notifyUsersByRole("user", {
      title: "Home updated",
      body: `${title} is now live on Konnectly.`,
      url: "/app",
      tag: `hero-created-${Date.now()}`,
    });
  }
}

export async function updateHeroSlide(slideId: number, input: Record<string, unknown>) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  const title = clean(input.title);
  const active = isTruthy(input.active);
  if (!slideId) throw new Error("Hero slide not found.");
  if (!title) throw new Error("Slide title is required.");

  await executeQuery(
    `
      UPDATE hero_slides
      SET title = ?,
          subtitle = ?,
          image = COALESCE(?, image),
          cta_label = ?,
          target = ?,
          sort_order = ?,
          is_active = ?,
          updated_at = NOW()
      WHERE id = ?
    `,
    [
      title,
      clean(input.subtitle),
      cleanImageData(input.image),
      clean(input.ctaLabel) || "Explore",
      clean(input.target) || "activities",
      Number(input.sortOrder || 0),
      active,
      slideId,
    ],
  );

  await notifyUsersByRole("user", {
    title: "Home banner updated",
    body: active ? `${title} was updated on Konnectly.` : `${title} was paused on Konnectly.`,
    url: "/app",
    tag: `hero-updated-${slideId}`,
  });
}

export async function deleteHeroSlide(slideId: number) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  if (!slideId) throw new Error("Hero slide not found.");
  const slide = await queryOne<AnyRow>("SELECT title FROM hero_slides WHERE id = ? LIMIT 1", [slideId]);
  await executeQuery("DELETE FROM hero_slides WHERE id = ?", [slideId]);
  await notifyUsersByRole("user", {
    title: "Home banner removed",
    body: `${str(slide?.title) || "A Konnectly banner"} was removed from the app.`,
    url: "/app",
    tag: `hero-deleted-${slideId}`,
  });
}

export async function createAdminBrand(input: Record<string, unknown>) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  const name = clean(input.name);
  const active = isTruthy(input.active);
  if (!name) throw new Error("Brand name is required.");
  await executeQuery("INSERT INTO brands (name, description, note, points_cost, logo, image, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    name,
    clean(input.description),
    clean(input.note),
    Number(input.pointsCost || 250),
    cleanImageData(input.logo),
    cleanImageData(input.image),
    active,
  ]);

  if (active) {
    await notifyUsersByRole("user", {
      title: "New reward partner",
      body: `${name} rewards are now available.`,
      url: "/app?tab=Account",
      tag: `brand-created-${Date.now()}`,
    });
  }
}

export async function updateAdminBrand(input: Record<string, unknown>) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  const brandId = Number(input.brandId);
  const name = clean(input.name);
  const active = isTruthy(input.active);
  if (!brandId) throw new Error("Brand not found.");
  if (!name) throw new Error("Brand name is required.");
  await executeQuery(
    `UPDATE brands
     SET name = ?,
         description = ?,
         note = ?,
         points_cost = ?,
         logo = COALESCE(NULLIF(?, ''), logo),
         image = COALESCE(NULLIF(?, ''), image),
         is_active = ?
     WHERE id = ?`,
    [
      name,
      clean(input.description),
      clean(input.note),
      Number(input.pointsCost || 0),
      cleanImageData(input.logo) || "",
      cleanImageData(input.image) || "",
      active,
      brandId,
    ],
  );

  await notifyUsersByRole("user", {
    title: "Reward partner updated",
    body: active ? `${name} reward details were updated.` : `${name} rewards are currently paused.`,
    url: "/app?tab=Account",
    tag: `brand-updated-${brandId}`,
  });
}

export async function updateBrandStatus(brandId: number, active: boolean) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  if (!brandId) throw new Error("Brand not found.");
  const brand = await queryOne<AnyRow>("SELECT name FROM brands WHERE id = ? LIMIT 1", [brandId]);
  await executeQuery("UPDATE brands SET is_active = ? WHERE id = ?", [active, brandId]);
  await notifyUsersByRole("user", {
    title: active ? "Reward partner available" : "Reward partner paused",
    body: active ? `${str(brand?.name) || "A reward partner"} is available again.` : `${str(brand?.name) || "A reward partner"} is not available right now.`,
    url: "/app?tab=Account",
    tag: `brand-status-${brandId}`,
  });
}

export async function deleteAdminBrand(brandId: number) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  if (!brandId) throw new Error("Brand not found.");
  const brand = await queryOne<AnyRow>("SELECT name FROM brands WHERE id = ? LIMIT 1", [brandId]);
  try {
    await executeQuery("UPDATE redemptions SET brand_id = NULL WHERE brand_id = ?", [brandId]);
  } catch {
    // Older installations stored only brand_name on redemptions.
  }
  await executeQuery("DELETE FROM brand_users WHERE brand_id = ?", [brandId]);
  await executeQuery("DELETE FROM brands WHERE id = ?", [brandId]);
  await notifyUsersByRole("user", {
    title: "Reward partner removed",
    body: `${str(brand?.name) || "A reward partner"} was removed from Konnectly rewards.`,
    url: "/app?tab=Account",
    tag: `brand-deleted-${brandId}`,
  });
}

export async function updateKidStatus(kidId: number, status: "approved" | "rejected") {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  const kid = await queryOne<AnyRow>(
    `SELECT k.child_name, u.id AS parent_id, u.mobile
     FROM kids k
     JOIN users u ON u.id = k.parent_id
     WHERE k.id = ?
     LIMIT 1`,
    [kidId],
  );
  if (!kid) throw new Error("Child profile not found.");
  const kode = status === "approved" ? await generateKidCode(kidId) : null;
  if (status === "approved") {
    await executeQuery("UPDATE kids SET status = 'approved', konnekt_kode = COALESCE(konnekt_kode, ?), updated_at = NOW() WHERE id = ?", [kode, kidId]);
    await awardReferralOnApproval(kidId);
  } else {
    await executeQuery("UPDATE kids SET status = 'rejected', updated_at = NOW() WHERE id = ?", [kidId]);
  }

  await runBestEffort("kid status push notification", async () => {
    const childName = str(kid.child_name) || "Your child";
    const body =
      status === "approved"
        ? `${childName}'s profile has been approved. You can now register for events and activities.`
        : `${childName}'s profile needs review. Please update the details.`;

    await notifyUser(num(kid.parent_id), {
      title: status === "approved" ? "Child profile approved" : "Child profile needs review",
      body,
      url: "/app?tab=Account",
      tag: `kid-status-${kidId}-${status}`,
      vibrate: [200, 100, 200],
    });
  });
}

export async function deleteAdminMember(parentId: number) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  if (!parentId) throw new Error("Member not found.");

  const member = await queryOne<AnyRow>(
    "SELECT id, parent_name, mobile, role FROM users WHERE id = ? LIMIT 1",
    [parentId],
  );
  if (!member) throw new Error("Member not found.");
  if (str(member.role) === "admin") throw new Error("Admin account cannot be removed from memberships.");

  await withTransaction(async (db) => {
    await db.execute("DELETE FROM point_ledger WHERE user_id = ? OR kid_id IN (SELECT id FROM kids WHERE parent_id = ?)", [parentId, parentId]);
    await db.execute("DELETE FROM users WHERE id = ?", [parentId]);
  });

  try {
    await notifyUsersByRole("admin", {
      title: "Member removed",
      body: `${str(member.parent_name) || formatPhone(str(member.mobile)) || "A member"} was removed from memberships.`,
      url: "/admin",
      tag: `member-deleted-${parentId}`,
    });
  } catch (error) {
    console.warn("Unable to notify admins about removed member:", error);
  }
}

export async function getAdminKidFile(kidId: number, type: "photo" | "schoolId") {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
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
    `SELECT k.parent_id, k.child_name, u.parent_name, u.mobile, u.block_sector AS referral_code
     FROM kids k
     JOIN users u ON u.id = k.parent_id
     WHERE k.id = ?
     LIMIT 1`,
    [kidId],
  );
  const referredParentId = num(approvedKid?.parent_id);
  const referralCode = str(approvedKid?.referral_code).trim().toUpperCase();
  if (!referredParentId || !referralCode) return;

  const otherApprovedKid = await queryOne<AnyRow>(
    "SELECT id FROM kids WHERE parent_id = ? AND id <> ? AND status = 'approved' LIMIT 1",
    [referredParentId, kidId],
  );
  if (otherApprovedKid) return;

  const existingReward = await queryOne<AnyRow>(
    "SELECT id FROM referral_rewards WHERE referred_parent_id = ? LIMIT 1",
    [referredParentId],
  );
  if (existingReward) return;

  const referrer = await findReferrerByCode(referralCode);
  if (!referrer || referrer.parentId === referredParentId) return;

  const points = 50;
  const referrerKids = await queryRows<AnyRow>("SELECT id, child_name FROM kids WHERE parent_id = ? ORDER BY id ASC", [referrer.parentId]);
  const shares = splitPoints(points, referrerKids.length);

  await executeQuery("UPDATE users SET konnect_points = konnect_points + ? WHERE id = ?", [points, referrer.parentId]);
  for (const [index, kid] of referrerKids.entries()) {
    const share = shares[index] ?? 0;
    if (share <= 0) continue;
    await executeQuery("UPDATE kids SET konnekt_points = konnekt_points + ? WHERE id = ?", [share, num(kid.id)]);
    await executeQuery(
      "INSERT INTO point_ledger (user_id, kid_id, source, points, description, ref_type, ref_id) VALUES (?, ?, 'successful_referral', ?, ?, 'referral', ?)",
      [
        referrer.parentId,
        num(kid.id),
        share,
        `${points} referral points received and divided across ${referrerKids.length} kid profile${referrerKids.length === 1 ? "" : "s"}. ${str(approvedKid?.parent_name) || "A parent"} joined using your referral.`,
        referredParentId,
      ],
    );
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

  const splitMessage = formatReferralSplitMessage(points, referrerKids.map((kid, index) => ({ name: str(kid.child_name) || `Kid ${index + 1}`, points: shares[index] ?? 0 })));
  await runBestEffort("referral point notifications", async () => {
    await Promise.allSettled([
      notifyUser(referrer.parentId, {
        title: "Referral points received",
        body: `You received ${points} Konnect Points for your referral. ${splitMessage}`,
        url: "/app?tab=Account",
        tag: `referral-earned-${referredParentId}`,
      }),
      notifyUser(referredParentId, {
        title: "Welcome points added",
        body: `${points} Konnect Points were added to ${str(approvedKid?.child_name) || "your first verified kid"} after profile verification.`,
        url: "/app?tab=Account",
        tag: `referral-welcome-${kidId}`,
      }),
    ]);
  });
}

function splitPoints(points: number, count: number) {
  if (count <= 0) return [];
  const base = Math.floor(points / count);
  const remainder = points % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function formatReferralSplitMessage(shares: Array<{ name: string; points: number }>): string;
function formatReferralSplitMessage(points: number, shares: Array<{ name: string; points: number }>): string;
function formatReferralSplitMessage(pointsOrShares: number | Array<{ name: string; points: number }>, maybeShares?: Array<{ name: string; points: number }>) {
  const shares = Array.isArray(pointsOrShares) ? pointsOrShares : maybeShares ?? [];
  if (!shares.length) return "Points are added to your family balance.";
  if (shares.length === 1) return `${shares[0].points} points added to ${shares[0].name}.`;
  return `They were divided between your ${shares.length} kid profiles: ${shares.map((share) => `${share.name} +${share.points}`).join(", ")}.`;
}

async function ensureAdminProductSchema() {
  await executeQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS konnect_points INTEGER NOT NULL DEFAULT 0");
  await executeQuery("ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo TEXT");
  await executeQuery("ALTER TABLE brands ADD COLUMN IF NOT EXISTS image TEXT");
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS photo_data TEXT");
  await executeQuery("ALTER TABLE kids ADD COLUMN IF NOT EXISTS school_id_card_data TEXT");
  await executeQuery("ALTER TABLE kids ALTER COLUMN konnekt_points SET DEFAULT 0");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS min_age INTEGER");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS max_age INTEGER");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS gender VARCHAR(20)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS restricted_area VARCHAR(190)");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS points_earnable INTEGER NOT NULL DEFAULT 100");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS image TEXT");
  await executeQuery("ALTER TABLE events ALTER COLUMN image TYPE TEXT");
  await executeQuery("ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true");
  await executeQuery("ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255)");
  await executeQuery("ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ");
  await executeQuery("ALTER TABLE redemptions ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ");
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

async function ensureAdminProductSchemaOnce() {
  adminProductSchemaReady ??= ensureAdminProductSchema().catch((error) => {
    adminProductSchemaReady = null;
    throw error;
  });
  await adminProductSchemaReady;
}

async function runBestEffort(label: string, task: () => Promise<void>) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed:`, error);
  }
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
  await ensureAdminProductSchemaOnce();
  const redemption = await queryOne<AnyRow>(
    `SELECT r.brand_name, r.coupon_code, k.parent_id
     FROM redemptions r
     JOIN kids k ON k.id = r.kid_id
     WHERE r.id = ?
     LIMIT 1`,
    [redemptionId],
  );
  await executeQuery(
    `
      UPDATE redemptions
      SET status = ?,
          redeemed_at = CASE
            WHEN ? = 'redeemed' THEN NOW()
            WHEN ? = 'issued' THEN NULL
            ELSE redeemed_at
          END
      WHERE id = ?
    `,
    [status, status, status, redemptionId],
  );

  await notifyUser(num(redemption?.parent_id), {
    title: "Voucher status updated",
    body: `${str(redemption?.brand_name) || "Your voucher"} is now ${status}.`,
    url: "/app?tab=Account",
    tag: `redemption-${redemptionId}-${status}`,
  });
}

export async function checkInBooking(bookingId: number) {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();

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
        `${attendancePoints} check-in points credited for attending ${str(booking.event_title) || "an event"}`,
        bookingId,
      ],
    );
  }

  await notifyUser(num(booking.user_id), {
    title: "Activity check-in complete",
    body:
      attendancePoints > 0
        ? `${attendancePoints} points credited for ${str(booking.event_title) || "your activity"}.`
        : `Check-in completed for ${str(booking.event_title) || "your activity"}.`,
    url: "/app?tab=Activities",
    tag: `booking-checkin-${bookingId}`,
  });
}

export async function getBookingForCheckIn(token: string): Promise<AdminBookingVerification> {
  await requireAdmin();
  await ensureAdminProductSchemaOnce();
  const cleanToken = clean(token);
  if (!cleanToken) throw new Error("Ticket QR token is required.");

  const booking = await queryOne<AnyRow>(
    `SELECT b.*, k.child_name, u.parent_name, u.mobile, e.title AS event_title, e.event_date, e.location AS event_location
     FROM bookings b
     JOIN kids k ON k.id = b.kid_id
     JOIN users u ON u.id = b.user_id
     LEFT JOIN events e ON e.id = b.event_id
     WHERE b.qr_token = ?
     LIMIT 1`,
    [cleanToken],
  );

  if (!booking) throw new Error("Ticket not found.");
  return mapBookingVerification(booking);
}

export async function checkInBookingByToken(token: string) {
  const booking = await getBookingForCheckIn(token);
  await checkInBooking(booking.id);
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

function mapMember(row: AnyRow, kids: AdminKid[]): AdminMember {
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
    kids,
  };
}

function mapAdminKid(row: AnyRow): AdminKid {
  const id = num(row.id);
  const hasPhotoData = row.has_photo_data === true || str(row.has_photo_data) === "true" || Boolean(str(row.photo_data));
  const hasSchoolIdData = row.has_school_id_card_data === true || str(row.has_school_id_card_data) === "true" || Boolean(str(row.school_id_card_data));

  return {
    id,
    parentId: num(row.parent_id),
    initials: initials(str(row.child_name)),
    name: str(row.child_name) || "Child",
    age: `${num(row.age)} years`,
    grade: str(row.block_rank) || "Newbie",
    dob: row.dob ? formatDate(row.dob) : "-",
    school: str(row.school) || "-",
    schoolId: str(row.school_id_card) || "-",
    photo: hasPhotoData ? adminKidFileUrl(id, "photo") : previewablePublicPath(str(row.photo)),
    schoolIdPreview: hasSchoolIdData ? adminKidFileUrl(id, "schoolId") : previewablePublicPath(str(row.school_id_card)),
    parent: str(row.parent_name) || [str(row.father_name), str(row.mother_name)].filter(Boolean).join(" & ") || "Parent",
    phone: formatPhone(str(row.mobile)),
    locality: str(row.locality) || str(row.city) || "-",
    requested: formatProfileTime(row.status, row.created_at, row.updated_at),
    points: num(row.konnekt_points),
    status: normalizeKidStatus(row.status),
  };
}

function groupKidsByParent(kids: AdminKid[]) {
  const grouped = new Map<number, AdminKid[]>();
  for (const kid of kids) {
    const existing = grouped.get(kid.parentId);
    if (existing) {
      existing.push(kid);
    } else {
      grouped.set(kid.parentId, [kid]);
    }
  }
  return grouped;
}

function normalizeKidStatus(value: unknown): AdminKid["status"] {
  const status = str(value);
  if (status === "approved" || status === "rejected" || status === "pending") return status;
  return "pending";
}

function mapEvent(row: AnyRow): AdminEvent {
  const eventDate = row.event_date ? new Date(String(row.event_date)) : null;
  const validDate = eventDate && !Number.isNaN(eventDate.getTime()) ? eventDate : null;
  return {
    id: num(row.id),
    title: str(row.title),
    venue: str(row.location),
    date: validDate ? formatDate(row.event_date) : "Date TBA",
    dateValue: validDate ? validDate.toISOString().slice(0, 10) : "",
    timeValue: validDate ? validDate.toTimeString().slice(0, 5) : "",
    image: publicPath(str(row.image)),
    category: str(row.category) || "Experience",
    price: num(row.price),
    capacity: num(row.capacity),
    description: str(row.description),
    minAge: num(row.min_age),
    maxAge: num(row.max_age),
    gender: str(row.gender) || "All",
    restrictedArea: str(row.restricted_area),
    pointsEarnable: num(row.points_earnable) || 100,
  };
}

function mapParticipant(row: AnyRow): AdminParticipant {
  return {
    id: num(row.id),
    eventId: num(row.event_id),
    eventTitle: str(row.event_title) || "Event",
    eventDate: formatShortDate(row.event_date),
    eventLocation: str(row.event_location),
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

function mapBookingVerification(row: AnyRow): AdminBookingVerification {
  const checkedIn = Boolean(row.checked_in_at);
  return {
    id: num(row.id),
    childName: str(row.child_name) || "Child",
    parentName: str(row.parent_name) || "Parent",
    phone: formatPhone(str(row.mobile)),
    eventTitle: str(row.event_title) || "Activity",
    eventDate: formatDate(row.event_date),
    eventLocation: str(row.event_location) || "Venue TBA",
    paid: str(row.payment_status) === "success",
    checkedIn,
    checkedInAt: checkedIn ? formatDate(row.checked_in_at) : "",
    backupCode: str(row.backup_code),
    pointsPending: Math.max(0, num(row.points_total) - num(row.points_awarded_on_payment) - num(row.points_awarded_on_attendance)),
  };
}

function mapHeroSlide(row: AnyRow): AdminHeroSlide {
  return {
    id: num(row.id),
    title: str(row.title),
    subtitle: str(row.subtitle),
    image: publicPath(str(row.image)),
    ctaLabel: str(row.cta_label) || "Explore",
    target: str(row.target) || "activities",
    sortOrder: num(row.sort_order),
    active: num(row.is_active ?? 1) === 1,
  };
}

function mapBrand(row: AnyRow): AdminBrand {
  const name = str(row.name);
  return {
    id: num(row.id),
    name,
    email: str(row.email) || "No login user",
    code: str(row.referral_code) || `REF-${name.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "BRD"}`,
    description: str(row.description),
    note: str(row.note),
    color: name.toLowerCase().includes("domino") ? "bg-[#f4484d]" : "bg-[#6754d6]",
    icon: name.toLowerCase().includes("pizza") || name.toLowerCase().includes("domino") ? "Pizza" : "Gift",
    logo: publicPath(str(row.logo)),
    image: publicPath(str(row.image)),
    pointsCost: num(row.points_cost),
    active: num(row.is_active ?? 1) === 1,
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

function normalizeEventInput(input: Record<string, unknown>) {
  const title = clean(input.title);
  if (!title) throw new Error("Activity name is required.");

  const date = clean(input.date);
  const time = clean(input.time) || "00:00";
  const eventDate = date ? new Date(`${date}T${time}:00`) : null;
  if (eventDate && Number.isNaN(eventDate.getTime())) throw new Error("Please enter a valid activity date.");

  return {
    title,
    venue: clean(input.venue),
    eventDate,
    price: Number(input.price || 0),
    capacity: input.capacity ? Number(input.capacity) : null,
    category: clean(input.category) || "Experience",
    description: clean(input.description),
    image: cleanImageData(input.image) || "",
    minAge: input.minAge ? Number(input.minAge) : null,
    maxAge: input.maxAge ? Number(input.maxAge) : null,
    gender: clean(input.gender) || "All",
    restrictedArea: clean(input.restrictedArea),
    pointsEarnable: Number(input.pointsEarnable || 100),
  };
}

function cleanImageData(value: unknown) {
  const image = clean(value);
  if (!image) return null;
  if (image.startsWith("data:image/") || image.startsWith("/") || /^https?:\/\//i.test(image)) return image;
  return null;
}

function isTruthy(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return true;
  return ["1", "true", "yes", "on", "active"].includes(value.toLowerCase());
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

function formatProfileTime(status: unknown, createdAt: unknown, updatedAt: unknown) {
  const normalizedStatus = normalizeKidStatus(status);
  if (normalizedStatus === "approved") return formatRelative(updatedAt || createdAt, "Approved");
  if (normalizedStatus === "rejected") return formatRelative(updatedAt || createdAt, "Rejected");
  return formatRelative(createdAt, "Requested");
}

function formatRelative(value: unknown, label = "Requested") {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return `${label} just now`;
  if (minutes < 60) return `${label} ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${label} ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${label} ${days}d ago`;
}

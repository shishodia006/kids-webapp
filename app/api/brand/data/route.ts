import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { queryOne, queryRows, type DbRow } from "@/lib/db";
import { cookies } from "next/headers";

type AnyRow = DbRow & Record<string, unknown>;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
    if (!session || session.role !== "brand" || !session.brandId) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const brand = await queryOne<AnyRow>(
      `SELECT b.*, bu.email, bu.partner_mobile, bu.referral_code
       FROM brands b
       LEFT JOIN brand_users bu ON bu.brand_id = b.id
       WHERE b.id = ?
       LIMIT 1`,
      [session.brandId],
    );

    const redemptions = await queryRows<AnyRow>(
      `SELECT r.*, k.child_name
       FROM redemptions r
       LEFT JOIN kids k ON k.id = r.kid_id
       WHERE r.brand_id = ? OR LOWER(r.brand_name) = LOWER(?)
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [session.brandId, String(brand?.name || "")],
    );

    const redeemed = redemptions.filter((item) => String(item.status) === "redeemed").length;
    const [heroSlides, notifications] = await Promise.all([
      queryRows<AnyRow>(
        `SELECT id, title, subtitle, cta_label, target
         FROM hero_slides
         WHERE COALESCE(is_active, true) = true
         ORDER BY sort_order ASC, id DESC
         LIMIT 8`,
      ),
      queryRows<AnyRow>(
        `SELECT id, message, type, created_at
         FROM notifications
         WHERE user_id IS NULL
         ORDER BY created_at DESC
         LIMIT 8`,
      ),
    ]);

    return Response.json({
      brand: {
        id: Number(brand?.id || session.brandId),
        name: String(brand?.name || "Partner"),
        email: String(brand?.email || ""),
        mobile: String(brand?.partner_mobile || ""),
        referralCode: String(brand?.referral_code || ""),
        tier: "Silver Partner",
        description: String(brand?.description || ""),
        note: String(brand?.note || ""),
        createdAt: brand?.created_at ? new Date(String(brand.created_at)).toISOString() : "",
      },
      metrics: {
        vouchersRedeemed: redeemed,
        revenue: redeemed * 88,
        newCustomers: new Set(redemptions.map((item) => item.kid_id)).size,
      },
      redemptions: redemptions.map((item) => ({
        id: Number(item.id),
        member: String(item.child_name || "Member"),
        brand: String(item.brand_name || brand?.name || "Partner"),
        points: Number(item.points_spent || 0),
        coupon: String(item.coupon_code || ""),
        qrCode: String(item.qr_code || ""),
        expiresAt: item.expires_at ? new Date(String(item.expires_at)).toISOString() : "",
        redeemedAt: item.redeemed_at ? new Date(String(item.redeemed_at)).toISOString() : "",
        createdAt: item.created_at ? new Date(String(item.created_at)).toISOString() : "",
        status: String(item.status || "issued"),
      })),
      updates: [
        ...heroSlides.map((slide) => ({
          id: `hero-${String(slide.id)}`,
          title: String(slide.title || "Konnectly Update"),
          subtitle: String(slide.subtitle || `${String(brand?.name || "Partner")} can join this campaign.`),
          ctaLabel: String(slide.cta_label || "View"),
          target: normalizeUpdateTarget(slide.target),
          type: "hero",
        })),
        ...notifications.map((notification) => ({
          id: `notification-${String(notification.id)}`,
          title: String(notification.type || "Update").replace(/^\w/, (letter) => letter.toUpperCase()),
          subtitle: String(notification.message || "New Konnectly update available."),
          ctaLabel: "View Opportunities",
          target: "opportunities",
          type: "notification",
        })),
      ],
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to load brand data." }, { status: 500 });
  }
}

function normalizeUpdateTarget(value: unknown) {
  const target = String(value || "").toLowerCase();
  if (target.includes("upgrade")) return "upgrade";
  return "opportunities";
}

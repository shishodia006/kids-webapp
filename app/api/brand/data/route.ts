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

    return Response.json({
      brand: {
        id: Number(brand?.id || session.brandId),
        name: String(brand?.name || "Partner"),
        email: String(brand?.email || ""),
        mobile: String(brand?.partner_mobile || ""),
        referralCode: String(brand?.referral_code || ""),
        tier: "Silver Partner",
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
        status: String(item.status || "issued"),
      })),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to load brand data." }, { status: 500 });
  }
}

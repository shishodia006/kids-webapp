import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { executeQuery, queryOne, type DbRow } from "@/lib/db";
import { cookies } from "next/headers";

type RedemptionRow = DbRow & {
  id: number;
  kid_id: number;
  brand_id: number | null;
  brand_name: string;
  points_spent: number;
  coupon_code: string;
  qr_code: string | null;
  status: string;
  expires_at: Date | string | null;
  redeemed_at: Date | string | null;
  created_at: Date | string | null;
  child_name: string | null;
};

type BrandRow = DbRow & {
  name: string;
};

export async function POST(request: Request) {
  try {
    const session = verifySessionToken((await cookies()).get(SESSION_COOKIE_NAME)?.value);
    if (!session || session.role !== "brand" || !session.brandId) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const code = normalizeCode(body.code);
    if (!code) return Response.json({ message: "Please enter a valid voucher code." }, { status: 400 });
    const brand = await queryOne<BrandRow>("SELECT name FROM brands WHERE id = ? LIMIT 1", [session.brandId]);

    const redemption = await queryOne<RedemptionRow>(
      `SELECT r.*, k.child_name
       FROM redemptions r
       LEFT JOIN kids k ON k.id = r.kid_id
       WHERE (UPPER(r.coupon_code) = ? OR UPPER(r.qr_code) = ?)
         AND (r.brand_id = ? OR LOWER(r.brand_name) = LOWER(?))
       LIMIT 1`,
      [code, code.startsWith("QR-") ? code : `QR-${code}`, session.brandId, String(brand?.name || "")],
    );

    if (!redemption) {
      return Response.json({ message: "Voucher not found for this brand." }, { status: 404 });
    }

    if (String(redemption.status) === "redeemed") {
      return Response.json({ message: "Voucher was already approved.", redemption: mapRedemption(redemption) });
    }

    if (String(redemption.status) !== "issued") {
      return Response.json({ message: `Voucher is ${String(redemption.status)} and cannot be approved.` }, { status: 400 });
    }

    if (redemption.expires_at && new Date(String(redemption.expires_at)).getTime() < Date.now()) {
      await executeQuery("UPDATE redemptions SET status = 'expired' WHERE id = ?", [redemption.id]);
      return Response.json({ message: "Voucher has expired." }, { status: 400 });
    }

    await executeQuery("UPDATE redemptions SET status = 'redeemed', redeemed_at = NOW() WHERE id = ?", [redemption.id]);
    const updated = await queryOne<RedemptionRow>(
      `SELECT r.*, k.child_name
       FROM redemptions r
       LEFT JOIN kids k ON k.id = r.kid_id
       WHERE r.id = ?
       LIMIT 1`,
      [redemption.id],
    );

    return Response.json({ message: "Voucher approved successfully.", redemption: mapRedemption(updated ?? redemption) });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Unable to approve voucher right now." }, { status: 500 });
  }
}

function normalizeCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^https?:\/\/\S*?(KON-[A-Z0-9-]+)/i, "$1").toUpperCase();
}

function mapRedemption(item: RedemptionRow) {
  return {
    id: Number(item.id),
    member: String(item.child_name || "Member"),
    brand: String(item.brand_name || "Partner"),
    points: Number(item.points_spent || 0),
    coupon: String(item.coupon_code || ""),
    qrCode: String(item.qr_code || ""),
    expiresAt: item.expires_at ? new Date(String(item.expires_at)).toISOString() : "",
    redeemedAt: item.redeemed_at ? new Date(String(item.redeemed_at)).toISOString() : new Date().toISOString(),
    createdAt: item.created_at ? new Date(String(item.created_at)).toISOString() : "",
    status: "redeemed",
  };
}

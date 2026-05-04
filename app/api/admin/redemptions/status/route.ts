import { updateRedemptionStatus } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const status = ["issued", "redeemed", "cancelled", "expired"].includes(body.status) ? body.status : "issued";
    await updateRedemptionStatus(Number(body.redemptionId), status);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update redemption.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

import { updateRedemptionStatus } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await updateRedemptionStatus(Number(body.redemptionId), body.status === "cancelled" ? "cancelled" : "issued");
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update redemption.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

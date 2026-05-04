import { updateKidStatus } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await updateKidStatus(Number(body.kidId), body.status === "approved" ? "approved" : "rejected");
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update kid status.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

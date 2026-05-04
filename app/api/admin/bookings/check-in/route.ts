import { checkInBooking } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await checkInBooking(Number(body.bookingId));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check in participant.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

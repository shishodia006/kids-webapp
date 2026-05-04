import { confirmBooking } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const origin = new URL(request.url).origin;
    return Response.json(
      await confirmBooking({
        eventId: Number(body.eventId),
        kidIds: Array.isArray(body.kidIds) ? body.kidIds.map(Number) : [],
        amount: Number(body.amount),
        razorpayPaymentId: String(body.razorpayPaymentId || ""),
        origin,
      }),
    );
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to confirm booking." }, { status: 400 });
  }
}

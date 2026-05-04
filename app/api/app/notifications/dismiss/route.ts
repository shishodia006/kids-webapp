import { dismissNotification } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await dismissNotification(Number(body.notificationId));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to dismiss notification." }, { status: 400 });
  }
}

import { checkInBookingByToken, getBookingForCheckIn } from "@/lib/admin-data";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    return Response.json(await getBookingForCheckIn(token));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify ticket.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 404 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await checkInBookingByToken(String(body.token ?? ""));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check in ticket.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

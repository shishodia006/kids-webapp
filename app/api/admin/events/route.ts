import { createAdminEvent } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    await createAdminEvent(await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create event.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

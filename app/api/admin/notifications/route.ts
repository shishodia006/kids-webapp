import { createAdminNotification } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    await createAdminNotification(await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to post update.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

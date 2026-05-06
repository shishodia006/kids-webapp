import { createAdminEvent, deleteAdminEvent, updateAdminEvent } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    await createAdminEvent(await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create event.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await updateAdminEvent(Number(body.eventId), body);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update event.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    await deleteAdminEvent(Number(body.eventId));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete event.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

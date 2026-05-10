import { deleteAdminMember } from "@/lib/admin-data";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    await deleteAdminMember(Number(body.memberId));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove member.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

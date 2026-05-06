import { createHeroSlide, deleteHeroSlide, updateHeroSlide } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    await createHeroSlide(await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add hero slide.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await updateHeroSlide(Number(body.slideId), body);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update hero slide.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    await deleteHeroSlide(Number(body.slideId));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove hero slide.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

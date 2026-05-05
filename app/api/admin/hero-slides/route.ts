import { createHeroSlide } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    await createHeroSlide(await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add hero slide.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

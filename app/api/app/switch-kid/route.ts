import { switchActiveKid } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await switchActiveKid(Number(body.kidId));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to switch member." }, { status: 400 });
  }
}

import { addChildProfile } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await addChildProfile(body));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to add child profile." }, { status: 400 });
  }
}

import { updateChildProfile } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await updateChildProfile(body));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to update kid profile." }, { status: 400 });
  }
}

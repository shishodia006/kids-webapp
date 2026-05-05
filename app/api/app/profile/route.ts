import { updateParentProfile } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await updateParentProfile(body));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to update parent profile." }, { status: 400 });
  }
}

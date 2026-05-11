import { addChildProfile } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await addChildProfile(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add child profile.";
    const isAuthError = message === "Unauthorized" || message.includes("parent account");
    return Response.json({ message }, { status: isAuthError ? 401 : 400 });
  }
}

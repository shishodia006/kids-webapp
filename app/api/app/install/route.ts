import { trackAppInstall } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return Response.json(await trackAppInstall(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to track app install.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

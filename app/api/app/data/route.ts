import { getAppData } from "@/lib/app-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    return Response.json(await getAppData(origin), {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load app data.";
    return Response.json(
      { message },
      {
        status: message === "Unauthorized" ? 401 : 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }
}

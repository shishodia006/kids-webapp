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
    const isAuthError = message === "Unauthorized" || message.includes("parent account");
    return Response.json(
      { message },
      {
        status: isAuthError ? 401 : 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }
}

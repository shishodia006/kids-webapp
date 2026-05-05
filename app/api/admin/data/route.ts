import { getAdminData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getAdminData(), {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load admin data.";
    return Response.json(
      { message },
      {
        status: message === "Unauthorized" ? 401 : 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }
}

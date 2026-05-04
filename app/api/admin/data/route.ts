import { getAdminData } from "@/lib/admin-data";

export async function GET() {
  try {
    return Response.json(await getAdminData());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load admin data.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

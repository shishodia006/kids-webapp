import { createAdminBrand, updateBrandStatus } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    await createAdminBrand(await request.json());
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add brand.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    await updateBrandStatus(Number(body.brandId), Boolean(body.active));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update brand.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

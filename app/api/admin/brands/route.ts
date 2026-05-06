import { createAdminBrand, deleteAdminBrand, updateAdminBrand, updateBrandStatus } from "@/lib/admin-data";

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
    if (body.name !== undefined || body.pointsCost !== undefined || body.description !== undefined || body.note !== undefined) {
      await updateAdminBrand(body);
    } else {
      await updateBrandStatus(Number(body.brandId), Boolean(body.active));
    }
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update brand.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    await deleteAdminBrand(Number(body.brandId));
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove brand.";
    return Response.json({ message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

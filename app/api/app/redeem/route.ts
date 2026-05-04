import { redeemBrand } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await redeemBrand(Number(body.brandId)));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Unable to issue voucher." }, { status: 400 });
  }
}

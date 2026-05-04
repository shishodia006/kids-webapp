import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (!session || session.role !== "brand") {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  return Response.json({
    authenticated: true,
    brandUserId: session.brandUserId,
    brandId: session.brandId,
  });
}

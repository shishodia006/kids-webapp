import { checkDbConnection } from "@/lib/db";

export async function GET() {
  try {
    const ok = await checkDbConnection();
    return Response.json({ ok });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, message: "Database connection failed." }, { status: 500 });
  }
}

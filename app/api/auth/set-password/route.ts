import { setParentPassword } from "@/lib/auth/accounts";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const session = verifySessionToken((await cookies()).get(SESSION_COOKIE_NAME)?.value);
    if (!session || session.role !== "user") {
      return Response.json({ message: "Please sign in again to set your password." }, { status: 401 });
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (password.length < 8) {
      return Response.json({ message: "Password must be at least 8 characters." }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return Response.json({ message: "Password and confirm password do not match." }, { status: 400 });
    }

    await setParentPassword(session.phone, password);

    return Response.json({ message: "Password set successfully." });
  } catch (error) {
    console.error("SET_PASSWORD_ERROR:", error);
    return Response.json(
      { message: error instanceof Error ? error.message : "Unable to set password right now." },
      { status: 500 },
    );
  }
}

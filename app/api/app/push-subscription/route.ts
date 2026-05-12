import { savePushSubscription } from "@/lib/app-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await savePushSubscription(body.subscription ?? body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save push subscription.";
    const isAuthError = message === "Unauthorized" || message.includes("parent account");
    return Response.json({ message }, { status: isAuthError ? 401 : 400 });
  }
}

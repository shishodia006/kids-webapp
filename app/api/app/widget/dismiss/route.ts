import { dismissWidgetSetup } from "@/lib/app-data";

export async function POST() {
  await dismissWidgetSetup();
  return Response.json({ message: "Widget prompt dismissed." });
}

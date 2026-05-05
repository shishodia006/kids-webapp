import { getAdminKidFile } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kidId = Number(url.searchParams.get("kidId"));
  const type = url.searchParams.get("type") === "photo" ? "photo" : "schoolId";

  try {
    const file = await getAdminKidFile(kidId, type);
    if ("redirectTo" in file) return Response.redirect(new URL(file.redirectTo, url.origin), 302);

    return new Response(file.bytes, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        "Content-Disposition": `inline; filename="${safeFileName(file.fileName)}"`,
        "Content-Type": file.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load file.";
    return Response.json(
      { message },
      {
        status: message === "Unauthorized" ? 401 : 404,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }
}

function safeFileName(value: string) {
  return (value || "kid-file").replace(/[^a-z0-9._-]+/gi, "_").slice(0, 90);
}

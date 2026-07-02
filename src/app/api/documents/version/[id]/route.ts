import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/documents/version/<id> -> download a specific document version. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const v = await prisma.documentVersion.findUnique({ where: { id } });
  if (!v) return new NextResponse("Not found", { status: 404 });

  const safeName = v.filename.replace(/[^A-Za-z0-9._-]/g, "_");
  return new NextResponse(Buffer.from(v.data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="v${v.versionNo}_${safeName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/evidence/<id> -> download a stored evidence artifact. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const ev = await prisma.evidence.findUnique({ where: { id } });
  if (!ev || !ev.data) return new NextResponse("Not found", { status: 404 });

  const safeName = (ev.filename ?? "evidence.bin").replace(/[^A-Za-z0-9._-]/g, "_");
  return new NextResponse(Buffer.from(ev.data), {
    headers: {
      // Force download; never render user-supplied content in the app origin.
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

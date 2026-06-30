import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildPoamXlsx } from "@/lib/export/poam-xlsx";

export const dynamic = "force-dynamic";
// exceljs needs the Node.js runtime (not edge).
export const runtime = "nodejs";

/** GET /api/export/poam-xlsx?system=<id>  -> eMASS-style POA&M .xlsx download. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const systemId = req.nextUrl.searchParams.get("system") ?? undefined;

  const poams = await prisma.poam.findMany({
    where: systemId ? { systemId } : {},
    orderBy: [{ systemId: "asc" }, { number: "asc" }],
    include: {
      system: true,
      owner: true,
      controls: true,
      milestones: { orderBy: { createdAt: "asc" } },
      findings: { include: { asset: true } },
      mitigations: true,
    },
  });

  const scope = systemId ? (poams[0]?.system.acronym ?? "system") : "all-systems";
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `POAM_${scope}_${stamp}.xlsx`;
  const xlsx = await buildPoamXlsx(poams, `POA&M — ${scope} (${stamp})`);

  return new NextResponse(xlsx, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

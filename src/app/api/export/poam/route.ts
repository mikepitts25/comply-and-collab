import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildPoamCsv } from "@/lib/export/poam-csv";

export const dynamic = "force-dynamic";

/** GET /api/export/poam?system=<id>  -> eMASS-style POA&M CSV download. */
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

  const csv = buildPoamCsv(poams);
  const scope = systemId
    ? (poams[0]?.system.acronym ?? "system")
    : "all-systems";
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `POAM_${scope}_${stamp}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

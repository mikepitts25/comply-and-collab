import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { assessCmmc } from "@/lib/cmmc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** GET /api/export/cmmc?system=<id> -> CMMC/800-171 assessment as CSV. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const systemId = req.nextUrl.searchParams.get("system");
  if (!systemId) return new NextResponse("Missing system id", { status: 400 });

  const system = await prisma.system.findUnique({
    where: { id: systemId },
    select: { acronym: true },
  });
  if (!system) return new NextResponse("System not found", { status: 404 });

  const a = await assessCmmc(systemId);

  const header = ["Requirement", "Family", "Level", "Status", "Mapped 800-53", "Text"];
  const lines = [header.join(",")];
  for (const fam of a.families) {
    for (const r of fam.requirements) {
      lines.push(
        [
          r.id,
          `${r.family} ${r.familyName}`,
          `L${r.level}`,
          r.status,
          r.controlStatuses.map((c) => `${c.controlId}:${c.status}`).join("; "),
          r.text,
        ]
          .map((c) => csvCell(String(c)))
          .join(",")
      );
    }
  }
  const csv = lines.join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="CMMC_${system.acronym}_${stamp}.csv"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { assessFramework, FRAMEWORKS } from "@/lib/frameworks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** GET /api/export/framework?system=<id>&fw=<key> -> crosswalk assessment CSV. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const systemId = req.nextUrl.searchParams.get("system");
  const fw = req.nextUrl.searchParams.get("fw") ?? "";
  if (!systemId) return new NextResponse("Missing system id", { status: 400 });
  if (!FRAMEWORKS[fw]) {
    return new NextResponse(
      `Unknown framework. Available: ${Object.keys(FRAMEWORKS).join(", ")}`,
      { status: 400 }
    );
  }

  const system = await prisma.system.findUnique({
    where: { id: systemId },
    select: { acronym: true },
  });
  if (!system) return new NextResponse("System not found", { status: 404 });

  const a = await assessFramework(systemId, fw);
  if (!a) return new NextResponse("Assessment failed", { status: 500 });

  const header = ["Ref", "Group", "Tier", "Status", "Mapped 800-53", "Requirement"];
  const lines = [header.join(",")];
  for (const g of a.groups) {
    for (const r of g.requirements) {
      lines.push(
        [
          r.id,
          `${g.key} ${g.name}`,
          r.tier ?? "",
          r.status,
          r.controlStatuses.map((c) => `${c.controlId}:${c.status}`).join("; "),
          r.text,
        ]
          .map((c) => csvCell(String(c)))
          .join(",")
      );
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${a.framework.shortName.replace(/[^A-Za-z0-9]+/g, "_")}_${system.acronym}_${stamp}.csv"`,
    },
  });
}

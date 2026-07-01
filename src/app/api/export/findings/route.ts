import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildFindingsCsv } from "@/lib/export/findings-rows";
import type { Prisma, Severity, FindingStatus, FindingSource } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const STATUSES: FindingStatus[] = ["OPEN", "NOT_A_FINDING", "NOT_APPLICABLE", "NOT_REVIEWED", "CLOSED"];
const SOURCES: FindingSource[] = ["ACAS", "STIG", "SCAP", "MANUAL"];

/**
 * GET /api/export/findings?system=&status=&severity=&source=
 *   -> findings register as CSV, honoring the same filters as the Findings page.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const q = req.nextUrl.searchParams;
  const sev = q.get("severity") ?? undefined;
  const status = q.get("status") ?? undefined;
  const source = q.get("source") ?? undefined;
  const systemId = q.get("system") ?? undefined;

  const where: Prisma.FindingWhereInput = {};
  if (sev && SEVERITIES.includes(sev as Severity)) where.severity = sev as Severity;
  if (status && status !== "ALL" && STATUSES.includes(status as FindingStatus))
    where.status = status as FindingStatus;
  if (source && SOURCES.includes(source as FindingSource)) where.source = source as FindingSource;
  if (systemId) where.systemId = systemId;

  const findings = await prisma.finding.findMany({
    where,
    orderBy: [{ systemId: "asc" }, { severity: "asc" }, { lastSeen: "desc" }],
    include: {
      system: { select: { acronym: true, name: true } },
      asset: { select: { hostname: true, ipAddress: true } },
      controls: { select: { controlId: true } },
      assignee: { select: { name: true } },
    },
  });

  const csv = buildFindingsCsv(findings);
  const scope = systemId ? (findings[0]?.system.acronym ?? "system") : "all-systems";
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="findings_${scope}_${stamp}.csv"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/apikey";
import { can } from "@/lib/rbac";
import { ingestScan } from "@/lib/ingest";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 30 ingest calls per minute per client IP (bad keys burn the same bucket,
// so credential guessing is throttled too).
const API_LIMIT = 30;
const API_WINDOW_MS = 60_000;

/**
 * POST /api/v1/scans?system=<id>
 *   Headers: Authorization: Bearer <api-key>  (or X-API-Key)
 *            X-Filename: <name.nessus|.ckl|.cklb|.xml>
 *   Body:    raw scan file contents
 *
 * Ingests a scan programmatically (for automated/air-gapped pipelines). Runs
 * as the API key's owner, so that user's role must hold scan:import.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`api:scans:${clientIpFrom(req.headers)}`, API_LIMIT, API_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const actor = await authenticateApiKey(
    req.headers.get("authorization") ?? req.headers.get("x-api-key")
  );
  if (!actor) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });
  }
  if (!can(actor.role, "scan:import")) {
    return NextResponse.json(
      { error: "This key's role is not permitted to import scans." },
      { status: 403 }
    );
  }

  const systemId = req.nextUrl.searchParams.get("system");
  if (!systemId) {
    return NextResponse.json({ error: "Query param 'system' is required." }, { status: 400 });
  }
  const system = await prisma.system.findUnique({ where: { id: systemId }, select: { id: true } });
  if (!system) {
    return NextResponse.json({ error: "System not found." }, { status: 404 });
  }

  const filename = req.headers.get("x-filename") ?? "upload.xml";
  const content = await req.text();
  if (!content.trim()) {
    return NextResponse.json({ error: "Empty request body." }, { status: 400 });
  }

  try {
    const result = await ingestScan({
      systemId,
      userId: actor.userId,
      filename,
      content,
    });
    return NextResponse.json(
      {
        ok: true,
        scanImportId: result.scanImportId,
        scanType: result.scanType,
        assets: result.assets,
        totalFindings: result.totalFindings,
        openFindings: result.openFindings,
        newFindings: result.newFindings,
        closedFindings: result.closedFindings,
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to ingest scan." },
      { status: 422 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildCkl, buildCklb } from "@/lib/export/ckl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/export/checklist?asset=<id>&format=ckl|cklb
 *   -> DISA STIG checklist for one asset, reflecting current finding statuses.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const assetId = req.nextUrl.searchParams.get("asset");
  const format = (req.nextUrl.searchParams.get("format") ?? "ckl").toLowerCase();
  if (!assetId) return new NextResponse("Missing asset id", { status: 400 });
  if (format !== "ckl" && format !== "cklb") {
    return new NextResponse("format must be ckl or cklb", { status: 400 });
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      findings: {
        where: { source: "STIG" },
        orderBy: [{ severity: "asc" }, { stigId: "asc" }],
        include: { ccis: { select: { id: true } } },
      },
    },
  });
  if (!asset) return new NextResponse("Asset not found", { status: 404 });

  const safeHost = asset.hostname.replace(/[^A-Za-z0-9._-]/g, "_");
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "cklb") {
    const body = buildCklb(asset, asset.findings);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${safeHost}_${stamp}.cklb"`,
      },
    });
  }

  const body = buildCkl(asset, asset.findings);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${safeHost}_${stamp}.ckl"`,
    },
  });
}

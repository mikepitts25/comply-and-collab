import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { gatherSar, sarMarkdown } from "@/lib/sar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/export/sar?system=<id> -> Security Assessment Report as Markdown. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const systemId = req.nextUrl.searchParams.get("system");
  if (!systemId) return new NextResponse("system is required", { status: 400 });

  const data = await gatherSar(systemId);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(sarMarkdown(data), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="SAR_${data.system.acronym}_${stamp}.md"`,
    },
  });
}

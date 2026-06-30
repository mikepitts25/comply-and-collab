import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { gatherSsp, sspMarkdown } from "@/lib/ssp";

export const dynamic = "force-dynamic";

/** GET /api/export/ssp?system=<id>  -> System Security Plan as Markdown. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const systemId = req.nextUrl.searchParams.get("system");
  if (!systemId) return new NextResponse("system is required", { status: 400 });

  const data = await gatherSsp(systemId);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const md = sspMarkdown(data);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `SSP_${data.system.acronym}_${stamp}.md`;

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

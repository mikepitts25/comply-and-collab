import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { gatherPortfolio, portfolioMarkdown } from "@/lib/portfolio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/export/portfolio -> executive portfolio scorecard as Markdown. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const md = portfolioMarkdown(await gatherPortfolio());
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="Portfolio_Scorecard_${stamp}.md"`,
    },
  });
}

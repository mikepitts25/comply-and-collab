import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildInventoryXlsx } from "@/lib/export/inventory-xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/export/inventory-xlsx?system=<id> -> HW/SW/PPSM inventory workbook. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const systemId = req.nextUrl.searchParams.get("system");
  if (!systemId) return new NextResponse("system is required", { status: 400 });

  const system = await prisma.system.findUnique({
    where: { id: systemId },
    include: {
      assets: { orderBy: { hostname: "asc" }, include: { software: { orderBy: { name: "asc" } } } },
      ppsm: { orderBy: [{ status: "asc" }, { port: "asc" }] },
    },
  });
  if (!system) return new NextResponse("Not found", { status: 404 });

  const xlsx = await buildInventoryXlsx(system);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `Inventory_${system.acronym}_${stamp}.xlsx`;
  return new NextResponse(xlsx, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

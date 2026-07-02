import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { gatherEvents, buildIcs } from "@/lib/calendar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/calendar -> compliance obligations as an .ics file (Outlook-ready). */
export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const ics = buildIcs(await gatherEvents(365));
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="compliance-calendar.ics"',
    },
  });
}

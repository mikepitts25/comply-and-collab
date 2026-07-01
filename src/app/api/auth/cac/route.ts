import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { isCacEnabled, cacHeaderName, parseEdipi } from "@/lib/cac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/auth/cac — establish a session from a reverse-proxy-supplied
 * client-certificate subject DN. Only active when CLIENT_CERT_AUTH=true.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!isCacEnabled()) {
    return NextResponse.redirect(`${origin}/login?error=cac_disabled`);
  }

  const dn = req.headers.get(cacHeaderName());
  const edipi = parseEdipi(dn);
  if (!edipi) {
    return NextResponse.redirect(`${origin}/login?error=cac_no_cert`);
  }

  const user = await prisma.user.findUnique({ where: { edipi } });
  if (!user || !user.active) {
    return NextResponse.redirect(`${origin}/login?error=cac_unknown`);
  }

  await createSession(user);
  await prisma.activity.create({
    data: {
      actorId: user.id,
      verb: "signed in",
      entity: "User",
      entityId: user.id,
      summary: `Signed in via CAC/PIV (EDIPI ${edipi}).`,
    },
  });
  return NextResponse.redirect(`${origin}/`);
}

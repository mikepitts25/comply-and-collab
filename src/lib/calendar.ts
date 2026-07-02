// Compliance calendar: every dated obligation in one feed — ATO expirations,
// POA&M completions, milestones, ISA expirations, risk-acceptance reviews,
// and document/policy re-reviews. Rendered in-app and exported as ICS so it
// drops straight into Outlook.

import { prisma } from "./db";

export interface CalEvent {
  date: Date;
  kind: string; // "ATO" | "POA&M" | "Milestone" | "ISA" | "Risk review" | "Doc review"
  title: string;
  system: string;
  href: string;
}

export async function gatherEvents(horizonDays = 180): Promise<CalEvent[]> {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + horizonDays);
  // Include the recent past so overdue items stay visible.
  const past = new Date(now);
  past.setDate(past.getDate() - 30);

  const inWindow = { gte: past, lte: horizon };

  const [systems, poams, milestones, isas, reviews, docs] = await Promise.all([
    prisma.system.findMany({
      where: { atoExpiration: inWindow, authorizationStatus: { in: ["ATO", "ATO_WITH_CONDITIONS", "IATT"] } },
      select: { id: true, acronym: true, atoExpiration: true },
    }),
    prisma.poam.findMany({
      where: { scheduledCompletion: inWindow, status: { in: ["DRAFT", "OPEN", "ONGOING"] } },
      select: { id: true, number: true, weakness: true, scheduledCompletion: true, system: { select: { acronym: true } } },
    }),
    prisma.milestone.findMany({
      where: { dueDate: inWindow, completed: false },
      select: { id: true, description: true, dueDate: true, poam: { select: { id: true, number: true, system: { select: { acronym: true } } } } },
    }),
    prisma.interconnection.findMany({
      where: { expiresAt: inWindow, status: { in: ["ACTIVE", "PENDING_APPROVAL"] } },
      select: { id: true, remoteName: true, expiresAt: true, system: { select: { id: true, acronym: true } } },
    }),
    prisma.riskAcceptance.findMany({
      where: { reviewBy: inWindow },
      select: { id: true, reviewBy: true, poam: { select: { id: true, number: true, system: { select: { acronym: true } } } } },
    }),
    prisma.systemDocument.findMany({
      where: { nextReviewDue: inWindow, status: { not: "ARCHIVED" } },
      select: { id: true, title: true, nextReviewDue: true, system: { select: { id: true, acronym: true } } },
    }),
  ]);

  const events: CalEvent[] = [
    ...systems.map((s) => ({
      date: s.atoExpiration!, kind: "ATO", title: `${s.acronym} ATO expires`, system: s.acronym, href: `/systems/${s.id}`,
    })),
    ...poams.map((p) => ({
      date: p.scheduledCompletion!, kind: "POA&M",
      title: `POAM-${String(p.number).padStart(4, "0")} due: ${p.weakness.slice(0, 60)}`,
      system: p.system.acronym, href: `/poams/${p.id}`,
    })),
    ...milestones.map((m) => ({
      date: m.dueDate!, kind: "Milestone", title: m.description.slice(0, 70),
      system: m.poam.system.acronym, href: `/poams/${m.poam.id}`,
    })),
    ...isas.map((ic) => ({
      date: ic.expiresAt!, kind: "ISA", title: `Interconnection with ${ic.remoteName} expires`,
      system: ic.system.acronym, href: `/systems/${ic.system.id}/interconnections`,
    })),
    ...reviews.map((r) => ({
      date: r.reviewBy!, kind: "Risk review",
      title: `Risk acceptance review (POAM-${String(r.poam.number).padStart(4, "0")})`,
      system: r.poam.system.acronym, href: `/poams/${r.poam.id}`,
    })),
    ...docs.map((d) => ({
      date: d.nextReviewDue!, kind: "Doc review", title: `Review due: ${d.title}`,
      system: d.system.acronym, href: `/systems/${d.system.id}/documents/${d.id}`,
    })),
  ];

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// --- ICS (RFC 5545) ---

export function icsEscape(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function icsDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** All-day VEVENTs; deterministic UIDs so re-imports update in place. */
export function buildIcs(events: CalEvent[], baseUrl = ""): string {
  const L: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Comply and Collab//Compliance Calendar//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Comply & Collab — Compliance",
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  events.forEach((e, i) => {
    const uid = `${icsDate(e.date)}-${e.kind.replace(/[^A-Za-z]/g, "")}-${i}@comply-and-collab`;
    L.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      `SUMMARY:${icsEscape(`[${e.system}] ${e.kind}: ${e.title}`)}`,
      ...(baseUrl ? [`URL:${baseUrl}${e.href}`] : []),
      "END:VEVENT"
    );
  });
  L.push("END:VCALENDAR");
  return L.join("\r\n") + "\r\n";
}

// POA&M spreadsheet import: accepts the app's own eMASS-style export (so
// export -> edit in Excel -> re-import round-trips) plus common column
// aliases from teams' existing workbooks. Rows with a POA&M Item ID update
// the matching POA&M; rows without one create new items.

import { prisma } from "../db";
import { mapHeaders, parseSheet, parseSheetDate } from "./sheet";
import type { PoamStatus, Severity, ImpactLevel } from "@prisma/client";

const FIELDS: Record<string, string[]> = {
  id: ["POA&M Item ID", "POAM ID", "Item ID", "ID", "#"],
  weakness: ["Control Vulnerability Description", "Weakness", "Weakness Description", "Description"],
  severity: ["Raw Severity Value", "Severity", "Raw Severity"],
  status: ["Status", "POA&M Status"],
  scheduled: ["Scheduled Completion Date", "Scheduled Completion", "Due Date"],
  milestones: ["Milestone with Completion Dates", "Milestones", "Milestone"],
  source: ["Source Identifying Control Vulnerability", "Source", "Source Identifier"],
  resources: ["Resources Required", "Resources"],
  recommendation: ["Recommendations", "Recommendation", "Corrective Action"],
  residualRisk: ["Residual Risk Level", "Residual Risk"],
};

export function parsePoamNumber(v: string): number | null {
  const m = v.trim().match(/(\d+)\s*$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseSeverityCell(v: string): Severity {
  const s = v.toLowerCase().trim();
  if (/very\s*high|critical/.test(s)) return "CRITICAL";
  if (/cat\s*i\b|cat\s*1\b|^high/.test(s)) return "HIGH";
  if (/cat\s*iii|cat\s*3|^low/.test(s)) return "LOW";
  if (/very\s*low|info/.test(s)) return "INFO";
  return "MEDIUM"; // moderate / CAT II / unknown
}

export function parsePoamStatusCell(v: string): PoamStatus {
  const s = v.toLowerCase().trim();
  if (/complete|closed/.test(s)) return "COMPLETED";
  if (/risk\s*accept/.test(s)) return "RISK_ACCEPTED";
  if (/draft/.test(s)) return "DRAFT";
  if (/ongoing|in\s*progress/.test(s)) return "ONGOING";
  return "OPEN";
}

function parseResidual(v: string): ImpactLevel | null {
  const s = v.toLowerCase().trim();
  if (!s) return null;
  if (s.startsWith("h")) return "HIGH";
  if (s.startsWith("l")) return "LOW";
  return "MODERATE";
}

export interface ParsedMilestone {
  description: string;
  dueDate: Date | null;
  completed: boolean;
}

/** "Fix X (due Jan 5, 2026) [complete]; Verify Y" -> structured milestones. */
export function parseMilestonesCell(v: string): ParsedMilestone[] {
  return v
    .split(/;|\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const completed = /\[complete\]/i.test(part);
      let description = part.replace(/\[complete\]/i, "").trim();
      let dueDate: Date | null = null;
      const m = description.match(/\(due ([^)]+)\)\s*$/i);
      if (m) {
        dueDate = parseSheetDate(m[1]);
        description = description.slice(0, m.index).trim();
      }
      return { description, dueDate, completed };
    })
    .filter((m) => m.description.length > 0);
}

export interface ParsedPoamRow {
  number: number | null;
  weakness: string;
  severity: Severity;
  status: PoamStatus;
  scheduledCompletion: Date | null;
  milestones: ParsedMilestone[];
  sourceIdentifier: string | null;
  resourcesRequired: string | null;
  recommendation: string | null;
  residualRisk: ImpactLevel | null;
}

export interface PoamSheetResult {
  rows: ParsedPoamRow[];
  errors: string[];
}

export function parsePoamRows(rows: string[][]): PoamSheetResult {
  const errors: string[] = [];
  if (rows.length < 2) return { rows: [], errors: ["Sheet has no data rows."] };

  const cols = mapHeaders(rows[0], FIELDS);
  if (cols.weakness === -1) {
    return {
      rows: [],
      errors: ['Missing a weakness/description column (e.g. "Control Vulnerability Description" or "Weakness").'],
    };
  }

  const cell = (r: string[], i: number) => (i >= 0 && i < r.length ? r[i].trim() : "");
  const out: ParsedPoamRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const weakness = cell(r, cols.weakness);
    if (!weakness) {
      errors.push(`Row ${i + 1}: empty weakness — skipped.`);
      continue;
    }
    out.push({
      number: cols.id >= 0 ? parsePoamNumber(cell(r, cols.id)) : null,
      weakness,
      severity: parseSeverityCell(cell(r, cols.severity)),
      status: parsePoamStatusCell(cell(r, cols.status)),
      scheduledCompletion: parseSheetDate(cell(r, cols.scheduled)),
      milestones: parseMilestonesCell(cell(r, cols.milestones)),
      sourceIdentifier: cell(r, cols.source) || null,
      resourcesRequired: cell(r, cols.resources) || null,
      recommendation: cell(r, cols.recommendation) || null,
      residualRisk: parseResidual(cell(r, cols.residualRisk)),
    });
  }
  return { rows: out, errors };
}

export interface PoamImportSummary {
  created: number;
  updated: number;
  milestones: number;
  errors: string[];
}

/** Parse a workbook and apply it to a system's POA&Ms. */
export async function importPoamSheet(args: {
  systemId: string;
  userId: string;
  filename: string;
  bytes: Uint8Array;
}): Promise<PoamImportSummary> {
  const { systemId, userId, filename, bytes } = args;
  const { rows, errors } = parsePoamRows(await parseSheet(filename, bytes));

  let created = 0;
  let updated = 0;
  let milestones = 0;

  const last = await prisma.poam.findFirst({
    where: { systemId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let nextNumber = (last?.number ?? 0) + 1;

  for (const row of rows) {
    const data = {
      weakness: row.weakness,
      severity: row.severity,
      status: row.status,
      scheduledCompletion: row.scheduledCompletion,
      sourceIdentifier: row.sourceIdentifier,
      resourcesRequired: row.resourcesRequired,
      recommendation: row.recommendation,
      residualRisk: row.residualRisk,
    };

    const existing =
      row.number != null
        ? await prisma.poam.findUnique({
            where: { systemId_number: { systemId, number: row.number } },
            select: { id: true },
          })
        : null;

    let poamId: string;
    if (existing) {
      await prisma.poam.update({ where: { id: existing.id }, data });
      poamId = existing.id;
      updated++;
    } else {
      const createdPoam = await prisma.poam.create({
        data: { ...data, systemId, number: row.number ?? nextNumber++ },
      });
      if (row.number != null && row.number >= nextNumber) nextNumber = row.number + 1;
      poamId = createdPoam.id;
      created++;
    }

    // Round-trip semantics: a provided milestones cell replaces the list.
    if (row.milestones.length > 0) {
      await prisma.milestone.deleteMany({ where: { poamId } });
      await prisma.milestone.createMany({
        data: row.milestones.map((m) => ({
          poamId,
          description: m.description,
          dueDate: m.dueDate,
          completed: m.completed,
          completedAt: m.completed ? new Date() : null,
        })),
      });
      milestones += row.milestones.length;
    }
  }

  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: "imported",
      entity: "Poam",
      entityId: systemId,
      summary: `Imported POA&M workbook ${filename}: ${created} created, ${updated} updated, ${milestones} milestone(s).`,
    },
  });

  return { created, updated, milestones, errors };
}

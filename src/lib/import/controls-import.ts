// SSP control-tracker import: a spreadsheet with Control / Status / Narrative
// columns becomes documented SystemControl rows (upsert per control), giving
// teams tracking implementation in Excel a one-upload on-ramp.

import { prisma } from "../db";
import { mapHeaders, parseSheet } from "./sheet";
import type { ControlStatus } from "@prisma/client";

const FIELDS: Record<string, string[]> = {
  control: ["Control", "Control ID", "Control Number", "Security Control Number", "800-53 Control"],
  status: ["Status", "Implementation Status", "Impl Status"],
  narrative: ["Narrative", "Implementation Narrative", "Implementation", "How Implemented", "Implementation Statement"],
};

export function parseControlStatusCell(v: string): ControlStatus {
  const s = v.toLowerCase().trim();
  if (/not\s*app|n\/?a\b/.test(s)) return "NOT_APPLICABLE";
  if (/inherit/.test(s)) return "INHERITED";
  if (/partial/.test(s)) return "PARTIALLY_IMPLEMENTED";
  if (/plan/.test(s)) return "PLANNED";
  if (/not\s*impl|^no\b|open/.test(s)) return "NOT_IMPLEMENTED";
  if (/impl|complete|in\s*place|yes/.test(s)) return "IMPLEMENTED";
  return "NOT_IMPLEMENTED";
}

/** "ac-2", "AC-02", "AC-2 (1)" -> canonical "AC-2" / "AC-2(1)". */
export function normalizeControlIdCell(v: string): string | null {
  const m = v
    .trim()
    .toUpperCase()
    .match(/^([A-Z]{2})\s*-\s*0*(\d+)\s*(?:\(\s*0*(\d+)\s*\))?/);
  if (!m) return null;
  const [, family, num, enh] = m;
  return enh ? `${family}-${num}(${enh})` : `${family}-${num}`;
}

export interface ControlsImportSummary {
  documented: number;
  updated: number;
  unknownControls: string[];
  errors: string[];
}

export async function importControlsSheet(args: {
  systemId: string;
  userId: string;
  filename: string;
  bytes: Uint8Array;
}): Promise<ControlsImportSummary> {
  const { systemId, userId, filename, bytes } = args;
  const rows = await parseSheet(filename, bytes);
  const errors: string[] = [];
  if (rows.length < 2) return { documented: 0, updated: 0, unknownControls: [], errors: ["Sheet has no data rows."] };

  const cols = mapHeaders(rows[0], FIELDS);
  if (cols.control === -1) {
    return { documented: 0, updated: 0, unknownControls: [], errors: ['Missing a "Control" column.'] };
  }

  const validControls = new Set(
    (await prisma.control.findMany({ select: { id: true } })).map((c) => c.id)
  );

  const cell = (r: string[], i: number) => (i >= 0 && i < r.length ? r[i].trim() : "");
  let documented = 0;
  let updated = 0;
  const unknown = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const raw = cell(r, cols.control);
    if (!raw) continue;
    const controlId = normalizeControlIdCell(raw);
    if (!controlId || !validControls.has(controlId)) {
      unknown.add(raw);
      continue;
    }
    const status = parseControlStatusCell(cell(r, cols.status));
    const narrative = cell(r, cols.narrative) || null;

    const existing = await prisma.systemControl.findUnique({
      where: { systemId_controlId: { systemId, controlId } },
      select: { id: true },
    });
    if (existing) {
      await prisma.systemControl.update({
        where: { id: existing.id },
        data: { status, ...(narrative ? { narrative } : {}) },
      });
      updated++;
    } else {
      await prisma.systemControl.create({
        data: { systemId, controlId, status, narrative },
      });
      documented++;
    }
  }

  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: "imported",
      entity: "SystemControl",
      entityId: systemId,
      summary: `Imported control tracker ${filename}: ${documented} documented, ${updated} updated${unknown.size ? `, ${unknown.size} unknown control id(s)` : ""}.`,
    },
  });

  return { documented, updated, unknownControls: [...unknown], errors };
}

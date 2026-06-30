/**
 * Build script: transforms the upstream NIST 800-53 Rev 5 OSCAL catalog,
 * the LOW/MODERATE/HIGH baseline profiles, and the DISA CCI list into the
 * compact JSON bundles the app seeds from (so deployments stay fully offline).
 *
 * Sources (fetched into .catalog-src/ — see README "Updating the catalog"):
 *   - NIST OSCAL: github.com/usnistgov/oscal-content (SP800-53 rev5 json)
 *   - DISA CCI list: ComplianceAsCode/content shared/references/disa-cci-list.xml
 *
 * Outputs:
 *   - src/lib/data/nist-800-53-rev5.json   (controls + baseline membership)
 *   - src/lib/data/cci-map-rev5.json       (CCI -> definition + control id)
 *
 * Run: npx tsx scripts/build-catalog.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { XMLParser } from "fast-xml-parser";

const SRC = join(process.cwd(), ".catalog-src");
const OUT = join(process.cwd(), "src", "lib", "data");

// ---- OSCAL helpers ---------------------------------------------------------

type AnyObj = Record<string, any>;

function prop(node: AnyObj, name: string): string | undefined {
  return (node.props ?? []).find((p: AnyObj) => p.name === name)?.value;
}

/** The canonical human-readable label (e.g. "AC-2", "AC-2(1)") has no class. */
function canonicalLabel(node: AnyObj): string | undefined {
  return (node.props ?? []).find(
    (p: AnyObj) => p.name === "label" && !p.class
  )?.value;
}

/** Recursively gather statement prose from a control's parts. */
function statementText(parts: AnyObj[] | undefined, depth = 0): string {
  if (!parts) return "";
  const out: string[] = [];
  for (const part of parts) {
    if (part.name === "statement" || part.name === "item" || depth > 0) {
      const label = (part.props ?? []).find((p: AnyObj) => p.name === "label")?.value;
      if (part.prose) out.push((label ? `${label} ` : "") + part.prose);
      if (part.parts) out.push(statementText(part.parts, depth + 1));
    } else if (part.name === "statement") {
      if (part.prose) out.push(part.prose);
    }
  }
  return out.join("\n");
}

interface OutControl {
  id: string; // label form, e.g. "AC-2" or "AC-2(1)"
  oscalId: string; // e.g. "ac-2" / "ac-2.1"
  family: string; // "AC"
  title: string;
  text: string;
  baselines: Array<"L" | "M" | "H">;
}

function loadBaseline(file: string): Set<string> {
  const doc = JSON.parse(readFileSync(join(SRC, file), "utf8"));
  const ids = new Set<string>();
  for (const imp of doc.profile?.imports ?? []) {
    for (const inc of imp["include-controls"] ?? []) {
      for (const id of inc["with-ids"] ?? []) ids.add(id);
    }
  }
  return ids;
}

function buildControls(): OutControl[] {
  const catalog = JSON.parse(readFileSync(join(SRC, "catalog.json"), "utf8")).catalog;
  const low = loadBaseline("low.json");
  const mod = loadBaseline("moderate.json");
  const high = loadBaseline("high.json");

  const controls: OutControl[] = [];

  const visit = (c: AnyObj, familyCode: string) => {
    const label = canonicalLabel(c) ?? c.id.toUpperCase();
    const baselines: OutControl["baselines"] = [];
    if (low.has(c.id)) baselines.push("L");
    if (mod.has(c.id)) baselines.push("M");
    if (high.has(c.id)) baselines.push("H");

    controls.push({
      id: label.replace(/\s+/g, ""),
      oscalId: c.id,
      family: familyCode,
      title: c.title,
      text: statementText(c.parts).trim(),
      baselines,
    });
    // Control enhancements are nested controls.
    for (const child of c.controls ?? []) visit(child, familyCode);
  };

  for (const group of catalog.groups ?? []) {
    const familyCode = (group.id ?? "").toUpperCase();
    for (const c of group.controls ?? []) visit(c, familyCode);
  }
  return controls;
}

// ---- CCI list --------------------------------------------------------------

/** Normalize a DISA reference index ("AC-2 (1)", "AC-2 a 1") to a control id. */
function indexToControlId(index: string): string | null {
  const m = index.match(/^([A-Z]{2})-(\d+)\s*(\(\d+\))?/);
  if (!m) return null;
  return `${m[1]}-${m[2]}${m[3] ? m[3].replace(/\s+/g, "") : ""}`;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function buildCciMap(validControlIds: Set<string>) {
  const xml = readFileSync(join(SRC, "cci.xml"), "utf8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const items = asArray<AnyObj>(doc.cci_list?.cci_items?.cci_item);

  const map: Record<string, { definition: string; control: string | null }> = {};
  let mapped = 0;

  for (const item of items) {
    const id = item["@_id"];
    if (!id) continue;
    const refs = asArray<AnyObj>(item.references?.reference);
    // Prefer the most recent NIST 800-53 revision reference.
    const byVersion = refs
      .map((r) => ({ version: Number(r["@_version"]) || 0, index: String(r["@_index"] ?? "") }))
      .sort((a, b) => b.version - a.version);

    let control: string | null = null;
    for (const r of byVersion) {
      const exact = indexToControlId(r.index);
      if (!exact) continue;
      // Use enhancement-level id if it exists, else fall back to base control.
      if (validControlIds.has(exact)) { control = exact; break; }
      const base = exact.replace(/\(\d+\)$/, "");
      if (validControlIds.has(base)) { control = base; break; }
    }
    if (control) mapped++;
    map[id] = { definition: String(item.definition ?? "").trim(), control };
  }
  return { map, total: items.length, mapped };
}

// ---- Run -------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });

const controls = buildControls();
const validIds = new Set(controls.map((c) => c.id));
writeFileSync(join(OUT, "nist-800-53-rev5.json"), JSON.stringify(controls));

const { map, total, mapped } = buildCciMap(validIds);
writeFileSync(join(OUT, "cci-map-rev5.json"), JSON.stringify(map));

const families = new Set(controls.map((c) => c.family));
console.log(`Controls: ${controls.length} across ${families.size} families`);
console.log(
  `  baselines — L:${controls.filter((c) => c.baselines.includes("L")).length} ` +
    `M:${controls.filter((c) => c.baselines.includes("M")).length} ` +
    `H:${controls.filter((c) => c.baselines.includes("H")).length}`
);
console.log(`CCIs: ${total} total, ${mapped} mapped to a control (${Math.round((mapped / total) * 100)}%)`);

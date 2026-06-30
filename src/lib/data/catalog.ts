// Loaders for the bundled NIST 800-53 Rev 5 catalog and DISA CCI map.
// The JSON bundles are produced by scripts/build-catalog.ts from the upstream
// OSCAL catalog + baseline profiles + DISA CCI list, so deployments stay
// fully offline. Read at runtime via fs to avoid baking ~1.3 MB of JSON
// literals into the TypeScript program / client bundle.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "src", "lib", "data");

export interface CatalogControl {
  id: string; // canonical label, e.g. "AC-2" or "AC-2(1)"
  oscalId: string; // e.g. "ac-2" / "ac-2.1"
  family: string; // e.g. "AC"
  title: string;
  text: string;
  baselines: Array<"L" | "M" | "H">;
}

export interface CciEntry {
  definition: string;
  control: string | null; // mapped 800-53 control id
}

export function loadControls(): CatalogControl[] {
  return JSON.parse(
    readFileSync(join(DATA_DIR, "nist-800-53-rev5.json"), "utf8")
  );
}

export function loadCciMap(): Record<string, CciEntry> {
  return JSON.parse(
    readFileSync(join(DATA_DIR, "cci-map-rev5.json"), "utf8")
  );
}

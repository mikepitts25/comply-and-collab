// Generic framework-crosswalk model. A framework is a set of requirements,
// each mapped to primary NIST 800-53 control(s); posture is then derived from
// a system's documented 800-53 implementation (SystemControl), exactly like
// the CMMC/800-171 view. Adding a framework is a data-only change.

export interface FrameworkRequirement {
  id: string; // e.g. "A.5.1" or "CIS-1"
  group: string; // group key, e.g. "A.5" or "CIS-1"
  text: string;
  controls: string[]; // primary 800-53 control ids
  /** Optional tier/level tag shown as a chip (e.g. "IG1" for CIS). */
  tier?: string;
}

export interface FrameworkDef {
  key: string; // url-safe id, e.g. "iso27001"
  name: string; // "ISO/IEC 27001:2022"
  shortName: string; // "ISO 27001"
  version: string;
  description: string;
  unitLabel: string; // what a requirement is called: "control", "safeguard"…
  groups: { key: string; name: string }[];
  requirements: FrameworkRequirement[];
}

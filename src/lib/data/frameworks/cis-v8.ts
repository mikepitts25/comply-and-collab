// CIS Critical Security Controls v8 — the 18 top-level controls, each mapped
// to primary NIST SP 800-53 Rev 5 control(s). Tier = the lowest Implementation
// Group (IG1–IG3) at which the control's core safeguards begin to apply.
// Control-level granularity; safeguard-level (153) can be added the same way.

import type { FrameworkDef } from "./types";

export const CIS_V8: FrameworkDef = {
  key: "cis8",
  name: "CIS Critical Security Controls v8",
  shortName: "CIS v8",
  version: "8",
  description:
    "The de-facto commercial security baseline. Posture is derived from documented 800-53 control implementation via crosswalk.",
  unitLabel: "control",
  groups: [
    { key: "CIS", name: "CIS Controls v8" },
  ],
  requirements: [
    { id: "CIS-1", group: "CIS", tier: "IG1", text: "Inventory and Control of Enterprise Assets", controls: ["CM-8"] },
    { id: "CIS-2", group: "CIS", tier: "IG1", text: "Inventory and Control of Software Assets", controls: ["CM-8", "CM-10", "CM-11"] },
    { id: "CIS-3", group: "CIS", tier: "IG1", text: "Data Protection", controls: ["SC-28", "MP-6", "RA-2"] },
    { id: "CIS-4", group: "CIS", tier: "IG1", text: "Secure Configuration of Enterprise Assets and Software", controls: ["CM-2", "CM-6"] },
    { id: "CIS-5", group: "CIS", tier: "IG1", text: "Account Management", controls: ["AC-2", "IA-4"] },
    { id: "CIS-6", group: "CIS", tier: "IG1", text: "Access Control Management", controls: ["AC-3", "AC-6", "IA-2"] },
    { id: "CIS-7", group: "CIS", tier: "IG1", text: "Continuous Vulnerability Management", controls: ["RA-5", "SI-2"] },
    { id: "CIS-8", group: "CIS", tier: "IG1", text: "Audit Log Management", controls: ["AU-2", "AU-6", "AU-12"] },
    { id: "CIS-9", group: "CIS", tier: "IG1", text: "Email and Web Browser Protections", controls: ["SC-18", "SI-8"] },
    { id: "CIS-10", group: "CIS", tier: "IG1", text: "Malware Defenses", controls: ["SI-3"] },
    { id: "CIS-11", group: "CIS", tier: "IG1", text: "Data Recovery", controls: ["CP-9", "CP-10"] },
    { id: "CIS-12", group: "CIS", tier: "IG1", text: "Network Infrastructure Management", controls: ["CM-6", "SC-7"] },
    { id: "CIS-13", group: "CIS", tier: "IG2", text: "Network Monitoring and Defense", controls: ["SI-4", "SC-7"] },
    { id: "CIS-14", group: "CIS", tier: "IG1", text: "Security Awareness and Skills Training", controls: ["AT-2", "AT-3"] },
    { id: "CIS-15", group: "CIS", tier: "IG1", text: "Service Provider Management", controls: ["SA-9", "SR-6"] },
    { id: "CIS-16", group: "CIS", tier: "IG2", text: "Application Software Security", controls: ["SA-11", "SI-10"] },
    { id: "CIS-17", group: "CIS", tier: "IG1", text: "Incident Response Management", controls: ["IR-4", "IR-6", "IR-8"] },
    { id: "CIS-18", group: "CIS", tier: "IG2", text: "Penetration Testing", controls: ["CA-8"] },
  ],
};

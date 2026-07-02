// NIST Cybersecurity Framework 2.0 — all 22 categories across the 6 functions,
// each mapped to representative NIST SP 800-53 Rev 5 control(s) (per the CSF 2.0
// informative references). Category-level granularity; subcategory-level (106)
// can be added the same way.

import type { FrameworkDef } from "./types";

export const NIST_CSF2: FrameworkDef = {
  key: "csf2",
  name: "NIST Cybersecurity Framework 2.0",
  shortName: "NIST CSF 2.0",
  version: "2.0",
  description:
    "The universal cyber risk framework used across industry sectors. Posture is derived from documented 800-53 control implementation via crosswalk.",
  unitLabel: "category",
  groups: [
    { key: "GV", name: "Govern" },
    { key: "ID", name: "Identify" },
    { key: "PR", name: "Protect" },
    { key: "DE", name: "Detect" },
    { key: "RS", name: "Respond" },
    { key: "RC", name: "Recover" },
  ],
  requirements: [
    // Govern
    { id: "GV.OC", group: "GV", text: "Organizational Context — mission, stakeholder expectations, and legal/regulatory requirements are understood.", controls: ["PM-1", "PM-8"] },
    { id: "GV.RM", group: "GV", text: "Risk Management Strategy — priorities, constraints, risk tolerance, and assumptions are established.", controls: ["PM-9", "RA-1"] },
    { id: "GV.RR", group: "GV", text: "Roles, Responsibilities, and Authorities — accountability and performance are established and communicated.", controls: ["PM-2", "PS-7"] },
    { id: "GV.PO", group: "GV", text: "Policy — organizational cybersecurity policy is established, communicated, and enforced.", controls: ["PL-1", "PM-1"] },
    { id: "GV.OV", group: "GV", text: "Oversight — results of risk management activities inform and adjust the strategy.", controls: ["CA-7", "PM-6"] },
    { id: "GV.SC", group: "GV", text: "Cybersecurity Supply Chain Risk Management — processes are identified, established, and monitored.", controls: ["SR-1", "SR-3", "SA-9"] },

    // Identify
    { id: "ID.AM", group: "ID", text: "Asset Management — assets are identified and managed consistent with their importance.", controls: ["CM-8", "PM-5"] },
    { id: "ID.RA", group: "ID", text: "Risk Assessment — cybersecurity risk to the organization, assets, and individuals is understood.", controls: ["RA-3", "RA-5"] },
    { id: "ID.IM", group: "ID", text: "Improvement — improvements to risk management processes are identified across all functions.", controls: ["CA-5", "PM-4"] },

    // Protect
    { id: "PR.AA", group: "PR", text: "Identity Management, Authentication, and Access Control — access is limited to authorized users, services, and hardware.", controls: ["AC-2", "AC-3", "IA-2", "IA-5"] },
    { id: "PR.AT", group: "PR", text: "Awareness and Training — personnel are provided cybersecurity awareness and training.", controls: ["AT-2", "AT-3"] },
    { id: "PR.DS", group: "PR", text: "Data Security — data is managed consistent with the risk strategy to protect confidentiality, integrity, and availability.", controls: ["SC-8", "SC-28", "MP-6"] },
    { id: "PR.PS", group: "PR", text: "Platform Security — hardware, software, and services are managed consistent with the risk strategy.", controls: ["CM-2", "CM-6", "SI-2", "SI-3"] },
    { id: "PR.IR", group: "PR", text: "Technology Infrastructure Resilience — architectures are managed to protect asset availability and resilience.", controls: ["SC-7", "CP-2", "SC-5"] },

    // Detect
    { id: "DE.CM", group: "DE", text: "Continuous Monitoring — assets are monitored to find anomalies, indicators of compromise, and adverse events.", controls: ["SI-4", "AU-6", "CA-7"] },
    { id: "DE.AE", group: "DE", text: "Adverse Event Analysis — anomalies and indicators are analyzed to characterize events and detect incidents.", controls: ["AU-6", "IR-4", "SI-4"] },

    // Respond
    { id: "RS.MA", group: "RS", text: "Incident Management — responses to detected incidents are managed.", controls: ["IR-4", "IR-8"] },
    { id: "RS.AN", group: "RS", text: "Incident Analysis — investigations ensure effective response and support forensics and recovery.", controls: ["IR-4", "AU-6"] },
    { id: "RS.CO", group: "RS", text: "Incident Response Reporting and Communication — activities are coordinated with stakeholders.", controls: ["IR-6"] },
    { id: "RS.MI", group: "RS", text: "Incident Mitigation — activities prevent expansion and mitigate incident effects.", controls: ["IR-4"] },

    // Recover
    { id: "RC.RP", group: "RC", text: "Incident Recovery Plan Execution — restoration activities ensure operational availability.", controls: ["CP-10", "IR-4"] },
    { id: "RC.CO", group: "RC", text: "Incident Recovery Communication — restoration activities are coordinated with internal and external parties.", controls: ["CP-2", "IR-6"] },
  ],
};

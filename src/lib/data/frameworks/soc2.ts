// SOC 2 — AICPA Trust Services Criteria (2017, 2022 revision): the 33 Common
// Criteria (Security) plus Availability (A1) and Confidentiality (C1), each
// mapped to primary NIST SP 800-53 Rev 5 control(s). Processing Integrity and
// Privacy categories can be added the same way if in scope.

import type { FrameworkDef } from "./types";

export const SOC2: FrameworkDef = {
  key: "soc2",
  name: "SOC 2 Trust Services Criteria",
  shortName: "SOC 2",
  version: "2017 (rev 2022)",
  description:
    "The audit framework for service organizations (SaaS and service providers). Posture is derived from documented 800-53 control implementation via crosswalk.",
  unitLabel: "criterion",
  groups: [
    { key: "CC1", name: "Control Environment" },
    { key: "CC2", name: "Communication and Information" },
    { key: "CC3", name: "Risk Assessment" },
    { key: "CC4", name: "Monitoring Activities" },
    { key: "CC5", name: "Control Activities" },
    { key: "CC6", name: "Logical and Physical Access Controls" },
    { key: "CC7", name: "System Operations" },
    { key: "CC8", name: "Change Management" },
    { key: "CC9", name: "Risk Mitigation" },
    { key: "A1", name: "Availability" },
    { key: "C1", name: "Confidentiality" },
  ],
  requirements: [
    // CC1 Control Environment
    { id: "CC1.1", group: "CC1", text: "Demonstrates commitment to integrity and ethical values.", controls: ["PL-4", "PS-8"] },
    { id: "CC1.2", group: "CC1", text: "Board exercises oversight of internal control.", controls: ["PM-1", "CA-7"] },
    { id: "CC1.3", group: "CC1", text: "Establishes structures, reporting lines, authorities, and responsibilities.", controls: ["PM-2", "PS-7"] },
    { id: "CC1.4", group: "CC1", text: "Demonstrates commitment to attract, develop, and retain competent individuals.", controls: ["PS-3", "AT-3"] },
    { id: "CC1.5", group: "CC1", text: "Holds individuals accountable for internal control responsibilities.", controls: ["PS-8", "PL-4"] },

    // CC2 Communication and Information
    { id: "CC2.1", group: "CC2", text: "Obtains or generates relevant, quality information to support internal control.", controls: ["AU-6", "SI-4"] },
    { id: "CC2.2", group: "CC2", text: "Internally communicates information, objectives, and responsibilities.", controls: ["AT-2", "PL-4"] },
    { id: "CC2.3", group: "CC2", text: "Communicates with external parties regarding internal control matters.", controls: ["IR-6", "SA-9"] },

    // CC3 Risk Assessment
    { id: "CC3.1", group: "CC3", text: "Specifies objectives with sufficient clarity to enable risk identification.", controls: ["PM-9", "RA-1"] },
    { id: "CC3.2", group: "CC3", text: "Identifies and analyzes risks to the achievement of objectives.", controls: ["RA-3"] },
    { id: "CC3.3", group: "CC3", text: "Considers the potential for fraud in assessing risks.", controls: ["RA-3", "AC-5"] },
    { id: "CC3.4", group: "CC3", text: "Identifies and assesses changes that could significantly impact internal control.", controls: ["CM-3", "CM-4"] },

    // CC4 Monitoring Activities
    { id: "CC4.1", group: "CC4", text: "Selects, develops, and performs ongoing and separate evaluations of controls.", controls: ["CA-2", "CA-7"] },
    { id: "CC4.2", group: "CC4", text: "Evaluates and communicates internal control deficiencies for corrective action.", controls: ["CA-5"] },

    // CC5 Control Activities
    { id: "CC5.1", group: "CC5", text: "Selects and develops control activities that mitigate risks to objectives.", controls: ["PL-2", "CA-2"] },
    { id: "CC5.2", group: "CC5", text: "Selects and develops general control activities over technology.", controls: ["CM-6", "AC-3"] },
    { id: "CC5.3", group: "CC5", text: "Deploys control activities through policies and procedures.", controls: ["PL-1", "CM-6"] },

    // CC6 Logical and Physical Access Controls
    { id: "CC6.1", group: "CC6", text: "Implements logical access security over protected information assets.", controls: ["AC-3", "AC-6", "IA-2"] },
    { id: "CC6.2", group: "CC6", text: "Registers, authorizes, and administers system credentials for users.", controls: ["AC-2", "IA-4"] },
    { id: "CC6.3", group: "CC6", text: "Authorizes, modifies, or removes access based on roles and responsibilities.", controls: ["AC-2", "AC-6"] },
    { id: "CC6.4", group: "CC6", text: "Restricts physical access to facilities and protected information assets.", controls: ["PE-2", "PE-3"] },
    { id: "CC6.5", group: "CC6", text: "Discontinues logical and physical protections over decommissioned assets.", controls: ["MP-6"] },
    { id: "CC6.6", group: "CC6", text: "Implements protections against threats from outside system boundaries.", controls: ["SC-7", "AC-17"] },
    { id: "CC6.7", group: "CC6", text: "Restricts and protects information during transmission, movement, and removal.", controls: ["SC-8", "MP-5"] },
    { id: "CC6.8", group: "CC6", text: "Implements controls to prevent or detect unauthorized or malicious software.", controls: ["SI-3", "CM-11"] },

    // CC7 System Operations
    { id: "CC7.1", group: "CC7", text: "Detects and monitors configuration changes and vulnerabilities.", controls: ["RA-5", "CM-6", "SI-2"] },
    { id: "CC7.2", group: "CC7", text: "Monitors system components for anomalies indicative of malicious acts or errors.", controls: ["SI-4", "AU-6"] },
    { id: "CC7.3", group: "CC7", text: "Evaluates security events to determine whether they are incidents.", controls: ["IR-4", "AU-6"] },
    { id: "CC7.4", group: "CC7", text: "Responds to identified security incidents via a defined incident response program.", controls: ["IR-4", "IR-8"] },
    { id: "CC7.5", group: "CC7", text: "Identifies, develops, and implements activities to recover from incidents.", controls: ["IR-4", "CP-10"] },

    // CC8 Change Management
    { id: "CC8.1", group: "CC8", text: "Authorizes, designs, develops, tests, approves, and implements changes.", controls: ["CM-3", "SA-11"] },

    // CC9 Risk Mitigation
    { id: "CC9.1", group: "CC9", text: "Identifies, selects, and develops risk mitigation activities including business disruption.", controls: ["CP-2", "PM-9"] },
    { id: "CC9.2", group: "CC9", text: "Assesses and manages risks associated with vendors and business partners.", controls: ["SA-9", "SR-6"] },

    // A1 Availability
    { id: "A1.1", group: "A1", text: "Maintains, monitors, and evaluates current processing capacity to meet demand.", controls: ["AU-4", "SC-5"] },
    { id: "A1.2", group: "A1", text: "Implements environmental protections, backup, and recovery infrastructure.", controls: ["CP-9", "PE-13", "PE-11"] },
    { id: "A1.3", group: "A1", text: "Tests recovery plan procedures supporting system recovery.", controls: ["CP-4"] },

    // C1 Confidentiality
    { id: "C1.1", group: "C1", text: "Identifies and maintains confidential information to meet confidentiality objectives.", controls: ["RA-2", "SC-28"] },
    { id: "C1.2", group: "C1", text: "Disposes of confidential information to meet confidentiality objectives.", controls: ["MP-6"] },
  ],
};

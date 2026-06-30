// Curated subset of NIST SP 800-53 Rev 5 controls and DISA CCI->control
// mappings. This is enough to demonstrate end-to-end correlation; a production
// deployment would import the full catalog (OSCAL) and the complete DISA CCI
// list (U_CCI_List.xml) via the admin importer.

export interface SeedControl {
  id: string;
  family: string;
  title: string;
  text: string;
  baselines: Array<"L" | "M" | "H">;
}

export const CONTROLS: SeedControl[] = [
  { id: "AC-2", family: "AC", title: "Account Management", text: "Manage system accounts, group memberships, and privileges throughout their lifecycle.", baselines: ["L", "M", "H"] },
  { id: "AC-3", family: "AC", title: "Access Enforcement", text: "Enforce approved authorizations for logical access to information and system resources.", baselines: ["L", "M", "H"] },
  { id: "AC-6", family: "AC", title: "Least Privilege", text: "Employ the principle of least privilege, allowing only authorized accesses necessary to accomplish assigned tasks.", baselines: ["M", "H"] },
  { id: "AC-7", family: "AC", title: "Unsuccessful Logon Attempts", text: "Enforce a limit of consecutive invalid logon attempts and lock the account when exceeded.", baselines: ["L", "M", "H"] },
  { id: "AC-8", family: "AC", title: "System Use Notification", text: "Display an approved system use notification (banner) before granting access.", baselines: ["L", "M", "H"] },
  { id: "AC-17", family: "AC", title: "Remote Access", text: "Authorize and monitor remote access methods and enforce protections for each.", baselines: ["L", "M", "H"] },
  { id: "AU-3", family: "AU", title: "Content of Audit Records", text: "Ensure audit records contain information establishing what, when, where, source, outcome, and identity.", baselines: ["L", "M", "H"] },
  { id: "AU-9", family: "AU", title: "Protection of Audit Information", text: "Protect audit information and audit logging tools from unauthorized access, modification, and deletion.", baselines: ["L", "M", "H"] },
  { id: "AU-12", family: "AU", title: "Audit Record Generation", text: "Provide audit record generation capability for the defined auditable events.", baselines: ["L", "M", "H"] },
  { id: "CM-6", family: "CM", title: "Configuration Settings", text: "Establish, document, and enforce secure configuration settings (e.g., STIG/SRG) for system components.", baselines: ["L", "M", "H"] },
  { id: "CM-7", family: "CM", title: "Least Functionality", text: "Configure the system to provide only mission-essential capabilities; disable unused ports, protocols, and services.", baselines: ["L", "M", "H"] },
  { id: "IA-2", family: "IA", title: "Identification and Authentication (Org Users)", text: "Uniquely identify and authenticate organizational users and associate that identity to processes.", baselines: ["L", "M", "H"] },
  { id: "IA-4", family: "IA", title: "Identifier Management", text: "Manage system identifiers by authorizing, selecting, and preventing reuse of identifiers.", baselines: ["L", "M", "H"] },
  { id: "IA-5", family: "IA", title: "Authenticator Management", text: "Manage system authenticators including complexity, storage, transmission, and rotation.", baselines: ["L", "M", "H"] },
  { id: "RA-5", family: "RA", title: "Vulnerability Monitoring and Scanning", text: "Monitor and scan for vulnerabilities and remediate legitimate findings within defined timeframes.", baselines: ["L", "M", "H"] },
  { id: "SC-8", family: "SC", title: "Transmission Confidentiality and Integrity", text: "Protect the confidentiality and integrity of transmitted information.", baselines: ["M", "H"] },
  { id: "SC-13", family: "SC", title: "Cryptographic Protection", text: "Implement FIPS-validated or NSA-approved cryptography for required protections.", baselines: ["L", "M", "H"] },
  { id: "SC-28", family: "SC", title: "Protection of Information at Rest", text: "Protect the confidentiality and integrity of information at rest.", baselines: ["M", "H"] },
  { id: "SI-2", family: "SI", title: "Flaw Remediation", text: "Identify, report, and correct system flaws; install security-relevant updates within defined timeframes.", baselines: ["L", "M", "H"] },
  { id: "SI-4", family: "SI", title: "System Monitoring", text: "Monitor the system to detect attacks, indicators of potential attacks, and unauthorized activity.", baselines: ["L", "M", "H"] },
];

export interface SeedCci {
  id: string;
  controlId: string;
  definition: string;
}

export const CCIS: SeedCci[] = [
  { id: "CCI-000048", controlId: "AC-8", definition: "The information system displays an approved system use notification before granting access." },
  { id: "CCI-000130", controlId: "AU-3", definition: "The information system generates audit records containing what type of event occurred." },
  { id: "CCI-000162", controlId: "AU-9", definition: "The information system protects audit information from unauthorized access." },
  { id: "CCI-000196", controlId: "IA-5", definition: "The information system, for password-based authentication, stores only cryptographically-protected passwords." },
  { id: "CCI-000197", controlId: "IA-5", definition: "The information system, for password-based authentication, transmits only cryptographically-protected passwords." },
  { id: "CCI-000213", controlId: "AC-3", definition: "The information system enforces approved authorizations for logical access." },
  { id: "CCI-000366", controlId: "CM-6", definition: "The organization implements the security configuration settings." },
  { id: "CCI-000381", controlId: "CM-7", definition: "The organization configures the information system to provide only essential capabilities." },
  { id: "CCI-000764", controlId: "IA-2", definition: "The information system uniquely identifies and authenticates organizational users." },
  { id: "CCI-000795", controlId: "IA-4", definition: "The organization manages information system identifiers by preventing reuse." },
  { id: "CCI-000044", controlId: "AC-7", definition: "The information system enforces the limit of consecutive invalid logon attempts." },
  { id: "CCI-002235", controlId: "AC-6", definition: "The information system prevents non-privileged users from executing privileged functions." },
  { id: "CCI-002418", controlId: "SC-8", definition: "The information system protects the confidentiality and integrity of transmitted information." },
  { id: "CCI-002476", controlId: "SC-28", definition: "The information system protects the confidentiality and integrity of information at rest." },
  { id: "CCI-000877", controlId: "AC-17", definition: "The organization employs automated mechanisms to monitor and control remote access methods." },
];

// NIST SP 800-171 Rev 2 requirements (the basis for CMMC 2.0), each mapped to
// its primary NIST SP 800-53 control(s). This lets a CMMC/800-171 assessment be
// derived from a system's existing 800-53 control implementation — no separate
// data entry required.
//
// CMMC 2.0 Level 1 (Foundational, FCI) = the 15 basic safeguarding requirements
// of FAR 52.204-21, which correspond to 17 of these 800-171 requirements
// (flagged level: 1). Level 2 (Advanced, CUI) = all 110 requirements.
//
// Mappings follow NIST SP 800-171 Rev 2 Table D (CUI security requirement ->
// 800-53 control). Primary controls are listed; a deployment may refine these.

export interface Cmmc171Requirement {
  id: string; // "3.1.1"
  level: 1 | 2; // lowest CMMC level that includes this requirement
  text: string;
  controls: string[]; // 800-53 control ids
}

export const CMMC_FAMILIES: Record<string, string> = {
  "3.1": "Access Control",
  "3.2": "Awareness and Training",
  "3.3": "Audit and Accountability",
  "3.4": "Configuration Management",
  "3.5": "Identification and Authentication",
  "3.6": "Incident Response",
  "3.7": "Maintenance",
  "3.8": "Media Protection",
  "3.9": "Personnel Security",
  "3.10": "Physical Protection",
  "3.11": "Risk Assessment",
  "3.12": "Security Assessment",
  "3.13": "System and Communications Protection",
  "3.14": "System and Information Integrity",
};

/** "3.1.1" -> "3.1" (family key). */
export function familyKeyOf(id: string): string {
  const parts = id.split(".");
  return `${parts[0]}.${parts[1]}`;
}

export const CMMC_REQUIREMENTS: Cmmc171Requirement[] = [
  // 3.1 Access Control
  { id: "3.1.1", level: 1, text: "Limit system access to authorized users, processes, and devices.", controls: ["AC-2", "AC-3", "IA-2"] },
  { id: "3.1.2", level: 1, text: "Limit system access to the types of transactions and functions authorized users are permitted to execute.", controls: ["AC-3", "AC-6"] },
  { id: "3.1.3", level: 2, text: "Control the flow of CUI in accordance with approved authorizations.", controls: ["AC-4"] },
  { id: "3.1.4", level: 2, text: "Separate the duties of individuals to reduce risk of malevolent activity without collusion.", controls: ["AC-5"] },
  { id: "3.1.5", level: 2, text: "Employ the principle of least privilege, including for specific security functions and privileged accounts.", controls: ["AC-6"] },
  { id: "3.1.6", level: 2, text: "Use non-privileged accounts or roles when accessing nonsecurity functions.", controls: ["AC-6"] },
  { id: "3.1.7", level: 2, text: "Prevent non-privileged users from executing privileged functions and capture such execution in audit logs.", controls: ["AC-6"] },
  { id: "3.1.8", level: 2, text: "Limit unsuccessful logon attempts.", controls: ["AC-7"] },
  { id: "3.1.9", level: 2, text: "Provide privacy and security notices consistent with applicable CUI rules.", controls: ["AC-8"] },
  { id: "3.1.10", level: 2, text: "Use session lock with pattern-hiding displays to prevent access after a period of inactivity.", controls: ["AC-11"] },
  { id: "3.1.11", level: 2, text: "Terminate (automatically) a user session after a defined condition.", controls: ["AC-12"] },
  { id: "3.1.12", level: 2, text: "Monitor and control remote access sessions.", controls: ["AC-17"] },
  { id: "3.1.13", level: 2, text: "Employ cryptographic mechanisms to protect the confidentiality of remote access sessions.", controls: ["AC-17", "SC-8"] },
  { id: "3.1.14", level: 2, text: "Route remote access via managed access control points.", controls: ["AC-17"] },
  { id: "3.1.15", level: 2, text: "Authorize remote execution of privileged commands and remote access to security-relevant information.", controls: ["AC-17"] },
  { id: "3.1.16", level: 2, text: "Authorize wireless access prior to allowing such connections.", controls: ["AC-18"] },
  { id: "3.1.17", level: 2, text: "Protect wireless access using authentication and encryption.", controls: ["AC-18"] },
  { id: "3.1.18", level: 2, text: "Control connection of mobile devices.", controls: ["AC-19"] },
  { id: "3.1.19", level: 2, text: "Encrypt CUI on mobile devices and mobile computing platforms.", controls: ["AC-19"] },
  { id: "3.1.20", level: 1, text: "Verify and control/limit connections to and use of external systems.", controls: ["AC-20"] },
  { id: "3.1.21", level: 2, text: "Limit use of portable storage devices on external systems.", controls: ["AC-20"] },
  { id: "3.1.22", level: 1, text: "Control CUI posted or processed on publicly accessible systems.", controls: ["AC-22"] },

  // 3.2 Awareness and Training
  { id: "3.2.1", level: 2, text: "Ensure managers and users are aware of security risks and applicable policies/standards.", controls: ["AT-2"] },
  { id: "3.2.2", level: 2, text: "Ensure personnel are trained to carry out their assigned security-related duties.", controls: ["AT-3"] },
  { id: "3.2.3", level: 2, text: "Provide security awareness training on recognizing and reporting insider threat indicators.", controls: ["AT-2"] },

  // 3.3 Audit and Accountability
  { id: "3.3.1", level: 2, text: "Create and retain system audit logs enabling monitoring, analysis, investigation, and reporting.", controls: ["AU-2", "AU-3", "AU-12"] },
  { id: "3.3.2", level: 2, text: "Ensure actions of individual users can be uniquely traced for accountability.", controls: ["AU-3", "IA-2"] },
  { id: "3.3.3", level: 2, text: "Review and update logged events.", controls: ["AU-2"] },
  { id: "3.3.4", level: 2, text: "Alert in the event of an audit logging process failure.", controls: ["AU-5"] },
  { id: "3.3.5", level: 2, text: "Correlate audit record review, analysis, and reporting for investigation and response.", controls: ["AU-6"] },
  { id: "3.3.6", level: 2, text: "Provide audit record reduction and report generation for analysis and reporting.", controls: ["AU-7"] },
  { id: "3.3.7", level: 2, text: "Provide a system capability that compares and synchronizes to an authoritative time source.", controls: ["AU-8"] },
  { id: "3.3.8", level: 2, text: "Protect audit information and audit logging tools from unauthorized access, modification, and deletion.", controls: ["AU-9"] },
  { id: "3.3.9", level: 2, text: "Limit management of audit logging functionality to a subset of privileged users.", controls: ["AU-9"] },

  // 3.4 Configuration Management
  { id: "3.4.1", level: 2, text: "Establish and maintain baseline configurations and inventories of organizational systems.", controls: ["CM-2", "CM-8"] },
  { id: "3.4.2", level: 2, text: "Establish and enforce security configuration settings for IT products.", controls: ["CM-6"] },
  { id: "3.4.3", level: 2, text: "Track, review, approve/disapprove, and log changes to systems.", controls: ["CM-3"] },
  { id: "3.4.4", level: 2, text: "Analyze the security impact of changes prior to implementation.", controls: ["CM-4"] },
  { id: "3.4.5", level: 2, text: "Define, document, approve, and enforce physical and logical access restrictions for changes.", controls: ["CM-5"] },
  { id: "3.4.6", level: 2, text: "Employ least functionality by configuring systems to provide only essential capabilities.", controls: ["CM-7"] },
  { id: "3.4.7", level: 2, text: "Restrict, disable, or prevent use of nonessential programs, functions, ports, protocols, and services.", controls: ["CM-7"] },
  { id: "3.4.8", level: 2, text: "Apply deny-by-exception (blacklist) or permit-by-exception (whitelist) policy for software.", controls: ["CM-7"] },
  { id: "3.4.9", level: 2, text: "Control and monitor user-installed software.", controls: ["CM-11"] },

  // 3.5 Identification and Authentication
  { id: "3.5.1", level: 1, text: "Identify system users, processes acting on behalf of users, and devices.", controls: ["IA-2", "IA-3"] },
  { id: "3.5.2", level: 1, text: "Authenticate identities of users, processes, or devices as a prerequisite to access.", controls: ["IA-2", "IA-5"] },
  { id: "3.5.3", level: 2, text: "Use multifactor authentication for local and network access to privileged accounts and network access to non-privileged accounts.", controls: ["IA-2"] },
  { id: "3.5.4", level: 2, text: "Employ replay-resistant authentication mechanisms for network access.", controls: ["IA-2"] },
  { id: "3.5.5", level: 2, text: "Prevent reuse of identifiers for a defined period.", controls: ["IA-4"] },
  { id: "3.5.6", level: 2, text: "Disable identifiers after a defined period of inactivity.", controls: ["IA-4"] },
  { id: "3.5.7", level: 2, text: "Enforce a minimum password complexity and change of characters when new passwords are created.", controls: ["IA-5"] },
  { id: "3.5.8", level: 2, text: "Prohibit password reuse for a specified number of generations.", controls: ["IA-5"] },
  { id: "3.5.9", level: 2, text: "Allow temporary password use for system logons with an immediate change to a permanent password.", controls: ["IA-5"] },
  { id: "3.5.10", level: 2, text: "Store and transmit only cryptographically-protected passwords.", controls: ["IA-5"] },
  { id: "3.5.11", level: 2, text: "Obscure feedback of authentication information.", controls: ["IA-6"] },

  // 3.6 Incident Response
  { id: "3.6.1", level: 2, text: "Establish an operational incident-handling capability (preparation, detection, analysis, containment, recovery, user response).", controls: ["IR-4", "IR-5", "IR-6"] },
  { id: "3.6.2", level: 2, text: "Track, document, and report incidents to designated officials and/or authorities.", controls: ["IR-6"] },
  { id: "3.6.3", level: 2, text: "Test the organizational incident response capability.", controls: ["IR-3"] },

  // 3.7 Maintenance
  { id: "3.7.1", level: 2, text: "Perform maintenance on organizational systems.", controls: ["MA-2"] },
  { id: "3.7.2", level: 2, text: "Provide controls on the tools, techniques, mechanisms, and personnel used for maintenance.", controls: ["MA-2", "MA-3"] },
  { id: "3.7.3", level: 2, text: "Ensure equipment removed for off-site maintenance is sanitized of CUI.", controls: ["MA-2"] },
  { id: "3.7.4", level: 2, text: "Check media containing diagnostic and test programs for malicious code before use.", controls: ["MA-3"] },
  { id: "3.7.5", level: 2, text: "Require multifactor authentication to establish nonlocal maintenance sessions and terminate them when complete.", controls: ["MA-4"] },
  { id: "3.7.6", level: 2, text: "Supervise the maintenance activities of personnel without required access authorization.", controls: ["MA-5"] },

  // 3.8 Media Protection
  { id: "3.8.1", level: 2, text: "Protect (physically control and securely store) system media containing CUI.", controls: ["MP-2", "MP-4"] },
  { id: "3.8.2", level: 2, text: "Limit access to CUI on system media to authorized users.", controls: ["MP-2"] },
  { id: "3.8.3", level: 1, text: "Sanitize or destroy system media containing CUI before disposal or reuse.", controls: ["MP-6"] },
  { id: "3.8.4", level: 2, text: "Mark media with necessary CUI markings and distribution limitations.", controls: ["MP-3"] },
  { id: "3.8.5", level: 2, text: "Control access to media containing CUI and maintain accountability during transport.", controls: ["MP-5"] },
  { id: "3.8.6", level: 2, text: "Implement cryptographic mechanisms to protect CUI on digital media during transport.", controls: ["MP-5", "SC-28"] },
  { id: "3.8.7", level: 2, text: "Control the use of removable media on system components.", controls: ["MP-7"] },
  { id: "3.8.8", level: 2, text: "Prohibit use of portable storage devices when such devices have no identifiable owner.", controls: ["MP-7"] },
  { id: "3.8.9", level: 2, text: "Protect the confidentiality of backup CUI at storage locations.", controls: ["CP-9"] },

  // 3.9 Personnel Security
  { id: "3.9.1", level: 2, text: "Screen individuals prior to authorizing access to systems containing CUI.", controls: ["PS-3"] },
  { id: "3.9.2", level: 2, text: "Ensure systems containing CUI are protected during and after personnel actions such as terminations and transfers.", controls: ["PS-4", "PS-5"] },

  // 3.10 Physical Protection
  { id: "3.10.1", level: 1, text: "Limit physical access to systems, equipment, and operating environments to authorized individuals.", controls: ["PE-2", "PE-3"] },
  { id: "3.10.2", level: 2, text: "Protect and monitor the physical facility and support infrastructure for systems.", controls: ["PE-6"] },
  { id: "3.10.3", level: 1, text: "Escort visitors and monitor visitor activity.", controls: ["PE-3"] },
  { id: "3.10.4", level: 1, text: "Maintain audit logs of physical access.", controls: ["PE-3"] },
  { id: "3.10.5", level: 1, text: "Control and manage physical access devices.", controls: ["PE-3"] },
  { id: "3.10.6", level: 2, text: "Enforce safeguarding measures for CUI at alternate work sites.", controls: ["PE-17"] },

  // 3.11 Risk Assessment
  { id: "3.11.1", level: 2, text: "Periodically assess risk to operations, assets, and individuals from operating systems that process/store CUI.", controls: ["RA-3"] },
  { id: "3.11.2", level: 2, text: "Scan for vulnerabilities in systems and applications periodically and when new vulnerabilities are identified.", controls: ["RA-5"] },
  { id: "3.11.3", level: 2, text: "Remediate vulnerabilities in accordance with risk assessments.", controls: ["RA-5", "SI-2"] },

  // 3.12 Security Assessment
  { id: "3.12.1", level: 2, text: "Periodically assess security controls to determine effectiveness.", controls: ["CA-2"] },
  { id: "3.12.2", level: 2, text: "Develop and implement plans of action to correct deficiencies and reduce/eliminate vulnerabilities.", controls: ["CA-5"] },
  { id: "3.12.3", level: 2, text: "Monitor security controls on an ongoing basis to ensure continued effectiveness.", controls: ["CA-7"] },
  { id: "3.12.4", level: 2, text: "Develop, document, and periodically update system security plans.", controls: ["CA-2"] },

  // 3.13 System and Communications Protection
  { id: "3.13.1", level: 1, text: "Monitor, control, and protect communications at external and key internal boundaries.", controls: ["SC-7"] },
  { id: "3.13.2", level: 2, text: "Employ architectural designs, software development techniques, and systems engineering principles that promote effective information security.", controls: ["SC-7", "SA-8"] },
  { id: "3.13.3", level: 2, text: "Separate user functionality from system management functionality.", controls: ["SC-2"] },
  { id: "3.13.4", level: 2, text: "Prevent unauthorized and unintended information transfer via shared system resources.", controls: ["SC-4"] },
  { id: "3.13.5", level: 1, text: "Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.", controls: ["SC-7"] },
  { id: "3.13.6", level: 2, text: "Deny network communications traffic by default and allow by exception.", controls: ["SC-7"] },
  { id: "3.13.7", level: 2, text: "Prevent remote devices from simultaneously connecting to the system and communicating via another connection (split tunneling).", controls: ["SC-7"] },
  { id: "3.13.8", level: 2, text: "Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission.", controls: ["SC-8"] },
  { id: "3.13.9", level: 2, text: "Terminate network connections at the end of sessions or after a period of inactivity.", controls: ["SC-10"] },
  { id: "3.13.10", level: 2, text: "Establish and manage cryptographic keys for cryptography employed in systems.", controls: ["SC-12"] },
  { id: "3.13.11", level: 2, text: "Employ FIPS-validated cryptography when used to protect the confidentiality of CUI.", controls: ["SC-13"] },
  { id: "3.13.12", level: 2, text: "Prohibit remote activation of collaborative computing devices and provide indication of use to users.", controls: ["SC-15"] },
  { id: "3.13.13", level: 2, text: "Control and monitor the use of mobile code.", controls: ["SC-18"] },
  { id: "3.13.14", level: 2, text: "Control and monitor the use of Voice over Internet Protocol (VoIP) technologies.", controls: ["SC-19"] },
  { id: "3.13.15", level: 2, text: "Protect the authenticity of communications sessions.", controls: ["SC-23"] },
  { id: "3.13.16", level: 2, text: "Protect the confidentiality of CUI at rest.", controls: ["SC-28"] },

  // 3.14 System and Information Integrity
  { id: "3.14.1", level: 1, text: "Identify, report, and correct system flaws in a timely manner.", controls: ["SI-2"] },
  { id: "3.14.2", level: 1, text: "Provide protection from malicious code at designated locations within systems.", controls: ["SI-3"] },
  { id: "3.14.3", level: 2, text: "Monitor system security alerts and advisories and take action in response.", controls: ["SI-5"] },
  { id: "3.14.4", level: 1, text: "Update malicious code protection mechanisms when new releases are available.", controls: ["SI-3"] },
  { id: "3.14.5", level: 1, text: "Perform periodic scans of the system and real-time scans of files from external sources.", controls: ["SI-3"] },
  { id: "3.14.6", level: 2, text: "Monitor systems, including inbound and outbound communications traffic, to detect attacks and indicators of potential attacks.", controls: ["SI-4"] },
  { id: "3.14.7", level: 2, text: "Identify unauthorized use of organizational systems.", controls: ["SI-4"] },
];

export const CMMC_L1_COUNT = CMMC_REQUIREMENTS.filter((r) => r.level === 1).length;
export const CMMC_TOTAL = CMMC_REQUIREMENTS.length;

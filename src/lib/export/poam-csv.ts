// eMASS-compatible POA&M export. Column order mirrors the DoD/eMASS POA&M
// workbook so the output can be reviewed in Excel or pasted into the template.
import type {
  Poam,
  System,
  User,
  Milestone,
  PoamControl,
  Finding,
  Asset,
  MitigationStatement,
  Severity,
  ImpactLevel,
} from "@prisma/client";
import { fmtDate, poamNumber } from "@/lib/format";

export type PoamForExport = Poam & {
  system: System;
  owner: User | null;
  controls: PoamControl[];
  milestones: Milestone[];
  findings: (Finding & { asset: Asset | null })[];
  mitigations: MitigationStatement[];
};

// eMASS POA&M workbook headers (v-current common set).
const HEADERS = [
  "POA&M Item ID",
  "Control Vulnerability Description",
  "Security Control Number (NC/NA controls only)",
  "Office/Org",
  "Security Checks",
  "Resources Required",
  "Scheduled Completion Date",
  "Milestone with Completion Dates",
  "Milestone Changes",
  "Source Identifying Control Vulnerability",
  "Status",
  "Comments",
  "Raw Severity Value",
  "Devices Affected",
  "Mitigations",
  "Predisposing Conditions",
  "Severity",
  "Relevance of Threat",
  "Likelihood",
  "Impact",
  "Impact Description",
  "Residual Risk Level",
  "Recommendations",
  "Resulting Residual Risk after Proposed Mitigations",
];

const RAW_SEVERITY: Record<Severity, string> = {
  CRITICAL: "Very High",
  HIGH: "High",
  MEDIUM: "Moderate",
  LOW: "Low",
  INFO: "Very Low",
};

const CAT: Record<Severity, string> = {
  CRITICAL: "CAT I",
  HIGH: "CAT I",
  MEDIUM: "CAT II",
  LOW: "CAT III",
  INFO: "CAT III",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Ongoing",
  ONGOING: "Ongoing",
  RISK_ACCEPTED: "Risk Accepted",
  COMPLETED: "Completed",
  CLOSED: "Completed",
};

function impactLabel(v: ImpactLevel | null): string {
  if (!v) return "";
  return v[0] + v.slice(1).toLowerCase();
}

/** RFC 4180 CSV field escaping. */
function csv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(p: PoamForExport): string[] {
  const controls = [...new Set(p.controls.map((c) => c.controlId))].join(", ");
  const ccis = [
    ...new Set(p.findings.flatMap((f) => (f.stigId ? [f.stigId] : []))),
  ].join(", ");
  const milestones = p.milestones
    .map(
      (m) =>
        `${m.description}${m.dueDate ? ` (due ${fmtDate(m.dueDate)})` : ""}` +
        `${m.completed ? " [complete]" : ""}`
    )
    .join("; ");
  const devices = [
    ...new Set(p.findings.map((f) => f.asset?.hostname).filter(Boolean)),
  ].join(", ");
  const mitigations = p.mitigations.map((m) => m.title).join("; ");

  return [
    poamNumber(p.number),
    p.weakness,
    controls,
    p.owner ? `${p.owner.name} (${p.owner.role})` : "",
    ccis,
    p.resourcesRequired ?? "",
    fmtDate(p.scheduledCompletion),
    milestones,
    "",
    p.sourceIdentifier ?? "",
    STATUS_LABEL[p.status] ?? p.status,
    p.recommendation ?? "",
    `${CAT[p.severity]} (${RAW_SEVERITY[p.severity]})`,
    devices,
    mitigations,
    "",
    impactLabel(p.riskRating),
    "",
    "",
    impactLabel(p.riskRating),
    "",
    impactLabel(p.residualRisk),
    p.recommendation ?? "",
    impactLabel(p.residualRisk),
  ];
}

export function buildPoamCsv(poams: PoamForExport[]): string {
  const lines = [HEADERS.map(csv).join(",")];
  for (const p of poams) lines.push(row(p).map(csv).join(","));
  return lines.join("\r\n");
}

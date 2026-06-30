import clsx from "clsx";
import type {
  Severity,
  FindingStatus,
  PoamStatus,
  AuthorizationStatus,
  ImpactLevel,
} from "@prisma/client";

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

const SEV: Record<Severity, { label: string; cls: string }> = {
  CRITICAL: { label: "Critical", cls: "bg-red-100 text-red-800" },
  HIGH: { label: "CAT I / High", cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  MEDIUM: { label: "CAT II / Med", cls: "bg-orange-50 text-orange-700 ring-1 ring-orange-200" },
  LOW: { label: "CAT III / Low", cls: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
  INFO: { label: "Info", cls: "bg-ink-100 text-ink-600" },
};

export function SeverityBadge({ value }: { value: Severity }) {
  const s = SEV[value];
  return <Pill className={s.cls}>{s.label}</Pill>;
}

const FSTAT: Record<FindingStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  NOT_A_FINDING: { label: "Not a Finding", cls: "bg-green-50 text-green-700 ring-1 ring-green-200" },
  NOT_APPLICABLE: { label: "Not Applicable", cls: "bg-ink-100 text-ink-600" },
  NOT_REVIEWED: { label: "Not Reviewed", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  CLOSED: { label: "Closed", cls: "bg-green-100 text-green-800" },
};

export function FindingStatusBadge({ value }: { value: FindingStatus }) {
  const s = FSTAT[value];
  return <Pill className={s.cls}>{s.label}</Pill>;
}

const PSTAT: Record<PoamStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-ink-100 text-ink-600" },
  OPEN: { label: "Open", cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  ONGOING: { label: "Ongoing", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  RISK_ACCEPTED: { label: "Risk Accepted", cls: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  COMPLETED: { label: "Completed", cls: "bg-green-50 text-green-700 ring-1 ring-green-200" },
  CLOSED: { label: "Closed", cls: "bg-green-100 text-green-800" },
};

export function PoamStatusBadge({ value }: { value: PoamStatus }) {
  const s = PSTAT[value];
  return <Pill className={s.cls}>{s.label}</Pill>;
}

const ATO: Record<AuthorizationStatus, { label: string; cls: string }> = {
  NOT_STARTED: { label: "Not Started", cls: "bg-ink-100 text-ink-600" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  ATO: { label: "ATO", cls: "bg-green-100 text-green-800" },
  ATO_WITH_CONDITIONS: { label: "ATO w/ Conditions", cls: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
  IATT: { label: "IATT", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  DENIED: { label: "Denied", cls: "bg-red-100 text-red-800" },
  EXPIRED: { label: "Expired", cls: "bg-red-100 text-red-800" },
  DECOMMISSIONED: { label: "Decommissioned", cls: "bg-ink-200 text-ink-700" },
};

export function AtoBadge({ value }: { value: AuthorizationStatus }) {
  const s = ATO[value];
  return <Pill className={s.cls}>{s.label}</Pill>;
}

export function ImpactBadge({ value }: { value: ImpactLevel }) {
  const cls =
    value === "HIGH"
      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
      : value === "MODERATE"
      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
      : "bg-green-50 text-green-700 ring-1 ring-green-200";
  return <Pill className={cls}>{value[0] + value.slice(1).toLowerCase()}</Pill>;
}

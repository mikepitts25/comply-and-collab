import { prisma } from "./db";
import { parseScan } from "./parsers";
import type { ParsedAsset, ParsedFinding } from "./parsers";
import type { AssetType, ScanType } from "@prisma/client";

/**
 * ACAS plugins generally don't carry CCIs. As a sensible default we correlate
 * vulnerability findings to the flaw-remediation / vuln-scanning controls so
 * they still roll up to the SSP and POA&M view.
 */
const ACAS_DEFAULT_CONTROLS = ["SI-2", "RA-5"];

function guessAssetType(osName?: string): AssetType {
  const s = (osName ?? "").toLowerCase();
  if (/windows|linux|rhel|ubuntu|centos|unix/.test(s)) return "SERVER";
  if (/cisco|juniper|switch|router|firewall/.test(s)) return "NETWORK_DEVICE";
  return "SERVER";
}

export interface IngestResult {
  scanImportId: string;
  scanType: ScanType;
  benchmark?: string;
  assets: number;
  totalFindings: number;
  openFindings: number;
  newFindings: number;
  closedFindings: number;
}

/** Parse + persist a scan file for a system, de-duplicating against history. */
export async function ingestScan(args: {
  systemId: string;
  userId: string;
  filename: string;
  content: string;
}): Promise<IngestResult> {
  const { systemId, userId, filename, content } = args;
  const parsed = parseScan(filename, content);

  // Pre-load the catalog mappings we need: CCI -> controlId.
  const allCcis = new Set<string>();
  for (const a of parsed.assets)
    for (const f of a.findings) f.ccis.forEach((c) => allCcis.add(c));

  const cciRows = await prisma.cci.findMany({
    where: { id: { in: [...allCcis] } },
    select: { id: true, controlId: true },
  });
  const cciToControl = new Map(cciRows.map((r) => [r.id, r.controlId]));

  // Valid control ids, so we never create a dangling FindingControl link.
  const validControls = new Set(
    (await prisma.control.findMany({ select: { id: true } })).map((c) => c.id)
  );

  const scanImport = await prisma.scanImport.create({
    data: {
      type: parsed.scanType,
      filename,
      systemId,
      importedById: userId,
    },
  });

  let totalFindings = 0;
  let openFindings = 0;
  let newFindings = 0;

  // ConMon bookkeeping: which assets this scan covered and which findings it
  // (re)confirmed, so we can auto-close findings that no longer appear.
  const scanSource = SCAN_SOURCE[parsed.scanType];
  const coveredAssetIds = new Set<string>();
  const seenFindingIds = new Set<string>();

  for (const asset of parsed.assets) {
    const assetRow = await upsertAsset(systemId, asset);
    coveredAssetIds.add(assetRow.id);

    for (const f of asset.findings) {
      totalFindings++;
      if (f.status === "OPEN") openFindings++;

      const controlIds = resolveControls(f, cciToControl).filter((c) =>
        validControls.has(c)
      );

      const existing = await prisma.finding.findUnique({
        where: {
          systemId_ruleId_assetId: {
            systemId,
            ruleId: f.ruleId,
            assetId: assetRow.id,
          },
        },
        select: { id: true },
      });
      if (!existing) newFindings++;

      const upserted = await prisma.finding.upsert({
        where: {
          systemId_ruleId_assetId: {
            systemId,
            ruleId: f.ruleId,
            assetId: assetRow.id,
          },
        },
        create: {
          source: f.source,
          systemId,
          assetId: assetRow.id,
          scanImportId: scanImport.id,
          ruleId: f.ruleId,
          groupId: f.groupId,
          stigId: f.stigId,
          pluginId: f.pluginId,
          cve: f.cve,
          title: f.title,
          description: f.description,
          severity: f.severity,
          status: f.status,
          checkText: f.checkText,
          fixText: f.fixText,
          comments: f.comments,
          ccis: { connect: existingCciConnect(f.ccis, cciToControl) },
          controls: {
            create: controlIds.map((controlId) => ({ controlId })),
          },
        },
        update: {
          scanImportId: scanImport.id,
          severity: f.severity,
          status: f.status,
          lastSeen: new Date(),
          // A finding seen again is no longer closed.
          closedAt: f.status === "OPEN" ? null : undefined,
          resolvedByRescan: f.status === "OPEN" ? false : undefined,
          // Refresh source guidance in case the benchmark was updated.
          checkText: f.checkText,
          fixText: f.fixText,
        },
      });
      seenFindingIds.add(upserted.id);
    }
  }

  // ConMon: auto-close findings of the same source on covered assets that this
  // scan no longer reports (i.e. remediated), then complete fully-resolved POA&Ms.
  const closedFindings = await reconcileClosures(
    systemId,
    scanSource,
    [...coveredAssetIds],
    [...seenFindingIds]
  );
  await reconcilePoams(systemId);
  await snapshotPosture(systemId, scanImport.id);

  const result = await prisma.scanImport.update({
    where: { id: scanImport.id },
    data: { totalFindings, openFindings, newFindings },
  });

  await prisma.activity.create({
    data: {
      actorId: userId,
      verb: "imported",
      entity: "ScanImport",
      entityId: scanImport.id,
      summary:
        `Imported ${filename} (${parsed.scanType}): ${totalFindings} findings, ` +
        `${openFindings} open, ${newFindings} new` +
        (closedFindings ? `, ${closedFindings} auto-closed by rescan` : "") +
        ".",
    },
  });

  return {
    scanImportId: result.id,
    scanType: parsed.scanType,
    benchmark: parsed.benchmark,
    assets: parsed.assets.length,
    totalFindings,
    openFindings,
    newFindings,
    closedFindings,
  };
}

/** Map a scan type to the normalized finding source it produces. */
const SCAN_SOURCE: Record<ScanType, "ACAS" | "STIG" | "SCAP"> = {
  ACAS_NESSUS: "ACAS",
  STIG_CKL: "STIG",
  STIG_CKLB: "STIG",
  SCAP: "SCAP",
};

/**
 * Close previously-OPEN findings from the same source on the scanned assets
 * that the latest scan no longer reports. Returns how many were closed.
 */
async function reconcileClosures(
  systemId: string,
  source: "ACAS" | "STIG" | "SCAP",
  coveredAssetIds: string[],
  seenFindingIds: string[]
): Promise<number> {
  if (coveredAssetIds.length === 0) return 0;
  const res = await prisma.finding.updateMany({
    where: {
      systemId,
      source,
      status: "OPEN",
      assetId: { in: coveredAssetIds },
      id: { notIn: seenFindingIds.length ? seenFindingIds : ["__none__"] },
    },
    data: { status: "CLOSED", closedAt: new Date(), resolvedByRescan: true },
  });
  return res.count;
}

/** Complete POA&Ms whose linked findings are all resolved (no longer open). */
async function reconcilePoams(systemId: string): Promise<void> {
  const open = await prisma.poam.findMany({
    where: { systemId, status: { in: ["DRAFT", "OPEN", "ONGOING"] } },
    select: { id: true, findings: { select: { status: true } } },
  });
  const now = new Date();
  for (const p of open) {
    if (p.findings.length === 0) continue;
    const allResolved = p.findings.every((f) => f.status !== "OPEN");
    if (allResolved) {
      await prisma.poam.update({
        where: { id: p.id },
        data: { status: "COMPLETED", actualCompletion: now },
      });
    }
  }
}

/** Append a point-in-time posture snapshot for trend/burndown charts. */
async function snapshotPosture(
  systemId: string,
  scanImportId?: string
): Promise<void> {
  const bySeverity = await prisma.finding.groupBy({
    by: ["severity"],
    where: { systemId, status: "OPEN" },
    _count: true,
  });
  const sev = (s: string) =>
    bySeverity.find((g) => g.severity === s)?._count ?? 0;
  const closedTotal = await prisma.finding.count({
    where: { systemId, status: "CLOSED" },
  });
  const totalOpen =
    sev("CRITICAL") + sev("HIGH") + sev("MEDIUM") + sev("LOW") + sev("INFO");

  await prisma.postureSnapshot.create({
    data: {
      systemId,
      scanImportId,
      openCritical: sev("CRITICAL"),
      openHigh: sev("HIGH"),
      openMedium: sev("MEDIUM"),
      openLow: sev("LOW"),
      totalOpen,
      closedTotal,
    },
  });
}

async function upsertAsset(systemId: string, asset: ParsedAsset) {
  return prisma.asset.upsert({
    where: { systemId_hostname: { systemId, hostname: asset.hostname } },
    create: {
      systemId,
      hostname: asset.hostname,
      fqdn: asset.fqdn,
      ipAddress: asset.ipAddress,
      macAddress: asset.macAddress,
      osName: asset.osName,
      type: guessAssetType(asset.osName),
    },
    update: {
      fqdn: asset.fqdn ?? undefined,
      ipAddress: asset.ipAddress ?? undefined,
      macAddress: asset.macAddress ?? undefined,
      osName: asset.osName ?? undefined,
    },
  });
}

/** Only connect CCIs that exist in the catalog (avoids FK errors). */
function existingCciConnect(
  ccis: string[],
  cciToControl: Map<string, string | null>
) {
  return ccis.filter((c) => cciToControl.has(c)).map((id) => ({ id }));
}

/** Map a finding to 800-53 controls via its CCIs, with an ACAS fallback. */
function resolveControls(
  f: ParsedFinding,
  cciToControl: Map<string, string | null>
): string[] {
  const ids = new Set<string>();
  for (const cci of f.ccis) {
    const ctrl = cciToControl.get(cci);
    if (ctrl) ids.add(ctrl);
  }
  if (ids.size === 0 && f.source === "ACAS") {
    ACAS_DEFAULT_CONTROLS.forEach((c) => ids.add(c));
  }
  return [...ids];
}

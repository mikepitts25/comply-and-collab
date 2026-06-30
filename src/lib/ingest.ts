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

  for (const asset of parsed.assets) {
    const assetRow = await upsertAsset(systemId, asset);

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

      await prisma.finding.upsert({
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
          // Refresh source guidance in case the benchmark was updated.
          checkText: f.checkText,
          fixText: f.fixText,
        },
      });
    }
  }

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
      summary: `Imported ${filename} (${parsed.scanType}): ${totalFindings} findings, ${openFindings} open, ${newFindings} new.`,
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
  };
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

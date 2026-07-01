import ExcelJS from "exceljs";
import type {
  System,
  Asset,
  SoftwareComponent,
  PpsmEntry,
} from "@prisma/client";

export type InventoryData = System & {
  assets: (Asset & { software: SoftwareComponent[] })[];
  ppsm: PpsmEntry[];
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.height = 22;
  row.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2533" } };
  });
}

/** Build a hardware/software/PPSM inventory workbook (3 sheets) for a system. */
export async function buildInventoryXlsx(system: InventoryData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Comply & Collab";
  wb.created = new Date();

  // Hardware
  const hw = wb.addWorksheet("Hardware");
  hw.columns = [
    { header: "Hostname", width: 22 },
    { header: "FQDN", width: 24 },
    { header: "IP Address", width: 16 },
    { header: "MAC Address", width: 20 },
    { header: "Type", width: 16 },
    { header: "Manufacturer", width: 16 },
    { header: "Model", width: 20 },
    { header: "Serial Number", width: 18 },
    { header: "OS", width: 24 },
    { header: "Location", width: 20 },
    { header: "Virtual", width: 10 },
  ];
  styleHeader(hw.getRow(1));
  for (const a of system.assets) {
    hw.addRow([
      a.hostname, a.fqdn ?? "", a.ipAddress ?? "", a.macAddress ?? "", a.type,
      a.manufacturer ?? "", a.model ?? "", a.serialNumber ?? "", a.osName ?? "",
      a.location ?? "", a.virtual ? "Yes" : "No",
    ]);
  }

  // Software
  const sw = wb.addWorksheet("Software");
  sw.columns = [
    { header: "Asset", width: 22 },
    { header: "Software", width: 30 },
    { header: "Version", width: 14 },
    { header: "Vendor", width: 18 },
    { header: "Type", width: 18 },
  ];
  styleHeader(sw.getRow(1));
  for (const a of system.assets) {
    for (const s of a.software) {
      sw.addRow([a.hostname, s.name, s.version ?? "", s.vendor ?? "", s.type.replace(/_/g, " ")]);
    }
  }

  // PPSM
  const pp = wb.addWorksheet("PPSM");
  pp.columns = [
    { header: "Port", width: 12 },
    { header: "Protocol", width: 10 },
    { header: "Service", width: 28 },
    { header: "Direction", width: 14 },
    { header: "Boundary", width: 24 },
    { header: "Classification", width: 14 },
    { header: "Status", width: 12 },
    { header: "Justification", width: 48 },
  ];
  styleHeader(pp.getRow(1));
  for (const p of system.ppsm) {
    pp.addRow([
      p.port, p.protocol, p.service, p.direction, p.boundary ?? "",
      p.classification ?? "", p.status, p.justification ?? "",
    ]);
  }

  for (const ws of wb.worksheets) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

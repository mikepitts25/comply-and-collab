import ExcelJS from "exceljs";
import { POAM_HEADERS, poamRow, type PoamForExport } from "./poam-rows";

/**
 * Build a real .xlsx workbook of POA&Ms in eMASS column order, with a styled
 * header, frozen header row, autofilter, and reasonable column widths so it
 * opens cleanly in Excel / pastes into the eMASS POA&M template.
 */
export async function buildPoamXlsx(
  poams: PoamForExport[],
  title: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Comply & Collab";
  wb.created = new Date();
  const ws = wb.addWorksheet("POA&M", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = POAM_HEADERS.map((h) => ({
    header: h,
    width: Math.min(48, Math.max(14, h.length + 2)),
  }));

  // Header styling
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  header.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  header.height = 30;
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2533" },
    };
    cell.border = { bottom: { style: "thin", color: { argb: "FF888888" } } };
  });

  for (const p of poams) {
    const row = ws.addRow(poamRow(p));
    row.alignment = { vertical: "top", wrapText: true };
  }

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: POAM_HEADERS.length },
  };

  // Title metadata sheet for provenance.
  const meta = wb.addWorksheet("About");
  meta.addRow(["Export", title]);
  meta.addRow(["Generated", new Date().toISOString()]);
  meta.addRow(["Tool", "Comply & Collab"]);
  meta.addRow(["Records", poams.length]);
  meta.getColumn(1).font = { bold: true };
  meta.getColumn(1).width = 16;
  meta.getColumn(2).width = 48;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

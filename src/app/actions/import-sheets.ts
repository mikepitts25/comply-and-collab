"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/rbac-server";
import { importPoamSheet } from "@/lib/import/poam-import";
import { importControlsSheet } from "@/lib/import/controls-import";

export type SheetImportState = {
  ok?: boolean;
  message?: string;
  error?: string;
  warnings?: string[];
};

async function fileBytes(formData: FormData): Promise<{ name: string; bytes: Uint8Array } | null> {
  const f = formData.get("file");
  if (f && typeof f === "object" && "arrayBuffer" in f && (f as File).size > 0) {
    const blob = f as File;
    return { name: blob.name, bytes: new Uint8Array(await blob.arrayBuffer()) };
  }
  return null;
}

export async function importPoamSheetAction(
  _prev: SheetImportState | undefined,
  formData: FormData
): Promise<SheetImportState> {
  const user = await requireCapability("poam:update");
  const systemId = String(formData.get("systemId") ?? "");
  const file = await fileBytes(formData);
  if (!systemId || !file) return { error: "Choose a system and a .csv/.xlsx file." };

  try {
    const r = await importPoamSheet({ systemId, userId: user.id, filename: file.name, bytes: file.bytes });
    revalidatePath("/poams");
    return {
      ok: true,
      message: `POA&Ms: ${r.created} created, ${r.updated} updated, ${r.milestones} milestone(s) imported.`,
      warnings: r.errors,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to parse the workbook." };
  }
}

export async function importControlsSheetAction(
  _prev: SheetImportState | undefined,
  formData: FormData
): Promise<SheetImportState> {
  const user = await requireCapability("control:document");
  const systemId = String(formData.get("systemId") ?? "");
  const file = await fileBytes(formData);
  if (!systemId || !file) return { error: "Choose a system and a .csv/.xlsx file." };

  try {
    const r = await importControlsSheet({ systemId, userId: user.id, filename: file.name, bytes: file.bytes });
    revalidatePath(`/systems/${systemId}`);
    const warn = [...r.errors];
    if (r.unknownControls.length) {
      warn.push(`Unknown control id(s) skipped: ${r.unknownControls.slice(0, 8).join(", ")}${r.unknownControls.length > 8 ? "…" : ""}`);
    }
    return {
      ok: true,
      message: `Controls: ${r.documented} newly documented, ${r.updated} updated.`,
      warnings: warn,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to parse the sheet." };
  }
}

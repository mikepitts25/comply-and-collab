"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/rbac-server";
import {
  createDocument,
  addDocumentVersion,
  setDocumentStatus,
  addDocumentComment,
  isReviewDecision,
  MAX_DOCUMENT_BYTES,
} from "@/lib/documents";
import type { DocumentCategory, DocumentStatus } from "@prisma/client";

export type DocState = { ok?: boolean; error?: string };

const CATEGORIES: DocumentCategory[] = ["POLICY", "PLAN", "DIAGRAM", "AUTHORIZATION", "ASSESSMENT", "AGREEMENT", "OTHER"];

async function fileFrom(formData: FormData) {
  const f = formData.get("file");
  if (f && typeof f === "object" && "arrayBuffer" in f && (f as File).size > 0) {
    const blob = f as File;
    if (blob.size > MAX_DOCUMENT_BYTES) {
      throw new Error(`File exceeds the ${Math.floor(MAX_DOCUMENT_BYTES / 1024 / 1024)} MB limit.`);
    }
    return { name: blob.name, type: blob.type || "application/octet-stream", bytes: new Uint8Array(await blob.arrayBuffer()) };
  }
  return null;
}

export async function createDocumentAction(
  _prev: DocState | undefined,
  formData: FormData
): Promise<DocState> {
  const user = await requireCapability("control:document");
  const systemId = String(formData.get("systemId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "OTHER") as DocumentCategory;
  const changeNote = String(formData.get("changeNote") ?? "").trim();
  try {
    const file = await fileFrom(formData);
    if (!systemId || !title || !changeNote || !file) {
      return { error: "Title, file, and an initial change note are required." };
    }
    await createDocument({
      systemId,
      title,
      category: CATEGORIES.includes(category) ? category : "OTHER",
      changeNote,
      userId: user.id,
      file,
    });
    revalidatePath(`/systems/${systemId}/documents`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function addVersionAction(
  _prev: DocState | undefined,
  formData: FormData
): Promise<DocState> {
  const user = await requireCapability("control:document");
  const documentId = String(formData.get("documentId") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  const changeNote = String(formData.get("changeNote") ?? "").trim();
  try {
    const file = await fileFrom(formData);
    if (!documentId || !changeNote || !file) {
      return { error: "A file and a note describing what changed are required." };
    }
    await addDocumentVersion({ documentId, changeNote, userId: user.id, file });
    revalidatePath(`/systems/${systemId}/documents/${documentId}`);
    revalidatePath(`/systems/${systemId}/documents`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function setDocumentStatusAction(formData: FormData): Promise<void> {
  const to = String(formData.get("to") ?? "") as DocumentStatus;
  // Review decisions (claim, approve, request changes) are senior moves.
  const user = isReviewDecision(to)
    ? await requireCapability("mitigation:approve")
    : await requireCapability("control:document");
  const documentId = String(formData.get("documentId") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!documentId || !to) return;
  await setDocumentStatus({ documentId, to, userId: user.id, note });
  revalidatePath(`/systems/${systemId}/documents/${documentId}`);
  revalidatePath(`/systems/${systemId}/documents`);
}

export async function addDocumentCommentAction(formData: FormData): Promise<void> {
  const user = await requireCapability("comment:create");
  const documentId = String(formData.get("documentId") ?? "");
  const systemId = String(formData.get("systemId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!documentId || !note) return;
  await addDocumentComment({ documentId, userId: user.id, note });
  revalidatePath(`/systems/${systemId}/documents/${documentId}`);
}

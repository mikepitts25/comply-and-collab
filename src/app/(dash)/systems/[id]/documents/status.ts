export const DOC_STATUS_CLS: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-600",
  READY_FOR_REVIEW: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  IN_REVIEW: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  CHANGES_REQUESTED: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  APPROVED: "bg-green-100 text-green-800",
  ARCHIVED: "bg-ink-200 text-ink-700",
};

export const DOC_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  READY_FOR_REVIEW: "Ready for review",
  IN_REVIEW: "In review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  ARCHIVED: "Archived",
};

"use client";

import { useState, useTransition } from "react";
import { loadCatalogAction, type CatalogLoadState } from "@/app/actions/catalog";
import { DownloadCloud } from "lucide-react";

export function CatalogLoader() {
  const [state, setState] = useState<CatalogLoadState | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3">
      {state?.ok && (
        <span className="text-xs text-green-700">
          +{state.controlsAdded} controls, +{state.ccisAdded} CCIs
        </span>
      )}
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      <button
        className="btn-ghost"
        disabled={pending}
        onClick={() => start(async () => setState(await loadCatalogAction()))}
        title="Load/top-up the bundled NIST 800-53 + DISA CCI catalog"
      >
        <DownloadCloud className="h-4 w-4" />
        {pending ? "Loading…" : "Load catalog bundle"}
      </button>
    </div>
  );
}

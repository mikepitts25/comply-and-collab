"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn-ghost print:hidden" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </button>
  );
}

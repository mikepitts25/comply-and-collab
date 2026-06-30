"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Server,
  ShieldAlert,
  ClipboardList,
  BookCheck,
  FileText,
  Upload,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/systems", label: "Systems", icon: Server },
  { href: "/findings", label: "Findings", icon: ShieldAlert },
  { href: "/poams", label: "POA&Ms", icon: ClipboardList },
  { href: "/controls", label: "Controls", icon: BookCheck },
  { href: "/mitigations", label: "Mitigations", icon: FileText },
  { href: "/import", label: "Import Scans", icon: Upload },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-ink-950 text-ink-200">
      <div className="flex items-center gap-2 px-5 py-4 text-white">
        <ShieldCheck className="h-6 w-6" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">Comply &amp; Collab</div>
          <div className="text-[11px] text-ink-400">Compliance &amp; ATO</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-ink-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] text-ink-500">
        Air-gap ready · v0.1
      </div>
    </aside>
  );
}

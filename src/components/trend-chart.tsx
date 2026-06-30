import type { TrendPoint } from "@/lib/conmon";
import { fmtDate } from "@/lib/format";

const W = 760;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

const BANDS: Array<{ key: keyof TrendPoint; color: string; label: string }> = [
  { key: "openLow", color: "#eab308", label: "Low" },
  { key: "openMedium", color: "#f97316", label: "Medium" },
  { key: "openHigh", color: "#ef4444", label: "High" },
  { key: "openCritical", color: "#b91c1c", label: "Critical" },
];

/** Stacked-area chart of open findings by severity over time (pure SVG). */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-ink-500">
        No posture history yet — import a scan to start the trend.
      </p>
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const maxY = Math.max(1, ...data.map((d) => d.totalOpen));

  const x = (i: number) =>
    PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / maxY) * innerH;

  // Build stacked bands (bottom -> top).
  let lower = new Array(data.length).fill(0);
  const areas = BANDS.map((band) => {
    const upper = data.map((d, i) => lower[i] + (d[band.key] as number));
    const top = data.map((d, i) => `${x(i)},${y(upper[i])}`);
    const bottom = data
      .map((d, i) => `${x(i)},${y(lower[i])}`)
      .reverse();
    const path = `M ${top.join(" L ")} L ${bottom.join(" L ")} Z`;
    lower = upper;
    return { path, color: band.color };
  });

  // Y axis ticks
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((maxY / ticks) * i)
  );

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Open findings trend">
        {/* gridlines + y labels */}
        {tickVals.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#eceef2" />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#8290a9">
              {t}
            </text>
          </g>
        ))}
        {/* stacked areas */}
        {areas.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} fillOpacity={0.85} />
        ))}
        {/* x labels (first, middle, last) */}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1]
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#8290a9">
              {fmtDate(data[i].takenAt)}
            </text>
          ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-600">
        {BANDS.slice().reverse().map((b) => (
          <span key={b.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

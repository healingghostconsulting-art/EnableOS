import { type ReactNode } from "react";

// A single segment of a multi-segment donut: its raw count, ring color, and label.
export type DonutSegment = { value: number; color: string; label: string };

// v3 kit — an accessible SVG donut ring. Two modes:
//  • single value (`value` 0–100) — one progress arc, rounded cap.
//  • breakdown (`segments`) — each segment is an arc sized to its share of the total,
//    laid clockwise from 12 o'clock with butt caps so neighbours meet cleanly. Pass
//    `legend` to render the count + % breakdown beside the ring.
// Children render centered (e.g. the headline number). Label it via ariaLabel.
export function Donut({ value, segments, size = 130, stroke = 12, color = "#1B303C", trackColor = "#E6EAF0", ariaLabel, legend = false, children }: {
  value?: number;
  segments?: DonutSegment[];
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  ariaLabel: string;
  legend?: boolean;
  children?: ReactNode;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const segs = segments ?? [];
  const segTotal = segs.reduce((sum, s) => sum + s.value, 0);

  // Multi-segment arcs: each is a single dash sized to its share, shifted forward by
  // a negative dashoffset so it begins where the preceding segments left off.
  let cumulative = 0;
  const segmentArcs = segs.map((s, i) => {
    if (s.value <= 0) return null;
    const arc = (segTotal ? s.value / segTotal : 0) * circumference;
    const dashOffset = -(segTotal ? cumulative / segTotal : 0) * circumference;
    cumulative += s.value;
    return (
      <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={s.color} strokeWidth={stroke}
        strokeDasharray={`${arc} ${circumference - arc}`} strokeDashoffset={dashOffset} />
    );
  });

  const singleArc = (() => {
    const pct = Math.max(0, Math.min(100, value ?? 0));
    const offset = circumference * (1 - pct / 100);
    return <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />;
  })();

  const ring = (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {segments ? segmentArcs : singleArc}
      </svg>
      {children ? <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div> : null}
    </div>
  );

  if (legend && segments) {
    return (
      <div className="flex items-center gap-4">
        {ring}
        <ul className="flex-1 space-y-2 text-[13px]">
          {segs.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-[#4A6373]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />{s.label}</span>
              <span className="flex items-center gap-2"><span className="font-semibold text-[#1B303C]">{s.value}</span><span className="w-9 text-right text-[12px] text-[#4A6373]">{segTotal ? Math.round((s.value / segTotal) * 100) : 0}%</span></span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return ring;
}

import { type ReactNode } from "react";

// v3 kit — a summary stat tile: tinted icon + value + label. CHCG palette only:
// cyan for coaching, emerald for progress, navy for structural counts, gold for the
// brand highlight. Tints stay AA (dark ink on a light wash); the gold tile uses
// navy-gold ink (#7A5200), never #FCBC34, per the dual-surface gold rule on light.
export type InfoTileTint = "cyan" | "gold" | "emerald" | "navy";
// `metric` (default) = a big tabular KPI numeral that aligns across tiles; `text` = a
// compact 2-line prose value for tiles whose "value" is a phrase, not a number.
export type InfoTileValueScale = "metric" | "text";

const TINT: Record<InfoTileTint, string> = {
  cyan: "bg-cyan-100 text-cyan-800",
  gold: "bg-amber-100 text-[#7A5200]",
  emerald: "bg-emerald-100 text-emerald-700",
  navy: "bg-[#1B303C]/8 text-[#1B303C]",
};

const VALUE_SCALE: Record<InfoTileValueScale, string> = {
  metric: "text-[24px] font-bold leading-none tracking-tight tabular-nums",
  text: "text-[15px] font-semibold leading-snug line-clamp-2",
};

export function InfoTile({ icon, tint, value, label, sub, onDark = false, valueScale = "metric" }: {
  icon: ReactNode;
  tint: InfoTileTint;
  value: string;
  label: string;
  /** Optional detail line between the value and the label (e.g. "guided experience"). */
  sub?: string;
  onDark?: boolean;
  /** `metric` (default, 24/700 tabular-nums) keeps KPI numerals aligned; `text` = 15/600, 2 lines. */
  valueScale?: InfoTileValueScale;
}) {
  // `onDark` (default false = no-op) makes the tile legible on a navy card. Per the Phase-4
  // InfoTile correction, value + label flip to #fff; the dark card SURFACE is delegated to a
  // call-site wrapper. The icon badge is a CIRCLE (measures/people/states are circular;
  // rounded-squares are reserved for openable things — a stat tile is a measure).
  return (
    <div className={onDark ? "flex items-center gap-3" : "flex items-center gap-3 rounded-2xl border border-[#1B303C]/10 bg-white px-4 py-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"}>
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TINT[tint]}`} aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className={`${VALUE_SCALE[valueScale]} ${onDark ? "text-white" : "text-[#1B303C]"}`}>{value}</p>
        {sub ? <p className={`mt-0.5 text-[12px] ${onDark ? "text-[#94a3b8]" : "text-[#4A6373]"}`}>{sub}</p> : null}
        <p className={`mt-1 text-[13px] ${onDark ? "text-white" : "text-[#4A6373]"}`}>{label}</p>
      </div>
    </div>
  );
}

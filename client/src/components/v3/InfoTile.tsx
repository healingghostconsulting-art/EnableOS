import { type ReactNode } from "react";

// v3 kit — a summary stat tile: tinted icon + value + label. Colors are wired to the
// --eos-* tokens (§2.2/§2.3): status tints resolve to the semantic --eos-status-* family,
// surfaces/text/hairlines to the surface + text tokens, sizes to the type scale. The gold
// tile keeps navy-gold ink (--gold-ink), never #FCBC34, per the dual-surface gold rule.
export type InfoTileTint = "cyan" | "gold" | "emerald" | "navy";
// `metric` (default) = a big tabular KPI numeral that aligns across tiles; `text` = a
// compact 2-line prose value for tiles whose "value" is a phrase, not a number.
export type InfoTileValueScale = "metric" | "text";

const TINT: Record<InfoTileTint, string> = {
  cyan: "bg-[var(--eos-status-info-soft)] text-[var(--eos-status-info-ink)]",
  gold: "bg-[var(--eos-gold-wash)] text-[var(--gold-ink)]",
  emerald: "bg-[var(--eos-status-green-soft)] text-[var(--eos-status-green-ink)]",
  navy: "bg-[#1B303C]/8 text-[var(--eos-text-strong)]",
};

const VALUE_SCALE: Record<InfoTileValueScale, string> = {
  // 24px has no token in the scale (the type scale tops the KPI range at h1/21), so it stays
  // a literal; `text` maps to --eos-fs-h3 (15px).
  metric: "text-[24px] font-bold leading-none tracking-tight tabular-nums",
  text: "text-[length:var(--eos-fs-h3)] font-semibold leading-snug line-clamp-2",
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
    <div className={onDark ? "flex items-center gap-3" : "flex items-center gap-3 rounded-2xl border border-[var(--eos-border-light)] bg-[var(--eos-surface-card)] px-4 py-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"}>
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TINT[tint]}`} aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className={`${VALUE_SCALE[valueScale]} ${onDark ? "text-white" : "text-[var(--eos-text-strong)]"}`}>{value}</p>
        {sub ? <p className={`mt-0.5 text-[length:var(--eos-fs-xs)] ${onDark ? "text-[var(--eos-text-muted-dark)]" : "text-[var(--eos-text-muted)]"}`}>{sub}</p> : null}
        <p className={`mt-1 text-[length:var(--eos-fs-sm)] ${onDark ? "text-white" : "text-[var(--eos-text-muted)]"}`}>{label}</p>
      </div>
    </div>
  );
}

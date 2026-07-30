import { type ReactNode } from "react";

// v3 kit — a summary stat tile: tinted icon + big value + label. CHCG palette only:
// cyan for coaching, emerald for progress, navy for structural counts, gold for the
// brand highlight. Tints stay AA (dark ink on a light wash); the gold tile uses
// navy-gold ink (#7A5200), never #FCBC34, per the dual-surface gold rule on light.
export type InfoTileTint = "cyan" | "gold" | "emerald" | "navy";

const TINT: Record<InfoTileTint, string> = {
  cyan: "bg-cyan-100 text-cyan-800",
  gold: "bg-amber-100 text-[#7A5200]",
  emerald: "bg-emerald-100 text-emerald-700",
  navy: "bg-[#1B303C]/8 text-[#1B303C]",
};

export function InfoTile({ icon, tint, value, label }: { icon: ReactNode; tint: InfoTileTint; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#1B303C]/10 bg-white px-4 py-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TINT[tint]}`} aria-hidden="true">{icon}</span>
      <div>
        <p className="text-[1.45rem] font-bold leading-none tracking-tight text-[#1B303C]">{value}</p>
        <p className="mt-1 text-[13px] text-[#4A6373]">{label}</p>
      </div>
    </div>
  );
}

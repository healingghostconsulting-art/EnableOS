import { type ReactNode } from "react";
import { InfoIcon } from "./InfoIcon";

// v3 kit — a titled information panel. The gold uppercase title uses #7A5200 (AA on
// white); the (i) exposes the panel's help text.
export function InfoPanel({ title, infoLabel, children }: { title: string; infoLabel: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-[#1B303C]/10 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A5200]">{title}</h2>
        <InfoIcon label={infoLabel} />
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

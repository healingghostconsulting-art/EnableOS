import { type ReactNode } from "react";

/**
 * Shared workspace action card — promoted from Coach Studio's CoachLaneActionCard
 * so every workspace draws the same primary/secondary card family (DESIGN2).
 *   • gold    = highlighted primary action
 *   • dark    = secondary action
 *   • emerald = positive / confirm
 * Eyebrows are single-sourced on the gold token: accent-gold-ink (AA on the light
 * gold card) and accent-gold (on the dark card), so the accent label is defined once.
 */
export type ActionCardAccent = "gold" | "dark" | "emerald";

export function ActionCard({
  eyebrow,
  title,
  body,
  action,
  accent = "dark",
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: ReactNode;
  accent?: ActionCardAccent;
}) {
  const paletteClassName =
    accent === "emerald"
      ? "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.92))]"
      : accent === "gold"
        ? "border-[#E6BE5A]/70 bg-[linear-gradient(180deg,rgba(255,247,216,0.98),rgba(252,228,150,0.94))] text-slate-950"
        : "border-slate-700/80 bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.92))] text-slate-50";
  const eyebrowClassName =
    accent === "emerald" ? "text-emerald-700" : accent === "gold" ? "text-accent-gold-ink" : "text-accent-gold";
  const titleClassName = accent === "emerald" || accent === "gold" ? "text-slate-950" : "text-white";
  const bodyClassName =
    accent === "emerald" ? "text-emerald-900/80" : accent === "gold" ? "text-slate-700" : "text-slate-200";

  return (
    <div className={`rounded-[1.25rem] border px-3 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.12)] ${paletteClassName}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${eyebrowClassName}`}>{eyebrow}</p>
      <h3 className={`mt-1.5 text-[15px] font-semibold leading-5 ${titleClassName}`}>{title}</h3>
      <p className={`mt-1 text-[13px] leading-5 ${bodyClassName}`}>{body}</p>
      <div className="mt-2.5">{action}</div>
    </div>
  );
}

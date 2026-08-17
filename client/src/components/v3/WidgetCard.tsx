import { type CSSProperties, type ReactNode } from "react";

// v3 kit — a titled dashboard widget card with a gold title underline and an optional
// top-right action (e.g. "View All →"). Gold underline is a decorative accent, not text.
//
// The Phase-4 player reformat adds an opt-in `tone="dark"` (navy card) plus a `variant`,
// `eyebrow`, and `padding`. ALL new styling lives behind non-default values, so the many
// existing light call sites (variant defaults to "section", tone to "light") render exactly
// as before. Dark tone is where the player's navy cards + KPI tiles come from.
export type WidgetCardTone = "light" | "dark";
export type WidgetCardVariant = "section" | "card";

export function WidgetCard({
  title,
  action,
  className = "",
  id,
  titleStyle = {},
  tone = "light",
  variant = "section",
  eyebrow,
  padding,
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  /** Anchor target for deep-links (e.g. /coach#coach-coachees). */
  id?: string;
  /**
   * Spread last onto the title element (default {} = no-op). Lets a KPI value routed
   * through `title` opt out of the card-title type and read as a KPI, e.g.
   * `{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em" }` (v3 KPI row).
   */
  titleStyle?: CSSProperties;
  /** "dark" = the player's deep-navy card (default "light" = the shipped white card). */
  tone?: WidgetCardTone;
  /**
   * "section" (default) = uppercase title + gold underline (the shipped header).
   * "card" = a KPI/stat tile: optional gold eyebrow + a plain (titleStyle-driven) value,
   * no underline.
   */
  variant?: WidgetCardVariant;
  /** Gold micro-label above the title (KPI tiles). Gold on dark, gold-ink on light. */
  eyebrow?: string;
  /** Inner padding in px (default 20 / p-5). KPI tiles use 16. */
  padding?: number;
  children: ReactNode;
}) {
  const dark = tone === "dark";
  // Player-only styling is gated on `dark`, so the light default is byte-identical to the
  // shipped card (radius-2xl, white, the same shadow) and existing call sites don't move.
  const surface = dark
    ? "rounded-[var(--eos-radius-xl)] border-[var(--eos-border-dark)] bg-[var(--eos-dark-1)] shadow-[var(--eos-shadow-md)]"
    : "rounded-2xl border-[#1B303C]/8 bg-[var(--eos-surface-card)] shadow-[0_10px_30px_rgba(15,23,42,0.05)]";
  const titleColor = dark ? "text-white" : "text-[var(--eos-text-strong)]";
  const eyebrowColor = dark ? "text-[var(--gold)]" : "text-[var(--gold-ink)]";
  return (
    <section
      id={id}
      className={`flex flex-col scroll-mt-24 ${surface} border ${padding === undefined ? "p-5 " : ""}${className}`}
      style={padding === undefined ? undefined : { padding }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className={`mb-1 text-[length:var(--eos-fs-micro)] font-bold uppercase tracking-[0.2em] ${eyebrowColor}`}>{eyebrow}</p>
          ) : null}
          {variant === "section" ? (
            <>
              <h2 className={`text-[length:var(--eos-fs-xs)] font-bold uppercase tracking-[0.12em] ${titleColor}`} style={titleStyle}>{title}</h2>
              <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[var(--gold)]" />
            </>
          ) : (
            <h2 className={`text-[length:var(--eos-fs-h3)] font-semibold ${titleColor}`} style={titleStyle}>{title}</h2>
          )}
        </div>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

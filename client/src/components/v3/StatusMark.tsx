import { type LucideIcon, AlertTriangle, CheckCircle2, Clock, Minus, Users } from "lucide-react";
import { useStatusLabels } from "@/contexts/StatusLabelsContext";

// StatusMark — the canonical status affordance for v3. Semantic status must never be
// carried by color alone (fails grayscale + color-vision deficiency), so every status
// maps to a DISTINCT-SILHOUETTE icon plus a text label; color is redundant reinforcement.
//
//   coaching             → people   (Users)
//   on-track / positive  → check-ring (CheckCircle2)
//   at-risk / alert      → triangle (AlertTriangle)
//   warning / overdue    → clock    (Clock)
//   neutral              → dash     (Minus)
//
// Existing vocabulary (strong, monitor, needs_attention, behind, …) is aliased onto the
// canonical set here, so call sites keep their own wording via the optional `label`.

export type CanonicalStatus = "coaching" | "positive" | "alert" | "overdue" | "neutral";
export type StatusMarkVariant = "pill" | "badge" | "inline" | "dot";

// Every alias resolves to exactly one canonical status. Keys are lower-cased and
// whitespace/hyphens are normalized to underscores before lookup.
const ALIAS: Record<string, CanonicalStatus> = {
  coaching: "coaching", people: "coaching", session: "coaching", sessions: "coaching", one_on_one: "coaching",
  positive: "positive", on_track: "positive", ontrack: "positive", strong: "positive", achieved: "positive", complete: "positive", completed: "positive", good: "positive", healthy: "positive",
  alert: "alert", at_risk: "alert", atrisk: "alert", risk: "alert", needs_attention: "alert", needs_action: "alert", behind: "alert", critical: "alert",
  overdue: "overdue", warning: "overdue", warn: "overdue", monitor: "overdue", watch: "overdue", due: "overdue", follow_up_due: "overdue", pending: "overdue", scheduled: "overdue",
  neutral: "neutral", none: "neutral", unknown: "neutral", not_started: "neutral", info: "neutral",
};

export function normalizeStatus(input: string): CanonicalStatus {
  const key = input.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ALIAS[key] ?? "neutral";
}

interface StatusMeta { icon: LucideIcon; label: string; pill: string; badge: string; inline: string; dot: string; }

// Colors follow the dual-surface gold rule on light surfaces (amber tone uses gold-ink
// #7A5200 for AA). The icon silhouette — not the color — is the primary cue.
// §2.2 — the semantic fills + text resolve to the --eos-status-* family; the badge border
// shades stay literal (no exact token, and /opacity on a var isn't used anywhere in the repo).
// Overdue keeps navy-gold ink (--gold-ink) per the dual-surface gold rule. The icon
// silhouette — not the color — is the primary cue.
const META: Record<CanonicalStatus, StatusMeta> = {
  coaching: { icon: Users, label: "Coaching", pill: "bg-[var(--eos-status-info-soft)] text-[var(--eos-status-info-ink)]", badge: "border-cyan-200 bg-[var(--eos-status-info-soft)] text-[var(--eos-status-info-ink)]", inline: "text-[var(--eos-status-info-ink)]", dot: "text-[var(--eos-status-info-ink)]" },
  positive: { icon: CheckCircle2, label: "On track", pill: "bg-[var(--eos-status-green-soft)] text-[var(--eos-status-green-ink)]", badge: "border-emerald-200 bg-[var(--eos-status-green-soft)] text-[var(--eos-status-green-ink)]", inline: "text-[var(--eos-status-green-ink)]", dot: "text-[var(--eos-status-green-ink)]" },
  alert: { icon: AlertTriangle, label: "At risk", pill: "bg-[var(--eos-status-red-soft)] text-[var(--eos-status-red-ink)]", badge: "border-rose-200 bg-[var(--eos-status-red-soft)] text-[var(--eos-status-red-ink)]", inline: "text-[var(--eos-status-red-ink)]", dot: "text-[var(--eos-status-red-ink)]" },
  overdue: { icon: Clock, label: "Overdue", pill: "bg-[var(--eos-status-amber-soft)] text-[var(--gold-ink)]", badge: "border-amber-200 bg-[var(--eos-status-amber-soft)] text-[var(--gold-ink)]", inline: "text-[var(--gold-ink)]", dot: "text-[var(--gold-ink)]" },
  neutral: { icon: Minus, label: "Neutral", pill: "bg-[#1B303C]/8 text-[var(--eos-text-strong)]", badge: "border-[#1B303C]/15 bg-[#1B303C]/5 text-[var(--eos-text-strong)]", inline: "text-[var(--eos-text-muted)]", dot: "text-[var(--eos-text-muted)]" },
};

// On a navy card the light -50 washes disappear and the -700/-800 inks go muddy, so `onDark`
// swaps to a translucent status-soft fill + the brightened base hue (the -300/-400 tints read
// AA on navy). The icon silhouette is unchanged — color stays redundant reinforcement.
const META_DARK: Record<CanonicalStatus, Pick<StatusMeta, "pill" | "badge" | "inline" | "dot">> = {
  coaching: { pill: "bg-[rgba(34,184,207,0.15)] text-[#67e8f9]", badge: "border-[rgba(34,184,207,0.35)] bg-[rgba(34,184,207,0.12)] text-[#67e8f9]", inline: "text-[#67e8f9]", dot: "text-[#67e8f9]" },
  positive: { pill: "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]", badge: "border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] text-[#6ee7b7]", inline: "text-[#6ee7b7]", dot: "text-[#6ee7b7]" },
  alert: { pill: "bg-[rgba(244,63,94,0.15)] text-[#fda4af]", badge: "border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.12)] text-[#fda4af]", inline: "text-[#fda4af]", dot: "text-[#fda4af]" },
  overdue: { pill: "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]", badge: "border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.12)] text-[#fcd34d]", inline: "text-[#fcd34d]", dot: "text-[#fcd34d]" },
  neutral: { pill: "bg-white/[0.08] text-[#cbd5e1]", badge: "border-white/15 bg-white/[0.06] text-[#cbd5e1]", inline: "text-[#cbd5e1]", dot: "text-[#cbd5e1]" },
};

export function StatusMark({ status, variant = "pill", label, showLabel = true, className = "", onDark = false }: {
  status: string;
  variant?: StatusMarkVariant;
  /** Override the canonical label while keeping the canonical icon + tone. */
  label?: string;
  /** Icon-only marks (e.g. dense legends) still expose the label to assistive tech. */
  showLabel?: boolean;
  className?: string;
  /** Brighten the chrome for a navy surface (default false = the shipped light treatment). */
  onDark?: boolean;
}) {
  // The Settings "always show status labels" preference forces the label on, overriding a
  // call site's showLabel={false} (e.g. dense dot legends), so no status is icon-only.
  const { alwaysShowLabels } = useStatusLabels();
  const effectiveShowLabel = alwaysShowLabels || showLabel;

  const canonical = normalizeStatus(status);
  const meta = META[canonical];
  const palette = onDark ? META_DARK[canonical] : meta;
  const Icon = meta.icon;
  const text = label ?? meta.label;
  const labelNode = effectiveShowLabel ? text : <span className="sr-only">{text}</span>;

  if (variant === "dot") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${palette.dot}`} aria-hidden="true" />
        {effectiveShowLabel ? <span className={`text-[12px] ${onDark ? "text-[#cbd5e1]" : "text-[#4A6373]"}`}>{text}</span> : <span className="sr-only">{text}</span>}
      </span>
    );
  }
  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${palette.inline} ${className}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {labelNode}
      </span>
    );
  }
  const chrome = variant === "badge" ? `rounded-md border px-2 py-0.5 ${palette.badge}` : `rounded-full px-2.5 py-0.5 ${palette.pill}`;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${chrome} ${className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {labelNode}
    </span>
  );
}

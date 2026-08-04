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
const META: Record<CanonicalStatus, StatusMeta> = {
  coaching: { icon: Users, label: "Coaching", pill: "bg-cyan-50 text-cyan-800", badge: "border-cyan-200 bg-cyan-50 text-cyan-800", inline: "text-cyan-700", dot: "text-cyan-600" },
  positive: { icon: CheckCircle2, label: "On track", pill: "bg-emerald-50 text-emerald-700", badge: "border-emerald-200 bg-emerald-50 text-emerald-700", inline: "text-emerald-700", dot: "text-emerald-600" },
  alert: { icon: AlertTriangle, label: "At risk", pill: "bg-rose-50 text-rose-700", badge: "border-rose-200 bg-rose-50 text-rose-700", inline: "text-rose-700", dot: "text-rose-600" },
  overdue: { icon: Clock, label: "Overdue", pill: "bg-amber-50 text-[#7A5200]", badge: "border-amber-200 bg-amber-50 text-[#7A5200]", inline: "text-[#7A5200]", dot: "text-[#7A5200]" },
  neutral: { icon: Minus, label: "Neutral", pill: "bg-[#1B303C]/8 text-[#1B303C]", badge: "border-[#1B303C]/15 bg-[#1B303C]/5 text-[#1B303C]", inline: "text-[#4A6373]", dot: "text-[#4A6373]" },
};

export function StatusMark({ status, variant = "pill", label, showLabel = true, className = "" }: {
  status: string;
  variant?: StatusMarkVariant;
  /** Override the canonical label while keeping the canonical icon + tone. */
  label?: string;
  /** Icon-only marks (e.g. dense legends) still expose the label to assistive tech. */
  showLabel?: boolean;
  className?: string;
}) {
  // The Settings "always show status labels" preference forces the label on, overriding a
  // call site's showLabel={false} (e.g. dense dot legends), so no status is icon-only.
  const { alwaysShowLabels } = useStatusLabels();
  const effectiveShowLabel = alwaysShowLabels || showLabel;

  const meta = META[normalizeStatus(status)];
  const Icon = meta.icon;
  const text = label ?? meta.label;
  const labelNode = effectiveShowLabel ? text : <span className="sr-only">{text}</span>;

  if (variant === "dot") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.dot}`} aria-hidden="true" />
        {effectiveShowLabel ? <span className="text-[12px] text-[#4A6373]">{text}</span> : <span className="sr-only">{text}</span>}
      </span>
    );
  }
  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${meta.inline} ${className}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {labelNode}
      </span>
    );
  }
  const chrome = variant === "badge" ? `rounded-md border px-2 py-0.5 ${meta.badge}` : `rounded-full px-2.5 py-0.5 ${meta.pill}`;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${chrome} ${className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {labelNode}
    </span>
  );
}

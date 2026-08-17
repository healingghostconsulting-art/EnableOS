import { type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

// v3 kit — a workspace entry card: dark icon badge, role tag, title, 2-line
// description, and a "Sign in →" action. Renders as a button (the whole card is the
// affordance) with a keyboard focus ring and reduced-motion fallback.
export type RoleTagTint = "manager" | "coach" | "learner" | "client_admin";

// CHCG palette only: navy for the manager (structural), cyan for the coach (the
// agreed coaching accent), emerald for the learner (progress), gold for the admin.
const TAG_TINT: Record<RoleTagTint, string> = {
  manager: "bg-[#1B303C]/8 text-[var(--eos-text-strong)]",
  coach: "bg-[var(--eos-status-info-soft)] text-[var(--eos-status-info-ink)]",
  learner: "bg-[var(--eos-status-green-soft)] text-[var(--eos-status-green-ink)]",
  client_admin: "bg-[var(--eos-gold-wash)] text-[var(--gold-ink)]",
};

export function RoleCard({ icon, tag, tagTint, title, description, actionLabel = "Sign in", onSelect }: {
  icon: ReactNode;
  tag: string;
  tagTint: RoleTagTint;
  title: string;
  description: string;
  actionLabel?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex h-full flex-col rounded-2xl border border-[var(--eos-border-light)] bg-[var(--eos-surface-card)] px-4 py-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#7A5200]/25 hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-3">
        {/* rounded-xl (not a circle): a RoleCard is an openable thing, not a measure. */}
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-navy)] text-white" aria-hidden="true">{icon}</span>
        <span className={`rounded-full px-2.5 py-1 text-[length:var(--eos-fs-nano)] font-semibold uppercase tracking-[0.14em] ${TAG_TINT[tagTint]}`}>{tag}</span>
      </div>
      <div className="mt-4 flex-1 space-y-1.5">
        <p className="text-[1.05rem] font-semibold text-[var(--eos-text-strong)]">{title}</p>
        <p className="text-[13.5px] leading-6 text-[var(--eos-text-muted)]">{description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[#1B303C]/8 pt-3.5">
        <span className="text-[length:var(--eos-fs-sm)] font-semibold text-[var(--eos-text-strong)]">{actionLabel}</span>
        <ArrowRight className="h-4 w-4 text-[var(--eos-text-strong)] transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
      </div>
    </button>
  );
}

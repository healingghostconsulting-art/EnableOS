import { type ReactNode } from "react";
import { ArrowRight } from "lucide-react";

// v3 kit — a workspace entry card: dark icon badge, role tag, title, 2-line
// description, and a "Sign in →" action. Renders as a button (the whole card is the
// affordance) with a keyboard focus ring and reduced-motion fallback.
export type RoleTagTint = "manager" | "coach" | "learner" | "client_admin";

const TAG_TINT: Record<RoleTagTint, string> = {
  manager: "bg-indigo-50 text-indigo-700",
  coach: "bg-violet-50 text-violet-700",
  learner: "bg-emerald-50 text-emerald-700",
  client_admin: "bg-amber-50 text-[#7A5200]",
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
      className="group flex h-full flex-col rounded-2xl border border-[#1B303C]/10 bg-white px-4 py-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#7A5200]/25 hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B303C] text-white" aria-hidden="true">{icon}</span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${TAG_TINT[tagTint]}`}>{tag}</span>
      </div>
      <div className="mt-4 flex-1 space-y-1.5">
        <p className="text-[1.05rem] font-semibold text-[#1B303C]">{title}</p>
        <p className="text-[13.5px] leading-6 text-[#4A6373]">{description}</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[#1B303C]/8 pt-3.5">
        <span className="text-[13px] font-semibold text-[#1B303C]">{actionLabel}</span>
        <ArrowRight className="h-4 w-4 text-[#1B303C] transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
      </div>
    </button>
  );
}

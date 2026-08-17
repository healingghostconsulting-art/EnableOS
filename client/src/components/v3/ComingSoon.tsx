import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

// ComingSoon — the single source for "not built yet" affordances across the v3
// dashboards. Both variants render visibly non-interactive (muted, cursor-default, no
// hover, no arrow, aria-disabled) so a stub never masquerades as a live control that
// quietly reloads the same route. Previously duplicated verbatim across the Agent,
// Coach, Manager, and Client Admin views.

/** Inline widget-header action stand-in (e.g. a "View All" that has no destination yet). */
export function ComingSoonAction({
  children,
  onDark = false,
}: {
  children: ReactNode;
  onDark?: boolean;
}) {
  return (
    <span
      aria-disabled="true"
      title="Available in the full workspace"
      className={`inline-flex cursor-default items-center gap-1 text-[12px] font-semibold ${
        onDark ? "text-[var(--eos-text-subtle-dark)]" : "text-[#4A6373]/60"
      }`}
    >
      {children}
    </span>
  );
}

/** Quick-action grid tile stand-in — a dashed card with a "Soon" badge. */
export function ComingSoonTile({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div
      aria-disabled="true"
      title="Available in the full workspace"
      className="flex cursor-default items-center justify-between gap-2 rounded-xl border border-dashed border-[#1B303C]/12 bg-[#FBFCFD] px-3.5 py-3 text-[13px] font-semibold text-[#4A6373]"
    >
      <span className="inline-flex items-center gap-2.5">
        <Icon className="h-[18px] w-[18px] text-[#4A6373]/70" aria-hidden="true" />
        {label}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4A6373]/70">Soon</span>
    </div>
  );
}

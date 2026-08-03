import { type ReactNode } from "react";

// v3 kit — a titled dashboard widget card with a gold title underline and an optional
// top-right action (e.g. "View All →"). Gold underline is a decorative accent, not text.
export function WidgetCard({ title, action, className = "", id, children }: {
  title: string;
  action?: ReactNode;
  className?: string;
  /** Anchor target for deep-links (e.g. /coach#coach-coachees). */
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`flex flex-col scroll-mt-24 rounded-2xl border border-[#1B303C]/8 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#1B303C]">{title}</h2>
          <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
        </div>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </section>
  );
}

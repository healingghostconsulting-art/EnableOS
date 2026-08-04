import { type ReactNode } from "react";
import { type LucideIcon, AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

// v3 interaction primitives — async surface states. Loading skeletons, empty states, and
// error states on CHCG tokens, so async surfaces show intentional placeholders instead of
// blank flashes. Skeletons are aria-hidden and wrapped by LoadingState for a polite
// screen-reader announcement.

/** A single shimmer block. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-[#1B303C]/8 motion-reduce:animate-none", className)} />;
}

/** Widget-card skeleton — title + a couple of lines + an action bar. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[#1B303C]/8 bg-white p-5", className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-3 h-2.5 w-full" />
      <Skeleton className="mt-2 h-2.5 w-4/5" />
      <Skeleton className="mt-4 h-8 w-24" />
    </div>
  );
}

/** Roster/list skeleton — avatar + two text lines + a trailing pill, repeated. */
export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-[#1B303C]/8 bg-white p-3.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-2.5 w-1/2" /></div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Wraps a skeleton in a polite live region so assistive tech hears "Loading…". */
export function LoadingState({ label = "Loading…", children }: { label?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1B303C]/12 bg-[#FBFCFD] px-6 py-10 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1B303C]/6 text-[#4A6373]" aria-hidden="true"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-[14px] font-semibold text-[#1B303C]">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] text-[#4A6373]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description = "We couldn't load this just now.", onRetry }: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700" aria-hidden="true"><AlertTriangle className="h-5 w-5" /></span>
      <p className="mt-3 text-[14px] font-semibold text-[#1B303C]">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] text-[#4A6373]">{description}</p> : null}
      {onRetry ? <div className="mt-4"><Button variant="secondary" size="sm" onClick={onRetry}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again</Button></div> : null}
    </div>
  );
}

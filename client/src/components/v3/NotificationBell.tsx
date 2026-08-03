import { useState } from "react";
import { Bell } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// v3 kit — the TopBar notification bell. Clicking it opens a popover listing recent
// notification previews (demo.notificationPreviews, a public tenant-scoped procedure).
// Built on the Radix popover so Esc / outside-click dismissal, focus trapping, and
// keyboard operation come for free. The unread-count badge is driven by the caller
// (the same value the dashboards already compute); the list loads lazily on open.

// Each preview maps to the surface that reminder type is acted on. The preview payload
// is a generic gallery (no per-item deepLink), so this is a best-effort "go to source".
const ROUTE_FOR: Record<string, string> = {
  training_due: "/training",
  coaching_follow_up: "/calendar",
  one_on_one_scheduled: "/calendar",
  knowledge_check_failed: "/training",
  coaching_cadence_gap: "/calendar",
  // announcement: no dedicated surface — clicking just marks it read.
};

export function NotificationBell({ notificationCount, notificationsHref }: { notificationCount: number; notificationsHref?: string }) {
  const [open, setOpen] = useState(false);
  const [readTypes, setReadTypes] = useState<Set<string>>(new Set());
  const [allRead, setAllRead] = useState(false);
  const [, setLocation] = useLocation();
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const previews = trpc.demo.notificationPreviews.useQuery({ tenantId }, { enabled: open });
  const items = previews.data ?? [];
  const displayCount = allRead ? 0 : notificationCount;

  const openItem = (reminderType: string) => {
    setReadTypes((prev) => new Set(prev).add(reminderType));
    setOpen(false);
    const href = ROUTE_FOR[reminderType];
    if (href) setLocation(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications, ${displayCount} unread`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1B303C]/12 bg-white text-[#1B303C] transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {displayCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#FCBC34] px-1 text-[10px] font-bold text-[#1B303C]">{displayCount}</span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Recent notifications"
        className="w-80 rounded-2xl border-[#1B303C]/10 bg-white p-0 text-[#1B303C] shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
      >
        <div className="flex items-center justify-between border-b border-[#1B303C]/8 px-4 py-3">
          <p className="text-[13px] font-bold text-[#1B303C]">Notifications</p>
          {items.length > 0 && !allRead ? (
            <button type="button" onClick={() => setAllRead(true)} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A5200] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30">
              Mark all read
            </button>
          ) : null}
        </div>
        {previews.isLoading ? (
          <p className="px-4 py-6 text-center text-[13px] text-[#4A6373]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-[#4A6373]">You're all caught up.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-[#1B303C]/6 overflow-y-auto">
            {items.map((n) => {
              const isRead = allRead || readTypes.has(n.reminderType);
              return (
                <li key={n.reminderType}>
                  <button
                    type="button"
                    onClick={() => openItem(n.reminderType)}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isRead ? "bg-[#1B303C]/15" : "bg-[#FCBC34]"}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className={`block text-[13px] ${isRead ? "font-medium text-[#4A6373]" : "font-semibold text-[#1B303C]"}`}>{n.subject}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[12px] leading-5 text-[#4A6373]">{n.text}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {notificationsHref ? (
          <div className="border-t border-[#1B303C]/8 px-4 py-2.5 text-center">
            <Link href={notificationsHref} onClick={() => setOpen(false)} className="text-[12px] font-semibold text-[#7A5200] hover:underline">
              View all
            </Link>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

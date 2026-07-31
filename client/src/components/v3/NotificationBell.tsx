import { useState } from "react";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// v3 kit — the TopBar notification bell. Clicking it opens a popover listing recent
// notification previews (demo.notificationPreviews, a public tenant-scoped procedure).
// Built on the Radix popover so Esc / outside-click dismissal, focus trapping, and
// keyboard operation come for free. The unread-count badge is driven by the caller
// (the same value the dashboards already compute); the list loads lazily on open.
export function NotificationBell({ notificationCount }: { notificationCount: number }) {
  const [open, setOpen] = useState(false);
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const previews = trpc.demo.notificationPreviews.useQuery({ tenantId }, { enabled: open });
  const items = previews.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications, ${notificationCount} unread`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1B303C]/12 bg-white text-[#1B303C] transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {notificationCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#FCBC34] px-1 text-[10px] font-bold text-[#1B303C]">{notificationCount}</span>
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
          {notificationCount > 0 ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7A5200]">{notificationCount} unread</span>
          ) : null}
        </div>
        {previews.isLoading ? (
          <p className="px-4 py-6 text-center text-[13px] text-[#4A6373]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-[#4A6373]">You're all caught up.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-[#1B303C]/6 overflow-y-auto">
            {items.map((n) => (
              <li key={n.reminderType} className="flex gap-3 px-4 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FCBC34]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1B303C]">{n.subject}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-[#4A6373]">{n.text}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

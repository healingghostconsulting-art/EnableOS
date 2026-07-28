import { type ReactNode } from "react";
import { Bell, Search } from "lucide-react";

// v3 kit — the light top bar: a time-aware greeting, global search, notification bell
// with count, and the viewer avatar + date. Prop-driven for reuse across dashboards.
export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function TopBar({ name, greeting, subtitleTail, notificationCount, dateLabel, avatar }: {
  name: string;
  greeting: string;
  /** The gold-highlighted tail of the supportive subtitle (e.g. "great day"). */
  subtitleTail: string;
  notificationCount: number;
  dateLabel: string;
  avatar: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[#1B303C]/8 bg-white px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 className="text-[1.6rem] font-bold tracking-tight text-[#1B303C]">{greeting}, {name}!</h1>
        <p className="mt-0.5 text-[14px] text-[#4A6373]">Let's make it a <span className="font-semibold text-[#7A5200]">{subtitleTail}</span>.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4A6373]" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search anything..."
            aria-label="Search anything"
            className="h-10 w-64 rounded-full border border-[#1B303C]/12 bg-[#F7F8FA] pl-9 pr-3 text-sm text-[#1B303C] placeholder:text-[#4A6373] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30"
          />
        </div>
        <button type="button" aria-label={`Notifications, ${notificationCount} unread`} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1B303C]/12 bg-white text-[#1B303C] transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none">
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {notificationCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#FCBC34] px-1 text-[10px] font-bold text-[#1B303C]">{notificationCount}</span>
          ) : null}
        </button>
        <div className="flex items-center gap-2.5">
          {avatar}
          <span className="hidden text-right text-[12px] leading-tight text-[#4A6373] lg:block">{dateLabel}</span>
        </div>
      </div>
    </header>
  );
}

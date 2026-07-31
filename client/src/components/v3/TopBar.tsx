import { type ReactNode } from "react";
import { Search } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

// v3 kit — the light top bar: a time-aware greeting, the viewer avatar + date, a
// working notification bell (opens a popover of recent notification previews), and a
// (presentational) global search. Search has no backing feature in the demo yet, so it
// renders visibly non-interactive (disabled, muted) rather than as a dead control.
// Prop-driven for reuse across dashboards.
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
            disabled
            title="Search is available in the full workspace"
            className="h-10 w-64 cursor-default rounded-full border border-[#1B303C]/12 bg-[#F7F8FA] pl-9 pr-3 text-sm text-[#4A6373] placeholder:text-[#4A6373]"
          />
        </div>
        <NotificationBell notificationCount={notificationCount} />
        <div className="flex items-center gap-2.5">
          {avatar}
          <span className="hidden text-right text-[12px] leading-tight text-[#4A6373] lg:block">{dateLabel}</span>
        </div>
      </div>
    </header>
  );
}

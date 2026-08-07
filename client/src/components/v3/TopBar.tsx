import { type ReactNode } from "react";
import { ChevronDown, Contrast, LogIn, LogOut, Menu, Search, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useGrayscale } from "@/contexts/GrayscaleContext";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

export function TopBar({ name, greeting, subtitleTail, notificationCount, dateLabel, avatar, notificationsHref, onMenuClick }: {
  name: string;
  greeting: string;
  /** The gold-highlighted tail of the supportive subtitle (e.g. "great day"). */
  subtitleTail: string;
  notificationCount: number;
  dateLabel: string;
  avatar: ReactNode;
  /** Optional "View all" target for the notification popover (the role's alerts). */
  notificationsHref?: string;
  /** Opens the off-canvas nav drawer; the hamburger shows only below lg. */
  onMenuClick?: () => void;
}) {
  const { isAuthenticated, logout } = useAuth();
  const { grayscale, toggleGrayscale } = useGrayscale();
  const [location, setLocation] = useLocation();
  return (
    <header className="flex flex-col gap-3 border-b border-[#1B303C]/8 bg-white px-4 py-3.5 sm:px-6 sm:py-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#1B303C]/12 bg-white text-[#1B303C] transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-[1.3rem] font-bold tracking-tight text-[#1B303C] sm:text-[1.6rem]">{greeting}, {name}!</h1>
          <p className="mt-0.5 truncate text-[13px] text-[#4A6373] sm:text-[14px]">Let's make it a <span className="font-semibold text-[#7A5200]">{subtitleTail}</span>.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
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
        <NotificationBell notificationCount={notificationCount} notificationsHref={notificationsHref} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="flex items-center gap-2.5 rounded-full px-1 py-0.5 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none"
            >
              {avatar}
              <span className="hidden text-right text-[12px] leading-tight text-[#4A6373] lg:block">{dateLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#4A6373]" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={grayscale}
              onCheckedChange={toggleGrayscale}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer"
            >
              <Contrast className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Grayscale mode</span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {isAuthenticated ? (
              <DropdownMenuItem onClick={() => { void logout(); }} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => { window.location.href = getLoginUrl(location); }} className="cursor-pointer">
                <LogIn className="mr-2 h-4 w-4" />
                <span>Sign in</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useReminderBadge } from "@/lib/reminderBadge";
import { useIsMobile } from "@/hooks/useMobile";
import { Building2, ChevronLeft, ChevronRight, Compass, Flame, LogOut, Sparkles, Target, Trophy, type LucideIcon } from "lucide-react";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

export type DashboardMenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 348;
const MIN_WIDTH = 276;
const MAX_WIDTH = 460;
const DESKTOP_SIDEBAR_AUTO_COLLAPSE_DELAY_MS = 12_000;
const workspaceMissionSignals: Record<string, {
  eyebrow: string;
  headline: string;
  focus: string;
  next: string;
  reward: string;
}> = {
  "/mission-hub": {
    eyebrow: "Mission hub",
    headline: "Start with the next priority.",
    focus: "Next action",
    next: "Search, resume, or jump directly into the right workspace.",
    reward: "Queue visible",
  },
  "/reporting": {
    eyebrow: "Reporting hub",
    headline: "Compare movement without extra chrome.",
    focus: "Trend review",
    next: "Use the core charts first, then drill into the outliers that need follow-up.",
    reward: "Reporting ready",
  },
  "/manager": {
    eyebrow: "Manager ops",
    headline: "Work the queue and clear the next case.",
    focus: "Intervention queue",
    next: "Open the active learner, review the evidence, and send the next action.",
    reward: "Cases moving",
  },
  "/coach": {
    eyebrow: "Coach studio",
    headline: "Coach from one focused workspace.",
    focus: "Guided support",
    next: "Review the current session, confirm the evidence, and log the follow-up.",
    reward: "Support ready",
  },
  "/learner": {
    eyebrow: "Agent journey",
    headline: "Resume the next assigned step.",
    focus: "Assigned learning",
    next: "Keep required work at the top and move optional material into secondary browse surfaces.",
    reward: "Progress visible",
  },
  "/training": {
    eyebrow: "Training zone",
    headline: "Resume the current lesson.",
    focus: "Lesson player",
    next: "Keep support hidden until it is needed and let the lesson stay in control.",
    reward: "Player ready",
  },
  "/guide": {
    eyebrow: "EnableOS guide",
    headline: "Orient every role from one shared playbook.",
    focus: "Platform guidance",
    next: "Start with the role home, then use shared workspaces only when the next action needs them.",
    reward: "Guidance ready",
  },
  "/calendar": {
    eyebrow: "Calendar",
    headline: "See what's due before it slips.",
    focus: "Upcoming agenda",
    next: "Work the overdue and today items first, then look ahead to the week.",
    reward: "Schedule clear",
  },
  "/admin": {
    eyebrow: "Client control",
    headline: "Finish setup in clear operating steps.",
    focus: "Tenant setup",
    next: "Start with the most urgent branding, role, or governance task, then open the deeper controls.",
    reward: "Controls aligned",
  },
  "/library": {
    eyebrow: "Training library",
    headline: "Find, preview, and assign content faster.",
    focus: "Focused browse",
    next: "Search first, preview only what matters, and keep assignment actions close to the content.",
    reward: "Assets queued",
  },
  "/chcg-admin": {
    eyebrow: "CHCG command",
    headline: "Keep platform oversight compact and auditable.",
    focus: "Platform review",
    next: "Open the highest-risk governance issue first and move the rest into secondary admin views.",
    reward: "Oversight clear",
  },
};

function resolveWorkspaceMissionSignal(path: string, fallbackTitle: string) {
  return workspaceMissionSignals[path] ?? {
    eyebrow: fallbackTitle,
    headline: "Keep the current workspace focused, guided, and easy to navigate.",
    focus: "Guided flow",
    next: "Show the most important action first and keep details in progressive layers.",
    reward: "Progress visible",
  };
}


export function getDesktopSidebarUiState({
  isMobile,
  isCollapsed,
}: {
  isMobile: boolean;
  isCollapsed: boolean;
}) {
  const showFloatingTrigger = !isMobile && isCollapsed;

  return {
    collapseMode: "offcanvas" as const,
    toggleLabel: isCollapsed ? "Open navigation" : "Collapse navigation",
    toggleChevronDirection: isCollapsed ? "right" as const : "left" as const,
    showFloatingTrigger,
    mainPaddingClass: showFloatingTrigger ? "pt-20 md:pt-24" : "",
  };
}

export function getDesktopSidebarAutoCollapseDelay(isMobile: boolean) {
  return isMobile ? null : DESKTOP_SIDEBAR_AUTO_COLLAPSE_DELAY_MS;
}

export default function DashboardLayout({
  children,
  menuItems,
  title = "CHCG EnableOS",
  subtitle = "Enterprise enablement and coaching intelligence",
  requireAuth = false,
  demoProfile,
}: {
  children: React.ReactNode;
  menuItems: DashboardMenuItem[];
  title?: string;
  subtitle?: string;
  requireAuth?: boolean;
  demoProfile?: {
    name: string;
    email?: string;
    roleLabel: string;
  };
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_WIDTH;
    }

    const saved = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    }
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (requireAuth && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f4f6f8_52%,#eef2f5_100%)] px-6 text-[#1B303C]">
        <div className="glass-panel energy-frame w-full max-w-md rounded-[2rem] p-8">
          <div className="space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-[#4A6373]">Secure mission access</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1B303C]">Sign in to continue</h1>
            <p className="text-sm leading-6 text-[#4A6373]">
              Access to this workspace requires authentication so CHCG can keep enablement, coaching, and governance data secure.
            </p>
          </div>
          <Button
            onClick={() => {
              const returnPath = `${window.location.pathname}${window.location.search}`;
              window.location.href = getLoginUrl(returnPath);
            }}
            size="lg"
            className="mt-8 w-full rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]"
          >
            Launch secure access
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
        menuItems={menuItems}
        title={title}
        subtitle={subtitle}
        demoProfile={demoProfile}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  menuItems: DashboardMenuItem[];
  title: string;
  subtitle: string;
  demoProfile?: {
    name: string;
    email?: string;
    roleLabel: string;
  };
};

function normalizeMenuPath(path: string) {
  return path.split("?")[0] ?? path;
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  menuItems,
  title,
  subtitle,
  demoProfile,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, open, setOpen, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const autoCollapseTimeoutRef = useRef<number | null>(null);
  const normalizedLocationPath = normalizeMenuPath(location);
  const { unreadByPath } = useReminderBadge();
  const activeMenuItem = menuItems.find((item) => normalizeMenuPath(item.path) === normalizedLocationPath);
  const isMobile = useIsMobile();
  const desktopSidebarUi = getDesktopSidebarUiState({ isMobile, isCollapsed });
  const activeWorkspacePath = activeMenuItem ? normalizeMenuPath(activeMenuItem.path) : normalizedLocationPath;
  const commandSignal = resolveWorkspaceMissionSignal(activeWorkspacePath, activeMenuItem?.label ?? title);
  const profileName = user?.name || demoProfile?.name || "CHCG Demo";
  const profileEmail = user?.email || demoProfile?.email || demoProfile?.roleLabel || "Demo workspace";
  const profileFallback = profileName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const clearAutoCollapseTimer = useCallback(() => {
    if (autoCollapseTimeoutRef.current !== null) {
      window.clearTimeout(autoCollapseTimeoutRef.current);
      autoCollapseTimeoutRef.current = null;
    }
  }, []);

  const restartAutoCollapseTimer = useCallback(() => {
    const autoCollapseDelay = getDesktopSidebarAutoCollapseDelay(isMobile);
    clearAutoCollapseTimer();

    if (!open || autoCollapseDelay === null || isResizing) {
      return;
    }

    autoCollapseTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      autoCollapseTimeoutRef.current = null;
    }, autoCollapseDelay);
  }, [clearAutoCollapseTimer, isMobile, isResizing, open, setOpen]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    restartAutoCollapseTimer();

    return () => {
      clearAutoCollapseTimer();
    };
  }, [clearAutoCollapseTimer, location, restartAutoCollapseTimer]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible={desktopSidebarUi.collapseMode}
          className="border-r border-[#1B303C]/10 bg-white/90 text-[#1B303C] backdrop-blur-2xl"
          disableTransition={isResizing}
          onMouseEnter={restartAutoCollapseTimer}
          onFocusCapture={restartAutoCollapseTimer}
          onPointerDownCapture={restartAutoCollapseTimer}
        >
          <SidebarHeader className="h-auto border-b border-[#1B303C]/10 px-3 pb-4 pt-4">
            <div className="glass-panel energy-frame rounded-[2rem] px-3 py-3">
              <div className="flex w-full items-start gap-3 px-1">
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#1B303C]/10 bg-white shadow-[0_10px_24px_rgba(27,48,60,0.06)] transition-all duration-300 ease-out hover:-translate-x-0.5 hover:bg-[#FCBC34]/12 hover:shadow-[0_16px_36px_rgba(27,48,60,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={desktopSidebarUi.toggleLabel}
                    aria-expanded={!isCollapsed}
                    title={desktopSidebarUi.toggleLabel}
                  >
                    {desktopSidebarUi.toggleChevronDirection === "left" ? (
                      <ChevronLeft className="h-4 w-4 text-[#1B303C] transition-transform duration-300 ease-out group-hover:-translate-x-0.5" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-[#1B303C] transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
                    )}
                  </button>
                {!isCollapsed ? (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="reward-ring flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(252,188,52,0.32),rgba(74,99,115,0.12))] text-[#1B303C]">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-5 tracking-tight text-[#1B303C] xl:text-base">{title}</p>
                        <p className="mt-1 text-[13px] leading-5 text-[#4A6373] xl:text-[13.5px]">{subtitle}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-4">
            {!isCollapsed ? (
              <div className="mb-4 rounded-[1.6rem] border border-[#FCBC34]/35 bg-[linear-gradient(135deg,rgba(252,188,52,0.14),rgba(255,255,255,0.96))] p-3 text-[#1B303C]">
                <div className="flex items-center gap-2 text-[#4A6373]">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[10px] uppercase tracking-[0.22em]">Mission rhythm</p>
                </div>
                <p className="mt-3 text-[14px] font-medium leading-6">Keep momentum across discovery, training, coaching, and governance.</p>
                <div className="mt-3 flex items-start gap-2 text-[13px] leading-5 text-[#4A6373]">
                  <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FCBC34]" />
                  <span>Progress cues are now visible across the platform.</span>
                </div>
              </div>
            ) : null}

            <SidebarMenu className="gap-2">
              {menuItems.map((item, index) => {
                const isActive = normalizedLocationPath === normalizeMenuPath(item.path);
                const unread = unreadByPath[item.path] ?? 0;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-auto min-h-13 rounded-2xl border border-transparent px-2.5 py-3 text-[14px] font-medium text-[#1B303C] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#1B303C]/10 hover:bg-[#F7F8FA] hover:shadow-[0_14px_34px_rgba(27,48,60,0.08)] data-[active=true]:border-[#FCBC34]/40 data-[active=true]:bg-[#1B303C] data-[active=true]:text-white data-[active=true]:shadow-[0_18px_48px_rgba(27,48,60,0.18)]"
                    >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ease-out ${isActive ? "bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "bg-[#F7F8FA] group-hover:bg-white group-hover:shadow-[0_10px_24px_rgba(27,48,60,0.08)]"}`}>

                          <item.icon className={`h-4 w-4 transition-all duration-300 ease-out ${isActive ? "text-white" : "text-[#4A6373] group-hover:text-[#1B303C]"}`} />

                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 transition-all duration-300 ease-out">
                        <span className="min-w-0 leading-5 whitespace-normal">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          {/* Unread reminder count, published per-route by the active workspace panel. */}
                          {unread > 0 ? <Badge className="rounded-full border-none bg-rose-500 px-1.5 text-[10px] font-semibold leading-4 text-white" aria-label={`${unread} unread reminders`}>{unread}</Badge> : null}
                          {!isCollapsed ? (
                            isActive ? <Badge className="rounded-full border-none bg-white/15 text-[11px] uppercase tracking-[0.18em] text-white">live</Badge> : <span className="text-xs text-[#4A6373]">{String(index + 1).padStart(2, "0")}</span>
                          ) : null}
                        </div>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-[#1B303C]/10 p-3">
            {!isCollapsed ? (
                  <div className="mb-3 grid grid-cols-1 gap-2 rounded-[1.5rem] border border-[#1B303C]/10 bg-[#F7F8FA] p-3.5 text-[#1B303C] sm:grid-cols-3">

                <div>
                  <div className="flex items-center gap-1 text-[#4A6373]"><Compass className="h-3.5 w-3.5" /><span className="text-[11px] uppercase tracking-[0.2em]">Nav</span></div>
                  <p className="mt-1.5 text-[15px] font-medium">Clear</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[#4A6373]"><Target className="h-3.5 w-3.5" /><span className="text-[11px] uppercase tracking-[0.2em]">Goals</span></div>
                  <p className="mt-1.5 text-[15px] font-medium">Tracked</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[#4A6373]"><Trophy className="h-3.5 w-3.5" /><span className="text-[11px] uppercase tracking-[0.2em]">Wins</span></div>
                  <p className="mt-1.5 text-[15px] font-medium">Visible</p>
                </div>
              </div>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="glass-panel flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-[#FCBC34]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-10 w-10 shrink-0 border border-[#1B303C]/10">
                    <AvatarFallback className="bg-[#1B303C] text-xs font-medium text-white">{profileFallback}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-[15px] font-medium leading-none text-[#1B303C]">{profileName}</p>
                    <p className="mt-1.5 truncate text-sm text-[#4A6373]">{profileEmail}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="cursor-default text-slate-500 focus:text-slate-500">
                    Demo workspace access
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-[#FCBC34]/40 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="relative bg-transparent">
        {desktopSidebarUi.showFloatingTrigger ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open navigation"
            aria-expanded="false"
            className="group fixed left-4 top-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-[#1B303C]/12 bg-white/94 px-4 text-sm font-medium text-[#1B303C] shadow-[0_18px_48px_rgba(27,48,60,0.12)] backdrop-blur-xl transition-all duration-300 ease-out hover:border-[#FCBC34]/60 hover:bg-[#FFFBF0] hover:shadow-[0_22px_54px_rgba(27,48,60,0.18)] data-[state=entering]:animate-in data-[state=entering]:slide-in-from-left-2"
          >
            <ChevronRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
            <span>Navigation</span>
          </button>
        ) : null}
        {isMobile ? (
          <div className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-[#1B303C]/10 bg-white/92 px-3 py-2 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-[#1B303C]/10 bg-[#F7F8FA] text-[#1B303C]" />
              <div>
                <p className="text-sm font-medium text-[#1B303C]">{activeMenuItem?.label ?? title}</p>
                <p className="text-xs text-[#4A6373]">{commandSignal.focus}</p>
              </div>
            </div>
          </div>
        ) : null}
        <main className={`flex-1 p-3 pt-4 sm:p-4 sm:pt-5 md:p-6 md:pt-6 xl:p-8 xl:pt-6 ${desktopSidebarUi.mainPaddingClass}`}>{children}</main>
      </SidebarInset>
    </>
  );
}

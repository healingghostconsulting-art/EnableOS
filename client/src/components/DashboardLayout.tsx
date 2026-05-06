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
import { useIsMobile } from "@/hooks/useMobile";
import { Building2, Compass, Flame, LogOut, PanelLeft, Sparkles, Target, Trophy, type LucideIcon } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
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
    showFloatingTrigger,
    mainPaddingClass: showFloatingTrigger ? "pt-20 md:pt-24" : "",
  };
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
              window.location.href = getLoginUrl();
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
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();
  const desktopSidebarUi = getDesktopSidebarUiState({ isMobile, isCollapsed });
  const profileName = user?.name || demoProfile?.name || "CHCG Demo";
  const profileEmail = user?.email || demoProfile?.email || demoProfile?.roleLabel || "Demo workspace";
  const profileFallback = profileName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

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
        <Sidebar collapsible={desktopSidebarUi.collapseMode} className="border-r border-[#1B303C]/10 bg-white/90 text-[#1B303C] backdrop-blur-2xl" disableTransition={isResizing}>
          <SidebarHeader className="h-auto border-b border-[#1B303C]/10 px-3 pb-4 pt-4">
            <div className="glass-panel energy-frame rounded-[2rem] px-3 py-3">
              <div className="flex w-full items-start gap-3 px-1">
                  <button
                    onClick={toggleSidebar}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#1B303C]/10 bg-white transition-colors hover:bg-[#FCBC34]/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={desktopSidebarUi.toggleLabel}
                    title={desktopSidebarUi.toggleLabel}
                  >

                  <PanelLeft className="h-4 w-4 text-[#1B303C]" />
                </button>
                {!isCollapsed ? (
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="reward-ring flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(252,188,52,0.32),rgba(74,99,115,0.12))] text-[#1B303C]">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-5 tracking-tight text-[#1B303C] xl:text-base">{title}</p>
                        <p className="mt-1 text-[13px] leading-5 text-[#4A6373] xl:text-[13.5px]">{subtitle}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-[#1B303C]/10 bg-[#F7F8FA] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#4A6373]">Mode</p>
                        <p className="mt-1.5 text-[13px] font-medium leading-5 text-[#1B303C]">Live</p>
                      </div>
                      <div className="rounded-2xl border border-[#1B303C]/10 bg-[#F7F8FA] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#4A6373]">Focus</p>
                        <p className="mt-1.5 text-[13px] font-medium leading-5 text-[#1B303C]">Readiness</p>
                      </div>
                      <div className="rounded-2xl border border-[#1B303C]/10 bg-[#F7F8FA] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#4A6373]">Motion</p>
                        <p className="mt-1.5 text-[13px] font-medium leading-5 text-[#1B303C]">Active</p>
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
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-auto min-h-13 rounded-2xl border border-transparent px-2.5 py-3 text-[14px] font-medium text-[#1B303C] transition-all hover:bg-[#F7F8FA] data-[active=true]:border-[#FCBC34]/40 data-[active=true]:bg-[#1B303C] data-[active=true]:text-white data-[active=true]:shadow-[0_18px_48px_rgba(27,48,60,0.18)]"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? "bg-white/12" : "bg-[#F7F8FA]"}`}>
                        <item.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#4A6373]"}`} />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="min-w-0 leading-5 whitespace-normal">{item.label}</span>
                        {!isCollapsed ? (
                          isActive ? <Badge className="rounded-full border-none bg-white/15 text-[11px] uppercase tracking-[0.18em] text-white">live</Badge> : <span className="text-xs text-[#4A6373]">{String(index + 1).padStart(2, "0")}</span>
                        ) : null}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-[#1B303C]/10 p-3">
            {!isCollapsed ? (
              <div className="mb-3 grid grid-cols-3 gap-2 rounded-[1.5rem] border border-[#1B303C]/10 bg-[#F7F8FA] p-3.5 text-[#1B303C]">
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
            className="fixed left-4 top-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-[#1B303C]/12 bg-white/94 px-4 text-sm font-medium text-[#1B303C] shadow-[0_18px_48px_rgba(27,48,60,0.12)] backdrop-blur-xl transition hover:border-[#FCBC34]/60 hover:bg-[#FFFBF0]"
          >
            <PanelLeft className="h-4 w-4" />
            <span>Navigation</span>
          </button>
        ) : null}
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#1B303C]/10 bg-white/92 px-3 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-[#1B303C]/10 bg-[#F7F8FA] text-[#1B303C]" />
              <div>
                <p className="text-sm font-medium text-[#1B303C]">{activeMenuItem?.label ?? title}</p>
                <p className="text-xs text-[#4A6373]">{subtitle}</p>
              </div>
            </div>
          </div>
        ) : null}
        <main className={`flex-1 p-4 md:p-7 xl:p-8 ${desktopSidebarUi.mainPaddingClass}`}>{children}</main>
      </SidebarInset>
    </>
  );
}

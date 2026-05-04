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
const DEFAULT_WIDTH = 332;
const MIN_WIDTH = 252;
const MAX_WIDTH = 460;

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
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (requireAuth && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#08111f_0%,#091525_52%,#070d18_100%)] px-6 text-white">
        <div className="glass-panel energy-frame w-full max-w-md rounded-[2rem] p-8">
          <div className="space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/70">Secure mission access</p>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to continue</h1>
            <p className="text-sm leading-6 text-slate-300">
              Access to this workspace requires authentication so CHCG can keep enablement, coaching, and governance data secure.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="mt-8 w-full rounded-full bg-white text-slate-950 hover:bg-slate-100"
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
        <Sidebar collapsible="icon" className="border-r border-white/8 bg-slate-950/82 backdrop-blur-2xl" disableTransition={isResizing}>
          <SidebarHeader className="h-auto border-b border-white/8 px-3 pb-4 pt-4">
            <div className="glass-panel energy-frame rounded-[2rem] px-3 py-3">
              <div className="flex w-full items-start gap-3 px-1">
                <button
                  onClick={toggleSidebar}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 transition-colors hover:bg-white/14 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Toggle navigation"
                >
                  <PanelLeft className="h-4 w-4 text-slate-200" />
                </button>
                {!isCollapsed ? (
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="reward-ring flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/30 via-sky-400/20 to-violet-400/25 text-white">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-white xl:text-base">{title}</p>
                        <p className="truncate text-sm text-slate-300/85">{subtitle}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/55">Mode</p>
                        <p className="mt-1.5 text-sm font-medium text-white">Live</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/55">Focus</p>
                        <p className="mt-1.5 text-sm font-medium text-white">Readiness</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/55">Motion</p>
                        <p className="mt-1.5 text-sm font-medium text-white">Active</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-4">
            {!isCollapsed ? (
              <div className="mb-4 rounded-[1.6rem] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/10 via-sky-400/8 to-violet-500/10 p-3 text-white">
                <div className="flex items-center gap-2 text-cyan-100/85">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-[11px] uppercase tracking-[0.24em]">Mission rhythm</p>
                </div>
                <p className="mt-3 text-[15px] font-medium leading-6">Keep momentum across discovery, training, coaching, and governance.</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-200">
                  <Flame className="h-3.5 w-3.5 text-amber-300" />
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
                      className="h-13 rounded-2xl border border-transparent px-2.5 text-[15px] font-medium text-slate-100 transition-all data-[active=true]:border-cyan-300/20 data-[active=true]:bg-white data-[active=true]:text-slate-950 data-[active=true]:shadow-[0_18px_48px_rgba(125,211,252,0.18)]"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? "bg-slate-950/6" : "bg-white/6"}`}>
                        <item.icon className={`h-4 w-4 ${isActive ? "text-slate-950" : "text-cyan-100/85"}`} />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span>{item.label}</span>
                        {!isCollapsed ? (
                          isActive ? <Badge className="rounded-full border-none bg-slate-950/8 text-[11px] uppercase tracking-[0.18em] text-slate-800">live</Badge> : <span className="text-xs text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                        ) : null}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-white/8 p-3">
            {!isCollapsed ? (
              <div className="mb-3 grid grid-cols-3 gap-2 rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-3.5 text-white">
                <div>
                  <div className="flex items-center gap-1 text-cyan-100/70"><Compass className="h-3.5 w-3.5" /><span className="text-[11px] uppercase tracking-[0.2em]">Nav</span></div>
                  <p className="mt-1.5 text-[15px] font-medium">Clear</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-cyan-100/70"><Target className="h-3.5 w-3.5" /><span className="text-[11px] uppercase tracking-[0.2em]">Goals</span></div>
                  <p className="mt-1.5 text-[15px] font-medium">Tracked</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-cyan-100/70"><Trophy className="h-3.5 w-3.5" /><span className="text-[11px] uppercase tracking-[0.2em]">Wins</span></div>
                  <p className="mt-1.5 text-[15px] font-medium">Visible</p>
                </div>
              </div>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="glass-panel flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-10 w-10 shrink-0 border border-white/10">
                    <AvatarFallback className="bg-white/10 text-xs font-medium text-white">{profileFallback}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-[15px] font-medium leading-none text-white">{profileName}</p>
                    <p className="mt-1.5 truncate text-sm text-slate-300/80">{profileEmail}</p>
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
          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-cyan-300/30 ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-transparent">
        {isMobile ? (
          <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/8 bg-slate-950/88 px-3 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-white/8 bg-white/6 text-slate-100" />
              <div>
                <p className="text-sm font-medium text-white">{activeMenuItem?.label ?? title}</p>
                <p className="text-xs text-slate-400">{subtitle}</p>
              </div>
            </div>
          </div>
        ) : null}
        <main className="flex-1 p-4 md:p-7 xl:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}

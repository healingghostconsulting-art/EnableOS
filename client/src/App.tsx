import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BarChart3, BookOpen, BookText, Building2, CalendarDays, Compass, LayoutDashboard, ShieldCheck, Users2 } from "lucide-react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout, { type DashboardMenuItem } from "./components/DashboardLayout";
import { ReminderBadgeProvider } from "./lib/reminderBadge";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";
import { ChcgAdminView, ContentLibraryView, GuideView, LandingView, MissionHubView, ReportingWorkspaceView, RoleWorkspace, TrainingExperienceView } from "./pages/EnableOSViews";
import { WorkspaceEntryView } from "./pages/WorkspaceEntryView";
import { AgentWorkspaceView } from "./pages/AgentWorkspaceView";
import { CalendarView } from "./pages/CalendarView";
import {
  WORKSPACE_ORDER,
  canGrantAccessWorkspace,
  normalizeGrantRole,
  permittedWorkspaces,
  resolveActiveWorkspaceRole,
  roleHomePath,
  type GrantRole,
  type WorkspacePath,
} from "../../shared/workspaceAccess";

export type WorkspaceGrantRole = GrantRole;

const ACTIVE_WORKSPACE_ROLE_KEY = "chcg-enableos-active-workspace-role";

// Ordered menu metadata (icon + label) for every workspace path.
const WORKSPACE_MENU_ITEMS: Record<WorkspacePath, DashboardMenuItem> = {
  "/mission-hub": { icon: LayoutDashboard, label: "Mission Hub", path: "/mission-hub" },
  "/guide": { icon: Compass, label: "EnableOS Guide", path: "/guide" },
  "/calendar": { icon: CalendarDays, label: "Calendar", path: "/calendar" },
  "/reporting": { icon: BarChart3, label: "Reporting Hub", path: "/reporting" },
  "/manager": { icon: ShieldCheck, label: "Manager Ops", path: "/manager" },
  "/coach": { icon: Users2, label: "Coach Studio", path: "/coach" },
  "/learner": { icon: BookOpen, label: "Learner Journey", path: "/learner" },
  "/training": { icon: BookOpen, label: "Training Zone", path: "/training" },
  "/library": { icon: BookText, label: "Training Library", path: "/library" },
  "/admin": { icon: Building2, label: "Client Control", path: "/admin" },
  "/chcg-admin": { icon: ShieldCheck, label: "CHCG Command", path: "/chcg-admin" },
};

/** The sidebar nav for a role — the matrix-permitted workspaces, in display order. */
export function buildWorkspaceMenu(role: GrantRole | null | undefined): DashboardMenuItem[] {
  return permittedWorkspaces(role).map((path) => WORKSPACE_MENU_ITEMS[path]);
}

// Per-role menu constants, all derived from the single WORKSPACE_ACCESS matrix.
export const baseWorkspaceMenu: DashboardMenuItem[] = WORKSPACE_ORDER.map((path) => WORKSPACE_MENU_ITEMS[path]);
export const adminWorkspaceMenu: DashboardMenuItem[] = buildWorkspaceMenu("platform_admin");
export const executiveWorkspaceMenu: DashboardMenuItem[] = buildWorkspaceMenu("executive");
export const managerWorkspaceMenu: DashboardMenuItem[] = buildWorkspaceMenu("manager");
export const coachWorkspaceMenu: DashboardMenuItem[] = buildWorkspaceMenu("coach");
export const learnerWorkspaceMenu: DashboardMenuItem[] = buildWorkspaceMenu("learner");

function getStoredActiveWorkspaceRole(): GrantRole | null {
  if (typeof window === "undefined") {
    return null;
  }
  return normalizeGrantRole(window.sessionStorage.getItem(ACTIVE_WORKSPACE_ROLE_KEY));
}

function setStoredActiveWorkspaceRole(role?: GrantRole | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!role) {
    window.sessionStorage.removeItem(ACTIVE_WORKSPACE_ROLE_KEY);
    return;
  }
  window.sessionStorage.setItem(ACTIVE_WORKSPACE_ROLE_KEY, role);
}

export function buildLegacyExecutiveRedirectPath(location: string) {
  const searchIndex = location.indexOf("?");
  const search = searchIndex >= 0 ? location.slice(searchIndex) : "";

  return `/reporting${search}`;
}

export function resolveRoleHomePath(grantRole?: string | null) {
  return roleHomePath(normalizeGrantRole(grantRole));
}

export function canAccessWorkspacePath(path: string, grantRole?: string | null) {
  return canGrantAccessWorkspace(normalizeGrantRole(grantRole), path);
}

/**
 * The sidebar nav for a workspace render: the matrix menu for the active role (clamped
 * to the grant). Dedicated role routes select their persona (so an admin on /coach sees
 * the coach nav); shared routes keep the selected role. The `?role=` query param is NOT
 * consulted.
 */
export function resolveWorkspaceMenu(options?: { grantRole?: string | null; workspacePath?: string | null; persisted?: string | null }) {
  const activeRole = resolveActiveWorkspaceRole({
    path: options?.workspacePath ?? "",
    grantRole: normalizeGrantRole(options?.grantRole),
    persisted: normalizeGrantRole(options?.persisted),
  });
  return buildWorkspaceMenu(activeRole);
}

function WorkspaceShell({ children, path, roleLabel }: { children: React.ReactNode; path: string; roleLabel: string }) {
  const access = trpc.demo.viewerAccess.useQuery(undefined, { retry: false });
  const grantRole = normalizeGrantRole(access.data?.grant.role);
  const activeRole = resolveActiveWorkspaceRole({ path, grantRole, persisted: getStoredActiveWorkspaceRole() });
  const menuItems = buildWorkspaceMenu(activeRole);

  useEffect(() => {
    // Only persist a resolved role; never let the brief access-loading phase (activeRole
    // null while viewerAccess is in flight) wipe the selected workspace role — that reset
    // the nav to the grant's full set on shared routes after a fresh page load.
    if (activeRole) setStoredActiveWorkspaceRole(activeRole);
  }, [activeRole]);

  return (
    <ReminderBadgeProvider>
      <DashboardLayout
        menuItems={menuItems}
        title="CHCG EnableOS"
        subtitle="Enterprise enablement and coaching intelligence"
        requireAuth
        demoProfile={{
          name: "CHCG Demo Workspace",
          roleLabel,
        }}
      >
        {children}
      </DashboardLayout>
    </ReminderBadgeProvider>
  );
}

function GuardedWorkspaceShell({ children, path, roleLabel }: { children: React.ReactNode; path: string; roleLabel: string }) {
  const access = trpc.demo.viewerAccess.useQuery(undefined, { retry: false });
  const [, setLocation] = useLocation();
  const grantRole = normalizeGrantRole(access.data?.grant.role);
  const canAccess = canGrantAccessWorkspace(grantRole, path);

  useEffect(() => {
    if (access.isSuccess && !canAccess) {
      setLocation(roleHomePath(grantRole));
    }
  }, [access.isSuccess, canAccess, grantRole, setLocation]);

  if (access.isSuccess && !canAccess) {
    return null;
  }

  return (
    <WorkspaceShell path={path} roleLabel={roleLabel}>
      {children}
    </WorkspaceShell>
  );
}

// v3 surfaces bring their own chrome (AppShell), so they use an access guard WITHOUT
// the v2 DashboardLayout wrapper — same redirect rules as GuardedWorkspaceShell.
function GuardedV3Route({ children, path }: { children: React.ReactNode; path: string }) {
  const access = trpc.demo.viewerAccess.useQuery(undefined, { retry: false });
  const [, setLocation] = useLocation();
  const grantRole = normalizeGrantRole(access.data?.grant.role);
  const canAccess = canGrantAccessWorkspace(grantRole, path);

  useEffect(() => {
    if (access.isSuccess && !canAccess) {
      setLocation(roleHomePath(grantRole));
    }
  }, [access.isSuccess, canAccess, grantRole, setLocation]);

  if (access.isSuccess && !canAccess) return null;
  return <>{children}</>;
}

function LegacyExecutiveRedirect() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    setLocation(buildLegacyExecutiveRedirectPath(location));
  }, [location, setLocation]);

  return null;
}

function Router() {
  const [location] = useLocation();

  return (
    <div key={location} className="route-fade-in">
      <Switch>
        {/* v3 front door (Pilot 1). Revert to v2 with a one-line swap back to LandingView. */}
        <Route path="/" component={WorkspaceEntryView} />
        <Route path="/mission-hub">
          {() => (
            <GuardedWorkspaceShell path="/mission-hub" roleLabel="Mission Hub">
              <MissionHubView />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/guide">
          {() => (
            <GuardedWorkspaceShell path="/guide" roleLabel="EnableOS Guide">
              <GuideView />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/calendar">
          {() => (
            <GuardedWorkspaceShell path="/calendar" roleLabel="Calendar">
              <CalendarView />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/executive" component={LegacyExecutiveRedirect} />
        <Route path="/reporting">
          {() => (
            <GuardedWorkspaceShell path="/reporting" roleLabel="Client Reporting Workspace">
              <ReportingWorkspaceView />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/manager">
          {() => (
            <GuardedWorkspaceShell path="/manager" roleLabel="Manager Workspace">
              <RoleWorkspace role="manager" />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/coach">
          {() => (
            <GuardedWorkspaceShell path="/coach" roleLabel="Coach / Supervisor Workspace">
              <RoleWorkspace role="coach" />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/learner">
          {() => (
            // v3 Agent Workspace (Pilot 2). Revert to v2 by swapping back to the
            // GuardedWorkspaceShell + <RoleWorkspace role="learner" /> block below.
            <GuardedV3Route path="/learner">
              <AgentWorkspaceView />
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/learner" roleLabel="Learner Journey"><RoleWorkspace role="learner" /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/admin">
          {() => (
            <GuardedWorkspaceShell path="/admin" roleLabel="Client Admin Console">
              <RoleWorkspace role="client_admin" />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/chcg-admin">
          {() => (
            <GuardedWorkspaceShell path="/chcg-admin" roleLabel="CHCG Admin Control Plane">
              <ChcgAdminView />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/training">
          {() => (
            <GuardedWorkspaceShell path="/training" roleLabel="Interactive Training">
              <TrainingExperienceView />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/library">
          {() => (
            <GuardedWorkspaceShell path="/library" roleLabel="Training Library">
              <ContentLibraryView />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

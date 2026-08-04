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
import { StatusLabelsProvider } from "./contexts/StatusLabelsContext";
import { GrayscaleProvider } from "./contexts/GrayscaleContext";
import { trpc } from "./lib/trpc";
import { ChcgAdminView, ContentLibraryView, GuideView, LandingView, MissionHubView, ReportingWorkspaceView, RoleWorkspace, TrainingExperienceView } from "./pages/EnableOSViews";
import { WorkspaceEntryView } from "./pages/WorkspaceEntryView";
import { AgentWorkspaceView } from "./pages/AgentWorkspaceView";
import { LearnerGoalsView } from "./pages/LearnerGoalsView";
import { CoachWorkspaceView } from "./pages/CoachWorkspaceView";
import { CoachTeamView } from "./pages/CoachTeamView";
import { ManagerWorkspaceView } from "./pages/ManagerWorkspaceView";
import { ClientAdminWorkspaceView } from "./pages/ClientAdminWorkspaceView";
import { V3ShellWrapper } from "./components/v3/V3ShellWrapper";
import { SettingsView } from "./pages/SettingsView";
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
            // v3 chrome wrap (consistency pass). Inner MissionHubView is unchanged.
            <GuardedV3Route path="/mission-hub">
              <V3ShellWrapper path="/mission-hub"><MissionHubView /></V3ShellWrapper>
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/mission-hub" roleLabel="Mission Hub"><MissionHubView /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/guide">
          {() => (
            // v3 chrome wrap (consistency pass). Inner GuideView is unchanged.
            <GuardedV3Route path="/guide">
              <V3ShellWrapper path="/guide"><GuideView /></V3ShellWrapper>
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/guide" roleLabel="EnableOS Guide"><GuideView /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/calendar">
          {() => (
            // v3 chrome wrap (consistency pass). Inner CalendarView is unchanged.
            <GuardedV3Route path="/calendar">
              <V3ShellWrapper path="/calendar"><CalendarView /></V3ShellWrapper>
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/calendar" roleLabel="Calendar"><CalendarView /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/executive" component={LegacyExecutiveRedirect} />
        <Route path="/reporting">
          {() => (
            // v3 chrome wrap (consistency pass). Inner ReportingWorkspaceView is unchanged.
            <GuardedV3Route path="/reporting">
              <V3ShellWrapper path="/reporting"><ReportingWorkspaceView /></V3ShellWrapper>
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/reporting" roleLabel="Client Reporting Workspace"><ReportingWorkspaceView /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/manager">
          {() => (
            // v3 Manager Workspace (Pilot 4). Revert to v2 by swapping back to the
            // GuardedWorkspaceShell + <RoleWorkspace role="manager" /> block below.
            <GuardedV3Route path="/manager">
              <ManagerWorkspaceView />
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/manager" roleLabel="Manager Workspace"><RoleWorkspace role="manager" /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/coach">
          {() => (
            // v3 Coach Workspace (Pilot 3). Revert to v2 by swapping back to the
            // GuardedWorkspaceShell + <RoleWorkspace role="coach" /> block below.
            <GuardedV3Route path="/coach">
              <CoachWorkspaceView />
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/coach" roleLabel="Coach / Supervisor Workspace"><RoleWorkspace role="coach" /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/coachees">
          {() => (
            // v3 Coach "My Team" — a sub-surface of the coach workspace on its own
            // AppShell. Gated exactly like /coach via WORKSPACE_SUBROUTE_PARENT.
            <GuardedV3Route path="/coachees">
              <CoachTeamView />
            </GuardedV3Route>
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
        <Route path="/goals">
          {() => (
            // v3 Learner Goals — a sub-surface of the learner workspace on its own
            // AppShell. Gated exactly like /learner via the sub-route→parent map in
            // shared/workspaceAccess.ts (WORKSPACE_SUBROUTE_PARENT).
            <GuardedV3Route path="/goals">
              <LearnerGoalsView />
            </GuardedV3Route>
          )}
        </Route>
        <Route path="/admin">
          {() => (
            // v3 Client Admin Workspace (Pilot 5). Revert to v2 by swapping back to the
            // GuardedWorkspaceShell + <RoleWorkspace role="client_admin" /> block below.
            <GuardedV3Route path="/admin">
              <ClientAdminWorkspaceView />
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/admin" roleLabel="Client Admin Console"><RoleWorkspace role="client_admin" /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/chcg-admin">
          {() => (
            // v3 chrome wrap (consistency pass). Inner ChcgAdminView is unchanged.
            <GuardedV3Route path="/chcg-admin">
              <V3ShellWrapper path="/chcg-admin"><ChcgAdminView /></V3ShellWrapper>
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/chcg-admin" roleLabel="CHCG Admin Control Plane"><ChcgAdminView /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/training">
          {() => (
            // v3 chrome wrap (consistency pass). Inner TrainingExperienceView (the
            // Claude Code-owned player) is unchanged.
            <GuardedV3Route path="/training">
              <V3ShellWrapper path="/training"><TrainingExperienceView /></V3ShellWrapper>
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/training" roleLabel="Interactive Training"><TrainingExperienceView /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/library">
          {() => (
            // v3 chrome wrap (consistency pass). Inner ContentLibraryView is unchanged.
            <GuardedV3Route path="/library">
              <V3ShellWrapper path="/library"><ContentLibraryView /></V3ShellWrapper>
            </GuardedV3Route>
            /* v2: <GuardedWorkspaceShell path="/library" roleLabel="Training Library"><ContentLibraryView /></GuardedWorkspaceShell> */
          )}
        </Route>
        <Route path="/settings">
          {() => (
            // Role-agnostic preferences page in the shipped v3 chrome. Gated like /guide
            // (WORKSPACE_SUBROUTE_PARENT) so any authenticated viewer can open it.
            <GuardedV3Route path="/settings">
              <V3ShellWrapper path="/settings"><SettingsView /></V3ShellWrapper>
            </GuardedV3Route>
          )}
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  // Re-apply the persisted display prefs on load so they survive a reload (grayscale has
  // its own provider; these two are lightweight root-class toggles).
  useEffect(() => {
    const root = document.documentElement;
    try {
      root.classList.toggle("app-legible", localStorage.getItem("enableos.settings.highLegibility") === "true");
      root.classList.toggle("app-reduce-motion", localStorage.getItem("enableos.settings.reduceMotion") === "true");
    } catch {
      // Storage unavailable — skip.
    }
  }, []);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <GrayscaleProvider>
          <StatusLabelsProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </StatusLabelsProvider>
        </GrayscaleProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

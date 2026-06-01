import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BarChart3, BookOpen, BookText, Building2, LayoutDashboard, ShieldCheck, Users2 } from "lucide-react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout, { type DashboardMenuItem } from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";
import { ChcgAdminView, ContentLibraryView, LandingView, MissionHubView, ReportingWorkspaceView, RoleWorkspace, TrainingExperienceView } from "./pages/EnableOSViews";

export type WorkspaceGrantRole = "platform_admin" | "client_admin" | "executive" | "manager" | "coach" | "learner";

const STATIC_WORKSPACE_ROLE_KEY = "chcg-enableos-static-workspace-role";

export const baseWorkspaceMenu: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Mission Hub", path: "/mission-hub" },
  { icon: BarChart3, label: "Reporting Hub", path: "/reporting" },
  { icon: ShieldCheck, label: "Manager Ops", path: "/manager" },
  { icon: Users2, label: "Coach Studio", path: "/coach" },
  { icon: BookOpen, label: "Learner Journey", path: "/learner" },
  { icon: BookOpen, label: "Training Zone", path: "/training" },
  { icon: Building2, label: "Client Control", path: "/admin" },
  { icon: BookText, label: "Content Missions", path: "/library" },
];

export const adminWorkspaceMenu: DashboardMenuItem[] = [
  ...baseWorkspaceMenu,
  { icon: ShieldCheck, label: "CHCG Command", path: "/chcg-admin" },
];

export const executiveWorkspaceMenu: DashboardMenuItem[] = baseWorkspaceMenu.filter((item) => (
  item.path === "/mission-hub"
  || item.path === "/reporting"
));

export const managerWorkspaceMenu: DashboardMenuItem[] = baseWorkspaceMenu.filter((item) => item.path !== "/reporting");

export const coachWorkspaceMenu: DashboardMenuItem[] = baseWorkspaceMenu.filter((item) => (
  item.path === "/coach"
  || item.path === "/learner"
  || item.path === "/training"
  || item.path === "/library"
));

export const learnerWorkspaceMenu: DashboardMenuItem[] = baseWorkspaceMenu.filter((item) => (
  item.path === "/learner"
  || item.path === "/training"
  || item.path === "/library"
));

export function buildRoleScopedPath(path: string, role?: string | null) {
  const normalizedRole = normalizeGrantRole(role);

  if (!normalizedRole || (path !== "/training" && path !== "/library" && path !== "/mission-hub")) {
    return path;
  }

  const params = new URLSearchParams();
  params.set("role", normalizedRole);
  return `${path}?${params.toString()}`;
}

export function scopeMenuItemsToRole(menuItems: DashboardMenuItem[], role?: string | null) {
  return menuItems.map((item) => ({
    ...item,
    path: buildRoleScopedPath(item.path, role),
  }));
}

function normalizeGrantRole(grantRole?: string | null): WorkspaceGrantRole | null {
  switch (grantRole) {
    case "platform_admin":
    case "client_admin":
    case "executive":
    case "manager":
    case "coach":
    case "learner":
      return grantRole;
    default:
      return null;
  }
}

function getStoredStaticWorkspaceRole() {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeGrantRole(window.sessionStorage.getItem(STATIC_WORKSPACE_ROLE_KEY));
}

function setStoredStaticWorkspaceRole(role?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedRole = normalizeGrantRole(role);

  if (!normalizedRole) {
    window.sessionStorage.removeItem(STATIC_WORKSPACE_ROLE_KEY);
    return;
  }

  window.sessionStorage.setItem(STATIC_WORKSPACE_ROLE_KEY, normalizedRole);
}

function resolveEffectiveWorkspaceRole(options?: { workspacePath?: string | null; sharedRouteRole?: string | null; grantRole?: string | null }) {
  const normalizedSharedRole = normalizeGrantRole(options?.sharedRouteRole);

  if (normalizedSharedRole) {
    return normalizedSharedRole;
  }

  switch (options?.workspacePath) {
    case "/reporting":
      return "executive";
    case "/manager":
      return "manager";
    case "/coach":
      return "coach";
    case "/learner":
      return "learner";
    case "/admin":
      return "client_admin";
    case "/chcg-admin":
      return "platform_admin";
    default:
      return getStoredStaticWorkspaceRole() ?? normalizeGrantRole(options?.grantRole);
  }
}

export function buildLegacyExecutiveRedirectPath(location: string) {
  const searchIndex = location.indexOf("?");
  const search = searchIndex >= 0 ? location.slice(searchIndex) : "";

  return `/reporting${search}`;
}

export function resolveRoleHomePath(grantRole?: string | null) {
  const normalizedRole = normalizeGrantRole(grantRole);

  switch (normalizedRole) {
    case "platform_admin":
      return "/chcg-admin";
    case "client_admin":
      return "/admin";
    case "executive":
      return "/reporting";
    case "manager":
      return "/manager";
    case "coach":
      return "/coach";
    case "learner":
      return "/learner";
    default:
      return "/";
  }
}

export function canAccessWorkspacePath(path: string, grantRole?: string | null) {
  const normalizedRole = normalizeGrantRole(grantRole);

  if (path === "/" || path === "/404") {
    return true;
  }

  if (!normalizedRole) {
    return false;
  }

  switch (path) {
    case "/reporting":
      return normalizedRole === "platform_admin" || normalizedRole === "client_admin" || normalizedRole === "executive";
    case "/manager":
      return normalizedRole !== "coach" && normalizedRole !== "learner";
    case "/coach":
      return normalizedRole !== "learner";
    case "/learner":
    case "/training":
    case "/library":
      return true;
    case "/admin":
      return normalizedRole === "platform_admin" || normalizedRole === "client_admin" || normalizedRole === "executive" || normalizedRole === "manager";
    case "/chcg-admin":
      return normalizedRole === "platform_admin";
    default:
      return true;
  }
}

function resolveStaticMenuRole(options?: { workspacePath?: string | null; sharedRouteRole?: string | null; grantRole?: string | null }) {
  return resolveEffectiveWorkspaceRole(options);
}

export function resolveWorkspaceMenu(options?: { menuItemsOverride?: DashboardMenuItem[]; grantRole?: string | null; workspacePath?: string | null; sharedRouteRole?: string | null }) {
  if (options?.menuItemsOverride) {
    return options.menuItemsOverride;
  }

  const effectiveRole = resolveEffectiveWorkspaceRole(options);
  const workspacePath = options?.workspacePath;

  if (workspacePath === "/reporting") {
    return executiveWorkspaceMenu;
  }

  if (workspacePath === "/manager") {
    return managerWorkspaceMenu;
  }

  if (workspacePath === "/coach") {
    return coachWorkspaceMenu;
  }

  if (workspacePath === "/learner") {
    return learnerWorkspaceMenu;
  }

  if (workspacePath === "/mission-hub" || workspacePath === "/training" || workspacePath === "/library") {
    switch (effectiveRole) {
      case "platform_admin":
        return adminWorkspaceMenu;
      case "client_admin":
        return baseWorkspaceMenu;
      case "executive":
        return executiveWorkspaceMenu;
      case "manager":
        return managerWorkspaceMenu;
      case "coach":
        return coachWorkspaceMenu;
      case "learner":
        return learnerWorkspaceMenu;
      default:
        break;
    }
  }

  switch (effectiveRole) {
    case "platform_admin":
      return adminWorkspaceMenu;
    case "client_admin":
      return baseWorkspaceMenu;
    case "manager":
      return managerWorkspaceMenu;
    case "coach":
      return coachWorkspaceMenu;
    case "learner":
      return learnerWorkspaceMenu;
    default:
      return baseWorkspaceMenu;
  }
}

function WorkspaceShell({ children, path, roleLabel, menuItemsOverride }: { children: React.ReactNode; path: string; roleLabel: string; menuItemsOverride?: DashboardMenuItem[] }) {
  const access = trpc.demo.viewerAccess.useQuery(undefined, { retry: false });
  const [location] = useLocation();
  const locationSearch = location.includes("?") ? location.slice(location.indexOf("?") + 1) : "";
  const sharedRouteRole = locationSearch ? new URLSearchParams(locationSearch).get("role") : null;
  const staticMenuRole = resolveStaticMenuRole({
    workspacePath: path,
    sharedRouteRole,
    grantRole: access.data?.grant.role,
  });
  const menuItems = scopeMenuItemsToRole(resolveWorkspaceMenu({
    menuItemsOverride,
    grantRole: access.data?.grant.role,
    workspacePath: path,
    sharedRouteRole,
  }), staticMenuRole);

  useEffect(() => {
    setStoredStaticWorkspaceRole(staticMenuRole);
  }, [staticMenuRole]);

  return (
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
  );
}

function GuardedWorkspaceShell({ children, path, roleLabel, menuItemsOverride }: { children: React.ReactNode; path: string; roleLabel: string; menuItemsOverride?: DashboardMenuItem[] }) {
  const access = trpc.demo.viewerAccess.useQuery(undefined, { retry: false });
  const [, setLocation] = useLocation();
  const grantRole = access.data?.grant.role ?? null;
  const canAccess = canAccessWorkspacePath(path, grantRole);

  useEffect(() => {
    if (access.isSuccess && !canAccess) {
      setLocation(resolveRoleHomePath(grantRole));
    }
  }, [access.isSuccess, canAccess, grantRole, setLocation]);

  if (access.isSuccess && !canAccess) {
    return null;
  }

  return (
    <WorkspaceShell path={path} roleLabel={roleLabel} menuItemsOverride={menuItemsOverride}>
      {children}
    </WorkspaceShell>
  );
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
        <Route path="/" component={LandingView} />
        <Route path="/mission-hub">
          {() => (
            <GuardedWorkspaceShell path="/mission-hub" roleLabel="Mission Hub">
              <MissionHubView />
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
            <GuardedWorkspaceShell path="/manager" roleLabel="Manager Workspace" menuItemsOverride={managerWorkspaceMenu}>
              <RoleWorkspace role="manager" />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/coach">
          {() => (
            <GuardedWorkspaceShell path="/coach" roleLabel="Coach / Supervisor Workspace" menuItemsOverride={coachWorkspaceMenu}>
              <RoleWorkspace role="coach" />
            </GuardedWorkspaceShell>
          )}
        </Route>
        <Route path="/learner">
          {() => (
            <GuardedWorkspaceShell path="/learner" roleLabel="Learner Journey" menuItemsOverride={learnerWorkspaceMenu}>
              <RoleWorkspace role="learner" />
            </GuardedWorkspaceShell>
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
            <GuardedWorkspaceShell path="/library" roleLabel="Content Library">
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

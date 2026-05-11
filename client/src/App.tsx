import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookOpen, BookText, Building2, Gauge, LayoutDashboard, ShieldCheck, Users2 } from "lucide-react";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout, { type DashboardMenuItem } from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";
import { ChcgAdminView, ContentLibraryView, LandingView, RoleWorkspace, TrainingExperienceView } from "./pages/EnableOSViews";

export type WorkspaceGrantRole = "platform_admin" | "client_admin" | "executive" | "manager" | "coach" | "learner";

export const baseWorkspaceMenu: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Mission Hub", path: "/" },
  { icon: Gauge, label: "Executive Command", path: "/executive" },
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

export const managerWorkspaceMenu: DashboardMenuItem[] = baseWorkspaceMenu.filter((item) => item.path !== "/executive");

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

export function resolveRoleHomePath(grantRole?: string | null) {
  const normalizedRole = normalizeGrantRole(grantRole);

  switch (normalizedRole) {
    case "platform_admin":
      return "/chcg-admin";
    case "client_admin":
      return "/admin";
    case "executive":
      return "/executive";
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
    case "/executive":
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

export function resolveWorkspaceMenu(options?: { menuItemsOverride?: DashboardMenuItem[]; grantRole?: string | null }) {
  if (options?.menuItemsOverride) {
    return options.menuItemsOverride;
  }

  const normalizedRole = normalizeGrantRole(options?.grantRole);

  switch (normalizedRole) {
    case "platform_admin":
      return adminWorkspaceMenu;
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

function WorkspaceShell({ children, roleLabel, menuItemsOverride }: { children: React.ReactNode; roleLabel: string; menuItemsOverride?: DashboardMenuItem[] }) {
  const access = trpc.demo.viewerAccess.useQuery(undefined, { retry: false });
  const menuItems = resolveWorkspaceMenu({
    menuItemsOverride,
    grantRole: access.data?.grant.role,
  });

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

function GuardedWorkspaceShell({ children, path, roleLabel }: { children: React.ReactNode; path: string; roleLabel: string }) {
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
    <WorkspaceShell roleLabel={roleLabel}>
      {children}
    </WorkspaceShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingView} />
      <Route path="/executive">
        {() => (
          <GuardedWorkspaceShell path="/executive" roleLabel="Executive View">
            <RoleWorkspace role="executive" />
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
          <GuardedWorkspaceShell path="/learner" roleLabel="Learner Journey">
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

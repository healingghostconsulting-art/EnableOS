import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookOpen, BookText, Building2, Gauge, LayoutDashboard, ShieldCheck } from "lucide-react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout, { type DashboardMenuItem } from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ContentLibraryView, LandingView, RoleWorkspace } from "./pages/EnableOSViews";

const workspaceMenu: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: Gauge, label: "Executive", path: "/executive" },
  { icon: ShieldCheck, label: "Manager", path: "/manager" },
  { icon: BookOpen, label: "Learner", path: "/learner" },
  { icon: Building2, label: "Client Admin", path: "/admin" },
  { icon: BookText, label: "Content Library", path: "/library" },
];

function WorkspaceShell({ children, roleLabel }: { children: React.ReactNode; roleLabel: string }) {
  return (
    <DashboardLayout
      menuItems={workspaceMenu}
      title="CHCG EnableOS"
      subtitle="Enterprise enablement and coaching intelligence"
      demoProfile={{
        name: "CHCG Demo Workspace",
        roleLabel,
      }}
    >
      {children}
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingView} />
      <Route path="/executive">
        {() => (
          <WorkspaceShell roleLabel="Executive View">
            <RoleWorkspace role="executive" />
          </WorkspaceShell>
        )}
      </Route>
      <Route path="/manager">
        {() => (
          <WorkspaceShell roleLabel="Manager Workspace">
            <RoleWorkspace role="manager" />
          </WorkspaceShell>
        )}
      </Route>
      <Route path="/learner">
        {() => (
          <WorkspaceShell roleLabel="Learner Journey">
            <RoleWorkspace role="learner" />
          </WorkspaceShell>
        )}
      </Route>
      <Route path="/admin">
        {() => (
          <WorkspaceShell roleLabel="Client Admin Console">
            <RoleWorkspace role="client_admin" />
          </WorkspaceShell>
        )}
      </Route>
      <Route path="/library">
        {() => (
          <WorkspaceShell roleLabel="Content Library">
            <ContentLibraryView />
          </WorkspaceShell>
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
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

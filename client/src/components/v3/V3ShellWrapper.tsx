import { type ReactNode } from "react";
import { BarChart3, BookOpen, BookText, Building2, CalendarDays, Compass, LayoutDashboard, ShieldCheck, Users2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { permittedWorkspaces, normalizeGrantRole, type GrantRole, type WorkspacePath } from "@shared/workspaceAccess";
import { ReminderBadgeProvider } from "@/lib/reminderBadge";
import { AppShell } from "./AppShell";
import { greetingFor } from "./TopBar";
import type { NavItem } from "./SidebarNav";

// v3 consistency wrap — renders an EXISTING page body inside the v3 AppShell chrome
// (dark SidebarNav + TopBar), replacing only the old v2 DashboardLayout/WorkspaceShell
// outer chrome. The inner components are untouched. Nav is the viewer's matrix-permitted
// workspaces (the same WORKSPACE_ACCESS source the v2 sidebar used).

const V3_NAV: Record<WorkspacePath, { label: string; icon: NavItem["icon"] }> = {
  "/mission-hub": { label: "Mission Hub", icon: LayoutDashboard },
  "/guide": { label: "EnableOS Guide", icon: Compass },
  "/calendar": { label: "Calendar", icon: CalendarDays },
  "/reporting": { label: "Reporting Hub", icon: BarChart3 },
  "/manager": { label: "Manager Ops", icon: ShieldCheck },
  "/coach": { label: "Coach Studio", icon: Users2 },
  "/learner": { label: "Agent Journey", icon: BookOpen },
  "/training": { label: "Training Zone", icon: BookOpen },
  "/library": { label: "Training Library", icon: BookText },
  "/admin": { label: "Client Control", icon: Building2 },
  "/chcg-admin": { label: "CHCG Command", icon: ShieldCheck },
};

const ROLE_TITLE: Record<string, string> = {
  executive: "Executive",
  manager: "Operations Manager",
  coach: "Coach / Supervisor",
  learner: "Team Member",
  client_admin: "Client Administrator",
  platform_admin: "Platform Admin",
};

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const firstNameOf = (name: string) => name.split(/\s+/)[0] ?? name;

export function V3ShellWrapper({ path, children }: { path: string; children: ReactNode }) {
  const access = trpc.demo.viewerAccess.useQuery();
  // Widest default (platform_admin) when unauthenticated so the demo shows a full nav.
  const role: GrantRole = normalizeGrantRole(access.data?.grant.role) ?? "platform_admin";
  const nav: NavItem[] = permittedWorkspaces(role).map((workspace) => ({
    label: V3_NAV[workspace].label,
    icon: V3_NAV[workspace].icon,
    href: workspace,
    active: workspace === path,
  }));

  const grantName = access.data?.grant.name ?? null;
  // Resolve a real display name like the role views do (they fall back to a role-appropriate
  // name, never the bare "there"). Mission Hub is wrapped here rather than rendering its own
  // AppShell, so without this it showed "Good afternoon, there!" while every other route
  // resolved a name. Fall back to the role title (e.g. platform_admin → "Platform Admin" →
  // "Platform") so the greeting matches the rest of the app even before the grant name loads.
  const name = grantName ?? ROLE_TITLE[role] ?? "there";
  const initials = grantName ? initialsOf(grantName) : "EO";
  const avatar = <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initials}</span>;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <AppShell
      nav={nav}
      user={{ name: grantName ?? "EnableOS", roleTitle: ROLE_TITLE[role] ?? "EnableOS", initials }}
      greeting={greetingFor(new Date().getHours())}
      greetingName={firstNameOf(name)}
      subtitleTail="productive session"
      notificationCount={0}
      dateLabel={dateLabel}
      avatar={avatar}
    >
      <ReminderBadgeProvider>{children}</ReminderBadgeProvider>
    </AppShell>
  );
}

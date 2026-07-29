import { type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight, BarChart3, BookOpen, Building2, CalendarDays, ChevronRight, Download,
  FileText, HelpCircle, LayoutDashboard, Palette, ShieldCheck, UserPlus, Users2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { permittedWorkspaces, type GrantRole } from "@shared/workspaceAccess";
import { AppShell, DashboardGrid } from "@/components/v3/AppShell";
import { WidgetCard } from "@/components/v3/WidgetCard";
import { Donut } from "@/components/v3/Donut";
import { greetingFor } from "@/components/v3/TopBar";
import type { NavItem } from "@/components/v3/SidebarNav";

// v3 Client Admin Workspace (Pilot 5) — Client Control on the shared AppShell. Reuses
// the v3 kit (nothing rebuilt). Wired to the admin's org/config tRPC data (secureAdmin,
// with the public demo.admin canonical payload as a fallback so it populates
// unauthenticated). Admins see org + configuration data — not agent performance.

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const firstNameOf = (name: string) => name.split(/\s+/)[0] ?? name;
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

const NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin", active: true },
  { label: "Users", icon: Users2, href: "/admin" },
  { label: "Roles & Access", icon: ShieldCheck, href: "/admin" },
  { label: "Branding", icon: Palette, href: "/admin" },
  { label: "Reports", icon: BarChart3, href: "/reporting" },
  { label: "Calendar", icon: CalendarDays, href: "/calendar" },
  { label: "Knowledge Base", icon: BookOpen, href: "/library" },
  { label: "Help & Support", icon: HelpCircle, href: "/guide" },
];

const ROLES: Array<{ role: GrantRole; label: string }> = [
  { role: "executive", label: "Executive" },
  { role: "manager", label: "Manager" },
  { role: "coach", label: "Coach" },
  { role: "learner", label: "Learner" },
  { role: "client_admin", label: "Client Admin" },
];
const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.role, r.label]));

function ViewLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7A5200] hover:underline">
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export function ClientAdminWorkspaceView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const demoMode = trpc.demo.config.useQuery().data?.demoMode ?? false;
  const secureAdmin = trpc.demo.secureAdmin.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
  // Public canonical fallback ONLY in demo mode; in production the mirror 404s and the
  // authenticated secure* query is the only path to tenant data.
  const publicAdmin = trpc.demo.admin.useQuery({}, { enabled: demoMode });

  const data: any = secureAdmin.data ?? (demoMode ? publicAdmin.data : undefined);
  const isLoading = !data && (secureAdmin.isLoading || (demoMode && publicAdmin.isLoading));

  const adminName: string = data?.admin?.name ?? "Admin";
  const roleTitle: string = data?.admin?.title ?? "Client Administrator";
  const initials = initialsOf(adminName === "Admin" ? "AD" : adminName);
  const avatar = <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initials}</span>;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const greeting = greetingFor(new Date().getHours());

  const tenantUsers: any[] = data?.tenantUsers ?? [];
  const totalUsers = tenantUsers.length;
  const roleCount = (role: string) => tenantUsers.filter((u) => u.role === role).length;
  const customRoles: any[] = data?.customRoles ?? [];
  const configuration: any[] = data?.configuration ?? [];
  const branding: any = data?.branding ?? {};
  const docs: any[] = data?.documentationEntries ?? [];
  const notifications: any[] = data?.notifications ?? [];

  const quickActions = [
    { label: "Add User", icon: UserPlus, href: "/admin" },
    { label: "Manage Roles", icon: ShieldCheck, href: "/admin" },
    { label: "Brand Settings", icon: Palette, href: "/admin" },
    { label: "Export", icon: Download, href: "/reporting" },
  ];

  return (
    <AppShell
      nav={NAV}
      user={{ name: adminName, roleTitle, initials }}
      greeting={greeting}
      greetingName={firstNameOf(adminName)}
      subtitleTail="well-run workspace"
      notificationCount={Math.min(notifications.length, 9)}
      dateLabel={dateLabel}
      avatar={avatar}
    >
      {isLoading ? (
        <p className="text-sm text-[#4A6373]">Loading your workspace…</p>
      ) : (
        <div className="space-y-5">
          <DashboardGrid>
            {/* Org Overview */}
            <WidgetCard title="Org Overview" action={<ViewLink href="/admin">Manage Users</ViewLink>} className="xl:col-span-2">
              <div className="flex flex-wrap items-center gap-6">
                <Donut value={100} size={116} stroke={11} color="#1B303C" ariaLabel={`${totalUsers} active users`}>
                  <span className="text-[1.6rem] font-bold leading-none text-[#1B303C]">{totalUsers}</span>
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#4A6373]">Users</span>
                </Donut>
                <ul className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
                  {ROLES.map((r) => (
                    <li key={r.role} className="flex items-center justify-between gap-2">
                      <span className="text-[#4A6373]">{r.label}</span>
                      <span className="font-semibold text-[#1B303C]">{roleCount(r.role)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-[#4A6373]">Custom roles</span>
                    <span className="font-semibold text-[#1B303C]">{customRoles.length}</span>
                  </li>
                </ul>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Active Seats", value: totalUsers, icon: Users2 },
                  { label: "Custom Roles", value: customRoles.length, icon: ShieldCheck },
                  { label: "Audit Events", value: docs.length, icon: FileText },
                ].map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <div key={tile.label} className="flex items-center gap-3 rounded-xl border border-[#1B303C]/8 bg-[#FBFCFD] px-4 py-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-white" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                      <div><p className="text-[1.3rem] font-bold leading-none text-[#1B303C]">{tile.value}</p><p className="text-[12px] text-[#4A6373]">{tile.label}</p></div>
                    </div>
                  );
                })}
              </div>
            </WidgetCard>

            {/* Brand & Settings */}
            <WidgetCard title="Brand & Settings" action={<ViewLink href="/admin">Edit</ViewLink>}>
              <div className="flex items-center gap-3 rounded-xl border border-[#1B303C]/8 bg-[#FBFCFD] p-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white" style={{ backgroundColor: branding.accent ?? "#1B303C" }} aria-hidden="true">{branding.logoMark ?? "EO"}</span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#1B303C]">{branding.preferredLabel ?? "Workspace"}</p>
                  <p className="text-[12px] text-[#4A6373]">Accent {branding.accent ?? "—"}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-[12.5px]">
                {configuration.slice(0, 4).map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-2">
                    <span className="text-[#4A6373]">{item.label}</span>
                    <span className="font-semibold text-[#1B303C]">{item.value}</span>
                  </li>
                ))}
              </ul>
            </WidgetCard>

            {/* Workspace Access — from the real access matrix */}
            <WidgetCard title="Workspace Access" action={<ViewLink href="/admin">Configure</ViewLink>}>
              <p className="mb-3 text-[12px] text-[#4A6373]">Role-scoped views are strictly enforced. Each role enters only its permitted workspaces.</p>
              <ul className="space-y-2 text-[13px]">
                {ROLES.map((r) => (
                  <li key={r.role} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-[#1B303C]"><ShieldCheck className="h-4 w-4 text-[#7A5200]" aria-hidden="true" />{r.label}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#4A6373]">{permittedWorkspaces(r.role).length} workspaces</span>
                  </li>
                ))}
              </ul>
            </WidgetCard>

            {/* User Management */}
            <WidgetCard title="User Management" action={<ViewLink href="/admin">View All</ViewLink>}>
              {tenantUsers.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No users yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {tenantUsers.slice(0, 5).map((u) => (
                    <li key={u.id} className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initialsOf(u.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#1B303C]">{u.name}</span>
                        <span className="block truncate text-[12px] text-[#4A6373]">{u.title ?? "Team Member"}</span>
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-[#4A6373]">{ROLE_LABEL[u.role] ?? String(u.role).replace("_", " ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>

            {/* Recent Admin Activity / audit */}
            <WidgetCard title="Recent Admin Activity" action={<ViewLink href="/admin">View Audit</ViewLink>}>
              {docs.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No recent activity.</p>
              ) : (
                <ul className="space-y-3.5">
                  {docs.slice(0, 3).map((doc) => (
                    <li key={doc.id} className="flex gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-white" aria-hidden="true"><FileText className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1B303C]">{doc.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-[#4A6373]">{doc.summary}</p>
                        <p className="mt-1 text-[11px] text-[#4A6373]/80">{fmtDay(doc.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>

            {/* Quick Actions */}
            <section className="rounded-2xl border border-[#1B303C]/8 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] xl:col-span-3">
              <div>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#1B303C]">Quick Actions</h2>
                <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} href={action.href} className="flex items-center justify-between gap-2 rounded-xl border border-[#1B303C]/10 bg-[#FBFCFD] px-3.5 py-3 text-[13px] font-semibold text-[#1B303C] transition-colors hover:border-[#7A5200]/25 hover:bg-amber-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 motion-reduce:transition-none">
                      <span className="inline-flex items-center gap-2.5"><Icon className="h-[18px] w-[18px] text-[#7A5200]" aria-hidden="true" />{action.label}</span>
                      <ChevronRight className="h-4 w-4 text-[#4A6373]" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </section>
          </DashboardGrid>

          <p className="flex items-center justify-center gap-2 py-2 text-center text-[13px] text-[#4A6373]">
            <Building2 className="h-4 w-4 text-[#7A5200]" aria-hidden="true" />
            A well-governed workspace keeps every team moving. <span className="font-semibold text-[#1B303C]">Thanks for running yours.</span>
          </p>
        </div>
      )}
    </AppShell>
  );
}

import { useEffect } from "react";
import { useLocation } from "wouter";
import { BookOpen, Building2, ClipboardCheck, GraduationCap, LineChart, ShieldCheck, UserRound, Users2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import type { DemoRole } from "../../../server/demoPlatform";
import { TopBarLight } from "@/components/v3/TopBarLight";
import { InfoPanel } from "@/components/v3/InfoPanel";
import { InfoIcon } from "@/components/v3/InfoIcon";
import { InfoTile } from "@/components/v3/InfoTile";
import { RoleCard, type RoleTagTint } from "@/components/v3/RoleCard";
import { PageFooter } from "@/components/v3/PageFooter";

// v3 Workspace Entry (Pilot 1) — the front door. Replaces the v2 LandingView at "/".
// Light card layout from the approved Claude Design template, wired to real counts
// (demo.entrySummary) and the same role routes the v2 entry used.

const ROLE_HOME: Record<string, string> = {
  platform_admin: "/chcg-admin",
  client_admin: "/admin",
  executive: "/reporting",
  manager: "/manager",
  coach: "/coach",
  learner: "/learner",
};

const ROLES: Array<{ role: DemoRole; route: string; tag: string; tagTint: RoleTagTint; title: string; description: string; icon: typeof Users2 }> = [
  { role: "executive", route: "/reporting", tag: "Executive", tagTint: "executive", title: "Executive Workspace", description: "Review organization-wide reporting, KPIs, and leadership intelligence across your teams.", icon: LineChart },
  { role: "manager", route: "/manager", tag: "Manager", tagTint: "manager", title: "Manager Workspace", description: "Oversee your team, track performance, manage coaching, and monitor training progress.", icon: Users2 },
  { role: "coach", route: "/coach", tag: "Coach / Supervisor", tagTint: "coach", title: "Coach Workspace", description: "Run coaching sessions, review performance, and support your team's development.", icon: UserRound },
  { role: "learner", route: "/learner", tag: "Learner", tagTint: "learner", title: "Learner Workspace", description: "Access your training, track your progress, and complete assignments and goals.", icon: BookOpen },
  { role: "client_admin", route: "/admin", tag: "Client Admin", tagTint: "client_admin", title: "Client Admin Workspace", description: "Manage users, roles, settings, and organization-level configurations.", icon: Building2 },
];

export function WorkspaceEntryView() {
  const [, setLocation] = useLocation();
  // Honor the Settings "landing page" preference: if the viewer chose a specific
  // workspace, send them there instead of the picker. Default "/" is a no-op.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("enableos.settings.landingPage");
      const dest = raw ? (JSON.parse(raw) as string) : "/";
      if (dest && dest !== "/" && dest.startsWith("/")) setLocation(dest);
    } catch {
      // Storage unavailable — stay on the picker.
    }
    // Once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const viewer = trpc.auth.me.useQuery();
  const demoModeQuery = trpc.demo.config.useQuery();
  const viewerAccess = trpc.demo.viewerAccess.useQuery(undefined, { enabled: Boolean(viewer.data) });
  const summary = trpc.demo.entrySummary.useQuery(viewerAccess.data?.tenant.id ? { tenantId: viewerAccess.data.tenant.id } : {});
  const stats = summary.data ?? { teamMembers: 0, coachingDue: 0, trainingCompletion: 0 };

  const homeHref = ROLE_HOME[viewerAccess.data?.grant.role ?? "learner"] ?? "/learner";

  const selectRole = (role: DemoRole, route: string) => {
    if (viewer.data) {
      const permitted = viewerAccess.data ? viewerAccess.data.permittedRoles.includes(role) : false;
      window.location.href = permitted ? route : homeHref;
      return;
    }
    // TEMPORARY: with no auth server, enter a role-scoped DEMO session via the server-gated
    // /api/demo/enter route (404s when DEMO_MODE is off). When real auth is wired
    // (DEMO_MODE=false) this reverts to the OAuth login URL.
    if (demoModeQuery.data?.demoMode !== false) {
      window.location.href = `/api/demo/enter?role=${encodeURIComponent(role)}`;
      return;
    }
    window.location.href = getLoginUrl(route);
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-[70rem] rounded-[2rem] border border-[#1B303C]/8 bg-white/95 px-5 py-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8 lg:px-10">
        <TopBarLight />

        {/* Hero + entry status */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.85fr)] lg:items-start">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A5200]">Welcome</p>
            <h1 className="max-w-[11ch] text-[2.4rem] font-bold leading-[1.05] tracking-tight text-[#1B303C] sm:text-[2.9rem]">Choose your workspace.</h1>
            <p className="max-w-[42ch] text-[15px] leading-7 text-[#4A6373]">Select the workspace that matches your role and access the tools and information assigned to you.</p>
          </div>

          <InfoPanel title="Entry status" infoLabel="This is a demo with seeded sample data — not a signed-in account.">
            <p className="text-sm font-semibold text-[#1B303C]">About this demo</p>
            <p className="mt-2 text-[13.5px] leading-6 text-[#4A6373]">
              Each card opens the workspace for that role, populated with seeded sample data. No account is created and nothing you do is saved.
            </p>
            <div className="mt-4 flex gap-2.5 rounded-xl border border-[#FCBC34]/35 bg-amber-50/70 px-3.5 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7A5200]" aria-hidden="true" />
              <p className="text-[13px] leading-6 text-[#4A6373]">Temporary demo access while a real sign-in provider is being set up.</p>
            </div>
          </InfoPanel>
        </div>

        {/* Info tiles — real counts */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InfoTile icon={<Users2 className="h-5 w-5" />} tint="navy" value={String(stats.teamMembers)} label="Team Members" />
          <InfoTile icon={<ClipboardCheck className="h-5 w-5" />} tint="cyan" value={String(stats.coachingDue)} label="Coaching Due" />
          <InfoTile icon={<GraduationCap className="h-5 w-5" />} tint="emerald" value={`${stats.trainingCompletion}%`} label="Training Completion" />
        </div>

        {/* Workspace selector */}
        <div className="mt-8">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A5200]">Select your workspace</h2>
            <InfoIcon label="Each card opens a demo of that workspace with seeded sample data. No sign-in, no account." />
          </div>
          <p className="mt-1 text-[13.5px] text-[#4A6373]">Each workspace is built for the tasks that matter most in your role.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((entry) => {
              const Icon = entry.icon;
              return (
                <RoleCard
                  key={entry.route}
                  icon={<Icon className="h-5 w-5" />}
                  tag={entry.tag}
                  tagTint={entry.tagTint}
                  title={entry.title}
                  description={entry.description}
                  actionLabel="Explore demo"
                  onSelect={() => selectRole(entry.role, entry.route)}
                />
              );
            })}
          </div>

          {/* CHCG-side (platform operator) entry. Deliberately NOT a peer RoleCard: the four
              cards above + Executive are client-tenant personas, whereas platform_admin is the
              CHCG control plane (tenant switching, CHCG Command). Kept as a discreet, clearly
              labelled link so it is reachable for internal demos without presenting the vendor's
              admin view as a client workspace. Demo-only — hidden once DEMO_MODE is off. */}
          {demoModeQuery.data?.demoMode !== false ? (
            <div className="mt-5 flex items-center gap-2 border-t border-[#1B303C]/8 pt-4">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#7A5200]" aria-hidden="true" />
              <button
                type="button"
                onClick={() => { window.location.href = "/api/demo/enter?role=platform_admin"; }}
                className="rounded text-[13px] font-semibold text-[#4A6373] underline-offset-4 transition-colors hover:text-[#1B303C] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40"
              >
                CHCG platform team → open the internal CHCG Command demo
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <PageFooter />
        </div>
      </div>
    </div>
  );
}

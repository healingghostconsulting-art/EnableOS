import { type ReactNode } from "react";
import { Link } from "wouter";
import {
  AlertTriangle, ArrowRight, BarChart3, BookOpen, CalendarClock, CalendarDays, CalendarPlus,
  ChevronRight, ClipboardCheck, FileText, GraduationCap, HelpCircle, Info, LayoutDashboard,
  Megaphone, Sparkles, Target, Trophy, Users2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AppShell } from "@/components/v3/AppShell";
import { DashboardGrid } from "@/components/v3/DashboardGrid";
import { WidgetCard } from "@/components/v3/WidgetCard";
import { Donut } from "@/components/v3/Donut";
import { greetingFor } from "@/components/v3/TopBar";
import type { NavItem } from "@/components/v3/SidebarNav";

// v3 Manager Workspace (Pilot 4) — the operational manager dashboard on the shared
// AppShell. Reuses the v3 kit from Pilots 1–3 (nothing rebuilt). Wired to the manager's
// team/operational tRPC data (secureManager, with the public demo.manager canonical
// payload as a fallback so it populates unauthenticated). Managers see the full team +
// operational KPIs — the broadest scope of any role.

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const firstNameOf = (name: string) => name.split(/\s+/)[0] ?? name;
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

const NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/manager", active: true },
  { label: "Team", icon: Users2, href: "/reporting" },
  { label: "Coaching", icon: CalendarClock, href: "/calendar" },
  { label: "Training", icon: GraduationCap, href: "/training" },
  { label: "Reports", icon: BarChart3, href: "/reporting" },
  { label: "Calendar", icon: CalendarDays, href: "/calendar" },
  { label: "Knowledge Base", icon: BookOpen, href: "/library" },
  { label: "Help & Support", icon: HelpCircle, href: "/guide" },
];

function ViewLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7A5200] hover:underline">
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

const SEVERITY: Record<string, { tint: string; icon: typeof AlertTriangle }> = {
  high: { tint: "bg-rose-100 text-rose-700", icon: AlertTriangle },
  medium: { tint: "bg-amber-100 text-[#7A5200]", icon: AlertTriangle },
  low: { tint: "bg-slate-100 text-slate-600", icon: Info },
};

export function ManagerWorkspaceView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  // Scoped when authenticated; the public canonical manager payload otherwise, so the
  // whole operational board populates even on an unauthenticated demo hit.
  const demoMode = trpc.demo.config.useQuery().data?.demoMode ?? false;
  const secureManager = trpc.demo.secureManager.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
  // Public canonical fallback ONLY in demo mode; in production the mirror 404s and the
  // authenticated secure* query is the only path to tenant data.
  const publicManager = trpc.demo.manager.useQuery({}, { enabled: demoMode });

  const data: any = secureManager.data ?? (demoMode ? publicManager.data : undefined);
  const isLoading = !data && (secureManager.isLoading || (demoMode && publicManager.isLoading));

  const managerName: string = data?.manager?.name ?? "Manager";
  const roleTitle: string = data?.manager?.title ?? "Operations Manager";
  const initials = initialsOf(managerName === "Manager" ? "MG" : managerName);
  const avatar = <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initials}</span>;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const greeting = greetingFor(new Date().getHours());

  // Team roster (all agents the manager oversees).
  const roster: any[] = data?.leaderboard?.orgRoster ?? [];
  const readi = (r: any) => r.readinessScore ?? 0;
  const total = roster.length;
  const onTrack = roster.filter((r) => readi(r) >= 75).length;
  const atRisk = roster.filter((r) => readi(r) >= 65 && readi(r) < 75).length;
  const needsAttention = roster.filter((r) => readi(r) < 65).length;
  const notStarted = Math.max(0, total - onTrack - atRisk - needsAttention);
  const trainCompleted = roster.filter((r) => readi(r) >= 80).length;
  const trainInProgress = roster.filter((r) => readi(r) >= 50 && readi(r) < 80).length;
  const trainNotStarted = roster.filter((r) => readi(r) < 50).length;
  const trainingReadiness = total ? Math.round((trainCompleted / total) * 100) : 0;

  const sessions: any[] = data?.coachingSessions ?? [];
  const dueCount = sessions.filter((s) => s.status === "follow_up_due").length;
  const scheduledCount = sessions.filter((s) => s.status === "scheduled").length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;

  const signals: any[] = data?.openSignals ?? [];
  const highSignals = signals.filter((s) => s.severity === "high").length;
  const assignments: any[] = (data?.retrainingAssignments ?? []).filter((a: any) => a.status !== "completed");
  const notifications: any[] = data?.notifications ?? [];
  const ai: any = data?.aiSuggestion ?? null;
  const learnerName = (id: string) => roster.find((r) => r.id === id)?.name ?? "an agent";

  const upcoming = sessions
    .filter((s) => s.status === "scheduled" || s.status === "follow_up_due")
    .map((s) => ({ start: s.dueDate as string, title: s.title ?? "Coaching session", who: learnerName(s.learnerUserId) }))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .slice(0, 4);

  const kpis = [
    { icon: Users2, gold: false, value: dueCount + scheduledCount, label: "Coaching Due", sub: `${dueCount} due now` },
    { icon: GraduationCap, gold: true, value: assignments.length, label: "Training Active", sub: `${assignments.length} in flight` },
    { icon: BarChart3, gold: false, value: highSignals, label: "Performance Alerts", sub: "Needs attention" },
    { icon: Target, gold: true, value: onTrack, label: "Agents On Track", sub: "Great progress!" },
  ];

  const recommended: Array<{ title: string; sub: string }> = [];
  if (ai?.recommendation) recommended.push({ title: ai.recommendation, sub: ai.summary ?? "Based on recent QA trends." });
  if (assignments.length) recommended.push({ title: `${assignments.length} agent${assignments.length === 1 ? " has" : "s have"} active retraining`, sub: "Confirm follow-through before the due dates." });
  if (needsAttention) recommended.push({ title: `${needsAttention} agent${needsAttention === 1 ? " needs" : "s need"} attention`, sub: "Readiness is below the coaching threshold." });

  const quickActions = [
    { label: "Start Coaching", icon: CalendarPlus, href: "/calendar" },
    { label: "Assign Training", icon: GraduationCap, href: "/training" },
    { label: "Create Goal", icon: Target, href: "/manager" },
    { label: "View Team", icon: Users2, href: "/reporting" },
    { label: "Run Report", icon: BarChart3, href: "/reporting" },
    { label: "Resources", icon: FileText, href: "/library" },
  ];

  return (
    <AppShell
      nav={NAV}
      user={{ name: managerName, roleTitle, initials }}
      greeting={greeting}
      greetingName={firstNameOf(managerName)}
      subtitleTail="operational day"
      notificationCount={Math.min(notifications.length + signals.length, 9)}
      dateLabel={dateLabel}
      avatar={avatar}
    >
      {isLoading ? (
        <p className="text-sm text-[#4A6373]">Loading your workspace…</p>
      ) : (
        <div className="space-y-5">
          <DashboardGrid>
            {/* Operational Snapshot */}
            <WidgetCard title="Operational Snapshot" action={<ViewLink href="/reporting">View Full Dashboard</ViewLink>} className="xl:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={kpi.label} className="rounded-xl border border-[#1B303C]/8 bg-[#FBFCFD] p-4">
                      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${kpi.gold ? "bg-[#FCBC34] text-[#1B303C]" : "bg-[#1B303C] text-white"}`} aria-hidden="true"><Icon className="h-5 w-5" /></span>
                      <p className="mt-3 text-[1.8rem] font-bold leading-none text-[#1B303C]">{kpi.value}</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#1B303C]">{kpi.label}</p>
                      <p className="mt-0.5 text-[12px] text-[#4A6373]">{kpi.sub}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-center text-[13px] font-semibold text-[#7A5200]">Focus where it matters most.</p>
            </WidgetCard>

            {/* Team Overview */}
            <WidgetCard title="Team Overview" action={<ViewLink href="/reporting">View Team</ViewLink>}>
              <Donut
                size={116}
                stroke={11}
                legend
                segments={[
                  { value: onTrack, color: "#16A34A", label: "On Track" },
                  { value: atRisk, color: "#F59E0B", label: "At Risk" },
                  { value: needsAttention, color: "#E11D48", label: "Needs Attention" },
                  { value: notStarted, color: "#CBD5E1", label: "Not Started" },
                ]}
                ariaLabel={`Team readiness of ${total} agents: ${onTrack} on track, ${atRisk} at risk, ${needsAttention} need attention, ${notStarted} not started`}
              >
                <span className="text-[1.6rem] font-bold leading-none text-[#1B303C]">{total}</span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#4A6373]">Agents</span>
              </Donut>
            </WidgetCard>

            {/* Operational Readiness (three sub-widgets) */}
            <WidgetCard title="Operational Readiness" action={<ViewLink href="/reporting">View All Insights</ViewLink>} className="xl:col-span-2">
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <div className="mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-[#7A5200]" aria-hidden="true" /><p className="text-[13px] font-semibold text-[#1B303C]">Training Readiness</p></div>
                  <div className="flex items-center gap-3">
                    <Donut value={trainingReadiness} size={84} stroke={9} color="#16A34A" ariaLabel={`Training readiness ${trainingReadiness}%`}>
                      <span className="text-[15px] font-bold text-[#1B303C]">{trainingReadiness}%</span>
                    </Donut>
                    <ul className="space-y-1 text-[12px] text-[#4A6373]">
                      <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Completed <span className="font-semibold text-[#1B303C]">{trainCompleted}</span></li>
                      <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" />In progress <span className="font-semibold text-[#1B303C]">{trainInProgress}</span></li>
                      <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300" />Not started <span className="font-semibold text-[#1B303C]">{trainNotStarted}</span></li>
                    </ul>
                  </div>
                  <div className="mt-2"><ViewLink href="/training">View Training</ViewLink></div>
                </div>
                <div className="md:border-l md:border-[#1B303C]/8 md:pl-5">
                  <div className="mb-3 flex items-center gap-2"><Users2 className="h-4 w-4 text-[#7A5200]" aria-hidden="true" /><p className="text-[13px] font-semibold text-[#1B303C]">Coaching Pipeline</p></div>
                  <ul className="space-y-1.5 text-[13px]">
                    <li className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[#4A6373]"><span className="h-2 w-2 rounded-full bg-amber-400" />Due this week</span><span className="font-semibold text-[#1B303C]">{dueCount}</span></li>
                    <li className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[#4A6373]"><span className="h-2 w-2 rounded-full bg-rose-500" />Overdue</span><span className="font-semibold text-[#1B303C]">{signals.filter((s) => s.severity === "high").length}</span></li>
                    <li className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[#4A6373]"><span className="h-2 w-2 rounded-full bg-cyan-500" />Scheduled</span><span className="font-semibold text-[#1B303C]">{scheduledCount}</span></li>
                    <li className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[#4A6373]"><span className="h-2 w-2 rounded-full bg-emerald-500" />Completed</span><span className="font-semibold text-[#1B303C]">{completedCount}</span></li>
                  </ul>
                  <div className="mt-2"><ViewLink href="/calendar">View Coaching</ViewLink></div>
                </div>
                <div className="md:border-l md:border-[#1B303C]/8 md:pl-5">
                  <div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-[#7A5200]" aria-hidden="true" /><p className="text-[13px] font-semibold text-[#1B303C]">Performance Focus</p></div>
                  <p className="text-[2rem] font-bold leading-none text-[#1B303C]">{highSignals}</p>
                  <p className="mt-1 text-[13px] font-semibold text-[#1B303C]">Performance Alerts</p>
                  <p className="mt-0.5 text-[12px] text-[#4A6373]">Needs attention</p>
                  <div className="mt-3"><ViewLink href="/reporting">View Performance</ViewLink></div>
                </div>
              </div>
            </WidgetCard>

            {/* Upcoming */}
            <WidgetCard title="Upcoming" action={<ViewLink href="/calendar">View Calendar</ViewLink>}>
              {upcoming.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">Nothing scheduled yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {upcoming.map((item, i) => {
                    const d = new Date(item.start);
                    const allDay = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
                    return (
                      <li key={i}>
                        <Link href="/calendar" className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-slate-50">
                          <span className="flex w-10 shrink-0 flex-col items-center rounded-md bg-[#F2F5F8] py-1 text-center">
                            <span className="text-[9px] font-semibold uppercase text-[#4A6373]">{d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}</span>
                            <span className="text-[15px] font-bold leading-none text-[#1B303C]">{d.getUTCDate()}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-[#1B303C]">{item.title}</span>
                            <span className="block text-[12px] text-[#4A6373]">{item.who} · {allDay ? fmtDay(item.start) : fmtTime(item.start)}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[#4A6373]" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </WidgetCard>

            {/* Team Activity */}
            <WidgetCard title="Team Activity" action={<ViewLink href="/reporting">View All</ViewLink>}>
              {notifications.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No recent activity.</p>
              ) : (
                <ul className="space-y-3.5">
                  {notifications.slice(0, 3).map((note) => (
                    <li key={note.id} className="flex gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-white" aria-hidden="true"><Megaphone className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#1B303C]">{note.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-[#4A6373]">{note.detail}</p>
                        <p className="mt-1 text-[11px] text-[#4A6373]/80">{fmtDay(note.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </WidgetCard>

            {/* Recommended Actions (AI) */}
            <WidgetCard
              title="Recommended Actions"
              action={<span className="inline-flex items-center gap-1 rounded-full bg-[#1B303C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"><Sparkles className="h-3 w-3" aria-hidden="true" /> AI Insight</span>}
            >
              {recommended.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No recommendations right now.</p>
              ) : (
                <ul className="space-y-3">
                  {recommended.slice(0, 3).map((rec, i) => (
                    <li key={i} className="flex items-start justify-between gap-3">
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[#7A5200]" aria-hidden="true"><ClipboardCheck className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1B303C]">{rec.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-[#4A6373]">{rec.sub}</p>
                        </div>
                      </div>
                      <Link href="/reporting" className="shrink-0 text-[12px] font-semibold text-[#7A5200] hover:underline">Review</Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-[#4A6373]/80">These insights are recommendations for you to review and act on.</p>
            </WidgetCard>

            {/* Alerts / At-risk */}
            <WidgetCard title="Alerts" action={<ViewLink href="/reporting">View All</ViewLink>}>
              {signals.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No active alerts.</p>
              ) : (
                <ul className="space-y-3">
                  {signals.slice(0, 3).map((sig) => {
                    const sev = SEVERITY[sig.severity] ?? SEVERITY.low;
                    const Icon = sev.icon;
                    return (
                      <li key={sig.id} className="flex gap-3">
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sev.tint}`} aria-hidden="true"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1B303C]">{sig.label} {sig.value} vs target {sig.target}</p>
                          <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-[#4A6373]">{sig.summary}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </WidgetCard>

            {/* Quick Actions */}
            <section className="rounded-2xl border border-[#1B303C]/8 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] xl:col-span-3">
              <div>
                <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#1B303C]">Quick Actions</h2>
                <span aria-hidden="true" className="mt-1.5 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            <Trophy className="h-4 w-4 text-[#7A5200]" aria-hidden="true" />
            Steady leadership builds strong teams. <span className="font-semibold text-[#1B303C]">Thank you for guiding yours.</span>
          </p>
        </div>
      )}
    </AppShell>
  );
}

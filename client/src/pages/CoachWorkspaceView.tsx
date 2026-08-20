import { type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight, BookOpen, CalendarClock, CalendarPlus, ChevronRight, ClipboardCheck, FileText,
  Gauge, HelpCircle, LayoutDashboard, Megaphone, Target, Trophy, Users2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AppShell } from "@/components/v3/AppShell";
import { DashboardGrid } from "@/components/v3/DashboardGrid";
import { WidgetCard } from "@/components/v3/WidgetCard";
import { Donut } from "@/components/v3/Donut";
import { greetingFor } from "@/components/v3/TopBar";
import type { NavItem } from "@/components/v3/SidebarNav";
import { StatusMark, type CanonicalStatus } from "@/components/v3/StatusMark";
import { ComingSoonAction } from "@/components/v3/ComingSoon";
import { useDeepLinkTarget } from "@/lib/useDeepLinkTarget";

// Reporting Hub deep-link (ExecutivePanel honors ?tab=/#section via useDeepLinkTarget).
const REPORT = { overview: "/reporting?tab=overview", readiness: "/reporting?tab=trends#executive-trends-panel" } as const;

// v3 Coach Workspace (Pilot 3) — Coach Studio on the persistent AppShell. Reuses the
// v3 kit from Pilots 1–2. Wired to the coach's own team-level tRPC data (secureCoach,
// with the public demo.coach canonical payload as a fallback so it populates on an
// unauthenticated demo hit — same pattern as AgentWorkspaceView). Coach sees TEAM
// coaching data (correct for this role, unlike the Agent's own-only view).

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const firstNameOf = (name: string) => name.split(/\s+/)[0] ?? name;
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

const NAV: NavItem[] = [
  { label: "My Dashboard", icon: LayoutDashboard, href: "/coach", active: true },
  { label: "My Team", icon: Users2, href: "/coachees" },
  { label: "Coaching Calendar", icon: CalendarClock, href: "/calendar" },
  { label: "Reports", icon: Gauge, href: REPORT.overview },
  { label: "Resources", icon: BookOpen, href: "/library" },
  { label: "Help & Support", icon: HelpCircle, href: "/guide" },
];

function ViewLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7A5200] hover:underline">
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

// Readiness → canonical StatusMark status (+ this surface's label wording).
function readinessStatus(score: number): { status: CanonicalStatus; label: string } {
  if (score >= 75) return { status: "positive", label: "On track" };
  if (score >= 65) return { status: "overdue", label: "Monitor" };
  return { status: "alert", label: "Needs attention" };
}

export function CoachWorkspaceView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  // Scoped data when authenticated; the public canonical coach payload otherwise, so
  // every tile populates even on an unauthenticated demo hit.
  const demoMode = trpc.demo.config.useQuery().data?.demoMode ?? false;
  const secureCoach = trpc.demo.secureCoach.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
  // Public canonical fallback ONLY in demo mode; in production the mirror 404s and the
  // authenticated secure* query is the only path to tenant data.
  const publicCoach = trpc.demo.coach.useQuery({}, { enabled: demoMode });

  const data: any = secureCoach.data ?? (demoMode ? publicCoach.data : undefined);
  const isLoading = !data && (secureCoach.isLoading || (demoMode && publicCoach.isLoading));

  const coachName: string = data?.coach?.name ?? "Coach";
  const roleTitle: string = data?.coach?.title ?? "Coach / Supervisor";
  const initials = initialsOf(coachName === "Coach" ? "CO" : coachName);
  const avatar = <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initials}</span>;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const greeting = greetingFor(new Date().getHours());

  // Receive in-page anchors (own nav "My Coachees", Calendar coaching deep-links).
  useDeepLinkTarget();

  const coachees: any[] = data?.teamLearners ?? [];
  const learnerName = (id: string) => coachees.find((l) => l.id === id)?.name ?? "A coachee";
  const sessions: any[] = data?.teamCoachingSessions ?? [];
  const notifications: any[] = data?.notifications ?? [];

  // Team coaching pipeline.
  const dueCount = sessions.filter((s) => s.status === "follow_up_due").length;
  const scheduledCount = sessions.filter((s) => s.status === "scheduled").length;
  const completedCount = sessions.filter((s) => s.status === "completed").length;

  // Team readiness (average across coachees) — a team-level metric, correct for coaches.
  const teamReadiness = coachees.length ? Math.round(coachees.reduce((sum, l) => sum + (l.readinessScore ?? 0), 0) / coachees.length) : 0;

  // Upcoming sessions from the coaching payload (live sessions, soonest first).
  const upcoming = sessions
    .filter((s) => s.status === "scheduled" || s.status === "follow_up_due")
    .map((s) => ({ start: s.dueDate as string, title: s.title ?? "Coaching session", who: learnerName(s.learnerUserId) }))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .slice(0, 4);

  const quickActions = [
    { label: "Schedule Session", icon: CalendarPlus, href: "/calendar?new=coaching" },
    { label: "Log a Session", icon: ClipboardCheck, href: "/calendar?new=coaching" },
    { label: "View Calendar", icon: CalendarClock, href: "/calendar" },
    { label: "Team Reports", icon: Gauge, href: REPORT.overview },
    { label: "Resources", icon: FileText, href: "/library" },
  ];

  return (
    <AppShell
      nav={NAV}
      user={{ name: coachName, roleTitle, initials }}
      greeting={greeting}
      greetingName={firstNameOf(coachName)}
      subtitleTail="great coaching day"
      notificationCount={Math.min(notifications.length, 9)}
      dateLabel={dateLabel}
      avatar={avatar}
      notificationsHref="/coach#coach-activity"
    >
      {isLoading ? (
        <p className="text-sm text-[#4A6373]">Loading your workspace…</p>
      ) : (
        <div className="space-y-5">
          <DashboardGrid>
            {/* Team Coaching Pipeline */}
            <WidgetCard title="Team Coaching Pipeline" id="coach-coaching-lane" action={<ViewLink href="/calendar">Open Calendar</ViewLink>} className="xl:col-span-2">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Sessions Due", value: dueCount, icon: ClipboardCheck, tint: "bg-rose-100 text-rose-700", sub: "Follow-ups awaiting you" },
                  { label: "Scheduled", value: scheduledCount, icon: CalendarClock, tint: "bg-cyan-100 text-cyan-800", sub: "On the calendar" },
                  { label: "Completed", value: completedCount, icon: Trophy, tint: "bg-emerald-100 text-emerald-700", sub: "Logged this cycle" },
                ].map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <div key={tile.label} className="rounded-xl border border-[#1B303C]/8 bg-[#FBFCFD] p-4">
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${tile.tint}`} aria-hidden="true"><Icon className="h-5 w-5" /></span>
                      <p className="mt-3 text-[1.7rem] font-bold leading-none text-[#1B303C]">{tile.value}</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#1B303C]">{tile.label}</p>
                      <p className="mt-0.5 text-[12px] text-[#4A6373]">{tile.sub}</p>
                    </div>
                  );
                })}
              </div>
            </WidgetCard>

            {/* Team Readiness */}
            <WidgetCard title="Team Readiness" action={<ViewLink href={REPORT.readiness}>View Details</ViewLink>}>
              <div className="flex items-center gap-4">
                <Donut value={teamReadiness} size={116} stroke={11} color="#1B303C" ariaLabel={`Team readiness ${teamReadiness} out of 100`}>
                  <span className="text-[1.6rem] font-bold leading-none text-[#1B303C]">{teamReadiness}</span>
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#4A6373]">Readiness</span>
                </Donut>
                <ul className="flex-1 space-y-2 text-[13px]">
                  <li className="flex items-center justify-between"><StatusMark status="neutral" label="Coachees" variant="dot" /><span className="font-semibold text-[#1B303C]">{coachees.length}</span></li>
                  <li className="flex items-center justify-between"><StatusMark status="positive" label="On track" variant="dot" /><span className="font-semibold text-[#1B303C]">{coachees.filter((l) => (l.readinessScore ?? 0) >= 75).length}</span></li>
                  <li className="flex items-center justify-between"><StatusMark status="overdue" label="Monitor" variant="dot" /><span className="font-semibold text-[#1B303C]">{coachees.filter((l) => { const s = l.readinessScore ?? 0; return s >= 65 && s < 75; }).length}</span></li>
                  <li className="flex items-center justify-between"><StatusMark status="alert" label="Need attention" variant="dot" /><span className="font-semibold text-[#1B303C]">{coachees.filter((l) => (l.readinessScore ?? 0) < 65).length}</span></li>
                  <li className="flex items-center justify-between"><StatusMark status="overdue" label="Sessions due" variant="dot" /><span className="font-semibold text-[#1B303C]">{dueCount}</span></li>
                </ul>
              </div>
              {/* Gated on team readiness: upbeat only at/above the 75 On-track band, else neutral. */}
              <p className={`mt-4 text-center text-[13px] font-semibold ${teamReadiness >= 75 ? "text-emerald-700" : "text-[#4A6373]"}`}>{teamReadiness >= 75 ? "Your team is trending in the right direction." : "A focused week of coaching will lift team readiness."}</p>
            </WidgetCard>

            {/* My Coachees */}
            <WidgetCard title="My Coachees" id="coach-coachees" action={<ViewLink href="/coachees">View All</ViewLink>}>
              {coachees.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No coachees assigned yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {coachees.map((l) => {
                    const status = readinessStatus(l.readinessScore ?? 0);
                    return (
                      <li key={l.id} className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initialsOf(l.name)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[#1B303C]">{l.name}</span>
                          <span className="block truncate text-[12px] text-[#4A6373]">{l.title ?? "Team Member"} · Readiness {l.readinessScore ?? 0}</span>
                        </span>
                        <StatusMark status={status.status} label={status.label} variant="pill" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </WidgetCard>

            {/* Upcoming Sessions */}
            <WidgetCard title="Upcoming Sessions" action={<ViewLink href="/calendar">View Calendar</ViewLink>}>
              {upcoming.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No sessions scheduled yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {upcoming.map((item, i) => {
                    const d = new Date(item.start);
                    const allDay = d.getUTCHours() === 0 && d.getUTCMinutes() === 0;
                    return (
                      <li key={i}>
                        <Link href={`/calendar?date=${String(item.start).slice(0, 10)}`} className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-slate-50">
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
              <div className="mt-3"><ViewLink href="/calendar">View Full Calendar</ViewLink></div>
            </WidgetCard>

            {/* Recent Activity / Alerts */}
            <WidgetCard title="Recent Activity" id="coach-activity" action={<ComingSoonAction>View All</ComingSoonAction>}>
              {notifications.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No recent activity.</p>
              ) : (
                <ul className="space-y-3.5">
                  {notifications.slice(0, 3).map((note) => {
                    const alert = note.priority === "critical" || note.priority === "warning";
                    const Icon = alert ? Target : Megaphone;
                    return (
                      <li key={note.id} className="flex gap-3">
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${alert ? "bg-rose-100 text-rose-700" : "bg-[#1B303C] text-white"}`} aria-hidden="true"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1B303C]">{note.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-[#4A6373]">{note.detail}</p>
                          <p className="mt-1 text-[11px] text-[#4A6373]/80">{fmtDay(note.createdAt)}</p>
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
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            <Users2 className="h-4 w-4 text-[#7A5200]" aria-hidden="true" />
            Great coaching changes careers. <span className="font-semibold text-[#1B303C]">Thank you for developing your team.</span>
          </p>
        </div>
      )}
    </AppShell>
  );
}

import { type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight, BookOpen, ChevronRight, CheckCircle2, GraduationCap,
  Heart, HelpCircle, LayoutDashboard, MessageSquare, Megaphone, Play, Target, Trophy, UserRound, Users2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AppShell } from "@/components/v3/AppShell";
import { DashboardGrid } from "@/components/v3/DashboardGrid";
import { WidgetCard } from "@/components/v3/WidgetCard";
import { Donut } from "@/components/v3/Donut";
import { greetingFor } from "@/components/v3/TopBar";
import type { NavItem } from "@/components/v3/SidebarNav";
import { useDeepLinkTarget } from "@/lib/useDeepLinkTarget";

// v3 Agent Workspace (Pilot 2) — the Agent/Learner dashboard on the persistent AppShell.
// Wired to the learner's own tRPC data only (never team KPIs). Supportive tone.

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const firstNameOf = (name: string) => name.split(/\s+/)[0] ?? name;
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

const NAV: NavItem[] = [
  { label: "My Dashboard", icon: LayoutDashboard, href: "/learner", active: true },
  { label: "My Training", icon: GraduationCap, href: "/training" },
  { label: "My Coaching", icon: UserRound, href: "/calendar" },
  // No dedicated goals surface exists yet; scroll to the actionable priorities
  // list (which carries goal/training/coaching items) instead of reloading top.
  { label: "My Goals", icon: Target, href: "/learner#learner-priorities" },
  { label: "Resources", icon: BookOpen, href: "/library" },
  { label: "Help & Support", icon: HelpCircle, href: "/guide" },
];

// CHCG palette only: navy for training (structural), cyan for coaching (the agreed
// coaching accent), gold for goals, emerald for modules (progress).
const PRIORITY_TINT: Record<string, string> = {
  training: "bg-[#1B303C]/8 text-[#1B303C]",
  coaching: "bg-cyan-100 text-cyan-800",
  goal: "bg-amber-100 text-[#7A5200]",
  module: "bg-emerald-100 text-emerald-700",
};
const DUE_TINT: Record<string, string> = {
  training: "bg-[#1B303C]/5 text-[#1B303C]",
  coaching: "bg-cyan-50 text-cyan-800",
  goal: "bg-amber-50 text-[#7A5200]",
  module: "bg-emerald-50 text-emerald-700",
};

function ViewLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7A5200] hover:underline">
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

// A widget action whose detail view doesn't exist in the demo yet. Rendered as a
// visibly non-interactive label (muted, cursor-default, no hover, no arrow) so it
// reads as a placeholder rather than a link that quietly reloads the same route.
function PlaceholderAction({ children }: { children: ReactNode }) {
  return (
    <span aria-disabled="true" title="Available in the full workspace" className="inline-flex cursor-default items-center gap-1 text-[12px] font-semibold text-[#4A6373]/60">
      {children}
    </span>
  );
}

export function AgentWorkspaceView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  // Authenticated viewers get their scoped dashboard; everyone else — including the
  // unauthenticated demo where viewerAccess is 401 and tenantId is undefined — falls
  // back to the tenant's canonical learner (the public demo.learner payload, the same
  // getLearnerDashboard the v2 learner view rendered). This keeps every donut/tile
  // populated instead of collapsing to 0.
  const demoMode = trpc.demo.config.useQuery().data?.demoMode ?? false;
  const secureLearner = trpc.demo.secureLearner.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
  // Public canonical fallback ONLY in demo mode; in production the mirror 404s and the
  // authenticated secure* query is the only path to tenant data.
  const publicLearner = trpc.demo.learner.useQuery({}, { enabled: demoMode });

  const data: any = secureLearner.data ?? (demoMode ? publicLearner.data : undefined);
  const isLoading = !data && (secureLearner.isLoading || (demoMode && publicLearner.isLoading));
  const learnerName: string = data?.learner?.name ?? "there";
  const roleTitle: string = data?.learner?.title ?? "Team Member";
  const initials = initialsOf(learnerName === "there" ? "EO" : learnerName);
  const avatar = <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initials}</span>;

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const greeting = greetingFor(new Date().getHours());

  // Receive in-page anchors (own nav "My Goals", any inbound #section deep-link).
  useDeepLinkTarget();

  const modules: any[] = data?.activeJourney?.modules ?? [];
  const total = modules.length;
  const completed = modules.filter((m) => m.completionRate >= 80).length;
  const inProgress = modules.filter((m) => m.completionRate > 0 && m.completionRate < 80).length;
  const notStarted = Math.max(0, total - completed - inProgress);
  const trainingCompletion: number = data?.activeJourney?.progress ?? 0;
  const qaScore: number = data?.learner?.readinessScore ?? 0;
  const firstPass: number = data?.learner?.quizFirstPassPct ?? 0;
  const nextModule = modules.find((m) => m.completionRate < 80) ?? modules[0] ?? null;

  const assignments: any[] = (data?.retrainingAssignments ?? []).filter((a: any) => a.status !== "completed");
  const nextCoaching = data?.nextCoachingSession ?? null;
  const notifications: any[] = data?.notifications ?? [];
  // Upcoming derives from the same learner payload (next coaching + training due
  // dates), so it populates with the rest of the dashboard rather than depending on
  // the protected calendar feed.
  const upcoming: Array<{ start: string; title: string }> = [
    ...(nextCoaching?.dueDate ? [{ start: nextCoaching.dueDate as string, title: nextCoaching.title ?? "Coaching session" }] : []),
    ...assignments.filter((a) => a.dueAt).map((a) => ({ start: a.dueAt as string, title: `${a.moduleTitle} due` })),
  ]
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .slice(0, 4);

  // My Priorities — real, actionable items (never team data).
  type Priority = { kind: keyof typeof PRIORITY_TINT; icon: typeof GraduationCap; title: string; subtitle: string; due?: string; dueTime?: boolean };
  const priorities: Priority[] = [];
  for (const a of assignments.slice(0, 2)) priorities.push({ kind: "training", icon: GraduationCap, title: "Complete Training", subtitle: a.moduleTitle, due: a.dueAt });
  if (nextCoaching) priorities.push({ kind: "coaching", icon: Users2, title: "Coaching Session", subtitle: nextCoaching.title, due: nextCoaching.dueDate, dueTime: true });
  if (nextModule) priorities.push({ kind: "module", icon: Target, title: "Continue Learning", subtitle: nextModule.title });
  const shownPriorities = priorities.slice(0, 4);

  // "Update Goal" has no goal-editor page in the demo yet, so it renders
  // non-interactive (see the render below) instead of self-routing to /learner.
  const quickActions: Array<{ label: string; icon: NavItem["icon"]; href: string; placeholder?: boolean }> = [
    { label: "Continue Training", icon: Play, href: "/training" },
    { label: "View Coaching Notes", icon: Users2, href: "/calendar" },
    { label: "Update Goal", icon: Target, href: "/learner", placeholder: true },
    { label: "Ask a Question", icon: MessageSquare, href: "/guide" },
    { label: "View Resources", icon: BookOpen, href: "/library" },
  ];

  return (
    <AppShell
      nav={NAV}
      user={{ name: learnerName, roleTitle, initials }}
      greeting={greeting}
      greetingName={firstNameOf(learnerName)}
      subtitleTail="great day"
      notificationCount={Math.min(notifications.length, 9)}
      dateLabel={dateLabel}
      avatar={avatar}
    >
      {isLoading ? (
        <p className="text-sm text-[#4A6373]">Loading your dashboard…</p>
      ) : (
        <div className="space-y-5">
          <DashboardGrid>
            {/* My Priorities */}
            <WidgetCard title="My Priorities" id="learner-priorities" action={<PlaceholderAction>View All Priorities</PlaceholderAction>} className="xl:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {shownPriorities.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <div key={i} className="flex flex-col rounded-xl border border-[#1B303C]/8 bg-[#FBFCFD] p-3.5">
                      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${PRIORITY_TINT[p.kind]}`} aria-hidden="true"><Icon className="h-5 w-5" /></span>
                      <p className="mt-3 text-[14px] font-semibold text-[#1B303C]">{p.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-[#4A6373]">{p.subtitle}</p>
                      <div className="mt-3 flex items-center justify-between">
                        {p.due ? (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${DUE_TINT[p.kind]}`}>
                            {p.dueTime ? `${fmtDay(p.due)}, ${fmtTime(p.due)}` : `Due ${fmtDay(p.due)}`}
                          </span>
                        ) : <span />}
                        <ChevronRight className="h-4 w-4 text-[#4A6373]" aria-hidden="true" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </WidgetCard>

            {/* My Performance Snapshot */}
            <WidgetCard title="My Performance Snapshot" action={<PlaceholderAction>View Details</PlaceholderAction>}>
              <div className="flex items-center gap-4">
                <Donut value={qaScore} size={116} stroke={11} color="#1B303C" ariaLabel={`QA score ${qaScore} out of 100`}>
                  <span className="text-[1.6rem] font-bold leading-none text-[#1B303C]">{qaScore}</span>
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#4A6373]">QA Score</span>
                </Donut>
                <ul className="flex-1 space-y-2 text-[13px]">
                  {[
                    { icon: CheckCircle2, label: "QA Score (30d)", value: `${qaScore}%` },
                    { icon: GraduationCap, label: "Training Completion", value: `${trainingCompletion}%` },
                    { icon: CheckCircle2, label: "Modules Complete", value: `${completed}/${total}` },
                    { icon: Target, label: "First-pass Checks", value: `${firstPass}%` },
                  ].map((row) => {
                    const RowIcon = row.icon;
                    return (
                      <li key={row.label} className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-[#4A6373]"><RowIcon className="h-4 w-4 text-[#7A5200]" aria-hidden="true" />{row.label}</span>
                        <span className="font-semibold text-[#1B303C]">{row.value}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="mt-4 text-center text-[13px] font-semibold text-emerald-700">Keep up the great work!</p>
            </WidgetCard>

            {/* My Progress */}
            <WidgetCard title="My Progress" action={<ViewLink href="/training">View All</ViewLink>}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="text-center">
                  <p className="mb-2 text-[13px] font-semibold text-[#1B303C]">Training Completion</p>
                  <Donut value={trainingCompletion} size={120} stroke={12} color="#16A34A" ariaLabel={`Training completion ${trainingCompletion}%`}>
                    <span className="text-[1.4rem] font-bold leading-none text-[#1B303C]">{trainingCompletion}%</span>
                    <span className="mt-0.5 text-[10px] text-[#4A6373]">Overall</span>
                  </Donut>
                  <ul className="mt-3 space-y-1 text-left text-[12px] text-[#4A6373]">
                    <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />Completed ({completed})</li>
                    <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-400" />In progress ({inProgress})</li>
                    <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300" />Not started ({notStarted})</li>
                  </ul>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-[#1B303C]/8 bg-[#FBFCFD] p-4 text-center">
                  <Target className="h-6 w-6 text-[#7A5200]" aria-hidden="true" />
                  <p className="mt-2 text-[1.5rem] font-bold text-[#1B303C]">{completed}/{total}</p>
                  <p className="text-[12px] font-semibold text-emerald-700">Modules complete</p>
                  <Link href="/training" className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-[#7A5200] hover:bg-amber-100">
                    View Learning Path <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
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
                        <Link href={`/calendar?date=${String(item.start).slice(0, 10)}`} className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-slate-50">
                          <span className="flex w-10 shrink-0 flex-col items-center rounded-md bg-[#F2F5F8] py-1 text-center">
                            <span className="text-[9px] font-semibold uppercase text-[#4A6373]">{d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}</span>
                            <span className="text-[15px] font-bold leading-none text-[#1B303C]">{d.getUTCDate()}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-[#1B303C]">{item.title}</span>
                            <span className="block text-[12px] text-[#4A6373]">{allDay ? "All day" : fmtTime(item.start)}</span>
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

            {/* Announcements */}
            <WidgetCard title="Announcements" action={<PlaceholderAction>View All</PlaceholderAction>}>
              {notifications.length === 0 ? (
                <p className="text-[13px] text-[#4A6373]">No announcements right now.</p>
              ) : (
                <ul className="space-y-3.5">
                  {notifications.slice(0, 2).map((note) => {
                    const celebratory = note.priority === "info" && /great|thank|exceed/i.test(`${note.title} ${note.detail}`);
                    const Icon = celebratory ? Trophy : Megaphone;
                    return (
                      <li key={note.id} className="flex gap-3">
                        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${celebratory ? "bg-amber-100 text-[#7A5200]" : "bg-[#1B303C] text-white"}`} aria-hidden="true"><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1B303C]">{note.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-5 text-[#4A6373]">{note.detail}</p>
                          <p className="mt-1 text-[11px] text-[#4A6373]/80">Posted {fmtDay(note.createdAt)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3"><PlaceholderAction>View All Announcements</PlaceholderAction></div>
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
                  if (action.placeholder) {
                    return (
                      <div key={action.label} aria-disabled="true" title="Available in the full workspace" className="flex cursor-default items-center justify-between gap-2 rounded-xl border border-dashed border-[#1B303C]/12 bg-[#FBFCFD] px-3.5 py-3 text-[13px] font-semibold text-[#4A6373]">
                        <span className="inline-flex items-center gap-2.5"><Icon className="h-[18px] w-[18px] text-[#4A6373]/70" aria-hidden="true" />{action.label}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4A6373]/70">Soon</span>
                      </div>
                    );
                  }
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

          {/* Supportive footer strip */}
          <p className="flex items-center justify-center gap-2 py-2 text-center text-[13px] text-[#4A6373]">
            <Heart className="h-4 w-4 text-rose-400" aria-hidden="true" />
            We're here to support you every step of the way. <span className="font-semibold text-[#1B303C]">Thank you for all you do!</span>
          </p>
        </div>
      )}
    </AppShell>
  );
}

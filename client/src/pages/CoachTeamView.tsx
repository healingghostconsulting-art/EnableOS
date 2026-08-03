import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, BookOpen, CalendarClock, CalendarPlus, ChevronDown, GraduationCap, Gauge,
  HelpCircle, LayoutDashboard, Target, UserRound, Users2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AppShell } from "@/components/v3/AppShell";
import { greetingFor } from "@/components/v3/TopBar";
import type { NavItem } from "@/components/v3/SidebarNav";
import { StatusMark, type CanonicalStatus } from "@/components/v3/StatusMark";
import { useDeepLinkTarget } from "@/lib/useDeepLinkTarget";

// v3 Coach "My Team" (/coachees) — the full coachee roster on the persistent AppShell,
// a sibling of the Coach dashboard. Team-level data (correct for the coach role), same
// secureCoach / public-demo fallback as CoachWorkspaceView so every row populates.

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const firstNameOf = (name: string) => name.split(/\s+/)[0] ?? name;
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Reporting Hub deep-link (ExecutivePanel honors ?tab=/#section via useDeepLinkTarget).
const REPORT_OVERVIEW = "/reporting?tab=overview";

const NAV: NavItem[] = [
  { label: "My Dashboard", icon: LayoutDashboard, href: "/coach" },
  { label: "My Team", icon: Users2, href: "/coachees", active: true },
  { label: "Coaching Calendar", icon: CalendarClock, href: "/calendar" },
  { label: "Reports", icon: Gauge, href: REPORT_OVERVIEW },
  { label: "Resources", icon: BookOpen, href: "/library" },
  { label: "Help & Support", icon: HelpCircle, href: "/guide" },
];

// Readiness → canonical StatusMark status (+ the label wording this surface uses and
// the meter-bar tint). The silhouette carries the status; color reinforces.
function readinessStatus(score: number): { status: CanonicalStatus; label: string; meter: string } {
  if (score >= 75) return { status: "positive", label: "On track", meter: "bg-emerald-500" };
  if (score >= 65) return { status: "overdue", label: "Monitor", meter: "bg-amber-500" };
  return { status: "alert", label: "Needs attention", meter: "bg-rose-500" };
}

export function CoachTeamView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const demoMode = trpc.demo.config.useQuery().data?.demoMode ?? false;
  const secureCoach = trpc.demo.secureCoach.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
  const publicCoach = trpc.demo.coach.useQuery({}, { enabled: demoMode });

  const data: any = secureCoach.data ?? (demoMode ? publicCoach.data : undefined);
  const isLoading = !data && (secureCoach.isLoading || (demoMode && publicCoach.isLoading));

  const coachName: string = data?.coach?.name ?? "Coach";
  const roleTitle: string = data?.coach?.title ?? "Coach / Supervisor";
  const initials = initialsOf(coachName === "Coach" ? "CO" : coachName);
  const avatar = <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initials}</span>;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const greeting = greetingFor(new Date().getHours());
  const notifications: any[] = data?.notifications ?? [];

  // Honor inbound #section deep-links (e.g. /coachees#coach-coachees).
  useDeepLinkTarget();

  const coachees: any[] = data?.teamLearners ?? [];
  const sessions: any[] = data?.teamCoachingSessions ?? [];

  // Last session per coachee: the most recent completed session, else the latest of
  // any status — derived from the same coaching feed the dashboard reads.
  function lastSessionFor(learnerId: string): { date: string; status: string } | null {
    const mine = sessions.filter((s) => s.learnerUserId === learnerId);
    if (!mine.length) return null;
    const completed = mine.filter((s) => s.status === "completed").sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate)));
    const pick = completed[0] ?? [...mine].sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate)))[0];
    return { date: pick.dueDate, status: pick.status };
  }

  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Deep-link ?coachee=<id> auto-expands that row's drill-in.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("coachee");
    if (id) setExpandedId(id);
  }, []);

  const total = coachees.length;
  const onTrack = coachees.filter((l) => (l.readinessScore ?? 0) >= 75).length;
  const needAttention = coachees.filter((l) => (l.readinessScore ?? 0) < 65).length;
  const avgReadiness = total ? clampPct(coachees.reduce((s, l) => s + (l.readinessScore ?? 0), 0) / total) : 0;
  const summary = [
    { label: "Coachees", value: String(total), icon: Users2, tint: "bg-[#1B303C]/8 text-[#1B303C]" },
    { label: "On track", value: String(onTrack), icon: Target, tint: "bg-emerald-100 text-emerald-700" },
    { label: "Needs attention", value: String(needAttention), icon: Target, tint: "bg-rose-100 text-rose-700" },
    { label: "Avg readiness", value: String(avgReadiness), icon: Gauge, tint: "bg-cyan-100 text-cyan-800" },
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
        <p className="text-sm text-[#4A6373]">Loading your team…</p>
      ) : (
        <div className="space-y-5">
          {/* Page heading */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Link href="/coach" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7A5200] hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to dashboard
              </Link>
              <h1 className="mt-1 text-[1.35rem] font-semibold text-[#1B303C]">My Team</h1>
              <p className="text-[13px] text-[#4A6373]">Every coachee's readiness and last session, with a drill-in for the detail.</p>
            </div>
            <Link
              href="/calendar?new=coaching"
              className="inline-flex items-center gap-2 rounded-full bg-[#1B303C] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#24404f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30"
            >
              <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Schedule session
            </Link>
          </div>

          {/* Summary strip */}
          <section id="coach-team-summary" className="rounded-2xl border border-[#1B303C]/8 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summary.map((tile) => {
                const Icon = tile.icon;
                return (
                  <div key={tile.label} className="flex items-center gap-3 rounded-xl border border-[#1B303C]/8 bg-[#FBFCFD] p-3.5">
                    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tile.tint}`} aria-hidden="true"><Icon className="h-5 w-5" /></span>
                    <div>
                      <p className="text-[1.5rem] font-bold leading-none text-[#1B303C]">{tile.value}</p>
                      <p className="mt-1 text-[12px] font-medium text-[#4A6373]">{tile.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Roster */}
          <section id="coach-coachees" className="overflow-hidden rounded-2xl border border-[#1B303C]/8 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between border-b border-[#1B303C]/8 px-5 py-3.5">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#1B303C]">Coachee roster</h2>
              <span aria-hidden="true" className="block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
            </div>
            {coachees.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-[#4A6373]">No coachees assigned yet.</p>
            ) : (
              <ul className="divide-y divide-[#1B303C]/6">
                {coachees.map((l) => {
                  const score = clampPct(l.readinessScore ?? 0);
                  const status = readinessStatus(score);
                  const last = lastSessionFor(l.id);
                  const open = expandedId === l.id;
                  const detail = [
                    { label: "Journey progress", value: `${clampPct(l.journeyProgressPct ?? 0)}%` },
                    { label: "Modules complete", value: `${clampPct(l.completedRatioPct ?? 0)}%` },
                    { label: "First-pass checks", value: `${clampPct(l.quizFirstPassPct ?? 0)}%` },
                    { label: "On-time streak", value: `${l.onTimeStreakWeeks ?? 0} wks` },
                  ];
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setExpandedId(open ? null : l.id)}
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-amber-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/20"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initialsOf(l.name)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-[#1B303C]">{l.name}</span>
                          <span className="block truncate text-[12px] text-[#4A6373]">{l.title ?? "Team Member"}</span>
                        </span>
                        {/* Readiness meter */}
                        <span className="hidden w-40 shrink-0 sm:block">
                          <span className="flex items-center justify-between text-[11px] font-medium text-[#4A6373]"><span>Readiness</span><span className="font-semibold text-[#1B303C]">{score}</span></span>
                          <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[#1B303C]/8">
                            <span className={`block h-full rounded-full ${status.meter}`} style={{ width: `${score}%` }} />
                          </span>
                        </span>
                        <span className="hidden w-28 shrink-0 text-[12px] text-[#4A6373] md:block">
                          <span className="block text-[11px] uppercase tracking-wide text-[#4A6373]/70">Last session</span>
                          <span className="block font-medium text-[#1B303C]">{last ? fmtDay(last.date) : "None yet"}</span>
                        </span>
                        <StatusMark status={status.status} label={status.label} variant="pill" className="shrink-0" />
                        <ChevronDown className={`h-4 w-4 shrink-0 text-[#4A6373] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>

                      {open ? (
                        <div className="border-t border-[#1B303C]/6 bg-[#FBFCFD] px-5 py-4">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {detail.map((d) => (
                              <div key={d.label} className="rounded-xl border border-[#1B303C]/8 bg-white p-3">
                                <p className="text-[11px] font-medium text-[#4A6373]">{d.label}</p>
                                <p className="mt-1 text-[1.2rem] font-bold leading-none text-[#1B303C]">{d.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link href="/calendar?new=coaching" className="inline-flex items-center gap-1.5 rounded-full bg-[#1B303C] px-3.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#24404f]">
                              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Schedule session
                            </Link>
                            <Link href="/calendar" className="inline-flex items-center gap-1.5 rounded-full border border-[#1B303C]/12 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#1B303C] transition-colors hover:border-[#7A5200]/25 hover:bg-amber-50/50">
                              <CalendarClock className="h-3.5 w-3.5 text-[#7A5200]" aria-hidden="true" /> View calendar
                            </Link>
                            <Link href={REPORT_OVERVIEW} className="inline-flex items-center gap-1.5 rounded-full border border-[#1B303C]/12 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#1B303C] transition-colors hover:border-[#7A5200]/25 hover:bg-amber-50/50">
                              <GraduationCap className="h-3.5 w-3.5 text-[#7A5200]" aria-hidden="true" /> View reports
                            </Link>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="flex items-center justify-center gap-2 py-2 text-center text-[13px] text-[#4A6373]">
            <UserRound className="h-4 w-4 text-[#7A5200]" aria-hidden="true" />
            Great coaching changes careers. <span className="font-semibold text-[#1B303C]">Thank you for developing your team.</span>
          </p>
        </div>
      )}
    </AppShell>
  );
}

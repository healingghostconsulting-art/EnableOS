import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, BookOpen, CheckCircle2, GraduationCap, HelpCircle, LayoutDashboard,
  Plus, Target, TrendingUp, UserRound,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { AppShell } from "@/components/v3/AppShell";
import { greetingFor } from "@/components/v3/TopBar";
import type { NavItem } from "@/components/v3/SidebarNav";
import { useDeepLinkTarget } from "@/lib/useDeepLinkTarget";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// v3 Learner Goals (/goals) — a dedicated goals surface on the persistent AppShell,
// sibling to the Agent dashboard. Learner-scoped data only (never team KPIs), same
// secure/public demo fallback as AgentWorkspaceView so every meter populates instead
// of collapsing to zero. Add/update dialog is styled to the v3 CHCG tokens directly
// (the shared interaction primitives aren't ported yet).

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const firstNameOf = (name: string) => name.split(/\s+/)[0] ?? name;
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

const NAV: NavItem[] = [
  { label: "My Dashboard", icon: LayoutDashboard, href: "/learner" },
  { label: "My Training", icon: GraduationCap, href: "/training" },
  { label: "My Coaching", icon: UserRound, href: "/calendar" },
  { label: "My Goals", icon: Target, href: "/goals", active: true },
  { label: "Resources", icon: BookOpen, href: "/library" },
  { label: "Help & Support", icon: HelpCircle, href: "/guide" },
];

type GoalStatus = "on_track" | "at_risk" | "achieved";
interface Goal {
  id: string;
  title: string;
  category: string;
  progress: number;
  targetLabel: string;
  targetDate: string;
  status: GoalStatus;
}

// Status is derived from progress unless a goal explicitly carries one (so an edited
// goal reflects the learner's own read). Kept as data, not baked into the markup.
function deriveStatus(progress: number): GoalStatus {
  if (progress >= 100) return "achieved";
  if (progress >= 60) return "on_track";
  return "at_risk";
}

const STATUS_META: Record<GoalStatus, { label: string; pill: string; meter: string }> = {
  on_track: { label: "On track", pill: "bg-emerald-50 text-emerald-700", meter: "bg-emerald-500" },
  at_risk: { label: "At risk", pill: "bg-amber-50 text-[#7A5200]", meter: "bg-amber-500" },
  achieved: { label: "Achieved", pill: "bg-[#1B303C]/8 text-[#1B303C]", meter: "bg-[#1B303C]" },
};

type FilterKey = "all" | GoalStatus;
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "on_track", label: "On track" },
  { key: "at_risk", label: "At risk" },
  { key: "achieved", label: "Achieved" },
];

/**
 * Seed goals from the learner's real payload values (readiness, journey progress,
 * quiz first-pass, on-time streak) so the page opens populated — the "all-zeros" fix
 * pattern: real values, no empty state by default. Used only when the payload does
 * not already carry an explicit `goals` array.
 */
function seedGoalsFromLearner(data: any): Goal[] {
  const journeyPct = clampPct(data?.activeJourney?.progress ?? data?.learner?.journeyProgressPct ?? 0);
  const readiness = clampPct(data?.learner?.readinessScore ?? 0);
  const firstPass = clampPct(data?.learner?.quizFirstPassPct ?? 0);
  const streakWeeks = Number(data?.learner?.onTimeStreakWeeks ?? 0);
  const journeyTitle = data?.activeJourney?.title ?? "your learning journey";
  // Readiness goal targets 85; progress is how far the current score has closed toward it.
  const readinessProgress = clampPct((readiness / 85) * 100);
  const firstPassProgress = clampPct((firstPass / 75) * 100);
  const streakProgress = clampPct((streakWeeks / 12) * 100);
  return [
    { id: "goal-journey", title: `Complete ${journeyTitle}`, category: "Training", progress: journeyPct, targetLabel: "100% of assigned modules", targetDate: daysFromNow(21), status: deriveStatus(journeyPct) },
    { id: "goal-readiness", title: "Reach 85 QA readiness", category: "Quality", progress: readinessProgress, targetLabel: `Readiness ${readiness} → 85`, targetDate: daysFromNow(45), status: deriveStatus(readinessProgress) },
    { id: "goal-firstpass", title: "First-pass check rate ≥ 75%", category: "Assessment", progress: firstPassProgress, targetLabel: `First-pass ${firstPass}% → 75%`, targetDate: daysFromNow(30), status: deriveStatus(firstPassProgress) },
    { id: "goal-streak", title: "Hold a 12-week on-time streak", category: "Consistency", progress: streakProgress, targetLabel: `${streakWeeks} of 12 weeks`, targetDate: daysFromNow(60), status: deriveStatus(streakProgress) },
  ];
}

const BLANK_DRAFT = { id: "", title: "", category: "Training", progress: 0, targetLabel: "", targetDate: daysFromNow(30), status: "on_track" as GoalStatus };

export function LearnerGoalsView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  // Same sourcing contract as AgentWorkspaceView: scoped data when authenticated, the
  // public canonical learner payload as a demo-only fallback (never in production).
  const demoMode = trpc.demo.config.useQuery().data?.demoMode ?? false;
  const secureLearner = trpc.demo.secureLearner.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
  const publicLearner = trpc.demo.learner.useQuery({}, { enabled: demoMode });

  const data: any = secureLearner.data ?? (demoMode ? publicLearner.data : undefined);
  const isLoading = !data && (secureLearner.isLoading || (demoMode && publicLearner.isLoading));

  const learnerName: string = data?.learner?.name ?? "there";
  const roleTitle: string = data?.learner?.title ?? "Team Member";
  const initials = initialsOf(learnerName === "there" ? "EO" : learnerName);
  const avatar = <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1B303C] text-[12px] font-bold text-white" aria-hidden="true">{initials}</span>;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const greeting = greetingFor(new Date().getHours());
  const notifications: any[] = data?.notifications ?? [];

  // Honor inbound #section deep-links (e.g. /goals#learner-goals).
  useDeepLinkTarget();

  // Goals live in component state so the add/update dialog is genuinely working in the
  // demo (no goals-persistence endpoint exists yet). Seed from the payload's own goals
  // if present, else derive from the learner's real metrics.
  const seeded = useMemo<Goal[]>(() => {
    if (Array.isArray(data?.goals) && data.goals.length) {
      return data.goals.map((g: any, i: number) => ({
        id: g.id ?? `goal-${i}`,
        title: g.title ?? "Goal",
        category: g.category ?? "Training",
        progress: clampPct(g.progress ?? 0),
        targetLabel: g.targetLabel ?? g.target ?? "",
        targetDate: (g.targetDate ?? daysFromNow(30)).slice(0, 10),
        status: (g.status as GoalStatus) ?? deriveStatus(clampPct(g.progress ?? 0)),
      }));
    }
    return data ? seedGoalsFromLearner(data) : [];
  }, [data]);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [seededKey, setSeededKey] = useState<string>("");
  // Re-seed when the payload arrives/changes, without clobbering in-session edits on
  // re-render (keyed on the seeded snapshot).
  const key = seeded.map((g) => g.id).join("|");
  if (key && key !== seededKey) {
    setSeededKey(key);
    setGoals(seeded);
  }

  const [filter, setFilter] = useState<FilterKey>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState(BLANK_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);

  // The learner-dashboard "Update Goal" quick action deep-links here with ?compose=1
  // to open the add/update dialog straight away.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("compose")) openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingId(null);
    setDraft({ ...BLANK_DRAFT, id: `goal-${Date.now().toString(36)}`, targetDate: daysFromNow(30) });
    setDialogOpen(true);
  }
  function openEdit(goal: Goal) {
    setEditingId(goal.id);
    setDraft({ ...goal });
    setDialogOpen(true);
  }
  function saveDraft() {
    const progress = clampPct(draft.progress);
    const next: Goal = { ...draft, progress, title: draft.title.trim() || "Untitled goal", status: draft.status ?? deriveStatus(progress) };
    setGoals((prev) => (editingId ? prev.map((g) => (g.id === editingId ? next : g)) : [...prev, next]));
    setDialogOpen(false);
  }

  const shown = filter === "all" ? goals : goals.filter((g) => g.status === filter);

  const activeCount = goals.filter((g) => g.status !== "achieved").length;
  const onTrackCount = goals.filter((g) => g.status === "on_track").length;
  const atRiskCount = goals.filter((g) => g.status === "at_risk").length;
  const avgProgress = goals.length ? clampPct(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;
  const summary = [
    { label: "Active goals", value: String(activeCount), icon: Target, tint: "bg-[#1B303C]/8 text-[#1B303C]" },
    { label: "On track", value: String(onTrackCount), icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-700" },
    { label: "Needs attention", value: String(atRiskCount), icon: TrendingUp, tint: "bg-amber-100 text-[#7A5200]" },
    { label: "Avg progress", value: `${avgProgress}%`, icon: TrendingUp, tint: "bg-cyan-100 text-cyan-800" },
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
      notificationsHref="/learner#learner-announcements"
    >
      {isLoading ? (
        <p className="text-sm text-[#4A6373]">Loading your goals…</p>
      ) : (
        <div className="space-y-5">
          {/* Page heading + primary action */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Link href="/learner" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7A5200] hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to dashboard
              </Link>
              <h1 className="mt-1 text-[1.35rem] font-semibold text-[#1B303C]">My Goals</h1>
              <p className="text-[13px] text-[#4A6373]">Track your development commitments and keep the next step obvious.</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-full bg-[#FCBC34] px-4 py-2 text-[13px] font-semibold text-[#1B303C] transition-colors hover:bg-[#e9ad1e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add goal
            </button>
          </div>

          {/* Summary strip */}
          <section id="learner-goals-summary" className="rounded-2xl border border-[#1B303C]/8 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
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

          {/* Filter switch */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter goals by status">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = f.key === "all" ? goals.length : goals.filter((g) => g.status === f.key).length;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30 ${
                    active
                      ? "border-[#1B303C] bg-[#1B303C] text-white"
                      : "border-[#1B303C]/12 bg-white text-[#4A6373] hover:border-[#7A5200]/25 hover:text-[#1B303C]"
                  }`}
                >
                  {f.label}
                  <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/20 text-white" : "bg-[#1B303C]/6 text-[#4A6373]"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Goal cards */}
          <section id="learner-goals" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.length === 0 ? (
              <p className="text-[13px] text-[#4A6373]">No goals in this view. Try a different filter or add a goal.</p>
            ) : (
              shown.map((goal) => {
                const meta = STATUS_META[goal.status];
                return (
                  <article key={goal.id} className="flex flex-col rounded-2xl border border-[#1B303C]/8 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A5200]">{goal.category}</p>
                        <h2 className="mt-1 text-[15px] font-semibold leading-snug text-[#1B303C]">{goal.title}</h2>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.pill}`}>{meta.label}</span>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[12px] font-medium text-[#4A6373]">
                        <span>Progress</span>
                        <span className="font-semibold text-[#1B303C]">{goal.progress}%</span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#1B303C]/8" role="progressbar" aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${goal.title} progress`}>
                        <span className={`block h-full rounded-full ${meta.meter}`} style={{ width: `${goal.progress}%` }} />
                      </div>
                    </div>

                    <dl className="mt-4 space-y-1.5 text-[12.5px]">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[#4A6373]">Target</dt>
                        <dd className="text-right font-medium text-[#1B303C]">{goal.targetLabel || "—"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-[#4A6373]">Target date</dt>
                        <dd className="font-medium text-[#1B303C]">{fmtDay(goal.targetDate)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex items-center justify-end border-t border-[#1B303C]/6 pt-3">
                      <button
                        type="button"
                        onClick={() => openEdit(goal)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#1B303C]/12 bg-[#FBFCFD] px-3.5 py-1.5 text-[12px] font-semibold text-[#1B303C] transition-colors hover:border-[#7A5200]/25 hover:bg-amber-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30"
                      >
                        Update goal
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}

      {/* Add / update dialog — v3 CHCG tokens, styled directly. */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg border-[#1B303C]/10 bg-white p-0 text-[#1B303C]">
          <div className="border-b border-[#1B303C]/8 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-[1.05rem] font-semibold text-[#1B303C]">{editingId ? "Update goal" : "Add a goal"}</DialogTitle>
              <DialogDescription className="text-[13px] text-[#4A6373]">
                {editingId ? "Adjust the target, progress, or status as your work moves." : "Define a development commitment with a clear target and date."}
              </DialogDescription>
            </DialogHeader>
            <span aria-hidden="true" className="mt-3 block h-[3px] w-8 rounded-full bg-[#FCBC34]" />
          </div>

          <div className="space-y-4 px-6 py-5">
            <Field label="Goal title" htmlFor="goal-title">
              <input
                id="goal-title"
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Reach 85 QA readiness"
                className="w-full rounded-xl border border-[#1B303C]/12 bg-white px-3.5 py-2.5 text-[13px] text-[#1B303C] outline-none placeholder:text-[#4A6373]/60 focus:border-[#7A5200]/40 focus:ring-2 focus:ring-[#1B303C]/15"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="goal-category">
                <select
                  id="goal-category"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="w-full rounded-xl border border-[#1B303C]/12 bg-white px-3.5 py-2.5 text-[13px] text-[#1B303C] outline-none focus:border-[#7A5200]/40 focus:ring-2 focus:ring-[#1B303C]/15"
                >
                  {["Training", "Quality", "Assessment", "Consistency", "Coaching"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Status" htmlFor="goal-status">
                <select
                  id="goal-status"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as GoalStatus })}
                  className="w-full rounded-xl border border-[#1B303C]/12 bg-white px-3.5 py-2.5 text-[13px] text-[#1B303C] outline-none focus:border-[#7A5200]/40 focus:ring-2 focus:ring-[#1B303C]/15"
                >
                  <option value="on_track">On track</option>
                  <option value="at_risk">At risk</option>
                  <option value="achieved">Achieved</option>
                </select>
              </Field>
            </div>

            <Field label="Target" htmlFor="goal-target">
              <input
                id="goal-target"
                type="text"
                value={draft.targetLabel}
                onChange={(e) => setDraft({ ...draft, targetLabel: e.target.value })}
                placeholder="e.g. 100% of assigned modules"
                className="w-full rounded-xl border border-[#1B303C]/12 bg-white px-3.5 py-2.5 text-[13px] text-[#1B303C] outline-none placeholder:text-[#4A6373]/60 focus:border-[#7A5200]/40 focus:ring-2 focus:ring-[#1B303C]/15"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Progress — ${clampPct(draft.progress)}%`} htmlFor="goal-progress">
                <input
                  id="goal-progress"
                  type="range"
                  min={0}
                  max={100}
                  value={draft.progress}
                  onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}
                  className="w-full accent-[#1B303C]"
                />
              </Field>
              <Field label="Target date" htmlFor="goal-date">
                <input
                  id="goal-date"
                  type="date"
                  value={draft.targetDate}
                  onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
                  className="w-full rounded-xl border border-[#1B303C]/12 bg-white px-3.5 py-2.5 text-[13px] text-[#1B303C] outline-none focus:border-[#7A5200]/40 focus:ring-2 focus:ring-[#1B303C]/15"
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#1B303C]/8 px-6 py-4">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-full border border-[#1B303C]/12 bg-white px-4 py-2 text-[13px] font-semibold text-[#4A6373] transition-colors hover:text-[#1B303C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="rounded-full bg-[#FCBC34] px-4 py-2 text-[13px] font-semibold text-[#1B303C] transition-colors hover:bg-[#e9ad1e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 focus-visible:ring-offset-2"
            >
              {editingId ? "Save changes" : "Add goal"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-[#1B303C]">{label}</span>
      {children}
    </label>
  );
}

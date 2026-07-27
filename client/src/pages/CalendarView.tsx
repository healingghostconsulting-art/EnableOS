import { useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarClock, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { WorkspaceShell, type WorkspaceStat } from "@/components/WorkspaceShell";
import { ActionCard } from "@/components/ActionCard";
import { Surface } from "@/pages/EnableOSViews";
import { demoNow } from "../../../shared/demoClock";
import type { CalendarEvent } from "../../../shared/calendar";

// CAL3 — the Calendar view: an agenda-style read of demo.secureCalendar, on the
// Coach Studio standard (WorkspaceShell + ActionCard). Pure render of the derived
// feed; the data is already role-scoped server-side, so this view never re-filters.

const DAY_MS = 86_400_000;
const utcDayIndex = (ms: number) => Math.floor(ms / DAY_MS);

type Bucket = "overdue" | "today" | "week" | "later" | "completed";
const BUCKET_ORDER: Bucket[] = ["overdue", "today", "week", "later", "completed"];
const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  later: "Later",
  completed: "Completed",
};

function bucketOf(event: CalendarEvent, nowMs: number): Bucket {
  if (event.status === "completed") return "completed";
  const day = utcDayIndex(Date.parse(event.start));
  const today = utcDayIndex(nowMs);
  if (day < today) return "overdue";
  if (day === today) return "today";
  if (day <= today + 6) return "week";
  return "later";
}

const TYPE_LABEL: Record<CalendarEvent["type"], string> = {
  coaching_session: "Coaching session",
  coaching_follow_up: "Coaching follow-up",
  training_due: "Training due",
  training_completed: "Training",
};

const STATUS_PILL: Record<CalendarEvent["status"], string> = {
  scheduled: "border-slate-400/30 bg-slate-400/12 text-slate-200",
  follow_up_due: "border-amber-400/30 bg-amber-400/14 text-amber-100",
  due: "border-amber-400/30 bg-amber-400/14 text-amber-100",
  overdue: "border-rose-400/30 bg-rose-500/14 text-rose-100",
  completed: "border-emerald-400/30 bg-emerald-400/14 text-emerald-100",
};

// The feed is UTC-anchored (date-only sources normalize to UTC midnight); format in
// UTC so an all-day event never drifts a day for viewers in negative-offset zones.
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

function whenLine(event: CalendarEvent): string {
  if (event.allDay) return `${fmtDate(event.start)} · All day`;
  const start = `${fmtDate(event.start)} · ${fmtTime(event.start)}`;
  return event.end ? `${start}–${fmtTime(event.end)}` : start;
}

function hrefFor(event: CalendarEvent): string {
  const { route, tab, sectionId } = event.deepLink;
  const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  const hash = sectionId ? `#${encodeURIComponent(sectionId)}` : "";
  return `${route}${query}${hash}`;
}

function accentFor(event: CalendarEvent): "gold" | "dark" | "emerald" {
  if (event.status === "completed") return "emerald";
  if (event.status === "overdue") return "gold";
  return "dark";
}

export function CalendarView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const query = trpc.demo.secureCalendar.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });

  const events = useMemo(() => query.data ?? [], [query.data]);
  const nowMs = demoNow().getTime();

  const grouped = useMemo(() => {
    const map: Record<Bucket, CalendarEvent[]> = { overdue: [], today: [], week: [], later: [], completed: [] };
    for (const event of events) map[bucketOf(event, nowMs)].push(event);
    return map;
  }, [events, nowMs]);

  const stats: WorkspaceStat[] = [
    { label: "Upcoming", value: grouped.today.length + grouped.week.length + grouped.later.length, sub: "Scheduled sessions + deadlines ahead", icon: <CalendarClock className="h-4 w-4" /> },
    { label: "Overdue", value: grouped.overdue.length, sub: "Past-due sessions and training", icon: <AlertTriangle className="h-4 w-4" /> },
    { label: "This week", value: grouped.today.length + grouped.week.length, sub: "Due in the next seven days", icon: <Clock className="h-4 w-4" /> },
    { label: "Completed", value: grouped.completed.length, sub: "Finished coaching + training", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  const activeBuckets = BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0);

  return (
    <Surface>
      <WorkspaceShell
        title="Calendar"
        subtitle="Your coaching sessions, follow-ups, and training deadlines in one place."
        stats={stats}
        subTruncate
        actions={
          access.data ? (
            <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-600">
              {access.data.tenant.name}
            </Badge>
          ) : null
        }
      >
        {query.isLoading ? <p className="text-sm text-slate-400">Loading calendar…</p> : null}
        {!query.isLoading && events.length === 0 ? (
          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
            <p className="text-sm font-medium text-white">Nothing scheduled yet.</p>
            <p className="mt-1 text-sm text-slate-400">Coaching sessions and training deadlines will appear here as they are assigned.</p>
          </div>
        ) : null}
        {activeBuckets.map((bucket) => (
          <section key={bucket} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-gold">{BUCKET_LABEL[bucket]}</p>
              <span className="text-[11px] text-slate-500">({grouped[bucket].length})</span>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {grouped[bucket].map((event) => (
                <ActionCard
                  key={event.id}
                  accent={accentFor(event)}
                  eyebrow={`${TYPE_LABEL[event.type]} · ${whenLine(event)}`}
                  title={event.title}
                  body=""
                  action={
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] ${STATUS_PILL[event.status]}`}>
                        {event.status.replace("_", " ")}
                      </Badge>
                      <Link href={hrefFor(event)} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-gold hover:underline">
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </WorkspaceShell>
    </Surface>
  );
}

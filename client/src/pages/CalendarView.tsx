import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { ActionCard } from "@/components/ActionCard";
import { Surface } from "@/pages/EnableOSViews";
import { demoNow } from "../../../shared/demoClock";
import type { CalendarEvent } from "../../../shared/calendar";
import {
  type CalendarPersona,
  type CalendarViewMode,
  type ChipColorKey,
  addUtcDays,
  addUtcMonths,
  buildMonthMatrix,
  buildWeekDays,
  eventColorKey,
  eventsByDay,
  filterByPersona,
  periodLabel,
  personasForGrant,
  startOfUtcDay,
  utcDayIndex,
} from "../../../shared/calendarBoard";

// CAL4 — the full Calendar board: Month / Week / Agenda over demo.secureCalendar.
// Read-only. The feed is already role-scoped server-side; the "Viewing as" lens is
// a client-side focus filter over what the viewer is already permitted to see, so
// it never widens visibility. All dates render in UTC to match the feed.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 3;
const PERSONA_LABEL: Record<CalendarPersona, string> = { manager: "Manager", coach: "Coach", agent: "Agent" };
const VIEW_MODES: CalendarViewMode[] = ["month", "week", "agenda"];
const VIEW_LABEL: Record<CalendarViewMode, string> = { month: "Month", week: "Week", agenda: "Agenda" };

// Solid legend/chip colors — all AA on the light grid (white text, except gold
// which pairs with navy ink per the dual-surface gold rule).
const CHIP_CLASS: Record<ChipColorKey, string> = {
  coaching: "bg-cyan-700 text-white",
  training: "bg-[#1B303C] text-white",
  follow_up: "bg-accent-gold text-[#1B303C]",
  completion: "bg-emerald-700 text-white",
  overdue: "bg-rose-700 text-white",
};
const LEGEND: Array<{ key: ChipColorKey; label: string }> = [
  { key: "coaching", label: "Coaching" },
  { key: "training", label: "Training due" },
  { key: "follow_up", label: "Follow-up" },
  { key: "completion", label: "Completion" },
  { key: "overdue", label: "At-risk / overdue" },
];

// UTC formatters so an all-day event never drifts a day.
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function hrefFor(event: CalendarEvent): string {
  const { route, tab, sectionId } = event.deepLink;
  const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  const hash = sectionId ? `#${encodeURIComponent(sectionId)}` : "";
  return `${route}${query}${hash}`;
}

/** A color-coded event chip that deep-links to its acting surface. Drag-to-
 *  reschedule is intentionally inert this read-only pass (draggable={false}). */
function EventChip({ event, showTime }: { event: CalendarEvent; showTime: boolean }) {
  const time = showTime && !event.allDay ? `${fmtTime(event.start)} ` : "";
  return (
    <Link
      href={hrefFor(event)}
      draggable={false}
      title={`${event.title} — ${event.allDay ? "All day" : fmtTime(event.start)} · open to act (drag-to-reschedule lands with scheduling)`}
      className={`block truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium leading-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 ${CHIP_CLASS[eventColorKey(event)]}`}
    >
      {time}{event.title}
    </Link>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthGrid({ cursorMs, nowMs, byDay }: { cursorMs: number; nowMs: number; byDay: Map<number, CalendarEvent[]> }) {
  const weeks = buildMonthMatrix(cursorMs, nowMs);
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[#1B303C]/10 bg-white/80 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-7 border-b border-[#1B303C]/10 bg-white/60">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A6373]">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((cell) => {
          const dayEvents = byDay.get(utcDayIndex(cell.dateMs)) ?? [];
          const shown = dayEvents.slice(0, MAX_CHIPS_PER_DAY);
          const overflow = dayEvents.length - shown.length;
          return (
            <div
              key={cell.dateMs}
              className={`min-h-[7rem] border-b border-r border-[#1B303C]/8 p-1.5 last:border-r-0 ${cell.inMonth ? "bg-white/40" : "bg-white/10"} ${cell.isToday ? "ring-2 ring-inset ring-accent-gold" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[12px] font-semibold ${cell.isToday ? "bg-[#1B303C] text-white" : cell.inMonth ? "text-[#1B303C]" : "text-slate-500"}`}>
                  {new Date(cell.dateMs).getUTCDate()}
                </span>
              </div>
              <div className="space-y-1">
                {shown.map((event) => <EventChip key={event.id} event={event} showTime />)}
                {overflow > 0 ? (
                  <p className="px-1 text-[10px] font-medium text-[#4A6373]">+{overflow} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week view (day columns; all-day lane + timed rows) ──────────────────────────
function WeekGrid({ cursorMs, nowMs, byDay }: { cursorMs: number; nowMs: number; byDay: Map<number, CalendarEvent[]> }) {
  const days = buildWeekDays(cursorMs);
  const today = startOfUtcDay(nowMs);
  return (
    <div className="overflow-x-auto rounded-[1.25rem] border border-[#1B303C]/10 bg-white/80 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="grid min-w-[46rem] grid-cols-7">
        {days.map((dayMs) => {
          const dayEvents = byDay.get(utcDayIndex(dayMs)) ?? [];
          const allDay = dayEvents.filter((event) => event.allDay);
          const timed = dayEvents.filter((event) => !event.allDay);
          const isToday = dayMs === today;
          const d = new Date(dayMs);
          return (
            <div key={dayMs} className="min-h-[18rem] border-r border-[#1B303C]/8 last:border-r-0">
              <div className={`border-b border-[#1B303C]/10 px-2 py-2 text-center ${isToday ? "bg-accent-gold/12" : "bg-white/50"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A6373]">{WEEKDAYS[d.getUTCDay()]}</p>
                <p className={`mt-0.5 text-sm font-semibold ${isToday ? "text-[#1B303C]" : "text-[#1B303C]/80"}`}>{d.getUTCDate()}</p>
              </div>
              <div className="space-y-1.5 p-1.5">
                <div className="space-y-1">
                  <p className="px-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#4A6373]">All day</p>
                  {allDay.length ? allDay.map((event) => <EventChip key={event.id} event={event} showTime={false} />) : <p className="px-0.5 text-[10px] text-slate-500">—</p>}
                </div>
                <div className="space-y-1 border-t border-[#1B303C]/8 pt-1.5">
                  <p className="px-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#4A6373]">Timed</p>
                  {timed.length ? timed.map((event) => <EventChip key={event.id} event={event} showTime />) : <p className="px-0.5 text-[10px] text-slate-500">—</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agenda view (the CAL3 grouped list — preserved) ─────────────────────────────
type Bucket = "overdue" | "today" | "week" | "later" | "completed";
const BUCKET_ORDER: Bucket[] = ["overdue", "today", "week", "later", "completed"];
const BUCKET_LABEL: Record<Bucket, string> = { overdue: "Overdue", today: "Today", week: "This week", later: "Later", completed: "Completed" };
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

function bucketOf(event: CalendarEvent, nowMs: number): Bucket {
  if (event.status === "completed") return "completed";
  const day = utcDayIndex(Date.parse(event.start));
  const today = utcDayIndex(nowMs);
  if (day < today) return "overdue";
  if (day === today) return "today";
  if (day <= today + 6) return "week";
  return "later";
}

function whenLine(event: CalendarEvent): string {
  if (event.allDay) return `${fmtDate(event.start)} · All day`;
  return `${fmtDate(event.start)} · ${fmtTime(event.start)}`;
}

function accentFor(event: CalendarEvent): "gold" | "dark" | "emerald" {
  if (event.status === "completed") return "emerald";
  if (event.status === "overdue") return "gold";
  return "dark";
}

function AgendaList({ events, nowMs }: { events: CalendarEvent[]; nowMs: number }) {
  const grouped: Record<Bucket, CalendarEvent[]> = { overdue: [], today: [], week: [], later: [], completed: [] };
  for (const event of events) grouped[bucketOf(event, nowMs)].push(event);
  const active = BUCKET_ORDER.filter((bucket) => grouped[bucket].length > 0);
  if (!active.length) return null;
  return (
    <div className="space-y-5">
      {active.map((bucket) => (
        <section key={bucket} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-gold-ink">{BUCKET_LABEL[bucket]}</p>
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
    </div>
  );
}

// ── Board ───────────────────────────────────────────────────────────────────────
export function CalendarView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const query = trpc.demo.secureCalendar.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });

  const nowMs = demoNow().getTime();
  const [view, setView] = useState<CalendarViewMode>("month");
  const [cursorMs, setCursorMs] = useState(() => startOfUtcDay(demoNow().getTime()));

  const personas = useMemo(() => personasForGrant(access.data?.grant.role ?? "learner"), [access.data?.grant.role]);
  const [persona, setPersona] = useState<CalendarPersona>("manager");
  useEffect(() => {
    if (!personas.includes(persona)) setPersona(personas[0]!);
  }, [personas, persona]);

  const allEvents = query.data ?? [];
  const events = useMemo(() => filterByPersona(allEvents, persona), [allEvents, persona]);
  const byDay = useMemo(() => eventsByDay(events), [events]);

  const step = (delta: number) => setCursorMs((current) => (view === "week" ? addUtcDays(current, delta * 7) : addUtcMonths(current, delta)));
  const goToday = () => setCursorMs(startOfUtcDay(nowMs));

  const disabledNewSession = "Scheduling lands with the create/schedule backend (read-only for now)";

  return (
    <Surface>
      <WorkspaceShell
        title="Calendar"
        subtitle="Coaching sessions, follow-ups, and training deadlines in one board."
        actions={
          access.data ? (
            <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-600">
              {access.data.tenant.name}
            </Badge>
          ) : null
        }
      >
        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-[#1B303C]/10 bg-white/80 px-3.5 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.06)] xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" aria-label="Previous period" onClick={() => step(-1)} className="h-8 w-8 rounded-full border-[#1B303C]/15 bg-white text-[#1B303C] hover:bg-slate-100">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" aria-label="Next period" onClick={() => step(1)} className="h-8 w-8 rounded-full border-[#1B303C]/15 bg-white text-[#1B303C] hover:bg-slate-100">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button type="button" variant="outline" onClick={goToday} className="h-8 rounded-full border-[#1B303C]/15 bg-white px-3.5 text-sm font-medium text-[#1B303C] hover:bg-slate-100">
              Today
            </Button>
            <h2 className="ml-1 text-lg font-semibold tracking-tight text-[#1B303C]">{periodLabel(view, cursorMs)}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A6373]">Viewing as</span>
              <Select value={persona} onValueChange={(value) => setPersona(value as CalendarPersona)}>
                <SelectTrigger aria-label="Viewing as" className="h-8 w-[7.5rem] rounded-full border-[#1B303C]/15 bg-white text-sm text-[#1B303C]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((option) => (
                    <SelectItem key={option} value={option}>{PERSONA_LABEL[option]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div role="group" aria-label="Calendar view" className="inline-flex rounded-full border border-[#1B303C]/12 bg-white/70 p-1">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                  className={`rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 ${view === mode ? "bg-[#1B303C] text-white" : "text-[#4A6373] hover:bg-slate-100"}`}
                >
                  {VIEW_LABEL[mode]}
                </button>
              ))}
            </div>

            <Button type="button" disabled title={disabledNewSession} aria-disabled className="h-8 rounded-full bg-[#1B303C] px-3.5 text-sm font-semibold text-white hover:bg-[#1B303C] disabled:cursor-not-allowed disabled:opacity-55">
              <Plus className="mr-1.5 h-4 w-4" /> New Session
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[1.25rem] border border-[#1B303C]/10 bg-white/70 px-4 py-2.5">
          {LEGEND.map((entry) => (
            <span key={entry.key} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1B303C]">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${CHIP_CLASS[entry.key].split(" ")[0]}`} aria-hidden="true" />
              {entry.label}
            </span>
          ))}
        </div>

        {/* Active view */}
        {query.isLoading ? <p className="text-sm text-[#4A6373]">Loading calendar…</p> : null}
        {!query.isLoading && events.length === 0 ? (
          <div className="rounded-[1.25rem] border border-[#1B303C]/10 bg-white/70 px-4 py-6 text-center">
            <p className="text-sm font-medium text-[#1B303C]">Nothing scheduled in this lens.</p>
            <p className="mt-1 text-sm text-[#4A6373]">Coaching sessions and training deadlines appear here as they are assigned.</p>
          </div>
        ) : view === "month" ? (
          <MonthGrid cursorMs={cursorMs} nowMs={nowMs} byDay={byDay} />
        ) : view === "week" ? (
          <WeekGrid cursorMs={cursorMs} nowMs={nowMs} byDay={byDay} />
        ) : (
          <AgendaList events={events} nowMs={nowMs} />
        )}
      </WorkspaceShell>
    </Surface>
  );
}

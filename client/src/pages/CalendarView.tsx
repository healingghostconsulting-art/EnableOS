import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

// CAL6 — the interactive Calendar board over demo.secureCalendar. New Session +
// reschedule (click or drag) + cancel run against the CAL5 mutations. Affordances
// mirror the backend guards (schedulable.canSchedule), so the UI never offers an
// action the server would reject. All dates are UTC, matching the feed.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 3;
const PERSONA_LABEL: Record<CalendarPersona, string> = { manager: "Manager", coach: "Coach", agent: "Agent" };
const VIEW_MODES: CalendarViewMode[] = ["month", "week", "agenda"];
const VIEW_LABEL: Record<CalendarViewMode, string> = { month: "Month", week: "Week", agenda: "Agenda" };
const DURATIONS = [30, 45, 60, 90];

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

const pad = (n: number) => String(n).padStart(2, "0");
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const isoToDateInput = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const isoToTimeInput = (iso: string) => { const d = new Date(iso); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
/** date (YYYY-MM-DD) + time (HH:MM), read as UTC, → ISO. */
const toStartIso = (date: string, time: string) => new Date(`${date}T${time || "09:00"}:00.000Z`).toISOString();

function hrefFor(event: CalendarEvent): string {
  const { route, tab, sectionId } = event.deepLink;
  const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  const hash = sectionId ? `#${encodeURIComponent(sectionId)}` : "";
  return `${route}${query}${hash}`;
}

const isCoaching = (event: CalendarEvent) => event.type === "coaching_session" || event.type === "coaching_follow_up";
/** Reschedulable = a live coaching or training-due event (not a completion). */
const isReschedulable = (event: CalendarEvent) =>
  event.status !== "completed" && (isCoaching(event) || event.type === "training_due");

// ── Event chip ──────────────────────────────────────────────────────────────
function EventChip({
  event,
  showTime,
  canManage,
  onOpen,
  onDragStartEvent,
}: {
  event: CalendarEvent;
  showTime: boolean;
  canManage: boolean;
  onOpen: (event: CalendarEvent) => void;
  onDragStartEvent: (event: CalendarEvent) => void;
}) {
  const time = showTime && !event.allDay ? `${fmtTime(event.start)} ` : "";
  const draggable = canManage && isReschedulable(event);
  const chipClass = `block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium leading-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 ${CHIP_CLASS[eventColorKey(event)]}`;
  const dragProps = draggable
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", event.id); onDragStartEvent(event); },
      }
    : {};

  // Coaching events a coach/manager can act on open the reschedule modal; everything
  // else deep-links to its acting surface (agents get plain links — no scheduling).
  if (canManage && isCoaching(event)) {
    return (
      <button type="button" {...dragProps} onClick={(e) => { e.stopPropagation(); onOpen(event); }} title={`${event.title} — ${event.allDay ? "All day" : fmtTime(event.start)} · open to reschedule or cancel`} className={`${chipClass} cursor-pointer`}>
        {time}{event.title}
      </button>
    );
  }
  return (
    <Link href={hrefFor(event)} {...dragProps} onClick={(e) => e.stopPropagation()} title={`${event.title} — ${event.allDay ? "All day" : fmtTime(event.start)}${draggable ? " · drag to reschedule" : ""}`} className={chipClass}>
      {time}{event.title}
    </Link>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
function MonthGrid({ cursorMs, nowMs, byDay, canManage, onOpen, onDragStartEvent, onDropDay, onEmptyDay }: {
  cursorMs: number; nowMs: number; byDay: Map<number, CalendarEvent[]>;
  canManage: boolean; onOpen: (e: CalendarEvent) => void; onDragStartEvent: (e: CalendarEvent) => void;
  onDropDay: (dayMs: number) => void; onEmptyDay: (dayMs: number) => void;
}) {
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
              onDragOver={canManage ? (e) => e.preventDefault() : undefined}
              onDrop={canManage ? (e) => { e.preventDefault(); onDropDay(cell.dateMs); } : undefined}
              onClick={canManage ? () => onEmptyDay(cell.dateMs) : undefined}
              className={`min-h-[7rem] border-b border-r border-[#1B303C]/8 p-1.5 last:border-r-0 ${cell.inMonth ? "bg-white/40" : "bg-white/10"} ${cell.isToday ? "ring-2 ring-inset ring-accent-gold" : ""} ${canManage ? "cursor-pointer hover:bg-white/70" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[12px] font-semibold ${cell.isToday ? "bg-[#1B303C] text-white" : cell.inMonth ? "text-[#1B303C]" : "text-slate-500"}`}>
                  {new Date(cell.dateMs).getUTCDate()}
                </span>
              </div>
              <div className="space-y-1">
                {shown.map((event) => <EventChip key={event.id} event={event} showTime canManage={canManage} onOpen={onOpen} onDragStartEvent={onDragStartEvent} />)}
                {overflow > 0 ? <p className="px-1 text-[10px] font-medium text-[#4A6373]">+{overflow} more</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week view ──────────────────────────────────────────────────────────────────
function WeekGrid({ cursorMs, nowMs, byDay, canManage, onOpen, onDragStartEvent, onDropDay, onEmptyDay }: {
  cursorMs: number; nowMs: number; byDay: Map<number, CalendarEvent[]>;
  canManage: boolean; onOpen: (e: CalendarEvent) => void; onDragStartEvent: (e: CalendarEvent) => void;
  onDropDay: (dayMs: number) => void; onEmptyDay: (dayMs: number) => void;
}) {
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
            <div
              key={dayMs}
              onDragOver={canManage ? (e) => e.preventDefault() : undefined}
              onDrop={canManage ? (e) => { e.preventDefault(); onDropDay(dayMs); } : undefined}
              className="min-h-[18rem] border-r border-[#1B303C]/8 last:border-r-0"
            >
              <div className={`border-b border-[#1B303C]/10 px-2 py-2 text-center ${isToday ? "bg-accent-gold/12" : "bg-white/50"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A6373]">{WEEKDAYS[d.getUTCDay()]}</p>
                <p className={`mt-0.5 text-sm font-semibold ${isToday ? "text-[#1B303C]" : "text-[#1B303C]/80"}`}>{d.getUTCDate()}</p>
              </div>
              <div onClick={canManage ? () => onEmptyDay(dayMs) : undefined} className={`space-y-1.5 p-1.5 ${canManage ? "cursor-pointer" : ""}`}>
                <div className="space-y-1">
                  <p className="px-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#4A6373]">All day</p>
                  {allDay.length ? allDay.map((event) => <EventChip key={event.id} event={event} showTime={false} canManage={canManage} onOpen={onOpen} onDragStartEvent={onDragStartEvent} />) : <p className="px-0.5 text-[10px] text-slate-500">—</p>}
                </div>
                <div className="space-y-1 border-t border-[#1B303C]/8 pt-1.5">
                  <p className="px-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#4A6373]">Timed</p>
                  {timed.length ? timed.map((event) => <EventChip key={event.id} event={event} showTime canManage={canManage} onOpen={onOpen} onDragStartEvent={onDragStartEvent} />) : <p className="px-0.5 text-[10px] text-slate-500">—</p>}
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
const whenLine = (event: CalendarEvent) => event.allDay ? `${fmtDate(event.start)} · All day` : `${fmtDate(event.start)} · ${fmtTime(event.start)}`;
const accentFor = (event: CalendarEvent): "gold" | "dark" | "emerald" => event.status === "completed" ? "emerald" : event.status === "overdue" ? "gold" : "dark";

function AgendaList({ events, nowMs, canManage, onOpen }: { events: CalendarEvent[]; nowMs: number; canManage: boolean; onOpen: (e: CalendarEvent) => void }) {
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
            {grouped[bucket].map((event) => {
              const manageable = canManage && isCoaching(event) && event.status !== "completed";
              return (
                <ActionCard
                  key={event.id}
                  accent={accentFor(event)}
                  eyebrow={`${TYPE_LABEL[event.type]} · ${whenLine(event)}`}
                  title={event.title}
                  body=""
                  action={
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] ${STATUS_PILL[event.status]}`}>{event.status.replace("_", " ")}</Badge>
                      {manageable ? (
                        <button type="button" onClick={() => onOpen(event)} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-gold hover:underline">Manage <ArrowRight className="h-3.5 w-3.5" /></button>
                      ) : (
                        <Link href={hrefFor(event)} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-gold hover:underline">Open <ArrowRight className="h-3.5 w-3.5" /></Link>
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Session modal (create + reschedule/cancel) ──────────────────────────────────
type ModalState =
  | { mode: "create"; date: string }
  | { mode: "reschedule"; event: CalendarEvent };

function SessionModal({ state, tenantId, learners, busy, onClose, onCreate, onReschedule, onCancelSession }: {
  state: ModalState | null;
  tenantId: string;
  learners: Array<{ id: string; name: string }>;
  busy: boolean;
  onClose: () => void;
  onCreate: (input: { tenantId: string; learnerUserId: string; title: string; start: string; durationMins: number; type: "coaching" | "follow_up"; notes?: string }) => void;
  onReschedule: (input: { tenantId: string; sessionId: string; start: string; durationMins: number }) => void;
  onCancelSession: (input: { tenantId: string; sessionId: string }) => void;
}) {
  const isReschedule = state?.mode === "reschedule";
  const ev = isReschedule ? state.event : null;

  const [type, setType] = useState<"coaching" | "follow_up">("coaching");
  const [learnerId, setLearnerId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("09:00");
  const [duration, setDuration] = useState<number>(30);
  const [notes, setNotes] = useState<string>("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // Reset the form each time the modal opens (prefill from the event on reschedule).
  useEffect(() => {
    if (!state) return;
    setConfirmingCancel(false);
    if (state.mode === "reschedule") {
      setType(state.event.type === "coaching_follow_up" ? "follow_up" : "coaching");
      setLearnerId(state.event.roleScope.learnerUserId ?? learners[0]?.id ?? "");
      setDate(isoToDateInput(state.event.start));
      setTime(isoToTimeInput(state.event.start));
      setDuration(30);
      setNotes("");
    } else {
      setType("coaching");
      setLearnerId(learners[0]?.id ?? "");
      setDate(state.date);
      setTime("09:00");
      setDuration(30);
      setNotes("");
    }
  }, [state, learners]);

  const canSubmit = Boolean(date) && (isReschedule || Boolean(learnerId));

  const submit = () => {
    const start = toStartIso(date, time);
    if (isReschedule && ev) {
      onReschedule({ tenantId, sessionId: ev.refId, start, durationMins: duration });
    } else {
      onCreate({ tenantId, learnerUserId: learnerId, title: type === "follow_up" ? "Coaching follow-up" : "Coaching 1:1", start, durationMins: duration, type, notes: notes.trim() || undefined });
    }
  };

  const inputClass = "h-9 w-full rounded-lg border border-[#1B303C]/15 bg-white px-3 text-sm text-[#1B303C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40";

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-[30rem]">
        <DialogHeader>
          <DialogTitle>{isReschedule ? "Reschedule session" : "New session"}</DialogTitle>
          <DialogDescription>{isReschedule ? "Move or cancel this coaching session." : "Schedule a coaching session or follow-up."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-[#4A6373]">Type</Label>
            <div role="group" aria-label="Session type" className="inline-flex rounded-full border border-[#1B303C]/12 bg-white/70 p-1">
              {(["coaching", "follow_up"] as const).map((option) => (
                <button key={option} type="button" aria-pressed={type === option} onClick={() => setType(option)} className={`rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors ${type === option ? "bg-[#1B303C] text-white" : "text-[#4A6373] hover:bg-slate-100"}`}>
                  {option === "coaching" ? "Coaching 1:1" : "Follow-up"}
                </button>
              ))}
            </div>
          </div>

          {!isReschedule ? (
            <div className="space-y-1.5">
              <Label htmlFor="cal-learner" className="text-[12px] font-semibold text-[#4A6373]">Coachee</Label>
              <Select value={learnerId} onValueChange={setLearnerId}>
                <SelectTrigger id="cal-learner" className="h-9 rounded-lg border-[#1B303C]/15 bg-white text-sm text-[#1B303C]"><SelectValue placeholder="Select a coachee" /></SelectTrigger>
                <SelectContent>
                  {learners.map((learner) => <SelectItem key={learner.id} value={learner.id}>{learner.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="rounded-lg border border-[#1B303C]/10 bg-white/60 px-3 py-2 text-[13px] text-[#4A6373]">Rescheduling <span className="font-semibold text-[#1B303C]">{ev?.title}</span>.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-date" className="text-[12px] font-semibold text-[#4A6373]">Date (UTC)</Label>
              <input id="cal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-time" className="text-[12px] font-semibold text-[#4A6373]">Time (UTC)</Label>
              <input id="cal-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cal-duration" className="text-[12px] font-semibold text-[#4A6373]">Duration</Label>
            <Select value={String(duration)} onValueChange={(value) => setDuration(Number(value))}>
              <SelectTrigger id="cal-duration" className="h-9 rounded-lg border-[#1B303C]/15 bg-white text-sm text-[#1B303C]"><SelectValue /></SelectTrigger>
              <SelectContent>{DURATIONS.map((mins) => <SelectItem key={mins} value={String(mins)}>{mins} min</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {!isReschedule ? (
            <div className="space-y-1.5">
              <Label htmlFor="cal-notes" className="text-[12px] font-semibold text-[#4A6373]">Notes (optional)</Label>
              <Textarea id="cal-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-lg border-[#1B303C]/15 bg-white text-sm text-[#1B303C]" />
            </div>
          ) : null}

          {isReschedule && confirmingCancel ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5">
              <p className="text-[13px] font-medium text-rose-900">Cancel this session? The coachee is notified and it leaves the calendar.</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" disabled={busy} onClick={() => ev && onCancelSession({ tenantId, sessionId: ev.refId })} className="h-8 rounded-full bg-rose-700 px-3 text-[13px] font-semibold text-white hover:bg-rose-800">Yes, cancel</Button>
                <Button type="button" variant="outline" onClick={() => setConfirmingCancel(false)} className="h-8 rounded-full px-3 text-[13px]">Keep session</Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isReschedule ? (
            <Button type="button" variant="ghost" onClick={() => setConfirmingCancel(true)} className="h-9 rounded-full px-3 text-[13px] font-medium text-rose-700 hover:bg-rose-50 hover:text-rose-800">
              <Trash2 className="mr-1.5 h-4 w-4" /> Cancel session
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 rounded-full px-4 text-sm">Cancel</Button>
            <Button type="button" disabled={!canSubmit || busy} onClick={submit} className="h-9 rounded-full bg-accent-gold px-4 text-sm font-semibold text-[#1B303C] hover:bg-accent-gold/90 disabled:opacity-55">
              {isReschedule ? "Reschedule" : "Schedule session"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Board ───────────────────────────────────────────────────────────────────────
export function CalendarView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const calInput = tenantId ? { tenantId } : {};
  const utils = trpc.useUtils();
  const query = trpc.demo.secureCalendar.useQuery(calInput, { enabled: Boolean(tenantId) });
  const schedulable = trpc.demo.secureSchedulableLearners.useQuery(calInput, { enabled: Boolean(tenantId) });

  const nowMs = demoNow().getTime();
  const [view, setView] = useState<CalendarViewMode>("month");
  const [cursorMs, setCursorMs] = useState(() => startOfUtcDay(demoNow().getTime()));
  const [modal, setModal] = useState<ModalState | null>(null);
  const [dragging, setDragging] = useState<CalendarEvent | null>(null);

  const personas = useMemo(() => personasForGrant(access.data?.grant.role ?? "learner"), [access.data?.grant.role]);
  const [persona, setPersona] = useState<CalendarPersona>("manager");
  useEffect(() => { if (!personas.includes(persona)) setPersona(personas[0]!); }, [personas, persona]);

  // Honor deep-links from the dashboards, e.g. an Upcoming row →
  // /calendar?date=2026-08-10 or the "Coaching" nav → /calendar?view=agenda.
  // Runs once on mount; the params seed the initial view/cursor only.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "month" || v === "week" || v === "agenda") setView(v);
    const d = params.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const ms = Date.parse(`${d}T00:00:00.000Z`);
      if (!Number.isNaN(ms)) setCursorMs(startOfUtcDay(ms));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canManage = Boolean(schedulable.data?.canSchedule);
  const learners = schedulable.data?.learners ?? [];

  const allEvents = query.data ?? [];
  const events = useMemo(() => filterByPersona(allEvents, persona), [allEvents, persona]);
  const byDay = useMemo(() => eventsByDay(events), [events]);

  const step = (delta: number) => setCursorMs((current) => (view === "week" ? addUtcDays(current, delta * 7) : addUtcMonths(current, delta)));
  const goToday = () => setCursorMs(startOfUtcDay(nowMs));
  const closeModal = () => setModal(null);

  // Optimistic reschedule: move the event locally, reconcile with the server on
  // settle, revert on error (invalidate refetches truth).
  const rescheduleCoaching = trpc.demo.secureRescheduleCoachingSession.useMutation({
    onMutate: async (vars) => {
      await utils.demo.secureCalendar.cancel(calInput);
      const prev = utils.demo.secureCalendar.getData(calInput);
      utils.demo.secureCalendar.setData(calInput, (old) => old?.map((e) => (e.refId === vars.sessionId ? { ...e, start: vars.start } : e)));
      return { prev };
    },
    onError: (_e, _v, context) => { if (context?.prev) utils.demo.secureCalendar.setData(calInput, context.prev); toast.error("Could not reschedule"); },
    onSuccess: () => { closeModal(); toast.success("Session rescheduled"); },
    onSettled: () => utils.demo.secureCalendar.invalidate(calInput),
  });
  const rescheduleTraining = trpc.demo.secureRescheduleTrainingDue.useMutation({
    onMutate: async (vars) => {
      await utils.demo.secureCalendar.cancel(calInput);
      const prev = utils.demo.secureCalendar.getData(calInput);
      utils.demo.secureCalendar.setData(calInput, (old) => old?.map((e) => (e.refId === vars.assignmentId ? { ...e, start: vars.dueAt } : e)));
      return { prev };
    },
    onError: (_e, _v, context) => { if (context?.prev) utils.demo.secureCalendar.setData(calInput, context.prev); toast.error("Could not reschedule"); },
    onSettled: () => utils.demo.secureCalendar.invalidate(calInput),
  });
  const createSession = trpc.demo.secureCreateCoachingSession.useMutation({
    onSuccess: () => { closeModal(); void utils.demo.secureCalendar.invalidate(calInput); toast.success("Session scheduled"); },
    onError: () => toast.error("Could not schedule the session"),
  });
  const cancelSession = trpc.demo.secureCancelCoachingSession.useMutation({
    onSuccess: () => { closeModal(); void utils.demo.secureCalendar.invalidate(calInput); toast.success("Session cancelled"); },
    onError: () => toast.error("Could not cancel the session"),
  });
  const busy = rescheduleCoaching.isPending || createSession.isPending || cancelSession.isPending;

  /** Drop an event on a target day → reschedule (keep time-of-day; all-day → midnight). */
  const handleDropDay = (dayMs: number) => {
    const event = dragging;
    setDragging(null);
    if (!event || !tenantId || !isReschedulable(event)) return;
    const orig = new Date(event.start);
    const target = new Date(dayMs);
    if (!event.allDay) target.setUTCHours(orig.getUTCHours(), orig.getUTCMinutes(), 0, 0);
    if (utcDayIndex(dayMs) === utcDayIndex(orig.getTime())) return; // same day, no move
    const start = target.toISOString();
    if (event.type === "training_due") rescheduleTraining.mutate({ tenantId, assignmentId: event.refId, dueAt: start });
    else rescheduleCoaching.mutate({ tenantId, sessionId: event.refId, start });
  };

  return (
    <Surface>
      <WorkspaceShell
        title="Calendar"
        subtitle="Coaching sessions, follow-ups, and training deadlines in one board."
        actions={access.data ? <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-600">{access.data.tenant.name}</Badge> : null}
      >
        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-[#1B303C]/10 bg-white/80 px-3.5 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.06)] xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" aria-label="Previous period" onClick={() => step(-1)} className="h-8 w-8 rounded-full border-[#1B303C]/15 bg-white text-[#1B303C] hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></Button>
              <Button type="button" variant="outline" size="icon" aria-label="Next period" onClick={() => step(1)} className="h-8 w-8 rounded-full border-[#1B303C]/15 bg-white text-[#1B303C] hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button type="button" variant="outline" onClick={goToday} className="h-8 rounded-full border-[#1B303C]/15 bg-white px-3.5 text-sm font-medium text-[#1B303C] hover:bg-slate-100">Today</Button>
            <h2 className="ml-1 text-lg font-semibold tracking-tight text-[#1B303C]">{periodLabel(view, cursorMs)}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4A6373]">Viewing as</span>
              <Select value={persona} onValueChange={(value) => setPersona(value as CalendarPersona)}>
                <SelectTrigger aria-label="Viewing as" className="h-8 w-[7.5rem] rounded-full border-[#1B303C]/15 bg-white text-sm text-[#1B303C]"><SelectValue /></SelectTrigger>
                <SelectContent>{personas.map((option) => <SelectItem key={option} value={option}>{PERSONA_LABEL[option]}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div role="group" aria-label="Calendar view" className="inline-flex rounded-full border border-[#1B303C]/12 bg-white/70 p-1">
              {VIEW_MODES.map((mode) => (
                <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={`rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B303C]/40 ${view === mode ? "bg-[#1B303C] text-white" : "text-[#4A6373] hover:bg-slate-100"}`}>{VIEW_LABEL[mode]}</button>
              ))}
            </div>

            {canManage ? (
              <Button type="button" onClick={() => setModal({ mode: "create", date: isoToDateInput(new Date(cursorMs).toISOString()) })} className="h-8 rounded-full bg-accent-gold px-3.5 text-sm font-semibold text-[#1B303C] hover:bg-accent-gold/90">
                <Plus className="mr-1.5 h-4 w-4" /> New Session
              </Button>
            ) : null}
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
          <MonthGrid cursorMs={cursorMs} nowMs={nowMs} byDay={byDay} canManage={canManage} onOpen={(e) => setModal({ mode: "reschedule", event: e })} onDragStartEvent={setDragging} onDropDay={handleDropDay} onEmptyDay={(dayMs) => setModal({ mode: "create", date: isoToDateInput(new Date(dayMs).toISOString()) })} />
        ) : view === "week" ? (
          <WeekGrid cursorMs={cursorMs} nowMs={nowMs} byDay={byDay} canManage={canManage} onOpen={(e) => setModal({ mode: "reschedule", event: e })} onDragStartEvent={setDragging} onDropDay={handleDropDay} onEmptyDay={(dayMs) => setModal({ mode: "create", date: isoToDateInput(new Date(dayMs).toISOString()) })} />
        ) : (
          <AgendaList events={events} nowMs={nowMs} canManage={canManage} onOpen={(e) => setModal({ mode: "reschedule", event: e })} />
        )}
      </WorkspaceShell>

      {tenantId ? (
        <SessionModal
          state={modal}
          tenantId={tenantId}
          learners={learners}
          busy={busy}
          onClose={closeModal}
          onCreate={(input) => createSession.mutate(input)}
          onReschedule={(input) => rescheduleCoaching.mutate(input)}
          onCancelSession={(input) => cancelSession.mutate(input)}
        />
      ) : null}
    </Surface>
  );
}

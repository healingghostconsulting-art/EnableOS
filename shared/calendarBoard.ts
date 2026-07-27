// ──────────────────────────────────────────────────────────────────────────────
// Calendar board logic (CAL4) — pure, UTC-safe helpers for the Month / Week /
// Agenda views. UI-agnostic so it unit-tests without a DOM: month matrix, week
// days, day bucketing, the "Viewing as" persona lens, the legend color key, and
// period labels. All date math is UTC to match the UTC-anchored feed (an all-day
// event never drifts a day for viewers in negative-offset zones).
// ──────────────────────────────────────────────────────────────────────────────

import type { CalendarEvent, CalendarEventType } from "./calendar";

export type CalendarViewMode = "month" | "week" | "agenda";

/** The "Viewing as" persona lens. A client-side focus filter over the already
 *  role-scoped feed — it only ever narrows what is shown, never reveals more. */
export type CalendarPersona = "manager" | "coach" | "agent";

/** Legend / chip color lane. Overdue wins over type (the at-risk lane). */
export type ChipColorKey = "coaching" | "training" | "follow_up" | "completion" | "overdue";

const DAY_MS = 86_400_000;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** UTC day index (whole days since epoch) for an epoch-ms value. */
export function utcDayIndex(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

/** Color lane from type + overdue status (overdue always wins). */
export function eventColorKey(event: CalendarEvent): ChipColorKey {
  if (event.status === "overdue") return "overdue";
  switch (event.type) {
    case "coaching_session":
      return "coaching";
    case "coaching_follow_up":
      return "follow_up";
    case "training_due":
      return "training";
    case "training_completed":
      return "completion";
    default:
      return "coaching";
  }
}

/** Event types each persona lens focuses on. Manager oversees everything. */
export function personaTypes(persona: CalendarPersona): CalendarEventType[] {
  if (persona === "coach") return ["coaching_session", "coaching_follow_up"];
  if (persona === "agent") return ["training_due", "training_completed"];
  return ["coaching_session", "coaching_follow_up", "training_due", "training_completed"];
}

/** Narrow the feed to a persona lens (never widens visibility). */
export function filterByPersona(events: CalendarEvent[], persona: CalendarPersona): CalendarEvent[] {
  const allowed = new Set<CalendarEventType>(personaTypes(persona));
  return events.filter((event) => allowed.has(event.type));
}

/** The persona lenses a grant may adopt (mirrors the workspace adopt-role rule). */
export function personasForGrant(role: string): CalendarPersona[] {
  switch (role) {
    case "learner":
      return ["agent"];
    case "coach":
      return ["coach", "agent"];
    case "manager":
      return ["manager", "coach", "agent"];
    default:
      // executive / client_admin / platform_admin oversee all three lenses.
      return ["manager", "coach", "agent"];
  }
}

// ── UTC date helpers ──────────────────────────────────────────────────────────

export function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
export function addUtcDays(ms: number, days: number): number {
  return ms + days * DAY_MS;
}
export function startOfUtcMonth(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}
export function addUtcMonths(ms: number, months: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1);
}
/** Sunday on/before the given day (UTC). */
export function startOfUtcWeek(ms: number): number {
  const day = startOfUtcDay(ms);
  return addUtcDays(day, -new Date(day).getUTCDay());
}

export interface DayCell {
  /** UTC midnight of the day. */
  dateMs: number;
  /** Belongs to the cursor's month (vs. the leading/trailing spill days). */
  inMonth: boolean;
  isToday: boolean;
}

/** A 6×7 (Sun–Sat) month matrix for the month containing `cursorMs`. */
export function buildMonthMatrix(cursorMs: number, nowMs: number): DayCell[][] {
  const monthStart = startOfUtcMonth(cursorMs);
  const month = new Date(monthStart).getUTCMonth();
  const gridStart = startOfUtcWeek(monthStart);
  const today = startOfUtcDay(nowMs);
  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const row: DayCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const dateMs = addUtcDays(gridStart, w * 7 + d);
      row.push({
        dateMs,
        inMonth: new Date(dateMs).getUTCMonth() === month,
        isToday: dateMs === today,
      });
    }
    weeks.push(row);
  }
  return weeks;
}

/** The 7 UTC-midnight day starts (Sun–Sat) for the week containing `cursorMs`. */
export function buildWeekDays(cursorMs: number): number[] {
  const start = startOfUtcWeek(cursorMs);
  return Array.from({ length: 7 }, (_, i) => addUtcDays(start, i));
}

/** Group events by their start UTC day index (for O(1) cell/day lookup). */
export function eventsByDay(events: CalendarEvent[]): Map<number, CalendarEvent[]> {
  const map = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const key = utcDayIndex(Date.parse(event.start));
    const list = map.get(key);
    if (list) list.push(event);
    else map.set(key, [event]);
  }
  return map;
}

/** Human period label for the toolbar ("May 2025", "May 4–10, 2025", "Agenda"). */
export function periodLabel(view: CalendarViewMode, cursorMs: number): string {
  const d = new Date(cursorMs);
  if (view === "month") return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (view === "week") {
    const days = buildWeekDays(cursorMs);
    const a = new Date(days[0]!);
    const b = new Date(days[6]!);
    const aMonth = MONTHS[a.getUTCMonth()]!.slice(0, 3);
    const bMonth = MONTHS[b.getUTCMonth()]!.slice(0, 3);
    if (a.getUTCMonth() === b.getUTCMonth()) {
      return `${aMonth} ${a.getUTCDate()}–${b.getUTCDate()}, ${b.getUTCFullYear()}`;
    }
    return `${aMonth} ${a.getUTCDate()} – ${bMonth} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
  }
  return "Agenda";
}

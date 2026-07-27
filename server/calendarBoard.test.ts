import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "../shared/calendar";
import {
  buildMonthMatrix,
  buildWeekDays,
  eventColorKey,
  eventsByDay,
  filterByPersona,
  periodLabel,
  personaTypes,
  personasForGrant,
  utcDayIndex,
} from "../shared/calendarBoard";

// CAL4 — the calendar board's pure logic (month layout, event placement, the role
// lens, view-mode labels). Deterministic: every helper takes explicit UTC inputs.

function ev(partial: Partial<CalendarEvent> & Pick<CalendarEvent, "type" | "start" | "status">): CalendarEvent {
  return {
    id: `${partial.type}:${partial.refId ?? partial.start}`,
    title: "x",
    tenantId: "t",
    refId: partial.refId ?? "r",
    roleScope: { audience: "coach" },
    deepLink: { route: "/x" },
    ...partial,
  } as CalendarEvent;
}

const MAY_15 = Date.UTC(2025, 4, 15); // Thu 2025-05-15

describe("month layout (buildMonthMatrix)", () => {
  const weeks = buildMonthMatrix(MAY_15, MAY_15);

  it("is a 6×7 Sun–Sat matrix (42 cells)", () => {
    expect(weeks).toHaveLength(6);
    for (const row of weeks) expect(row).toHaveLength(7);
    expect(weeks.flat()).toHaveLength(42);
    // Grid starts on the Sunday on/before May 1 2025 → Sun Apr 27.
    expect(weeks[0]![0]!.dateMs).toBe(Date.UTC(2025, 3, 27));
    expect(new Date(weeks[0]![0]!.dateMs).getUTCDay()).toBe(0);
  });

  it("flags in-month days (31 in May) and today", () => {
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(31);
    const today = weeks.flat().filter((c) => c.isToday);
    expect(today).toHaveLength(1);
    expect(today[0]!.dateMs).toBe(MAY_15);
    // Leading spill days belong to April (not in month).
    expect(weeks[0]![0]!.inMonth).toBe(false);
  });
});

describe("event placement (eventsByDay, UTC)", () => {
  it("buckets all-day and timed events on their UTC start day", () => {
    const allDay = ev({ type: "coaching_session", start: "2025-05-10T00:00:00.000Z", status: "scheduled", allDay: true, refId: "a" });
    const timed = ev({ type: "training_due", start: "2025-05-10T18:00:00.000Z", status: "due", refId: "b" });
    const nextDay = ev({ type: "training_due", start: "2025-05-11T02:00:00.000Z", status: "due", refId: "c" });
    const byDay = eventsByDay([allDay, timed, nextDay]);

    const may10 = utcDayIndex(Date.UTC(2025, 4, 10));
    const may11 = utcDayIndex(Date.UTC(2025, 4, 11));
    expect(byDay.get(may10)).toHaveLength(2);
    expect(byDay.get(may11)).toHaveLength(1);
    expect(byDay.get(may10)!.map((e) => e.refId).sort()).toEqual(["a", "b"]);
  });
});

describe("role lens (personaTypes / filterByPersona / personasForGrant)", () => {
  const events = [
    ev({ type: "coaching_session", start: "2025-05-10T00:00:00.000Z", status: "scheduled", refId: "1" }),
    ev({ type: "coaching_follow_up", start: "2025-05-11T00:00:00.000Z", status: "follow_up_due", refId: "2" }),
    ev({ type: "training_due", start: "2025-05-12T09:00:00.000Z", status: "due", refId: "3" }),
    ev({ type: "training_completed", start: "2025-05-01T09:00:00.000Z", status: "completed", refId: "4" }),
  ];

  it("coach lens shows only coaching, agent only training, manager all", () => {
    expect(filterByPersona(events, "coach").map((e) => e.type).sort()).toEqual(["coaching_follow_up", "coaching_session"]);
    expect(filterByPersona(events, "agent").map((e) => e.type).sort()).toEqual(["training_completed", "training_due"]);
    expect(filterByPersona(events, "manager")).toHaveLength(4);
    expect(personaTypes("manager")).toHaveLength(4);
  });

  it("a lens never widens the set — filtered ⊆ input", () => {
    for (const persona of ["manager", "coach", "agent"] as const) {
      const out = filterByPersona(events, persona);
      expect(out.length).toBeLessThanOrEqual(events.length);
      for (const e of out) expect(events).toContain(e);
    }
  });

  it("grants adopt only their permitted lenses", () => {
    expect(personasForGrant("learner")).toEqual(["agent"]);
    expect(personasForGrant("coach")).toEqual(["coach", "agent"]);
    expect(personasForGrant("manager")).toEqual(["manager", "coach", "agent"]);
    expect(personasForGrant("platform_admin")).toEqual(["manager", "coach", "agent"]);
  });
});

describe("legend color key (eventColorKey)", () => {
  it("maps type → lane, with overdue winning over type", () => {
    expect(eventColorKey(ev({ type: "coaching_session", start: "2025-05-10T00:00:00.000Z", status: "scheduled" }))).toBe("coaching");
    expect(eventColorKey(ev({ type: "coaching_follow_up", start: "2025-05-10T00:00:00.000Z", status: "follow_up_due" }))).toBe("follow_up");
    expect(eventColorKey(ev({ type: "training_due", start: "2025-05-10T00:00:00.000Z", status: "due" }))).toBe("training");
    expect(eventColorKey(ev({ type: "training_completed", start: "2025-05-10T00:00:00.000Z", status: "completed" }))).toBe("completion");
    // Overdue on any type routes to the at-risk lane.
    expect(eventColorKey(ev({ type: "coaching_session", start: "2025-05-01T00:00:00.000Z", status: "overdue" }))).toBe("overdue");
    expect(eventColorKey(ev({ type: "training_due", start: "2025-05-01T00:00:00.000Z", status: "overdue" }))).toBe("overdue");
  });
});

describe("view switching (periodLabel / buildWeekDays)", () => {
  it("labels the period per view mode", () => {
    expect(periodLabel("month", MAY_15)).toBe("May 2025");
    expect(periodLabel("week", MAY_15)).toBe("May 11–17, 2025"); // Sun–Sat around Thu May 15
    expect(periodLabel("agenda", MAY_15)).toBe("Agenda");
    // A week that spans a month boundary.
    expect(periodLabel("week", Date.UTC(2025, 4, 1))).toBe("Apr 27 – May 3, 2025");
  });

  it("buildWeekDays is 7 UTC midnights Sun–Sat", () => {
    const days = buildWeekDays(MAY_15);
    expect(days).toHaveLength(7);
    expect(new Date(days[0]!).getUTCDay()).toBe(0);
    expect(new Date(days[6]!).getUTCDay()).toBe(6);
    expect(days[0]).toBe(Date.UTC(2025, 4, 11));
  });
});

describe("board view wiring (source)", () => {
  const source = readFileSync(join(process.cwd(), "client/src/pages/CalendarView.tsx"), "utf8");

  it("wires Month / Week / Agenda modes + toolbar + legend, read-only", () => {
    expect(source).toContain('const VIEW_MODES: CalendarViewMode[] = ["month", "week", "agenda"]');
    expect(source).toContain("function MonthGrid");
    expect(source).toContain("function WeekGrid");
    expect(source).toContain("function AgendaList"); // the CAL3 grouped list, preserved
    expect(source).toContain('aria-label="Viewing as"');
    expect(source).toContain("New Session");
    expect(source).toContain("disabled title={disabledNewSession}"); // read-only this pass
    expect(source).toContain('draggable={false}'); // drag-to-reschedule inert
    expect(source).toContain('aria-pressed={view === mode}'); // keyboard-navigable segmented control
  });
});

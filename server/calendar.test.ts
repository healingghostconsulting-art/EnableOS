import { describe, expect, it } from "vitest";
import {
  buildCalendarEvents,
  type CalendarCoachingInput,
  type CalendarTrainingInput,
} from "../shared/calendar";
import { getTenantCalendar } from "./demoPlatform";

// Fixed clock so overdue/scheduled/due math is deterministic.
const NOW = new Date("2026-07-10T00:00:00.000Z");

const coaching: CalendarCoachingInput[] = [
  // future, date-only → scheduled + all-day
  { id: "cs-1", tenantId: "t1", learnerUserId: "L1", managerUserId: "M1", title: "1:1 with L1", status: "scheduled", dueDate: "2026-07-20" },
  // past follow-up → overdue
  { id: "cs-2", tenantId: "t1", learnerUserId: "L2", managerUserId: "M1", title: "Follow-up L2", status: "follow_up_due", dueDate: "2026-07-05" },
  // completed 1:1 → completed (reminders omit this)
  { id: "cs-3", tenantId: "t1", learnerUserId: "L1", managerUserId: "M1", title: "Prior 1:1", status: "completed", dueDate: "2026-07-01" },
];

const training: CalendarTrainingInput[] = [
  // future, full ISO → due + timed
  { id: "rt-1", tenantId: "t1", learnerUserId: "L1", moduleTitle: "QA Essentials", status: "assigned", dueAt: "2026-07-15T09:00:00.000Z" },
  // past due → overdue
  { id: "rt-2", tenantId: "t1", learnerUserId: "L1", moduleTitle: "Late module", status: "assigned", dueAt: "2026-07-02T09:00:00.000Z" },
  // completed → completed (reminders omit this)
  { id: "rt-3", tenantId: "t1", learnerUserId: "L2", moduleTitle: "Verification", status: "completed", dueAt: "2026-07-08T09:00:00.000Z", completedAt: "2026-07-07T10:00:00.000Z" },
];

const build = (role: "learner" | "coach" | "manager" | "team", learnerUserId?: string) =>
  buildCalendarEvents({ coachingSessions: coaching, retrainingAssignments: training, role, learnerUserId, now: NOW });

describe("buildCalendarEvents (CAL2 derived feed)", () => {
  it("folds sessions + assignments into stable `type:refId` ids with no duplicates", () => {
    const events = build("team");
    expect(events).toHaveLength(6);
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length); // audience de-dup: unique ids
    expect(ids).toContain("coaching_session:cs-1");
    expect(ids).toContain("coaching_follow_up:cs-2");
    expect(ids).toContain("coaching_session:cs-3");
    expect(ids).toContain("training_due:rt-1");
    expect(ids).toContain("training_completed:rt-3");
    // refId equals the source id (== the .ics UID) for every event.
    for (const e of events) expect(e.id).toBe(`${e.type}:${e.refId}`);
  });

  it("de-dupes a source row passed twice (never one-per-audience)", () => {
    const events = buildCalendarEvents({
      coachingSessions: [coaching[0]!, coaching[0]!],
      retrainingAssignments: [],
      role: "team",
      now: NOW,
    });
    expect(events).toHaveLength(1);
  });

  it("scopes a learner feed to only their own events; team/coach see all", () => {
    const team = build("team").map((e) => e.id);
    const coach = build("coach").map((e) => e.id);
    const learnerL1 = build("learner", "L1");

    expect(coach).toEqual(team); // coach = team scope
    // L1 owns cs-1, cs-3, rt-1, rt-2 (not L2's cs-2 / rt-3).
    expect(learnerL1.map((e) => e.id).sort()).toEqual(
      ["coaching_session:cs-1", "coaching_session:cs-3", "training_due:rt-1", "training_due:rt-2"].sort(),
    );
    for (const e of learnerL1) expect(e.roleScope.learnerUserId).toBe("L1");
    // Every learner event is a subset of the team feed (same identities, no invention).
    expect(learnerL1.every((e) => team.includes(e.id))).toBe(true);
  });

  it("normalizes date-only dues to UTC-midnight all-day, and ISO dues to timed", () => {
    const events = build("team");
    const cs1 = events.find((e) => e.id === "coaching_session:cs-1")!;
    expect(cs1.allDay).toBe(true);
    expect(cs1.start).toBe("2026-07-20T00:00:00.000Z");
    expect(cs1.end).toBeUndefined(); // all-day → no end window

    const rt1 = events.find((e) => e.id === "training_due:rt-1")!;
    expect(rt1.allDay).toBe(false);
    expect(rt1.start).toBe("2026-07-15T09:00:00.000Z");
  });

  it("derives status from the clock: scheduled/due future, overdue past, completed", () => {
    const byId = Object.fromEntries(build("team").map((e) => [e.id, e]));
    expect(byId["coaching_session:cs-1"]!.status).toBe("scheduled"); // future
    expect(byId["coaching_follow_up:cs-2"]!.status).toBe("overdue"); // past follow-up
    expect(byId["coaching_session:cs-3"]!.status).toBe("completed");
    expect(byId["training_due:rt-1"]!.status).toBe("due"); // future
    expect(byId["training_due:rt-2"]!.status).toBe("overdue"); // past
    expect(byId["training_completed:rt-3"]!.status).toBe("completed");
  });

  it("routes deep-links to the viewing role's surface", () => {
    const learnerLink = build("learner", "L1").find((e) => e.type === "coaching_session")!.deepLink;
    expect(learnerLink).toMatchObject({ route: "/learner", tab: "coaching" });
    const managerLink = build("manager").find((e) => e.type === "training_due")!.deepLink;
    expect(managerLink).toMatchObject({ route: "/manager", tab: "interventions" });
  });

  it("includes the two states the reminder engine omits (scheduled-not-due + completed)", () => {
    const ids = build("team").map((e) => e.id);
    expect(ids).toContain("coaching_session:cs-1"); // scheduled, not imminent
    expect(ids).toContain("coaching_session:cs-3"); // completed 1:1
    expect(ids).toContain("training_completed:rt-3"); // completed training
  });
});

describe("getTenantCalendar (tenant isolation + role from grant)", () => {
  it("returns only the queried tenant's events", () => {
    const atlas = getTenantCalendar("atlas-operations", "coach");
    expect(atlas.length).toBeGreaterThan(0);
    expect(atlas.every((e) => e.tenantId === "atlas-operations")).toBe(true);

    const lighthouse = getTenantCalendar("lighthouse-finance", "coach");
    expect(lighthouse.every((e) => e.tenantId === "lighthouse-finance")).toBe(true);

    // Cross-tenant isolation: no shared event identities.
    const atlasIds = new Set(atlas.map((e) => e.id));
    expect(lighthouse.some((e) => atlasIds.has(e.id))).toBe(false);
  });

  it("scopes a learner grant to their own events; coach grant sees the whole tenant", () => {
    const coach = getTenantCalendar("atlas-operations", "coach");
    const learner = getTenantCalendar("atlas-operations", "learner");

    const coachIds = new Set(coach.map((e) => e.id));
    expect(learner.every((e) => coachIds.has(e.id))).toBe(true); // learner ⊆ team
    expect(learner.length).toBeLessThanOrEqual(coach.length);
    // All learner-feed events share one subject learner.
    const learnerIds = new Set(learner.map((e) => e.roleScope.learnerUserId));
    expect(learnerIds.size).toBeLessThanOrEqual(1);
  });
});

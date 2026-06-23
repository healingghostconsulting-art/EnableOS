import { afterEach, describe, expect, it } from "vitest";
import { buildReminders, COACHING_CADENCE_DAYS, KNOWLEDGE_CHECK_PASS } from "../shared/reminders";
import { setDemoNow } from "../shared/demoClock";

const NOW = new Date("2026-06-18T12:00:00Z");
const days = (n: number): string => new Date(NOW.getTime() + n * 86_400_000).toISOString();
const dateOnly = (n: number): string => days(n).slice(0, 10);

afterEach(() => setDemoNow(null));

describe("buildReminders — triggers fire against a pinned demoNow", () => {
  it("training_due: due/overdue math + severity, completed skipped", () => {
    const r = buildReminders("learner", {
      now: NOW,
      retrainingAssignments: [
        { id: "a1", status: "assigned", moduleTitle: "QA Calibration", dueAt: days(-2) },
        { id: "a2", status: "in_progress", moduleTitle: "Verification", dueAt: days(2) },
        { id: "a3", status: "assigned", moduleTitle: "Listening", dueAt: days(10) },
        { id: "a4", status: "completed", moduleTitle: "Done", dueAt: days(-5) },
      ],
    });
    expect(r.find((x) => x.id === "rem-training-a1")).toMatchObject({ type: "training_due", severity: "critical", overdue: true });
    expect(r.find((x) => x.id === "rem-training-a2")).toMatchObject({ severity: "warning", overdue: false });
    expect(r.find((x) => x.id === "rem-training-a3")).toMatchObject({ severity: "info", overdue: false });
    expect(r.find((x) => x.id === "rem-training-a4")).toBeUndefined();
  });

  it("coaching_follow_up + scheduled: coach gets imminent only, learner gets own far one", () => {
    const ctx = {
      now: NOW,
      learners: [{ id: "u1", name: "Nina Patel" }],
      coachingSessions: [
        { id: "c1", learnerUserId: "u1", title: "Follow-up", status: "follow_up_due", dueDate: dateOnly(-1) },
        { id: "c2", learnerUserId: "u1", title: "Soon", status: "scheduled", dueDate: dateOnly(2) },
        { id: "c3", learnerUserId: "u1", title: "Far", status: "scheduled", dueDate: dateOnly(10) },
      ],
    };
    const coach = buildReminders("coach", ctx);
    expect(coach.find((x) => x.id === "rem-followup-c1")).toMatchObject({ type: "coaching_follow_up", severity: "critical", overdue: true });
    expect(coach.find((x) => x.id === "rem-oneonone-c2")).toMatchObject({ type: "one_on_one_scheduled", severity: "warning" });
    expect(coach.find((x) => x.id === "rem-oneonone-c3")).toBeUndefined();
    const learner = buildReminders("learner", ctx);
    expect(learner.find((x) => x.id === "rem-oneonone-c3")).toMatchObject({ type: "one_on_one_scheduled", severity: "info" });
  });

  it("knowledge_check_failed: only below the pass bar", () => {
    const r = buildReminders("coach", {
      now: NOW,
      learners: [
        { id: "u1", name: "Low", quizFirstPassPct: KNOWLEDGE_CHECK_PASS - 1 },
        { id: "u2", name: "OK", quizFirstPassPct: KNOWLEDGE_CHECK_PASS },
      ],
    });
    expect(r.find((x) => x.id === "rem-quiz-u1")).toMatchObject({ type: "knowledge_check_failed", subject: "Low" });
    expect(r.find((x) => x.id === "rem-quiz-u2")).toBeUndefined();
  });

  it("scope trim (NOTIF2): performance / KPI / readiness signals no longer generate reminders", () => {
    // Inputs that used to fire readiness_red / kpi_red — low readiness, a high-severity
    // performance signal, and a red KPI band. None of them should produce a reminder now.
    const ctxExtras = {
      now: NOW,
      learners: [{ id: "u1", name: "Nina", readinessScore: 50, quizFirstPassPct: 80 }],
      performanceSignals: [
        { id: "s1", userId: "u1", label: "QA score", value: 81, target: 90, severity: "high", source: "QA", occurredAt: days(-2) },
      ],
      kpiProfile: {
        clientId: "t", clientName: "T",
        scorecards: [{ id: "sc", title: "SC", rows: [
          { metric: "Abandonment Rate %", goal: "≤ 5%", definition: "", measurement: { currentValue: 8.1, unit: "%", direction: "lower_is_better", target: 5, green: [0, 5], yellow: [5, 7] } },
        ] }],
      },
    } as any;
    const manager = buildReminders("manager", ctxExtras);
    const coach = buildReminders("coach", ctxExtras);
    for (const reminder of [...manager, ...coach]) {
      expect(["readiness_red", "kpi_red"]).not.toContain(reminder.type);
    }
    // No reminder is sourced from those (removed) signals.
    expect(manager.some((x) => /^rem-(readiness|signal|kpi)-/.test(x.id))).toBe(false);
    expect(coach.some((x) => /^rem-(readiness|signal|kpi)-/.test(x.id))).toBe(false);
  });

  it("coaching_cadence_gap: latest log per subject vs the window", () => {
    const r = buildReminders("coach", {
      now: NOW,
      learners: [{ id: "u1", name: "Nina" }, { id: "u2", name: "Avery" }, { id: "u3", name: "Maya" }],
      weeklyCoachingLogs: [
        { subjectUserId: "u1", sessionDate: dateOnly(-(COACHING_CADENCE_DAYS + 2)) },
        { subjectUserId: "u2", sessionDate: dateOnly(-2) },
        { subjectUserId: "u3", sessionDate: dateOnly(-30) },
        { subjectUserId: "u3", sessionDate: dateOnly(-1) }, // newer log clears the gap
      ],
    });
    expect(r.find((x) => x.id === "rem-cadence-u1")).toMatchObject({ type: "coaching_cadence_gap", overdue: true });
    expect(r.find((x) => x.id === "rem-cadence-u2")).toBeUndefined();
    expect(r.find((x) => x.id === "rem-cadence-u3")).toBeUndefined();
  });

  it("folds static notifications in as announcements with mapped severity", () => {
    const r = buildReminders("manager", {
      now: NOW,
      notifications: [{ id: "note-1", title: "Follow-up due", detail: "Coaching follow-up for Nina.", priority: "warning", createdAt: days(-1) }],
    });
    expect(r.find((x) => x.id === "rem-note-note-1")).toMatchObject({ type: "announcement", severity: "warning", subject: "Follow-up due" });
  });

  it("sorts critical first and tags read:false", () => {
    const r = buildReminders("manager", {
      now: NOW,
      retrainingAssignments: [{ id: "a1", status: "assigned", moduleTitle: "X", dueAt: days(-1) }],
      notifications: [{ id: "n1", title: "FYI", detail: "", priority: "info", createdAt: days(-1) }],
    });
    expect(r[0].severity).toBe("critical");
    expect(r.every((x) => x.read === false)).toBe(true);
  });

  it("falls back to setDemoNow() when ctx.now is omitted", () => {
    setDemoNow(NOW);
    const r = buildReminders("learner", { retrainingAssignments: [{ id: "a1", status: "assigned", moduleTitle: "X", dueAt: days(-1) }] });
    expect(r.find((x) => x.id === "rem-training-a1")).toMatchObject({ overdue: true, severity: "critical" });
  });
});

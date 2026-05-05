import { describe, expect, it } from "vitest";
import { buildRetrainingHistoryCsv, buildRetrainingHistoryExportRows, filterRetrainingHistoryByWindow } from "./retrainingHistory";

describe("filterRetrainingHistoryByWindow", () => {
  const now = new Date("2026-05-05T12:00:00Z").getTime();
  const assignments = [
    {
      id: "week-item",
      moduleTitle: "Workflow handoff accuracy under pressure",
      journeyTitle: "Workflow Precision",
      skillFocus: "Handoff control",
      requestedByRole: "manager",
      completedAt: "2026-05-03T16:30:00Z",
    },
    {
      id: "month-item",
      moduleTitle: "Active listening in high-friction interactions",
      journeyTitle: "Service Foundations",
      skillFocus: "Listening precision",
      requestedByRole: "coach",
      completedAt: "2026-04-19T18:05:00Z",
    },
    {
      id: "stale-item",
      moduleTitle: "Older refresher",
      journeyTitle: "Archive",
      skillFocus: "Legacy skill",
      requestedByRole: "manager",
      completedAt: "2026-03-01T12:00:00Z",
    },
  ];

  it("returns only the last 7 days of retraining history for the week window", () => {
    const filtered = filterRetrainingHistoryByWindow(assignments, "week", now);

    expect(filtered).toEqual([
      expect.objectContaining({ id: "week-item" }),
    ]);
  });

  it("returns the last 31 days of retraining history for the month window", () => {
    const filtered = filterRetrainingHistoryByWindow(assignments, "month", now);

    expect(filtered).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "week-item" }),
        expect.objectContaining({ id: "month-item" }),
      ]),
    );
    expect(filtered).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "stale-item" }),
      ]),
    );
  });

  it("builds export rows with completion dates and assigning roles", () => {
    const rows = buildRetrainingHistoryExportRows(assignments.slice(0, 2));

    expect(rows).toEqual([
      {
        module_title: "Workflow handoff accuracy under pressure",
        journey_title: "Workflow Precision",
        skill_focus: "Handoff control",
        completion_date: "2026-05-03T16:30:00Z",
        assigning_role: "manager",
      },
      {
        module_title: "Active listening in high-friction interactions",
        journey_title: "Service Foundations",
        skill_focus: "Listening precision",
        completion_date: "2026-04-19T18:05:00Z",
        assigning_role: "coach",
      },
    ]);
  });

  it("builds CSV output for the filtered retraining export", () => {
    const csv = buildRetrainingHistoryCsv(assignments.slice(0, 1));

    expect(csv).toContain("module_title,journey_title,skill_focus,completion_date,assigning_role");
    expect(csv).toContain("\"Workflow handoff accuracy under pressure\"");
    expect(csv).toContain("\"2026-05-03T16:30:00Z\"");
    expect(csv).toContain("\"manager\"");
  });
});

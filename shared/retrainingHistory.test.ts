import { describe, expect, it } from "vitest";
import { filterRetrainingHistoryByWindow } from "./retrainingHistory";

describe("filterRetrainingHistoryByWindow", () => {
  const now = new Date("2026-05-05T12:00:00Z").getTime();
  const assignments = [
    {
      id: "week-item",
      completedAt: "2026-05-03T16:30:00Z",
    },
    {
      id: "month-item",
      completedAt: "2026-04-19T18:05:00Z",
    },
    {
      id: "stale-item",
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
});

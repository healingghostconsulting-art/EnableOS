import { describe, expect, it } from "vitest";
import {
  leaderboardConfig,
  leaderboardReward,
  rankLeaderboard,
  scoreBreakdown,
  scoreLearner,
  scoreLearnerRecord,
  toLearnerSignals,
  type LearnerSignals,
} from "../shared/leaderboardConfig";
import { getLearnerDashboard, getManagerDashboard } from "./demoPlatform";

describe("leaderboard scoring model", () => {
  it("keeps the signal weights balanced (sum to 1)", () => {
    const { completions, quiz, readiness, streaks } = leaderboardConfig.weights;
    expect(completions + quiz + readiness + streaks).toBeCloseTo(1, 10);
    expect(leaderboardConfig.completionsMix.journeyProgress + leaderboardConfig.completionsMix.completedRatio).toBeCloseTo(1, 10);
    expect(leaderboardConfig.weights).toEqual({ completions: 0.3, quiz: 0.25, readiness: 0.25, streaks: 0.2 });
  });

  it("computes points from normalized signals via the weighted model", () => {
    const signals: LearnerSignals = {
      journeyProgressPct: 80,
      completedRatioPct: 90,
      quizFirstPassPct: 70,
      readinessScore: 75,
      onTimeStreakWeeks: 8, // full streak
    };
    // completions = 0.6*80 + 0.4*90 = 84; streaks = 100
    // weighted = 0.30*84 + 0.25*70 + 0.25*75 + 0.20*100 = 81.45 → ×10 → 815 (round half up)
    expect(scoreLearner(signals)).toBe(815);
  });

  it("caps the streak contribution at the target weeks", () => {
    const base: LearnerSignals = { journeyProgressPct: 50, completedRatioPct: 50, quizFirstPassPct: 50, readinessScore: 50, onTimeStreakWeeks: 8 };
    expect(scoreLearner({ ...base, onTimeStreakWeeks: 20 })).toBe(scoreLearner(base));
  });

  it("reads new per-learner fields defensively so an un-seeded learner still scores", () => {
    // Only readinessScore seeded today; the rest fall back to 0.
    expect(toLearnerSignals({ id: "u-learn-2", name: "Emily Ross", readinessScore: 74 })).toEqual({
      journeyProgressPct: 0,
      completedRatioPct: 0,
      quizFirstPassPct: 0,
      readinessScore: 74,
      onTimeStreakWeeks: 0,
    });
    // readiness-only: 0.25 * 74 * 10 = 185
    expect(scoreLearnerRecord({ id: "u-learn-2", name: "Emily Ross", readinessScore: 74 })).toBe(185);
    // A completely empty record contributes 0, never NaN.
    expect(scoreLearnerRecord({ id: "x", name: "Unseeded" })).toBe(0);
  });

  it("ranks records into ordered standings, highest points first", () => {
    const standings = rankLeaderboard([
      { id: "a", name: "Nina Patel", team: "Core Service Delivery", readinessScore: 72 },
      { id: "b", name: "Avery Chen", team: "Core Service Delivery", readinessScore: 76, completedRatioPct: 90, quizFirstPassPct: 65, journeyProgressPct: 71, onTimeStreakWeeks: 7 },
      { id: "c", name: "Maya Johnson", team: "Core Service Delivery", readinessScore: 68 },
    ]);
    expect(standings.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(standings[0].name).toBe("Avery Chen");
    expect(standings[0].points).toBeGreaterThan(standings[1].points);
    expect(standings.every((e) => Number.isFinite(e.points))).toBe(true);
  });

  it("exposes an org-configured, display-only reward callout (LEAD3)", () => {
    expect(leaderboardReward.enabled).toBe(true);
    expect(typeof leaderboardReward.text).toBe("string");
    expect(leaderboardReward.text.length).toBeGreaterThan(0);
    expect(leaderboardReward.text).toContain("gift card");
  });

  it("exposes the per-group breakdown behind the composite (for the four-signal row)", () => {
    const signals: LearnerSignals = { journeyProgressPct: 80, completedRatioPct: 90, quizFirstPassPct: 70, readinessScore: 75, onTimeStreakWeeks: 8 };
    expect(scoreBreakdown(signals)).toEqual({ completions: 84, quiz: 70, readiness: 75, streaks: 100 });
    const [entry] = rankLeaderboard([{ id: "a", name: "Avery Chen", ...signals }]);
    expect(entry.breakdown).toEqual({ completions: 84, quiz: 70, readiness: 75, streaks: 100 });
    expect(entry.points).toBe(815);
  });
});

describe("leaderboard seed projection (LEAD2)", () => {
  const board = getLearnerDashboard().leaderboard; // default tenant = atlas-operations

  it("exposes a read-only team + org roster with the current learner id", () => {
    expect(board.currentLearnerId).toBe("u-learn-1"); // Nina Patel
    expect(board.teamRoster).toHaveLength(3); // Core Service Delivery
    expect(board.orgRoster).toHaveLength(11); // Core 3 + Resolution 4 + Digital Care 4
    expect(board.teamRoster.every((r) => r.team === "Core Service Delivery")).toBe(true);
  });

  it("ranks the seeded team standings with the current learner mid-pack", () => {
    const team = rankLeaderboard(board.teamRoster);
    expect(team.map((e) => e.name)).toEqual(["Avery Chen", "Nina Patel", "Maya Johnson"]);
    const me = team.find((e) => e.id === board.currentLearnerId)!;
    expect(me.rank).toBe(2);
    expect(me.points).toBe(723);
  });

  it("ranks org-wide standings across all seeded learners", () => {
    const org = rankLeaderboard(board.orgRoster);
    expect(org[0].name).toBe("Owen Bradley"); // top scorer, 885
    expect(org.find((e) => e.id === board.currentLearnerId)!.rank).toBe(6);
    expect(org.every((e) => e.points > 0)).toBe(true);
  });

  it("exposes the same org roster to the manager board, groupable into coach teams (LEAD5)", () => {
    const managerBoard = getManagerDashboard().leaderboard;
    expect(managerBoard.orgRoster).toHaveLength(11);
    expect(managerBoard.directReportId).toBe("u-learn-1");
    // Group by the learner team field → three coach teams.
    const teams = new Set(managerBoard.orgRoster.map((r) => r.team));
    expect([...teams].sort()).toEqual(["Core Service Delivery", "Digital Care", "Resolution Operations"]);
    // Org-wide ranking matches the learner board's (same roster + helper).
    expect(rankLeaderboard(managerBoard.orgRoster)[0].name).toBe("Owen Bradley");
  });
});

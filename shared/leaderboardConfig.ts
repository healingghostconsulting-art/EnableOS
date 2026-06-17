// ──────────────────────────────────────────────────────────────────────────────
// LEADERBOARD CONFIG — composite training-performance scoring for the learner board.
//
// Weights and tuning live here, never in the component. The score combines four
// signal groups (completions, quiz, readiness, streaks), each normalized to 0–100,
// then scaled to display "points". Per-learner inputs are read defensively (?? 0)
// so the board renders before Manus finishes seeding the new per-learner fields.
//
// Manus owns the seed (server/demoPlatform.ts). The new per-learner fields it adds
// to each learner record should use the names in LeaderboardLearnerRecord below:
//   journeyProgressPct · completedRatioPct · quizFirstPassPct · onTimeStreakWeeks
// (readinessScore already exists on the seeded user).
// ──────────────────────────────────────────────────────────────────────────────

export type LeaderboardSignal = "completions" | "quiz" | "readiness" | "streaks";

export interface LeaderboardConfig {
  /** Per-group weights — must sum to 1. Tune here, never in the component. */
  weights: Record<LeaderboardSignal, number>;
  /** Weighted score is 0–100; multiply to display "points". */
  pointsScale: number;
  /** Weeks of on-time completion that map to a full streak score of 100. */
  streakTargetWeeks: number;
  /** Sub-mix inside the completions group (sums to 1). */
  completionsMix: { journeyProgress: number; completedRatio: number };
}

export const leaderboardConfig: LeaderboardConfig = {
  weights: { completions: 0.3, quiz: 0.25, readiness: 0.25, streaks: 0.2 },
  pointsScale: 10,
  streakTargetWeeks: 8,
  completionsMix: { journeyProgress: 0.6, completedRatio: 0.4 },
};

/** Normalized 0–100 inputs for one learner. */
export interface LearnerSignals {
  journeyProgressPct: number; // 0–100
  completedRatioPct: number; // 0–100 (completed ÷ assigned modules/retraining)
  quizFirstPassPct: number; // 0–100 (or 100 − missRate)
  readinessScore: number; // 0–100
  onTimeStreakWeeks: number; // raw weeks of on-time completion
}

/**
 * Structural shape the accessor reads off a seeded learner record. Every
 * performance field is optional — Manus seeds them incrementally, and the
 * accessor falls back to 0 so the board renders before seeding completes.
 * Decoupled from the server's DemoUser type on purpose (shared must not import
 * server seed code).
 */
export interface LeaderboardLearnerRecord {
  id: string;
  name: string;
  team?: string;
  tenantId?: string;
  readinessScore?: number;
  journeyProgressPct?: number;
  completedRatioPct?: number;
  quizFirstPassPct?: number;
  onTimeStreakWeeks?: number;
}

/** Per-group normalized scores (0–100) behind the composite points. */
export type LeaderboardBreakdown = Record<LeaderboardSignal, number>;

export type ScoredLearner = {
  id: string;
  name: string;
  team?: string;
  signals: LearnerSignals;
  breakdown: LeaderboardBreakdown;
  points: number;
};

export interface LeaderboardEntry extends ScoredLearner {
  /** 1-based position after sorting by points (descending). */
  rank: number;
}

const clamp100 = (value: number): number => Math.max(0, Math.min(100, value));

/** Per-group normalized scores (0–100) — the four bars behind the composite. */
export function scoreBreakdown(signals: LearnerSignals, cfg: LeaderboardConfig = leaderboardConfig): LeaderboardBreakdown {
  return {
    completions: clamp100(
      cfg.completionsMix.journeyProgress * signals.journeyProgressPct +
        cfg.completionsMix.completedRatio * signals.completedRatioPct,
    ),
    quiz: clamp100(signals.quizFirstPassPct),
    readiness: clamp100(signals.readinessScore),
    streaks: Math.min(signals.onTimeStreakWeeks / cfg.streakTargetWeeks, 1) * 100,
  };
}

/** Compute display points from normalized signals using the weighted model. */
export function scoreLearner(signals: LearnerSignals, cfg: LeaderboardConfig = leaderboardConfig): number {
  const b = scoreBreakdown(signals, cfg);
  const weighted =
    cfg.weights.completions * b.completions +
    cfg.weights.quiz * b.quiz +
    cfg.weights.readiness * b.readiness +
    cfg.weights.streaks * b.streaks;

  return Math.round(weighted * cfg.pointsScale);
}

/**
 * Map a seeded learner record → normalized LearnerSignals, reading each new
 * per-learner field defensively so an un-seeded learner contributes 0 for that
 * group rather than breaking the board.
 */
export function toLearnerSignals(record: LeaderboardLearnerRecord): LearnerSignals {
  return {
    journeyProgressPct: record.journeyProgressPct ?? 0,
    completedRatioPct: record.completedRatioPct ?? 0,
    quizFirstPassPct: record.quizFirstPassPct ?? 0,
    readinessScore: record.readinessScore ?? 0,
    onTimeStreakWeeks: record.onTimeStreakWeeks ?? 0,
  };
}

/** Points for a single seeded learner record (accessor + scoreLearner). */
export function scoreLearnerRecord(record: LeaderboardLearnerRecord, cfg: LeaderboardConfig = leaderboardConfig): number {
  return scoreLearner(toLearnerSignals(record), cfg);
}

/** Record → scored entry (signals + points), without a rank yet. */
export function toLeaderboardEntry(record: LeaderboardLearnerRecord, cfg: LeaderboardConfig = leaderboardConfig): ScoredLearner {
  const signals = toLearnerSignals(record);
  return {
    id: record.id,
    name: record.name,
    team: record.team,
    signals,
    breakdown: scoreBreakdown(signals, cfg),
    points: scoreLearner(signals, cfg),
  };
}

/**
 * Rank a set of learner records into ordered standings: highest points first,
 * ties broken by name for a stable order, with a 1-based rank assigned.
 */
export function rankLeaderboard(records: LeaderboardLearnerRecord[], cfg: LeaderboardConfig = leaderboardConfig): LeaderboardEntry[] {
  return records
    .map((record) => toLeaderboardEntry(record, cfg))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

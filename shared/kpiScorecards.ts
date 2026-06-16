// ──────────────────────────────────────────────────────────────────────────────
// KPI SCORECARDS — per-client, data-driven targets for the WFM & KPI training
// AND the Manager Ops team KPI Red/Yellow/Green board.
//
// The WFM & KPI deck's three "KPI Scorecard" slides are rendered LIVE from this
// file instead of baked into slide images, so each client's goals can be edited
// here without re-exporting PowerPoint. The same rows optionally carry a
// machine-comparable `measurement` (current value + numeric target + R/Y/G band
// boundaries + direction) that powers the Manager Ops KPI board. The training
// slides only read `goal`, so they render unchanged whether or not a measurement
// is present.
//
// To customize for a new client:
//   1. Copy `aspirusKpiProfile`, rename it, set clientId/clientName.
//   2. Edit the `goal` values (and `measurement`s) for that client.
//   3. Register it in `clientKpiProfiles` below, keyed by clientId.
//   4. (Optional) map a tenant to that clientId in `tenantClientId`.
// Everything else (definitions, layout) stays shared. See docs/IMPORTING_SLIDES.md.
// ──────────────────────────────────────────────────────────────────────────────

/** Optimization direction — drives status semantics and labelling. */
export type KpiDirection = "higher_is_better" | "lower_is_better" | "in_range";

/** Red/Yellow/Green status. */
export type KpiStatus = "green" | "yellow" | "red";

export interface KpiMeasurement {
  /** Current team value, machine-comparable (one row per KPI for the whole team). */
  currentValue: number;
  /** Display unit for the value cell: "%", "sec", "min", etc. */
  unit: string;
  /** Optimization direction — documents intent and labels the metric. */
  direction: KpiDirection;
  /** Numeric target (single goal for higher/lower; range midpoint for in_range). */
  target: number;
  /** Inclusive [low, high] values scored GREEN (on/above target). */
  green: [number, number];
  /** Inclusive [low, high] values scored YELLOW (watch zone just outside green). */
  yellow: [number, number];
}

export interface KpiRow {
  /** Metric name, e.g. "Service Level". */
  metric: string;
  /** Client target/goal — the value that varies per client. e.g. "80% / 30 sec". */
  goal: string;
  /** Plain-language definition (shared across clients unless overridden). */
  definition: string;
  /** Optional live measurement for the team KPI board. Absent → board shows "—". */
  measurement?: KpiMeasurement;
}

export interface KpiScorecardData {
  /** Stable id referenced by the slide manifest (`scorecard` field). */
  id: string;
  /** Heading shown above the table. */
  title: string;
  rows: KpiRow[];
}

export interface ClientKpiProfile {
  clientId: string;
  clientName: string;
  /** Small footnote shown under each scorecard (e.g. data source). */
  note?: string;
  scorecards: KpiScorecardData[];
}

// ── Aspirus (the deck this training was built from) ─────────────────────────────
export const aspirusKpiProfile: ClientKpiProfile = {
  clientId: "aspirus",
  clientName: "Aspirus",
  note: "Internal company data",
  scorecards: [
    {
      id: "patient-service",
      title: "KPI Scorecard — Patient Service",
      rows: [
        { metric: "Service Level", goal: "80% / 30 sec", definition: "Percentage of transactions answered within a specific timeframe; for Aspirus the timeframe is 30 seconds.", measurement: { currentValue: 78, unit: "%", direction: "higher_is_better", target: 80, green: [80, 100], yellow: [72, 80] } },
        { metric: "ASA (Avg Speed of Answer)", goal: "30 sec", definition: "Total wait time of answered calls ÷ total calls answered; time from call arrival to connection with a live scheduler.", measurement: { currentValue: 27, unit: "sec", direction: "lower_is_better", target: 30, green: [0, 30], yellow: [30, 40] } },
        { metric: "Abandonment Rate %", goal: "≤ 5%", definition: "Callers who hung up after IVR but before reaching a live agent ÷ total calls offered.", measurement: { currentValue: 8.1, unit: "%", direction: "lower_is_better", target: 5, green: [0, 5], yellow: [5, 7] } },
      ],
    },
    {
      id: "efficiency",
      title: "KPI Scorecard — Efficiency",
      rows: [
        { metric: "AHT (Avg Handle Time)", goal: "≤ 4.00 min", definition: "Average time to handle a transaction including talk time, hold time, and after-call work.", measurement: { currentValue: 4.2, unit: "min", direction: "lower_is_better", target: 4, green: [0, 4], yellow: [4, 4.5] } },
        { metric: "Call Transfer Rate %", goal: "< 10%", definition: "Calls transferred to another scheduler/department/third party ÷ total calls handled.", measurement: { currentValue: 8.5, unit: "%", direction: "lower_is_better", target: 10, green: [0, 10], yellow: [10, 13] } },
        { metric: "Occupancy Rate", goal: "75%–85%", definition: "(Talk time + after-call work) ÷ Ready time (talk + ACW + available).", measurement: { currentValue: 82, unit: "%", direction: "in_range", target: 80, green: [75, 85], yellow: [70, 90] } },
        { metric: "Utilization Rate", goal: "> 85%", definition: "Ready time (talk + ACW + available) ÷ (Total logged-in time − lunch).", measurement: { currentValue: 83, unit: "%", direction: "higher_is_better", target: 85, green: [85, 100], yellow: [80, 85] } },
      ],
    },
    {
      id: "wfm",
      title: "KPI Scorecard — WFM",
      rows: [
        { metric: "Forecast Accuracy", goal: "> 95% (±5%)", definition: "Difference between forecasted values and the actual outcomes for a particular time frame.", measurement: { currentValue: 96, unit: "%", direction: "higher_is_better", target: 95, green: [95, 105], yellow: [90, 95] } },
        { metric: "Staffing Adherence", goal: "> 90%", definition: "How closely an employee's actual work time aligns with their assigned schedule.", measurement: { currentValue: 91, unit: "%", direction: "higher_is_better", target: 90, green: [90, 100], yellow: [85, 90] } },
        { metric: "Shrinkage", goal: "< 20%", definition: "% of paid time schedulers are not available for primary tasks.", measurement: { currentValue: 23, unit: "%", direction: "lower_is_better", target: 20, green: [0, 20], yellow: [20, 25] } },
        { metric: "Absenteeism", goal: "7%–10%", definition: "Percentage of staff not present during their scheduled shifts.", measurement: { currentValue: 13, unit: "%", direction: "in_range", target: 8.5, green: [7, 10], yellow: [5, 12] } },
        { metric: "Attrition", goal: "< 25%", definition: "Reduction in schedulers due to voluntary or involuntary separation.", measurement: { currentValue: 21, unit: "%", direction: "lower_is_better", target: 25, green: [0, 25], yellow: [25, 30] } },
      ],
    },
  ],
};

// ── Default template — blank goals for a brand-new client to fill in ────────────
export const defaultKpiProfile: ClientKpiProfile = {
  clientId: "default",
  clientName: "Your organization",
  note: "Set this client's targets in shared/kpiScorecards.ts",
  scorecards: aspirusKpiProfile.scorecards.map((card) => ({
    ...card,
    // Blank the goals and drop demo measurements until the new client's data is set.
    rows: card.rows.map((row) => ({ ...row, goal: "—", measurement: undefined })),
  })),
};

export const clientKpiProfiles: Record<string, ClientKpiProfile> = {
  aspirus: aspirusKpiProfile,
  default: defaultKpiProfile,
};

/** Optional tenant → client mapping so the right targets show per workspace. */
export const tenantClientId: Record<string, string> = {
  // "some-tenant-id": "aspirus",
};

/** Resolve a client's KPI profile; falls back to Aspirus (the deck's source client). */
export function getKpiProfile(clientId?: string | null): ClientKpiProfile {
  if (clientId && clientKpiProfiles[clientId]) return clientKpiProfiles[clientId];
  return aspirusKpiProfile;
}

/** A single scorecard within a profile by id (matches the manifest `scorecard` field). */
export function getKpiScorecard(profile: ClientKpiProfile, scorecardId: string): KpiScorecardData | undefined {
  return profile.scorecards.find((card) => card.id === scorecardId);
}

/**
 * Classify a measurement as Red/Yellow/Green from value vs the band boundaries.
 * Green is checked first, so shared boundary values resolve to the better status.
 * The green/yellow ranges already encode `direction`, so this works for
 * higher-is-better, lower-is-better, and in-range KPIs uniformly.
 */
export function classifyKpi(measurement: KpiMeasurement): KpiStatus {
  const within = (value: number, [low, high]: [number, number]) => value >= low && value <= high;
  if (within(measurement.currentValue, measurement.green)) return "green";
  if (within(measurement.currentValue, measurement.yellow)) return "yellow";
  return "red";
}

/** Current value formatted for display, e.g. "78%", "27 sec", "4.2 min". */
export function formatKpiValue(measurement: KpiMeasurement): string {
  return measurement.unit === "%" ? `${measurement.currentValue}%` : `${measurement.currentValue} ${measurement.unit}`;
}

/** Human-readable status label (paired with an icon — never color alone). */
export function kpiStatusLabel(status: KpiStatus): string {
  return status === "green" ? "On target" : status === "yellow" ? "Watch" : "Off target";
}

export interface KpiRollup {
  green: number;
  yellow: number;
  red: number;
  total: number;
  /** Worst-case team status: red if any red, else yellow if any yellow, else green. */
  overall: KpiStatus;
}

/** Aggregate every measured KPI in a profile into an overall team RAG rollup. */
export function rollupKpiProfile(profile: ClientKpiProfile): KpiRollup {
  const counts: Record<KpiStatus, number> = { green: 0, yellow: 0, red: 0 };
  for (const card of profile.scorecards) {
    for (const row of card.rows) {
      if (!row.measurement) continue;
      counts[classifyKpi(row.measurement)] += 1;
    }
  }
  const total = counts.green + counts.yellow + counts.red;
  const overall: KpiStatus = counts.red > 0 ? "red" : counts.yellow > 0 ? "yellow" : "green";
  return { ...counts, total, overall };
}

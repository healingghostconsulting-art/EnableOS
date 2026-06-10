// ──────────────────────────────────────────────────────────────────────────────
// KPI SCORECARDS — per-client, data-driven targets for the WFM & KPI training.
//
// The WFM & KPI deck's three "KPI Scorecard" slides are rendered LIVE from this
// file instead of baked into slide images, so each client's goals can be edited
// here without re-exporting PowerPoint.
//
// To customize for a new client:
//   1. Copy `aspirusKpiProfile`, rename it, set clientId/clientName.
//   2. Edit the `goal` values (and rows) for that client.
//   3. Register it in `clientKpiProfiles` below, keyed by clientId.
//   4. (Optional) map a tenant to that clientId in `tenantClientId`.
// Everything else (definitions, layout) stays shared. See docs/IMPORTING_SLIDES.md.
// ──────────────────────────────────────────────────────────────────────────────

export interface KpiRow {
  /** Metric name, e.g. "Service Level". */
  metric: string;
  /** Client target/goal — the value that varies per client. e.g. "80% / 30 sec". */
  goal: string;
  /** Plain-language definition (shared across clients unless overridden). */
  definition: string;
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
        { metric: "Service Level", goal: "80% / 30 sec", definition: "Percentage of transactions answered within a specific timeframe; for Aspirus the timeframe is 30 seconds." },
        { metric: "ASA (Avg Speed of Answer)", goal: "30 sec", definition: "Total wait time of answered calls ÷ total calls answered; time from call arrival to connection with a live scheduler." },
        { metric: "Abandonment Rate %", goal: "≤ 5%", definition: "Callers who hung up after IVR but before reaching a live agent ÷ total calls offered." },
      ],
    },
    {
      id: "efficiency",
      title: "KPI Scorecard — Efficiency",
      rows: [
        { metric: "AHT (Avg Handle Time)", goal: "≤ 4.00 min", definition: "Average time to handle a transaction including talk time, hold time, and after-call work." },
        { metric: "Call Transfer Rate %", goal: "< 10%", definition: "Calls transferred to another scheduler/department/third party ÷ total calls handled." },
        { metric: "Occupancy Rate", goal: "75%–85%", definition: "(Talk time + after-call work) ÷ Ready time (talk + ACW + available)." },
        { metric: "Utilization Rate", goal: "> 85%", definition: "Ready time (talk + ACW + available) ÷ (Total logged-in time − lunch)." },
      ],
    },
    {
      id: "wfm",
      title: "KPI Scorecard — WFM",
      rows: [
        { metric: "Forecast Accuracy", goal: "> 95% (±5%)", definition: "Difference between forecasted values and the actual outcomes for a particular time frame." },
        { metric: "Staffing Adherence", goal: "> 90%", definition: "How closely an employee's actual work time aligns with their assigned schedule." },
        { metric: "Shrinkage", goal: "< 20%", definition: "% of paid time schedulers are not available for primary tasks." },
        { metric: "Absenteeism", goal: "7%–10%", definition: "Percentage of staff not present during their scheduled shifts." },
        { metric: "Attrition", goal: "< 25%", definition: "Reduction in schedulers due to voluntary or involuntary separation." },
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
    rows: card.rows.map((row) => ({ ...row, goal: "—" })),
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

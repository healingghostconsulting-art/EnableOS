export type RetrainingHistoryWindow = "week" | "month";

export type RetrainingHistoryAssignment = {
  moduleTitle?: string;
  journeyTitle?: string;
  skillFocus?: string;
  requestedByRole?: string;
  completedAt?: string;
  dueAt?: string;
  createdAt?: string;
};

export type RetrainingHistoryExportRow = {
  module_title: string;
  journey_title: string;
  skill_focus: string;
  completion_date: string;
  assigning_role: string;
};

const WINDOW_DAYS: Record<RetrainingHistoryWindow, number> = {
  week: 7,
  month: 31,
};

export function filterRetrainingHistoryByWindow<T extends RetrainingHistoryAssignment>(
  assignments: T[],
  window: RetrainingHistoryWindow,
  now = Date.now(),
) {
  const windowStart = now - (WINDOW_DAYS[window] * 24 * 60 * 60 * 1000);

  return assignments.filter((assignment) => {
    const effectiveDate = assignment.completedAt ?? assignment.dueAt ?? assignment.createdAt;
    if (!effectiveDate) {
      return false;
    }

    const timestamp = new Date(effectiveDate).getTime();
    if (Number.isNaN(timestamp)) {
      return false;
    }

    return timestamp >= windowStart && timestamp <= now;
  });
}

export function buildRetrainingHistoryExportRows<T extends RetrainingHistoryAssignment>(assignments: T[]): RetrainingHistoryExportRow[] {
  return assignments.map((assignment) => ({
    module_title: assignment.moduleTitle ?? "Untitled module",
    journey_title: assignment.journeyTitle ?? "Unassigned journey",
    skill_focus: assignment.skillFocus ?? "Not specified",
    completion_date: assignment.completedAt ?? assignment.dueAt ?? assignment.createdAt ?? "Unavailable",
    assigning_role: assignment.requestedByRole ?? "unknown",
  }));
}

function escapeCsvValue(value: string) {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

export function buildRetrainingHistoryCsv<T extends RetrainingHistoryAssignment>(assignments: T[]) {
  const rows = buildRetrainingHistoryExportRows(assignments);
  const header = ["module_title", "journey_title", "skill_focus", "completion_date", "assigning_role"];
  const lines = [header.join(",")];

  rows.forEach((row) => {
    lines.push([
      row.module_title,
      row.journey_title,
      row.skill_focus,
      row.completion_date,
      row.assigning_role,
    ].map(escapeCsvValue).join(","));
  });

  return lines.join("\n");
}

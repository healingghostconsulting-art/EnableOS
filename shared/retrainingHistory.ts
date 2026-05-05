export type RetrainingHistoryWindow = "week" | "month";

export type RetrainingHistoryAssignment = {
  completedAt?: string;
  dueAt?: string;
  createdAt?: string;
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

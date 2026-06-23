// ──────────────────────────────────────────────────────────────────────────────
// DEMO CLOCK — a single "now" anchor shared by the seed and the reminder engine.
//
// The date-bearing seed records (coaching due dates, retraining due dates,
// performance-signal timestamps, weekly-log dates) are expressed as OFFSETS from
// demoNow() so they always produce a realistic mix of upcoming / due-soon /
// overdue relative to whenever the server starts — instead of drifting into the
// past as fixed 2026 literals.
//
// demoNow() defaults to real time; setDemoNow(date) pins it so tests get
// deterministic due/overdue math. buildReminders() reads ctx.now ?? demoNow().
// ──────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

let override: Date | null = null;

/** Pin the demo clock (tests). Pass null to restore real time. */
export function setDemoNow(value: Date | null): void {
  override = value;
}

/** The current demo "now" — the pinned override if set, else real time. */
export function demoNow(): Date {
  return override ? new Date(override.getTime()) : new Date();
}

/** Full ISO timestamp `days` from the anchor (negative = past). */
export function isoDaysFromNow(days: number, base: Date = demoNow()): string {
  return new Date(base.getTime() + days * DAY_MS).toISOString();
}

/** Date-only `YYYY-MM-DD` string `days` from the anchor (for date-only fields). */
export function dateOnlyDaysFromNow(days: number, base: Date = demoNow()): string {
  return new Date(base.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

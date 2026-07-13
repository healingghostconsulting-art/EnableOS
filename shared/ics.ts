// ──────────────────────────────────────────────────────────────────────────────
// iCalendar (.ics) builder for dated reminders (DELIVER2).
//
// Produces a single-VEVENT VCALENDAR with METHOD:REQUEST so an email client
// renders it as a meeting invite. UID is the originating record id (source.refId)
// so a later send with a higher SEQUENCE updates the same event rather than
// creating a duplicate. All timestamps are emitted in UTC (Zulu) — the demo clock
// is UTC-anchored, so no TZID tables are needed.
// ──────────────────────────────────────────────────────────────────────────────

import type { Reminder } from "./reminders";

export interface IcsEvent {
  /** Stable event id — use the reminder's source.refId so updates re-target it. */
  uid: string;
  title: string;
  description?: string;
  /** Event start. Emitted as UTC. */
  start: Date;
  /** Length in minutes (default 30). */
  durationMinutes?: number;
  /** Bump on each re-send of the same uid so clients treat it as an update. */
  sequence?: number;
  organizerEmail?: string;
  organizerName?: string;
  attendeeEmail?: string;
  attendeeName?: string;
  method?: "REQUEST" | "CANCEL";
  /** Generation timestamp (DTSTAMP). Defaults to `start` for deterministic output. */
  stamp?: Date;
}

const DAY_MS = 86_400_000;

/** RFC 5545 text escaping: backslash, semicolon, comma, and newlines. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Format a Date as a UTC iCal timestamp: 20260712T090000Z. */
export function formatIcsUtc(date: Date): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Build a complete .ics document (CRLF line endings, per spec). */
export function buildIcs(event: IcsEvent): string {
  const duration = event.durationMinutes ?? 30;
  const end = new Date(event.start.getTime() + duration * 60_000);
  const stamp = event.stamp ?? event.start;
  const method = event.method ?? "REQUEST";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EnableOS//Notification Delivery//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${escapeText(event.uid)}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `DTSTAMP:${formatIcsUtc(stamp)}`,
    `DTSTART:${formatIcsUtc(event.start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.organizerEmail) {
    const cn = event.organizerName ? `;CN=${escapeText(event.organizerName)}` : "";
    lines.push(`ORGANIZER${cn}:mailto:${event.organizerEmail}`);
  }
  if (event.attendeeEmail) {
    const cn = event.attendeeName ? `;CN=${escapeText(event.attendeeName)}` : "";
    lines.push(`ATTENDEE${cn};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${event.attendeeEmail}`);
  }
  lines.push(`STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

/** Reminder types that carry a real calendar date and warrant an invite. */
export const DATED_REMINDER_TYPES: ReadonlySet<Reminder["type"]> = new Set<Reminder["type"]>([
  "one_on_one_scheduled",
  "coaching_follow_up",
]);

export interface IcsForReminderOptions {
  attendeeEmail?: string;
  attendeeName?: string;
  organizerEmail?: string;
  organizerName?: string;
  sequence?: number;
  durationMinutes?: number;
  stamp?: Date;
}

/**
 * Build an .ics for a dated reminder, or null when the reminder has no calendar
 * date (non-dated type or missing dueAt). Never guesses a date.
 */
export function icsForReminder(reminder: Reminder, options: IcsForReminderOptions = {}): string | null {
  if (!DATED_REMINDER_TYPES.has(reminder.type) || !reminder.dueAt) return null;
  const start = new Date(reminder.dueAt);
  if (Number.isNaN(start.getTime())) return null;
  return buildIcs({
    uid: reminder.source.refId,
    title: reminder.subject,
    description: reminder.reason,
    start,
    durationMinutes: options.durationMinutes ?? 30,
    sequence: options.sequence ?? 0,
    organizerEmail: options.organizerEmail,
    organizerName: options.organizerName,
    attendeeEmail: options.attendeeEmail,
    attendeeName: options.attendeeName,
    method: "REQUEST",
    stamp: options.stamp,
  });
}

/** Exposed for callers that want the default event window without a Reminder. */
export const DEFAULT_EVENT_MINUTES = 30;
export const ONE_DAY_MS = DAY_MS;

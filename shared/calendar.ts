// ──────────────────────────────────────────────────────────────────────────────
// Derived calendar read model (CAL2).
//
// A calendar is a pure projection of dated coaching + training records — no new
// persistence. buildCalendarEvents() folds coaching sessions and retraining
// assignments into one typed CalendarEvent[] keyed `type:refId` (so the same
// source row never duplicates across audiences), normalizes date-only dues into
// ISO + allDay, and reuses the reminder deep-links (routed for the viewing role).
//
// Adds the two states the reminder engine omits: scheduled-not-yet-due sessions
// (reminders only nudge when imminent) and completed items (reminders drop them).
//
// Structural inputs (only the fields used) keep shared/ decoupled from server/ —
// CoachingSession / RetrainingAssignment satisfy these by shape.
// ──────────────────────────────────────────────────────────────────────────────

import { demoNow } from "./demoClock";

export type CalendarEventType =
  | "coaching_session" // a scheduled (or completed) 1:1
  | "coaching_follow_up" // a follow-up that is due
  | "training_due" // an assigned retraining not yet completed
  | "training_completed"; // a completed retraining

export type CalendarAudience = "learner" | "coach" | "manager";
export type CalendarStatus = "scheduled" | "follow_up_due" | "due" | "overdue" | "completed";

/** The role the feed is being built for. Drives scoping + deep-link routing. */
export type CalendarViewerRole = "learner" | "coach" | "manager" | "team";

export interface CalendarDeepLink {
  route: string;
  tab?: string;
  sectionId?: string;
}

export interface CalendarEventRoleScope {
  /** Primary owner lens (a UI hint, not the visibility rule). */
  audience: CalendarAudience;
  /** The subject learner — the visibility key for learner-scoped feeds. */
  learnerUserId?: string;
  /** The manager/coach on the coaching row, when present. */
  managerUserId?: string;
}

export interface CalendarEvent {
  /** Stable identity `${type}:${refId}` — dedupes the same source across audiences. */
  id: string;
  type: CalendarEventType;
  title: string;
  /** ISO 8601 start. Date-only sources are normalized to UTC midnight + allDay. */
  start: string;
  /** ISO end for timed spans (coaching); omitted for point-in-time due/complete marks. */
  end?: string;
  allDay?: boolean;
  roleScope: CalendarEventRoleScope;
  tenantId: string;
  /** Source record id — equals the .ics UID for the same event. */
  refId: string;
  deepLink: CalendarDeepLink;
  status: CalendarStatus;
}

/** Structural view of a CoachingSession — only the fields the calendar needs. */
export interface CalendarCoachingInput {
  id: string;
  tenantId: string;
  learnerUserId: string;
  managerUserId: string;
  title: string;
  status: "scheduled" | "follow_up_due" | "completed";
  dueDate: string;
}

/** Structural view of a RetrainingAssignment — only the fields the calendar needs. */
export interface CalendarTrainingInput {
  id: string;
  tenantId: string;
  learnerUserId: string;
  moduleTitle: string;
  status: "assigned" | "in_progress" | "completed";
  dueAt: string;
  completedAt?: string;
}

export interface BuildCalendarInput {
  coachingSessions: CalendarCoachingInput[];
  retrainingAssignments: CalendarTrainingInput[];
  role: CalendarViewerRole;
  /** Required to scope a learner feed to their own events. */
  learnerUserId?: string;
  now?: Date;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** Default coaching meeting window (minutes) for timed sessions. */
export const DEFAULT_COACHING_MINUTES = 30;

/** Normalize a date-only (`YYYY-MM-DD`) or ISO string to `{ start: ISO, allDay }`. */
export function normalizeStart(value: string): { start: string; allDay: boolean } {
  if (DATE_ONLY.test(value)) return { start: `${value}T00:00:00.000Z`, allDay: true };
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? { start: value, allDay: false } : { start: parsed.toISOString(), allDay: false };
}

/** Deep-link a calendar event to the surface the viewing role acts on it from. */
function deepLinkFor(type: CalendarEventType, role: CalendarViewerRole): CalendarDeepLink {
  const isCoaching = type === "coaching_session" || type === "coaching_follow_up";
  if (role === "learner") {
    if (isCoaching) return { route: "/learner", tab: "coaching" };
    return type === "training_completed" ? { route: "/learner", tab: "journey" } : { route: "/learner", tab: "reengagements" };
  }
  if (role === "coach") {
    return isCoaching ? { route: "/coach", tab: "coaching", sectionId: "coach-coaching-lane" } : { route: "/coach", tab: "coaching" };
  }
  // manager + team (executive / client_admin / platform_admin) → the oversight lanes.
  if (isCoaching) return { route: "/manager", tab: "coaching", sectionId: "manager-coaching-lane" };
  return { route: "/manager", tab: "interventions", sectionId: "manager-interventions-lane" };
}

/**
 * Fold coaching sessions + retraining assignments into a role-scoped, de-duped,
 * date-normalized CalendarEvent[]. Purely derived — no persistence.
 */
export function buildCalendarEvents(input: BuildCalendarInput): CalendarEvent[] {
  const nowMs = (input.now ?? demoNow()).getTime();
  const byId = new Map<string, CalendarEvent>();

  const add = (event: CalendarEvent) => {
    // `type:refId` is unique per source row, so this only ever guards against a
    // caller passing the same record twice — never collapses distinct events.
    if (!byId.has(event.id)) byId.set(event.id, event);
  };

  for (const session of input.coachingSessions) {
    const type: CalendarEventType = session.status === "follow_up_due" ? "coaching_follow_up" : "coaching_session";
    const { start, allDay } = normalizeStart(session.dueDate);
    const startMs = new Date(start).getTime();
    const status: CalendarStatus =
      session.status === "completed"
        ? "completed"
        : startMs < nowMs
          ? "overdue"
          : session.status === "follow_up_due"
            ? "follow_up_due"
            : "scheduled";
    add({
      id: `${type}:${session.id}`,
      type,
      title: session.title,
      start,
      // A dated (non-all-day) session gets a default window; an all-day one has no end.
      end: allDay ? undefined : new Date(startMs + DEFAULT_COACHING_MINUTES * 60_000).toISOString(),
      allDay,
      roleScope: { audience: "coach", learnerUserId: session.learnerUserId, managerUserId: session.managerUserId },
      tenantId: session.tenantId,
      refId: session.id,
      deepLink: deepLinkFor(type, input.role),
      status,
    });
  }

  for (const assignment of input.retrainingAssignments) {
    const completed = assignment.status === "completed";
    const type: CalendarEventType = completed ? "training_completed" : "training_due";
    const { start, allDay } = normalizeStart(completed ? assignment.completedAt ?? assignment.dueAt : assignment.dueAt);
    const status: CalendarStatus = completed ? "completed" : new Date(start).getTime() < nowMs ? "overdue" : "due";
    add({
      id: `${type}:${assignment.id}`,
      type,
      title: completed ? `${assignment.moduleTitle} completed` : `${assignment.moduleTitle} due`,
      start,
      allDay,
      roleScope: { audience: completed ? "manager" : "learner", learnerUserId: assignment.learnerUserId },
      tenantId: assignment.tenantId,
      refId: assignment.id,
      deepLink: deepLinkFor(type, input.role),
      status,
    });
  }

  let events = Array.from(byId.values());
  // Role scope: learner sees only their own; coach / manager / team see all.
  if (input.role === "learner") {
    events = events.filter((event) => event.roleScope.learnerUserId === input.learnerUserId);
  }
  return events.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}

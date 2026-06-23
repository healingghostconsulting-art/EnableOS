// ──────────────────────────────────────────────────────────────────────────────
// REMINDER ENGINE — one typed model every surface consumes (NOTIF1).
//
// buildReminders(audience, ctx) derives reminders from coaching + training
// signals only (NOTIF2 scope trim): retraining due dates, coaching follow-ups,
// scheduled one-on-ones, coaching cadence, and quiz pass rate. Telephony/WFM
// signals (performance, KPI bands, readiness) are intentionally NOT alerted on —
// the seed data stays, but no reminders are generated from it. Inputs are
// structural (decoupled from server types). Due/overdue math uses ctx.now ??
// demoNow(). Static seed notifications fold in as `announcement` reminders. The
// `read` flag powers the nav unread count.
// ──────────────────────────────────────────────────────────────────────────────

import { demoNow } from "./demoClock";

/** quizFirstPassPct below this is a failed knowledge check. */
export const KNOWLEDGE_CHECK_PASS = 60;
/** A coaching log older than this many days is a cadence gap. */
export const COACHING_CADENCE_DAYS = 7;
/** A due date within this many days (and not past) is "due soon". */
export const DUE_SOON_DAYS = 3;

export type ReminderType =
  | "training_due"
  | "coaching_follow_up"
  | "one_on_one_scheduled"
  | "knowledge_check_failed"
  | "coaching_cadence_gap"
  | "announcement";

export type ReminderAudience = "coach" | "manager" | "learner";
export type ReminderSeverity = "info" | "warning" | "critical";

export interface ReminderDeepLink {
  route: string;
  tab?: string;
  sectionId?: string;
}

export interface Reminder {
  id: string;
  type: ReminderType;
  audience: ReminderAudience;
  severity: ReminderSeverity;
  /** What the reminder is about (learner name, module, KPI). */
  subject: string;
  /** Person the reminder concerns, when applicable. */
  subjectUserId?: string;
  /** Human sentence explaining why it fired. */
  reason: string;
  /** Deadline/target ISO date, when the signal has one. */
  dueAt?: string;
  overdue: boolean;
  /** Where to act on it. */
  deepLink?: ReminderDeepLink;
  /** Originating record. */
  source: { kind: ReminderType; refId: string };
  createdAt: string;
  read: boolean;
}

/** Structural inputs — pass whatever the dashboard payload has; all optional. */
export interface ReminderContext {
  now?: Date;
  coachingSessions?: any[];
  retrainingAssignments?: any[];
  weeklyCoachingLogs?: any[];
  learners?: any[];
  notifications?: any[];
}

const DAY_MS = 86_400_000;
const SEVERITY_RANK: Record<ReminderSeverity, number> = { critical: 0, warning: 1, info: 2 };
const PRIORITY_TO_SEVERITY: Record<string, ReminderSeverity> = { critical: "critical", warning: "warning", info: "info" };

const daysUntil = (iso: string, now: Date): number => Math.round((new Date(iso).getTime() - now.getTime()) / DAY_MS);
const isPast = (iso: string, now: Date): boolean => new Date(iso).getTime() < now.getTime();

function dueSeverity(iso: string, now: Date): ReminderSeverity {
  const days = daysUntil(iso, now);
  if (days < 0) return "critical";
  if (days <= DUE_SOON_DAYS) return "warning";
  return "info";
}

function duePhrase(iso: string, now: Date): string {
  const days = daysUntil(iso, now);
  if (days < 0) return `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "due today";
  return `due in ${days} day${days === 1 ? "" : "s"}`;
}

const nameOf = (learners: any[] | undefined, id: string | undefined): string =>
  learners?.find((entry) => entry.id === id)?.name ?? "the learner";

/** Derive the reminders for one audience from the available signals. */
export function buildReminders(audience: ReminderAudience, ctx: ReminderContext): Reminder[] {
  const now = ctx.now ?? demoNow();
  const learners = ctx.learners ?? [];
  const out: Reminder[] = [];

  const coachOrLearnerCoachingRoute: ReminderDeepLink =
    audience === "coach" ? { route: "/coach", tab: "coaching", sectionId: "coach-coaching-lane" } : { route: "/learner", tab: "coaching" };

  // ── Training due (learner: own; manager: report's) ────────────────────────────
  if (audience === "learner" || audience === "manager") {
    for (const a of ctx.retrainingAssignments ?? []) {
      if (!a?.dueAt || a.status === "completed") continue;
      const who = audience === "manager" ? `${nameOf(learners, a.learnerUserId)}'s` : "Your";
      out.push({
        id: `rem-training-${a.id}`,
        type: "training_due",
        audience,
        severity: dueSeverity(a.dueAt, now),
        subject: a.moduleTitle ?? "Assigned retraining",
        subjectUserId: a.learnerUserId,
        reason: `${who} ${a.moduleTitle ?? "retraining"} is ${duePhrase(a.dueAt, now)}.`,
        dueAt: a.dueAt,
        overdue: isPast(a.dueAt, now),
        deepLink: audience === "manager" ? { route: "/manager", tab: "interventions", sectionId: "manager-interventions-lane" } : { route: "/learner", tab: "reengagements" },
        source: { kind: "training_due", refId: a.id },
        createdAt: a.createdAt ?? now.toISOString(),
        read: false,
      });
    }
  }

  // ── Coaching follow-ups + scheduled 1:1s ──────────────────────────────────────
  for (const s of ctx.coachingSessions ?? []) {
    if (!s?.dueDate) continue;
    const learnerName = nameOf(learners, s.learnerUserId);
    if (s.status === "follow_up_due" && (audience === "coach" || audience === "learner")) {
      out.push({
        id: `rem-followup-${s.id}`,
        type: "coaching_follow_up",
        audience,
        severity: isPast(s.dueDate, now) ? "critical" : "warning",
        subject: audience === "coach" ? learnerName : (s.title ?? "Coaching follow-up"),
        subjectUserId: s.learnerUserId,
        reason: `${audience === "coach" ? `${learnerName}'s` : "Your"} coaching follow-up "${s.title}" is ${duePhrase(s.dueDate, now)}.`,
        dueAt: s.dueDate,
        overdue: isPast(s.dueDate, now),
        deepLink: coachOrLearnerCoachingRoute,
        source: { kind: "coaching_follow_up", refId: s.id },
        createdAt: s.dueDate,
        read: false,
      });
    } else if (s.status === "scheduled") {
      const soon = daysUntil(s.dueDate, now) <= DUE_SOON_DAYS;
      // Coach: only nudge when the scheduled session is imminent. Learner: always surface their own upcoming 1:1.
      if ((audience === "coach" && soon) || audience === "learner") {
        out.push({
          id: `rem-oneonone-${s.id}`,
          type: "one_on_one_scheduled",
          audience,
          severity: isPast(s.dueDate, now) ? "warning" : soon ? "warning" : "info",
          subject: audience === "coach" ? learnerName : (s.title ?? "One-on-one"),
          subjectUserId: s.learnerUserId,
          reason: `${audience === "coach" ? `${learnerName}'s` : "Your"} one-on-one "${s.title}" is ${duePhrase(s.dueDate, now)}.`,
          dueAt: s.dueDate,
          overdue: isPast(s.dueDate, now),
          deepLink: coachOrLearnerCoachingRoute,
          source: { kind: "one_on_one_scheduled", refId: s.id },
          createdAt: s.dueDate,
          read: false,
        });
      }
    }
  }

  // ── Knowledge-check failures (learner: own; coach: team) ───────────────────────
  if (audience === "learner" || audience === "coach") {
    for (const l of learners) {
      if (typeof l?.quizFirstPassPct !== "number" || l.quizFirstPassPct >= KNOWLEDGE_CHECK_PASS) continue;
      out.push({
        id: `rem-quiz-${l.id}`,
        type: "knowledge_check_failed",
        audience,
        severity: "warning",
        subject: audience === "coach" ? l.name : "Knowledge check",
        subjectUserId: l.id,
        reason: `${audience === "coach" ? `${l.name}'s` : "Your"} first-pass knowledge-check rate is ${l.quizFirstPassPct}% (below the ${KNOWLEDGE_CHECK_PASS}% bar).`,
        overdue: false,
        deepLink: audience === "coach" ? { route: "/coach", tab: "coaching" } : { route: "/learner", tab: "journey" },
        source: { kind: "knowledge_check_failed", refId: l.id },
        createdAt: now.toISOString(),
        read: false,
      });
    }
  }

  // ── Coaching cadence gaps (coach: team; manager: report) — latest log too old ──
  if (audience === "coach" || audience === "manager") {
    const latestBySubject = new Map<string, string>();
    for (const log of ctx.weeklyCoachingLogs ?? []) {
      if (!log?.sessionDate) continue;
      const prev = latestBySubject.get(log.subjectUserId);
      if (!prev || new Date(log.sessionDate).getTime() > new Date(prev).getTime()) {
        latestBySubject.set(log.subjectUserId, log.sessionDate);
      }
    }
    for (const [subjectUserId, sessionDate] of Array.from(latestBySubject.entries())) {
      const gapDays = Math.round((now.getTime() - new Date(sessionDate).getTime()) / DAY_MS);
      if (gapDays <= COACHING_CADENCE_DAYS) continue;
      const learnerName = nameOf(learners, subjectUserId);
      out.push({
        id: `rem-cadence-${subjectUserId}`,
        type: "coaching_cadence_gap",
        audience,
        severity: "warning",
        subject: learnerName,
        subjectUserId,
        reason: `${learnerName}'s last coaching log was ${gapDays} days ago — past the ${COACHING_CADENCE_DAYS}-day cadence.`,
        overdue: true,
        deepLink: audience === "manager" ? { route: "/manager", tab: "coaching", sectionId: "manager-coaching-lane" } : { route: "/coach", tab: "coaching", sectionId: "coach-coaching-lane" },
        source: { kind: "coaching_cadence_gap", refId: subjectUserId },
        createdAt: now.toISOString(),
        read: false,
      });
    }
  }

  // ── Fold static seed notifications in as pre-authored announcements ───────────
  for (const note of ctx.notifications ?? []) {
    if (!note?.id) continue;
    out.push({
      id: `rem-note-${note.id}`,
      type: "announcement",
      audience,
      severity: PRIORITY_TO_SEVERITY[note.priority] ?? "info",
      subject: note.title ?? "Announcement",
      reason: note.detail ?? note.title ?? "",
      overdue: false,
      source: { kind: "announcement", refId: note.id },
      createdAt: note.createdAt ?? now.toISOString(),
      read: false,
    });
  }

  return out.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
      a.id.localeCompare(b.id),
  );
}

/** Count of unread reminders (for the upcoming nav badge). */
export function unreadReminderCount(reminders: Reminder[]): number {
  return reminders.filter((reminder) => !reminder.read).length;
}

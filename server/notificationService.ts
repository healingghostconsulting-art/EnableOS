// ──────────────────────────────────────────────────────────────────────────────
// Notification delivery service (DELIVER3) — the orchestration that ties the
// DELIVER2 foundation together and the event hooks the demo mutations call.
//
// deliverReminder(): reminder → resolve recipient → preference check → outbox
// dedup → render → provider.sendEmail (or sendCalendarInvite + .ics for dated
// types). Idempotency-keyed on (source.refId + recipient + day) so re-runs never
// double-send. StubProvider stays the default, so nothing leaves the process.
//
// Sends are fire-and-forget from the mutations (tracked so tests/shutdown can
// flush). This module imports demoPlatform only inside functions — the cycle
// (demoPlatform → events → service → demoPlatform) is call-time, never top-level.
// ──────────────────────────────────────────────────────────────────────────────

import type { Reminder, ReminderAudience, ReminderType } from "../shared/reminders";
import { demoNow, isoDaysFromNow } from "../shared/demoClock";
import { renderReminderEmail, type TemplateBranding } from "../shared/notificationTemplates";
import { icsForReminder, DATED_REMINDER_TYPES, buildIcs } from "../shared/ics";
import { resolveRecipient } from "./notificationRecipients";
import { getNotificationDelivery, type EmailMessage } from "./notificationDelivery";
import {
  getNotificationOutboxRepository,
  getNotificationPreferencesRepository,
  isDeliveryAllowed,
  buildOutboxKey,
  type OutboxStatus,
} from "./notificationRepositories";
import { getTenantBranding, type DemoAccessGrant, type DemoRole } from "./demoPlatform";
import { ENV } from "./_core/env";

/** CAN-SPAM physical mailing address stamped into every email footer. */
export const CHCG_PHYSICAL_ADDRESS = "CHCG Enablement, 500 W Madison St, Suite 1000, Chicago, IL 60661, USA";

export type DeliveryOutcomeStatus = OutboxStatus | "deduped";

export interface DeliveryOutcome {
  status: DeliveryOutcomeStatus;
  reason?: string;
  recipient?: string;
  outboxKey?: string;
}

export interface DeliverOptions {
  /** The viewing grant, when a real viewer is present. Event sends synthesize one. */
  viewerGrant?: DemoAccessGrant | null;
  now?: Date;
}

// ── fire-and-forget tracking (mirror of the repositories' pending sets) ────────
const pending = new Set<Promise<unknown>>();
function track<T>(promise: Promise<T>): Promise<T> {
  pending.add(promise);
  void promise.finally(() => pending.delete(promise));
  return promise;
}
/** Await all in-flight sends (tests / graceful shutdown). */
export async function flushNotifications(): Promise<void> {
  await Promise.all(Array.from(pending));
}

/** Event sends have no interactive viewer — synthesize a grant from the audience. */
function synthGrant(audience: ReminderAudience, tenantId: string): DemoAccessGrant {
  return { openId: `event-${audience}`, tenantId, role: audience as DemoRole, name: "" };
}

function periodOf(reminder: Reminder, now: Date): string {
  const basis = reminder.dueAt ?? reminder.createdAt ?? now.toISOString();
  return basis.slice(0, 10); // YYYY-MM-DD → daily idempotency window
}

export function buildUnsubscribeUrl(userId: string, tenantId: string): string {
  const base = (ENV.appPublicUrl || "").replace(/\/+$/, "");
  const query = `?user=${encodeURIComponent(userId)}&tenant=${encodeURIComponent(tenantId)}`;
  return `${base}/notifications/unsubscribe${query}`;
}

/**
 * Deliver a single reminder. Suppressions (no recipient / opted out) are logged
 * and NOT written to the outbox, so re-enabling later is not blocked by a stale
 * row. Only actual provider attempts are recorded (for dedup + audit).
 */
export async function deliverReminder(
  reminder: Reminder,
  tenant: { id: string },
  options: DeliverOptions = {},
): Promise<DeliveryOutcome> {
  const now = options.now ?? demoNow();
  const grant = options.viewerGrant ?? synthGrant(reminder.audience, tenant.id);

  const recipient = resolveRecipient(reminder, grant, tenant);
  if (!recipient) {
    // resolveRecipient already logged the skip.
    return { status: "skipped", reason: "unresolved-recipient" };
  }

  const prefs = getNotificationPreferencesRepository().list(recipient.userId, tenant.id);
  if (!isDeliveryAllowed(prefs, reminder.type, "email")) {
    console.info(`[notify] suppressed by preference: ${reminder.id} → ${recipient.email}`);
    return { status: "skipped", reason: "opted-out", recipient: recipient.email };
  }

  const outbox = getNotificationOutboxRepository();
  const key = buildOutboxKey(reminder.source.refId, recipient.email, periodOf(reminder, now));
  if (outbox.find(key)) {
    return { status: "deduped", recipient: recipient.email, outboxKey: key };
  }

  const branding = getTenantBranding(tenant.id);
  const templateBranding: TemplateBranding = { preferredLabel: branding.preferredLabel, accent: branding.accent };
  const rendered = renderReminderEmail({
    reminder,
    recipientName: recipient.name,
    branding: templateBranding,
    appPublicUrl: ENV.appPublicUrl,
    unsubscribeUrl: buildUnsubscribeUrl(recipient.userId, tenant.id),
    physicalAddress: CHCG_PHYSICAL_ADDRESS,
  });

  const msg: EmailMessage = {
    to: recipient.email,
    toName: recipient.name,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  };

  const provider = getNotificationDelivery();
  const ics = DATED_REMINDER_TYPES.has(reminder.type)
    ? icsForReminder(reminder, { attendeeEmail: recipient.email, attendeeName: recipient.name })
    : null;
  const result = ics ? await provider.sendCalendarInvite(msg, ics) : await provider.sendEmail(msg);

  outbox.record({
    idempotencyKey: key,
    reminderType: reminder.type,
    recipient: recipient.email,
    status: result.status,
    renderedSubject: rendered.subject,
    createdAt: now.toISOString(),
  });

  return { status: result.status, recipient: recipient.email, outboxKey: key };
}

// ── Event hooks called by the demo mutations (fire-and-forget) ─────────────────

/** Retraining assigned → training-due reminder to the learner. */
export function notifyRetrainingAssigned(
  assignment: { id: string; tenantId: string; learnerUserId: string; moduleTitle: string; dueAt: string; createdAt?: string },
  now: Date = demoNow(),
): void {
  const reminder: Reminder = {
    id: `rem-training-${assignment.id}`,
    type: "training_due",
    audience: "learner",
    severity: new Date(assignment.dueAt).getTime() < now.getTime() ? "critical" : "warning",
    subject: assignment.moduleTitle,
    subjectUserId: assignment.learnerUserId,
    reason: `Your ${assignment.moduleTitle} retraining has been assigned and is due ${new Date(assignment.dueAt).toUTCString()}.`,
    dueAt: assignment.dueAt,
    overdue: new Date(assignment.dueAt).getTime() < now.getTime(),
    deepLink: { route: "/learner", tab: "reengagements" },
    source: { kind: "training_due", refId: assignment.id },
    createdAt: assignment.createdAt ?? now.toISOString(),
    read: false,
  };
  void track(deliverReminder(reminder, { id: assignment.tenantId }, { now }));
}

/** Retraining completed → announcement to the manager overseeing the learner. */
export function notifyRetrainingCompleted(
  assignment: { id: string; tenantId: string; moduleTitle: string },
  learnerName: string,
  now: Date = demoNow(),
): void {
  const reminder: Reminder = {
    id: `rem-complete-${assignment.id}`,
    type: "announcement",
    audience: "manager",
    severity: "info",
    subject: `Retraining completed: ${assignment.moduleTitle}`,
    reason: `${learnerName} completed the targeted retraining module ${assignment.moduleTitle}.`,
    overdue: false,
    deepLink: { route: "/manager", tab: "interventions", sectionId: "manager-interventions-lane" },
    source: { kind: "announcement", refId: `complete-${assignment.id}` },
    createdAt: now.toISOString(),
    read: false,
  };
  void track(deliverReminder(reminder, { id: assignment.tenantId }, { now }));
}

// ── Read-only preview (admin surface) ──────────────────────────────────────────

export interface ReminderPreview {
  reminderType: ReminderType;
  subject: string;
  text: string;
  html: string;
  ics: string | null;
}

const PREVIEW_TYPES: ReminderType[] = [
  "training_due",
  "coaching_follow_up",
  "one_on_one_scheduled",
  "knowledge_check_failed",
  "coaching_cadence_gap",
  "announcement",
];

/** A representative reminder for each type — used only to render previews. */
function sampleReminder(type: ReminderType, now: Date): Reminder {
  const dueAt = isoDaysFromNow(2);
  const base = {
    id: `preview-${type}`,
    type,
    audience: "learner" as ReminderAudience,
    severity: "warning" as const,
    subject: "Sample",
    subjectUserId: "u-learn-1",
    overdue: false,
    source: { kind: type, refId: `preview-${type}` },
    createdAt: now.toISOString(),
    read: false,
  };
  switch (type) {
    case "training_due":
      return { ...base, subject: "QA Essentials", reason: "Your QA Essentials retraining is due in 2 days.", dueAt, deepLink: { route: "/learner", tab: "reengagements" } };
    case "coaching_follow_up":
      return { ...base, subject: "Coaching follow-up", reason: "Your coaching follow-up is scheduled — review the takeaways beforehand.", dueAt, deepLink: { route: "/learner", tab: "coaching" } };
    case "one_on_one_scheduled":
      return { ...base, subject: "One-on-one", reason: "Your one-on-one with your coach is coming up.", dueAt, deepLink: { route: "/learner", tab: "coaching" } };
    case "knowledge_check_failed":
      return { ...base, reason: "Your first-pass knowledge-check rate is 45% (below the 60% bar).", deepLink: { route: "/learner", tab: "journey" } };
    case "coaching_cadence_gap":
      return { ...base, audience: "coach", subject: "A learner", reason: "A learner's last coaching log was 9 days ago — past the 7-day cadence.", overdue: true, deepLink: { route: "/coach", tab: "coaching" } };
    case "announcement":
    default:
      return { ...base, type: "announcement", subject: "Platform announcement", reason: "A new client content pack is available in the library.", source: { kind: "announcement", refId: `preview-announcement` } };
  }
}

/** Render one reminder type's email (subject/text/html + .ics for dated types). */
export function renderReminderPreview(reminderType: ReminderType, tenantId = "atlas-operations", now: Date = demoNow()): ReminderPreview {
  const reminder = sampleReminder(reminderType, now);
  const branding = getTenantBranding(tenantId);
  const rendered = renderReminderEmail({
    reminder,
    recipientName: "Sample Recipient",
    branding: { preferredLabel: branding.preferredLabel, accent: branding.accent },
    appPublicUrl: ENV.appPublicUrl,
    unsubscribeUrl: buildUnsubscribeUrl("sample-user", tenantId),
    physicalAddress: CHCG_PHYSICAL_ADDRESS,
  });
  const ics = DATED_REMINDER_TYPES.has(reminderType)
    ? icsForReminder(reminder, { attendeeEmail: "sample.recipient@enterpriseworkspace.demo", attendeeName: "Sample Recipient" })
    : null;
  return { reminderType, subject: rendered.subject, text: rendered.text, html: rendered.html, ics };
}

/** Render every reminder type — the admin preview gallery. */
export function renderAllReminderPreviews(tenantId = "atlas-operations", now: Date = demoNow()): ReminderPreview[] {
  return PREVIEW_TYPES.map((type) => renderReminderPreview(type, tenantId, now));
}

/** Weekly coaching log recorded → dated coaching follow-up invite to the learner. */
export function notifyCoachingLogged(
  input: { tenantId: string; logId: string; learnerUserId: string; coachName: string },
  now: Date = demoNow(),
): void {
  const reminder: Reminder = {
    id: `rem-followup-${input.logId}`,
    type: "coaching_follow_up",
    audience: "learner",
    severity: "warning",
    subject: "Coaching follow-up",
    subjectUserId: input.learnerUserId,
    reason: `Your coaching follow-up from ${input.coachName}'s session is scheduled — review the takeaways before then.`,
    dueAt: isoDaysFromNow(7),
    overdue: false,
    deepLink: { route: "/learner", tab: "coaching" },
    source: { kind: "coaching_follow_up", refId: input.logId },
    createdAt: now.toISOString(),
    read: false,
  };
  void track(deliverReminder(reminder, { id: input.tenantId }, { now }));
}

// ── CAL5: coaching-session invites (create / reschedule / cancel) ──────────────
// Reuses resolveRecipient + templates + outbox dedup, but drives the .ics directly
// via buildIcs so a reschedule bumps SEQUENCE (same UID) and a cancel emits
// METHOD:CANCEL. Recipient is the learner (the 1:1's subject). Stub by default.
export type CoachingEventAction = "created" | "rescheduled" | "cancelled";

interface CoachingSessionLike {
  id: string;
  tenantId: string;
  learnerUserId: string;
  title: string;
  start?: string;
  dueDate: string;
  durationMins?: number;
  sequence?: number;
}

const COACHING_ACTION_VERB: Record<CoachingEventAction, string> = {
  created: "scheduled",
  rescheduled: "rescheduled",
  cancelled: "cancelled",
};

export async function deliverCoachingSessionEvent(
  session: CoachingSessionLike,
  action: CoachingEventAction,
  now: Date = demoNow(),
): Promise<DeliveryOutcome> {
  const startIso = session.start ?? session.dueDate;
  const tenant = { id: session.tenantId };
  const grant = synthGrant("learner", session.tenantId);
  const sequence = session.sequence ?? 0;

  const reminder: Reminder = {
    id: `rem-coaching-${action}-${session.id}`,
    type: "one_on_one_scheduled",
    audience: "learner",
    severity: action === "cancelled" ? "info" : "warning",
    subject: session.title,
    subjectUserId: session.learnerUserId,
    reason:
      action === "cancelled"
        ? `Your coaching session "${session.title}" has been cancelled.`
        : `Your coaching session "${session.title}" has been ${COACHING_ACTION_VERB[action]} for ${new Date(startIso).toUTCString()}.`,
    dueAt: startIso,
    overdue: false,
    deepLink: { route: "/learner", tab: "coaching" },
    source: { kind: "one_on_one_scheduled", refId: session.id },
    createdAt: now.toISOString(),
    read: false,
  };

  const recipient = resolveRecipient(reminder, grant, tenant);
  if (!recipient) return { status: "skipped", reason: "unresolved-recipient" };

  const prefs = getNotificationPreferencesRepository().list(recipient.userId, session.tenantId);
  if (!isDeliveryAllowed(prefs, reminder.type, "email")) {
    return { status: "skipped", reason: "opted-out", recipient: recipient.email };
  }

  const outbox = getNotificationOutboxRepository();
  // Key on action + session + sequence so a re-run dedups but each new
  // reschedule/cancel (higher SEQUENCE) is a distinct send.
  const key = buildOutboxKey(`coaching-${action}`, recipient.email, `${session.id}:seq${sequence}`);
  if (outbox.find(key)) return { status: "deduped", recipient: recipient.email, outboxKey: key };

  const branding = getTenantBranding(session.tenantId);
  const rendered = renderReminderEmail({
    reminder,
    recipientName: recipient.name,
    branding: { preferredLabel: branding.preferredLabel, accent: branding.accent },
    appPublicUrl: ENV.appPublicUrl,
    unsubscribeUrl: buildUnsubscribeUrl(recipient.userId, session.tenantId),
    physicalAddress: CHCG_PHYSICAL_ADDRESS,
  });
  const msg: EmailMessage = { to: recipient.email, toName: recipient.name, subject: rendered.subject, text: rendered.text, html: rendered.html };

  const ics = buildIcs({
    uid: session.id, // == calendar refId
    title: session.title,
    description: reminder.reason,
    start: new Date(startIso),
    durationMinutes: session.durationMins ?? 30,
    sequence,
    attendeeEmail: recipient.email,
    attendeeName: recipient.name,
    method: action === "cancelled" ? "CANCEL" : "REQUEST",
    stamp: now,
  });

  const result = await getNotificationDelivery().sendCalendarInvite(msg, ics);
  outbox.record({
    idempotencyKey: key,
    reminderType: reminder.type,
    recipient: recipient.email,
    status: result.status,
    renderedSubject: rendered.subject,
    createdAt: now.toISOString(),
  });
  return { status: result.status, recipient: recipient.email, outboxKey: key };
}

/** Fire-and-forget wrapper the coaching mutations call. */
export function notifyCoachingSessionEvent(session: CoachingSessionLike, action: CoachingEventAction, now: Date = demoNow()): void {
  void track(deliverCoachingSessionEvent(session, action, now));
}

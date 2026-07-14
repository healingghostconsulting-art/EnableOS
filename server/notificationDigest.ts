// ──────────────────────────────────────────────────────────────────────────────
// Notification digest (DELIVER4) — the work the managed Heartbeat cron drives.
//
// runDigest(period) rolls each recipient's pending/unread reminders into ONE
// combined email. Reminders are (re)computed with buildReminders() across all
// three audiences per tenant, so the COMPUTED-signal types that have no discrete
// mutation event — knowledge_check_failed, coaching_cadence_gap — are included.
// Preferences are respected, sends dedup on a period-keyed idempotency key
// (digest-<period>::recipient::<stamp>), empty digests are skipped, and the
// StubProvider default means nothing actually leaves the process.
// ──────────────────────────────────────────────────────────────────────────────

import type { Reminder, ReminderAudience } from "../shared/reminders";
import { buildReminders } from "../shared/reminders";
import { demoNow } from "../shared/demoClock";
import { resolveRecipient, type Recipient } from "./notificationRecipients";
import { getNotificationDelivery } from "./notificationDelivery";
import {
  getNotificationOutboxRepository,
  getNotificationPreferencesRepository,
  isDeliveryAllowed,
  buildOutboxKey,
} from "./notificationRepositories";
import { renderDigestEmail } from "../shared/notificationTemplates";
import {
  getTenantBranding,
  listTenants,
  getCoachDashboard,
  getManagerDashboard,
  getLearnerDashboard,
  type DemoAccessGrant,
  type DemoRole,
} from "./demoPlatform";
import { CHCG_PHYSICAL_ADDRESS, buildUnsubscribeUrl } from "./notificationService";
import { ENV } from "./_core/env";

export type DigestPeriod = "daily" | "weekly";

export interface DigestGroup {
  recipient: Recipient;
  tenantId: string;
  reminders: Reminder[];
}

export interface DigestOutcome {
  recipient: string;
  status: "stubbed" | "sent" | "failed" | "skipped" | "deduped";
  count: number;
  reason?: string;
}

export interface DigestRunSummary {
  period: DigestPeriod;
  recipients: number;
  sent: number;
  deduped: number;
  skippedEmpty: number;
  outcomes: DigestOutcome[];
}

function synthGrant(audience: ReminderAudience, tenantId: string): DemoAccessGrant {
  return { openId: `digest-${audience}`, tenantId, role: audience as DemoRole, name: "" };
}

/** Idempotency stamp for the period: YYYY-MM-DD (daily) or YYYY-Www (ISO week). */
export function digestPeriodStamp(period: DigestPeriod, now: Date): string {
  if (period === "daily") return now.toISOString().slice(0, 10);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday defines the ISO week-year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Compute every recipient's pending reminder set across all tenants/audiences. */
export function collectDigestGroups(now: Date = demoNow()): Map<string, DigestGroup> {
  const groups = new Map<string, DigestGroup>();
  const add = (audience: ReminderAudience, tenantId: string, reminders: Reminder[]) => {
    const grant = synthGrant(audience, tenantId);
    for (const reminder of reminders) {
      const recipient = resolveRecipient(reminder, grant, { id: tenantId });
      if (!recipient) continue;
      const key = `${tenantId}::${recipient.userId}`;
      let group = groups.get(key);
      if (!group) {
        group = { recipient, tenantId, reminders: [] };
        groups.set(key, group);
      }
      if (!group.reminders.some((existing) => existing.id === reminder.id)) group.reminders.push(reminder);
    }
  };

  for (const tenant of listTenants()) {
    const tenantId = tenant.id;

    const coach = getCoachDashboard(tenantId);
    add("coach", tenantId, buildReminders("coach", {
      now,
      coachingSessions: coach.teamCoachingSessions,
      weeklyCoachingLogs: coach.teamWeeklyCoachingLogs,
      learners: coach.teamLearners,
      notifications: coach.notifications,
    }));

    const manager = getManagerDashboard(tenantId);
    add("manager", tenantId, buildReminders("manager", {
      now,
      retrainingAssignments: manager.retrainingAssignments,
      weeklyCoachingLogs: manager.weeklyCoachingLogs,
      learners: [manager.directReport],
      notifications: manager.notifications,
    }));

    const learner = getLearnerDashboard(tenantId);
    add("learner", tenantId, buildReminders("learner", {
      now,
      retrainingAssignments: learner.retrainingAssignments,
      coachingSessions: learner.nextCoachingSession ? [learner.nextCoachingSession] : [],
      learners: [learner.learner],
      notifications: learner.notifications,
    }));
  }

  return groups;
}

async function sendDigestForGroup(group: DigestGroup, period: DigestPeriod, now: Date): Promise<DigestOutcome> {
  const email = group.recipient.email;
  const prefs = getNotificationPreferencesRepository().list(group.recipient.userId, group.tenantId);
  const eligible = group.reminders.filter((reminder) => isDeliveryAllowed(prefs, reminder.type, "email"));
  if (eligible.length === 0) return { recipient: email, status: "skipped", count: 0, reason: "empty" };

  const outbox = getNotificationOutboxRepository();
  const key = buildOutboxKey(`digest-${period}`, email, digestPeriodStamp(period, now));
  if (outbox.find(key)) return { recipient: email, status: "deduped", count: eligible.length };

  const branding = getTenantBranding(group.tenantId);
  const rendered = renderDigestEmail({
    recipientName: group.recipient.name,
    reminders: eligible,
    branding: { preferredLabel: branding.preferredLabel, accent: branding.accent },
    appPublicUrl: ENV.appPublicUrl,
    unsubscribeUrl: buildUnsubscribeUrl(group.recipient.userId, group.tenantId),
    physicalAddress: CHCG_PHYSICAL_ADDRESS,
    period,
  });

  const result = await getNotificationDelivery().sendEmail({
    to: email,
    toName: group.recipient.name,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });

  outbox.record({
    idempotencyKey: key,
    reminderType: eligible[0]!.type,
    recipient: email,
    status: result.status,
    renderedSubject: rendered.subject,
    createdAt: now.toISOString(),
  });

  return { recipient: email, status: result.status, count: eligible.length };
}

/** Run the digest for a period. Empty recipients are skipped; nothing double-sends. */
export async function runDigest(period: DigestPeriod, options: { now?: Date } = {}): Promise<DigestRunSummary> {
  const now = options.now ?? demoNow();
  const groups = collectDigestGroups(now);
  const outcomes: DigestOutcome[] = [];
  for (const group of Array.from(groups.values())) {
    outcomes.push(await sendDigestForGroup(group, period, now));
  }
  return {
    period,
    recipients: groups.size,
    sent: outcomes.filter((o) => o.status === "stubbed" || o.status === "sent").length,
    deduped: outcomes.filter((o) => o.status === "deduped").length,
    skippedEmpty: outcomes.filter((o) => o.status === "skipped" && o.reason === "empty").length,
    outcomes,
  };
}

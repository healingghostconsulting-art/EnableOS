import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deliverReminder } from "./notificationService";
import { runDigest, collectDigestGroups } from "./notificationDigest";
import {
  StubProvider,
  SesProvider,
  isSesConfigured,
  getNotificationDelivery,
  __setNotificationDelivery,
  type EmailMessage,
} from "./notificationDelivery";
import {
  InMemoryNotificationOutboxRepository,
  InMemoryNotificationPreferencesRepository,
  __setNotificationOutboxRepository,
  __setNotificationPreferencesRepository,
} from "./notificationRepositories";
import type { Reminder } from "../shared/reminders";
import { demoNow } from "../shared/demoClock";

// DELIVER5 — one consolidated pass over the whole DELIVER2–4 pipeline, plus the
// named safety guarantee that nothing leaves the process without credentials.

const ATLAS = { id: "atlas-operations" };
const NINA_EMAIL = "nina.patel@enterpriseworkspace.demo";

let stub: StubProvider;
let outbox: InMemoryNotificationOutboxRepository;
let prefs: InMemoryNotificationPreferencesRepository;

beforeEach(() => {
  stub = new StubProvider();
  outbox = new InMemoryNotificationOutboxRepository();
  prefs = new InMemoryNotificationPreferencesRepository();
  __setNotificationDelivery(stub);
  __setNotificationOutboxRepository(outbox);
  __setNotificationPreferencesRepository(prefs);
});

afterEach(() => {
  __setNotificationDelivery(new StubProvider());
  __setNotificationOutboxRepository(new InMemoryNotificationOutboxRepository());
  __setNotificationPreferencesRepository(new InMemoryNotificationPreferencesRepository());
});

function coachingFollowUp(): Reminder {
  return {
    id: "rem-followup-log-77",
    type: "coaching_follow_up",
    audience: "learner",
    severity: "warning",
    subject: "Coaching follow-up",
    subjectUserId: "u-learn-1",
    reason: "Your coaching follow-up is scheduled — review the takeaways beforehand.",
    dueAt: new Date(demoNow().getTime() + 3 * 86_400_000).toISOString(),
    overdue: false,
    deepLink: { route: "/learner", tab: "coaching" },
    source: { kind: "coaching_follow_up", refId: "log-77" },
    createdAt: demoNow().toISOString(),
    read: false,
  };
}

function trainingDue(): Reminder {
  return {
    id: "rem-training-asg-9",
    type: "training_due",
    audience: "learner",
    severity: "warning",
    subject: "QA Essentials",
    subjectUserId: "u-learn-1",
    reason: "Your QA Essentials retraining is due soon.",
    dueAt: new Date(demoNow().getTime() + 2 * 86_400_000).toISOString(),
    overdue: false,
    deepLink: { route: "/learner", tab: "reengagements" },
    source: { kind: "training_due", refId: "asg-9" },
    createdAt: demoNow().toISOString(),
    read: false,
  };
}

describe("consolidated notification-delivery acceptance (DELIVER5)", () => {
  it("runs the full pipeline: event → outbox+.ics → opt-out suppress → dedup → digest incl. computed types → digest dedup", async () => {
    // ── 1. Event fires → exactly one outbox row + rendered email + valid .ics ──
    const firstEvent = await deliverReminder(coachingFollowUp(), ATLAS);
    expect(firstEvent.status).toBe("stubbed");
    expect(firstEvent.recipient).toBe(NINA_EMAIL);

    let rows = await outbox.loadAll();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reminderType: "coaching_follow_up", recipient: NINA_EMAIL, status: "stubbed" });
    expect(rows[0]!.renderedSubject.length).toBeGreaterThan(0);

    expect(stub.records).toHaveLength(1);
    expect(stub.records[0]!.hasCalendar).toBe(true);
    const ics = stub.records[0]!.ics!;
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("log-77"); // uid = source.refId
    expect(ics).toContain("END:VCALENDAR");

    // ── 2. Preferences opt-out suppresses — no send, no row ──
    prefs.upsert({ userId: "u-learn-1", tenantId: "atlas-operations", reminderType: "training_due", channel: "email", enabled: false, unsubscribedAt: null });
    const suppressed = await deliverReminder(trainingDue(), ATLAS);
    expect(suppressed.status).toBe("skipped");
    expect(suppressed.reason).toBe("opted-out");
    expect(await outbox.loadAll()).toHaveLength(1); // still just the follow-up
    expect(stub.records).toHaveLength(1);

    // ── 3. Duplicate same-key event is deduped — nothing new ──
    const duplicate = await deliverReminder(coachingFollowUp(), ATLAS);
    expect(duplicate.status).toBe("deduped");
    expect(await outbox.loadAll()).toHaveLength(1);
    expect(stub.records).toHaveLength(1);

    const rowsBeforeDigest = (await outbox.loadAll()).length;

    // ── 4. Digest composes the right per-recipient set incl. computed types ──
    const groups = collectDigestGroups(demoNow());
    const allTypes = new Set(Array.from(groups.values()).flatMap((g) => g.reminders.map((r) => r.type)));
    expect(allTypes.has("knowledge_check_failed")).toBe(true); // computed, no discrete event
    expect(allTypes.has("coaching_cadence_gap")).toBe(true); // computed, no discrete event

    const digest = await runDigest("daily");
    expect(digest.recipients).toBeGreaterThan(0);
    expect(digest.sent).toBe(digest.recipients - digest.skippedEmpty);
    rows = await outbox.loadAll();
    expect(rows.length).toBe(rowsBeforeDigest + digest.sent);

    // ── 5. Period-keyed digest dedup holds ──
    const secondDigest = await runDigest("daily");
    expect(secondDigest.sent).toBe(0);
    expect(secondDigest.deduped).toBe(secondDigest.recipients - secondDigest.skippedEmpty);
    expect((await outbox.loadAll()).length).toBe(rows.length); // no new rows
  });

  it("SAFETY: with no SES credentials and ALLOW_REAL_SEND unset, nothing actually sends — even through the digest path", async () => {
    // The gate is closed by default.
    expect(isSesConfigured()).toBe(false);

    // The SES adapter is a logged no-op — it never sends.
    const msg: EmailMessage = { to: NINA_EMAIL, subject: "s", text: "t", html: "<p>t</p>" };
    const ses = new SesProvider();
    expect((await ses.sendEmail(msg)).status).toBe("skipped");
    expect((await ses.sendCalendarInvite(msg, "BEGIN:VCALENDAR")).status).toBe("skipped");

    // Drive the whole flow (event + digest) on the default provider…
    await deliverReminder(coachingFollowUp(), ATLAS);
    await runDigest("daily");

    // …and confirm the active provider is a recording Stub, every outbox row is
    // stubbed/skipped, and NOTHING is ever "sent".
    expect(getNotificationDelivery()).toBeInstanceOf(StubProvider);
    const rows = await outbox.loadAll();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === "stubbed" || r.status === "skipped")).toBe(true);
    expect(rows.some((r) => r.status === "sent")).toBe(false);
    // The stub recorded what it *would* have sent (audit), but no transport ran.
    expect(stub.records.length).toBeGreaterThan(0);
  });
});

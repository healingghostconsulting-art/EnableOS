import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  deliverReminder,
  notifyRetrainingAssigned,
  notifyCoachingLogged,
  flushNotifications,
} from "./notificationService";
import { StubProvider, __setNotificationDelivery } from "./notificationDelivery";
import {
  InMemoryNotificationOutboxRepository,
  InMemoryNotificationPreferencesRepository,
  __setNotificationOutboxRepository,
  __setNotificationPreferencesRepository,
} from "./notificationRepositories";
import type { DemoAccessGrant } from "./demoPlatform";
import type { Reminder } from "../shared/reminders";
import { demoNow } from "../shared/demoClock";

// DELIVER3: the orchestration wired via StubProvider + in-memory repos. No real
// send, deterministic, hermetic.

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

function trainingReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "rem-training-t1",
    type: "training_due",
    audience: "learner",
    severity: "warning",
    subject: "QA Essentials",
    subjectUserId: "u-learn-1",
    reason: "Your QA Essentials retraining is due soon.",
    dueAt: new Date(demoNow().getTime() + 3 * 86_400_000).toISOString(),
    overdue: false,
    deepLink: { route: "/learner", tab: "reengagements" },
    source: { kind: "training_due", refId: "t1" },
    createdAt: demoNow().toISOString(),
    read: false,
    ...overrides,
  };
}

describe("notification service — event delivery (DELIVER3)", () => {
  it("delivers a training_due reminder as exactly one stubbed outbox row + rendered email", async () => {
    const outcome = await deliverReminder(trainingReminder(), ATLAS);

    expect(outcome.status).toBe("stubbed");
    expect(outcome.recipient).toBe(NINA_EMAIL);

    const rows = await outbox.loadAll();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reminderType: "training_due",
      recipient: NINA_EMAIL,
      status: "stubbed",
    });
    expect(rows[0]!.renderedSubject.length).toBeGreaterThan(0);

    expect(stub.records).toHaveLength(1);
    expect(stub.records[0]!.hasCalendar).toBe(false);
    expect(stub.records[0]!.text).toContain("QA Essentials");
    // CAN-SPAM footer present in the plaintext source-of-truth body.
    expect(stub.records[0]!.text).toContain("Unsubscribe:");
    expect(stub.records[0]!.text).toContain("Chicago, IL");
  });

  it("sends a valid .ics via sendCalendarInvite for a dated coaching_follow_up", async () => {
    const reminder = trainingReminder({
      id: "rem-followup-log-1",
      type: "coaching_follow_up",
      subject: "Coaching follow-up",
      source: { kind: "coaching_follow_up", refId: "log-1" },
    });

    const outcome = await deliverReminder(reminder, ATLAS);

    expect(outcome.status).toBe("stubbed");
    expect(stub.records).toHaveLength(1);
    expect(stub.records[0]!.hasCalendar).toBe(true);

    const ics = stub.records[0]!.ics!;
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("log-1"); // uid derives from source.refId
    expect(ics).toContain("END:VEVENT");
  });

  it("suppresses delivery when the recipient has opted out of the type", async () => {
    prefs.upsert({
      userId: "u-learn-1",
      tenantId: "atlas-operations",
      reminderType: "training_due",
      channel: "email",
      enabled: false,
      unsubscribedAt: null,
    });

    const outcome = await deliverReminder(trainingReminder(), ATLAS);

    expect(outcome.status).toBe("skipped");
    expect(outcome.reason).toBe("opted-out");
    expect(await outbox.loadAll()).toHaveLength(0);
    expect(stub.records).toHaveLength(0);
  });

  it("suppresses delivery on a global unsubscribe", async () => {
    prefs.upsert({
      userId: "u-learn-1",
      tenantId: "atlas-operations",
      reminderType: "",
      channel: "",
      enabled: true,
      unsubscribedAt: demoNow().toISOString(),
    });

    const outcome = await deliverReminder(trainingReminder(), ATLAS);

    expect(outcome.status).toBe("skipped");
    expect(await outbox.loadAll()).toHaveLength(0);
  });

  it("dedups re-runs so nothing double-sends", async () => {
    const first = await deliverReminder(trainingReminder(), ATLAS);
    const second = await deliverReminder(trainingReminder(), ATLAS);

    expect(first.status).toBe("stubbed");
    expect(second.status).toBe("deduped");
    expect(await outbox.loadAll()).toHaveLength(1);
    expect(stub.records).toHaveLength(1);
  });

  it("skips (logs, no outbox row) when the recipient cannot be resolved", async () => {
    const reminder = trainingReminder({
      audience: "coach",
      type: "coaching_cadence_gap",
      dueAt: undefined,
      source: { kind: "coaching_cadence_gap", refId: "c1" },
    });
    // coach-audience → the viewer receives it; a platform_admin grant has no demo user.
    const badGrant: DemoAccessGrant = { openId: "x", tenantId: "atlas-operations", role: "platform_admin" as never, name: "" };

    const outcome = await deliverReminder(reminder, ATLAS, { viewerGrant: badGrant });

    expect(outcome.status).toBe("skipped");
    expect(outcome.reason).toBe("unresolved-recipient");
    expect(await outbox.loadAll()).toHaveLength(0);
    expect(stub.records).toHaveLength(0);
  });

  it("event hook notifyRetrainingAssigned produces exactly one delivery", async () => {
    notifyRetrainingAssigned({
      id: "asg-1",
      tenantId: "atlas-operations",
      learnerUserId: "u-learn-1",
      moduleTitle: "QA Essentials",
      dueAt: new Date(demoNow().getTime() + 2 * 86_400_000).toISOString(),
    });
    await flushNotifications();

    const rows = await outbox.loadAll();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reminderType: "training_due", recipient: NINA_EMAIL, status: "stubbed" });
  });

  it("event hook notifyCoachingLogged sends a dated follow-up with a calendar invite", async () => {
    notifyCoachingLogged({
      tenantId: "atlas-operations",
      logId: "weekly-log-9",
      learnerUserId: "u-learn-1",
      coachName: "Renee Lawson",
    });
    await flushNotifications();

    expect(stub.records).toHaveLength(1);
    expect(stub.records[0]!.hasCalendar).toBe(true);
    expect((await outbox.loadAll())[0]).toMatchObject({ reminderType: "coaching_follow_up", recipient: NINA_EMAIL });
  });
});

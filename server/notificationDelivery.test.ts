import { describe, expect, it, beforeEach } from "vitest";
import type { Reminder, ReminderType } from "../shared/reminders";
import { renderReminderEmail, buildDeepLinkUrl, TEMPLATED_REMINDER_TYPES } from "../shared/notificationTemplates";
import { buildIcs, icsForReminder, formatIcsUtc, DATED_REMINDER_TYPES } from "../shared/ics";
import { resolveRecipient, demoRecipientDirectory, type RecipientDirectory } from "./notificationRecipients";
import { StubProvider, SesProvider, isSesConfigured, __setNotificationDelivery, getNotificationDelivery } from "./notificationDelivery";
import {
  InMemoryNotificationOutboxRepository,
  InMemoryNotificationPreferencesRepository,
  buildOutboxKey,
  isDeliveryAllowed,
  type OutboxRecord,
} from "./notificationRepositories";
import type { DemoAccessGrant } from "./demoPlatform";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeReminder(type: ReminderType, overrides: Partial<Reminder> = {}): Reminder {
  const base: Reminder = {
    id: `rem-${type}-1`,
    type,
    audience: "learner",
    severity: "warning",
    subject: "Verification and Workflow Accuracy",
    subjectUserId: "u-learn-1",
    reason: `Your ${type} needs attention now.`,
    overdue: false,
    deepLink: { route: "/learner", tab: "reengagements" },
    source: { kind: type, refId: `src-${type}-1` },
    createdAt: "2026-07-10T00:00:00.000Z",
    read: false,
  };
  return { ...base, ...overrides };
}

const BRANDING = { preferredLabel: "Atlas Operations", accent: "#3355ff" };
const TEMPLATE_CTX = {
  recipientName: "Nina Patel",
  branding: BRANDING,
  appPublicUrl: "https://app.enableos.demo",
  unsubscribeUrl: "https://app.enableos.demo/unsubscribe?token=abc",
  physicalAddress: "CHCG, 123 Enablement Way, Suite 100, Chicago, IL 60601",
};

// ── Templates ─────────────────────────────────────────────────────────────────

describe("notification templates (DELIVER2)", () => {
  it("renders a template for every ReminderType with subject, text, and CAN-SPAM footer", () => {
    expect(TEMPLATED_REMINDER_TYPES.length).toBe(6);
    for (const type of TEMPLATED_REMINDER_TYPES) {
      const reminder = makeReminder(type);
      const email = renderReminderEmail({ reminder, ...TEMPLATE_CTX });

      expect(email.subject.length).toBeGreaterThan(0);
      // Text is the source of truth: carries the reason, branding, unsubscribe + address.
      expect(email.text).toContain(reminder.reason);
      expect(email.text).toContain(BRANDING.preferredLabel);
      expect(email.text).toContain(TEMPLATE_CTX.unsubscribeUrl);
      expect(email.text).toContain(TEMPLATE_CTX.physicalAddress);
      // HTML mirrors it, tenant-branded with the accent + a working unsubscribe link.
      expect(email.html).toContain(BRANDING.accent);
      expect(email.html).toContain(BRANDING.preferredLabel);
      expect(email.html).toContain(TEMPLATE_CTX.unsubscribeUrl);
    }
  });

  it("builds a deep link from APP_PUBLIC_URL + reminder.deepLink", () => {
    const reminder = makeReminder("training_due", { deepLink: { route: "/learner", tab: "reengagements", sectionId: "lane" } });
    const url = buildDeepLinkUrl("https://app.enableos.demo", reminder);
    expect(url).toBe("https://app.enableos.demo/learner?tab=reengagements#lane");
    // No public URL → relative link.
    expect(buildDeepLinkUrl("", reminder)).toBe("/learner?tab=reengagements#lane");
  });
});

// ── .ics ────────────────────────────────────────────────────────────────────

describe("ics builder (DELIVER2)", () => {
  it("emits a valid VEVENT for dated reminder types with UTC times, UID=refId, SEQUENCE", () => {
    for (const type of ["one_on_one_scheduled", "coaching_follow_up"] as ReminderType[]) {
      expect(DATED_REMINDER_TYPES.has(type)).toBe(true);
      const reminder = makeReminder(type, { dueAt: "2026-07-12T09:00:00.000Z" });
      const ics = icsForReminder(reminder, { attendeeEmail: "nina.patel@enterpriseworkspace.demo", sequence: 2 });
      expect(ics).not.toBeNull();
      const doc = ics!;
      expect(doc).toContain("BEGIN:VCALENDAR");
      expect(doc).toContain("END:VCALENDAR");
      expect(doc).toContain("BEGIN:VEVENT");
      expect(doc).toContain("METHOD:REQUEST");
      expect(doc).toContain(`UID:${reminder.source.refId}`);
      expect(doc).toContain("SEQUENCE:2");
      expect(doc).toContain("DTSTART:20260712T090000Z");
      expect(doc).toContain("ATTENDEE");
      expect(doc.endsWith("\r\n")).toBe(true);
    }
  });

  it("returns null for non-dated types or a missing dueAt (never guesses a date)", () => {
    expect(icsForReminder(makeReminder("knowledge_check_failed"))).toBeNull();
    expect(icsForReminder(makeReminder("announcement"))).toBeNull();
    expect(icsForReminder(makeReminder("one_on_one_scheduled", { dueAt: undefined }))).toBeNull();
  });

  it("formatIcsUtc formats a Date as a Zulu iCal stamp", () => {
    expect(formatIcsUtc(new Date("2026-01-05T07:08:09.000Z"))).toBe("20260105T070809Z");
    expect(buildIcs({ uid: "u1", title: "x", start: new Date("2026-07-12T09:00:00Z") })).toContain("DTSTART:20260712T090000Z");
  });
});

// ── Recipient resolver ────────────────────────────────────────────────────────

const learnerGrant: DemoAccessGrant = { openId: "atlas-learner", tenantId: "atlas-operations", role: "learner", name: "Enterprise Learner" };
const coachGrant: DemoAccessGrant = { openId: "atlas-coach", tenantId: "atlas-operations", role: "coach", name: "Enterprise Coach Supervisor" };
const atlas = { id: "atlas-operations" };

describe("recipient resolver (DELIVER2)", () => {
  it("learner audience → the subject's email", () => {
    const reminder = makeReminder("training_due", { audience: "learner", subjectUserId: "u-learn-1" });
    const recipient = resolveRecipient(reminder, learnerGrant, atlas);
    expect(recipient).toEqual({ email: "nina.patel@enterpriseworkspace.demo", name: "Nina Patel" });
  });

  it("coach/manager audience → the viewer's email (not the subject)", () => {
    const reminder = makeReminder("coaching_cadence_gap", { audience: "coach", subjectUserId: "u-learn-1" });
    const recipient = resolveRecipient(reminder, coachGrant, atlas);
    expect(recipient).toEqual({ email: "renee.lawson@enterpriseworkspace.demo", name: "Renee Lawson" });
  });

  it("returns null when the recipient can't be resolved (never guesses)", () => {
    // Directory that resolves nothing.
    const emptyDir: RecipientDirectory = { byId: () => null, byRole: () => null };
    const reminder = makeReminder("training_due", { audience: "learner", subjectUserId: "nope" });
    expect(resolveRecipient(reminder, learnerGrant, atlas, emptyDir)).toBeNull();
    // A grant role with no seeded user also yields null.
    const adminGrant: DemoAccessGrant = { openId: "platform-admin", tenantId: "atlas-operations", role: "platform_admin", name: "Platform Admin" };
    const coachReminder = makeReminder("coaching_cadence_gap", { audience: "coach" });
    expect(resolveRecipient(coachReminder, adminGrant, atlas)).toBeNull();
  });

  it("default directory resolves real demo users by id and role", () => {
    expect(demoRecipientDirectory.byId("u-coach-1", "atlas-operations")?.email).toBe("renee.lawson@enterpriseworkspace.demo");
    expect(demoRecipientDirectory.byRole("manager", "atlas-operations")?.email).toBe("marcus.bell@enterpriseworkspace.demo");
    expect(demoRecipientDirectory.byId("does-not-exist", "atlas-operations")).toBeNull();
  });
});

// ── Providers ─────────────────────────────────────────────────────────────────

describe("delivery providers (DELIVER2)", () => {
  const msg = { to: "nina.patel@enterpriseworkspace.demo", toName: "Nina Patel", subject: "S", text: "T", html: "<p>T</p>" };

  it("StubProvider records without sending and reports 'stubbed'", async () => {
    const stub = new StubProvider();
    const r1 = await stub.sendEmail(msg);
    expect(r1).toEqual({ status: "stubbed", provider: "stub" });
    expect(stub.records).toHaveLength(1);
    expect(stub.records[0]).toMatchObject({ to: msg.to, subject: "S", hasCalendar: false });

    const r2 = await stub.sendCalendarInvite(msg, "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
    expect(r2.status).toBe("stubbed");
    expect(stub.records[1]).toMatchObject({ hasCalendar: true });
    expect(stub.records[1]!.ics).toContain("VCALENDAR");

    expect(stub.renderOnly(msg)).toEqual({ subject: "S", text: "T", html: "<p>T</p>" });
  });

  it("SesProvider no-ops ('skipped') when SES is not configured / ALLOW_REAL_SEND off", async () => {
    expect(isSesConfigured()).toBe(false); // default env: no creds, gate closed
    const ses = new SesProvider();
    const res = await ses.sendEmail(msg);
    expect(res.status).toBe("skipped");
    expect(res.provider).toBe("ses");
    const invite = await ses.sendCalendarInvite(msg, "ics");
    expect(invite.status).toBe("skipped");
  });

  it("default binding is a StubProvider and __set swaps it", () => {
    expect(getNotificationDelivery()).toBeInstanceOf(StubProvider);
    const replacement = new StubProvider();
    __setNotificationDelivery(replacement);
    expect(getNotificationDelivery()).toBe(replacement);
    __setNotificationDelivery(new StubProvider());
  });
});

// ── Outbox dedup ──────────────────────────────────────────────────────────────

describe("notification outbox (DELIVER2)", () => {
  let repo: InMemoryNotificationOutboxRepository;
  beforeEach(() => {
    repo = new InMemoryNotificationOutboxRepository();
  });

  const rec = (key: string): OutboxRecord => ({
    idempotencyKey: key,
    reminderType: "training_due",
    recipient: "nina.patel@enterpriseworkspace.demo",
    status: "stubbed",
    renderedSubject: "Training due",
    createdAt: "2026-07-10T00:00:00.000Z",
  });

  it("dedups on idempotencyKey — first record wins, repeats are rejected", () => {
    const key = buildOutboxKey("src-1", "nina.patel@enterpriseworkspace.demo", "2026-07-10");
    expect(repo.record(rec(key))).toBe(true);
    expect(repo.record(rec(key))).toBe(false); // deduped
    expect(repo.find(key)).not.toBeNull();
    expect(repo.record(rec("other-key"))).toBe(true);
  });

  it("buildOutboxKey composes refId + recipient + period", () => {
    expect(buildOutboxKey("src-1", "a@b.demo", "2026-07-10")).toBe("src-1::a@b.demo::2026-07-10");
  });
});

// ── Preferences (opt-out) ───────────────────────────────────────────────────

describe("notification preferences (DELIVER2)", () => {
  it("defaults to enabled; a disable row suppresses; unsubscribe suppresses everything", async () => {
    const repo = new InMemoryNotificationPreferencesRepository();
    // No rows → allowed.
    expect(isDeliveryAllowed(repo.list("u-learn-1", "atlas-operations"), "training_due", "email")).toBe(true);

    repo.upsert({ userId: "u-learn-1", tenantId: "atlas-operations", reminderType: "training_due", channel: "email", enabled: false, unsubscribedAt: null });
    const rows = repo.list("u-learn-1", "atlas-operations");
    expect(isDeliveryAllowed(rows, "training_due", "email")).toBe(false);
    // A different type is still allowed.
    expect(isDeliveryAllowed(rows, "coaching_follow_up", "email")).toBe(true);

    repo.upsert({ userId: "u-learn-1", tenantId: "atlas-operations", reminderType: "", channel: "", enabled: true, unsubscribedAt: "2026-07-11T00:00:00.000Z" });
    const afterUnsub = repo.list("u-learn-1", "atlas-operations");
    expect(isDeliveryAllowed(afterUnsub, "coaching_follow_up", "email")).toBe(false);
  });
});

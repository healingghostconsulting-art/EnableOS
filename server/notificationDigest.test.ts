import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDigest, collectDigestGroups, digestPeriodStamp } from "./notificationDigest";
import { digestHandler } from "./scheduledDigest";
import { StubProvider, __setNotificationDelivery } from "./notificationDelivery";
import {
  InMemoryNotificationOutboxRepository,
  InMemoryNotificationPreferencesRepository,
  __setNotificationOutboxRepository,
  __setNotificationPreferencesRepository,
} from "./notificationRepositories";
import { demoNow } from "../shared/demoClock";

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

describe("notification digest (DELIVER4)", () => {
  it("composes each recipient's set including computed-signal types with no discrete event", () => {
    const groups = collectDigestGroups(demoNow());
    expect(groups.size).toBeGreaterThan(0);
    const allTypes = new Set(Array.from(groups.values()).flatMap((g) => g.reminders.map((r) => r.type)));
    // These two are never produced by a mutation — only by buildReminders across audiences.
    expect(allTypes.has("knowledge_check_failed")).toBe(true);
    expect(allTypes.has("coaching_cadence_gap")).toBe(true);
  });

  it("sends one combined stubbed digest per non-empty recipient and records the outbox", async () => {
    const summary = await runDigest("daily");

    expect(summary.recipients).toBeGreaterThan(0);
    expect(summary.sent).toBe(summary.recipients - summary.skippedEmpty);

    const rows = await outbox.loadAll();
    expect(rows.length).toBe(summary.sent);
    expect(stub.records.length).toBe(summary.sent);

    const anyRecord = stub.records[0]!;
    expect(anyRecord.subject).toContain("EnableOS digest");
    expect(anyRecord.hasCalendar).toBe(false); // digests never attach an invite
    expect(anyRecord.text).toContain("Unsubscribe:");
    expect(anyRecord.text).toContain("Chicago, IL"); // CAN-SPAM physical address
  });

  it("period-keyed dedup prevents a second same-period digest", async () => {
    const first = await runDigest("daily");
    const rowsAfterFirst = (await outbox.loadAll()).length;

    const second = await runDigest("daily");
    expect(second.sent).toBe(0);
    expect(second.deduped).toBe(second.recipients - second.skippedEmpty);
    expect((await outbox.loadAll()).length).toBe(rowsAfterFirst);
    expect(stub.records.length).toBe(first.sent); // no new sends on the second run
  });

  it("a different period is NOT deduped against the daily run", async () => {
    await runDigest("daily");
    const dailyRows = (await outbox.loadAll()).length;
    const weekly = await runDigest("weekly");
    expect(weekly.sent).toBeGreaterThan(0);
    expect((await outbox.loadAll()).length).toBe(dailyRows + weekly.sent);
  });

  it("suppresses a globally-unsubscribed recipient — empty digest, no email, no row", async () => {
    prefs.upsert({
      userId: "u-learn-1",
      tenantId: "atlas-operations",
      reminderType: "",
      channel: "",
      enabled: true,
      unsubscribedAt: demoNow().toISOString(),
    });

    const summary = await runDigest("daily");
    const nina = summary.outcomes.find((o) => o.recipient === NINA_EMAIL);

    expect(nina?.status).toBe("skipped");
    expect(nina?.reason).toBe("empty");
    const rows = await outbox.loadAll();
    expect(rows.some((r) => r.recipient === NINA_EMAIL)).toBe(false);
    expect(stub.records.some((r) => r.to === NINA_EMAIL)).toBe(false);
  });

  it("period stamp: daily = YYYY-MM-DD, weekly = YYYY-Www", () => {
    const now = demoNow();
    expect(digestPeriodStamp("daily", now)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(digestPeriodStamp("weekly", now)).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("POST /api/scheduled/digest rejects a non-cron request with 403", async () => {
    const req = { headers: {}, query: {}, body: {}, url: "/api/scheduled/digest" } as never;
    let statusCode = 0;
    let jsonBody: { error?: string } = {};
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: { error?: string }) {
        jsonBody = body;
        return this;
      },
    } as never;

    await digestHandler(req, res);

    expect(statusCode).toBe(403);
    expect(jsonBody.error).toBe("cron-only");
    // No digest work ran.
    expect((await outbox.loadAll()).length).toBe(0);
  });
});

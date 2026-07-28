import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { demoNow } from "../shared/demoClock";
import {
  createCoachingSession,
  rescheduleCoachingSession,
  cancelCoachingSession,
  getTenantCalendar,
  canManageCoachingSession,
} from "./demoPlatform";
import {
  InMemoryCoachingSessionRepository,
  __setCoachingSessionRepository,
  getCoachingSessionRepository,
  coachingSessionToRow,
  coachingSessionFromRow,
} from "./coachingSessionRepository";
import { StubProvider, __setNotificationDelivery } from "./notificationDelivery";
import {
  InMemoryNotificationOutboxRepository,
  InMemoryNotificationPreferencesRepository,
  __setNotificationOutboxRepository,
  __setNotificationPreferencesRepository,
} from "./notificationRepositories";
import { flushNotifications } from "./notificationService";

// CAL5 — persisted coaching-session scheduling: mutations, calendar surfacing,
// .ics (UID/SEQUENCE/CANCEL), role permissions, and restart-survival mapping.
// StubProvider + in-memory repos → deterministic, nothing sends.

const ATLAS = "atlas-operations";

function ctx(role: NonNullable<TrpcContext["user"]>["role"], openId: string): TrpcContext {
  return {
    user: { id: 1, openId, email: "x@demo", name: "x", loginMethod: "manus", role, createdAt: new Date(0), updatedAt: new Date(0), lastSignedIn: new Date(0) },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

let stub: StubProvider;

beforeEach(() => {
  stub = new StubProvider();
  __setNotificationDelivery(stub);
  __setNotificationOutboxRepository(new InMemoryNotificationOutboxRepository());
  __setNotificationPreferencesRepository(new InMemoryNotificationPreferencesRepository());
  __setCoachingSessionRepository(new InMemoryCoachingSessionRepository([])); // fresh, empty
});

afterEach(() => {
  __setNotificationDelivery(new StubProvider());
  __setNotificationOutboxRepository(new InMemoryNotificationOutboxRepository());
  __setNotificationPreferencesRepository(new InMemoryNotificationPreferencesRepository());
  __setCoachingSessionRepository(new InMemoryCoachingSessionRepository([]));
});

const futureIso = (days: number) => new Date(demoNow().getTime() + days * 86_400_000).toISOString();

describe("coaching-session scheduling (CAL5)", () => {
  it("createCoachingSession persists, surfaces in the calendar, sends a REQUEST .ics (UID=id, SEQUENCE:0)", async () => {
    const start = futureIso(3);
    const session = createCoachingSession({ tenantId: ATLAS, coachUserId: "u-coach-1", learnerUserId: "u-learn-1", title: "Growth 1:1", start });

    expect(session.id).toBe("session-1"); // id flows into refId + .ics UID
    expect(session.status).toBe("scheduled");
    expect(session.dueDate).toBe(start);
    expect(getCoachingSessionRepository().find("session-1")).toBeTruthy();

    // Surfaces in the derived calendar as a coaching_session keyed on the session id.
    const event = getTenantCalendar(ATLAS, "coach").find((e) => e.refId === "session-1");
    expect(event).toBeTruthy();
    expect(event!.id).toBe("coaching_session:session-1");
    expect(event!.type).toBe("coaching_session");

    await flushNotifications();
    expect(stub.records).toHaveLength(1);
    expect(stub.records[0]!.hasCalendar).toBe(true);
    const ics = stub.records[0]!.ics!;
    expect(ics).toContain("UID:session-1");
    expect(ics).toContain("SEQUENCE:0");
    expect(ics).toContain("METHOD:REQUEST");
  });

  it("reschedule bumps the .ics SEQUENCE (same UID) and moves the calendar event", async () => {
    createCoachingSession({ tenantId: ATLAS, coachUserId: "u-coach-1", learnerUserId: "u-learn-1", title: "Growth 1:1", start: futureIso(3) });
    await flushNotifications();
    stub.reset();

    const newStart = futureIso(6);
    const updated = rescheduleCoachingSession({ tenantId: ATLAS, sessionId: "session-1", start: newStart });
    expect(updated.sequence).toBe(1);
    expect(updated.dueDate).toBe(newStart);

    await flushNotifications();
    const ics = stub.records[stub.records.length - 1]!.ics!;
    expect(ics).toContain("UID:session-1"); // same event
    expect(ics).toContain("SEQUENCE:1"); // bumped
    expect(ics).toContain("METHOD:REQUEST");

    // Calendar reflects the new time.
    const event = getTenantCalendar(ATLAS, "coach").find((e) => e.refId === "session-1");
    expect(event!.start).toBe(newStart);
  });

  it("cancel emits METHOD:CANCEL and drops the event from the calendar", async () => {
    createCoachingSession({ tenantId: ATLAS, coachUserId: "u-coach-1", learnerUserId: "u-learn-1", title: "Growth 1:1", start: futureIso(3) });
    await flushNotifications();
    stub.reset();

    const cancelled = cancelCoachingSession({ tenantId: ATLAS, sessionId: "session-1" });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.sequence).toBe(1);

    await flushNotifications();
    const ics = stub.records[stub.records.length - 1]!.ics!;
    expect(ics).toContain("UID:session-1");
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");

    // Cancelled sessions leave the calendar.
    expect(getTenantCalendar(ATLAS, "coach").some((e) => e.refId === "session-1")).toBe(false);
  });

  it("permission model: coach → only their coachees; agent view-only; manager → team", () => {
    // Coach u-coach-1 (team Core Service Delivery) covers u-learn-1; not a learner on another team.
    expect(canManageCoachingSession("coach", ATLAS, "u-coach-1", "u-learn-1")).toBe(true);
    expect(canManageCoachingSession("coach", ATLAS, "u-coach-1", "u-learn-2")).toBe(false); // outside coverage
    expect(canManageCoachingSession("learner", ATLAS, "u-learn-1", "u-learn-1")).toBe(false); // agents view-only
    expect(canManageCoachingSession("executive", ATLAS, "u-exec-1", "u-learn-1")).toBe(false);
    expect(canManageCoachingSession("manager", ATLAS, "u-mgr-1", "u-learn-1")).toBe(true); // whole team
    expect(canManageCoachingSession("platform_admin", ATLAS, "system", "u-learn-1")).toBe(true);
  });

  it("router: a coach schedules for a covered learner and it surfaces in demo.secureCalendar", async () => {
    const coach = appRouter.createCaller(ctx("coach", "atlas-coach"));
    const created = await coach.demo.secureCreateCoachingSession({ tenantId: ATLAS, learnerUserId: "u-learn-1", title: "Weekly sync", start: futureIso(2) });
    expect(created.id).toBe("session-1");

    const calendar = await coach.demo.secureCalendar({ tenantId: ATLAS });
    expect(calendar.some((e: { refId: string }) => e.refId === "session-1")).toBe(true);
  });

  it("router: an agent (learner) cannot create a coaching session (view-only)", async () => {
    const agent = appRouter.createCaller(ctx("user", "atlas-learner"));
    await expect(
      agent.demo.secureCreateCoachingSession({ tenantId: ATLAS, learnerUserId: "u-learn-1", title: "Nope", start: futureIso(2) }),
    ).rejects.toThrow(/cannot schedule coaching/i);
  });

  it("router: a coach cannot schedule for a learner outside their coverage", async () => {
    const coach = appRouter.createCaller(ctx("coach", "atlas-coach"));
    await expect(
      coach.demo.secureCreateCoachingSession({ tenantId: ATLAS, learnerUserId: "u-learn-2", title: "Not mine", start: futureIso(2) }),
    ).rejects.toThrow(/cannot schedule coaching/i);
  });

  it("restart-survival: a created session round-trips through the persisted row shape", () => {
    const start = futureIso(4);
    const session = createCoachingSession({ tenantId: ATLAS, coachUserId: "u-coach-1", learnerUserId: "u-learn-1", title: "Durable", start, durationMins: 45 });

    // Write-through serialization → hydrate deserialization preserves the durable surface.
    const row = coachingSessionToRow(session);
    const rehydrated = coachingSessionFromRow({ ...row, createdAt: new Date(0), updatedAt: new Date(0) });

    expect(rehydrated.id).toBe(session.id);
    expect(rehydrated.tenantId).toBe(ATLAS);
    expect(rehydrated.coachUserId).toBe("u-coach-1");
    expect(rehydrated.learnerUserId).toBe("u-learn-1");
    expect(rehydrated.start).toBe(start);
    expect(rehydrated.dueDate).toBe(start); // feed reads dueDate; column is `start`
    expect(rehydrated.durationMins).toBe(45);
    expect(rehydrated.status).toBe("scheduled");
    expect(rehydrated.sequence).toBe(0);
    expect(rehydrated.type).toBe("coaching");
  });
});

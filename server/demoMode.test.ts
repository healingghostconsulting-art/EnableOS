import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Phase 1 hardening — DEMO_MODE gates the unauthenticated public "mirror" procedures.
// An anonymous caller (no session). The gate reads process.env.DEMO_MODE at call time.
const anonCtx = { req: {} as any, res: {} as any, user: null } as unknown as TrpcContext;
const caller = appRouter.createCaller(anonCtx);

const GATED_READS: Array<[string, () => Promise<unknown>]> = [
  ["demo.admin", () => caller.demo.admin({})],
  ["demo.manager", () => caller.demo.manager({})],
  ["demo.coach", () => caller.demo.coach({})],
  ["demo.learner", () => caller.demo.learner({})],
  ["demo.executive", () => caller.demo.executive({})],
  ["demo.bundle", () => caller.demo.bundle({})],
  ["demo.library", () => caller.demo.library({})],
  ["demo.tenants", () => caller.demo.tenants()],
  ["demo.entrySummary", () => caller.demo.entrySummary({})],
  ["demo.landing", () => caller.demo.landing()],
  ["demo.notificationOutbox", () => caller.demo.notificationOutbox()],
];

describe("DEMO_MODE gating (Phase 1)", () => {
  afterEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("demo.config reports the flag (always public, no data)", async () => {
    delete process.env.DEMO_MODE;
    expect(await caller.demo.config()).toEqual({ demoMode: true });
    process.env.DEMO_MODE = "false";
    expect(await caller.demo.config()).toEqual({ demoMode: false });
  });

  it("in demo mode, the public mirrors still populate with tenant data", async () => {
    delete process.env.DEMO_MODE; // default true
    const admin: any = await caller.demo.admin({});
    expect(admin.tenantUsers.length).toBeGreaterThan(0);
    const learner: any = await caller.demo.learner({});
    expect(learner.learner.readinessScore).toBeGreaterThan(0);
  });

  it("in production (DEMO_MODE=false), every gated read mirror is NOT_FOUND", async () => {
    process.env.DEMO_MODE = "false";
    for (const [, call] of GATED_READS) {
      await expect(call()).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });

  it("in production, the gated preview WRITE + notification mirrors are NOT_FOUND (gate runs before input parsing)", async () => {
    process.env.DEMO_MODE = "false";
    await expect(caller.demo.previewUpdateBranding({} as any)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.demo.previewAuthorLibraryCore({} as any)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.demo.setNotificationPreference({} as any)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.demo.setNotificationUnsubscribe({} as any)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("always-public config + non-tenant catalog stay reachable in production", async () => {
    process.env.DEMO_MODE = "false";
    expect(await caller.demo.config()).toEqual({ demoMode: false });
    await expect(caller.demo.methodologyMappings()).resolves.toBeDefined();
  });

  it("the secure* path still enforces auth/scoping regardless of DEMO_MODE (UNAUTHORIZED, not NOT_FOUND)", async () => {
    process.env.DEMO_MODE = "false";
    await expect(caller.demo.secureManager({ tenantId: "atlas-operations" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    delete process.env.DEMO_MODE; // even in demo mode, secure* is still auth-gated
    await expect(caller.demo.secureAdmin({ tenantId: "atlas-operations" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

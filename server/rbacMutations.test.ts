import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Phase 2 hardening — server-side RBAC on every mutating procedure. The server never
// relies on client gating: in production (DEMO_MODE=false) an anonymous caller is
// rejected before input is even parsed, and an authenticated caller is scoped to its
// own tenant + role via assertScopedAccess. These tests exercise the wire, not the UI.

const anonCtx = { req: {}, res: {}, user: null } as unknown as TrpcContext;
const learnerCtx = { req: {}, res: {}, user: { openId: "atlas-learner", role: "user" } } as unknown as TrpcContext;
const adminCtx = { req: {}, res: {}, user: { openId: "atlas-admin", role: "admin" } } as unknown as TrpcContext;

const anon = appRouter.createCaller(anonCtx);
const learner = appRouter.createCaller(learnerCtx);
const admin = appRouter.createCaller(adminCtx);

// Auth/role middleware runs BEFORE input parsing, so an empty payload still trips the
// gate — no need to build a valid input to prove the rejection.
const PROTECTED_MUTATIONS = [
  "secureUploadContent", "secureUpdateBranding", "secureSaveGoal", "secureInviteUser",
  "secureSetUserActivation", "secureSaveCustomRole", "secureSetGrantRole",
  "secureAuthorQuizTenant", "secureAuthorLibraryTenant", "secureCreateReviewLog",
  "secureCreateWeeklyCoachingLog", "secureCreateCoachingSession", "secureRescheduleCoachingSession",
  "secureCancelCoachingSession", "secureUpdateRetrainingAssignmentStatus",
];
const ADMIN_MUTATIONS = [
  "updateBranding", "secureAuthorQuizCore", "secureCreateChcgTenant",
  "secureUpdateTenantTrainingAccess", "secureUpdateChcgPlatformSettings",
];
const DEMO_MUTATIONS = ["setNotificationPreference", "setNotificationUnsubscribe", "previewUpdateBranding"];

describe("Phase 2 — server-side RBAC on mutating procedures", () => {
  afterEach(() => { delete process.env.DEMO_MODE; });

  it("anonymous callers cannot invoke any protected mutation (UNAUTHORIZED)", async () => {
    for (const name of PROTECTED_MUTATIONS) {
      await expect((anon.demo as any)[name]({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
  });

  it("anonymous callers cannot invoke any admin mutation (FORBIDDEN)", async () => {
    for (const name of ADMIN_MUTATIONS) {
      await expect((anon.demo as any)[name]({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("in production the demo-only write mirrors 404 (NOT_FOUND), forcing the secure path", async () => {
    process.env.DEMO_MODE = "false";
    for (const name of DEMO_MUTATIONS) {
      await expect((anon.demo as any)[name]({})).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });

  it("an authenticated non-admin cannot perform admin-scoped writes (FORBIDDEN)", async () => {
    process.env.DEMO_MODE = "false";
    // A learner grant fails the client_admin workspace check inside assertScopedAccess.
    await expect(learner.demo.secureInviteUser({ tenantId: "atlas-operations", email: "x@y.com", name: "X", workspaceRole: "learner" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(learner.demo.secureSaveCustomRole({ tenantId: "atlas-operations", name: "Role", baseRole: "learner", grants: ["/learner"] }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("a tenant admin cannot write across tenants (FORBIDDEN)", async () => {
    process.env.DEMO_MODE = "false";
    // atlas-admin is client_admin of atlas-operations; writing to lighthouse-finance is denied.
    await expect(admin.demo.secureInviteUser({ tenantId: "lighthouse-finance", email: "x@y.com", name: "X", workspaceRole: "learner" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.demo.secureUpdateBranding({ tenantId: "lighthouse-finance", accent: "#115E59", logoMark: "EO", preferredLabel: "Cross Tenant", heroStatement: "Should be blocked by scope." }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

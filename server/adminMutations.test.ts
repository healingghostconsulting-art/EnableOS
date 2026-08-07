import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { DrizzleAdminPersistence, InMemoryAdminPersistence, __setAdminPersistence } from "./adminPersistence";

// Phase 1 hardening — the real write flows persist to MySQL only when DEMO_MODE=false;
// in the shared demo the same procedures return their optimistic result and never write.
// Tests swap an InMemory persistence in to assert what would be written (no DB needed).

const adminCtx = { req: {}, res: {}, user: { openId: "atlas-admin", role: "admin" } } as unknown as TrpcContext;
const caller = appRouter.createCaller(adminCtx);
const TENANT = "atlas-operations";

let store: InMemoryAdminPersistence;

describe("Phase 1 — real write flows gated by DEMO_MODE", () => {
  beforeEach(() => {
    store = new InMemoryAdminPersistence();
    __setAdminPersistence(store);
  });
  afterEach(() => {
    delete process.env.DEMO_MODE;
    __setAdminPersistence(new DrizzleAdminPersistence());
  });

  it("persists an invite in prod (DEMO_MODE=false) but not in the demo", async () => {
    process.env.DEMO_MODE = "false";
    await caller.demo.secureInviteUser({ tenantId: TENANT, email: "new.person@example.com", name: "New Person", workspaceRole: "learner" });
    expect(store.listInvites(TENANT).length).toBe(1);

    // Demo mode: identical call, no persistence — the demo stays reset-friendly.
    delete process.env.DEMO_MODE;
    store = new InMemoryAdminPersistence();
    __setAdminPersistence(store);
    const res = await caller.demo.secureInviteUser({ tenantId: TENANT, email: "demo@example.com", name: "Demo", workspaceRole: "learner" });
    expect(res.email).toBe("demo@example.com"); // still returns the optimistic result
    expect(store.listInvites(TENANT).length).toBe(0);
  });

  it("clamps custom-role grants to the base ceiling (narrow-only, server-enforced)", async () => {
    process.env.DEMO_MODE = "false";
    // learner base permits /learner + /training, never /admin — the /admin grant is dropped.
    const res = await caller.demo.secureSaveCustomRole({ tenantId: TENANT, name: "QA Analyst", baseRole: "learner", grants: ["/learner", "/admin", "/training"] });
    expect(res.grants).toContain("/learner");
    expect(res.grants).toContain("/training");
    expect(res.grants).not.toContain("/admin");
    expect(store.listCustomRoles(TENANT).length).toBe(1);
  });

  it("persists branding + a goal in prod", async () => {
    process.env.DEMO_MODE = "false";
    await caller.demo.secureUpdateBranding({ tenantId: TENANT, accent: "#115E59", logoMark: "EO", preferredLabel: "Test Workspace", heroStatement: "A hardened production workspace." });
    expect(store.getBranding(TENANT)?.accent).toBe("#115E59");

    await caller.demo.secureSaveGoal({ tenantId: TENANT, learnerUserId: "u-learn-1", title: "Improve QA first-pass", status: "active" });
    expect(store.listGoals(TENANT, "u-learn-1").length).toBe(1);
  });

  it("persists deactivate + role change in prod", async () => {
    process.env.DEMO_MODE = "false";
    await caller.demo.secureSetUserActivation({ tenantId: TENANT, userOpenId: "atlas-learner", deactivated: true });
    expect(store.isDeactivated(TENANT, "atlas-learner")).toBe(true);

    await caller.demo.secureSetGrantRole({ tenantId: TENANT, userOpenId: "atlas-learner", workspaceRole: "manager" });
    expect(store.grantRoleOf(TENANT, "atlas-learner")).toBe("manager");
  });

  it("rejects invalid input (zod) before touching persistence", async () => {
    process.env.DEMO_MODE = "false";
    await expect(
      caller.demo.secureInviteUser({ tenantId: TENANT, email: "not-an-email", name: "X", workspaceRole: "learner" }),
    ).rejects.toBeTruthy();
    expect(store.listInvites(TENANT).length).toBe(0);
  });
});

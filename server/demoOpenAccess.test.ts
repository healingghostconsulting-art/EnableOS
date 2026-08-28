import { afterEach, describe, expect, it } from "vitest";
import { getViewerAccess } from "./demoPlatform";
import { isDemoOpenAccess } from "./_core/env";
import { canGrantAccessWorkspace, permittedWorkspaces } from "../shared/workspaceAccess";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// DEMO_OPEN_ACCESS opens every workspace to every role for the demo WITHOUT editing either
// permission system. The flag is read at call time and is structurally gated on isDemoMode()
// so DEMO_MODE=false makes it inert. These tests flip the env per-case and restore it.

const ENV_KEYS = ["DEMO_MODE", "DEMO_OPEN_ACCESS"] as const;
const savedEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) savedEnv[key] = process.env[key];

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

function ctx(openId: string): TrpcContext {
  return {
    user: {
      id: 1,
      openId,
      email: "demo@example.com",
      name: "Demo User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("DEMO_OPEN_ACCESS", () => {
  it("(a) flag unset — viewerAccess keeps the real restricted permittedRoles", () => {
    delete process.env.DEMO_MODE; // demo mode on by default
    delete process.env.DEMO_OPEN_ACCESS;
    expect(isDemoOpenAccess()).toBe(false);

    const coach = getViewerAccess("atlas-coach");
    expect(coach?.openAccess).toBe(false);
    expect(coach?.permittedRoles).toEqual(["coach", "learner"]);

    const manager = getViewerAccess("atlas-manager");
    expect(manager?.permittedRoles).toEqual(["manager", "coach", "learner", "client_admin"]);

    // The shared helpers are unchanged when openAccess is not passed / false.
    expect(canGrantAccessWorkspace("learner", "/chcg-admin")).toBe(false);
    expect(permittedWorkspaces("learner")).not.toContain("/chcg-admin");
  });

  it("(b) DEMO_MODE on + DEMO_OPEN_ACCESS=true — every role opens up", () => {
    delete process.env.DEMO_MODE; // demo mode on
    process.env.DEMO_OPEN_ACCESS = "true";
    expect(isDemoOpenAccess()).toBe(true);

    const coach = getViewerAccess("atlas-coach");
    expect(coach?.openAccess).toBe(true);
    expect(coach?.permittedRoles).toContain("executive");
    expect(coach?.permittedRoles).toEqual(["executive", "manager", "coach", "learner", "client_admin"]);

    expect(canGrantAccessWorkspace("learner", "/chcg-admin", true)).toBe(true);
    expect(permittedWorkspaces("learner", true)).toContain("/chcg-admin");
  });

  it("(c) DEMO_MODE=false + DEMO_OPEN_ACCESS=true — the flag is inert (DEMO_MODE wins)", () => {
    process.env.DEMO_MODE = "false";
    process.env.DEMO_OPEN_ACCESS = "true";
    expect(isDemoOpenAccess()).toBe(false);

    const coach = getViewerAccess("atlas-coach");
    expect(coach?.openAccess).toBe(false);
    expect(coach?.permittedRoles).toEqual(["coach", "learner"]);
  });
});

describe("DEMO_OPEN_ACCESS — server gate (assertScopedAccess)", () => {
  it("relaxes ONLY the role check: a coach can read secureExecutive within its own tenant", async () => {
    delete process.env.DEMO_MODE; // demo mode on
    process.env.DEMO_OPEN_ACCESS = "true";
    const caller = appRouter.createCaller(ctx("atlas-coach"));
    // Same tenant (atlas-operations): role check relaxed by the flag -> resolves.
    await expect(caller.demo.secureExecutive({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
  });

  it("still blocks cross-tenant access even with DEMO_OPEN_ACCESS=true", async () => {
    delete process.env.DEMO_MODE; // demo mode on
    process.env.DEMO_OPEN_ACCESS = "true";
    const caller = appRouter.createCaller(ctx("atlas-coach"));
    // atlas-coach belongs to atlas-operations; requesting horizon-commerce must FORBID,
    // flag or no flag — the cross-tenant check is untouched.
    await expect(caller.demo.secureExecutive({ tenantId: "horizon-commerce" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("without the flag, a coach reading secureExecutive is still FORBIDDEN (role check intact)", async () => {
    delete process.env.DEMO_MODE;
    delete process.env.DEMO_OPEN_ACCESS;
    const caller = appRouter.createCaller(ctx("atlas-coach"));
    await expect(caller.demo.secureExecutive({ tenantId: "atlas-operations" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("opens the CHCG Command read (secureChcgAdmin) to a non-admin role under the flag", async () => {
    delete process.env.DEMO_MODE; // demo mode on
    process.env.DEMO_OPEN_ACCESS = "true";
    const caller = appRouter.createCaller(ctx("atlas-coach")); // app-role "user", not "admin"
    await expect(caller.demo.secureChcgAdmin({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
  });

  it("without the flag, secureChcgAdmin stays admin-only (non-admin FORBIDDEN)", async () => {
    delete process.env.DEMO_MODE;
    delete process.env.DEMO_OPEN_ACCESS;
    const caller = appRouter.createCaller(ctx("atlas-coach"));
    await expect(caller.demo.secureChcgAdmin({ tenantId: "atlas-operations" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("keeps admin MUTATIONS gated even with the flag on (a demo persona can't change tenant entitlements)", async () => {
    delete process.env.DEMO_MODE; // demo mode on
    process.env.DEMO_OPEN_ACCESS = "true";
    const caller = appRouter.createCaller(ctx("atlas-coach")); // non-admin
    await expect(
      caller.demo.secureUpdateTenantTrainingAccess({
        tenantId: "atlas-operations",
        licensedJourneyIds: [],
        licensedAssetIds: [],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("(step 3) DEMO_MODE=false leaves adminProcedure exactly as today — query stays admin-only", async () => {
    process.env.DEMO_MODE = "false";
    process.env.DEMO_OPEN_ACCESS = "true";
    const caller = appRouter.createCaller(ctx("atlas-coach"));
    await expect(caller.demo.secureChcgAdmin({ tenantId: "atlas-operations" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

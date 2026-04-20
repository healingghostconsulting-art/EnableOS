import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(overrides?: Partial<NonNullable<TrpcContext["user"]>>): TrpcContext {
  return {
    user: overrides
      ? {
          id: overrides.id ?? 1,
          openId: overrides.openId ?? "platform-admin",
          email: overrides.email ?? "demo@example.com",
          name: overrides.name ?? "Demo User",
          loginMethod: overrides.loginMethod ?? "manus",
          role: overrides.role ?? "admin",
          createdAt: overrides.createdAt ?? new Date(),
          updatedAt: overrides.updatedAt ?? new Date(),
          lastSignedIn: overrides.lastSignedIn ?? new Date(),
        }
      : null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("demo router", () => {
  it("returns landing data with multiple tenants and featured metrics", async () => {
    const caller = appRouter.createCaller(createContext());

    const landing = await caller.demo.landing();

    expect(landing.tenants.length).toBeGreaterThanOrEqual(3);
    expect(landing.featuredMetrics.length).toBeGreaterThanOrEqual(4);
    expect(landing.tenants[0]).toMatchObject({
      id: "northstar-health",
      name: "Northstar Health Access",
    });
  });

  it("returns executive data with ROI movement and methodology references", async () => {
    const caller = appRouter.createCaller(createContext());

    const executive = await caller.demo.executive({ tenantId: "northstar-health" });

    expect(executive.tenant.id).toBe("northstar-health");
    expect(executive.roiMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "QA score", delta: "+9 pts" }),
        expect.objectContaining({ label: "AHT", delta: "-63 sec" }),
      ]),
    );
    expect(executive.methodologyAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "CHCG KPI Mastery Framework" })]),
    );
    expect(executive.methodologyMappings.length).toBeGreaterThan(0);
  });

  it("returns manager data with explainable AI rationale and intervention workflow data", async () => {
    const caller = appRouter.createCaller(createContext());

    const manager = await caller.demo.manager({ tenantId: "northstar-health" });

    expect(manager.openSignals.length).toBeGreaterThan(0);
    expect(manager.interventions).toEqual(expect.arrayContaining([expect.objectContaining({ status: "overdue" })]));
    expect(manager.documentationEntries.length).toBeGreaterThan(0);
    expect(manager.reviewLogs.length).toBeGreaterThan(0);
    expect(manager.aiSuggestion.overrideAvailable).toBe(true);
    expect(manager.aiSuggestion.rationale.length).toBeGreaterThan(1);
  });

  it("returns learner data tied to a skill gap journey and assigned interventions", async () => {
    const caller = appRouter.createCaller(createContext());

    const learner = await caller.demo.learner({ tenantId: "northstar-health" });

    expect(learner.activeJourney.competencyGap).toBe("Empathy and call control");
    expect(learner.assignedInterventions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Recover empathy and documentation precision" }),
      ]),
    );
    expect(learner.methodologyAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Service Recovery Playbook" })]),
    );
  });

  it("returns admin data with tenant-scoped branding and configuration controls", async () => {
    const caller = appRouter.createCaller(createContext());

    const admin = await caller.demo.admin({ tenantId: "northstar-health" });

    expect(admin.branding.dataIsolation).toContain("Strict tenant-scoped");
    expect(admin.configuration).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "aiRationale", value: "Enabled" }),
        expect.objectContaining({ key: "humanOverride", value: "Enabled" }),
      ]),
    );
    expect(admin.tenantUsers.every((user) => user.tenantId === "northstar-health")).toBe(true);
  });

  it("denies cross-tenant secure access for a manager grant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "northstar-manager",
        role: "user",
        name: "Northstar Manager",
      }),
    );

    await expect(caller.demo.secureManager({ tenantId: "summit-financial" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows secure role access inside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "northstar-manager",
        role: "user",
        name: "Northstar Manager",
      }),
    );

    const manager = await caller.demo.secureManager({ tenantId: "northstar-health" });

    expect(manager.tenant.id).toBe("northstar-health");
    expect(manager.manager.name).toBe("Marcus Bell");
  });

  it("creates a preview review log and auto-documents the notes", async () => {
    const caller = appRouter.createCaller(createContext());

    const created = await caller.demo.previewCreateReviewLog({
      tenantId: "northstar-health",
      subjectUserId: "u-learn-1",
      authorRole: "manager",
      reviewType: "annual_review",
      title: "Annual performance review",
      notes: "Captured yearly progress, coaching consistency, and the next capability focus area.",
      nextStep: "Review readiness movement in the next annual planning cycle.",
    });

    expect(created.reviewType).toBe("annual_review");

    const learner = await caller.demo.learner({ tenantId: "northstar-health" });
    expect(learner.reviewLogs[0]?.title).toBe("Annual performance review");
    expect(learner.documentationEntries[0]?.title).toContain("documentation summary");
  });

  it("allows secure tenant-scoped review logging for a granted manager", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "northstar-manager",
        role: "user",
        name: "Northstar Manager",
      }),
    );

    const created = await caller.demo.secureCreateReviewLog({
      tenantId: "northstar-health",
      subjectUserId: "u-learn-1",
      authorRole: "manager",
      reviewType: "quarterly_check_in",
      title: "Quarterly manager review",
      notes: "Confirmed intervention progress and documented readiness movement for the quarter.",
      nextStep: "Reassess after the next monitored call set.",
    });

    expect(created.authorRole).toBe("manager");
  });

  it("denies secure review logging outside the granted tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "northstar-manager",
        role: "user",
        name: "Northstar Manager",
      }),
    );

    await expect(
      caller.demo.secureCreateReviewLog({
        tenantId: "summit-financial",
        subjectUserId: "u-learn-1",
        authorRole: "manager",
        reviewType: "one_on_one",
        title: "Cross-tenant coaching note",
        notes: "This should be rejected because the manager has no access to the other tenant.",
        nextStep: "No next step should be stored.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows platform admins to update tenant branding", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "platform-admin",
        role: "admin",
        name: "Platform Admin",
      }),
    );

    const updated = await caller.demo.updateBranding({
      tenantId: "northstar-health",
      accent: "#123ABC",
      logoMark: "NX",
      preferredLabel: "Northstar Performance Hub",
      heroStatement: "A branded CHCG performance workspace for precision coaching and operational readiness.",
    });

    expect(updated).toMatchObject({
      accent: "#123ABC",
      logoMark: "NX",
      preferredLabel: "Northstar Performance Hub",
    });

    const admin = await caller.demo.admin({ tenantId: "northstar-health" });
    expect(admin.branding.preferredLabel).toBe("Northstar Performance Hub");
  });

  it("allows secure client-admin branding updates inside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "northstar-admin",
        role: "user",
        name: "Northstar Client Admin",
      }),
    );

    const updated = await caller.demo.secureUpdateBranding({
      tenantId: "northstar-health",
      accent: "#1D4ED8",
      logoMark: "NA",
      preferredLabel: "Northstar Access Workspace",
      heroStatement: "A tenant-scoped brand configuration driven through secure client-admin access.",
    });

    expect(updated.preferredLabel).toBe("Northstar Access Workspace");
  });

  it("denies secure client-admin branding updates outside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "northstar-admin",
        role: "user",
        name: "Northstar Client Admin",
      }),
    );

    await expect(
      caller.demo.secureUpdateBranding({
        tenantId: "summit-financial",
        accent: "#2F6FED",
        logoMark: "NH",
        preferredLabel: "Invalid Tenant Update",
        heroStatement: "This secure branding update should be rejected because the client admin is outside the tenant boundary.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents non-admin users from updating branding through the platform-admin mutation", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "northstar-manager",
        role: "user",
        name: "Northstar Manager",
      }),
    );

    await expect(
      caller.demo.updateBranding({
        tenantId: "northstar-health",
        accent: "#2F6FED",
        logoMark: "NH",
        preferredLabel: "Northstar Health Access Enablement Hub",
        heroStatement: "Precision patient access performance, reinforced through CHCG enablement and coaching discipline.",
      }),
    ).rejects.toBeInstanceOf(TRPCError);
  });
});

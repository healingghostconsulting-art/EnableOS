import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
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
      expect.arrayContaining([
        expect.objectContaining({ title: "CHCG KPI Mastery Framework" }),
      ]),
    );
  });

  it("returns manager data with explainable AI rationale and intervention workflow data", async () => {
    const caller = appRouter.createCaller(createContext());

    const manager = await caller.demo.manager({ tenantId: "northstar-health" });

    expect(manager.openSignals.length).toBeGreaterThan(0);
    expect(manager.interventions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "overdue" }),
      ]),
    );
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
      expect.arrayContaining([
        expect.objectContaining({ title: "Service Recovery Playbook" }),
      ]),
    );
  });

  it("returns admin data with strict tenant-scoped branding and configuration controls", async () => {
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
});

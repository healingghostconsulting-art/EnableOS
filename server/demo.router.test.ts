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
  it("returns landing data with multiple sanitized tenants and featured metrics", async () => {
    const caller = appRouter.createCaller(createContext());

    const landing = await caller.demo.landing();

    expect(landing.tenants.length).toBeGreaterThanOrEqual(3);
    expect(landing.featuredMetrics.length).toBeGreaterThanOrEqual(4);
    expect(landing.tenants[0]).toMatchObject({
      id: "atlas-operations",
      name: "Atlas Service Group",
    });
  });

  it("returns executive data with ROI, readiness, and methodology evidence", async () => {
    const caller = appRouter.createCaller(createContext());

    const executive = await caller.demo.executive({ tenantId: "atlas-operations" });

    expect(executive.readiness.score).toBeGreaterThan(0);
    expect(executive.roiMetrics).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "QA score", delta: "+8 pts" })]),
    );
    expect(executive.methodologyAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "CHCG KPI Mastery Framework" })]),
    );
    expect(executive.methodologyMappings.length).toBeGreaterThan(0);
    expect(executive.workflowLibraryMix.documentationResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKind: "client_upload", title: "Atlas launch readiness brief" }),
        expect.objectContaining({ sourceKind: "chcg" }),
      ]),
    );
  });

  it("returns manager data with explainable AI rationale and intervention workflow data", async () => {
    const caller = appRouter.createCaller(createContext());

    const manager = await caller.demo.manager({ tenantId: "atlas-operations" });

    expect(manager.openSignals.length).toBeGreaterThan(0);
    expect(manager.interventions).toEqual(expect.arrayContaining([expect.objectContaining({ status: "in_progress" })]));
    expect(manager.documentationEntries.length).toBeGreaterThan(0);
    expect(manager.reviewLogs.length).toBeGreaterThan(0);
    expect(manager.aiSuggestion.overrideAvailable).toBe(true);
    expect(manager.aiSuggestion.rationale.length).toBeGreaterThan(1);
    expect(manager.workflowLibraryMix.interventionResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKind: "client_upload" }),
        expect.objectContaining({ sourceKind: "chcg" }),
      ]),
    );
    expect(manager.workflowLibraryMix.documentationResources.length).toBeGreaterThan(0);
  });

  it("returns learner data tied to a sanitized skill-gap journey and assigned interventions", async () => {
    const caller = appRouter.createCaller(createContext());

    const learner = await caller.demo.learner({ tenantId: "atlas-operations" });

    expect(learner.activeJourney.competencyGap).toBe("Empathy language and call control consistency");
    expect(learner.assignedInterventions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Restore workflow precision and score reliability" }),
      ]),
    );
    expect(learner.methodologyAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Service Foundations Playbook" })]),
    );
    expect(learner.workflowLibraryMix.journeyResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Atlas launch readiness brief", sourceKind: "client_upload" }),
        expect.objectContaining({ sourceKind: "chcg" }),
      ]),
    );
  });

  it("returns admin data with tenant-scoped branding, sanitization controls, and configuration", async () => {
    const caller = appRouter.createCaller(createContext());

    const admin = await caller.demo.admin({ tenantId: "atlas-operations" });

    expect(admin.branding.dataIsolation).toContain("Strict tenant-scoped");
    expect(admin.configuration).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "aiRationale", value: "Enabled" }),
        expect.objectContaining({ key: "humanOverride", value: "Enabled" }),
        expect.objectContaining({ key: "sanitizedContent", value: "Verified in demo seed layer" }),
      ]),
    );
    expect(admin.tenantUsers.every((user) => user.tenantId === "atlas-operations")).toBe(true);
    expect(admin.workflowLibraryMix.documentationResources.some((asset) => asset.sourceKind === "client_upload")).toBe(true);
  });

  it("denies cross-tenant secure access for a manager grant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Atlas Manager",
      }),
    );

    await expect(caller.demo.secureManager({ tenantId: "lighthouse-finance" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows secure role access inside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Atlas Manager",
      }),
    );

    const manager = await caller.demo.secureManager({ tenantId: "atlas-operations" });

    expect(manager.tenant.id).toBe("atlas-operations");
    expect(manager.manager.name).toBe("Marcus Bell");
  });

  it("creates a preview review log and auto-documents the notes", async () => {
    const caller = appRouter.createCaller(createContext());

    const created = await caller.demo.previewCreateReviewLog({
      tenantId: "atlas-operations",
      subjectUserId: "u-learn-1",
      authorRole: "manager",
      reviewType: "annual_review",
      title: "Annual performance review",
      notes: "Captured yearly progress, coaching consistency, and the next capability focus area.",
      nextStep: "Review readiness movement in the next annual planning cycle.",
    });

    expect(created.reviewType).toBe("annual_review");

    const learner = await caller.demo.learner({ tenantId: "atlas-operations" });
    expect(learner.reviewLogs[0]?.title).toBe("Annual performance review");
    expect(learner.documentationEntries[0]?.title).toContain("documentation summary");
  });

  it("allows secure tenant-scoped review logging for a granted manager", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Atlas Manager",
      }),
    );

    const created = await caller.demo.secureCreateReviewLog({
      tenantId: "atlas-operations",
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
        openId: "atlas-manager",
        role: "user",
        name: "Atlas Manager",
      }),
    );

    await expect(
      caller.demo.secureCreateReviewLog({
        tenantId: "lighthouse-finance",
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
      tenantId: "atlas-operations",
      accent: "#123ABC",
      logoMark: "AO",
      preferredLabel: "Atlas EnableOS Workspace",
      heroStatement: "A CHCG performance workspace for structured coaching, workflow precision, and measurable readiness movement.",
    });

    expect(updated).toMatchObject({
      accent: "#123ABC",
      logoMark: "AO",
      preferredLabel: "Atlas EnableOS Workspace",
    });

    const admin = await caller.demo.admin({ tenantId: "atlas-operations" });
    expect(admin.branding.preferredLabel).toBe("Atlas EnableOS Workspace");
  });

  it("allows secure client-admin branding updates inside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Atlas Client Admin",
      }),
    );

    const updated = await caller.demo.secureUpdateBranding({
      tenantId: "atlas-operations",
      accent: "#1D4ED8",
      logoMark: "AE",
      preferredLabel: "Atlas Enablement Workspace",
      heroStatement: "A tenant-scoped CHCG workspace configured through secure client-admin access.",
    });

    expect(updated.preferredLabel).toBe("Atlas Enablement Workspace");
  });

  it("denies secure client-admin branding updates outside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Atlas Client Admin",
      }),
    );

    await expect(
      caller.demo.secureUpdateBranding({
        tenantId: "lighthouse-finance",
        accent: "#2F6FED",
        logoMark: "LF",
        preferredLabel: "Invalid Tenant Update",
        heroStatement: "This secure branding update should be rejected because the client admin is outside the tenant boundary.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents non-admin users from updating branding through the platform-admin mutation", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Atlas Manager",
      }),
    );

    await expect(
      caller.demo.updateBranding({
        tenantId: "atlas-operations",
        accent: "#2F6FED",
        logoMark: "AS",
        preferredLabel: "Atlas Service Group EnableOS",
        heroStatement: "CHCG-powered enablement intelligence for service teams that need stronger execution, cleaner coaching, and clearer ROI.",
      }),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("returns CHCG library assets and isolates imported tenant content", async () => {
    const caller = appRouter.createCaller(createContext());

    await caller.demo.previewUploadContent({
      tenantId: "atlas-operations",
      title: "Atlas workflow launch guide",
      summary: "A tenant-scoped guide for launch governance, workflow reinforcement, and manager communication.",
      category: "Launch enablement",
      format: "Guide",
      linkedRoles: ["manager"],
      tags: ["launch", "workflow"],
      sourceLabel: "Atlas enablement office",
    });

    const atlasLibrary = await caller.demo.library({ tenantId: "atlas-operations", role: "all" });
    const lighthouseLibrary = await caller.demo.library({ tenantId: "lighthouse-finance", role: "all" });

    expect(atlasLibrary.chcgAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Service Foundations Core Deck" })]),
    );
    expect(atlasLibrary.importedAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Atlas workflow launch guide", tenantId: "atlas-operations" })]),
    );
    expect(lighthouseLibrary.importedAssets.some((asset) => asset.title === "Atlas workflow launch guide")).toBe(false);
  });

  it("creates tenant-scoped client content and surfaces it in secure library access", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Atlas Client Admin",
      }),
    );

    const created = await caller.demo.secureUploadContent({
      tenantId: "atlas-operations",
      title: "Atlas scorecard adoption checklist",
      summary: "A checklist for scorecard launch, manager calibration, and evidence capture in quarterly reviews.",
      category: "Governance",
      format: "Checklist",
      linkedRoles: ["client_admin", "manager"],
      tags: ["scorecard", "governance", "reviews"],
      sourceLabel: "Atlas PMO",
    });

    expect(created.sourceKind).toBe("client_upload");
    expect(created.tenantId).toBe("atlas-operations");

    const scopedLibrary = await caller.demo.secureLibrary({ tenantId: "atlas-operations", role: "client_admin" });
    expect(scopedLibrary.importedAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Atlas scorecard adoption checklist" })]),
    );
  });

  it("denies secure client-content upload outside the granted tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Atlas Client Admin",
      }),
    );

    await expect(
      caller.demo.secureUploadContent({
        tenantId: "lighthouse-finance",
        title: "Cross-tenant upload",
        summary: "This upload should be rejected because the client admin is not assigned to the target tenant.",
        category: "Invalid",
        format: "Document",
        linkedRoles: ["client_admin"],
        tags: ["invalid"],
        sourceLabel: "Atlas PMO",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

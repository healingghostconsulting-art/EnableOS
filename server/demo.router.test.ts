import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./storage", () => ({
  storagePut: vi.fn(async (relKey: string) => ({
    key: `mocked-${relKey.replace(/[^a-zA-Z0-9._/-]/g, "-")}`,
    url: `/manus-storage/mocked-${relKey.replace(/[^a-zA-Z0-9._/-]/g, "-")}`,
  })),
}));

const { storagePut } = await import("./storage");
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
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("returns landing data with multiple sanitized tenants and featured metrics", async () => {
    const caller = appRouter.createCaller(createContext());

    const landing = await caller.demo.landing();

    expect(landing.tenants.length).toBeGreaterThanOrEqual(3);
    expect(landing.featuredMetrics.length).toBeGreaterThanOrEqual(4);
    expect(landing.tenants[0]).toMatchObject({
      id: "atlas-operations",
      name: "Enterprise Operations Workspace",
    });
  });

  it("returns executive data with ROI, readiness, and methodology evidence", async () => {
    const caller = appRouter.createCaller(createContext());

    const executive = await caller.demo.executive({ tenantId: "atlas-operations" });

    expect(executive.readiness.score).toBeGreaterThan(0);
    expect(executive.roiMetrics).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "QA score", delta: "+8 pts" })]),
    );
    expect(executive.roiTrendSeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ period: "Jan", readiness: 70, benchmarkReadiness: 69 }),
        expect.objectContaining({ period: "May", qaScore: 89, benchmarkQa: 82 }),
      ]),
    );
    expect(executive.methodologyAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "CHCG KPI Mastery Framework" })]),
    );
    expect(executive.methodologyMappings.length).toBeGreaterThan(0);
    expect(executive.workflowLibraryMix.documentationResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKind: "client_upload", title: "Operational launch readiness brief" }),
        expect.objectContaining({ sourceKind: "chcg" }),
      ]),
    );
    expect(executive.reportingOverview).toMatchObject({
      headline: expect.stringContaining("executive-ready ROI story"),
      summaryCards: expect.arrayContaining([
        expect.objectContaining({ label: "High-alert questions", value: "3" }),
        expect.objectContaining({ label: "Coaching cadence target hit", value: "94%" }),
      ]),
    });
    expect(executive.questionReporting).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "QA Calibration and Fair Score Interpretation",
          alert: "high",
          missRate: 42,
          peerPercentile: 18,
          firstPassSuccess: 48,
          retryDependency: 29,
          attemptsLast14Days: 64,
          skillDomain: "Evaluation rigor",
          assetId: "library-workflow-precision-kit",
          journeyId: "journey-workflow-precision",
          moduleId: "mod-wp-3",
        }),
      ]),
    );
    expect(executive.lifecycleReporting).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "Early stage",
          tenureRange: "0-30 days",
          readiness: 68,
          interventionCloseRate: 82,
          peerPercentile: 26,
          errorRate: 12,
        }),
        expect.objectContaining({
          stage: "Tenured stage",
          tenureRange: "91+ days",
          qaScore: 91,
          peerPercentile: 74,
          errorRate: 5,
        }),
      ]),
    );
    expect(executive.peerBenchmarking).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cohort: "Core Service Delivery managers",
          metric: "QA score",
          score: "84th percentile",
        }),
      ]),
    );
    expect(executive.repeatAssignmentReporting).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          learner: "Nina Patel",
          assignmentCount: 3,
          module: "QA Calibration and Fair Score Interpretation",
          assetId: "library-workflow-precision-kit",
          journeyId: "journey-workflow-precision",
          moduleId: "mod-wp-3",
        }),
      ]),
    );
    expect(executive.coachingConsistency).toMatchObject({
      cadenceAdherence: "94%",
      missedIntervals: 5,
      followUpCompletion: "88%",
      documentationCompleteness: "91%",
      managerRollup: expect.arrayContaining([
        expect.objectContaining({ manager: "Marcus Bell", cadenceAdherence: 96 }),
      ]),
    });
    expect(executive.behaviorAnalysis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: "Verification language consistency",
          signalShare: "32% of flagged behaviors",
        }),
      ]),
    );
    expect(executive.errorRateReporting).toMatchObject({
      currentErrorRate: "7.8%",
      baselineErrorRate: "12.4%",
      delta: "-4.6 pts",
      trendSeries: expect.arrayContaining([
        expect.objectContaining({ period: "Jan", total: 12.4, critical: 3.1 }),
        expect.objectContaining({ period: "May", total: 7.8, moderate: 3.4, minor: 2.3 }),
      ]),
      severityMix: expect.arrayContaining([
        expect.objectContaining({ label: "Critical", value: "2.1%" }),
      ]),
    });
    expect(executive.proofOfImpact).toMatchObject({
      headline: expect.stringContaining("targeted retraining"),
      summary: expect.stringContaining("error improvement"),
      interventionCorrelation: expect.objectContaining({
        value: "0.78",
        label: "Positive intervention/readiness relationship",
      }),
      evidenceNote: expect.stringContaining("do not isolate EnableOS as the only cause"),
    });
    expect(executive.proofOfImpact.beforeAfter).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Targeted readiness cohort",
          before: 71,
          after: 83,
          delta: "+12 pts",
        }),
      ]),
    );
    expect(executive.proofOfImpact.sustainedReadiness).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "60-day sustain rate",
          value: "82%",
        }),
        expect.objectContaining({
          label: "Error-rate reduction hold",
          value: "-4.6 pts",
        }),
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
    expect(manager.weeklyCoachingLogs.length).toBeGreaterThan(0);
    expect(manager.coachCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          coach: expect.objectContaining({ role: "coach" }),
          directReport: expect.objectContaining({ role: "learner" }),
          weeklyCoachingLogs: expect.arrayContaining([
            expect.objectContaining({ subjectUserId: manager.directReport.id }),
          ]),
          latestLog: expect.objectContaining({ subjectUserId: manager.directReport.id }),
        }),
      ]),
    );
    expect(manager.aiSuggestion.overrideAvailable).toBe(true);
    expect(manager.aiSuggestion.rationale.length).toBeGreaterThan(1);
    expect(manager.workflowLibraryMix.interventionResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKind: "client_upload" }),
        expect.objectContaining({ sourceKind: "chcg" }),
      ]),
    );
    expect(manager.workflowLibraryMix.documentationResources.length).toBeGreaterThan(0);
    expect(manager.currentRetrainingAssignment).toEqual(
      expect.objectContaining({
        id: "retraining-seeded-1",
        status: expect.any(String),
      }),
    );
    expect(manager.retrainingHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-0",
          status: "completed",
          completedAt: expect.any(String),
        }),
      ]),
    );
  });

  it("returns learner data tied to a sanitized skill-gap journey and assigned interventions", async () => {
    const caller = appRouter.createCaller(createContext());

    const learner = await caller.demo.learner({ tenantId: "atlas-operations" });

    expect(learner.activeJourney.competencyGap).toBe("Empathy language and call control consistency");
    expect(learner.activeJourney.modules.length).toBeGreaterThan(1);
    expect(learner.activeJourney.modules[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        skillFocus: expect.any(String),
        completionRate: expect.any(Number),
      }),
    );
    expect(learner.assignedInterventions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Restore workflow precision and score reliability" }),
      ]),
    );
    expect(learner.methodologyAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Service Foundations Playbook" })]),
    );
    expect(learner.nextCoachingSession).toEqual(expect.objectContaining({ title: expect.any(String) }));
    expect(learner.weeklyCoachingLogs[0]).toEqual(expect.objectContaining({ coachEmail: expect.stringContaining('@') }));
    expect(learner.workflowLibraryMix.journeyResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Operational launch readiness brief", sourceKind: "client_upload" }),
        expect.objectContaining({ sourceKind: "chcg" }),
      ]),
    );
    expect(learner.currentRetrainingAssignment).toEqual(
      expect.objectContaining({
        id: "retraining-seeded-1",
        status: expect.any(String),
      }),
    );
    expect(learner.retrainingHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-0",
          status: "completed",
          completedAt: expect.any(String),
        }),
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
    expect(admin.weeklyCoachingLogs.length).toBeGreaterThan(0);
    expect(admin.customRoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Quality Assurance Analyst", inheritsFrom: "manager" }),
      ]),
    );
    expect(admin.workflowLibraryMix.documentationResources.some((asset) => asset.sourceKind === "client_upload")).toBe(true);
  });

  it("denies cross-tenant secure access for a manager grant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
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
        name: "Enterprise Manager",
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
      attachments: [
        {
          fileName: "annual-review-observation.pdf",
          mimeType: "application/pdf",
          dataBase64: "dGVzdC1wZGY=",
          sizeBytes: 2048,
        },
      ],
      attachedResources: [
        {
          id: "library-workflow-precision-kit",
          title: "Workflow Precision Kit",
          format: "Checklist",
          sourceKind: "chcg_library",
          sourceLabel: "Sanitized CHCG source modules",
        },
      ],
    });

    expect(created.reviewType).toBe("annual_review");
    expect(created.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "annual-review-observation.pdf",
          mimeType: "application/pdf",
          fileUrl: expect.stringContaining("/manus-storage/"),
        }),
      ]),
    );
    expect(created.attachedResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "library-workflow-precision-kit",
          title: "Workflow Precision Kit",
          sourceKind: "chcg_library",
        }),
      ]),
    );

    const learner = await caller.demo.learner({ tenantId: "atlas-operations" });
    expect(learner.reviewLogs[0]?.title).toBe("Annual performance review");
    expect(learner.reviewLogs[0]?.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileName: "annual-review-observation.pdf" }),
      ]),
    );
    expect(learner.reviewLogs[0]?.attachedResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "library-workflow-precision-kit" }),
      ]),
    );
    expect(learner.documentationEntries[0]?.title).toContain("documentation summary");
  });

  it("allows secure tenant-scoped review logging for a granted manager", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
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

  it("creates a preview weekly coaching log with email-copy details and learner takeaways", async () => {
    const caller = appRouter.createCaller(createContext());

    const created = await caller.demo.previewCreateWeeklyCoachingLog({
      tenantId: "atlas-operations",
      subjectUserId: "u-learn-1",
      coachRole: "manager",
      sessionDate: "2026-04-27",
      attendance: "Present, punctual, and ready with the prior call notes.",
      followUpFromPrevious: "Nina met the verification target on four of the last five monitored calls, but she still needs a cleaner final next-step statement before wrap-up.",
      coachingComments: "Reviewed recent callback examples, reinforced the approved close, and agreed that Nina will name the owner, next action, and timing before ending each interaction.",
      smartGoalCommitment: "By 2026-05-04, Nina will use the approved owner-and-next-step close on 90% of monitored callbacks and review five scored interactions on 2026-05-05.",
      additionalSupport: "Coach will provide two annotated callback examples and one live side-by-side review before the next check-in.",
      managerOfSupervisorEmail: "executive-copy@enterpriseworkspace.demo",
      agentTakeaways: "I need to keep the close short, specific, and confident so the member knows what happens next.",
      visibility: "public",
    });

    expect(created.visibility).toBe("public");
    expect(created.supervisorEmail).toContain('@');
    expect(created.managerOfSupervisorEmail).toBe("executive-copy@enterpriseworkspace.demo");
    expect(created.agentTakeaways).toContain("specific");
    expect(created.followUpFromPrevious).toContain("final next-step statement");
    expect(created.additionalSupport).not.toContain("Coach Studio modal dialog");

    const learner = await caller.demo.learner({ tenantId: "atlas-operations" });
    expect(learner.weeklyCoachingLogs[0]?.sessionDate).toBe("2026-04-27");
    expect(learner.reviewLogs[0]?.weeklyCoachingLogId).toBe(learner.weeklyCoachingLogs[0]?.id);
    expect(learner.documentationEntries[0]).toEqual(
      expect.objectContaining({
        title: expect.stringContaining("documentation summary"),
        weeklyCoachingLogId: learner.weeklyCoachingLogs[0]?.id,
      }),
    );
  });

  it("keeps the Maya Johnson weekly coaching seed structured and non-generic in the coach workspace", async () => {
    const caller = appRouter.createCaller(createContext());

    const coach = await caller.demo.coach({ tenantId: "atlas-operations" });
    const mayaLog = coach.teamWeeklyCoachingLogs.find((entry: any) => entry.employeeName === "Maya Johnson");

    expect(mayaLog).toEqual(
      expect.objectContaining({
        coachName: "Renee Lawson",
        sessionDate: "2026-04-21",
        visibility: "public",
      }),
    );
    expect(mayaLog?.followUpFromPrevious).toContain("final next-step statement");
    expect(mayaLog?.coachingComments).toContain("what will happen next");
    expect(mayaLog?.smartGoalCommitment).toContain("owner-and-next-step close");
    expect(mayaLog?.additionalSupport).not.toContain("Coach Studio modal dialog");
    expect(mayaLog?.attendance).not.toBe("Coach Studio pop-up entry");
  });


  it("keeps private weekly coaching logs off the learner workspace while preserving leadership visibility", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
      }),
    );

    const created = await caller.demo.secureCreateWeeklyCoachingLog({
      tenantId: "atlas-operations",
      subjectUserId: "u-learn-1",
      coachRole: "manager",
      sessionDate: "2026-05-02",
      attendance: "Present and reflective.",
      followUpFromPrevious: "The previous goal needs another observation cycle before it is shared back to the learner.",
      coachingComments: "Manager recorded an internal coaching note that should stay private until the leadership team is ready to release it.",
      smartGoalCommitment: "Validate the pattern privately across the next three monitored contacts before publishing a learner-facing plan.",
      additionalSupport: "Leadership will review the evidence and decide whether a public coaching log should follow.",
      visibility: "private",
    });

    expect(created.visibility).toBe("private");

    const learner = await caller.demo.learner({ tenantId: "atlas-operations" });
    expect(learner.weeklyCoachingLogs.find((entry: any) => entry.id === created.id)).toBeUndefined();
    expect(learner.documentationEntries.find((entry: any) => entry.weeklyCoachingLogId === created.id)).toBeUndefined();

    const manager = await caller.demo.secureManager({ tenantId: "atlas-operations" });
    expect(manager.weeklyCoachingLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.id, visibility: "private" }),
      ]),
    );
  });

  it("stores coaching-log attachments when leadership creates a secure weekly coaching log", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
      }),
    );

    const created = await caller.demo.secureCreateWeeklyCoachingLog({
      tenantId: "atlas-operations",
      subjectUserId: "u-learn-1",
      coachRole: "manager",
      sessionDate: "2026-05-01",
      attendance: "Present and engaged.",
      followUpFromPrevious: "The learner met the prior target and now needs to document the escalation reset phrase consistently.",
      coachingComments: "Attached the latest QA worksheet and screenshot evidence to the weekly coaching record for the next review.",
      smartGoalCommitment: "Use the escalation reset phrase on every monitored escalation call before 2026-05-08.",
      additionalSupport: "Manager will attach supporting QA evidence and review it live in the next side-by-side.",
      attachments: [
        {
          fileName: "qa-calibration-notes.pdf",
          mimeType: "application/pdf",
          dataBase64: "dGVzdC1wZGY=",
          sizeBytes: 2048,
        },
      ],
    });

    expect(created.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "qa-calibration-notes.pdf",
          mimeType: "application/pdf",
          fileUrl: expect.stringContaining("/manus-storage/"),
          uploadedByRole: "manager",
        }),
      ]),
    );
    expect(storagePut).toHaveBeenCalled();
  });

  it("allows leadership to create a secure weekly coaching log inside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-exec",
        role: "user",
        name: "Enterprise Executive",
      }),
    );

    const created = await caller.demo.secureCreateWeeklyCoachingLog({
      tenantId: "atlas-operations",
      subjectUserId: "u-learn-1",
      coachRole: "manager",
      sessionDate: "2026-04-28",
      attendance: "Present and engaged.",
      followUpFromPrevious: "Previous goal met on four of five monitored contacts.",
      coachingComments: "Executive observed stronger confidence and aligned on the next escalation-handling behavior target.",
      smartGoalCommitment: "Demonstrate the escalation reset language on every monitored escalation call this week and review on 2026-05-02.",
      additionalSupport: "Provide one calibration review with the supervisor before the next audit.",
    });

    expect(created.coachRole).toBe("executive");
    expect(created.coachEmail).toContain('@');
  });

  it("accepts concise weekly coaching notes during secure create and edit saves", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
      }),
    );

    const created = await caller.demo.secureCreateWeeklyCoachingLog({
      tenantId: "atlas-operations",
      subjectUserId: "u-learn-1",
      coachRole: "manager",
      sessionDate: "2026-05-05",
      attendance: "Here",
      followUpFromPrevious: "Met it",
      coachingComments: "Solid",
      smartGoalCommitment: "Retry",
      additionalSupport: "N/A",
    });

    expect(created.attendance).toBe("Here");
    expect(created.followUpFromPrevious).toBe("Met it");

    const updated = await caller.demo.secureUpdateWeeklyCoachingLog({
      tenantId: "atlas-operations",
      weeklyCoachingLogId: created.id,
      sessionDate: "2026-05-06",
      attendance: "Back",
      followUpFromPrevious: "Held it",
      coachingComments: "Clear",
      smartGoalCommitment: "Track",
      additionalSupport: "Job",
      agentTakeaways: "Ready",
    });

    expect(updated.attendance).toBe("Back");
    expect(updated.smartGoalCommitment).toBe("Track");
    expect(updated.agentTakeaways).toBe("Ready");

    const manager = await caller.demo.secureManager({ tenantId: "atlas-operations" });
    expect(manager.documentationEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining("Weekly coaching log updated"),
          weeklyCoachingLogId: created.id,
        }),
      ]),
    );
  });

  it("allows the learner role to add takeaways back to a weekly coaching log", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-learner",
        role: "user",
        name: "Enterprise Learner",
      }),
    );

    const updated = await caller.demo.secureUpdateWeeklyCoachingTakeaways({
      tenantId: "atlas-operations",
      weeklyCoachingLogId: "weekly-log-1",
      agentTakeaways: "I will keep my verification language consistent and use one clean summary before asking for confirmation.",
    });

    expect(updated.agentTakeaways).toContain("verification language");

    const learner = await caller.demo.learner({ tenantId: "atlas-operations" });
    expect(learner.documentationEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining("Learner takeaways added"),
          weeklyCoachingLogId: "weekly-log-1",
        }),
      ]),
    );
  });

  it("allows leadership to append attachments to an existing weekly coaching log", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-coach",
        role: "user",
        name: "Enterprise Coach Supervisor",
      }),
    );

    const updated = await caller.demo.secureAddWeeklyCoachingLogAttachments({
      tenantId: "atlas-operations",
      weeklyCoachingLogId: "weekly-log-1",
      attachments: [
        {
          fileName: "call-snippet.mp3",
          mimeType: "audio/mpeg",
          dataBase64: "YXVkaW8tdGVzdA==",
          sizeBytes: 4096,
        },
      ],
    });

    expect(updated.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "call-snippet.mp3",
          mimeType: "audio/mpeg",
          fileUrl: expect.stringContaining("/manus-storage/"),
          uploadedByRole: "coach",
        }),
      ]),
    );

    const coach = await caller.demo.secureCoach({ tenantId: "atlas-operations" });
    expect(coach.weeklyCoachingLogs.find((entry: any) => entry.id === "weekly-log-1")?.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileName: "call-snippet.mp3" }),
      ]),
    );
  });

  it("allows leadership to edit a secure weekly coaching log and propagates the updated structure", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
      }),
    );

    const updated = await caller.demo.secureUpdateWeeklyCoachingLog({
      tenantId: "atlas-operations",
      weeklyCoachingLogId: "weekly-log-1",
      sessionDate: "2026-05-03",
      attendance: "Present, prepared, and ready to review side-by-side examples.",
      followUpFromPrevious: "The learner met the prior goal on four monitored contacts and now needs to stabilize escalation openings.",
      coachingComments: "Manager updated the weekly record to emphasize a shorter recap, better escalation framing, and cleaner confirmation language.",
      smartGoalCommitment: "Use the new escalation opening on every monitored escalation call this week and review it again on 2026-05-10.",
      additionalSupport: "Supervisor will join one calibration review and provide two fresh call examples before the next check-in.",
      agentTakeaways: "I need to keep the new escalation opener consistent before I move into the recap.",
    });

    expect(updated.sessionDate).toBe("2026-05-03");
    expect(updated.smartGoalCommitment).toContain("escalation opening");

    const manager = await caller.demo.secureManager({ tenantId: "atlas-operations" });
    expect(manager.weeklyCoachingLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionDate: "2026-05-03",
          agentTakeaways: expect.stringContaining("escalation opener"),
        }),
      ]),
    );
    expect(manager.reviewLogs.some((entry: any) => entry.nextStep.includes("escalation opening"))).toBe(true);
    expect(manager.documentationEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining("Weekly coaching log updated"),
          weeklyCoachingLogId: "weekly-log-1",
        }),
      ]),
    );
  });

  it("allows tenant client admins to create custom roles that appear in secure admin data", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Enterprise Client Admin",
      }),
    );

    const created = await caller.demo.secureCreateTenantCustomRole({
      tenantId: "atlas-operations",
      name: "Workflow Quality Lead",
      description: "Owns tenant workflow audits, training follow-through, and readiness checks before new coaching requests are opened.",
      inheritsFrom: "manager",
    });

    expect(created).toMatchObject({
      tenantId: "atlas-operations",
      name: "Workflow Quality Lead",
      inheritsFrom: "manager",
    });

    const admin = await caller.demo.secureAdmin({ tenantId: "atlas-operations" });
    expect(admin.customRoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Workflow Quality Lead", inheritsFrom: "manager" }),
      ]),
    );
  });

  it("denies secure weekly coaching log creation outside the granted tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
      }),
    );

    await expect(
      caller.demo.secureCreateWeeklyCoachingLog({
        tenantId: "lighthouse-finance",
        subjectUserId: "u-learn-1",
        coachRole: "manager",
        sessionDate: "2026-04-30",
        attendance: "Present.",
        followUpFromPrevious: "Cross-tenant log should not be allowed.",
        coachingComments: "This should fail because the manager is not granted to the other tenant.",
        smartGoalCommitment: "No next step should be stored.",
        additionalSupport: "No support should be stored.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies secure review logging outside the granted tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
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
      logoMark: "EW",
      preferredLabel: "EnableOS Workspace",
      heroStatement: "A CHCG performance workspace for structured coaching, workflow precision, and measurable readiness movement.",
    });

    expect(updated).toMatchObject({
      accent: "#123ABC",
      logoMark: "EW",
      preferredLabel: "EnableOS Workspace",
    });

    const admin = await caller.demo.admin({ tenantId: "atlas-operations" });
    expect(admin.branding.preferredLabel).toBe("EnableOS Workspace");
  });

  it("allows secure client-admin branding updates inside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Enterprise Client Admin",
      }),
    );

    const updated = await caller.demo.secureUpdateBranding({
      tenantId: "atlas-operations",
      accent: "#1D4ED8",
      logoMark: "AE",
      preferredLabel: "Enablement Workspace",
      heroStatement: "A tenant-scoped CHCG workspace configured through secure client-admin access.",
    });

    expect(updated.preferredLabel).toBe("Enablement Workspace");
  });

  it("denies secure client-admin branding updates outside the assigned tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Enterprise Client Admin",
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
        name: "Enterprise Manager",
      }),
    );

    await expect(
      caller.demo.updateBranding({
        tenantId: "atlas-operations",
        accent: "#2F6FED",
        logoMark: "EW",
        preferredLabel: "Operations EnableOS Workspace",
        heroStatement: "CHCG-powered enablement intelligence for service teams that need stronger execution, cleaner coaching, and clearer ROI.",
      }),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("returns CHCG library assets and isolates imported tenant content", async () => {
    const caller = appRouter.createCaller(createContext());

    await caller.demo.previewUploadContent({
      tenantId: "atlas-operations",
      title: "Workflow launch guide",
      summary: "A tenant-scoped guide for launch governance, workflow reinforcement, and manager communication.",
      category: "Launch enablement",
      format: "Guide",
      linkedRoles: ["manager"],
      tags: ["launch", "workflow"],
      sourceLabel: "Enablement office",
      sourceType: "Program rollout",
      curriculumStatus: "pending_alignment",
      maintenanceJourneyId: "journey-workflow-precision",
      maintenanceModuleId: "mod-wp-1",
      launchReadinessNote: "Awaiting final curriculum review before direct launch is enabled.",
    });

    const atlasLibrary = await caller.demo.library({ tenantId: "atlas-operations", role: "all" });
    const lighthouseLibrary = await caller.demo.library({ tenantId: "lighthouse-finance", role: "all" });

    expect(atlasLibrary.chcgAssets).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: "Soft Skills & Customer/Patient Service Foundation" })]),
    );
    expect(atlasLibrary.importedAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Workflow launch guide",
          tenantId: "atlas-operations",
          sourceType: "Program rollout",
          curriculumStatus: "pending_alignment",
          maintenanceJourneyId: "journey-workflow-precision",
          maintenanceModuleId: "mod-wp-1",
          launchReadinessNote: "Awaiting final curriculum review before direct launch is enabled.",
          linkedJourneyIds: [],
        }),
      ]),
    );
    expect(lighthouseLibrary.importedAssets.some((asset) => asset.title === "Workflow launch guide")).toBe(false);
  });

  it("creates tenant-scoped client content and surfaces it in secure library access", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Enterprise Client Admin",
      }),
    );

    const created = await caller.demo.secureUploadContent({
      tenantId: "atlas-operations",
      title: "Scorecard adoption checklist",
      summary: "A checklist for scorecard launch, manager calibration, and evidence capture in quarterly reviews.",
      category: "Governance",
      format: "Checklist",
      linkedRoles: ["client_admin", "manager"],
      tags: ["scorecard", "governance", "reviews"],
      sourceLabel: "Program office",
      sourceType: "Leadership enablement",
      curriculumStatus: "mapped_ready",
      maintenanceJourneyId: "journey-data-led-leadership",
      maintenanceModuleId: "mod-dl-1",
      launchReadinessNote: "Ready for manager rollout once the scorecard narrative is approved.",
    });

    expect(created.sourceKind).toBe("client_upload");
    expect(created.tenantId).toBe("atlas-operations");
    expect(created.sourceType).toBe("Leadership enablement");
    expect(created.curriculumStatus).toBe("mapped_ready");
    expect(created.maintenanceJourneyId).toBe("journey-data-led-leadership");
    expect(created.maintenanceModuleId).toBe("mod-dl-1");
    expect(created.launchReadinessNote).toBe("Ready for manager rollout once the scorecard narrative is approved.");
    expect(created.linkedJourneyIds).toEqual(["journey-data-led-leadership"]);

    const scopedLibrary = await caller.demo.secureLibrary({ tenantId: "atlas-operations", role: "client_admin" });
    expect(scopedLibrary.importedAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Scorecard adoption checklist",
          sourceType: "Leadership enablement",
          curriculumStatus: "mapped_ready",
          maintenanceJourneyId: "journey-data-led-leadership",
          maintenanceModuleId: "mod-dl-1",
          linkedJourneyIds: ["journey-data-led-leadership"],
        }),
      ]),
    );
  });

  it("denies secure client-content upload outside the granted tenant", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-admin",
        role: "user",
        name: "Enterprise Client Admin",
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
        sourceLabel: "Program office",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns coach workspace data with coaching oversight, transfer context, and role-scoped library resources", async () => {
    const caller = appRouter.createCaller(createContext());

    const coach = await caller.demo.coach({ tenantId: "atlas-operations" });

    expect(coach.coach.role).toBe("coach");
    expect(coach.directLearner.role).toBe("learner");
    expect(coach.escalationPartner.role).toBe("manager");
    expect(coach.activeJourney.role).toBe("coach");
    expect(coach.teamLearners.length).toBeGreaterThan(1);
    expect(coach.teamLearners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "learner" }),
      ]),
    );
    expect(coach.teamCoachingSessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ learnerUserId: coach.directLearner.id }),
      ]),
    );
    expect(coach.teamAiSuggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ learnerUserId: coach.directLearner.id }),
      ]),
    );
    expect(coach.teamRetrainingAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ learnerUserId: coach.directLearner.id }),
      ]),
    );
    expect(coach.weeklyCoachingLogs.length).toBeGreaterThan(0);
    expect(coach.workflowLibraryMix.documentationResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKind: "client_upload" }),
        expect.objectContaining({ sourceKind: "chcg" }),
      ]),
    );
  });

  it("allows secure coach access inside the assigned tenant and blocks cross-tenant coach access", async () => {
    const caller = appRouter.createCaller(
      createContext({
        openId: "atlas-coach",
        role: "user",
        name: "Enterprise Coach Supervisor",
      }),
    );

    const coach = await caller.demo.secureCoach({ tenantId: "atlas-operations" });
    expect(coach.tenant.id).toBe("atlas-operations");
    expect(coach.coach.name).toBe("Renee Lawson");

    await expect(caller.demo.secureCoach({ tenantId: "lighthouse-finance" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

it("returns viewer access for a signed-in tenant member with role-scoped permissions", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "atlas-manager",
      role: "user",
      name: "Enterprise Manager",
    }),
  );

  const access = await caller.demo.viewerAccess();

  expect(access.tenant.id).toBe("atlas-operations");
  expect(access.grant.role).toBe("manager");
  expect(access.permittedRoles).toEqual(["manager", "coach", "learner", "client_admin"]);
});

it("maps an app-level manager role to manager, coach, learner, and client-admin workspaces while blocking executive access", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "manager-app-user",
      role: "manager",
      name: "Manager Access Tester",
    }),
  );

  const access = await caller.demo.viewerAccess();
  expect(access?.grant.role).toBe("manager");
  expect(access?.permittedRoles).toEqual(["manager", "coach", "learner", "client_admin"]);

  await expect(caller.demo.secureManager({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
  await expect(caller.demo.secureCoach({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
  await expect(caller.demo.secureLearner({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
  await expect(caller.demo.secureAdmin({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
  await expect(caller.demo.secureExecutive({ tenantId: "atlas-operations" })).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("maps an app-level coach role to coach studio plus learner access only", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "coach-app-user",
      role: "coach",
      name: "Coach Access Tester",
    }),
  );

  const access = await caller.demo.viewerAccess();
  expect(access?.grant.role).toBe("coach");
  expect(access?.permittedRoles).toEqual(["coach", "learner"]);

  await expect(caller.demo.secureCoach({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
  await expect(caller.demo.secureLearner({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
  await expect(caller.demo.secureManager({ tenantId: "atlas-operations" })).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(caller.demo.secureAdmin({ tenantId: "atlas-operations" })).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("filters secure library assets to the trainings licensed for the selected client workspace", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "platform-admin",
      role: "admin",
      name: "Platform Admin",
    }),
  );

  const horizonLibrary = await caller.demo.secureLibrary({ tenantId: "horizon-commerce", role: "all" });

  expect(horizonLibrary.chcgAssets).toEqual(
    expect.arrayContaining([expect.objectContaining({ title: "Soft Skills & Customer/Patient Service Foundation" })]),
  );
  expect(horizonLibrary.chcgAssets.some((asset) => asset.title === "QA Essentials and Score Confidence")).toBe(false);
});

it("forces learner accounts back to agent-training assets even when all-role content is requested", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "atlas-learner",
      role: "user",
      name: "Enterprise Learner",
    }),
  );

  const learnerLibrary = await caller.demo.secureLibrary({ tenantId: "atlas-operations", role: "all" });

  expect(learnerLibrary.chcgAssets.every((asset) => asset.linkedRoles.includes("learner") || asset.linkedJourneyIds.some((journeyId) => journeyId === "journey-service-foundations" || journeyId === "journey-workflow-precision"))).toBe(true);
  expect(learnerLibrary.chcgAssets.some((asset) => asset.title === "Quality Assurance Essentials")).toBe(true);
  expect(learnerLibrary.chcgAssets.some((asset) => asset.title === "Unlocking the power of date")).toBe(false);
});

it("maps a signed-in default user role to learner access in the default tenant workspace", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "ungranted-user",
      role: "user",
      name: "Ungranted Access Tester",
    }),
  );

  const access = await caller.demo.viewerAccess();
  expect(access?.grant.role).toBe("learner");
  expect(access?.tenant.id).toBe("atlas-operations");

  await expect(caller.demo.secureLibrary({ tenantId: "atlas-operations", role: "all" })).resolves.toBeTruthy();
  await expect(caller.demo.secureTraining({ tenantId: "atlas-operations" })).resolves.toBeTruthy();
});

it("returns a clean learner dashboard when a fresh-start learner session is requested", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "fresh-learner-user",
      role: "user",
      name: "Fresh Learner Tester",
    }),
  );

  const freshTraining = await caller.demo.secureTraining({ tenantId: "atlas-operations", freshStart: true });

  expect(freshTraining.learner.name).toBe("Fresh Learner Tester");
  expect(freshTraining.activeJourney.progress).toBe(0);
  expect(freshTraining.activeJourney.modules.every((module) => module.completionRate === 0)).toBe(true);
  expect(freshTraining.retrainingAssignments).toEqual([]);
  expect(freshTraining.weeklyCoachingLogs).toEqual([]);
  expect(freshTraining.notifications).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: "Fresh learner session ready" }),
    ]),
  );
});

it("denies secure training access outside the signed-in viewer's client workspace", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "atlas-learner",
      role: "user",
      name: "Enterprise Learner",
    }),
  );

  await expect(caller.demo.secureTraining({ tenantId: "lighthouse-finance" })).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("denies secure library access outside the signed-in viewer's client workspace", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "atlas-manager",
      role: "user",
      name: "Enterprise Manager",
    }),
  );

  await expect(caller.demo.secureLibrary({ tenantId: "lighthouse-finance", role: "all" })).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

it("returns CHCG Admin data for an organization-level admin", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "platform-admin",
      role: "admin",
      name: "Platform Admin",
    }),
  );

  const controlPlane = await caller.demo.secureChcgAdmin({ tenantId: "atlas-operations" });

  expect(controlPlane.organization.title).toContain("CHCG");
  expect(controlPlane.tenants.length).toBeGreaterThanOrEqual(3);
  expect(controlPlane.selectedTenant.availableJourneys.length).toBeGreaterThan(0);
  expect(controlPlane.selectedTenant.availableAssets.length).toBeGreaterThan(0);
});

it("allows CHCG Admin to create a new client workspace and configure training access", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "platform-admin",
      role: "admin",
      name: "Platform Admin",
    }),
  );

  const created = await caller.demo.secureCreateChcgTenant({
    name: "Summit Health Network",
    industry: "Healthcare operations",
    accent: "#0F766E",
    logoMark: "SHN",
    description: "A regulated client workspace for healthcare service and coaching operations.",
    heroStatement: "CHCG-managed enablement for healthcare teams that require governed access and role-specific training activation.",
  });

  expect(created.id).toBe("summit-health-network");

  const updatedEntitlement = await caller.demo.secureUpdateTenantTrainingAccess({
    tenantId: created.id,
    licensedJourneyIds: ["journey-service-foundations-hc"],
    licensedAssetIds: ["library-service-foundations-core", "library-workflow-field-kit"],
  });

  expect(updatedEntitlement.licensedJourneyIds).toContain("journey-service-foundations-hc");
  expect(updatedEntitlement.licensedAssetIds).toEqual(
    expect.arrayContaining(["library-service-foundations-core", "library-workflow-field-kit"]),
  );

  const controlPlane = await caller.demo.secureChcgAdmin({ tenantId: created.id });
  expect(controlPlane.selectedTenant.users.some((user) => user.role === "client_admin")).toBe(true);
  expect(controlPlane.selectedTenant.entitlement.licensedJourneyIds).toContain("journey-service-foundations-hc");
});

it("denies CHCG Admin controls to non-admin users", async () => {
  const caller = appRouter.createCaller(
    createContext({
      openId: "atlas-admin",
      role: "user",
      name: "Enterprise Client Admin",
    }),
  );

  await expect(caller.demo.secureChcgAdmin({ tenantId: "atlas-operations" })).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
});

  it("creates a targeted retraining assignment and learner alert when a manager approves AI guidance", async () => {
    const managerCaller = appRouter.createCaller(
      createContext({
        openId: "atlas-manager",
        role: "user",
        name: "Enterprise Manager",
      }),
    );

    const assignment = await managerCaller.demo.secureApplyCoachingGuidance({
      tenantId: "atlas-operations",
      suggestionId: "ai-1",
      approverRole: "manager",
    });

    expect(assignment.deliveryMode).toBe("ai_approved");
    expect(assignment.moduleTitle).toBeTruthy();
    expect(assignment.dueAt).toBeTruthy();
    expect(assignment.status).toBe("assigned");

    const learner = await managerCaller.demo.learner({ tenantId: "atlas-operations" });
    expect(learner.retrainingAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: assignment.id,
          moduleId: assignment.moduleId,
          requestedByRole: "manager",
        }),
      ]),
    );
    expect(learner.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining("Retraining assigned"),
          detail: expect.stringContaining("48 hours"),
        }),
      ]),
    );
  });

  it("allows a coach to override the AI suggestion with a specific module from a selected training", async () => {
    const coachCaller = appRouter.createCaller(
      createContext({
        openId: "atlas-coach",
        role: "user",
        name: "Coach Danielle",
      }),
    );

    const assignment = await coachCaller.demo.secureApplyCoachingGuidance({
      tenantId: "atlas-operations",
      suggestionId: "ai-1",
      approverRole: "coach",
      journeyId: "journey-service-foundations",
      moduleId: "mod-sf-2",
    });

    expect(assignment.deliveryMode).toBe("manual_override");
    expect(assignment.requestedByRole).toBe("coach");
    expect(assignment.journeyId).toBe("journey-service-foundations");
    expect(assignment.moduleId).toBe("mod-sf-2");

    const managerView = await coachCaller.demo.manager({ tenantId: "atlas-operations" });
    expect(managerView.currentRetrainingAssignment).toEqual(
      expect.objectContaining({
        id: assignment.id,
        moduleId: "mod-sf-2",
        requestedByRole: "coach",
        status: "assigned",
      }),
    );
    expect(managerView.retrainingHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-0",
          status: "completed",
        }),
      ]),
    );
  });

  it("updates retraining completion so learner, coach, and manager views reflect the completed chip state", async () => {
    const learnerCaller = appRouter.createCaller(
      createContext({
        openId: "atlas-learner",
        role: "user",
        name: "Enterprise Learner",
      }),
    );

    const updated = await learnerCaller.demo.secureUpdateRetrainingAssignmentStatus({
      tenantId: "atlas-operations",
      assignmentId: "retraining-seeded-1",
      status: "completed",
    });

    expect(updated.status).toBe("completed");
    expect(updated.completedAt).toBeTruthy();

    const learnerView = await learnerCaller.demo.secureLearner({ tenantId: "atlas-operations" });
    expect(learnerView.retrainingAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-1",
          status: "completed",
          completedAt: expect.any(String),
        }),
        expect.objectContaining({
          id: "retraining-seeded-0",
          status: "completed",
          completedAt: expect.any(String),
        }),
      ]),
    );
    expect(learnerView.retrainingHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-1",
          status: "completed",
          completedAt: expect.any(String),
        }),
        expect.objectContaining({
          id: "retraining-seeded-0",
          status: "completed",
          completedAt: expect.any(String),
        }),
      ]),
    );

    const coachView = await learnerCaller.demo.coach({ tenantId: "atlas-operations" });
    expect(coachView.retrainingAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-1",
          status: "completed",
          completedAt: expect.any(String),
        }),
      ]),
    );
    expect(coachView.retrainingHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-1",
          status: "completed",
          completedAt: expect.any(String),
        }),
        expect.objectContaining({
          id: "retraining-seeded-0",
          status: "completed",
          completedAt: expect.any(String),
        }),
      ]),
    );

    const managerView = await learnerCaller.demo.manager({ tenantId: "atlas-operations" });
    expect(managerView.retrainingAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-1",
          status: "completed",
          completedAt: expect.any(String),
        }),
      ]),
    );
    expect(managerView.coachCoverage[0]?.retrainingHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "retraining-seeded-1",
          status: "completed",
          completedAt: expect.any(String),
        }),
        expect.objectContaining({
          id: "retraining-seeded-0",
          status: "completed",
          completedAt: expect.any(String),
        }),
      ]),
    );
  });
});

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import {
  addWeeklyCoachingLogAttachments,
  applyCoachingGuidance,
  authorQuizContent,
  getAuthoringQuizContent,
  authorLibraryContent,
  getAuthoringLibraryContent,
  getHiddenLibraryAssets,
  authorLessonSlide,
  authorModuleBrief,
  getAuthoringLesson,
  getResolvedPresentation,
  authorDeckVisual,
  getAuthoringDeck,
  uploadDeckImage,
  createChcgTenant,
  createClientContent,
  createReviewLog,
  createWeeklyCoachingLog,
  createTenantCustomRole,
  canAccessWorkspace,
  getAccessGrant,
  getAdminDashboard,
  getChcgAdminDashboard,
  getCoachDashboard,
  getDemoBundle,
  getDemoLanding,
  getExecutiveDashboard,
  getLearnerDashboard,
  getManagerDashboard,
  getViewerAccess,
  listContentLibrary,
  listMethodologyMappings,
  listTenants,
  updateChcgPlatformSettings,
  updateRetrainingAssignmentStatus,
  updateTenantBranding,
  updateTenantTrainingAccess,
  updateWeeklyCoachingLog,
  updateWeeklyCoachingLogTakeaways,
  type DemoRole,
} from "../demoPlatform";

const tenantInput = z.object({
  tenantId: z.string().optional(),
  freshStart: z.boolean().optional(),
});

const chcgTenantInput = z.object({
  name: z.string().min(3).max(80),
  industry: z.string().min(3).max(80),
  accent: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
  logoMark: z.string().min(1).max(3),
  description: z.string().min(12).max(180),
  heroStatement: z.string().min(12).max(180),
});

const trainingAccessInput = z.object({
  tenantId: z.string(),
  licensedJourneyIds: z.array(z.string()).max(24),
  licensedAssetIds: z.array(z.string()).max(64),
});

const chcgPlatformSettingsInput = z.object({
  provisioningMode: z.enum(["Guided", "Self-serve review"]),
  defaultLibraryPolicy: z.enum(["CHCG core plus licensed tenant uploads", "Tenant-curated with CHCG overlays"]),
  trainingUnlockPolicy: z.enum(["Manual CHCG approval", "Client-admin request with CHCG confirmation"]),
  governanceNote: z.string().min(12).max(280),
});

const brandingInput = z.object({
  tenantId: z.string(),
  accent: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
  logoMark: z.string().min(1).max(3),
  preferredLabel: z.string().min(3).max(80),
  heroStatement: z.string().min(12).max(180),
});

// ── Content authoring (AUTHOR2 / Wave 1) ────────────────────────────────────
const quizOptionInput = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(240),
  rationale: z.string().max(400),
});
const quizQuestionInput = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1).max(400),
  type: z.enum(["multiple_choice", "short_answer"]).optional(),
  options: z.array(quizOptionInput).max(6).optional(),
  correctOptionId: z.string().optional(),
  acceptedAnswers: z.array(z.string()).max(12).optional(),
  placeholder: z.string().max(160).optional(),
  successFeedback: z.string().min(1).max(400),
  failureFeedback: z.string().min(1).max(400),
});
const quizOverrideOpInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("patch"), id: z.string(), patch: quizQuestionInput.partial() }),
  z.object({ kind: z.literal("add"), item: quizQuestionInput }),
  z.object({ kind: z.literal("hide"), id: z.string() }),
  z.object({ kind: z.literal("unhide"), id: z.string() }),
  z.object({ kind: z.literal("remove"), id: z.string() }),
  z.object({ kind: z.literal("meta"), meta: z.object({ passingScore: z.number().int().min(0).max(20).optional(), passingPercent: z.number().min(0).max(100).optional() }) }),
]);
const authoringQuizReadInput = z.object({
  scope: z.enum(["core", "tenant"]),
  tenantId: z.string().optional(),
  moduleId: z.string().optional(),
});
const authoringQuizWriteInput = z.object({
  scope: z.enum(["core", "tenant"]),
  tenantId: z.string().optional(),
  moduleId: z.string().min(1),
  checkpoint: z.enum(["application", "brief", "practice", "final"]).default("application"),
  op: quizOverrideOpInput,
});

// Library authoring (LIBRARY2). tenantId + sourceKind are scope-derived server-side
// (forced in normalizeLibraryOp), so they're optional/defaulted here; the deferred
// linkage fields default to empty so a stored add is a complete ContentLibraryAsset.
const libraryRoleEnum = z.enum(["executive", "manager", "coach", "learner", "client_admin", "all"]);
const libraryAssetInput = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(120),
  summary: z.string().min(2).max(500),
  category: z.string().min(2).max(80),
  format: z.enum(["Deck", "Playbook", "Checklist", "Guide", "Worksheet", "Microlearning", "Document"]),
  linkedRoles: z.array(libraryRoleEnum).min(1).max(6),
  tags: z.array(z.string().min(1).max(40)).max(12),
  sourceLabel: z.string().min(1).max(80),
  tenantId: z.string().default("all"),
  sourceKind: z.enum(["chcg", "client_upload"]).default("chcg"),
  linkedJourneyIds: z.array(z.string()).default([]),
  linkedInterventionRuleIds: z.array(z.string()).default([]),
  sourceType: z.enum(["Client SOP", "QA finding", "Compliance update", "Program rollout", "Leadership enablement"]).optional(),
  curriculumStatus: z.enum(["mapped_ready", "pending_alignment", "review_only"]).optional(),
  createdAt: z.string().default(""),
});
const libraryOverrideOpInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("patch"), id: z.string(), patch: libraryAssetInput.partial() }),
  z.object({ kind: z.literal("add"), item: libraryAssetInput }),
  z.object({ kind: z.literal("hide"), id: z.string() }),
  z.object({ kind: z.literal("unhide"), id: z.string() }),
  z.object({ kind: z.literal("remove"), id: z.string() }),
]);
const authoringLibraryReadInput = z.object({
  scope: z.enum(["core", "tenant"]),
  tenantId: z.string().optional(),
});
const authoringLibraryWriteInput = z.object({
  scope: z.enum(["core", "tenant"]),
  tenantId: z.string().optional(),
  op: libraryOverrideOpInput,
});

// Lesson + brief authoring (LESSON3). The server (normalizeLessonOp/normalizeBriefOp)
// enforces the field table by scope; these schemas only shape the payloads.
const lessonSlideInput = z.object({
  id: z.string().min(1),
  eyebrow: z.string().max(120),
  title: z.string().min(1).max(200),
  narrative: z.string().min(1).max(2000),
  bullets: z.array(z.string().max(400)).max(12),
  speakerNotes: z.array(z.string().max(400)).max(12).optional(),
  visualTone: z.string().max(120),
});
const lessonOverrideOpInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("patch"), id: z.string(), patch: lessonSlideInput.partial() }),
  z.object({ kind: z.literal("add"), item: lessonSlideInput }),
  z.object({ kind: z.literal("hide"), id: z.string() }),
  z.object({ kind: z.literal("unhide"), id: z.string() }),
  z.object({ kind: z.literal("remove"), id: z.string() }),
]);
const authoringLessonReadInput = z.object({
  scope: z.enum(["core", "tenant"]),
  tenantId: z.string().optional(),
  moduleId: z.string().min(1),
});
const authoringLessonWriteInput = z.object({
  tenantId: z.string().optional(),
  moduleId: z.string().min(1),
  stage: z.enum(["brief", "practice", "apply"]),
  op: lessonOverrideOpInput,
});
const briefPatchInput = z.object({
  heroTitle: z.string().max(200).optional(),
  heroSummary: z.string().max(2000).optional(),
  evidenceLabel: z.string().max(400).optional(),
  scenarioTitle: z.string().max(200).optional(),
  scenarioSituation: z.string().max(2000).optional(),
  scenarioLearnerTask: z.string().max(2000).optional(),
  scenarioSuccessSignals: z.array(z.string().max(400)).max(12).optional(),
});
const authoringBriefWriteInput = z.object({
  tenantId: z.string().optional(),
  moduleId: z.string().min(1),
  op: z.object({ kind: z.literal("patch"), id: z.string(), patch: briefPatchInput }),
});
const resolvedPresentationInput = z.object({ moduleId: z.string().min(1), tenantId: z.string().optional() });

// Deck-visual authoring (DECK2). Only title/caption are patchable; the schema
// admits no file/scorecard fields, and the server (normalizeDeckVisualOp) rejects
// them too. add/remove aren't offered.
const deckVisualPatchInput = z.object({
  title: z.string().max(300).optional(),
  caption: z.string().max(1000).optional(),
  // imageKey: a just-uploaded asset key (string) or null to revert. The server
  // validates the key belongs to the caller's scope (normalizeDeckVisualOp).
  imageKey: z.union([z.string().max(300), z.null()]).optional(),
});
const deckImageUploadInput = z.object({
  scope: z.enum(["core", "tenant"]),
  tenantId: z.string().optional(),
  dataBase64: z.string().min(1),
});
const deckOverrideOpInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("patch"), id: z.string(), patch: deckVisualPatchInput }),
  z.object({ kind: z.literal("hide"), id: z.string() }),
  z.object({ kind: z.literal("unhide"), id: z.string() }),
]);
const authoringDeckReadInput = z.object({
  scope: z.enum(["core", "tenant"]),
  tenantId: z.string().optional(),
  moduleId: z.string().min(1),
});
const authoringDeckWriteInput = z.object({
  tenantId: z.string().optional(),
  moduleId: z.string().min(1),
  op: deckOverrideOpInput,
});

const reviewLogInput = z.object({
  tenantId: z.string(),
  subjectUserId: z.string(),
  authorRole: z.enum(["manager", "coach", "executive", "client_admin"]),
  reviewType: z.enum(["one_on_one", "quarterly_check_in", "annual_review"]),
  title: z.string().min(3).max(120),
  notes: z.string().min(10).max(1200),
  nextStep: z.string().min(5).max(240),
  attachments: z.array(z.object({
    fileName: z.string().min(1).max(180),
    mimeType: z.string().min(1).max(160).optional(),
    dataBase64: z.string().min(1).max(20_000_000),
    sizeBytes: z.number().int().min(1).max(15 * 1024 * 1024),
  })).max(5).optional(),
  attachedResources: z.array(z.object({
    id: z.string().min(1).max(160),
    title: z.string().min(2).max(160),
    format: z.string().min(2).max(80),
    sourceKind: z.enum(["client_upload", "chcg_library"]),
    sourceLabel: z.string().min(2).max(120),
  })).max(6).optional(),
});

const coachingAttachmentUploadInput = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(160).optional(),
  dataBase64: z.string().min(1).max(20_000_000),
  sizeBytes: z.number().int().min(1).max(15 * 1024 * 1024),
});

const weeklyCoachingLogInput = z.object({
  tenantId: z.string(),
  subjectUserId: z.string(),
  coachRole: z.enum(["manager", "coach", "executive", "client_admin"]),
  sessionDate: z.string().min(8).max(40),
  attendance: z.string().min(3).max(240),
  followUpFromPrevious: z.string().min(5).max(1200),
  coachingComments: z.string().min(5).max(1600),
  smartGoalCommitment: z.string().min(5).max(800),
  additionalSupport: z.string().min(3).max(600),
  managerOfSupervisorEmail: z.string().email().optional(),
  agentTakeaways: z.string().max(800).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  attachments: z.array(coachingAttachmentUploadInput).max(5).optional(),
});

const weeklyCoachingTakeawaysInput = z.object({
  tenantId: z.string(),
  weeklyCoachingLogId: z.string(),
  agentTakeaways: z.string().min(3).max(800),
});

const weeklyCoachingLogEditInput = z.object({
  tenantId: z.string(),
  weeklyCoachingLogId: z.string(),
  sessionDate: z.string().min(8).max(40),
  attendance: z.string().min(3).max(240),
  followUpFromPrevious: z.string().min(5).max(1200),
  coachingComments: z.string().min(5).max(1600),
  smartGoalCommitment: z.string().min(5).max(800),
  additionalSupport: z.string().min(3).max(800),
  agentTakeaways: z.string().max(800).optional(),
});

const weeklyCoachingAttachmentAddInput = z.object({
  tenantId: z.string(),
  weeklyCoachingLogId: z.string(),
  attachments: z.array(coachingAttachmentUploadInput).min(1).max(5),
});

const customTenantRoleInput = z.object({
  tenantId: z.string(),
  name: z.string().min(3).max(60),
  description: z.string().min(12).max(240),
  inheritsFrom: z.enum(["executive", "manager", "coach", "learner", "client_admin"]),
});

const coachingGuidanceInput = z.object({
  tenantId: z.string(),
  suggestionId: z.string(),
  approverRole: z.enum(["manager", "coach"]),
  journeyId: z.string().optional(),
  moduleId: z.string().optional(),
});

const retrainingAssignmentStatusInput = z.object({
  tenantId: z.string(),
  assignmentId: z.string(),
  status: z.enum(["assigned", "in_progress", "completed"]),
});

const libraryInput = z.object({
  tenantId: z.string().optional(),
  role: z.enum(["executive", "manager", "coach", "learner", "client_admin", "all"]).optional(),
});

const clientContentInput = z.object({
  tenantId: z.string(),
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(500),
  category: z.string().min(3).max(80),
  format: z.enum(["Deck", "Playbook", "Checklist", "Guide", "Worksheet", "Microlearning", "Document"]),
  linkedRoles: z.array(z.enum(["executive", "manager", "coach", "learner", "client_admin", "all"]).or(z.literal("all"))).min(1).max(5),
  tags: z.array(z.string().min(2).max(24)).max(8),
  sourceLabel: z.string().min(2).max(80),
  sourceType: z.enum(["Client SOP", "QA finding", "Compliance update", "Program rollout", "Leadership enablement"]).optional(),
  curriculumStatus: z.enum(["mapped_ready", "pending_alignment", "review_only"]).optional(),
  maintenanceJourneyId: z.string().max(120).optional(),
  maintenanceModuleId: z.string().max(120).optional(),
  launchReadinessNote: z.string().min(8).max(220).optional(),
  fileName: z.string().max(140).optional(),
  mimeType: z.string().max(120).optional(),
  dataBase64: z.string().max(10_000_000).optional(),
});

function assertScopedAccess(openId: string | undefined, appRole: string | undefined, requestedTenantId: string | undefined, requiredRole: DemoRole) {
  const grant = getAccessGrant(openId, appRole);

  if (!grant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No tenant access grant is configured for this user." });
  }

  const tenantId = requestedTenantId ?? grant.tenantId;

  if (grant.role !== "platform_admin" && grant.tenantId !== tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cross-tenant access is not allowed." });
  }

  if (!canAccessWorkspace(grant.role, requiredRole)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This role cannot access the requested workspace." });
  }

  return tenantId;
}

function assertTenantMembership(openId: string | undefined, appRole: string | undefined, requestedTenantId: string | undefined) {
  const grant = getAccessGrant(openId, appRole);

  if (!grant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No tenant access grant is configured for this user." });
  }

  const tenantId = requestedTenantId ?? grant.tenantId;
  if (grant.role !== "platform_admin" && grant.tenantId !== tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cross-tenant access is not allowed." });
  }

  return { grant, tenantId };
}

function sanitizeUploadFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function uploadWeeklyCoachingAttachments(
  tenantId: string,
  uploadedByRole: "manager" | "coach" | "executive" | "client_admin",
  attachments?: Array<z.infer<typeof coachingAttachmentUploadInput>>,
) {
  if (!attachments?.length) {
    return [];
  }

  const batchTimestamp = Date.now();
  const uploadedAt = new Date().toISOString();

  return await Promise.all(attachments.map(async (attachment, index) => {
    const safeFileName = sanitizeUploadFileName(attachment.fileName);
    const upload = await storagePut(
      `weekly-coaching-attachments/${tenantId}/${batchTimestamp}-${index + 1}-${safeFileName}`,
      Buffer.from(attachment.dataBase64, "base64"),
      attachment.mimeType || "application/octet-stream",
    );

    return {
      id: `weekly-attachment-${batchTimestamp}-${index + 1}`,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType || "application/octet-stream",
      fileUrl: upload.url,
      storageKey: upload.key,
      sizeBytes: attachment.sizeBytes,
      uploadedAt,
      uploadedByRole,
    };
  }));
}

export const demoRouter = router({
  landing: publicProcedure.query(() => getDemoLanding()),
  tenants: publicProcedure.query(() => listTenants()),
  methodologyMappings: publicProcedure.query(() => listMethodologyMappings()),
  viewerAccess: protectedProcedure.query(({ ctx }) => getViewerAccess(ctx.user.openId, ctx.user.role)),
  bundle: publicProcedure.input(tenantInput).query(({ input }) => getDemoBundle(input.tenantId)),
  executive: publicProcedure.input(tenantInput).query(({ input }) => getExecutiveDashboard(input.tenantId)),
  manager: publicProcedure.input(tenantInput).query(({ input }) => getManagerDashboard(input.tenantId)),
  coach: publicProcedure.input(tenantInput).query(({ input }) => getCoachDashboard(input.tenantId)),
  learner: publicProcedure.input(tenantInput).query(({ input }) => getLearnerDashboard(input.tenantId)),
  admin: publicProcedure.input(tenantInput).query(({ input }) => getAdminDashboard(input.tenantId)),
  library: publicProcedure.input(libraryInput).query(({ input }) => listContentLibrary(input.tenantId, input.role)),
  secureExecutive: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "executive");
    return getExecutiveDashboard(tenantId);
  }),
  secureManager: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "manager");
    return getManagerDashboard(tenantId);
  }),
  secureCoach: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "coach");
    return getCoachDashboard(tenantId);
  }),
  secureLearner: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "learner");
    return getLearnerDashboard(tenantId, {
      freshStart: input.freshStart,
      viewerName: ctx.user.name,
      viewerOpenId: ctx.user.openId,
    });
  }),
  secureTraining: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const { tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);
    return getLearnerDashboard(tenantId, {
      freshStart: input.freshStart,
      viewerName: ctx.user.name,
      viewerOpenId: ctx.user.openId,
    });
  }),
  secureAdmin: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return getAdminDashboard(tenantId);
  }),
  secureChcgAdmin: adminProcedure.input(tenantInput).query(({ input }) => getChcgAdminDashboard(input.tenantId)),
  // Content authoring reads (AUTHOR2). preview = demo/public; secure = authed.
  previewAuthoringQuiz: publicProcedure.input(authoringQuizReadInput).query(({ input }) => getAuthoringQuizContent(input)),
  secureAuthoringQuiz: protectedProcedure.input(authoringQuizReadInput).query(({ ctx, input }) => {
    if (input.scope === "tenant") {
      const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
      return getAuthoringQuizContent({ ...input, tenantId });
    }
    return getAuthoringQuizContent(input);
  }),
  previewAuthoringLibrary: publicProcedure.input(authoringLibraryReadInput).query(({ input }) => getAuthoringLibraryContent(input)),
  secureAuthoringLibrary: protectedProcedure.input(authoringLibraryReadInput).query(({ ctx, input }) => {
    if (input.scope === "tenant") {
      const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
      return getAuthoringLibraryContent({ ...input, tenantId });
    }
    return getAuthoringLibraryContent(input);
  }),
  secureLibrary: protectedProcedure.input(libraryInput).query(({ ctx, input }) => {
    const grant = getAccessGrant(ctx.user.openId, ctx.user.role);

    if (!grant) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tenant access grant is configured for this user." });
    }

    const tenantId = input.tenantId ?? grant.tenantId;
    if (grant.role !== "platform_admin" && grant.tenantId !== tenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cross-tenant access is not allowed." });
    }

    const requestedRole = grant.role === "learner"
      ? "learner"
      : input.role;

    return listContentLibrary(tenantId, requestedRole);
  }),
  previewUploadContent: publicProcedure.input(clientContentInput).mutation(async ({ input }) => {
    let fileUrl: string | undefined;

    if (input.dataBase64 && input.fileName && input.mimeType) {
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const upload = await storagePut(
        `demo-content-library/${input.tenantId}/${Date.now()}-${safeFileName}`,
        Buffer.from(input.dataBase64, "base64"),
        input.mimeType,
      );
      fileUrl = upload.url;
    }

    return createClientContent({
      tenantId: input.tenantId,
      title: input.title,
      summary: input.summary,
      category: input.category,
      format: input.format,
      linkedRoles: input.linkedRoles,
      tags: input.tags,
      sourceLabel: input.sourceLabel,
      sourceType: input.sourceType,
      curriculumStatus: input.curriculumStatus,
      maintenanceJourneyId: input.maintenanceJourneyId,
      maintenanceModuleId: input.maintenanceModuleId,
      launchReadinessNote: input.launchReadinessNote,
      fileName: input.fileName,
      fileUrl,
    });
  }),
  secureUploadContent: protectedProcedure.input(clientContentInput).mutation(async ({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    let fileUrl: string | undefined;

    if (input.dataBase64 && input.fileName && input.mimeType) {
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const upload = await storagePut(
        `demo-content-library/${tenantId}/${Date.now()}-${safeFileName}`,
        Buffer.from(input.dataBase64, "base64"),
        input.mimeType,
      );
      fileUrl = upload.url;
    }

    return createClientContent({
      tenantId,
      title: input.title,
      summary: input.summary,
      category: input.category,
      format: input.format,
      linkedRoles: input.linkedRoles,
      tags: input.tags,
      sourceLabel: input.sourceLabel,
      sourceType: input.sourceType,
      curriculumStatus: input.curriculumStatus,
      maintenanceJourneyId: input.maintenanceJourneyId,
      maintenanceModuleId: input.maintenanceModuleId,
      launchReadinessNote: input.launchReadinessNote,
      fileName: input.fileName,
      fileUrl,
    });
  }),
  previewUpdateBranding: publicProcedure.input(brandingInput).mutation(({ input }) => updateTenantBranding(input)),
  secureUpdateBranding: protectedProcedure.input(brandingInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return updateTenantBranding({ ...input, tenantId });
  }),
  updateBranding: adminProcedure.input(brandingInput).mutation(({ input }) => updateTenantBranding(input)),
  // Content authoring writes (AUTHOR2). Tenant layer → client_admin (protected);
  // core layer → platform_admin (admin). preview = demo/public, mirroring branding.
  previewAuthorQuizTenant: publicProcedure.input(authoringQuizWriteInput).mutation(({ input }) =>
    authorQuizContent({ scope: "tenant", tenantId: input.tenantId, moduleId: input.moduleId, checkpoint: input.checkpoint, op: input.op }),
  ),
  secureAuthorQuizTenant: protectedProcedure.input(authoringQuizWriteInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return authorQuizContent({ scope: "tenant", tenantId, moduleId: input.moduleId, checkpoint: input.checkpoint, op: input.op });
  }),
  previewAuthorQuizCore: publicProcedure.input(authoringQuizWriteInput).mutation(({ input }) =>
    authorQuizContent({ scope: "core", moduleId: input.moduleId, checkpoint: input.checkpoint, op: input.op }),
  ),
  secureAuthorQuizCore: adminProcedure.input(authoringQuizWriteInput).mutation(({ input }) =>
    authorQuizContent({ scope: "core", moduleId: input.moduleId, checkpoint: input.checkpoint, op: input.op }),
  ),
  previewAuthorLibraryTenant: publicProcedure.input(authoringLibraryWriteInput).mutation(({ input }) =>
    authorLibraryContent({ scope: "tenant", tenantId: input.tenantId, op: input.op }),
  ),
  secureAuthorLibraryTenant: protectedProcedure.input(authoringLibraryWriteInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return authorLibraryContent({ scope: "tenant", tenantId, op: input.op });
  }),
  // LIBRARY4: tombstoned-asset read for the restore shelf (unhide reuses the
  // previewAuthorLibrary{Tenant,Core} mutations with a generic unhide op).
  previewHiddenLibrary: publicProcedure.input(authoringLibraryReadInput).query(({ input }) => getHiddenLibraryAssets(input)),
  secureHiddenLibrary: protectedProcedure.input(authoringLibraryReadInput).query(({ ctx, input }) => {
    if (input.scope === "tenant") {
      const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
      return getHiddenLibraryAssets({ ...input, tenantId });
    }
    return getHiddenLibraryAssets(input);
  }),
  previewAuthorLibraryCore: publicProcedure.input(authoringLibraryWriteInput).mutation(({ input }) =>
    authorLibraryContent({ scope: "core", op: input.op }),
  ),
  secureAuthorLibraryCore: adminProcedure.input(authoringLibraryWriteInput).mutation(({ input }) =>
    authorLibraryContent({ scope: "core", op: input.op }),
  ),
  // LESSON4: the player's resolved-presentation read. preview takes an explicit
  // tenantId; secure derives it from the authed viewer's grant (null → core view).
  previewResolvedPresentation: publicProcedure.input(resolvedPresentationInput).query(({ input }) => getResolvedPresentation(input.moduleId, input.tenantId ?? null)),
  secureResolvedPresentation: protectedProcedure.input(z.object({ moduleId: z.string().min(1), tenantId: z.string().optional() })).query(({ ctx, input }) => {
    const { tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);
    return getResolvedPresentation(input.moduleId, tenantId);
  }),
  previewAuthoringLesson: publicProcedure.input(authoringLessonReadInput).query(({ input }) => getAuthoringLesson(input)),
  secureAuthoringLesson: protectedProcedure.input(authoringLessonReadInput).query(({ ctx, input }) => {
    if (input.scope === "tenant") {
      const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
      return getAuthoringLesson({ ...input, tenantId });
    }
    return getAuthoringLesson(input);
  }),
  previewAuthorLessonTenant: publicProcedure.input(authoringLessonWriteInput).mutation(({ input }) =>
    authorLessonSlide({ scope: "tenant", tenantId: input.tenantId, moduleId: input.moduleId, stage: input.stage, op: input.op }),
  ),
  secureAuthorLessonTenant: protectedProcedure.input(authoringLessonWriteInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return authorLessonSlide({ scope: "tenant", tenantId, moduleId: input.moduleId, stage: input.stage, op: input.op });
  }),
  previewAuthorLessonCore: publicProcedure.input(authoringLessonWriteInput).mutation(({ input }) =>
    authorLessonSlide({ scope: "core", moduleId: input.moduleId, stage: input.stage, op: input.op }),
  ),
  secureAuthorLessonCore: adminProcedure.input(authoringLessonWriteInput).mutation(({ input }) =>
    authorLessonSlide({ scope: "core", moduleId: input.moduleId, stage: input.stage, op: input.op }),
  ),
  previewAuthorBriefTenant: publicProcedure.input(authoringBriefWriteInput).mutation(({ input }) =>
    authorModuleBrief({ scope: "tenant", tenantId: input.tenantId, moduleId: input.moduleId, op: input.op }),
  ),
  secureAuthorBriefTenant: protectedProcedure.input(authoringBriefWriteInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return authorModuleBrief({ scope: "tenant", tenantId, moduleId: input.moduleId, op: input.op });
  }),
  previewAuthorBriefCore: publicProcedure.input(authoringBriefWriteInput).mutation(({ input }) =>
    authorModuleBrief({ scope: "core", moduleId: input.moduleId, op: input.op }),
  ),
  secureAuthorBriefCore: adminProcedure.input(authoringBriefWriteInput).mutation(({ input }) =>
    authorModuleBrief({ scope: "core", moduleId: input.moduleId, op: input.op }),
  ),
  // DECK2: deck-visual authoring reads/writes (title/caption + hide/unhide).
  previewAuthoringDeck: publicProcedure.input(authoringDeckReadInput).query(({ input }) => getAuthoringDeck(input)),
  secureAuthoringDeck: protectedProcedure.input(authoringDeckReadInput).query(({ ctx, input }) => {
    if (input.scope === "tenant") {
      const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
      return getAuthoringDeck({ ...input, tenantId });
    }
    return getAuthoringDeck(input);
  }),
  previewAuthorDeckTenant: publicProcedure.input(authoringDeckWriteInput).mutation(({ input }) =>
    authorDeckVisual({ scope: "tenant", tenantId: input.tenantId, moduleId: input.moduleId, op: input.op }),
  ),
  secureAuthorDeckTenant: protectedProcedure.input(authoringDeckWriteInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return authorDeckVisual({ scope: "tenant", tenantId, moduleId: input.moduleId, op: input.op });
  }),
  previewAuthorDeckCore: publicProcedure.input(authoringDeckWriteInput).mutation(({ input }) =>
    authorDeckVisual({ scope: "core", moduleId: input.moduleId, op: input.op }),
  ),
  secureAuthorDeckCore: adminProcedure.input(authoringDeckWriteInput).mutation(({ input }) =>
    authorDeckVisual({ scope: "core", moduleId: input.moduleId, op: input.op }),
  ),
  // DECK3: image upload. All validation is server-side (magic bytes, size, dims).
  // The secure path derives scope/tenant from the authed grant, NOT client input —
  // tenant → client_admin's own tenant; core → platform_admin only.
  previewUploadDeckImage: publicProcedure.input(deckImageUploadInput).mutation(({ input }) =>
    uploadDeckImage({ scope: input.scope, tenantId: input.tenantId, dataBase64: input.dataBase64 }),
  ),
  secureUploadDeckImageTenant: protectedProcedure.input(deckImageUploadInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return uploadDeckImage({ scope: "tenant", tenantId, dataBase64: input.dataBase64 });
  }),
  secureUploadDeckImageCore: adminProcedure.input(deckImageUploadInput).mutation(({ input }) =>
    uploadDeckImage({ scope: "core", dataBase64: input.dataBase64 }),
  ),
  secureCreateChcgTenant: adminProcedure.input(chcgTenantInput).mutation(({ input }) => createChcgTenant(input)),
  secureUpdateTenantTrainingAccess: adminProcedure.input(trainingAccessInput).mutation(({ input }) => updateTenantTrainingAccess(input)),
  secureUpdateChcgPlatformSettings: adminProcedure.input(chcgPlatformSettingsInput).mutation(({ input }) => updateChcgPlatformSettings(input)),
  previewCreateReviewLog: publicProcedure.input(reviewLogInput).mutation(async ({ input }) => {
    const attachments = await uploadWeeklyCoachingAttachments(input.tenantId, input.authorRole, input.attachments);
    return createReviewLog({ ...input, attachments });
  }),
  secureCreateReviewLog: protectedProcedure.input(reviewLogInput).mutation(async ({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, input.authorRole === "client_admin" ? "client_admin" : (input.authorRole as DemoRole));
    const attachments = await uploadWeeklyCoachingAttachments(tenantId, input.authorRole, input.attachments);
    return createReviewLog({ ...input, tenantId, attachments });
  }),
  previewCreateWeeklyCoachingLog: publicProcedure.input(weeklyCoachingLogInput).mutation(async ({ input }) => {
    const attachments = await uploadWeeklyCoachingAttachments(input.tenantId, input.coachRole, input.attachments);
    return createWeeklyCoachingLog({ ...input, attachments });
  }),
  secureCreateWeeklyCoachingLog: protectedProcedure.input(weeklyCoachingLogInput).mutation(async ({ ctx, input }) => {
    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);

    if (!["manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership roles can create weekly coaching logs." });
    }

    const coachRole = (grant.role === "platform_admin" ? input.coachRole : grant.role) as "manager" | "coach" | "executive" | "client_admin";
    const attachments = await uploadWeeklyCoachingAttachments(tenantId, coachRole, input.attachments);
    return createWeeklyCoachingLog({ ...input, tenantId, coachRole, attachments });
  }),
  previewUpdateWeeklyCoachingTakeaways: publicProcedure.input(weeklyCoachingTakeawaysInput).mutation(({ input }) => updateWeeklyCoachingLogTakeaways(input)),
  secureUpdateWeeklyCoachingTakeaways: protectedProcedure.input(weeklyCoachingTakeawaysInput).mutation(({ ctx, input }) => {
    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);

    if (!["learner", "manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This role cannot update coaching takeaways." });
    }

    return updateWeeklyCoachingLogTakeaways({ ...input, tenantId });
  }),
  previewUpdateWeeklyCoachingLog: publicProcedure.input(weeklyCoachingLogEditInput).mutation(({ input }) => updateWeeklyCoachingLog(input)),
  secureUpdateWeeklyCoachingLog: protectedProcedure.input(weeklyCoachingLogEditInput).mutation(({ ctx, input }) => {
    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);

    if (!["manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership roles can edit weekly coaching logs." });
    }

    return updateWeeklyCoachingLog({ ...input, tenantId });
  }),
  secureAddWeeklyCoachingLogAttachments: protectedProcedure.input(weeklyCoachingAttachmentAddInput).mutation(async ({ ctx, input }) => {
    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);

    if (!["manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership roles can attach files to weekly coaching logs." });
    }

    const uploadedByRole = (grant.role === "platform_admin" ? "client_admin" : grant.role) as "manager" | "coach" | "executive" | "client_admin";
    const attachments = await uploadWeeklyCoachingAttachments(tenantId, uploadedByRole, input.attachments);
    return addWeeklyCoachingLogAttachments({ ...input, tenantId, attachments });
  }),
  secureCreateTenantCustomRole: protectedProcedure.input(customTenantRoleInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, ctx.user.role, input.tenantId, "client_admin");
    return createTenantCustomRole({ ...input, tenantId });
  }),
  secureApplyCoachingGuidance: protectedProcedure.input(coachingGuidanceInput).mutation(({ ctx, input }) => {
    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);

    if (!["manager", "coach", "client_admin", "platform_admin"].includes(grant.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only coach and manager roles can assign targeted retraining." });
    }

    const approverRole = grant.role === "platform_admin"
      ? input.approverRole
      : grant.role === "client_admin"
        ? input.approverRole
        : grant.role;

    if (approverRole !== "manager" && approverRole !== "coach") {
      throw new TRPCError({ code: "FORBIDDEN", message: "The selected approver role is not valid for coaching guidance." });
    }

    return applyCoachingGuidance({
      tenantId,
      suggestionId: input.suggestionId,
      approverRole,
      journeyId: input.journeyId,
      moduleId: input.moduleId,
    });
  }),
  secureUpdateRetrainingAssignmentStatus: protectedProcedure.input(retrainingAssignmentStatusInput).mutation(({ ctx, input }) => {
    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);

    if (!["learner", "manager", "coach", "client_admin", "platform_admin"].includes(grant.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This role cannot update retraining assignment status." });
    }

    return updateRetrainingAssignmentStatus({
      tenantId,
      assignmentId: input.assignmentId,
      status: input.status,
    });
  }),

});

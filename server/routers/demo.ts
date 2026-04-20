import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import {
  createClientContent,
  createReviewLog,
  getAccessGrant,
  getAdminDashboard,
  getDemoBundle,
  getDemoLanding,
  getExecutiveDashboard,
  getLearnerDashboard,
  getManagerDashboard,
  listContentLibrary,
  listMethodologyMappings,
  listTenants,
  updateTenantBranding,
  type DemoRole,
} from "../demoPlatform";

const tenantInput = z.object({
  tenantId: z.string().optional(),
});

const brandingInput = z.object({
  tenantId: z.string(),
  accent: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
  logoMark: z.string().min(1).max(3),
  preferredLabel: z.string().min(3).max(80),
  heroStatement: z.string().min(12).max(180),
});

const reviewLogInput = z.object({
  tenantId: z.string(),
  subjectUserId: z.string(),
  authorRole: z.enum(["manager", "executive", "client_admin"]),
  reviewType: z.enum(["one_on_one", "quarterly_check_in", "annual_review"]),
  title: z.string().min(3).max(120),
  notes: z.string().min(10).max(1200),
  nextStep: z.string().min(5).max(240),
});

const libraryInput = z.object({
  tenantId: z.string().optional(),
  role: z.enum(["executive", "manager", "learner", "client_admin", "all"]).optional(),
});

const clientContentInput = z.object({
  tenantId: z.string(),
  title: z.string().min(3).max(120),
  summary: z.string().min(10).max(500),
  category: z.string().min(3).max(80),
  format: z.enum(["Deck", "Playbook", "Checklist", "Guide", "Worksheet", "Microlearning", "Document"]),
  linkedRoles: z.array(z.enum(["executive", "manager", "learner", "client_admin", "all"]).or(z.literal("all"))).min(1).max(4),
  tags: z.array(z.string().min(2).max(24)).max(8),
  sourceLabel: z.string().min(2).max(80),
  fileName: z.string().max(140).optional(),
  mimeType: z.string().max(120).optional(),
  dataBase64: z.string().max(10_000_000).optional(),
});

function assertScopedAccess(openId: string | undefined, requestedTenantId: string | undefined, requiredRole: DemoRole) {
  const grant = getAccessGrant(openId);

  if (!grant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No tenant access grant is configured for this user." });
  }

  if (grant.role !== "platform_admin") {
    if (grant.tenantId !== requestedTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cross-tenant access is not allowed." });
    }

    if (grant.role !== requiredRole && grant.role !== "client_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "This role cannot access the requested workspace." });
    }
  }

  return requestedTenantId ?? grant.tenantId;
}

export const demoRouter = router({
  landing: publicProcedure.query(() => getDemoLanding()),
  tenants: publicProcedure.query(() => listTenants()),
  methodologyMappings: publicProcedure.query(() => listMethodologyMappings()),
  bundle: publicProcedure.input(tenantInput).query(({ input }) => getDemoBundle(input.tenantId)),
  executive: publicProcedure.input(tenantInput).query(({ input }) => getExecutiveDashboard(input.tenantId)),
  manager: publicProcedure.input(tenantInput).query(({ input }) => getManagerDashboard(input.tenantId)),
  learner: publicProcedure.input(tenantInput).query(({ input }) => getLearnerDashboard(input.tenantId)),
  admin: publicProcedure.input(tenantInput).query(({ input }) => getAdminDashboard(input.tenantId)),
  library: publicProcedure.input(libraryInput).query(({ input }) => listContentLibrary(input.tenantId, input.role)),
  secureExecutive: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, input.tenantId, "executive");
    return getExecutiveDashboard(tenantId);
  }),
  secureManager: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, input.tenantId, "manager");
    return getManagerDashboard(tenantId);
  }),
  secureLearner: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, input.tenantId, "learner");
    return getLearnerDashboard(tenantId);
  }),
  secureAdmin: protectedProcedure.input(tenantInput).query(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, input.tenantId, "client_admin");
    return getAdminDashboard(tenantId);
  }),
  secureLibrary: protectedProcedure.input(libraryInput).query(({ ctx, input }) => {
    const grant = getAccessGrant(ctx.user.openId);

    if (!grant) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No tenant access grant is configured for this user." });
    }

    const tenantId = input.tenantId ?? grant.tenantId;
    if (grant.role !== "platform_admin" && grant.tenantId !== tenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cross-tenant access is not allowed." });
    }

    return listContentLibrary(tenantId, input.role);
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
      fileName: input.fileName,
      fileUrl,
    });
  }),
  secureUploadContent: protectedProcedure.input(clientContentInput).mutation(async ({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, input.tenantId, "client_admin");
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
      fileName: input.fileName,
      fileUrl,
    });
  }),
  previewUpdateBranding: publicProcedure.input(brandingInput).mutation(({ input }) => updateTenantBranding(input)),
  secureUpdateBranding: protectedProcedure.input(brandingInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, input.tenantId, "client_admin");
    return updateTenantBranding({ ...input, tenantId });
  }),
  updateBranding: adminProcedure.input(brandingInput).mutation(({ input }) => updateTenantBranding(input)),
  previewCreateReviewLog: publicProcedure.input(reviewLogInput).mutation(({ input }) => createReviewLog(input)),
  secureCreateReviewLog: protectedProcedure.input(reviewLogInput).mutation(({ ctx, input }) => {
    const tenantId = assertScopedAccess(ctx.user.openId, input.tenantId, input.authorRole === "client_admin" ? "client_admin" : (input.authorRole as DemoRole));
    return createReviewLog({ ...input, tenantId });
  }),
});

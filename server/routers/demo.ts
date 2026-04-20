import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createReviewLog,
  getAccessGrant,
  getAdminDashboard,
  getDemoBundle,
  getDemoLanding,
  getExecutiveDashboard,
  getLearnerDashboard,
  getManagerDashboard,
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

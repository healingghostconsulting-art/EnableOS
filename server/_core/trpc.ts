import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { isDemoMode, isDemoOpenAccess } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Demo-only public procedures: the unauthenticated "mirror" endpoints that back the
// demo. In production (DEMO_MODE=false) they 404, forcing every caller through the
// authenticated, server-scoped `secure*` procedures. Evaluated per-request so tests
// can flip DEMO_MODE. Runs before input parsing, so a gated call always 404s.
const demoOnly = t.middleware(async ({ next }) => {
  if (!isDemoMode()) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This endpoint is only available in demo mode." });
  }
  return next();
});

export const demoPublicProcedure = t.procedure.use(demoOnly);

function requireOneOfRoles(allowedRoles: Array<"admin" | "manager" | "coach">, message: string) {
  return t.middleware(async opts => {
    const { ctx, next, type } = opts;

    // Auth is always required (a demo persona is still a signed-in session).
    if (!ctx.user) {
      throw new TRPCError({ code: "FORBIDDEN", message });
    }

    // Demo open-access opens role-gated READS (queries) to every authenticated role so the
    // whole demo is explorable — e.g. a learner persona can view CHCG Command. MUTATIONS are
    // NEVER opened: a demo persona must not execute admin writes (create tenant, change
    // entitlements, author core content). isDemoOpenAccess() ANDs isDemoMode(), so
    // DEMO_MODE=false leaves this middleware behaving exactly as it does today.
    const openReadForDemo = type === "query" && isDemoOpenAccess();
    if (!openReadForDemo && !allowedRoles.includes(ctx.user.role as "admin" | "manager" | "coach")) {
      throw new TRPCError({ code: "FORBIDDEN", message });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });
}

export const adminProcedure = t.procedure.use(requireOneOfRoles(["admin"], NOT_ADMIN_ERR_MSG));

export const managerProcedure = t.procedure.use(
  requireOneOfRoles(["admin", "manager"], "Manager access is required for this action."),
);

export const coachProcedure = t.procedure.use(
  requireOneOfRoles(["admin", "manager", "coach"], "Coach access is required for this action."),
);

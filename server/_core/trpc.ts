import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

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

function requireOneOfRoles(allowedRoles: Array<"admin" | "manager" | "coach">, message: string) {
  return t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !allowedRoles.includes(ctx.user.role as "admin" | "manager" | "coach")) {
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

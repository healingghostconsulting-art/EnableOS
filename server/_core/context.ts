import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getAuthProvider } from "./authProvider";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Authentication runs through the AUTH SEAM (server/_core/authProvider.ts), so a
    // managed IdP can replace the demo OAuth via AUTH_PROVIDER without touching this
    // call site. Provider returns null for an anonymous/invalid session.
    user = await getAuthProvider().authenticate(opts.req);
  } catch (error) {
    // Belt-and-braces: authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

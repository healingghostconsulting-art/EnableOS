import type { Request } from "express";
import { sdk, type AuthenticatedUser } from "./sdk";

// ──────────────────────────────────────────────────────────────────────────────
// AUTH SEAM (Phase 5 hardening).
//
// All request authentication goes through this interface, so a managed IdP (e.g.
// Clerk) can replace the demo Manus OAuth WITHOUT touching any call site. The only
// consumer is createContext(); it never imports the SDK directly. Swapping providers
// is env-only: set AUTH_PROVIDER=clerk (plus the IdP's keys) and implement the one
// method below. The demo OAuth stays the default, so nothing changes until then.
//
// This is also where the Phase 1 invited-user seam closes: an invite is persisted, but
// the person cannot sign in until a real IdP provisions their account and mints a
// session here (demo OAuth only authenticates existing Manus users).
// ──────────────────────────────────────────────────────────────────────────────

export interface AuthProvider {
  readonly name: string;
  /** Resolve the authenticated user for a request, or null when unauthenticated. */
  authenticate(req: Request): Promise<AuthenticatedUser | null>;
}

/** Default provider — the existing Manus OAuth session flow, behavior unchanged. */
export class ManusOAuthAuthProvider implements AuthProvider {
  readonly name = "manus-oauth";
  async authenticate(req: Request): Promise<AuthenticatedUser | null> {
    try {
      return await sdk.authenticateRequest(req);
    } catch {
      // Authentication is optional for public procedures — an invalid/absent session
      // resolves to an anonymous request rather than an error.
      return null;
    }
  }
}

/**
 * Drop-in point for a managed IdP. A real implementation verifies the IdP session
 * (e.g. Clerk networkless JWT verification with CLERK_SECRET_KEY / CLERK_JWT_KEY),
 * maps the IdP user to an AuthenticatedUser, and upserts the local `users` row —
 * exactly the shape ManusOAuthAuthProvider returns, so every downstream procedure,
 * RBAC check, and tenant grant keeps working untouched.
 *
 * Left as a documented seam so no new dependency is required to ship. Activating it is
 * env-only (AUTH_PROVIDER=clerk) and edits only this file.
 */
export class ClerkAuthProvider implements AuthProvider {
  readonly name = "clerk";
  async authenticate(_req: Request): Promise<AuthenticatedUser | null> {
    throw new Error(
      "Clerk auth provider is not configured. Add @clerk/backend, verify the session here " +
        "(CLERK_SECRET_KEY / CLERK_JWT_KEY), map the Clerk user to an AuthenticatedUser, and " +
        "upsert the local users row. Set AUTH_PROVIDER=clerk to activate — no call sites change.",
    );
  }
}

/** Build a provider from an env token. Default (unset/manus) = the demo Manus OAuth. */
export function createAuthProvider(kind: string | undefined | null): AuthProvider {
  switch ((kind ?? "").toLowerCase()) {
    case "clerk":
      return new ClerkAuthProvider();
    case "manus":
    case "manus-oauth":
    case "":
    default:
      return new ManusOAuthAuthProvider();
  }
}

let provider: AuthProvider | null = null;

/** The active provider, selected once from AUTH_PROVIDER. */
export function getAuthProvider(): AuthProvider {
  if (!provider) provider = createAuthProvider(process.env.AUTH_PROVIDER);
  return provider;
}

/** Override / reset the provider (tests). */
export function __setAuthProvider(next: AuthProvider | null): void { provider = next; }

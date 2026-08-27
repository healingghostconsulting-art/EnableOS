import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { GrantRole } from "@shared/workspaceAccess";
import type { User } from "../../drizzle/schema";
import { isDemoMode } from "./env";
import { getSessionCookieOptions } from "./cookies";
import type { AuthenticatedUser } from "./sdk";
import type { AuthProvider } from "./authProvider";

// ──────────────────────────────────────────────────────────────────────────────
// TEMPORARY demo entry — a clickable site with NO auth server (Manus is gone; a real
// IdP is being chosen separately). This adds ALONGSIDE ManusOAuthAuthProvider and the
// AuthProvider interface; it deletes/rewrites nothing.
//
// Two hard guarantees:
//   • Server-gated. Everything here refuses (404 / returns null) when isDemoMode() is
//     false. There is no client-only check to edit around.
//   • No real data path. A demo session's openId is one of the SEEDED accessGrants
//     (demoPlatform.ts) — `getAccessGrant`/`getViewerAccess`/the dashboards all read the
//     in-memory seed, and NOTHING in this file (or the resolution it triggers) calls the
//     database. Even if DATABASE_URL is set, a demo session can never read a real tenant.
//
// The demo cookie is a JWT signed with a FIXED demo key (below), independent of JWT_SECRET
// (which is unset in a bare demo deploy — signing with an empty key throws). A side effect
// is that a demo cookie is cryptographically invalid under the real provider's secret, so it
// cannot be honoured once DEMO_MODE is off.
// ──────────────────────────────────────────────────────────────────────────────

// Each entry role → a seeded accessGrant openId (all scoped to the atlas-operations demo
// tenant). Reuses the existing GrantRole values; no parallel role concept is introduced.
const DEMO_ROLE_OPENID: Record<GrantRole, string> = {
  executive: "atlas-exec",
  manager: "atlas-manager",
  coach: "atlas-coach",
  learner: "atlas-learner",
  client_admin: "atlas-admin",
  platform_admin: "platform-admin",
};
const DEMO_OPENIDS = new Set(Object.values(DEMO_ROLE_OPENID));

// Fixed, non-secret key for the demo JWT. Security here is the isDemoMode() gate, not key
// secrecy — this is a labelled demo over seeded data with no real account behind it.
const DEMO_JWT_KEY = new TextEncoder().encode("enableos-demo-session-v1");
const DEMO_JWT_ALG = "HS256";

// Where each role lands after entering (mirrors ROLE_HOME on the entry page).
const ROLE_HOME: Record<GrantRole, string> = {
  executive: "/reporting",
  manager: "/manager",
  coach: "/coach",
  learner: "/learner",
  client_admin: "/admin",
  platform_admin: "/chcg-admin",
};

// users.role enum is user|coach|manager|admin. Grant resolution keys off openId, so this
// is only a sensible ctx.user.role default, never the source of truth for access.
const APP_ROLE: Record<GrantRole, User["role"]> = {
  executive: "user",
  manager: "manager",
  coach: "coach",
  learner: "user",
  client_admin: "admin",
  platform_admin: "admin",
};

export function isDemoGrantRole(value: string): value is GrantRole {
  return Object.prototype.hasOwnProperty.call(DEMO_ROLE_OPENID, value);
}

function roleForOpenId(openId: string): GrantRole {
  const entry = Object.entries(DEMO_ROLE_OPENID).find(([, id]) => id === openId);
  return (entry?.[0] as GrantRole) ?? "learner";
}

function demoUserFor(openId: string): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1, // surrogate; real users are auto-increment > 0
    openId,
    name: "Demo",
    email: null,
    loginMethod: "demo",
    role: APP_ROLE[roleForOpenId(openId)],
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  } as AuthenticatedUser;
}

async function signDemoToken(openId: string): Promise<string> {
  return new SignJWT({ demo: true })
    .setProtectedHeader({ alg: DEMO_JWT_ALG, typ: "JWT" })
    .setSubject(openId)
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(DEMO_JWT_KEY);
}

async function verifyDemoToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, DEMO_JWT_KEY, { algorithms: [DEMO_JWT_ALG] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Resolves ONLY seeded demo sessions, entirely in memory — it never calls the database and
 * never reaches the Manus network. Active only while isDemoMode() (see getAuthProvider);
 * a leftover demo cookie in production resolves to null through the real provider instead.
 */
export class DemoAuthProvider implements AuthProvider {
  readonly name = "demo";
  async authenticate(req: Request): Promise<AuthenticatedUser | null> {
    if (!isDemoMode()) return null; // belt-and-braces; selection already gates this
    const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
    const openId = await verifyDemoToken(token);
    if (!openId || !DEMO_OPENIDS.has(openId)) return null;
    return demoUserFor(openId);
  }
}

/**
 * `GET /api/demo/enter?role=<GrantRole>` — the server-side gate. Mints a role-scoped demo
 * session cookie and 302s into the workspace. Returns 404 when demo mode is off, so the
 * entry point simply does not exist in production. Wrapped so a signing fault can never
 * take the process down.
 */
export function registerDemoEntry(app: Express) {
  app.get("/api/demo/enter", async (req: Request, res: Response) => {
    if (!isDemoMode()) {
      res.status(404).json({ error: "not found" });
      return;
    }
    const role = String(req.query.role ?? "");
    if (!isDemoGrantRole(role)) {
      res.status(400).json({ error: "unknown demo role" });
      return;
    }
    try {
      const token = await signDemoToken(DEMO_ROLE_OPENID[role]);
      res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, ROLE_HOME[role] ?? "/mission-hub");
    } catch (error) {
      console.error("[DemoEntry] Failed to mint demo session:", error);
      res.status(500).json({ error: "demo entry failed" });
    }
  });
}

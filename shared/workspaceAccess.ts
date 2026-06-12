// ──────────────────────────────────────────────────────────────────────────────
// WORKSPACE ACCESS — the single authoritative role→workspaces matrix.
//
// Both the sidebar nav (App.tsx) and the route access guard read THIS map, so they
// can never disagree. The `?role=` query param is NOT consulted here — it only scopes
// the Training Zone's curriculum persona (TrainingExperienceView.requestedRoleFilter).
// ──────────────────────────────────────────────────────────────────────────────

export type GrantRole = "learner" | "coach" | "manager" | "executive" | "client_admin" | "platform_admin";

export type WorkspacePath =
  | "/mission-hub"
  | "/guide"
  | "/reporting"
  | "/manager"
  | "/coach"
  | "/learner"
  | "/training"
  | "/library"
  | "/admin"
  | "/chcg-admin";

/** Sidebar display order; the nav is this list filtered by the active role's access. */
export const WORKSPACE_ORDER: readonly WorkspacePath[] = [
  "/mission-hub",
  "/guide",
  "/reporting",
  "/manager",
  "/coach",
  "/learner",
  "/training",
  "/library",
  "/admin",
  "/chcg-admin",
];

/** The locked access matrix. Client Admin = all but CHCG Command; CHCG (platform) admin = all. */
export const WORKSPACE_ACCESS: Record<GrantRole, readonly WorkspacePath[]> = {
  learner: ["/guide", "/learner", "/training", "/library"],
  coach: ["/guide", "/reporting", "/coach", "/learner", "/training", "/library"],
  manager: ["/guide", "/reporting", "/manager", "/coach", "/learner", "/training", "/library"],
  executive: ["/mission-hub", "/guide", "/reporting", "/training", "/library"],
  client_admin: ["/mission-hub", "/guide", "/reporting", "/manager", "/coach", "/learner", "/training", "/library", "/admin"],
  platform_admin: ["/mission-hub", "/guide", "/reporting", "/manager", "/coach", "/learner", "/training", "/library", "/admin", "/chcg-admin"],
};

/**
 * Shared workspaces — reachable from several personas. Navigating to these must NEVER
 * change the active workspace role (that was the bug: Training Zone reset the nav).
 */
export const SHARED_WORKSPACES: readonly WorkspacePath[] = ["/mission-hub", "/guide", "/training", "/library"];

/** Dedicated role-home routes → the persona they represent. */
export const DEDICATED_ROUTE_ROLE: Partial<Record<WorkspacePath, GrantRole>> = {
  "/reporting": "executive",
  "/manager": "manager",
  "/coach": "coach",
  "/learner": "learner",
  "/admin": "client_admin",
  "/chcg-admin": "platform_admin",
};

/**
 * Personas a grant may adopt as its active workspace role (its own role + the personas
 * it oversees). A grant's own role always has the widest access of anything it can adopt,
 * so adopting a sub-persona never shrinks the nav.
 */
export const ADOPTABLE_ROLES: Record<GrantRole, readonly GrantRole[]> = {
  learner: ["learner"],
  coach: ["coach", "learner"],
  manager: ["manager", "coach", "learner"],
  executive: ["executive"],
  client_admin: ["client_admin", "executive", "manager", "coach", "learner"],
  platform_admin: ["platform_admin", "client_admin", "executive", "manager", "coach", "learner"],
};

export function isGrantRole(value: unknown): value is GrantRole {
  return typeof value === "string" && value in WORKSPACE_ACCESS;
}

export function normalizeGrantRole(value: unknown): GrantRole | null {
  return isGrantRole(value) ? value : null;
}

/** The ordered workspaces visible to a role — the sidebar nav set. */
export function permittedWorkspaces(role: GrantRole | null | undefined): WorkspacePath[] {
  if (!role) return [];
  const set = new Set(WORKSPACE_ACCESS[role]);
  return WORKSPACE_ORDER.filter((path) => set.has(path));
}

/** Whether a grant may enter a path — the union of every persona it can adopt. */
export function canGrantAccessWorkspace(grantRole: GrantRole | null | undefined, path: string): boolean {
  if (path === "/" || path === "/404") return true;
  if (!grantRole) return false;
  return ADOPTABLE_ROLES[grantRole].some((role) => (WORKSPACE_ACCESS[role] as readonly string[]).includes(path));
}

/** Clamp a desired active role to one the grant may adopt; fall back to the grant role. */
export function clampActiveRole(desired: GrantRole | null | undefined, grantRole: GrantRole | null | undefined): GrantRole | null {
  if (!grantRole) return null;
  if (desired && ADOPTABLE_ROLES[grantRole].includes(desired)) return desired;
  return grantRole;
}

/**
 * Resolve the active workspace role that drives the sidebar. The nav reflects the
 * SELECTED workspace, with the grant only as the permission ceiling:
 * - A dedicated role route selects that persona (the picked workspace), clamped to what
 *   the grant may adopt. So an admin on /coach sees the coach nav, on /manager the manager
 *   nav, etc. — not the grant's full ceiling.
 * - Shared workspaces (/training, /library, /guide, /mission-hub) keep the previously
 *   selected role, so navigating to them never changes the nav (the Training Zone bug).
 * - Default with no selection (home / grant home like /chcg-admin) = the grant's own role,
 *   which for an admin is its full set.
 */
export function resolveActiveWorkspaceRole(options: {
  path: string;
  grantRole: GrantRole | null | undefined;
  persisted?: GrantRole | null;
}): GrantRole | null {
  const { path, grantRole } = options;
  if (!grantRole) return null;
  const dedicated = DEDICATED_ROUTE_ROLE[path as WorkspacePath];
  if (dedicated) {
    return clampActiveRole(dedicated, grantRole);
  }
  return clampActiveRole(options.persisted ?? grantRole, grantRole);
}

/** A role's home route, used for access-denied redirects. */
export function roleHomePath(role: GrantRole | null | undefined): string {
  switch (role) {
    case "platform_admin":
      return "/chcg-admin";
    case "client_admin":
      return "/admin";
    case "executive":
      return "/reporting";
    case "manager":
      return "/manager";
    case "coach":
      return "/coach";
    case "learner":
      return "/learner";
    default:
      return "/";
  }
}

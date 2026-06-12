import { describe, expect, it } from "vitest";
import {
  ADOPTABLE_ROLES,
  WORKSPACE_ACCESS,
  WORKSPACE_ORDER,
  canGrantAccessWorkspace,
  clampActiveRole,
  permittedWorkspaces,
  resolveActiveWorkspaceRole,
  roleHomePath,
  type GrantRole,
} from "../shared/workspaceAccess";

describe("WORKSPACE_ACCESS matrix", () => {
  it("matches the locked access matrix exactly", () => {
    expect(WORKSPACE_ACCESS.learner).toEqual(["/guide", "/learner", "/training", "/library"]);
    expect(WORKSPACE_ACCESS.coach).toEqual(["/guide", "/reporting", "/coach", "/learner", "/training", "/library"]);
    expect(WORKSPACE_ACCESS.manager).toEqual(["/guide", "/reporting", "/manager", "/coach", "/learner", "/training", "/library"]);
    expect(WORKSPACE_ACCESS.executive).toEqual(["/mission-hub", "/guide", "/reporting", "/training", "/library"]);
    expect(WORKSPACE_ACCESS.client_admin).not.toContain("/chcg-admin");
    expect(WORKSPACE_ACCESS.client_admin).toContain("/admin");
    expect(WORKSPACE_ACCESS.platform_admin).toContain("/chcg-admin");
    // Client Admin and CHCG Admin = all workspaces (platform_admin adds only CHCG Command).
    expect(WORKSPACE_ACCESS.platform_admin.length).toBe(WORKSPACE_ORDER.length);
    expect(WORKSPACE_ACCESS.client_admin.length).toBe(WORKSPACE_ORDER.length - 1);
  });

  it("permittedWorkspaces returns the matrix set in display order", () => {
    expect(permittedWorkspaces("manager")).toEqual(["/guide", "/reporting", "/manager", "/coach", "/learner", "/training", "/library"]);
    expect(permittedWorkspaces(null)).toEqual([]);
  });

  it("every adoptable sub-role's access is a subset of the grant role's access (clamp is always safe)", () => {
    (Object.keys(ADOPTABLE_ROLES) as GrantRole[]).forEach((grant) => {
      const grantSet = new Set(WORKSPACE_ACCESS[grant]);
      ADOPTABLE_ROLES[grant].forEach((sub) => {
        WORKSPACE_ACCESS[sub].forEach((path) => expect(grantSet.has(path)).toBe(true));
      });
    });
  });

  it("canGrantAccessWorkspace allows exactly the union of adoptable roles' workspaces", () => {
    expect(canGrantAccessWorkspace("coach", "/reporting")).toBe(true);
    expect(canGrantAccessWorkspace("coach", "/learner")).toBe(true);
    expect(canGrantAccessWorkspace("coach", "/manager")).toBe(false);
    expect(canGrantAccessWorkspace("learner", "/coach")).toBe(false);
    expect(canGrantAccessWorkspace("executive", "/training")).toBe(true);
    expect(canGrantAccessWorkspace("executive", "/manager")).toBe(false);
    expect(canGrantAccessWorkspace(null, "/training")).toBe(false);
    expect(canGrantAccessWorkspace(null, "/")).toBe(true);
  });

  it("clamps a desired active role to the grant's adoptable set", () => {
    expect(clampActiveRole("learner", "coach")).toBe("learner");
    expect(clampActiveRole("manager", "coach")).toBe("coach"); // not adoptable → grant
    expect(clampActiveRole(null, "coach")).toBe("coach");
    expect(clampActiveRole("coach", null)).toBe(null);
  });

  it("selects the dedicated-route persona (clamped) and keeps the selected role on shared routes", () => {
    // Shared routes never change the role.
    expect(resolveActiveWorkspaceRole({ path: "/training", grantRole: "coach" })).toBe("coach");
    expect(resolveActiveWorkspaceRole({ path: "/library", grantRole: "manager", persisted: "manager" })).toBe("manager");
    // Dedicated routes select their persona, even when it shrinks the nav.
    expect(resolveActiveWorkspaceRole({ path: "/learner", grantRole: "coach" })).toBe("learner");
    expect(resolveActiveWorkspaceRole({ path: "/anything", grantRole: null })).toBe(null);
  });

  it("an admin grant reflects the SELECTED workspace, not its full ceiling (the bug fix)", () => {
    // platform_admin can adopt any persona — the dedicated route picks it (no longer the full set).
    expect(resolveActiveWorkspaceRole({ path: "/coach", grantRole: "platform_admin" })).toBe("coach");
    expect(resolveActiveWorkspaceRole({ path: "/manager", grantRole: "platform_admin" })).toBe("manager");
    expect(resolveActiveWorkspaceRole({ path: "/learner", grantRole: "platform_admin" })).toBe("learner");
    expect(resolveActiveWorkspaceRole({ path: "/coach", grantRole: "client_admin" })).toBe("coach");
    // Default with no selection (grant home) = the admin's full role.
    expect(resolveActiveWorkspaceRole({ path: "/chcg-admin", grantRole: "platform_admin" })).toBe("platform_admin");
    // Shared routes keep the previously selected persona — Coach Studio survives Training Zone.
    expect(resolveActiveWorkspaceRole({ path: "/training", grantRole: "platform_admin", persisted: "coach" })).toBe("coach");
    expect(resolveActiveWorkspaceRole({ path: "/training", grantRole: "platform_admin" })).toBe("platform_admin");
  });

  it("roleHomePath maps each role to its home route", () => {
    expect(roleHomePath("platform_admin")).toBe("/chcg-admin");
    expect(roleHomePath("client_admin")).toBe("/admin");
    expect(roleHomePath("executive")).toBe("/reporting");
    expect(roleHomePath("coach")).toBe("/coach");
    expect(roleHomePath(null)).toBe("/");
  });
});

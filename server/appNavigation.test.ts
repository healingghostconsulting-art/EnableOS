import { describe, expect, it } from "vitest";

import {
  adminWorkspaceMenu,
  buildLegacyExecutiveRedirectPath,
  buildWorkspaceMenu,
  canAccessWorkspacePath,
  coachWorkspaceMenu,
  executiveWorkspaceMenu,
  learnerWorkspaceMenu,
  managerWorkspaceMenu,
  resolveRoleHomePath,
  resolveWorkspaceMenu,
} from "../client/src/App";
import { WORKSPACE_ACCESS, canGrantAccessWorkspace, resolveActiveWorkspaceRole } from "../shared/workspaceAccess";

const paths = (menu: { path: string }[]) => menu.map((item) => item.path);

describe("workspace navigation resolution (matrix-driven)", () => {
  it("derives every role menu from the one WORKSPACE_ACCESS matrix", () => {
    expect(paths(learnerWorkspaceMenu)).toEqual(["/guide", "/learner", "/training", "/library"]);
    expect(paths(coachWorkspaceMenu)).toEqual(["/guide", "/reporting", "/coach", "/learner", "/training", "/library"]);
    expect(paths(managerWorkspaceMenu)).toEqual(["/guide", "/reporting", "/manager", "/coach", "/learner", "/training", "/library"]);
    expect(paths(executiveWorkspaceMenu)).toEqual(["/mission-hub", "/guide", "/reporting", "/training", "/library"]);
    // platform admin sees everything incl. CHCG Command; client admin sees all but CHCG Command.
    expect(paths(adminWorkspaceMenu)).toContain("/chcg-admin");
    expect(paths(buildWorkspaceMenu("client_admin"))).not.toContain("/chcg-admin");
    expect(paths(buildWorkspaceMenu("client_admin"))).toContain("/admin");
    // The menu set always matches the matrix.
    expect(new Set(paths(coachWorkspaceMenu))).toEqual(new Set(WORKSPACE_ACCESS.coach));
  });

  it("drives the nav from the grant role and ignores the ?role= content param", () => {
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin" })).toEqual(adminWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "coach" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "manager" })).toEqual(managerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "learner" })).toEqual(learnerWorkspaceMenu);
  });

  it("keeps the nav stable across shared workspaces (the Coach → Training Zone bug)", () => {
    // Coach lands on /coach, then opens the shared Training Zone — nav must NOT change.
    expect(resolveWorkspaceMenu({ grantRole: "coach", workspacePath: "/coach" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "coach", workspacePath: "/training" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "coach", workspacePath: "/library" })).toEqual(coachWorkspaceMenu);
    expect(paths(resolveWorkspaceMenu({ grantRole: "coach", workspacePath: "/training" }))).toContain("/coach");
    // Manager keeps Manager Ops everywhere, incl. the shared Training Zone.
    expect(resolveWorkspaceMenu({ grantRole: "manager", workspacePath: "/training" })).toEqual(managerWorkspaceMenu);
    // A dedicated route now selects its persona: a coach visiting /learner shows the learner nav.
    expect(resolveWorkspaceMenu({ grantRole: "coach", workspacePath: "/learner" })).toEqual(learnerWorkspaceMenu);
  });

  it("resolveActiveWorkspaceRole: shared routes keep the role; dedicated routes select their persona", () => {
    expect(resolveActiveWorkspaceRole({ path: "/training", grantRole: "coach" })).toBe("coach");
    expect(resolveActiveWorkspaceRole({ path: "/learner", grantRole: "coach" })).toBe("learner");
    expect(resolveActiveWorkspaceRole({ path: "/coach", grantRole: "coach" })).toBe("coach");
    expect(resolveActiveWorkspaceRole({ path: "/chcg-admin", grantRole: "platform_admin" })).toBe("platform_admin");
    // A stale persisted role outside the grant is clamped back to the grant.
    expect(resolveActiveWorkspaceRole({ path: "/training", grantRole: "coach", persisted: "manager" })).toBe("coach");
    // Admin-nav fix: an admin's dedicated route reflects the picked persona, not the full set.
    expect(resolveActiveWorkspaceRole({ path: "/coach", grantRole: "platform_admin" })).toBe("coach");
    expect(resolveActiveWorkspaceRole({ path: "/manager", grantRole: "platform_admin" })).toBe("manager");
  });

  it("an admin grant on a shared workspace keeps the selected persona (admin nav fix)", () => {
    // Admin picked Coach Studio, then opens Training Zone — nav stays the coach set, not the full admin set.
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/coach" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/training", persisted: "coach" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/manager" })).toEqual(managerWorkspaceMenu);
    // No selection yet → the admin's full set.
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/chcg-admin" })).toEqual(adminWorkspaceMenu);
  });

  it("redirects each role back to its allowed home view when a route is blocked", () => {
    expect(resolveRoleHomePath("platform_admin")).toBe("/chcg-admin");
    expect(resolveRoleHomePath("executive")).toBe("/reporting");
    expect(resolveRoleHomePath("manager")).toBe("/manager");
    expect(resolveRoleHomePath("coach")).toBe("/coach");
    expect(resolveRoleHomePath("learner")).toBe("/learner");
  });

  it("preserves query parameters when legacy executive links are redirected into reporting", () => {
    expect(buildLegacyExecutiveRedirectPath("/executive")).toBe("/reporting");
    expect(buildLegacyExecutiveRedirectPath("/executive?from_webdev=1")).toBe("/reporting?from_webdev=1");
    expect(buildLegacyExecutiveRedirectPath("/executive?from_webdev=1&role=executive")).toBe("/reporting?from_webdev=1&role=executive");
  });

  it("enforces route access from the same matrix the nav uses (guard and nav can't disagree)", () => {
    // Matrix now grants coaches and managers Reporting.
    expect(canAccessWorkspacePath("/reporting", "coach")).toBe(true);
    expect(canAccessWorkspacePath("/reporting", "manager")).toBe(true);
    expect(canAccessWorkspacePath("/reporting", "executive")).toBe(true);
    // Managers no longer reach Client Control (matrix excludes /admin for manager).
    expect(canAccessWorkspacePath("/admin", "manager")).toBe(false);
    expect(canAccessWorkspacePath("/guide", "learner")).toBe(true);
    expect(canAccessWorkspacePath("/coach", "coach")).toBe(true);
    expect(canAccessWorkspacePath("/manager", "coach")).toBe(false);
    expect(canAccessWorkspacePath("/admin", "coach")).toBe(false);
    expect(canAccessWorkspacePath("/learner", "learner")).toBe(true);
    expect(canAccessWorkspacePath("/coach", "learner")).toBe(false);
    expect(canAccessWorkspacePath("/training", "executive")).toBe(true);
    expect(canAccessWorkspacePath("/manager", "executive")).toBe(false);
    expect(canAccessWorkspacePath("/chcg-admin", "platform_admin")).toBe(true);
    expect(canAccessWorkspacePath("/chcg-admin", "client_admin")).toBe(false);
    // Guard and nav are the same map: every nav item is accessible, nothing outside is.
    for (const path of WORKSPACE_ACCESS.coach) {
      expect(canGrantAccessWorkspace("coach", path)).toBe(true);
    }
    expect(canGrantAccessWorkspace("coach", "/manager")).toBe(false);
  });
});

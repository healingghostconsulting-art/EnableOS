import { describe, expect, it } from "vitest";

import {
  adminWorkspaceMenu,
  buildRoleScopedPath,
  canAccessWorkspacePath,
  coachWorkspaceMenu,
  executiveWorkspaceMenu,
  learnerWorkspaceMenu,
  managerWorkspaceMenu,
  resolveRoleHomePath,
  resolveWorkspaceMenu,
  scopeMenuItemsToRole,
} from "../client/src/App";

describe("workspace navigation resolution", () => {
  it("keeps the learner workspace limited to learner journey, training zone, and content missions", () => {
    expect(learnerWorkspaceMenu.map((item) => item.label)).toEqual([
      "Learner Journey",
      "Training Zone",
      "Content Missions",
    ]);
    expect(learnerWorkspaceMenu.map((item) => item.path)).toEqual([
      "/learner",
      "/training",
      "/library",
    ]);
  });

  it("scopes the coaching workspace to coach studio plus learner access", () => {
    expect(coachWorkspaceMenu.map((item) => item.path)).toEqual([
      "/coach",
      "/learner",
      "/training",
      "/library",
    ]);
  });

  it("keeps reporting as an executive-only top-level section while removing it from the manager workspace", () => {
    expect(executiveWorkspaceMenu.map((item) => item.path)).toEqual([
      "/",
      "/executive",
      "/reporting",
    ]);
    expect(managerWorkspaceMenu.map((item) => item.path)).toEqual([
      "/",
      "/manager",
      "/coach",
      "/learner",
      "/training",
      "/admin",
      "/library",
    ]);
    expect(adminWorkspaceMenu.map((item) => item.path)).toEqual(expect.arrayContaining(["/reporting", "/executive"]));
  });

  it("adds CHCG command only for platform admins when no override is supplied", () => {
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin" })).toEqual(adminWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "coach" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "manager" })).toEqual(managerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "learner" })).toEqual(learnerWorkspaceMenu);
  });

  it("prefers an explicit shell override so the learner route stays learner-scoped even for broader grants", () => {
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", menuItemsOverride: learnerWorkspaceMenu })).toEqual(learnerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "manager", menuItemsOverride: coachWorkspaceMenu })).toEqual(coachWorkspaceMenu);
  });

  it("adds static role context to shared learner menu links so training and library stay learner-scoped", () => {
    expect(buildRoleScopedPath("/training", "learner")).toBe("/training?role=learner");
    expect(buildRoleScopedPath("/library", "manager")).toBe("/library?role=manager");
    expect(buildRoleScopedPath("/learner", "learner")).toBe("/learner");
    expect(scopeMenuItemsToRole(learnerWorkspaceMenu, "learner").map((item) => item.path)).toEqual([
      "/learner",
      "/training?role=learner",
      "/library?role=learner",
    ]);
  });

  it("keeps learner and executive shells path-scoped even when the viewer has broader navigation grants", () => {
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/learner" })).toEqual(learnerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "client_admin", workspacePath: "/executive" })).toEqual(executiveWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "manager", workspacePath: "/coach" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/training", sharedRouteRole: "learner" })).toEqual(learnerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/library", sharedRouteRole: "manager" })).toEqual(managerWorkspaceMenu);
  });

  it("redirects each role back to its allowed home view when a route is blocked", () => {
    expect(resolveRoleHomePath("platform_admin")).toBe("/chcg-admin");
    expect(resolveRoleHomePath("manager")).toBe("/manager");
    expect(resolveRoleHomePath("coach")).toBe("/coach");
    expect(resolveRoleHomePath("learner")).toBe("/learner");
  });

  it("enforces route access by workspace role", () => {
    expect(canAccessWorkspacePath("/executive", "manager")).toBe(false);
    expect(canAccessWorkspacePath("/reporting", "manager")).toBe(false);
    expect(canAccessWorkspacePath("/reporting", "executive")).toBe(true);
    expect(canAccessWorkspacePath("/admin", "manager")).toBe(true);
    expect(canAccessWorkspacePath("/coach", "coach")).toBe(true);
    expect(canAccessWorkspacePath("/manager", "coach")).toBe(false);
    expect(canAccessWorkspacePath("/admin", "coach")).toBe(false);
    expect(canAccessWorkspacePath("/learner", "learner")).toBe(true);
    expect(canAccessWorkspacePath("/coach", "learner")).toBe(false);
    expect(canAccessWorkspacePath("/chcg-admin", "platform_admin")).toBe(true);
  });
});

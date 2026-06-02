import { describe, expect, it } from "vitest";

import {
  adminWorkspaceMenu,
  buildLegacyExecutiveRedirectPath,
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
  it("keeps the learner workspace focused on the Guide plus learner, training, and content flows", () => {
    expect(learnerWorkspaceMenu.map((item) => item.label)).toEqual([
      "EnableOS Guide",
      "Learner Journey",
      "Training Zone",
      "Content Missions",
    ]);
    expect(learnerWorkspaceMenu.map((item) => item.path)).toEqual([
      "/guide",
      "/learner",
      "/training",
      "/library",
    ]);
  });

  it("keeps the coaching workspace aligned to the shared Guide plus coach, learner, training, and library access", () => {
    expect(coachWorkspaceMenu.map((item) => item.path)).toEqual([
      "/guide",
      "/coach",
      "/learner",
      "/training",
      "/library",
    ]);
  });

  it("keeps reporting as the executive-facing top-level section while exposing the shared Guide to executive and manager menus", () => {
    expect(executiveWorkspaceMenu.map((item) => item.path)).toEqual([
      "/mission-hub",
      "/guide",
      "/reporting",
    ]);
    expect(managerWorkspaceMenu.map((item) => item.path)).toEqual([
      "/mission-hub",
      "/guide",
      "/manager",
      "/coach",
      "/learner",
      "/training",
      "/admin",
      "/library",
    ]);
    expect(adminWorkspaceMenu.map((item) => item.path)).toEqual(expect.arrayContaining(["/reporting"]));
    expect(adminWorkspaceMenu.map((item) => item.path)).not.toContain("/executive");
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

  it("adds static role context to shared guide, mission hub, training, and library links so shared routes stay role-scoped", () => {
    expect(buildRoleScopedPath("/mission-hub", "learner")).toBe("/mission-hub?role=learner");
    expect(buildRoleScopedPath("/guide", "learner")).toBe("/guide?role=learner");
    expect(buildRoleScopedPath("/training", "learner")).toBe("/training?role=learner");
    expect(buildRoleScopedPath("/library", "manager")).toBe("/library?role=manager");
    expect(buildRoleScopedPath("/learner", "learner")).toBe("/learner");
    expect(scopeMenuItemsToRole(learnerWorkspaceMenu, "learner").map((item) => item.path)).toEqual([
      "/guide?role=learner",
      "/learner",
      "/training?role=learner",
      "/library?role=learner",
    ]);
    expect(scopeMenuItemsToRole(managerWorkspaceMenu, "manager")[0]?.path).toBe("/mission-hub?role=manager");
    expect(scopeMenuItemsToRole(managerWorkspaceMenu, "manager")[1]?.path).toBe("/guide?role=manager");
  });

  it("keeps learner and reporting shells path-scoped even when the viewer has broader navigation grants", () => {
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/learner" })).toEqual(learnerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "client_admin", workspacePath: "/reporting" })).toEqual(executiveWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "manager", workspacePath: "/coach" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/mission-hub", sharedRouteRole: "learner" })).toEqual(learnerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/guide", sharedRouteRole: "learner" })).toEqual(learnerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/training", sharedRouteRole: "learner" })).toEqual(learnerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/library", sharedRouteRole: "manager" })).toEqual(managerWorkspaceMenu);
  });

  it("reuses the stored learner workspace role when shared routes are opened without a role query", () => {
    const previousWindow = globalThis.window;
    const sessionValues = new Map<string, string>([["chcg-enableos-static-workspace-role", "learner"]]);

    globalThis.window = {
      sessionStorage: {
        getItem: (key: string) => sessionValues.get(key) ?? null,
        setItem: (key: string, value: string) => {
          sessionValues.set(key, value);
        },
        removeItem: (key: string) => {
          sessionValues.delete(key);
        },
      },
    } as Window & typeof globalThis;

    try {
      expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/training" })).toEqual(learnerWorkspaceMenu);
      expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/mission-hub" })).toEqual(learnerWorkspaceMenu);
      expect(resolveWorkspaceMenu({ grantRole: "platform_admin", workspacePath: "/guide" })).toEqual(learnerWorkspaceMenu);
    } finally {
      globalThis.window = previousWindow;
    }
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

  it("enforces route access by workspace role", () => {
    expect(canAccessWorkspacePath("/reporting", "manager")).toBe(false);
    expect(canAccessWorkspacePath("/reporting", "executive")).toBe(true);
    expect(canAccessWorkspacePath("/admin", "manager")).toBe(true);
    expect(canAccessWorkspacePath("/guide", "learner")).toBe(true);
    expect(canAccessWorkspacePath("/coach", "coach")).toBe(true);
    expect(canAccessWorkspacePath("/manager", "coach")).toBe(false);
    expect(canAccessWorkspacePath("/admin", "coach")).toBe(false);
    expect(canAccessWorkspacePath("/learner", "learner")).toBe(true);
    expect(canAccessWorkspacePath("/coach", "learner")).toBe(false);
    expect(canAccessWorkspacePath("/chcg-admin", "platform_admin")).toBe(true);
  });
});

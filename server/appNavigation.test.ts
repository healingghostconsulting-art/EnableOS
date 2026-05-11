import { describe, expect, it } from "vitest";

import {
  adminWorkspaceMenu,
  canAccessWorkspacePath,
  coachWorkspaceMenu,
  learnerWorkspaceMenu,
  managerWorkspaceMenu,
  resolveRoleHomePath,
  resolveWorkspaceMenu,
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

  it("removes executive access from the manager workspace while preserving the remaining sections", () => {
    expect(managerWorkspaceMenu.map((item) => item.path)).toEqual([
      "/",
      "/manager",
      "/coach",
      "/learner",
      "/training",
      "/admin",
      "/library",
    ]);
  });

  it("adds CHCG command only for platform admins when no override is supplied", () => {
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin" })).toEqual(adminWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "coach" })).toEqual(coachWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "manager" })).toEqual(managerWorkspaceMenu);
    expect(resolveWorkspaceMenu({ grantRole: "learner" })).toEqual(learnerWorkspaceMenu);
  });

  it("redirects each role back to its allowed home view when a route is blocked", () => {
    expect(resolveRoleHomePath("platform_admin")).toBe("/chcg-admin");
    expect(resolveRoleHomePath("manager")).toBe("/manager");
    expect(resolveRoleHomePath("coach")).toBe("/coach");
    expect(resolveRoleHomePath("learner")).toBe("/learner");
  });

  it("enforces route access by workspace role", () => {
    expect(canAccessWorkspacePath("/executive", "manager")).toBe(false);
    expect(canAccessWorkspacePath("/admin", "manager")).toBe(true);
    expect(canAccessWorkspacePath("/coach", "coach")).toBe(true);
    expect(canAccessWorkspacePath("/manager", "coach")).toBe(false);
    expect(canAccessWorkspacePath("/admin", "coach")).toBe(false);
    expect(canAccessWorkspacePath("/learner", "learner")).toBe(true);
    expect(canAccessWorkspacePath("/coach", "learner")).toBe(false);
    expect(canAccessWorkspacePath("/chcg-admin", "platform_admin")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { baseWorkspaceMenu, learnerWorkspaceMenu, resolveWorkspaceMenu } from "../client/src/App";

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

  it("uses an override menu when a route needs a scoped workspace shell", () => {
    expect(resolveWorkspaceMenu({ menuItemsOverride: learnerWorkspaceMenu, grantRole: "learner" })).toEqual(learnerWorkspaceMenu);
  });

  it("adds CHCG command only for platform admins when no override is supplied", () => {
    expect(resolveWorkspaceMenu({ grantRole: "platform_admin" }).map((item) => item.path)).toContain("/chcg-admin");
    expect(resolveWorkspaceMenu({ grantRole: "learner" })).toEqual(baseWorkspaceMenu);
  });
});

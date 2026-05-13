import { describe, expect, it } from "vitest";

import {
  filterTrainingPreviewScenariosByRole,
  getLearnerWorkspacePerspectiveNotice,
  getOperationalLaunchReadinessBrief,
  resolveDefaultSelectedAssetRole,
  resolveSelectedAssetWorkflowRoles,
} from "../client/src/pages/EnableOSViews";

describe("training role context helpers", () => {
  it("surfaces a learner-perspective banner when a coach opens the learner shell", () => {
    expect(getLearnerWorkspacePerspectiveNotice("coach")).toEqual({
      eyebrow: "Coach / Supervisor session",
      title: "You are reviewing the learner experience from the coach / supervisor lane.",
      description: "The learner workspace is open, but your signed-in session still belongs to the coach / supervisor. Keep using the surrounding shell and this banner as the role-context handoff so the perspective change feels intentional instead of abrupt.",
    });
  });

  it("does not surface a learner-perspective banner for learner-native access", () => {
    expect(getLearnerWorkspacePerspectiveNotice("learner")).toBeNull();
    expect(getLearnerWorkspacePerspectiveNotice(undefined)).toBeNull();
  });

  it("filters training preview families down to the manager-relevant scenarios", () => {
    const scenarios = [
      { id: "active", label: "Learner" },
      { id: "workflow", label: "Workflow" },
      { id: "coach-supervision", label: "Coach" },
      { id: "leadership", label: "Leadership" },
      { id: "performance", label: "Performance" },
      { id: "engagement", label: "Engagement" },
    ];

    expect(filterTrainingPreviewScenariosByRole(scenarios, "manager").map((scenario) => scenario.id)).toEqual([
      "workflow",
      "performance",
      "engagement",
    ]);
  });

  it("expands all-role assets into explicit role chips and honors a preferred supported role", () => {
    expect(resolveSelectedAssetWorkflowRoles(["all"])).toEqual([
      "executive",
      "manager",
      "coach",
      "learner",
      "client_admin",
    ]);

    expect(resolveDefaultSelectedAssetRole(["all"], "manager")).toBe("manager");
    expect(resolveDefaultSelectedAssetRole(["learner", "manager"], "coach")).toBe("learner");
  });

  it("returns distinct operational launch-readiness briefs for different roles", () => {
    expect(getOperationalLaunchReadinessBrief("executive")).toMatchObject({
      title: "Executive readiness brief",
      startLabel: "Launch executive preview",
    });

    expect(getOperationalLaunchReadinessBrief("client_admin")).toMatchObject({
      title: "Client admin launch brief",
      startLabel: "Launch client-admin preview",
    });
  });
});

import { describe, expect, it } from "vitest";
import { groupAssetsByTargetDemographic } from "../shared/libraryOrganization";

describe("library organization helpers", () => {
  it("groups assets by their primary target demographic and keeps cross-audience material separate", () => {
    const groups = groupAssetsByTargetDemographic([
      {
        id: "asset-learner",
        title: "Learner Foundations",
        linkedRoles: ["learner"],
        sourceKind: "chcg",
        createdAt: "2026-04-20T08:00:00Z",
      },
      {
        id: "asset-manager",
        title: "Manager Coaching Guide",
        linkedRoles: ["manager"],
        sourceKind: "client_upload",
        createdAt: "2026-04-20T08:00:00Z",
      },
      {
        id: "asset-shared",
        title: "Cross Functional Launch Packet",
        linkedRoles: ["executive", "manager", "learner"],
        sourceKind: "client_upload",
        createdAt: "2026-04-20T08:00:00Z",
      },
    ]);

    expect(groups.map((group) => group.id)).toEqual(["learner", "manager", "all"]);
    expect(groups[0]?.assets.map((asset) => asset.title)).toEqual(["Learner Foundations"]);
    expect(groups[1]?.assets.map((asset) => asset.title)).toEqual(["Manager Coaching Guide"]);
    expect(groups[2]?.assets.map((asset) => asset.title)).toEqual(["Cross Functional Launch Packet"]);
  });

  it("sorts asset titles alphabetically inside each demographic group", () => {
    const groups = groupAssetsByTargetDemographic([
      {
        id: "asset-b",
        title: "Workflow Precision Guide",
        linkedRoles: ["manager"],
        sourceKind: "chcg",
        createdAt: "2026-04-20T08:00:00Z",
      },
      {
        id: "asset-a",
        title: "Calibration Playbook",
        linkedRoles: ["manager"],
        sourceKind: "chcg",
        createdAt: "2026-04-20T08:00:00Z",
      },
    ]);

    expect(groups[0]?.id).toBe("manager");
    expect(groups[0]?.assets.map((asset) => asset.title)).toEqual([
      "Calibration Playbook",
      "Workflow Precision Guide",
    ]);
  });
});

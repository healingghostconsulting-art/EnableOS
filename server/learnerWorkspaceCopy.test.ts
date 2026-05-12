import { describe, expect, it } from "vitest";

import { learnerWorkspaceCopy } from "../client/src/pages/EnableOSViews";

describe("learner workspace copy", () => {
  it("uses the requested re-engagement terminology for learner assignments", () => {
    expect(learnerWorkspaceCopy.routeSubtitle).toContain("skill opportunities");
    expect(learnerWorkspaceCopy.assignedReengagementsMetricLabel).toBe("Assigned Re-engagements");
    expect(learnerWorkspaceCopy.assignedReengagementsMetricSupporting).toContain("Skill-opportunity");
    expect(learnerWorkspaceCopy.assignedReengagementsCardTitle).toBe("Assigned Re-engagements");
  });
});

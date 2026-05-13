import { describe, expect, it } from "vitest";

import { buildLearnerWorkspaceReturnPath } from "../client/src/pages/EnableOSViews";

describe("learner completion return routing", () => {
  it("returns the plain learner workspace path when there is no completion context", () => {
    expect(buildLearnerWorkspaceReturnPath({})).toBe("/learner");
  });

  it("preserves assigned completion context and focus when a targeted retraining finishes", () => {
    expect(buildLearnerWorkspaceReturnPath({
      assignmentId: "assignment-1",
      moduleId: "module-2",
      focus: "priority-retraining",
      freshStart: true,
    })).toBe("/learner?completedAssignmentId=assignment-1&completedModuleId=module-2&focus=priority-retraining&freshStart=1");
  });
});

import { describe, expect, it } from "vitest";

import { buildTrainingProgressStorageKey, clampTrainingProgressIndex } from "../client/src/pages/EnableOSViews";

describe("training progress persistence helpers", () => {
  it("builds a stable storage key from tenant, scenario, and assignment context", () => {
    expect(buildTrainingProgressStorageKey({
      tenantId: "atlas-operations",
      previewScenarioId: "active",
      requestedJourneyId: "journey-1",
      requestedModuleId: "module-2",
      requestedAssignmentId: "assignment-3",
      requestedRoleFilter: "learner",
    })).toBe(
      "chcg-enableos-training-progress:atlas-operations:scenario=active:journey=journey-1:module=module-2:assignment=assignment-3:role=learner",
    );
  });

  it("clamps persisted indexes into valid non-negative bounds", () => {
    expect(clampTrainingProgressIndex(4, 2)).toBe(2);
    expect(clampTrainingProgressIndex(-3, 6)).toBe(0);
    expect(clampTrainingProgressIndex(Number.NaN, 5)).toBe(0);
  });
});

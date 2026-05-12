import { describe, expect, it } from "vitest";

import {
  buildTrainingProgressStorageKey,
  clampTrainingProgressIndex,
  normalizePersistedTrainingProgress,
} from "../client/src/pages/EnableOSViews";

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

  it("normalizes persisted learner progress so crash reload restores a safe consistent state across trainings", () => {
    expect(normalizePersistedTrainingProgress({
      moduleIndex: 99,
      stageIndex: -3,
      lessonPageIndex: 6.9,
      briefCheckpointAnswers: { brief: "evidence" },
      briefCheckpointSubmitted: true,
      practiceChoice: "coach_first",
      practiceCheckpointAnswers: { practice: "timing" },
      practiceCheckpointSubmitted: true,
      reflection: "Return to the QA workflow after the reload.",
      applicationAnswers: { application: "coach the behavior" },
      applicationSubmitted: true,
      finalQuizAnswers: { final: "proof point" },
      finalQuizSubmitted: true,
      selectedDeckVisualIndex: -8,
      narrationRate: "1.1",
      dismissedQuizTriggerIds: ["brief-2"],
      completedQuizTriggerIds: ["apply-1"],
      coachCheckpointNote: "Listen for the verification summary on the next call.",
      coachCheckpointSubmitted: true,
    }, 3, 2)).toEqual({
      moduleIndex: 3,
      stageIndex: 0,
      lessonPageIndex: 6,
      briefCheckpointAnswers: { brief: "evidence" },
      briefCheckpointSubmitted: true,
      practiceChoice: "coach_first",
      practiceCheckpointAnswers: { practice: "timing" },
      practiceCheckpointSubmitted: true,
      reflection: "Return to the QA workflow after the reload.",
      applicationAnswers: { application: "coach the behavior" },
      applicationSubmitted: true,
      finalQuizAnswers: { final: "proof point" },
      finalQuizSubmitted: true,
      selectedDeckVisualIndex: 0,
      narrationRate: "1.1",
      dismissedQuizTriggerIds: ["brief-2"],
      completedQuizTriggerIds: ["apply-1"],
      coachCheckpointNote: "Listen for the verification summary on the next call.",
      coachCheckpointSubmitted: true,
    });

    expect(normalizePersistedTrainingProgress({}, 4, 3)).toEqual({
      moduleIndex: 0,
      stageIndex: 0,
      lessonPageIndex: 0,
      briefCheckpointAnswers: {},
      briefCheckpointSubmitted: false,
      practiceChoice: null,
      practiceCheckpointAnswers: {},
      practiceCheckpointSubmitted: false,
      reflection: "",
      applicationAnswers: {},
      applicationSubmitted: false,
      finalQuizAnswers: {},
      finalQuizSubmitted: false,
      selectedDeckVisualIndex: 0,
      narrationRate: "0.95",
      dismissedQuizTriggerIds: [],
      completedQuizTriggerIds: [],
      coachCheckpointNote: "",
      coachCheckpointSubmitted: false,
    });
  });
});

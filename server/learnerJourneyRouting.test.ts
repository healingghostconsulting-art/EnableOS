import { describe, expect, it } from "vitest";

import {
  buildLearnerInterventionTrainingOptions,
  buildLearnerJourneyModulePath,
} from "../client/src/pages/EnableOSViews";

describe("learner journey routing", () => {
  it("routes the assigned module back through the active assignment training path", () => {
    expect(buildLearnerJourneyModulePath({
      activeJourneyId: "journey-service-foundations",
      moduleId: "mod-sf-2",
      activeRetrainingAssignment: { moduleId: "mod-sf-2" },
      primaryTrainingPath: "/training?journeyId=journey-service-foundations&moduleId=mod-sf-2&assignmentId=assignment-1",
    })).toBe("/training?journeyId=journey-service-foundations&moduleId=mod-sf-2&assignmentId=assignment-1");
  });

  it("routes non-assigned modules through the learner journey context", () => {
    expect(buildLearnerJourneyModulePath({
      activeJourneyId: "journey-service-foundations",
      moduleId: "mod-sf-3",
      activeRetrainingAssignment: { moduleId: "mod-sf-2" },
      primaryTrainingPath: "/training?journeyId=journey-service-foundations&moduleId=mod-sf-2&assignmentId=assignment-1",
    })).toBe("/training?journeyId=journey-service-foundations&moduleId=mod-sf-3");
  });

  it("builds de-duplicated assigned re-engagement training options with the assigned module pinned first", () => {
    expect(buildLearnerInterventionTrainingOptions({
      activeJourneyId: "journey-service-foundations",
      primaryTrainingPath: "/training?journeyId=journey-service-foundations&moduleId=mod-sf-2&assignmentId=assignment-1",
      activeRetrainingAssignment: {
        id: "assignment-1",
        moduleId: "mod-sf-2",
        moduleTitle: "Workflow reset",
        journeyTitle: "Service Foundations",
        skillFocus: "Process accuracy",
      },
      learnerModules: [
        {
          id: "mod-sf-2",
          title: "Workflow reset",
          format: "Mini module",
          durationMinutes: 9,
          skillFocus: "Process accuracy",
        },
        {
          id: "mod-sf-3",
          title: "Escalation timing",
          format: "Mini module",
          durationMinutes: 8,
          skillFocus: "Escalation judgment",
        },
      ],
    })).toEqual([
      {
        id: "assignment-assignment-1",
        title: "Workflow reset",
        subtitle: "Service Foundations · Assigned retraining",
        detail: "Process accuracy",
        path: "/training?journeyId=journey-service-foundations&moduleId=mod-sf-2&assignmentId=assignment-1",
        moduleId: "mod-sf-2",
        isAssigned: true,
      },
      {
        id: "mod-sf-3",
        title: "Escalation timing",
        subtitle: "Mini module · 8 min",
        detail: "Escalation judgment",
        path: "/training?journeyId=journey-service-foundations&moduleId=mod-sf-3",
        moduleId: "mod-sf-3",
        isAssigned: false,
      },
    ]);
  });
});

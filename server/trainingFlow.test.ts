import { describe, expect, it } from "vitest";
import { buildGuidedTrainingPlan } from "../shared/trainingFlow";
import { getTrainingPresentation } from "../shared/trainingContent";

describe("buildGuidedTrainingPlan", () => {
  it("calibrates learner modules to a longer narrated guided experience with staged quiz triggers", () => {
    const presentation = getTrainingPresentation(
      {
        id: "mod-sf-1",
        title: "Active Listening",
        format: "Microlearning",
        durationMinutes: 8,
        skillFocus: "Listening precision",
      },
      "Service Foundations Core Deck",
      "Empathy language and call control consistency",
    );

    const plan = buildGuidedTrainingPlan({
      journeyTitle: "Service Foundations Core Deck",
      moduleTitle: "Active Listening",
      skillFocus: "Listening precision",
      presentation,
    });

    expect(plan.family).toBe("learner");
    expect(plan.targetDurationMinutes).toBe(165);
    expect(plan.targetDurationLabel).toContain("2.8 hr");
    expect(plan.slideCount).toBe(
      presentation.slides.length + presentation.practiceSlides.length + presentation.applySlides.length,
    );
    expect(plan.stageDurations).toEqual([
      expect.objectContaining({ stageId: "brief", label: "Brief + narrated walkthrough", minutes: 50, durationLabel: "50 min guided experience" }),
      expect.objectContaining({ stageId: "practice", label: "Practice + coached rehearsal", minutes: 40, durationLabel: "40 min guided experience" }),
      expect.objectContaining({ stageId: "apply", label: "Application + transfer proof", minutes: 40, durationLabel: "40 min guided experience" }),
      expect.objectContaining({ stageId: "reflect", label: "Reflection + final sprint", minutes: 35, durationLabel: "35 min guided experience" }),
    ]);
    expect(plan.quizTriggers.some((trigger) => trigger.stageId === "brief" && trigger.assessmentKey === "briefCheckpoint")).toBe(true);
    expect(plan.quizTriggers.some((trigger) => trigger.stageId === "practice" && trigger.assessmentKey === "practiceCheckpoint")).toBe(true);
    expect(plan.quizTriggers.some((trigger) => trigger.stageId === "apply" && trigger.assessmentKey === "applicationActivity")).toBe(true);
    expect(plan.quizTriggers.some((trigger) => trigger.stageId === "reflect" && trigger.assessmentKey === "finalQuiz")).toBe(true);
  });

  it("calibrates leadership modules to deeper workshop-style runtimes", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-leadership-module",
        title: "Leadership KPI literacy",
        format: "Workshop",
        durationMinutes: 15,
        skillFocus: "KPI interpretation",
      },
      "Data-Led Leadership",
      "Trend interpretation and action planning",
    );

    const plan = buildGuidedTrainingPlan({
      journeyTitle: "Data-Led Leadership",
      moduleTitle: "Leadership KPI literacy",
      skillFocus: "KPI interpretation",
      presentation,
    });

    expect(plan.family).toBe("leadership");
    expect(plan.targetDurationMinutes).toBe(225);
    expect(plan.targetDurationLabel).toContain("3.8 hr");
    expect(plan.pacingLabel).toContain("executive or leadership workshop");
    expect(plan.stageDurations).toEqual([
      expect.objectContaining({ stageId: "brief", label: "Brief + narrated walkthrough", minutes: 70, durationLabel: "1.2 hr guided experience" }),
      expect.objectContaining({ stageId: "practice", label: "Practice + coached rehearsal", minutes: 55, durationLabel: "55 min guided experience" }),
      expect.objectContaining({ stageId: "apply", label: "Application + transfer proof", minutes: 50, durationLabel: "50 min guided experience" }),
      expect.objectContaining({ stageId: "reflect", label: "Reflection + final sprint", minutes: 50, durationLabel: "50 min guided experience" }),
    ]);
    expect(plan.quizTriggers.at(-1)).toEqual(
      expect.objectContaining({
        stageId: "reflect",
        assessmentKey: "finalQuiz",
        label: "Final sprint",
      }),
    );
  });
});

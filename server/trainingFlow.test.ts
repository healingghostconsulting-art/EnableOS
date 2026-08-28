import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGuidedTrainingPlan, STAGES, STAGE_BY_ID } from "../shared/trainingFlow";
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
      expect.objectContaining({ stageId: "brief", label: "Learn", detail: "Brief + narrated walkthrough", minutes: 50, durationLabel: "50 min guided experience" }),
      expect.objectContaining({ stageId: "practice", label: "Practice", detail: "Practice + coached rehearsal", minutes: 40, durationLabel: "40 min guided experience" }),
      expect.objectContaining({ stageId: "apply", label: "Apply", detail: "Application + transfer proof", minutes: 40, durationLabel: "40 min guided experience" }),
      expect.objectContaining({ stageId: "reflect", label: "Reflect", detail: "Reflection + final quiz", minutes: 35, durationLabel: "35 min guided experience" }),
    ]);
    expect(plan.quizTriggers.some((trigger) => trigger.stageId === "brief" && trigger.assessmentKey === "briefCheckpoint")).toBe(true);
    expect(plan.quizTriggers.some((trigger) => trigger.stageId === "practice" && trigger.assessmentKey === "practiceCheckpoint")).toBe(true);
    expect(plan.quizTriggers.some((trigger) => trigger.stageId === "apply" && trigger.assessmentKey === "applicationActivity")).toBe(true);
    expect(plan.quizTriggers.some((trigger) => trigger.stageId === "reflect" && trigger.assessmentKey === "finalQuiz")).toBe(true);
    expect(plan.quizTriggers.find((trigger) => trigger.assessmentKey === "briefCheckpoint")).toEqual(
      expect.objectContaining({
        label: "Knowledge review",
        modalTitle: "Knowledge check: Active Listening",
      }),
    );
    expect(plan.quizTriggers.at(-1)).toEqual(
      expect.objectContaining({
        label: "Final Quiz",
        modalPrompt: expect.stringContaining("80%"),
      }),
    );
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
      expect.objectContaining({ stageId: "brief", label: "Learn", detail: "Brief + narrated walkthrough", minutes: 70, durationLabel: "1.2 hr guided experience" }),
      expect.objectContaining({ stageId: "practice", label: "Practice", detail: "Practice + coached rehearsal", minutes: 55, durationLabel: "55 min guided experience" }),
      expect.objectContaining({ stageId: "apply", label: "Apply", detail: "Application + transfer proof", minutes: 50, durationLabel: "50 min guided experience" }),
      expect.objectContaining({ stageId: "reflect", label: "Reflect", detail: "Reflection + final quiz", minutes: 50, durationLabel: "50 min guided experience" }),
    ]);
    expect(plan.quizTriggers.at(-1)).toEqual(
      expect.objectContaining({
        stageId: "reflect",
        assessmentKey: "finalQuiz",
        label: "Final Quiz",
      }),
    );
  });
});

// Step 5 lock: every stage id resolves to exactly ONE label, from the single STAGES source,
// and BOTH consumers (buildGuidedTrainingPlan + the EnableOSViews stage array) read it. This
// is what stops the two label sets drifting apart again.
describe("single stage-label source of truth", () => {
  it("STAGES gives each id exactly one canonical label", () => {
    expect(STAGES.map((stage) => stage.id)).toEqual(["brief", "practice", "apply", "reflect"]);
    expect(STAGES.map((stage) => stage.label)).toEqual(["Learn", "Practice", "Apply", "Reflect"]);
    expect(new Set(STAGES.map((stage) => stage.id)).size).toBe(STAGES.length);
    expect(new Set(STAGES.map((stage) => stage.label)).size).toBe(STAGES.length);
    // The old content-descriptions are kept as `detail`, never as the label.
    expect(STAGE_BY_ID.brief.detail).toBe("Brief + narrated walkthrough");
    expect(STAGES.every((stage) => stage.label !== stage.detail)).toBe(true);
  });

  it("every stage carries all three per-stage strings, so adding a stage can't silently skip one", () => {
    for (const stage of STAGES) {
      for (const field of ["label", "detail", "navigatorLabel"] as const) {
        expect(typeof stage[field]).toBe("string");
        expect(stage[field].length).toBeGreaterThan(0);
      }
      // The two description fields must never stand in for the stage name.
      expect(stage.detail).not.toBe(stage.label);
      expect(stage.navigatorLabel).not.toBe(stage.label);
    }
    // navigatorLabel copy is folded in verbatim (was the getStageNavigatorLabel map).
    expect(STAGES.map((stage) => stage.navigatorLabel)).toEqual([
      "Focused lesson path",
      "Practice walkthrough",
      "Transfer walkthrough",
      "Reflection checkpoint",
    ]);
  });

  it("buildGuidedTrainingPlan takes every stage label/detail from STAGES", () => {
    const plan = buildGuidedTrainingPlan({ journeyTitle: "", moduleTitle: "", skillFocus: "", presentation: null });
    expect(plan.stageDurations.map((entry) => entry.stageId)).toEqual(STAGES.map((stage) => stage.id));
    for (const entry of plan.stageDurations) {
      expect(entry.label).toBe(STAGE_BY_ID[entry.stageId].label);
      expect(entry.detail).toBe(STAGE_BY_ID[entry.stageId].detail);
    }
  });

  it("the EnableOSViews stage array is built from STAGES, not an independent hardcoded label set", () => {
    const source = readFileSync(join(process.cwd(), "client/src/pages/EnableOSViews.tsx"), "utf8");
    expect(source).toContain('import { buildGuidedTrainingPlan, STAGES, STAGE_BY_ID, type StageId } from "../../../shared/trainingFlow"');
    expect(source).toContain("STAGES.map((stage) => ({ id: stage.id, label: stage.label");
    // The old hardcoded per-stage label objects must be gone.
    expect(source).not.toContain('id: "brief",\n          label: "Learn"');
  });
});

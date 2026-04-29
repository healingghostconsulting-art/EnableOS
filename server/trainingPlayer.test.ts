import { describe, expect, it } from "vitest";
import { getTrainingPresentation } from "../shared/trainingContent";
import { buildLessonNarrationScript, clampSlideSelection, evaluateCoachCheckpointResponse, getSlideCanvasVisuals } from "../shared/trainingPlayer";

describe("training player helpers", () => {
  it("clamps out-of-range slide selections to a safe interactive-canvas index", () => {
    expect(clampSlideSelection(-3, 4)).toBe(0);
    expect(clampSlideSelection(99, 4)).toBe(3);
    expect(clampSlideSelection(2, 4)).toBe(2);
    expect(clampSlideSelection(2, 0)).toBe(0);
  });

  it("returns an active slide-canvas visual from the mapped deck visuals", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-workflow-module",
        title: "Workflow verification essentials",
        format: "Playbook",
        durationMinutes: 12,
        skillFocus: "Quality workflow control",
      },
      "Workflow Precision",
      "Verification consistency and documentation accuracy",
    );

    const canvas = getSlideCanvasVisuals(presentation.deckVisuals, 2);

    expect(canvas.visuals).toHaveLength(4);
    expect(canvas.activeIndex).toBe(2);
    expect(canvas.activeVisual).toEqual(
      expect.objectContaining({
        pageLabel: "Slide 10",
        title: "Greeting and verification workflow",
      }),
    );
  });

  it("falls back to the first slide when the selected slide is outside the available visual set", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-engagement-module",
        title: "Recognition rhythm design",
        format: "Workshop",
        durationMinutes: 14,
        skillFocus: "Engagement cadence",
      },
      "Engagement & Recognition",
      "Recognition consistency and motivation design",
    );

    const canvas = getSlideCanvasVisuals(presentation.deckVisuals, -10);

    expect(canvas.activeIndex).toBe(0);
    expect(canvas.activeVisual).toEqual(
      expect.objectContaining({
        pageLabel: "Slide 8",
        title: "Gamification mistakes to avoid",
      }),
    );
  });

  it("builds narration from the active lesson page content instead of any external voice sample", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-listening-module",
        title: "Listening with intent",
        format: "Microlearning",
        durationMinutes: 8,
        skillFocus: "Active listening",
      },
      "Service Foundations",
      "Behavior consistency",
    );

    const narrationScript = buildLessonNarrationScript(presentation.slides[0], presentation);

    expect(narrationScript).toContain(presentation.slides[0].title);
    expect(narrationScript).toContain(presentation.slides[0].narrative);
    expect(narrationScript).toContain(presentation.slides[0].bullets[0]);
    expect(narrationScript).not.toContain("We must learn to let go");
  });

  it("passes a coach checkpoint response when it names evidence, behavior, and timing", () => {
    const evaluation = evaluateCoachCheckpointResponse(
      "In the next call review, listen for the agent to acknowledge the customer concern, confirm the next step, and document the commitment before closing.",
    );

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(75);
    expect(evaluation.feedback).toHaveLength(0);
  });

  it("accepts a simpler active-listening response when it clearly paraphrases and confirms understanding", () => {
    const evaluation = evaluateCoachCheckpointResponse(
      "I will rephrase the customer concerns and have them confirm the information is correct.",
    );

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(75);
  });

  it("requires retry when a coach checkpoint response is too vague to verify", () => {
    const evaluation = evaluateCoachCheckpointResponse("Be better next time.");

    expect(evaluation.passed).toBe(false);
    expect(evaluation.score).toBeLessThan(75);
    expect(evaluation.feedback.length).toBeGreaterThan(0);
  });
});

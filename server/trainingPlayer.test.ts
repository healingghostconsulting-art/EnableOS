import { describe, expect, it } from "vitest";
import { getTrainingPresentation } from "../shared/trainingContent";
import { buildLessonNarrationScript, clampSlideSelection, getSlideCanvasVisuals } from "../shared/trainingPlayer";

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
});

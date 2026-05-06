import { describe, expect, it } from "vitest";
import { getTrainingPresentation } from "./trainingContent";
import { buildTrainingVisualGallery, getSlideCanvasVisuals } from "./trainingPlayer";

describe("buildTrainingVisualGallery", () => {
  it("includes generated lesson visuals in addition to mapped deck assets", () => {
    const presentation = getTrainingPresentation(
      {
        id: "mod-sf-1",
        title: "Active listening in high-friction interactions",
        format: "Microlearning",
        durationMinutes: 8,
        skillFocus: "Listening precision",
      },
      "Service Foundations: Communication, Empathy, and Call Confidence",
      "Empathy language and call control consistency",
    );

    const visuals = buildTrainingVisualGallery(presentation);

    expect(visuals.length).toBeGreaterThan(presentation.deckVisuals.length);
    expect(visuals.some((visual) => visual.stageId === "brief" && visual.visualType === "generated")).toBe(true);
    expect(visuals.some((visual) => visual.stageId === "practice" && visual.visualType === "generated")).toBe(true);
    expect(visuals.some((visual) => visual.stageId === "apply" && visual.visualType === "generated")).toBe(true);
  });

  it("keeps slide selection clamped for gallery visuals", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-module",
        title: "Workflow ownership fundamentals",
        format: "Playbook",
        durationMinutes: 12,
        skillFocus: "Ownership language",
      },
      "Manager coaching path",
      "Behavior consistency",
    );

    const visuals = buildTrainingVisualGallery(presentation);
    const selection = getSlideCanvasVisuals(visuals, 999);

    expect(selection.activeIndex).toBe(visuals.length - 1);
    expect(selection.activeVisual?.id).toBe(visuals.at(-1)?.id);
  });
});

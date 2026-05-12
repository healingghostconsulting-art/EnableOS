import { describe, expect, it } from "vitest";

import { getTrainingPresentation } from "../shared/trainingContent";
import { buildTrainingVisualGallery } from "../shared/trainingPlayer";

describe("training visual gallery consistency", () => {
  it("surfaces multiple generated visuals even for generic trainings without mapped deck images", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-module",
        title: "Coaching conversation fundamentals",
        format: "Playbook",
        durationMinutes: 12,
        skillFocus: "Ownership language",
      },
      "Manager coaching path",
      "Behavior consistency",
    );

    const visuals = buildTrainingVisualGallery(presentation);

    expect(presentation.deckVisuals).toEqual([]);
    expect(visuals.length).toBeGreaterThanOrEqual(7);
    expect(visuals.some((visual) => visual.stageId === "brief" && visual.title === "Ownership language")).toBe(true);
    expect(visuals.some((visual) => visual.stageId === "practice" && visual.title.includes("Rehearse ownership language"))).toBe(true);
    expect(visuals.some((visual) => visual.stageId === "apply" && visual.title === "Pass the transfer gate")).toBe(true);
  });

  it("combines mapped deck visuals with generated lesson visuals for richer specialized trainings", () => {
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

    expect(presentation.deckVisuals.length).toBeGreaterThanOrEqual(3);
    expect(visuals.length).toBeGreaterThan(presentation.deckVisuals.length);
    expect(visuals.some((visual) => visual.stageId === "deck" && visual.pageLabel === "Slide 8")).toBe(true);
    expect(visuals.some((visual) => visual.stageId === "brief" && visual.pageLabel === "Brief 1")).toBe(true);
    expect(visuals.some((visual) => visual.stageId === "apply" && visual.pageLabel === "Apply 1")).toBe(true);
  });
});

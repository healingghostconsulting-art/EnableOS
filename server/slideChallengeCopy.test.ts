import { describe, expect, it } from "vitest";

import { buildSlideInteraction, evaluateSlideInteraction } from "../shared/trainingPlayer";

const sampleSlide = {
  id: "slide-1",
  title: "Calm the escalation moment",
  narrative: "Guide the caller back to clarity while keeping the next step visible.",
  bullets: [
    "Acknowledge the concern directly",
    "Name the next step clearly",
    "Document the outcome before closing",
  ],
  speakerNotes: [],
};

describe("slide challenge copy", () => {
  it("uses richer success and retry messaging in the shared interaction definition", () => {
    const interaction = buildSlideInteraction(sampleSlide as any, "De-escalation", 0);

    expect(interaction?.successMessage).toContain("Great job! Amazing answer");
    expect(interaction?.retryMessage).toContain("So close. Try again");
    expect(interaction?.retryMessage).toContain("you’ve got this");
  });

  it("surfaces encouraging retry hints for incomplete reveal-card attempts", () => {
    const interaction = buildSlideInteraction(sampleSlide as any, "De-escalation", 0);
    const evaluation = evaluateSlideInteraction(interaction, { revealedCardIds: ["slide-1-reveal-1"] });

    expect(evaluation.hints[0]).toContain("So close");
    expect(evaluation.hints[0]).toContain("try again");
  });
});

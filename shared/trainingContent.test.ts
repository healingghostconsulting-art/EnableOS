import { describe, expect, it } from "vitest";
import { getTrainingPresentation } from "./trainingContent";

describe("getTrainingPresentation", () => {
  it("returns rich visual lesson content for the core service-foundations module", () => {
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

    expect(presentation.heroTitle).toBe("Listening precision under friction");
    expect(presentation.slides.length).toBeGreaterThanOrEqual(3);
    expect(presentation.practiceScenario.successSignals).toEqual(
      expect.arrayContaining([
        "The concern is restated accurately.",
        "The next action is concrete and time-bound.",
      ]),
    );
    expect(presentation.resourceActions.length).toBeGreaterThan(2);
  });

  it("builds a fallback lesson when a module does not have a dedicated presentation mapping", () => {
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

    expect(presentation.heroTitle).toBe("Workflow ownership fundamentals");
    expect(presentation.slides[0]?.title).toBe("Ownership language");
    expect(presentation.practiceScenario.title).toBe("Applied workflow rehearsal");
    expect(presentation.coachPrompts[0]).toContain("behavior");
  });
});

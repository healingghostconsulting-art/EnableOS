import { describe, expect, it } from "vitest";

import { getTrainingPresentation } from "../shared/trainingContent";

describe("QA workflow content expansion", () => {
  it("builds a richer QA workflow brief sequence with scorecard and coaching-transfer coverage", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-workflow-module",
        title: "Workflow verification essentials",
        format: "Playbook",
        durationMinutes: 12,
        skillFocus: "Quality workflow control",
      },
      "Workflow Precision",
      "Behavior consistency",
    );

    expect(presentation.slides.length).toBeGreaterThanOrEqual(16);
    expect(presentation.slides[0]?.title).toBe("Quality workflow control");
    expect(presentation.slides.some((slide) => slide.title === "Read the QA scorecard like an operating model")).toBe(true);
    expect(presentation.slides.some((slide) => slide.title === "Turn QA findings into coaching action")).toBe(true);
  });
});

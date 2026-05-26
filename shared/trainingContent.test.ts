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

  it("returns curated curriculum presentations for the expanded migration families", () => {
    const workflowPresentation = getTrainingPresentation(
      {
        id: "mod-wp-1",
        title: "Verification and Workflow Accuracy",
        format: "Playbook",
        durationMinutes: 9,
        skillFocus: "Process discipline",
      },
      "Quality Assurance Essentials",
      "Coaching consistency on workflow accuracy and documentation",
    );
    const regulatedServicePresentation = getTrainingPresentation(
      {
        id: "mod-lfs-1",
        title: "Professional clarity under compliance pressure",
        format: "Microlearning",
        durationMinutes: 9,
        skillFocus: "Composure",
      },
      "Soft Skills & Customer/Patient Service Foundation",
      "Professional confidence in regulated conversations",
    );
    const engagementPresentation = getTrainingPresentation(
      {
        id: "mod-hce-1",
        title: "Foundations of Engagement and Gamification",
        format: "Playbook",
        durationMinutes: 9,
        skillFocus: "Recognition and motivation design",
      },
      "Gamification for Remote Teams: Engaging and Empowering Leaders",
      "Recognition rhythm for hybrid teams",
    );

    expect(workflowPresentation.heroTitle).toBe("Verification confidence and workflow control");
    expect(workflowPresentation.evidenceLabel).toContain("module-aware QA and launch-readiness lesson");
    expect(workflowPresentation.deckVisuals[0]?.imageUrl).toContain("data:image/svg+xml");
    expect(workflowPresentation.practiceScenario.title).toBe("Launch-readiness verification drill");

    expect(regulatedServicePresentation.heroTitle).toBe("Professional clarity inside regulated conversations");
    expect(regulatedServicePresentation.slides[0]?.title).toBe("What calm clarity sounds like under pressure");
    expect(regulatedServicePresentation.resourceActions[0]?.label).toBe("Regulated-language guide");

    expect(engagementPresentation.heroTitle).toBe("Recognition systems that create repeatable engagement");
    expect(engagementPresentation.applySlides[0]?.title).toBe("How to prove engagement design is working");
    expect(engagementPresentation.finalQuiz.questions).toHaveLength(4);
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

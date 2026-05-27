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

  it("returns curated second-module curriculum presentations for the next production-depth tranche", () => {
    const workflowCoachingPresentation = getTrainingPresentation(
      {
        id: "mod-wp-2",
        title: "Turning QA Findings into Behavior Coaching",
        format: "Microlearning",
        durationMinutes: 7,
        skillFocus: "Behavior-based coaching",
      },
      "Quality Assurance Essentials",
      "Coaching consistency on workflow accuracy and documentation",
    );
    const coachingDocumentationPresentation = getTrainingPresentation(
      {
        id: "mod-rtc-2",
        title: "SMART Goals and Coaching Documentation",
        format: "Microlearning",
        durationMinutes: 8,
        skillFocus: "Action planning and follow-through",
      },
      "Real-time Coaching",
      "Consistent field coaching with observable follow-through",
    );
    const dataActionPresentation = getTrainingPresentation(
      {
        id: "mod-dl-2",
        title: "Translating Data into Actionable Insights",
        format: "Microlearning",
        durationMinutes: 9,
        skillFocus: "Root-cause analysis and action planning",
      },
      "Unlocking the Power of Data",
      "Intervention-to-outcome visibility",
    );
    const regulatedVerificationPresentation = getTrainingPresentation(
      {
        id: "mod-lfs-2",
        title: "Verification discipline and secure handoffs",
        format: "Checklist",
        durationMinutes: 7,
        skillFocus: "Accuracy",
      },
      "Soft Skills & Customer/Patient Service Foundation",
      "Professional confidence in regulated conversations",
    );
    const performanceCalibrationPresentation = getTrainingPresentation(
      {
        id: "mod-lfp-2",
        title: "Calibration and QA-Driven Coaching",
        format: "Scenario",
        durationMinutes: 12,
        skillFocus: "Objective coaching and bias control",
      },
      "Utilizing Performance Management to Maximize Results",
      "Performance segmentation without bias",
    );
    const engagementRhythmPresentation = getTrainingPresentation(
      {
        id: "mod-hce-2",
        title: "Designing Rewards, Games, and Recognition Rhythms",
        format: "Microlearning",
        durationMinutes: 8,
        skillFocus: "Team motivation and reward systems",
      },
      "Gamification for Remote Teams: Engaging and Empowering Leaders",
      "Recognition rhythm for hybrid teams",
    );
    const cultureRhythmPresentation = getTrainingPresentation(
      {
        id: "mod-hcd-2",
        title: "Operating rhythm for distributed teams",
        format: "Checklist",
        durationMinutes: 7,
        skillFocus: "Leadership cadence",
      },
      "Culture Momentum and Readiness Visibility",
      "Linking recognition to measurable performance",
    );

    expect(workflowCoachingPresentation.heroTitle).toBe("Turning QA findings into coachable behavior");
    expect(workflowCoachingPresentation.practiceScenario.title).toBe("Behavior-coaching QA debrief");
    expect(workflowCoachingPresentation.finalQuiz.questions).toHaveLength(4);

    expect(coachingDocumentationPresentation.heroTitle).toBe("SMART coaching goals that survive follow-through");
    expect(coachingDocumentationPresentation.slides[1]?.title).toBe("Documentation that protects accountability");

    expect(dataActionPresentation.heroTitle).toBe("Turning trend movement into actionable insight");
    expect(dataActionPresentation.resourceActions[0]?.label).toBe("Insight framing guide");

    expect(regulatedVerificationPresentation.heroTitle).toBe("Secure verification that protects trust and flow");
    expect(regulatedVerificationPresentation.practiceScenario.successSignals[1]).toContain("next owner");

    expect(performanceCalibrationPresentation.evidenceLabel).toContain("calibration and QA-driven coaching lesson");
    expect(performanceCalibrationPresentation.applySlides[0]?.title).toBe("How to prove the calibration improved the coaching move");

    expect(engagementRhythmPresentation.heroTitle).toBe("Designing reward rhythms teams will trust");
    expect(engagementRhythmPresentation.slides[0]?.title).toBe("What a trusted reward system is built on");

    expect(cultureRhythmPresentation.heroTitle).toBe("Distributed-team rhythm leaders can reinforce");
    expect(cultureRhythmPresentation.resourceActions[0]?.label).toBe("Cadence map");
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

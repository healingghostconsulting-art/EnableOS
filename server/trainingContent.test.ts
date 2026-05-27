import { describe, expect, it } from "vitest";
import { getTrainingPresentation } from "../shared/trainingContent";

describe("getTrainingPresentation", () => {
  it("returns step-by-step lesson pages, embedded deck visuals, and native lesson charts for the core service-foundations module", () => {
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

    expect(presentation.heroTitle).toBe("Active listening in high-friction interactions");
    expect(presentation.deckVisuals).toHaveLength(3);
    expect(presentation.deckVisuals[0]?.imageUrl).toContain("softskills-08");
    expect(presentation.deckVisuals[1]?.pageLabel).toBe("Slide 14");
    expect(presentation.insightCharts).toHaveLength(2);
    expect(presentation.insightCharts[0]?.title).toBe("Listening behavior adoption");
    expect(presentation.insightCharts[0]?.chartType).toBe("comparison");
    expect(presentation.insightCharts[0]?.insightNote).toContain("observable listening moves");
    expect(presentation.insightCharts[0]?.data[0]).toEqual(
      expect.objectContaining({ label: "Acknowledge concern", value: 92, benchmark: 85 }),
    );
    expect(presentation.insightCharts[1]?.title).toBe("Customer calm recovery curve");
    expect(presentation.insightCharts[1]?.chartType).toBe("trend");
    expect(presentation.insightCharts[1]?.data[2]?.label).toBe("After summary");
    expect(presentation.slides.length).toBeGreaterThanOrEqual(3);
    expect(presentation.practiceSlides.length).toBeGreaterThanOrEqual(2);
    expect(presentation.applySlides.length).toBeGreaterThanOrEqual(1);
    expect(presentation.briefCheckpoint.questions).toHaveLength(2);
    expect(presentation.practiceCheckpoint.questions).toHaveLength(2);
    expect(presentation.applicationActivity.passingScore).toBe(2);
    expect(presentation.applicationActivity.questions).toHaveLength(2);
    expect(presentation.applicationActivity.questions[0]?.correctOptionId).toBe("listen-q1-b");
    expect(presentation.finalQuiz.title).toBe("Final Quiz: Active listening in high-friction interactions");
    expect(presentation.finalQuiz.instructions).toContain("Answer each question in sequence");
    expect(presentation.finalQuiz.passingPercent).toBe(80);
    expect(presentation.finalQuiz.passingScore).toBe(4);
    expect(presentation.finalQuiz.questions).toHaveLength(5);
    expect(presentation.practiceScenario.successSignals).toEqual(
      expect.arrayContaining([
        "The concern is restated accurately.",
        "The next action is concrete and time-bound.",
      ]),
    );
    expect(presentation.resourceActions.length).toBeGreaterThan(2);
  });

  it("returns mapped reassurance content with embedded empathy visuals and trust-safe charts", () => {
    const presentation = getTrainingPresentation(
      {
        id: "mod-sf-2",
        title: "Confident reassurance without overpromising",
        format: "Playbook",
        durationMinutes: 11,
        skillFocus: "Language confidence",
      },
      "Service Foundations: Communication, Empathy, and Call Confidence",
      "Confidence language and escalation clarity",
    );

    expect(presentation.deckVisuals).toHaveLength(3);
    expect(presentation.deckVisuals[0]?.imageUrl).toContain("softskills-09");
    expect(presentation.deckVisuals[1]?.title).toBe("Empathy script rewrite activity");
    expect(presentation.insightCharts).toHaveLength(2);
    expect(presentation.insightCharts[0]?.title).toBe("Trust-safe reassurance mix");
    expect(presentation.insightCharts[0]?.data[2]).toEqual(
      expect.objectContaining({ label: "Outcome overpromise", value: 19, benchmark: 10 }),
    );
    expect(presentation.applicationActivity.questions[1]?.correctOptionId).toBe("reassure-q2-a");
    expect(presentation.resourceActions[1]?.label).toBe("Audit tie-in");
  });

  it("returns mapped de-escalation content with embedded recovery visuals and escalation charts", () => {
    const presentation = getTrainingPresentation(
      {
        id: "mod-sf-3",
        title: "De-escalation and professional recovery",
        format: "Scenario",
        durationMinutes: 10,
        skillFocus: "Service recovery",
      },
      "Service Foundations: Communication, Empathy, and Call Confidence",
      "Escalation recovery and professionalism",
    );

    expect(presentation.deckVisuals).toHaveLength(3);
    expect(presentation.deckVisuals[0]?.title).toBe("Why patients become upset");
    expect(presentation.deckVisuals[1]?.imageUrl).toContain("softskills-32");
    expect(presentation.insightCharts).toHaveLength(2);
    expect(presentation.insightCharts[0]?.metricLabel).toBe("Recovery score");
    expect(presentation.insightCharts[1]?.data[0]).toEqual(
      expect.objectContaining({ label: "Ownership gaps", value: 41, benchmark: 35 }),
    );
    expect(presentation.applicationActivity.questions[0]?.correctOptionId).toBe("deescalate-q1-b");
    expect(presentation.applicationActivity.questions[1]?.correctOptionId).toBe("deescalate-q2-b");
    expect(presentation.resourceActions[0]?.label).toBe("Recovery storyboard");
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
    expect(engagementPresentation.finalQuiz.questions).toHaveLength(5);
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
    expect(workflowCoachingPresentation.finalQuiz.questions).toHaveLength(5);

    expect(coachingDocumentationPresentation.heroTitle).toBe("SMART coaching goals that survive follow-through");
    expect(coachingDocumentationPresentation.slides.map((slide) => slide.title)).toContain("Documentation that protects accountability");

    expect(dataActionPresentation.heroTitle).toBe("Turning trend movement into actionable insight");
    expect(dataActionPresentation.resourceActions[0]?.label).toBe("Insight framing guide");

    expect(regulatedVerificationPresentation.heroTitle).toBe("Secure verification that protects trust and flow");
    expect(regulatedVerificationPresentation.practiceScenario.successSignals[1]).toContain("next owner");

    expect(performanceCalibrationPresentation.evidenceLabel).toContain("calibration and QA-driven coaching lesson");
    expect(performanceCalibrationPresentation.applySlides.map((slide) => slide.title)).toContain("How to prove the calibration improved the coaching move");

    expect(engagementRhythmPresentation.heroTitle).toBe("Designing reward rhythms teams will trust");
    expect(engagementRhythmPresentation.slides.map((slide) => slide.title)).toContain("What a trusted reward system is built on");

    expect(cultureRhythmPresentation.heroTitle).toBe("Distributed-team rhythm leaders can reinforce");
    expect(cultureRhythmPresentation.resourceActions[0]?.label).toBe("Cadence map");
  });

  it("returns curated third-module curriculum presentations for the next roadmap-depth tranche", () => {
    const workflowCalibrationPresentation = getTrainingPresentation(
      {
        id: "mod-wp-3",
        title: "QA Calibration and Fair Score Interpretation",
        format: "Checklist",
        durationMinutes: 6,
        skillFocus: "Evaluation rigor",
      },
      "Quality Assurance Essentials",
      "Coaching consistency on workflow accuracy and documentation",
    );
    const accountabilityConversationPresentation = getTrainingPresentation(
      {
        id: "mod-rtc-3",
        title: "Learning Styles and Accountability Conversations",
        format: "Scenario",
        durationMinutes: 10,
        skillFocus: "Personalized coaching and ownership",
      },
      "Real-time Coaching",
      "Consistent field coaching with observable follow-through",
    );
    const reportingValidationPresentation = getTrainingPresentation(
      {
        id: "mod-dl-3",
        title: "Validating Conclusions and Building Better Reports",
        format: "Checklist",
        durationMinutes: 8,
        skillFocus: "Decision-ready data review",
      },
      "Unlocking the Power of Data",
      "Intervention-to-outcome visibility",
    );
    const reassuranceTrustPresentation = getTrainingPresentation(
      {
        id: "mod-lfs-3",
        title: "Reassurance phrases that build trust",
        format: "Playbook",
        durationMinutes: 10,
        skillFocus: "Trust-building",
      },
      "Soft Skills & Customer/Patient Service Foundation",
      "Professional confidence in regulated conversations",
    );
    const tailoredPlanPresentation = getTrainingPresentation(
      {
        id: "mod-lfp-3",
        title: "Tailored Performance Plans and Leadership Rituals",
        format: "Checklist",
        durationMinutes: 9,
        skillFocus: "Performance planning and follow-through",
      },
      "Utilizing Performance Management to Maximize Results",
      "Performance segmentation without bias",
    );
    const engagementIterationPresentation = getTrainingPresentation(
      {
        id: "mod-hce-3",
        title: "Measuring Engagement and Iterating the Program",
        format: "Checklist",
        durationMinutes: 8,
        skillFocus: "Continuous improvement",
      },
      "Gamification for Remote Teams: Engaging and Empowering Leaders",
      "Recognition rhythm for hybrid teams",
    );

    expect(workflowCalibrationPresentation.heroTitle).toBe("Calibration habits that make QA scoring fair");
    expect(workflowCalibrationPresentation.applySlides.map((slide) => slide.title)).toContain("How to prove calibration improved the decision");
    expect(workflowCalibrationPresentation.finalQuiz.questions).toHaveLength(5);

    expect(accountabilityConversationPresentation.heroTitle).toBe("Accountability conversations that match the learner");
    expect(accountabilityConversationPresentation.slides.map((slide) => slide.title)).toContain("What personalized accountability actually sounds like");

    expect(reportingValidationPresentation.heroTitle).toBe("Validating data stories before leaders act on them");
    expect(reportingValidationPresentation.resourceActions[0]?.label).toBe("Validation sequence guide");

    expect(reassuranceTrustPresentation.heroTitle).toBe("Reassurance language that protects trust under pressure");
    expect(reassuranceTrustPresentation.practiceScenario.successSignals[1]).toContain("next step");

    expect(tailoredPlanPresentation.evidenceLabel).toContain("tailored performance-plan lesson");
    expect(tailoredPlanPresentation.slides.map((slide) => slide.title)).toContain("What a tailored performance plan must include");

    expect(engagementIterationPresentation.heroTitle).toBe("Measuring engagement so the program keeps improving");
    expect(engagementIterationPresentation.resourceActions[0]?.label).toBe("Engagement metrics planner");
  });

  it("builds a fallback workflow lesson with QA visuals and weighted scoring charts when the module points to quality operations", () => {
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

    expect(presentation.heroTitle).toBe("Workflow verification essentials");
    expect(presentation.deckVisuals).toHaveLength(4);
    expect(presentation.deckVisuals[0]?.imageUrl).toContain("qa-09");
    expect(presentation.deckVisuals[1]?.title).toBe("High-scoring behavior board");
    expect(presentation.insightCharts).toHaveLength(2);
    expect(presentation.insightCharts[0]?.title).toBe("Workflow scoring emphasis");
    expect(presentation.insightCharts[0]?.chartType).toBe("comparison");
    expect(presentation.insightCharts[1]?.metricLabel).toBe("Agreement rate");
    expect(presentation.insightCharts[1]?.insightNote).toContain("coherent message");
    expect(presentation.applySlides[0]?.title).toBe("Pass the transfer gate");
    expect(presentation.briefCheckpoint.questions[1]?.type).toBe("short_answer");
    expect(presentation.practiceCheckpoint.questions[0]?.type).toBe("multiple_choice");
    expect(presentation.applicationActivity.questions[0]?.correctOptionId).toBe("custom-workflow-module-q1-a");
    expect(presentation.finalQuiz.style).toBe("kahoot");
    expect(presentation.finalQuiz.title).toBe("Final Quiz: Workflow verification essentials");
    expect(presentation.finalQuiz.passingScore).toBe(4);
  });

  it("builds a fallback leadership lesson with KPI visuals and insight-to-action charts when the module points to data-led leadership", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-leadership-module",
        title: "Leadership KPI literacy",
        format: "Workshop",
        durationMinutes: 15,
        skillFocus: "KPI interpretation",
      },
      "Unlocking the Power of Data",
      "Trend interpretation and action planning",
    );

    expect(presentation.heroTitle).toBe("Leadership KPI literacy");
    expect(presentation.deckVisuals).toHaveLength(4);
    expect(presentation.deckVisuals[0]?.imageUrl).toContain("leadership-data-08");
    expect(presentation.deckVisuals[1]?.title).toBe("From insight to action");
    expect(presentation.insightCharts).toHaveLength(2);
    expect(presentation.insightCharts[0]?.title).toBe("KPI interpretation readiness");
    expect(presentation.insightCharts[0]?.chartType).toBe("comparison");
    expect(presentation.insightCharts[1]?.chartType).toBe("trend");
    expect(presentation.insightCharts[1]?.data[2]).toEqual(
      expect.objectContaining({ label: "Actioned", value: 63, benchmark: 68 }),
    );
    expect(presentation.practiceSlides[0]?.title).toContain("kpi interpretation");
    expect(presentation.applicationActivity.questions[1]?.correctOptionId).toBe("custom-leadership-module-q2-a");
  });

  it("builds a fallback performance-leadership lesson with calibration visuals and coaching leverage charts when the module points to performance management", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-performance-module",
        title: "Performance calibration workshop",
        format: "Workshop",
        durationMinutes: 18,
        skillFocus: "Calibration and coaching leverage",
      },
      "Utilizing Performance Management to Maximize Results",
      "Movable middle coaching and structured improvement plans",
    );

    expect(presentation.heroTitle).toBe("Performance calibration workshop");
    expect(presentation.deckVisuals).toHaveLength(4);
    expect(presentation.deckVisuals[0]?.imageUrl).toContain("performance-leadership-08");
    expect(presentation.deckVisuals[1]?.title).toBe("Engaging and developing high performers");
    expect(presentation.insightCharts).toHaveLength(2);
    expect(presentation.insightCharts[0]?.title).toBe("Performance bucket distribution");
    expect(presentation.insightCharts[0]?.chartType).toBe("comparison");
    expect(presentation.insightCharts[0]?.data[1]).toEqual(
      expect.objectContaining({ label: "Movable middle", value: 56, benchmark: 58 }),
    );
    expect(presentation.insightCharts[1]?.title).toBe("Coaching leverage by performance group");
    expect(presentation.applicationActivity.questions[0]?.correctOptionId).toBe("custom-performance-module-q1-a");
  });

  it("builds an engagement fallback lesson with gamification visuals and recognition-rhythm charts when the module points to engagement systems", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-engagement-module",
        title: "Recognition rhythm design",
        format: "Workshop",
        durationMinutes: 14,
        skillFocus: "Engagement cadence",
      },
      "Gamification for Remote Teams",
      "Recognition consistency and motivation design",
    );

    expect(presentation.heroTitle).toBe("Recognition rhythm design");
    expect(presentation.deckVisuals).toHaveLength(4);
    expect(presentation.deckVisuals[0]?.imageUrl).toContain("gamification-08");
    expect(presentation.deckVisuals[1]?.title).toBe("Recognition cadence operating rhythm");
    expect(presentation.insightCharts).toHaveLength(2);
    expect(presentation.insightCharts[0]?.title).toBe("Recognition rhythm coverage");
    expect(presentation.insightCharts[1]?.data[1]).toEqual(
      expect.objectContaining({ label: "Burnout risk", value: 26, benchmark: 20 }),
    );
    expect(presentation.applySlides[0]?.title).toBe("Pass the transfer gate");
    expect(presentation.applicationActivity.questions[0]?.correctOptionId).toBe("custom-engagement-module-q1-a");
  });

  it("builds a fallback real-time coaching lesson with coaching-readiness charts and action tools when the module points to the uploaded coaching curriculum", () => {
    const presentation = getTrainingPresentation(
      {
        id: "custom-coaching-module",
        title: "SMART Goals and Coaching Documentation",
        format: "Workshop",
        durationMinutes: 16,
        skillFocus: "Coaching pillars and follow-through",
      },
      "Real-time Coaching",
      "Visible follow-through and accountable development",
    );

    expect(presentation.heroTitle).toBe("SMART Goals and Coaching Documentation");
    expect(presentation.deckVisuals).toEqual([]);
    expect(presentation.insightCharts).toHaveLength(2);
    expect(presentation.insightCharts[0]?.title).toBe("Coaching conversation readiness");
    expect(presentation.insightCharts[1]?.title).toBe("Coaching transfer cadence");
    expect(presentation.heroSummary).toContain("SMART action planning");
    expect(presentation.evidenceLabel).toBe("Real-time Coaching deck translated into preparation, feedback, and accountability views");
    expect(presentation.resourceActions[0]?.label).toBe("Coaching prep sheet");
    expect(presentation.resourceActions[1]?.label).toBe("SMART follow-up");
    expect(presentation.applicationActivity.questions[0]?.correctOptionId).toBe("custom-coaching-module-q1-a");
  });

  it("builds a generic fallback lesson with gated application content when a module has no specialized deck match", () => {
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

    expect(presentation.heroTitle).toBe("Coaching conversation fundamentals");
    expect(presentation.deckVisuals).toEqual([]);
    expect(presentation.insightCharts).toHaveLength(1);
    expect(presentation.insightCharts[0]?.metricLabel).toBe("Behavior score");
    expect(presentation.slides[0]?.title).toBe("Ownership language");
    expect(presentation.practiceSlides[0]?.title).toContain("ownership language");
    expect(presentation.applySlides[0]?.title).toBe("Pass the transfer gate");
    expect(presentation.practiceScenario.title).toBe("Applied workflow rehearsal");
    expect(presentation.briefCheckpoint.questions[0]?.type).toBe("multiple_choice");
    expect(presentation.practiceCheckpoint.questions[1]?.type).toBe("short_answer");
    expect(presentation.applicationActivity.questions).toHaveLength(2);
    expect(presentation.applicationActivity.questions[0]?.correctOptionId).toBe("custom-module-q1-a");
    expect(presentation.finalQuiz.questions).toHaveLength(5);
    expect(presentation.finalQuiz.passMessage).toContain("final quiz");
    expect(presentation.finalQuiz.passingPercent).toBe(80);
    expect(presentation.coachPrompts[0]).toContain("behavior");
  });
});

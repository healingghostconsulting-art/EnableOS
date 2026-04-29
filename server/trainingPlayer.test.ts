import { describe, expect, it } from "vitest";
import { getTrainingPresentation } from "../shared/trainingContent";
import {
  buildLessonNarrationScript,
  buildSlideInteraction,
  clampSlideSelection,
  evaluateCoachCheckpointResponse,
  evaluateSlideInteraction,
  getSlideCanvasVisuals,
} from "../shared/trainingPlayer";

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

  it("rotates slide interactions across all nine learner interaction types", () => {
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

    const expectedKinds = [
      "click_to_reveal",
      "multiple_choice",
      "branching_scenario",
      "short_answer",
      "match_the_term",
      "role_play",
      "simulation",
      "timed_challenge",
      "drag_and_drop",
    ];

    const observedKinds = expectedKinds.map((_, index) => buildSlideInteraction(presentation.slides[index], "Active listening", index)?.kind);

    expect(observedKinds).toEqual(expectedKinds);
  });

  it("passes reveal, choice, and branching interactions when the learner picks the intended behavior", () => {
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

    const revealInteraction = buildSlideInteraction(presentation.slides[0], "Active listening", 0);
    const multipleChoiceInteraction = buildSlideInteraction(presentation.slides[1], "Active listening", 1);
    const branchingInteraction = buildSlideInteraction(presentation.slides[2], "Active listening", 2);

    expect(evaluateSlideInteraction(revealInteraction, {
      revealedCardIds: revealInteraction?.revealCards?.map((card) => card.id) ?? [],
    }).passed).toBe(true);

    expect(evaluateSlideInteraction(multipleChoiceInteraction, {
      selectedChoiceId: multipleChoiceInteraction?.choices?.find((choice) => choice.correct)?.id,
    }).passed).toBe(true);

    expect(evaluateSlideInteraction(branchingInteraction, {
      selectedChoiceId: branchingInteraction?.choices?.find((choice) => choice.correct)?.id,
    }).passed).toBe(true);
  });

  it("passes short-answer and role-play interactions when the response names the behavior, proof, and timing", () => {
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

    const shortAnswerInteraction = buildSlideInteraction(presentation.slides[3], "Active listening", 3);
    const rolePlayInteraction = buildSlideInteraction(presentation.slides[5], "Active listening", 5);

    const shortAnswerEvaluation = evaluateSlideInteraction(shortAnswerInteraction, {
      shortAnswer: "On the next call, I will acknowledge the customer concern, restate the issue, and document the next step so QA can verify it.",
    });

    const rolePlayEvaluation = evaluateSlideInteraction(rolePlayInteraction, {
      rolePlayAnswer: "I hear the frustration, I will confirm the next step before closing, and I will document the handoff note so the coach can review it in the next check-in.",
    });

    expect(shortAnswerEvaluation.passed).toBe(true);
    expect(shortAnswerEvaluation.score).toBeGreaterThanOrEqual(75);
    expect(rolePlayEvaluation.passed).toBe(true);
    expect(rolePlayEvaluation.score).toBeGreaterThanOrEqual(75);
  });

  it("passes matching, simulation, timed, and ordering interactions when the learner completes the correct action", () => {
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

    const matchInteraction = buildSlideInteraction(presentation.slides[4], "Active listening", 4);
    const simulationInteraction = buildSlideInteraction(presentation.slides[6], "Active listening", 6);
    const timedInteraction = buildSlideInteraction(presentation.slides[7], "Active listening", 7);
    const dragInteraction = buildSlideInteraction(presentation.slides[8], "Active listening", 8);

    const matchEvaluation = evaluateSlideInteraction(matchInteraction, {
      matchedPairs: Object.fromEntries((matchInteraction?.choices ?? []).map((choice) => [choice.matchKey ?? choice.id, choice.id])),
    });

    const simulationEvaluation = evaluateSlideInteraction(simulationInteraction, {
      selectedChoiceId: simulationInteraction?.choices?.find((choice) => choice.correct)?.id,
    });

    const timedEvaluation = evaluateSlideInteraction(timedInteraction, {
      selectedChoiceId: timedInteraction?.choices?.find((choice) => choice.correct)?.id,
      elapsedSeconds: 5,
    });

    const dragEvaluation = evaluateSlideInteraction(dragInteraction, {
      orderedSteps: dragInteraction?.orderedSteps ?? [],
    });

    expect(matchEvaluation.passed).toBe(true);
    expect(simulationEvaluation.passed).toBe(true);
    expect(timedEvaluation.passed).toBe(true);
    expect(dragEvaluation.passed).toBe(true);
  });

  it("returns retry guidance when an interaction submission is too weak or too slow", () => {
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

    const shortAnswerInteraction = buildSlideInteraction(presentation.slides[3], "Active listening", 3);
    const timedInteraction = buildSlideInteraction(presentation.slides[7], "Active listening", 7);

    const shortAnswerEvaluation = evaluateSlideInteraction(shortAnswerInteraction, {
      shortAnswer: "Be nicer next time.",
    });

    const timedEvaluation = evaluateSlideInteraction(timedInteraction, {
      selectedChoiceId: timedInteraction?.choices?.find((choice) => choice.correct)?.id,
      elapsedSeconds: 45,
    });

    expect(shortAnswerEvaluation.passed).toBe(false);
    expect(shortAnswerEvaluation.hints.length).toBeGreaterThan(0);
    expect(timedEvaluation.passed).toBe(false);
    expect(timedEvaluation.hints[0]).toContain("seconds");
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

  it("accepts a workflow-focused checkpoint response when it names verification, documentation, and timing", () => {
    const evaluation = evaluateCoachCheckpointResponse(
      "During the next verification call, confirm the account details, document the handoff note, and let QA review the record for accuracy.",
    );

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(75);
  });

  it("accepts a leadership checkpoint response when it ties KPI review to a visible follow-up action", () => {
    const evaluation = evaluateCoachCheckpointResponse(
      "In the next dashboard review, compare the KPI trend, verify the root cause with the scorecard, and document the improvement action for follow-up.",
    );

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(75);
  });

  it("accepts an engagement checkpoint response when it names a recognition behavior and proof point", () => {
    const evaluation = evaluateCoachCheckpointResponse(
      "On the next remote team huddle, recognize the behavior publicly, track the engagement response, and review the pulse-check results afterward.",
    );

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(75);
  });

  it("accepts a service-recovery checkpoint response with simpler expectation-setting phrasing", () => {
    const evaluation = evaluateCoachCheckpointResponse(
      "On the next call, I will apologize, set expectations, and document the follow-up so the record shows what happens next.",
    );

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(75);
  });

  it("accepts a coaching checkpoint response that references a one-on-one and observable proof", () => {
    const evaluation = evaluateCoachCheckpointResponse(
      "In the next one-on-one, review the call, coach the behavior, and log a coaching note so the manager can verify the action plan.",
    );

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(75);
  });

  it("accepts a documentation-focused checkpoint response that uses account-note phrasing", () => {
    const evaluation = evaluateCoachCheckpointResponse(
      "Before the case is closed, capture the note, confirm the next step, and make sure the account record shows the handoff clearly.",
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

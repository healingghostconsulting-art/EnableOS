import type { TrainingDeckVisual, TrainingPresentation, TrainingPresentationSlide } from "./trainingContent";

export function clampSlideSelection(selectedIndex: number, visualCount: number) {
  if (visualCount <= 0) {
    return 0;
  }

  if (!Number.isFinite(selectedIndex) || selectedIndex < 0) {
    return 0;
  }

  if (selectedIndex >= visualCount) {
    return visualCount - 1;
  }

  return selectedIndex;
}

export function getSlideCanvasVisuals(deckVisuals: TrainingDeckVisual[], selectedIndex: number) {
  if (!deckVisuals.length) {
    return {
      activeIndex: 0,
      activeVisual: null,
      visuals: [] as TrainingDeckVisual[],
    };
  }

  const activeIndex = clampSlideSelection(selectedIndex, deckVisuals.length);

  return {
    activeIndex,
    activeVisual: deckVisuals[activeIndex] ?? null,
    visuals: deckVisuals,
  };
}

export type CoachCheckpointEvaluation = {
  score: number;
  passed: boolean;
  passedCriteria: number;
  totalCriteria: number;
  strengths: string[];
  feedback: string[];
};

export function evaluateCoachCheckpointResponse(note: string): CoachCheckpointEvaluation {
  const normalizedNote = note.trim().toLowerCase();
  const wordCount = normalizedNote.length > 0 ? normalizedNote.split(/\s+/).filter(Boolean).length : 0;
  const behaviorPattern = /(acknowledge|confirm|ask|document|coach|restate|clarify|de-escalate|follow up|commit|close|open|validate|rephrase|paraphrase|repeat back|mirror|summari[sz]e)/;
  const evidencePattern = /(listen|hear|see|verify|observe|monitor|check|review|audit|measure|confirm|confirmation|confirmed|correct|understand|understanding|accurate|accuracy)/;
  const timingPattern = /(next|before|after|then|within|follow-up|follow up|step|commitment|again|during|tomorrow|today|this call|next call|next interaction|going forward|i will|will|plan to)/;
  const activeListeningPattern = /(customer concern|customer concerns|concern|concerns|information|understanding|rephrase|paraphrase|repeat back|confirm the information|confirm understanding|make sure|ensure|is correct|correct)/;

  const criteria = [
    {
      passed: wordCount >= 10 || (wordCount >= 8 && behaviorPattern.test(normalizedNote) && activeListeningPattern.test(normalizedNote)),
      success: "The response includes enough detail for a coach to assess it in context.",
      fail: "Add a little more detail so the coach can understand the full follow-up behavior in context.",
    },
    {
      passed: evidencePattern.test(normalizedNote) || /have (them|the customer) confirm/.test(normalizedNote),
      success: "The response names observable evidence a coach can verify.",
      fail: "Name what the coach should hear, see, review, or verify in the live interaction.",
    },
    {
      passed: behaviorPattern.test(normalizedNote),
      success: "The response identifies a coached behavior, not just a general intention.",
      fail: "Describe the exact behavior the learner should demonstrate, such as rephrasing, acknowledging, confirming, clarifying, or documenting.",
    },
    {
      passed: timingPattern.test(normalizedNote),
      success: "The response explains when the behavior should happen in the workflow.",
      fail: "Explain when the coached behavior should happen, such as in the next call, during the interaction, or as a stated commitment like 'I will'.",
    },
  ];

  const strengths = criteria.filter((criterion) => criterion.passed).map((criterion) => criterion.success);
  const feedback = criteria.filter((criterion) => !criterion.passed).map((criterion) => criterion.fail);
  const passedCriteria = strengths.length;
  const totalCriteria = criteria.length;
  const score = Math.round((passedCriteria / totalCriteria) * 100);

  return {
    score,
    passed: passedCriteria >= 3,
    passedCriteria,
    totalCriteria,
    strengths,
    feedback,
  };
}

export function buildLessonNarrationScript(
  currentLessonPage: TrainingPresentationSlide | null,
  presentation: TrainingPresentation | null,
) {
  if (currentLessonPage) {
    const bulletNarration = currentLessonPage.bullets.slice(0, 3).join(" ");
    return `${currentLessonPage.title}. ${currentLessonPage.narrative} ${bulletNarration}`.trim();
  }

  return presentation?.heroSummary ?? "Narration becomes available when a lesson page is active.";
}

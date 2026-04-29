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

const BEHAVIOR_SIGNAL_PATTERNS = [
  /(acknowledge|confirm|ask|document|coach|restate|clarify|de-?escalate|follow up|commit|close|open|validate|rephrase|paraphrase|repeat back|mirror|summari[sz]e|listen back|play back|reflect back)/,
  /(empath(y|ize|etic)|reassure|apologize|ownership|own the issue|take ownership|calm|stabilize|recover|recovery|set expectations|reset expectations|close the loop|walk through the next step|guide them through)/,
  /(verify|verification|authenticate|accuracy|accurate|handoff|next step|transfer|workflow|process|compliance|qa|quality|scorecard|audit|review the case|complete the note|log the note|capture the note)/,
  /(trend|metric|kpi|root cause|signal|dashboard|performance|calibration|review cadence|improvement plan|coach(?:ing)? follow-?through|one-on-one|1:1|performance plan|action plan|observe the call|side-by-side)/,
  /(recognition|gamification|motivation|engagement|remote|work from home|pulse check|collaboration|fairness|celebrate wins|recognize success|shout.?out|check in with the team|team huddle)/,
];

const EVIDENCE_SIGNAL_PATTERNS = [
  /(listen|hear|see|verify|observe|monitor|check|review|audit|measure|score|track|document|record|confirmation|confirmed|correct|understand|understanding|visible|shown|logged)/,
  /(qa note|qa score|scorecard|dashboard|metric|trend|proof point|evidence|handoff note|case note|follow-up note|ticket|documentation|crm note|account note|wrap note|coaching note|recognition log|pulse-check result)/,
  /have (them|the customer|the member|the patient) confirm/,
  /(customer confirms|customer confirmation|patient confirms|member confirms|next step is documented|coach can verify|manager can review|the note shows|the record shows|the dashboard shows|the score improves)/,
];

const TIMING_SIGNAL_PATTERNS = [
  /(next|before|after|then|within|follow-up|follow up|step|commitment|again|during|tomorrow|today|this call|next call|next interaction|going forward|i will|will|plan to|each time|every time|at the end|right away|immediately)/,
  /(at the close|before closing|during verification|during the handoff|on the next review|in the next coaching review|after the call|before the transfer|during the huddle|in the next one-on-one|at wrap-up|before the case is closed)/,
];

const CONTEXT_SIGNAL_PATTERNS = [
  /(customer concern|customer concerns|member concern|patient concern|concern|concerns|information|understanding|service recovery|expectation|question|issue|call reason)/,
  /(workflow|verification|documentation|handoff|qa finding|quality finding|case note|process step|escalation|transfer|account|record|ticket|follow-up)/,
  /(kpi|metric|trend|dashboard|root cause|scorecard|performance gap|coaching cadence|calibration|review|1:1|one-on-one|performance conversation)/,
  /(recognition|engagement|remote team|work from home|motivation|collaboration|fairness|pulse check|team huddle|employee win|morale)/,
];

function matchesAny(patterns: RegExp[], note: string) {
  return patterns.some((pattern) => pattern.test(note));
}

export function evaluateCoachCheckpointResponse(note: string): CoachCheckpointEvaluation {
  const normalizedNote = note.trim().toLowerCase();
  const wordCount = normalizedNote.length > 0 ? normalizedNote.split(/\s+/).filter(Boolean).length : 0;
  const hasBehaviorSignal = matchesAny(BEHAVIOR_SIGNAL_PATTERNS, normalizedNote);
  const hasEvidenceSignal = matchesAny(EVIDENCE_SIGNAL_PATTERNS, normalizedNote);
  const hasTimingSignal = matchesAny(TIMING_SIGNAL_PATTERNS, normalizedNote);
  const hasContextSignal = matchesAny(CONTEXT_SIGNAL_PATTERNS, normalizedNote);

  const criteria = [
    {
      passed: wordCount >= 8 || (wordCount >= 6 && hasBehaviorSignal && hasContextSignal),
      success: "The response includes enough context for a coach to assess the behavior in a real work situation.",
      fail: "Add a little more detail so the coach can understand the full follow-up behavior in context.",
    },
    {
      passed: hasEvidenceSignal,
      success: "The response names observable evidence a coach, reviewer, or manager can verify.",
      fail: "Name what the coach should hear, see, review, document, or verify in the live interaction or follow-up record.",
    },
    {
      passed: hasBehaviorSignal,
      success: "The response identifies a concrete coached behavior instead of only a general intention.",
      fail: "Describe the exact behavior the learner should demonstrate, such as rephrasing, verifying, documenting, calming, coaching, reviewing, or recognizing.",
    },
    {
      passed: hasTimingSignal,
      success: "The response explains when the behavior should happen in the workflow or review cycle.",
      fail: "Explain when the behavior should happen, such as in the next call, during verification, before closing, or in the next review.",
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

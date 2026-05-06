import type { TrainingDeckVisual, TrainingPresentation, TrainingPresentationSlide } from "./trainingContent";

export type TrainingGalleryVisual = {
  id: string;
  title: string;
  caption: string;
  pageLabel: string;
  sourceDeck: string;
  imageUrl?: string | null;
  narrative: string;
  bullets: string[];
  stageId: "deck" | "brief" | "practice" | "apply";
  stageLabel: string;
  visualType: "deck" | "generated";
};

export function buildTrainingVisualGallery(presentation: TrainingPresentation): TrainingGalleryVisual[] {
  const deckVisuals: TrainingGalleryVisual[] = presentation.deckVisuals.map((visual) => ({
    ...visual,
    narrative: visual.caption,
    bullets: [],
    stageId: "deck",
    stageLabel: "Presentation",
    visualType: "deck",
  }));

  const generatedVisuals: TrainingGalleryVisual[] = [
    { stageId: "brief" as const, stageLabel: "Brief", slides: presentation.slides },
    { stageId: "practice" as const, stageLabel: "Practice", slides: presentation.practiceSlides },
    { stageId: "apply" as const, stageLabel: "Apply", slides: presentation.applySlides },
  ].flatMap(({ stageId, stageLabel, slides }) =>
    slides.map((slide, index) => ({
      id: `generated-${stageId}-${slide.id}`,
      title: slide.title,
      caption: slide.narrative,
      pageLabel: `${stageLabel} ${index + 1}`,
      sourceDeck: presentation.heroTitle,
      imageUrl: null,
      narrative: slide.narrative,
      bullets: slide.bullets.slice(0, 3),
      stageId,
      stageLabel,
      visualType: "generated",
    })),
  );

  const seenKeys = new Set<string>();

  return [...deckVisuals, ...generatedVisuals].filter((visual) => {
    const key = `${visual.stageId}:${visual.pageLabel}:${visual.title}`;
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  });
}

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

export function getSlideCanvasVisuals<T>(deckVisuals: T[], selectedIndex: number) {
  if (!deckVisuals.length) {
    return {
      activeIndex: 0,
      activeVisual: null as T | null,
      visuals: [] as T[],
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

export type SlideInteractionKind =
  | "click_to_reveal"
  | "multiple_choice"
  | "branching_scenario"
  | "short_answer"
  | "match_the_term"
  | "role_play"
  | "simulation"
  | "timed_challenge"
  | "drag_and_drop";

export type SlideInteractionChoice = {
  id: string;
  label: string;
  detail: string;
  correct?: boolean;
  matchKey?: string;
};

export type SlideInteractionCard = {
  id: string;
  title: string;
  detail: string;
};

export type SlideInteractionDefinition = {
  id: string;
  kind: SlideInteractionKind;
  title: string;
  prompt: string;
  instructions: string;
  passingPercent: number;
  hint: string;
  successMessage: string;
  retryMessage: string;
  sampleAnswer?: string;
  timeLimitSeconds?: number;
  revealCards?: SlideInteractionCard[];
  choices?: SlideInteractionChoice[];
  acceptedPhrases?: string[];
  orderedSteps?: string[];
};

export type SlideInteractionAttempt = {
  revealedCardIds?: string[];
  selectedChoiceId?: string;
  shortAnswer?: string;
  rolePlayAnswer?: string;
  matchedPairs?: Record<string, string>;
  orderedSteps?: string[];
  elapsedSeconds?: number;
};

export type SlideInteractionEvaluation = {
  score: number;
  passed: boolean;
  passedCriteria: number;
  totalCriteria: number;
  hints: string[];
  strengths: string[];
};

const INTERACTION_ROTATION: SlideInteractionKind[] = [
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function phraseCoverage(note: string, acceptedPhrases: string[]) {
  const noteTokens = new Set(tokenizeText(note));
  const acceptedTokenSets = acceptedPhrases
    .map((phrase) => tokenizeText(phrase))
    .filter((tokens) => tokens.length > 0);

  if (!acceptedTokenSets.length) {
    return 0;
  }

  return acceptedTokenSets.reduce((bestCoverage, tokens) => {
    const matchedTokenCount = tokens.filter((token) => noteTokens.has(token)).length;
    return Math.max(bestCoverage, matchedTokenCount / tokens.length);
  }, 0);
}

function buildAcceptedPhrases(slide: TrainingPresentationSlide, skillFocus: string) {
  return [
    slide.title,
    slide.narrative,
    ...slide.bullets,
    skillFocus,
    `apply ${skillFocus.toLowerCase()} on the next interaction`,
    `show ${skillFocus.toLowerCase()} in the next workflow moment`,
  ];
}

function getSlideSeed(slide: TrainingPresentationSlide) {
  const firstBullet = slide.bullets[0] ?? slide.title;
  const secondBullet = slide.bullets[1] ?? slide.narrative;
  const thirdBullet = slide.bullets[2] ?? slide.narrative;

  return {
    firstBullet,
    secondBullet,
    thirdBullet,
  };
}

export function buildSlideInteraction(
  slide: TrainingPresentationSlide | null,
  skillFocus: string,
  pageIndex: number,
): SlideInteractionDefinition | null {
  if (!slide) {
    return null;
  }

  const kind = INTERACTION_ROTATION[pageIndex % INTERACTION_ROTATION.length] ?? "multiple_choice";
  const { firstBullet, secondBullet, thirdBullet } = getSlideSeed(slide);
  const acceptedPhrases = buildAcceptedPhrases(slide, skillFocus);
  const baseDefinition = {
    id: `${slide.id}-interaction`,
    passingPercent: 75,
    hint: `Return to the lesson and focus on the clearest behavior cue behind ${slide.title.toLowerCase()}.`,
    successMessage: `Great work. You showed enough mastery of ${slide.title.toLowerCase()} to unlock the next guided moment.`,
    retryMessage: `Not passed yet. Review the slide cues, use the hint, and try the interaction again.`,
  };

  switch (kind) {
    case "click_to_reveal":
      return {
        ...baseDefinition,
        kind,
        title: "Tap-to-reveal mission",
        prompt: `Reveal the key lesson cues behind ${slide.title.toLowerCase()}.`,
        instructions: "Open each reveal card, then use what you learned to continue through the module.",
        revealCards: [
          { id: `${slide.id}-reveal-1`, title: "Behavior cue", detail: firstBullet },
          { id: `${slide.id}-reveal-2`, title: "Why it matters", detail: secondBullet },
          { id: `${slide.id}-reveal-3`, title: "Field proof", detail: thirdBullet },
        ],
      };
    case "multiple_choice":
      return {
        ...baseDefinition,
        kind,
        title: "Choose the strongest move",
        prompt: `Which choice best reflects the intended learner move for ${slide.title.toLowerCase()}?`,
        instructions: "Pick the strongest CHCG-aligned behavior before continuing.",
        choices: [
          { id: `${slide.id}-mc-a`, label: firstBullet, detail: "This aligns to the lesson behavior made explicit on the slide.", correct: true },
          { id: `${slide.id}-mc-b`, label: secondBullet, detail: "This is related but not the clearest primary move for this page." },
          { id: `${slide.id}-mc-c`, label: `Move quickly without making ${skillFocus.toLowerCase()} visible.`, detail: "This skips the observable behavior standard expected in the lesson." },
        ],
      };
    case "branching_scenario":
      return {
        ...baseDefinition,
        kind,
        title: "Branch the next move",
        prompt: `In a live scenario, which branch should the learner choose next?`,
        instructions: "Select the branch that protects the customer experience and keeps the behavior observable.",
        choices: [
          { id: `${slide.id}-branch-a`, label: `Use ${firstBullet.toLowerCase()} and guide the next step.`, detail: "This branch keeps the lesson behavior visible in live work.", correct: true },
          { id: `${slide.id}-branch-b`, label: `Acknowledge the issue but skip the proof point.`, detail: "This branch sounds supportive but leaves the coach without observable evidence." },
          { id: `${slide.id}-branch-c`, label: "End the interaction quickly and hope the problem settles down.", detail: "This branch removes ownership and transfer evidence." },
        ],
      };
    case "short_answer":
      return {
        ...baseDefinition,
        kind,
        title: "Type the learner move",
        prompt: `In one or two sentences, describe how the learner should apply ${slide.title.toLowerCase()} next.`,
        instructions: "Use simple but specific wording. The answer should describe a real behavior, not only a vague intention.",
        acceptedPhrases,
        sampleAnswer: `I will ${firstBullet.charAt(0).toLowerCase()}${firstBullet.slice(1)} on the next interaction and make the result observable.`,
      };
    case "match_the_term":
      return {
        ...baseDefinition,
        kind,
        title: "Match the training signal",
        prompt: "Match each training cue to the correct meaning.",
        instructions: "Pair the cue, proof, and timing concepts correctly to unlock the next slide.",
        choices: [
          { id: `${slide.id}-match-cue`, label: "Behavior cue", detail: firstBullet, matchKey: "cue", correct: true },
          { id: `${slide.id}-match-proof`, label: "Proof point", detail: secondBullet, matchKey: "proof", correct: true },
          { id: `${slide.id}-match-timing`, label: "Timing cue", detail: thirdBullet, matchKey: "timing", correct: true },
        ],
      };
    case "role_play":
      return {
        ...baseDefinition,
        kind,
        title: "Role-play response",
        prompt: `Write what the learner should say or do in the role-play moment for ${slide.title.toLowerCase()}.`,
        instructions: "Respond as if you are in the live interaction. Include the behavior and what happens next.",
        acceptedPhrases: [...acceptedPhrases, `next step`, `confirm understanding`, `document the outcome`],
        sampleAnswer: `I will use ${firstBullet.toLowerCase()} in the next interaction, confirm understanding, and document the next step.`,
      };
    case "simulation":
      return {
        ...baseDefinition,
        kind,
        title: "Micro-simulation decision",
        prompt: "Choose the action that would keep the simulation on track.",
        instructions: "Think like you are already in production work and pick the move a coach would reinforce.",
        choices: [
          { id: `${slide.id}-sim-a`, label: `Demonstrate ${firstBullet.toLowerCase()} and make the outcome visible.`, detail: "This is the strongest operational move.", correct: true },
          { id: `${slide.id}-sim-b`, label: `Delay the proof until after the interaction is over.`, detail: "This weakens transfer and makes the behavior hard to verify." },
          { id: `${slide.id}-sim-c`, label: "Use generic reassurance without a clear action signal.", detail: "This lowers clarity and CHCG evidence quality." },
        ],
      };
    case "timed_challenge":
      return {
        ...baseDefinition,
        kind,
        title: "Timed accuracy sprint",
        prompt: `Pick the strongest response within the time limit.`,
        instructions: "You need both the correct answer and a timely response to pass this slide interaction.",
        timeLimitSeconds: 20,
        choices: [
          { id: `${slide.id}-time-a`, label: firstBullet, detail: "This is the fastest accurate move because it stays aligned to the lesson.", correct: true },
          { id: `${slide.id}-time-b`, label: secondBullet, detail: "This may be related, but it is not the strongest immediate move." },
          { id: `${slide.id}-time-c`, label: "Rush ahead without verifying the learner behavior.", detail: "This sacrifices quality for speed." },
        ],
      };
    case "drag_and_drop":
      return {
        ...baseDefinition,
        kind,
        title: "Drag the sequence into order",
        prompt: "Put the learner moves in the right order before continuing.",
        instructions: "Reorder the behavior sequence so it reflects the intended CHCG flow on this slide.",
        orderedSteps: [firstBullet, secondBullet, thirdBullet],
      };
    default:
      return null;
  }
}

export function evaluateSlideInteraction(
  definition: SlideInteractionDefinition | null,
  attempt: SlideInteractionAttempt,
): SlideInteractionEvaluation {
  if (!definition) {
    return {
      score: 0,
      passed: false,
      passedCriteria: 0,
      totalCriteria: 1,
      hints: ["Load a lesson page before attempting to grade the interaction."],
      strengths: [],
    };
  }

  let score = 0;
  const strengths: string[] = [];
  const hints: string[] = [];

  if (definition.kind === "click_to_reveal") {
    const totalCards = definition.revealCards?.length ?? 0;
    const revealedCount = attempt.revealedCardIds?.length ?? 0;
    score = totalCards > 0 ? Math.round((revealedCount / totalCards) * 100) : 0;
    if (score >= definition.passingPercent) {
      strengths.push("You reviewed enough of the slide cues to continue with the behavior in mind.");
    } else {
      hints.push("Open each reveal card so you see the full behavior cue, proof point, and follow-through detail.");
    }
  }

  if (["multiple_choice", "branching_scenario", "simulation"].includes(definition.kind)) {
    const selectedChoice = definition.choices?.find((choice) => choice.id === attempt.selectedChoiceId) ?? null;
    score = selectedChoice?.correct ? 100 : 0;
    if (selectedChoice?.correct) {
      strengths.push("You chose the strongest learner move for this slide.");
    } else {
      hints.push("Choose the option that keeps the behavior observable instead of generic or rushed.");
    }
  }

  if (definition.kind === "timed_challenge") {
    const selectedChoice = definition.choices?.find((choice) => choice.id === attempt.selectedChoiceId) ?? null;
    const withinTimeLimit = (attempt.elapsedSeconds ?? Number.MAX_SAFE_INTEGER) <= (definition.timeLimitSeconds ?? 20);
    score = selectedChoice?.correct && withinTimeLimit ? 100 : selectedChoice?.correct ? 60 : 0;
    if (selectedChoice?.correct && withinTimeLimit) {
      strengths.push("You responded accurately within the sprint time window.");
    } else if (selectedChoice?.correct) {
      hints.push(`The answer is correct, but you need to complete it within ${definition.timeLimitSeconds ?? 20} seconds to pass.`);
    } else {
      hints.push("Choose the strongest behavior first, then work on speed.");
    }
  }

  if (["short_answer", "role_play"].includes(definition.kind)) {
    const responseText = definition.kind === "role_play" ? (attempt.rolePlayAnswer ?? "") : (attempt.shortAnswer ?? "");
    const phraseMatchScore = Math.round(phraseCoverage(responseText, definition.acceptedPhrases ?? []) * 100);
    const checkpointScore = evaluateCoachCheckpointResponse(responseText).score;
    score = Math.max(phraseMatchScore, checkpointScore);
    if (score >= definition.passingPercent) {
      strengths.push("Your typed response names a believable behavior, context, and follow-through standard.");
    } else {
      hints.push("Use clearer action language, evidence, and timing so the answer sounds like a real live-work behavior.");
    }
  }

  if (definition.kind === "match_the_term") {
    const expectedPairs = Object.fromEntries((definition.choices ?? []).map((choice) => [choice.matchKey ?? choice.id, choice.id]));
    const matchedEntries = Object.entries(expectedPairs);
    const correctMatches = matchedEntries.filter(([key, value]) => attempt.matchedPairs?.[key] === value).length;
    score = matchedEntries.length > 0 ? Math.round((correctMatches / matchedEntries.length) * 100) : 0;
    if (score >= definition.passingPercent) {
      strengths.push("You matched the cue, proof, and timing terms correctly.");
    } else {
      hints.push("Reconnect each term to its role in the slide: what the learner does, how it is proven, and when it happens.");
    }
  }

  if (definition.kind === "drag_and_drop") {
    const expectedOrder = definition.orderedSteps ?? [];
    const attemptedOrder = attempt.orderedSteps ?? [];
    const correctPositions = expectedOrder.filter((step, index) => attemptedOrder[index] === step).length;
    score = expectedOrder.length > 0 ? Math.round((correctPositions / expectedOrder.length) * 100) : 0;
    if (score >= definition.passingPercent) {
      strengths.push("You sequenced the learner behavior in the intended order.");
    } else {
      hints.push("Reorder the steps so the learner behavior flows from cue to action to proof.");
    }
  }

  const passed = score >= definition.passingPercent;

  if (passed) {
    hints.length = 0;
  } else if (!hints.length) {
    hints.push(definition.hint);
  }

  return {
    score,
    passed,
    passedCriteria: passed ? 1 : 0,
    totalCriteria: 1,
    hints,
    strengths,
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

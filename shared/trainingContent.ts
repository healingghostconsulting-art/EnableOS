import { slideDeckForModuleId, slidePageLabel } from "./slideManifest";

export type TrainingPresentationSlide = {
  id: string;
  eyebrow: string;
  title: string;
  narrative: string;
  bullets: string[];
  speakerNotes?: string[];
  visualTone: string;
};

export type TrainingDeckVisual = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  sourceDeck: string;
  pageLabel: string;
  /** When set, the lesson renders the live per-client KPI scorecard for this slide. */
  scorecardId?: string;
};

export type TrainingInsightDatum = {
  label: string;
  value: number;
  benchmark?: number;
};

export type TrainingInsightChart = {
  id: string;
  title: string;
  description: string;
  metricLabel: string;
  chartType?: "comparison" | "trend";
  insightNote?: string;
  data: TrainingInsightDatum[];
};

export type TrainingPresentationResource = {
  id: string;
  label: string;
  detail: string;
};

export type TrainingApplicationOption = {
  id: string;
  label: string;
  rationale: string;
};

export type TrainingApplicationQuestion = {
  id: string;
  prompt: string;
  type?: "multiple_choice" | "short_answer";
  options?: TrainingApplicationOption[];
  correctOptionId?: string;
  acceptedAnswers?: string[];
  placeholder?: string;
  successFeedback: string;
  failureFeedback: string;
};

export type TrainingApplicationActivity = {
  title: string;
  objective: string;
  instructions: string;
  passingScore: number;
  passMessage: string;
  failMessage: string;
  questions: TrainingApplicationQuestion[];
  style?: "checkpoint" | "kahoot";
  passingPercent?: number;
};

export type TrainingPresentation = {
  heroTitle: string;
  heroSummary: string;
  evidenceLabel: string;
  deckVisuals: TrainingDeckVisual[];
  insightCharts: TrainingInsightChart[];
  slides: TrainingPresentationSlide[];
  practiceSlides: TrainingPresentationSlide[];
  applySlides: TrainingPresentationSlide[];
  coachPrompts: string[];
  reflectionPrompts: string[];
  practiceScenario: {
    title: string;
    situation: string;
    learnerTask: string;
    successSignals: string[];
  };
  briefCheckpoint: TrainingApplicationActivity;
  practiceCheckpoint: TrainingApplicationActivity;
  applicationActivity: TrainingApplicationActivity;
  finalQuiz: TrainingApplicationActivity;
  resourceActions: TrainingPresentationResource[];
};

type ModuleLike = {
  id: string;
  title: string;
  format: string;
  durationMinutes: number;
  skillFocus: string;
};

function trimAssessmentPhrase(value: string) {
  return value
    .replace(/[.]/g, "")
    .split(/[,:;]/)[0]
    .trim();
}

function createMultipleChoiceQuestion(
  id: string,
  prompt: string,
  correctLabel: string,
  distractors: string[],
  successFeedback: string,
  failureFeedback: string,
): TrainingApplicationQuestion {
  const options = [correctLabel, ...distractors.slice(0, 2)];

  return {
    id,
    prompt,
    type: "multiple_choice",
    options: options.map((label, index) => ({
      id: `${id}-${String.fromCharCode(97 + index)}`,
      label,
      rationale: index === 0 ? "This choice reflects the mapped lesson behavior and instructional emphasis." : "This distractor sounds plausible but misses the intended lesson pattern or evidence standard.",
    })),
    correctOptionId: `${id}-a`,
    successFeedback,
    failureFeedback,
  };
}

function createShortAnswerQuestion(
  id: string,
  prompt: string,
  acceptedAnswers: string[],
  placeholder: string,
  successFeedback: string,
  failureFeedback: string,
): TrainingApplicationQuestion {
  return {
    id,
    prompt,
    type: "short_answer",
    acceptedAnswers: acceptedAnswers.map(trimAssessmentPhrase).filter(Boolean),
    placeholder,
    successFeedback,
    failureFeedback,
  };
}

function buildBriefCheckpoint(module: ModuleLike, presentation: Omit<TrainingPresentation, "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz">): TrainingApplicationActivity {
  const introSlide = presentation.slides[0];
  const followupSlide = presentation.slides[1] ?? introSlide;
  const primaryBehavior = trimAssessmentPhrase(introSlide?.bullets[0] ?? module.skillFocus);
  const supportingBehavior = trimAssessmentPhrase(introSlide?.bullets[1] ?? followupSlide?.title ?? module.skillFocus);

  return {
    title: `Checkpoint: ${introSlide?.title ?? "Lesson understanding"}`,
    objective: `Confirm the learner understands the opening behavior model for ${module.title}.`,
    instructions: "Pass both questions to unlock the rehearsal step. This replaces confidence-only progression with a graded lesson checkpoint.",
    passingScore: 2,
    passMessage: "Passed. You showed that the opening lesson content is understood well enough to move into guided rehearsal.",
    failMessage: "Not yet passed. Review the brief pages and retry until you can identify the core behavior and explain it clearly.",
    style: "checkpoint",
    questions: [
      createMultipleChoiceQuestion(
        `${module.id}-brief-q1`,
        `Which action best represents the opening lesson focus for ${module.skillFocus.toLowerCase()}?`,
        primaryBehavior,
        [
          trimAssessmentPhrase(followupSlide?.bullets[0] ?? `Rely on speed instead of ${module.skillFocus.toLowerCase()}`),
          `Move forward without making ${module.skillFocus.toLowerCase()} visible`,
        ],
        "Correct. That choice reflects the opening lesson behavior the learner is expected to recognize before moving on.",
        "That is not the strongest answer yet. The correct option directly matches the key behavior emphasized in the brief pages.",
      ),
      createShortAnswerQuestion(
        `${module.id}-brief-q2`,
        `In a short phrase, name one behavior or cue the learner must carry out from the opening lesson pages.`,
        [primaryBehavior, supportingBehavior, module.skillFocus],
        `Example: ${primaryBehavior}`,
        "Correct. Your answer names a behavior that is clearly reinforced in the opening lesson frames.",
        `Use one of the core lesson cues such as "${primaryBehavior}" or another phrase directly tied to ${module.skillFocus.toLowerCase()}.`,
      ),
    ],
  };
}

function buildPracticeCheckpoint(module: ModuleLike, presentation: Omit<TrainingPresentation, "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz">): TrainingApplicationActivity {
  const practiceSlide = presentation.practiceSlides[0] ?? presentation.slides[0];
  const scenarioSignal = trimAssessmentPhrase(presentation.practiceScenario.successSignals[0] ?? module.skillFocus);
  const scenarioTask = trimAssessmentPhrase(presentation.practiceScenario.learnerTask);

  return {
    title: `Checkpoint: ${presentation.practiceScenario.title}`,
    objective: `Verify the learner can interpret the practice scenario and identify what successful rehearsal should sound like for ${module.title}.`,
    instructions: "Pass both questions to unlock the live-work application step.",
    passingScore: 2,
    passMessage: "Passed. You identified the rehearsal pattern strongly enough to move into the gated application activity.",
    failMessage: "Not yet passed. Revisit the practice scenario and retry until your answers reflect the rehearsal pattern accurately.",
    style: "checkpoint",
    questions: [
      createMultipleChoiceQuestion(
        `${module.id}-practice-q1`,
        `Which success signal matters most in the guided rehearsal for ${module.skillFocus.toLowerCase()}?`,
        scenarioSignal,
        [
          trimAssessmentPhrase(practiceSlide?.bullets[0] ?? `Rely on speed over ${module.skillFocus.toLowerCase()}`),
          "Finish the step quickly without leaving a clear proof point",
        ],
        "Correct. That response matches the success signal the learner is expected to demonstrate during rehearsal.",
        "Not yet. The strongest answer aligns with the success signals shown in the scenario panel.",
      ),
      createShortAnswerQuestion(
        `${module.id}-practice-q2`,
        "What phrase or behavior should the learner demonstrate next in the rehearsal?",
        [scenarioSignal, scenarioTask, module.skillFocus],
        `Example: ${scenarioSignal}`,
        "Correct. Your answer reflects the coached behavior the learner is meant to rehearse before application.",
        `Anchor your answer in one of the practice signals, such as "${scenarioSignal}" or another phrase directly tied to the scenario task.`,
      ),
    ],
  };
}

function buildFinalQuiz(module: ModuleLike, presentation: Omit<TrainingPresentation, "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz">): TrainingApplicationActivity {
  const slideOne = presentation.slides[0];
  const slideTwo = presentation.slides[1] ?? slideOne;
  const practiceSlide = presentation.practiceSlides[0] ?? slideOne;
  const chart = presentation.insightCharts[0];
  const chartLabel = chart?.data[0]?.label ?? "Observable behavior";
  const firstApplicationQuestion = presentation.applicationActivity.questions[0];
  const secondApplicationQuestion = presentation.applicationActivity.questions[1] ?? firstApplicationQuestion;
  const firstApplicationCorrectLabel = firstApplicationQuestion?.options?.find((option) => option.id === firstApplicationQuestion.correctOptionId)?.label ?? trimAssessmentPhrase(slideOne?.bullets[0] ?? module.skillFocus);
  const secondApplicationCorrectLabel = secondApplicationQuestion?.options?.find((option) => option.id === secondApplicationQuestion.correctOptionId)?.label ?? trimAssessmentPhrase(slideTwo?.bullets[0] ?? module.skillFocus);
  const questions = [
    createMultipleChoiceQuestion(
      `${module.id}-final-q1`,
      `Which opening behavior anchors this module on ${module.skillFocus.toLowerCase()}?`,
      trimAssessmentPhrase(slideOne?.bullets[0] ?? module.skillFocus),
      [trimAssessmentPhrase(slideTwo?.bullets[0] ?? `Ignore ${module.skillFocus.toLowerCase()}`), "Advance without making the behavior observable"],
      "Correct. You identified the opening behavior that the module reinforces from the start.",
      "Not quite. Review the first lesson page and choose the behavior the module makes most visible.",
    ),
    createMultipleChoiceQuestion(
      `${module.id}-final-q2`,
      "Which lesson concept should transfer directly into rehearsal?",
      trimAssessmentPhrase(practiceSlide?.bullets[0] ?? presentation.practiceScenario.successSignals[0] ?? module.skillFocus),
      [trimAssessmentPhrase(slideTwo?.bullets[1] ?? "Rely on generic reassurance"), "Skip rehearsal and jump to completion"],
      "Correct. That concept is explicitly carried from the lesson pages into rehearsal.",
      "Not yet. The strongest answer comes directly from the practice sequence and success signals.",
    ),
    createMultipleChoiceQuestion(
      `${module.id}-final-q3`,
      `Which mapped evidence signal appears in this module's analytics view?`,
      chartLabel,
      ["Unverified optimism", "Completion without proof"],
      "Correct. That evidence signal appears in the lesson analytics and reinforces what the learner should improve.",
      "That answer does not match the mapped evidence signal shown in the lesson charts.",
    ),
    createMultipleChoiceQuestion(
      `${module.id}-final-q4`,
      firstApplicationQuestion?.prompt ?? `Which option best applies ${module.skillFocus.toLowerCase()} in live work?`,
      firstApplicationCorrectLabel,
      [
        firstApplicationQuestion?.options?.find((option) => option.id !== firstApplicationQuestion.correctOptionId)?.label ?? "Choose the faster but less clear response",
        firstApplicationQuestion?.options?.find((option) => option.id !== firstApplicationQuestion.correctOptionId && option.label !== (firstApplicationQuestion?.options?.find((candidate) => candidate.id !== firstApplicationQuestion.correctOptionId)?.label ?? ""))?.label ?? "Choose the response that weakens evidence",
      ],
      "Correct. You selected the work-ready answer already reinforced in the application checkpoint.",
      "Not yet. Revisit the application activity and choose the answer that makes the behavior visible, coachable, and audit-ready.",
    ),
    createMultipleChoiceQuestion(
      `${module.id}-final-q5`,
      "What proves the learner has truly transferred the module into work?",
      secondApplicationCorrectLabel,
      [presentation.resourceActions[0]?.detail ?? "Finish the module without evidence", "Mark the lesson complete without showing the behavior"],
      "Correct. That choice reflects the transfer standard the module expects before completion.",
      "Not quite. The correct answer ties the module to an observable next step or recordable proof point.",
    ),
  ];

  return {
    title: `Final Quiz: ${module.title}`,
    objective: `Complete the final quiz to prove retention of ${module.skillFocus.toLowerCase()} before the module can be completed.`,
    instructions: "Answer each question in sequence and score at least 80% to complete this module.",
    passingScore: Math.max(1, Math.ceil(questions.length * 0.8)),
    passingPercent: 80,
    passMessage: "Passed. You cleared the final quiz and proved the lesson knowledge strongly enough to complete the module.",
    failMessage: "Not yet passed. Review the lesson pages and retry until you reach the required 80% score.",
    style: "kahoot",
    questions,
  };
}

function buildGuidedCompanionSlides(
  slides: TrainingPresentation["slides"],
  stageLabel: "brief" | "practice" | "apply",
) {
  return slides.flatMap((slide, index) => {
    const companionSlide = {
      id: `${slide.id}-${stageLabel}-guided-${index + 1}`,
      eyebrow:
        stageLabel === "brief"
          ? "Narration focus"
          : stageLabel === "practice"
            ? "Coach cue"
            : "Transfer proof",
      title:
        stageLabel === "brief"
          ? `Explain why ${slide.title.toLowerCase()} matters`
          : stageLabel === "practice"
            ? `Rehearse ${slide.title.toLowerCase()} with feedback`
            : `Prove ${slide.title.toLowerCase()} in live work`,
      narrative:
        stageLabel === "brief"
          ? `${slide.narrative} This companion slide slows the lesson down so narration can reinforce the key decision, risk, and behavior expectation before the learner advances.`
          : stageLabel === "practice"
            ? `${slide.narrative} This guided practice companion adds a coaching lens so the learner can hear what should be reinforced, corrected, or repeated before the next checkpoint.`
            : `${slide.narrative} This transfer companion makes the work expectation explicit so the learner can connect the lesson to documentation, QA, and manager review after the quiz gate.`,
      bullets: [
        ...slide.bullets.slice(0, 2),
        stageLabel === "brief"
          ? "Pause narration here to summarize the behavior cue in plain operating language."
          : stageLabel === "practice"
            ? "Capture the phrase or action a coach should reinforce immediately after rehearsal."
            : "Name the exact evidence that should exist once the behavior is used in production work.",
      ],
      visualTone:
        stageLabel === "brief"
          ? "Narrated reinforcement"
          : stageLabel === "practice"
            ? "Coaching overlay"
            : "Transfer evidence",
    };

    const synthesisSlide = {
      id: `${slide.id}-${stageLabel}-synthesis-${index + 1}`,
      eyebrow:
        stageLabel === "brief"
          ? "Retention cue"
          : stageLabel === "practice"
            ? "Manager observation"
            : "Operational handoff",
      title:
        stageLabel === "brief"
          ? `Retain the signal behind ${slide.title.toLowerCase()}`
          : stageLabel === "practice"
            ? `Observe what success looks like after ${slide.title.toLowerCase()}`
            : `Close the loop after ${slide.title.toLowerCase()}`,
      narrative:
        stageLabel === "brief"
          ? `This synthesis slide converts ${slide.title.toLowerCase()} into a memory anchor the learner can repeat back, explain to a coach, and carry into the next quiz gate.`
          : stageLabel === "practice"
            ? `This synthesis slide frames ${slide.title.toLowerCase()} as an observed rehearsal moment so coaching feedback, peer review, and self-correction become easier to visualize.`
            : `This synthesis slide turns ${slide.title.toLowerCase()} into an operational proof point so the learner knows what should be documented, measured, and reinforced once the behavior is used live.`,
      bullets: [
        stageLabel === "brief"
          ? "State the lesson signal in one sentence a learner could repeat without the slide in front of them."
          : stageLabel === "practice"
            ? "Name the exact phrase, behavior, or pause a coach should listen for during rehearsal."
            : "Describe the proof, note, or metric that should exist once the behavior shows up in production work.",
        slide.bullets[0] ?? slide.title,
        slide.bullets[1] ?? slide.narrative,
      ],
      visualTone:
        stageLabel === "brief"
          ? "Retention framing"
          : stageLabel === "practice"
            ? "Observation framing"
            : "Proof framing",
    };

    const fieldNoteSlide = {
      id: `${slide.id}-${stageLabel}-field-${index + 1}`,
      eyebrow:
        stageLabel === "brief"
          ? "Field note"
          : stageLabel === "practice"
            ? "Coaching note"
            : "Evidence note",
      title:
        stageLabel === "brief"
          ? `Spot ${slide.title.toLowerCase()} in a live interaction`
          : stageLabel === "practice"
            ? `Coach ${slide.title.toLowerCase()} in the moment`
            : `Record ${slide.title.toLowerCase()} as proof`,
      narrative:
        stageLabel === "brief"
          ? `This field note slide translates ${slide.title.toLowerCase()} into a live-service example so the learner can hear how the narrated concept should sound once it leaves the slide deck and enters real work.`
          : stageLabel === "practice"
            ? `This coaching note slide slows ${slide.title.toLowerCase()} into a corrective moment so the learner can anticipate the feedback, phrasing, and reset cues a coach should use during rehearsal.`
            : `This evidence note slide turns ${slide.title.toLowerCase()} into a documentation and quality signal so the learner can picture what should be captured after the behavior appears in production work.`,
      bullets: [
        stageLabel === "brief"
          ? "Listen for the learner wording or behavior that proves the concept landed in a real conversation."
          : stageLabel === "practice"
            ? "Call out the exact intervention a coach should make if the learner skips or weakens the behavior."
            : "Identify the record, annotation, or metric that should confirm the behavior happened after the module.",
        slide.bullets[0] ?? slide.title,
        slide.bullets[2] ?? slide.narrative,
      ],
      visualTone:
        stageLabel === "brief"
          ? "Live signal framing"
          : stageLabel === "practice"
            ? "Corrective coaching framing"
            : "Audit-ready framing",
    };

    return [slide, companionSlide, synthesisSlide, fieldNoteSlide];
  });
}

function enrichPresentation(module: ModuleLike, presentation: Omit<TrainingPresentation, "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz">): TrainingPresentation {
  const normalizedApplicationQuestions = presentation.applicationActivity.questions.map((question) => ({
    ...question,
    type: question.type ?? "multiple_choice",
  }));

  const normalizedPresentation = {
    ...presentation,
    slides: buildGuidedCompanionSlides(presentation.slides, "brief"),
    practiceSlides: buildGuidedCompanionSlides(presentation.practiceSlides, "practice"),
    applySlides: buildGuidedCompanionSlides(presentation.applySlides, "apply"),
    applicationActivity: {
      ...presentation.applicationActivity,
      style: presentation.applicationActivity.style ?? "checkpoint",
      questions: normalizedApplicationQuestions,
    },
  };

  return {
    ...normalizedPresentation,
    briefCheckpoint: buildBriefCheckpoint(module, normalizedPresentation),
    practiceCheckpoint: buildPracticeCheckpoint(module, normalizedPresentation),
    finalQuiz: buildFinalQuiz(module, normalizedPresentation),
  };
}

const trainingPresentationByModuleId: Record<string, Omit<TrainingPresentation, "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz">> = {
  "mod-sf-1": {
    heroTitle: "Active listening in high-friction interactions",
    heroSummary: "This lesson teaches the move that changes the whole interaction: hear the frustration clearly, name what matters, and guide the opening with calm control instead of rushing into an explanation.",
    evidenceLabel: "CHCG listening lesson built as a visible opening-call performance sequence",
    deckVisuals: [
      {
        id: "listen-visual-1",
        title: "Communication foundations overview",
        caption: "The original communication slide is shown directly in-platform so the learner can read the deck’s structure, layout, and instructional emphasis without leaving the course.",
        imageUrl: "/slides/softskills-08_fd8d5235.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 8",
      },
      {
        id: "listen-visual-2",
        title: "Communication skills deep dive",
        caption: "This slide’s icon-led capability board becomes a first-class lesson visual for active listening, articulation, empathy, and service readiness.",
        imageUrl: "/slides/softskills-14_e11945d2.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 14",
      },
      {
        id: "listen-visual-3",
        title: "Ask-probe-confirm reassurance model",
        caption: "A distinct service-behavior slide is now embedded beside the listening visuals so the learner can connect clarification, probing, and confirmation language to the opening call sequence without reusing the same empathy frame again.",
        imageUrl: "/slides/softskills-16_351b1cea.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 16",
      },
    ],
    insightCharts: [
      {
        id: "listen-chart-1",
        title: "Listening behavior adoption",
        description: "A visual view of how the lesson shifts the opening behavior from rushed explanation toward acknowledgment, ownership, and clear next-step control.",
        metricLabel: "% of monitored interactions",
        chartType: "comparison",
        insightNote: "Use this comparison to coach the three observable listening moves that should show up before process explanation begins.",
        data: [
          { label: "Acknowledge concern", value: 92, benchmark: 85 },
          { label: "Confirm ownership", value: 84, benchmark: 80 },
          { label: "State next step", value: 79, benchmark: 78 },
        ],
      },
      {
        id: "listen-chart-2",
        title: "Customer calm recovery curve",
        description: "The lesson emphasizes that emotional temperature drops when listening behavior happens before workflow explanation.",
        metricLabel: "Stability score",
        chartType: "trend",
        insightNote: "The slope should rise as empathy and summary behavior become more explicit, giving the coach a simple recovery story to reinforce.",
        data: [
          { label: "Opening", value: 38, benchmark: 45 },
          { label: "After empathy", value: 64, benchmark: 60 },
          { label: "After summary", value: 86, benchmark: 80 },
        ],
      },
    ],
    slides: [
      {
        id: "listen-signal",
        eyebrow: "Behavior signal",
        title: "What the customer hears in the first 30 seconds",
        narrative: "Strong listening sounds controlled, not passive. The agent slows the opening just enough to prove they understand the concern, own the next move, and keep the conversation from scattering.",
        bullets: [
          "Name the concern before offering any explanation so the customer knows you actually heard it.",
          "Confirm ownership in plain language instead of hiding behind policy or process words.",
          "Give one clean next step so the opening feels guided rather than improvised.",
        ],
        speakerNotes: [
          "Coach the learner to hear this as an opening-control lesson, not a courtesy lesson. Listening is the move that organizes the rest of the call.",
          "If the first response sounds rushed, generic, or overloaded with detail, the customer usually hears defensiveness instead of ownership.",
        ],
        visualTone: "Opening control",
      },
      {
        id: "listen-breakdown",
        eyebrow: "CHCG method",
        title: "Read the feeling, the problem, then the next move",
        narrative: "The CHCG listening pattern becomes easier to execute when the learner separates three jobs: recognize the emotional signal, isolate the operational issue, and hand back a guided next step in the customer’s language.",
        bullets: [
          "Hear: identify what the customer is feeling before you solve what is operationally wrong.",
          "Hold: resist the urge to reassure too early when the facts are still unstable.",
          "Hand back: summarize the issue in the customer’s words, then guide the next verified action.",
        ],
        speakerNotes: [
          "This page should sound like a coach translating instinct into an observable sequence. The learner is not guessing what good listening looks like anymore.",
          "Emphasize that the hand-back moment is what makes the customer feel understood and what makes the call auditable later.",
        ],
        visualTone: "Behavior sequence",
      },
      {
        id: "listen-risk",
        eyebrow: "Coaching lens",
        title: "Three ways a good opening gets lost",
        narrative: "Listening usually breaks down in predictable ways: the agent explains too soon, tries to reassure before understanding the issue, or closes the gap with too much information and not enough structure.",
        bullets: [
          "If you explain before you acknowledge, the customer hears speed instead of attention.",
          "If you reassure before you verify, the customer hears comfort without credibility.",
          "If you close without a recap, the customer leaves without a sentence they can repeat back.",
        ],
        speakerNotes: [
          "Use this slide to normalize the miss. Most learners are not failing because they do not care; they are failing because they speed up at the exact moment they need to slow down.",
          "Ask the learner which of the three breakdowns shows up most often in their own monitored calls.",
        ],
        visualTone: "Risk diagnosis",
      },
      {
        id: "listen-deck-bridge",
        eyebrow: "PowerPoint bridge",
        title: "Turn the deck into a repeatable opening pattern",
        narrative: "This lesson page keeps the source presentation visible but translates it into a practical opening pattern the learner can actually carry into the next live interaction.",
        bullets: [
          "Start with acknowledgment before explanation.",
          "Reflect the concern back in language the customer would recognize as their own.",
          "Move into the verified next step only after ownership sounds clear and believable.",
        ],
        speakerNotes: [
          "This is the bridge between deck language and live behavior. The learner should leave with a pattern they can rehearse, not just a concept they agree with.",
        ],
        visualTone: "Deck translation",
      },
    ],
    practiceSlides: [
      {
        id: "listen-practice-1",
        eyebrow: "Scenario walkthrough",
        title: "Read the moment before you answer it",
        narrative: "The first customer sentence usually contains two signals at once: what the person is feeling and what has gone wrong in the workflow. Strong listeners separate those signals before they speak.",
        bullets: [
          "Emotional signal: the customer feels like they are repeating themselves again.",
          "Operational signal: no clear owner has taken the issue forward.",
          "Coaching move: answer the feeling first, then establish ownership and direction.",
        ],
        speakerNotes: [
          "Invite the learner to pause long enough to name both signals. That pause is what keeps the response from sounding generic.",
        ],
        visualTone: "Scenario decode",
      },
      {
        id: "listen-practice-2",
        eyebrow: "Modeled response",
        title: "A strong opening sounds calm, specific, and fully owned",
        narrative: "This modeled opening shows the difference between being polite and being in command. The language is steady, personal, and clear about what happens next.",
        bullets: [
          "I can hear why this has become frustrating, and I’m going to take ownership of what happens next.",
          "Let me confirm exactly where this broke down so I move it forward the right way.",
          "Before we end, I’ll give you the clearest next step and who owns it from here.",
        ],
        speakerNotes: [
          "Tell the learner to borrow the shape of this response, not necessarily the exact words. The goal is believable ownership, not memorized phrasing.",
        ],
        visualTone: "Modeled language",
      },
    ],
    applySlides: [
      {
        id: "listen-apply-1",
        eyebrow: "Application checkpoint",
        title: "Choose the response that proves listening before problem-solving",
        narrative: "The learner now has to apply the slide content. Advancement should depend on choosing language that reflects acknowledgement, ownership, and a controlled next step.",
        bullets: [
          "A correct response validates the concern before explaining policy.",
          "A correct response signals ownership without overpromising.",
          "A correct response makes the next step concrete.",
        ],
        visualTone: "Assessment frame",
      },
    ],
    coachPrompts: [
      "At what exact sentence did the customer finally hear that someone had the conversation under control?",
      "Which phrase sounded most believable because it combined empathy with ownership instead of script language?",
      "Where did the learner start explaining before they had fully earned the right to explain?",
    ],
    reflectionPrompts: [
      "What opening sentence will you test on your next high-friction call?",
      "How will you show ownership in a way that still sounds natural for you?",
      "What recap line will you use so the customer can repeat the next step back confidently?",
    ],
    practiceScenario: {
      title: "Escalated service recovery call",
      situation: "A customer begins the call frustrated because they have already explained the issue twice and believe no one owns the problem.",
      learnerTask: "Respond with an opening that shows control, empathy, and a clear path forward in fewer than three sentences.",
      successSignals: [
        "The concern is restated accurately.",
        "The next action is concrete and time-bound.",
        "The tone is calm without sounding robotic.",
      ],
    },
    applicationActivity: {
      title: "Application check: listening under pressure",
      objective: "Demonstrate that you can choose the response pattern that reflects the presentation’s listening model in a live customer moment.",
      instructions: "Answer both questions correctly to pass this checkpoint and unlock the reflection step.",
      passingScore: 2,
      passMessage: "Passed. You selected response language that reflects acknowledgment, ownership, and a clear next step.",
      failMessage: "Not yet passed. Review the lesson frames, then retry until your choices consistently reflect CHCG listening behaviors.",
      questions: [
        {
          id: "listen-q1",
          prompt: "Which opening best shows strong listening in the first 30 seconds?",
          options: [
            {
              id: "listen-q1-a",
              label: "Explain the policy immediately so the customer hears the rules first.",
              rationale: "This skips acknowledgement and usually increases friction.",
            },
            {
              id: "listen-q1-b",
              label: "Acknowledge the frustration, confirm ownership, and define the next verified action.",
              rationale: "This follows the lesson model of empathy, ownership, and controlled action.",
            },
            {
              id: "listen-q1-c",
              label: "Promise the outcome will be fixed today before checking the workflow.",
              rationale: "This creates promise risk before the facts are stable.",
            },
          ],
          correctOptionId: "listen-q1-b",
          successFeedback: "Correct. The strongest response validates the concern and keeps the interaction structured.",
          failureFeedback: "This option misses the lesson pattern. The correct response acknowledges emotion before moving into the next verified step.",
        },
        {
          id: "listen-q2",
          prompt: "What is the clearest sign that the learner is applying the CHCG listening model?",
          options: [
            {
              id: "listen-q2-a",
              label: "They stack multiple explanations so the customer hears every detail at once.",
              rationale: "Overexplaining early is one of the risk patterns the lesson warns against.",
            },
            {
              id: "listen-q2-b",
              label: "They summarize the concern in the customer’s language and redirect to the verified action.",
              rationale: "This reflects the Hand back move in the model.",
            },
            {
              id: "listen-q2-c",
              label: "They close the call quickly once the tone becomes calmer.",
              rationale: "This ends the interaction before the next-step summary is secure.",
            },
          ],
          correctOptionId: "listen-q2-b",
          successFeedback: "Correct. The summary-plus-next-action move proves the learner understood and retained control.",
          failureFeedback: "Not quite. The model requires a clear summary in the customer’s language before redirecting to the verified next step.",
        },
      ],
    },
    resourceActions: [
      { id: "listen-resource-1", label: "Manager observation lens", detail: "Listen for acknowledgment, ownership, and summary language in that order." },
      { id: "listen-resource-2", label: "Learner self-check", detail: "Highlight the sentence where you shifted from empathy to action." },
      { id: "listen-resource-3", label: "Documentation handoff", detail: "Capture one quote that proves the customer heard a clear next step." },
    ],
  },
  "mod-sf-2": {
    heroTitle: "Confident reassurance without overpromising",
    heroSummary: "This module teaches the difference between sounding reassuring and actually building trust: stay steady, stay specific, and make the next step feel real without promising what the workflow cannot yet prove.",
    evidenceLabel: "CHCG reassurance lesson translated into trust-safe language patterns and follow-through cues",
    deckVisuals: [
      {
        id: "reassure-visual-1",
        title: "Empathy foundations",
        caption: "The empathy overview slide is preserved as a direct lesson visual so the learner sees the original quadrant framing for understanding needs, anticipating emotion, personalizing the response, and staying professional.",
        imageUrl: "/slides/softskills-09_815688d7.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 9",
      },
      {
        id: "reassure-visual-2",
        title: "Empathy script rewrite activity",
        caption: "The rewrite activity is embedded as a visual board to show how frustration cues become empathetic language and personalized response patterns.",
        imageUrl: "/slides/softskills-27_c4f51069.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 27",
      },
      {
        id: "reassure-visual-3",
        title: "Escalation curve for reassurance moments",
        caption: "This extra presentation frame gives the reassurance module a distinct de-escalation visual so learners can see how calm, frustration, upset, and anger states affect the response strategy when outcomes are still unresolved.",
        imageUrl: "/slides/softskills-31_e39fe3f8.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 31",
      },
    ],
    insightCharts: [
      {
        id: "reassure-chart-1",
        title: "Trust-safe reassurance mix",
        description: "The graph turns the deck’s language contrast into an in-platform signal of which reassurance moves build confidence without creating promise debt.",
        metricLabel: "% of reviewed calls",
        data: [
          { label: "Ownership phrase", value: 88, benchmark: 82 },
          { label: "Verified next step", value: 81, benchmark: 78 },
          { label: "Outcome overpromise", value: 19, benchmark: 10 },
        ],
      },
      {
        id: "reassure-chart-2",
        title: "Confidence versus promise risk",
        description: "This view makes visible the lesson’s core tension: sounding stronger should not require sounding more certain than the workflow supports.",
        metricLabel: "Score",
        data: [
          { label: "High-risk wording", value: 32, benchmark: 18 },
          { label: "Process-based clarity", value: 84, benchmark: 80 },
          { label: "Auditable close", value: 76, benchmark: 72 },
        ],
      },
    ],
    slides: [
      {
        id: "reassure-patterns",
        eyebrow: "Language pattern",
        title: "Reassurance should sound steady, not inflated",
        narrative: "The strongest reassurance does not chase comfort with vague promises. It communicates presence, ownership, and a believable next move so the customer feels guided instead of placated.",
        bullets: [
          "Be certain about your follow-through, not certain about an outcome you have not verified.",
          "Anchor reassurance to the process you can see, not to hope, speed, or guesswork.",
          "Separate what is known now from what you are doing next so trust has something concrete to sit on.",
        ],
        speakerNotes: [
          "Frame reassurance as disciplined language. The learner is not trying to sound warmer than the situation; they are trying to sound reliable inside it.",
          "If a sentence cannot survive QA review later, it is probably too vague or too absolute to use here.",
        ],
        visualTone: "Trust-safe language",
      },
      {
        id: "reassure-do-dont",
        eyebrow: "Do / do not",
        title: "What strong reassurance says and what risky reassurance hides",
        narrative: "This contrast page lets the learner hear the real difference between language that builds confidence and language that quietly creates promise debt.",
        bullets: [
          "Say: I’m staying with this, and I’ll walk you through the next confirmed step.",
          "Avoid: Don’t worry, this will definitely be fixed today.",
          "Say: Here is what I can confirm right now, what I’m doing next, and when you’ll hear from us again.",
        ],
        speakerNotes: [
          "Read these aloud like two different personalities: one grounded and accountable, one casually overconfident. The learner should hear the risk immediately.",
        ],
        visualTone: "Contrast board",
      },
      {
        id: "reassure-escalation",
        eyebrow: "Workflow transfer",
        title: "As complexity rises, reassurance must become clearer",
        narrative: "When a case escalates, the agent should become more transparent, not more optimistic. Confidence grows when ownership points, timing, and handoffs become easier to follow.",
        bullets: [
          "Increase specificity as uncertainty increases.",
          "Explain cross-team ownership without blaming the system or another team.",
          "Close with a next step that a coach or manager could verify later.",
        ],
        speakerNotes: [
          "This is where learners often overcompensate. They try to sound more confident by sounding more certain, when what the customer really needs is more clarity.",
        ],
        visualTone: "Escalation logic",
      },
      {
        id: "reassure-deck-bridge",
        eyebrow: "PowerPoint bridge",
        title: "Use the empathy deck to make reassurance sound human and credible",
        narrative: "This bridge page keeps the source presentation visible while turning it into a practical rule: reassurance should sound personal, specific, and professional all at once.",
        bullets: [
          "Use language that feels steady without sounding absolute.",
          "Tie reassurance to what has been verified and what will happen next.",
          "Personalize the response so trust rises without creating promise debt.",
        ],
        speakerNotes: [
          "The learner should hear that personalization is not extra polish here; it is what makes the reassurance feel written for this person and this moment.",
        ],
        visualTone: "Deck translation",
      },
    ],
    practiceSlides: [
      {
        id: "reassure-practice-1",
        eyebrow: "Scenario decode",
        title: "Spot the hidden promise risk before you answer",
        narrative: "This practice moment helps the learner notice the trap: when anxiety rises, the urge to overpromise rises with it. The real skill is staying calm without borrowing certainty you do not have.",
        bullets: [
          "Customer anxiety tempts the agent to sound more certain than the workflow allows.",
          "The stronger move is confidence about ownership, not confidence about an unverified outcome.",
          "Trust rises when the next action is specific enough to document later.",
        ],
        speakerNotes: [
          "Encourage the learner to listen for their own overpromising habit words: definitely, right away, no problem, for sure. Those are often where risk starts.",
        ],
        visualTone: "Risk decode",
      },
      {
        id: "reassure-practice-2",
        eyebrow: "Response builder",
        title: "Build reassurance from what is verified right now",
        narrative: "This response-builder page gives the learner a safer confidence pattern they can adapt in real calls without sounding scripted or overly polished.",
        bullets: [
          "State what is confirmed right now.",
          "State what you are doing next.",
          "State when the customer will hear from you again.",
        ],
        speakerNotes: [
          "The learner does not need a longer answer here. They need a cleaner one: verified fact, next move, follow-up timing.",
        ],
        visualTone: "Response builder",
      },
    ],
    applySlides: [
      {
        id: "reassure-apply-1",
        eyebrow: "Application checkpoint",
        title: "Pass the language-confidence gate",
        narrative: "The learner must now prove they can choose reassurance language that protects trust without creating promise debt.",
        bullets: [
          "Correct responses are specific and process-based.",
          "Incorrect responses sound comforting but overcommit the workflow.",
          "Advancement requires choosing trust-building accuracy over vague optimism.",
        ],
        visualTone: "Assessment frame",
      },
    ],
    coachPrompts: [
      "Which reassurance phrase felt strongest because it sounded owned and specific rather than generic?",
      "Where did the learner drift toward certainty the workflow had not earned yet?",
      "What would make this response feel more human without making it less accurate?",
    ],
    reflectionPrompts: [
      "Which phrase in your current wording creates promise risk without you meaning it to?",
      "What reassurance line will become your new default when the outcome is still unresolved?",
      "How will you document the next-step language so trust continues after the call ends?",
    ],
    practiceScenario: {
      title: "Delayed resolution with customer anxiety",
      situation: "The workflow requires follow-up from another team, but the customer wants a guaranteed fix before ending the interaction.",
      learnerTask: "Deliver reassurance that protects trust while staying within what can actually be confirmed today.",
      successSignals: [
        "The learner avoids false certainty.",
        "Ownership remains explicit.",
        "The next action is explained clearly enough for audit follow-up.",
      ],
    },
    applicationActivity: {
      title: "Application check: reassurance accuracy",
      objective: "Show that you can identify language that feels confident while still staying grounded in the real workflow.",
      instructions: "Answer both questions correctly to continue into reflection.",
      passingScore: 2,
      passMessage: "Passed. Your choices showed confidence without overpromising outcomes the workflow cannot guarantee.",
      failMessage: "Not yet passed. Revisit the contrast frames and retry until your language choices stay specific, transparent, and auditable.",
      questions: [
        {
          id: "reassure-q1",
          prompt: "Which reassurance statement best protects trust during uncertainty?",
          options: [
            {
              id: "reassure-q1-a",
              label: "This will definitely be fixed by the end of the day.",
              rationale: "This promises an outcome that may not be verified.",
            },
            {
              id: "reassure-q1-b",
              label: "I’m staying with this, and here is the next confirmed step I can walk you through right now.",
              rationale: "This signals ownership and process clarity without false certainty.",
            },
            {
              id: "reassure-q1-c",
              label: "Hopefully the other team gets back to us soon.",
              rationale: "This weakens confidence and leaves ownership unclear.",
            },
          ],
          correctOptionId: "reassure-q1-b",
          successFeedback: "Correct. The right answer is confident because it is specific about ownership and next action.",
          failureFeedback: "This does not reflect the lesson. Effective reassurance is anchored to what is verified and what happens next.",
        },
        {
          id: "reassure-q2",
          prompt: "What makes a reassurance response coachable and audit-ready?",
          options: [
            {
              id: "reassure-q2-a",
              label: "It gives the customer a process-based next step that can be documented later.",
              rationale: "This is the lesson’s transfer principle.",
            },
            {
              id: "reassure-q2-b",
              label: "It sounds highly optimistic even when the details are unresolved.",
              rationale: "Optimism without proof creates promise debt.",
            },
            {
              id: "reassure-q2-c",
              label: "It avoids specifics so the learner cannot be held to the language later.",
              rationale: "Avoiding specifics undermines trust and auditability.",
            },
          ],
          correctOptionId: "reassure-q2-a",
          successFeedback: "Correct. Audit-ready reassurance leaves a clear process trail and an observable next step.",
          failureFeedback: "Not quite. The lesson emphasizes reassurance that is specific enough to coach, document, and verify later.",
        },
      ],
    },
    resourceActions: [
      { id: "reassure-resource-1", label: "Phrase bank", detail: "Keep one approved ownership phrase and one escalation phrase visible during practice." },
      { id: "reassure-resource-2", label: "Audit tie-in", detail: "Map reassurance language to QA notes and escalation documentation." },
      { id: "reassure-resource-3", label: "Manager follow-up", detail: "Ask the coach to flag any promise-risk wording in the next monitored interaction." },
    ],
  },
  "mod-sf-3": {
    heroTitle: "De-escalation and professional recovery",
    heroSummary: "This module shows how recovery actually works in the moment: lower the heat, narrow the issue, make the process visible, and close with ownership that sounds deliberate instead of relieved.",
    evidenceLabel: "CHCG de-escalation lesson translated into a step-by-step recovery storyboard",
    deckVisuals: [
      {
        id: "deescalate-visual-1",
        title: "Why patients become upset",
        caption: "The original cause-analysis slide is embedded so the learner can study the recurring frustration drivers before rehearsing recovery language.",
        imageUrl: "/slides/softskills-30_0b757800.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 30",
      },
      {
        id: "deescalate-visual-2",
        title: "4-step de-escalation model",
        caption: "The platform now carries the full four-step recovery framework into the lesson instead of reducing it to a short summary card.",
        imageUrl: "/slides/softskills-32_55dd4a02.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 32",
      },
      {
        id: "deescalate-visual-3",
        title: "Professional presence during recovery",
        caption: "A third deck image is now surfaced in the recovery lesson so learners can connect de-escalation language with professional presence and brand representation inside the same module rather than seeing the same rewrite board twice.",
        imageUrl: "/slides/softskills-35_8c2ed919.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 35",
      },
    ],
    insightCharts: [
      {
        id: "deescalate-chart-1",
        title: "De-escalation recovery sequence",
        description: "The chart mirrors the slide logic by showing where emotional heat should fall as the learner acknowledges, clarifies, and owns the next step.",
        metricLabel: "Recovery score",
        data: [
          { label: "Stabilize", value: 71, benchmark: 68 },
          { label: "Clarify", value: 79, benchmark: 74 },
          { label: "Close", value: 87, benchmark: 82 },
        ],
      },
      {
        id: "deescalate-chart-2",
        title: "Primary frustration drivers",
        description: "This in-platform graph complements the cause-analysis slide by making the most common escalation triggers easy to compare without leaving the lesson.",
        metricLabel: "Escalation frequency",
        data: [
          { label: "Ownership gaps", value: 41, benchmark: 35 },
          { label: "Repeat contact", value: 37, benchmark: 30 },
          { label: "Unclear next step", value: 33, benchmark: 28 },
        ],
      },
    ],
    slides: [
      {
        id: "deescalate-open",
        eyebrow: "Scenario setup",
        title: "The first pivot from frustration to control",
        narrative: "De-escalation begins in the first few seconds after tension becomes visible. The goal is not to win the moment with perfect words; it is to lower the heat enough that the customer can follow you again.",
        bullets: [
          "Acknowledge the frustration directly instead of pretending it is not in the room.",
          "Use a short stabilizing phrase before you gather detail.",
          "Move from emotion to problem definition in one clean transition.",
        ],
        speakerNotes: [
          "Coach the learner to think of this as a pacing skill. If they speed up here, the recovery usually gets harder, not easier.",
        ],
        visualTone: "Recovery opening",
      },
      {
        id: "deescalate-middle",
        eyebrow: "Recovery path",
        title: "Build calm by making the process visible",
        narrative: "Customers often stay escalated when the path forward is invisible. This page teaches the learner to reduce uncertainty by narrating the process in plain, controlled language.",
        bullets: [
          "Clarify what has already happened.",
          "State what you are verifying now.",
          "Name what the customer should expect next and when.",
        ],
        speakerNotes: [
          "Emphasize legibility here. Calm rises when the customer can finally tell where they are in the recovery story.",
        ],
        visualTone: "Process visibility",
      },
      {
        id: "deescalate-close",
        eyebrow: "Close strong",
        title: "End the recovery with confidence, not relief",
        narrative: "A strong recovery close sounds deliberate, not exhausted. The learner should sound like they still own the interaction all the way through the last sentence.",
        bullets: [
          "Summarize the agreed action.",
          "Restate who owns the next move.",
          "Leave the customer with a sentence they can repeat back confidently.",
        ],
        speakerNotes: [
          "This is where a lot of otherwise solid recoveries weaken. The learner feels the tension drop and accidentally sounds finished instead of accountable.",
        ],
        visualTone: "Resolution close",
      },
      {
        id: "deescalate-deck-bridge",
        eyebrow: "PowerPoint bridge",
        title: "Turn the recovery deck into a repeatable call sequence",
        narrative: "This bridge page keeps the source presentation present while translating the four-step model into a usable live-call pattern the learner can rehearse before the next difficult interaction.",
        bullets: [
          "Stabilize the emotion before solving the workflow issue.",
          "Clarify the real blocker in simple language.",
          "Name the next step in a way the customer can repeat back.",
        ],
        speakerNotes: [
          "The learner should leave this page hearing a sequence they can carry, not just a framework they can describe.",
        ],
        visualTone: "Deck translation",
      },
    ],
    practiceSlides: [
      {
        id: "deescalate-practice-1",
        eyebrow: "Pressure test",
        title: "Read the moment where emotional heat can rise or fall",
        narrative: "This practice page helps the learner hear the pressure point clearly: fast facts alone rarely calm the moment. Recovery begins when the customer feels emotionally met before the process is explained.",
        bullets: [
          "Fast facts alone will not lower the temperature.",
          "A stabilizing phrase creates room for process clarity.",
          "Tone and structure matter as much as the content itself.",
        ],
        speakerNotes: [
          "Invite the learner to listen for whether their first sentence reduces heat or accidentally challenges the emotion in the room.",
        ],
        visualTone: "Pressure map",
      },
      {
        id: "deescalate-practice-2",
        eyebrow: "Recovery storyboard",
        title: "Turn the process into something the customer can follow",
        narrative: "The learner now rehearses the recovery as a simple, followable sequence rather than a vague attempt to sound calmer under pressure.",
        bullets: [
          "Name what happened.",
          "State what is being checked now.",
          "Close with the owned next move.",
        ],
        speakerNotes: [
          "The storyboard matters because it gives the customer a path to follow. Clarity is part of de-escalation, not something that comes after it.",
        ],
        visualTone: "Storyboard",
      },
    ],
    applySlides: [
      {
        id: "deescalate-apply-1",
        eyebrow: "Application checkpoint",
        title: "Prove you can keep recovery calm and legible",
        narrative: "The assessment asks the learner to choose recovery moves that reduce heat and increase clarity, mirroring the deck’s recovery storyboard.",
        bullets: [
          "Correct answers stabilize emotion before explanation.",
          "Correct answers make the process legible.",
          "Correct answers end with owned next steps.",
        ],
        visualTone: "Assessment frame",
      },
    ],
    coachPrompts: [
      "At what exact sentence did the learner begin lowering emotional heat instead of merely responding to it?",
      "How clearly did the learner make the recovery sequence visible to the customer?",
      "Did the close sound deliberate and accountable all the way through the final sentence?",
    ],
    reflectionPrompts: [
      "What stabilizing phrase feels natural enough for you to use under pressure?",
      "How will you make the process visible without flooding the customer with detail?",
      "What final ownership sentence will you use so the recovery still sounds strong at the end?",
    ],
    practiceScenario: {
      title: "Repeat-contact frustration",
      situation: "The customer says they have been transferred multiple times and no one has solved the issue correctly.",
      learnerTask: "Use a recovery opening, a process-visibility middle, and a confident close in a single interaction flow.",
      successSignals: [
        "The learner reduces emotional heat quickly.",
        "The process is understandable.",
        "The resolution close sounds owned and specific.",
      ],
    },
    applicationActivity: {
      title: "Application check: recovery logic",
      objective: "Demonstrate that you can choose the sequence that turns an escalated interaction into a controlled recovery flow.",
      instructions: "Choose the best answer for both questions to pass the checkpoint.",
      passingScore: 2,
      passMessage: "Passed. Your choices reflect the recovery sequence taught in the lesson storyboard.",
      failMessage: "Not yet passed. Review the recovery storyboard and retry until your responses reduce emotional heat while preserving clarity.",
      questions: [
        {
          id: "deescalate-q1",
          prompt: "What should the learner do first in an escalated recovery moment?",
          options: [
            {
              id: "deescalate-q1-a",
              label: "Jump straight into policy language so the customer hears rules quickly.",
              rationale: "This usually sounds dismissive and increases friction.",
            },
            {
              id: "deescalate-q1-b",
              label: "Acknowledge the frustration and use a stabilizing phrase before gathering detail.",
              rationale: "This is the correct recovery opening from the lesson.",
            },
            {
              id: "deescalate-q1-c",
              label: "Promise a resolution before verifying what happened.",
              rationale: "This creates risk and weakens recovery credibility.",
            },
          ],
          correctOptionId: "deescalate-q1-b",
          successFeedback: "Correct. Recovery begins by lowering emotional heat and establishing control.",
          failureFeedback: "This does not match the recovery storyboard. The learner must stabilize first, then move into process visibility.",
        },
        {
          id: "deescalate-q2",
          prompt: "Which response most clearly makes the process legible to the customer?",
          options: [
            {
              id: "deescalate-q2-a",
              label: "I need to look into this more, but I don’t have an update yet.",
              rationale: "This is vague and does not map the recovery path.",
            },
            {
              id: "deescalate-q2-b",
              label: "Here is what has happened, what I’m verifying now, and what you can expect next.",
              rationale: "This follows the lesson’s middle section exactly.",
            },
            {
              id: "deescalate-q2-c",
              label: "Let’s just wait and see what the system shows later.",
              rationale: "This removes ownership and clarity.",
            },
          ],
          correctOptionId: "deescalate-q2-b",
          successFeedback: "Correct. Legibility comes from mapping the process in a simple, owned sequence.",
          failureFeedback: "Not yet. The lesson teaches that recovery becomes calmer when the customer can follow the process clearly.",
        },
      ],
    },
    resourceActions: [
      { id: "deescalate-resource-1", label: "Recovery storyboard", detail: "Use the opening-middle-close flow as a coaching observation template." },
      { id: "deescalate-resource-2", label: "Manager annotation", detail: "Tag the exact sentence where control returned to the interaction." },
      { id: "deescalate-resource-3", label: "Evidence capture", detail: "Save one post-call note proving the next step was restated clearly." },
    ],
  },
  "mod-sf-4": {
    heroTitle: "High-scoring closings and next-step confirmation",
    heroSummary: "This checklist module turns closing behavior into a visible quality standard so learners can end interactions with clarity, ownership, and documented next-step confidence.",
    evidenceLabel: "Checklist content translated into an audit-ready closing sequence",
    deckVisuals: [
      {
        id: "close-visual-1",
        title: "Professionalism and branding",
        caption: "The closing module now carries the professionalism-and-branding slide directly into the course to reinforce how the interaction close affects the larger customer impression.",
        imageUrl: "/slides/softskills-33_546a5078.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 33",
      },
      {
        id: "close-visual-2",
        title: "Digital professionalism standards",
        caption: "This original standards slide is used as a lesson visual so the learner sees the detailed operational expectations that support a confident and compliant close.",
        imageUrl: "/slides/softskills-34_229ecb62.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 34",
      },
      {
        id: "close-visual-3",
        title: "Digital professionalism standards",
        caption: "The closing lesson now adds a distinct deck-derived professionalism board so the final handoff feels tied to quiet-space, camera, attire, and background expectations rather than reusing the same communication board again.",
        imageUrl: "/slides/softskills-36_081f2024.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 36",
      },
    ],
    insightCharts: [
      {
        id: "close-chart-1",
        title: "Closing quality signal",
        description: "The graph turns the professionalism deck into a quick operational read on whether the close leaves clarity, ownership, and documentation strength behind it.",
        metricLabel: "% of interactions",
        data: [
          { label: "Outcome recap", value: 83, benchmark: 80 },
          { label: "Next-step clarity", value: 78, benchmark: 76 },
          { label: "Ownership statement", value: 74, benchmark: 72 },
        ],
      },
      {
        id: "close-chart-2",
        title: "Audit-ready closing impact",
        description: "This panel shows how stronger closing discipline improves both customer confidence and downstream review readiness.",
        metricLabel: "Score",
        data: [
          { label: "Customer recall", value: 86, benchmark: 80 },
          { label: "QA traceability", value: 82, benchmark: 78 },
          { label: "Repeat-contact risk", value: 21, benchmark: 15 },
        ],
      },
    ],
    slides: [
      {
        id: "close-summary",
        eyebrow: "Closing sequence",
        title: "The three-part close high performers repeat consistently",
        narrative: "The best closings are brief, structured, and easy for a customer or reviewer to follow after the call.",
        bullets: [
          "Restate the action completed during the interaction.",
          "Confirm the next step or monitoring expectation.",
          "End with a concise ownership statement instead of generic thanks alone.",
        ],
        visualTone: "Closing architecture",
      },
      {
        id: "close-document",
        eyebrow: "Documentation tie-in",
        title: "What the close should make easy to document",
        narrative: "The closing is not only for the customer; it should also create a clean record for QA, coaching, and future follow-up.",
        bullets: [
          "Outcome documented clearly.",
          "Next step time frame captured accurately.",
          "Any remaining uncertainty labeled instead of hidden.",
        ],
        visualTone: "Documentation bridge",
      },
      {
        id: "close-audit",
        eyebrow: "Quality impact",
        title: "Why closings drive both trust and score reliability",
        narrative: "Weak closes create avoidable repeat contacts, unclear documentation, and softer confidence scores. Strong closes create cleaner evidence and better customer recall.",
        bullets: [
          "The customer leaves knowing what happens next.",
          "The manager can audit the interaction faster.",
          "The learner reinforces confidence through concise control.",
        ],
        visualTone: "Outcome link",
      },
      {
        id: "close-deck-bridge",
        eyebrow: "PowerPoint bridge",
        title: "What the professionalism deck adds to the close",
        narrative: "This extra page keeps more of the presentation content in the training by showing how branding, professionalism, and documentation discipline converge in the final interaction handoff.",
        bullets: [
          "Close with a recap that protects the brand promise.",
          "Make the next step explicit enough for documentation and review.",
          "Use one ownership sentence that keeps responsibility visible after the call ends.",
        ],
        visualTone: "Deck translation",
      },
    ],
    practiceSlides: [
      {
        id: "close-practice-1",
        eyebrow: "Checklist rehearsal",
        title: "See the close as a repeatable sequence, not an improvised goodbye",
        narrative: "The learner studies the closing sequence as a visible three-part pattern that should sound natural but still produce evidence.",
        bullets: [
          "Completed action.",
          "Next monitored step.",
          "Ownership statement.",
        ],
        visualTone: "Sequence rehearsal",
      },
      {
        id: "close-practice-2",
        eyebrow: "Audit bridge",
        title: "What a reviewer should be able to hear in the final 20 seconds",
        narrative: "The presentation guidance is turned into a review lens so the learner sees what makes a close both customer-ready and audit-ready.",
        bullets: [
          "The customer can repeat the next step back.",
          "The documentation trail will be clear.",
          "The final ownership statement is concise and confident.",
        ],
        visualTone: "Review lens",
      },
    ],
    applySlides: [
      {
        id: "close-apply-1",
        eyebrow: "Application checkpoint",
        title: "Prove your close is both customer-ready and audit-ready",
        narrative: "The learner must now choose the closing behavior that protects clarity, confidence, and documentation quality.",
        bullets: [
          "Correct answers include outcome, next step, and ownership.",
          "Incorrect answers sound polite but incomplete.",
          "Advancement requires a close that a reviewer could verify later.",
        ],
        visualTone: "Assessment frame",
      },
    ],
    coachPrompts: [
      "Did the close include outcome, next step, and ownership?",
      "What part of the close created the clearest audit trail?",
      "Which sentence can be shortened without losing confidence?",
    ],
    reflectionPrompts: [
      "What is your default three-part close going forward?",
      "How will you document open items more transparently?",
      "What phrase best signals ownership at the end of the call?",
    ],
    practiceScenario: {
      title: "High-volume closing discipline",
      situation: "The learner has handled a complex interaction and needs to end the conversation quickly without dropping the quality of the recap.",
      learnerTask: "Deliver a closing sequence that stays concise, confirms the next step, and leaves a clean audit trail.",
      successSignals: [
        "The close is concise but complete.",
        "The next step is explicit.",
        "The interaction notes would be easy for a reviewer to validate.",
      ],
    },
    applicationActivity: {
      title: "Application check: closing discipline",
      objective: "Show that you can identify a close that protects customer confidence while still producing a clean review trail.",
      instructions: "Pass both questions to move into the final reflection step.",
      passingScore: 2,
      passMessage: "Passed. Your choices reflect a closing sequence that is concise, owned, and review-ready.",
      failMessage: "Not yet passed. Review the closing architecture and retry until your choices align with the lesson standard.",
      questions: [
        {
          id: "close-q1",
          prompt: "Which ending best reflects the three-part close taught in the lesson?",
          options: [
            {
              id: "close-q1-a",
              label: "Thanks for calling. Have a great day.",
              rationale: "This is polite but incomplete and not audit-ready.",
            },
            {
              id: "close-q1-b",
              label: "I’ve documented the action we completed, the next update will happen tomorrow, and I’ll remain the owner for follow-up.",
              rationale: "This includes completed action, next step, and ownership.",
            },
            {
              id: "close-q1-c",
              label: "We should be fine from here, so let’s go ahead and end the call.",
              rationale: "This is vague and leaves the next step unclear.",
            },
          ],
          correctOptionId: "close-q1-b",
          successFeedback: "Correct. The right close is concise but still complete enough for the customer and reviewer.",
          failureFeedback: "This does not match the lesson sequence. A strong close must include completed action, next step, and ownership.",
        },
        {
          id: "close-q2",
          prompt: "Why does the lesson treat closing as a documentation bridge?",
          options: [
            {
              id: "close-q2-a",
              label: "Because the final recap should create a clean record for QA, coaching, and follow-up.",
              rationale: "This is the lesson’s documentation-transfer principle.",
            },
            {
              id: "close-q2-b",
              label: "Because a long explanation always improves customer trust at the end.",
              rationale: "Length does not guarantee clarity or trust.",
            },
            {
              id: "close-q2-c",
              label: "Because reviewers do not need a clear next step if the tone is friendly.",
              rationale: "Friendliness cannot replace a usable record.",
            },
          ],
          correctOptionId: "close-q2-a",
          successFeedback: "Correct. The closing should make the next step easier for both the customer and the reviewer to understand later.",
          failureFeedback: "Not yet. The lesson stresses that closing language should create a clear documentation trail, not just a polite ending.",
        },
      ],
    },
    resourceActions: [
      { id: "close-resource-1", label: "Closing checklist", detail: "Review the three-part close before the next monitored interaction." },
      { id: "close-resource-2", label: "QA alignment", detail: "Tie the closing summary directly to the scorecard language used in calibration." },
      { id: "close-resource-3", label: "Documentation proof", detail: "Save one example where the closing summary made the next step unmistakable." },
    ],
  },
};

type CurriculumMigrationPresentationConfig = {
  heroTitle: string;
  heroSummary: string;
  evidenceLabel: string;
  deckTitle: string;
  accentColor: string;
  lessonTitle: string;
  lessonNarrative: string;
  lessonBullets: [string, string, string];
  workflowTitle: string;
  workflowNarrative: string;
  workflowBullets: [string, string, string];
  transferTitle: string;
  transferNarrative: string;
  transferBullets: [string, string, string];
  scenarioTitle: string;
  scenarioSituation: string;
  learnerTask: string;
  successSignals: [string, string, string];
  chartTitle: string;
  chartDescription: string;
  chartMetricLabel: string;
  chartData: TrainingInsightDatum[];
  chartInsight: string;
  coachPrompts: [string, string, ...string[]];
  reflectionPrompts: [string, string, ...string[]];
  resourceActions: Array<{ label: string; detail: string }>;
};

function createTrainingDeckVisualDataUrl(title: string, subtitle: string, accentColor: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" fill="none"><rect width="1600" height="900" rx="52" fill="#07111F"/><rect x="60" y="60" width="1480" height="780" rx="42" fill="#0F1E31" stroke="${accentColor}" stroke-opacity="0.4"/><rect x="108" y="116" width="1384" height="118" rx="28" fill="${accentColor}" fill-opacity="0.14"/><text x="128" y="168" fill="#F8FAFC" font-family="Montserrat, Arial, sans-serif" font-size="52" font-weight="700">${title}</text><text x="128" y="220" fill="#CBD5E1" font-family="Montserrat, Arial, sans-serif" font-size="28">${subtitle}</text><rect x="128" y="292" width="620" height="380" rx="30" fill="#13263E" stroke="#FFFFFF" stroke-opacity="0.08"/><rect x="786" y="292" width="686" height="176" rx="30" fill="#0B1727" stroke="#FFFFFF" stroke-opacity="0.08"/><rect x="786" y="496" width="686" height="176" rx="30" fill="#0B1727" stroke="#FFFFFF" stroke-opacity="0.08"/><text x="172" y="372" fill="#F8FAFC" font-family="Montserrat, Arial, sans-serif" font-size="30" font-weight="600">Mapped lesson view</text><text x="172" y="422" fill="#94A3B8" font-family="Montserrat, Arial, sans-serif" font-size="24">Deck cues, coaching prompts, and transfer signals stay visible in-platform.</text><text x="828" y="364" fill="#F8FAFC" font-family="Montserrat, Arial, sans-serif" font-size="28" font-weight="600">Operational proof points</text><text x="828" y="412" fill="#94A3B8" font-family="Montserrat, Arial, sans-serif" font-size="24">The learner sees exactly what to document, review, and reinforce after practice.</text><text x="828" y="568" fill="#F8FAFC" font-family="Montserrat, Arial, sans-serif" font-size="28" font-weight="600">Coaching rhythm</text><text x="828" y="616" fill="#94A3B8" font-family="Montserrat, Arial, sans-serif" font-size="24">Lesson framing, rehearsal expectations, and follow-through prompts stay aligned.</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildCurriculumMigrationPresentation(
  module: ModuleLike,
  config: CurriculumMigrationPresentationConfig,
): Omit<TrainingPresentation, "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz"> {
  const secondarySignal = config.successSignals[1] ?? config.workflowBullets[1];
  const tertiarySignal = config.successSignals[2] ?? config.transferBullets[0];

  return {
    heroTitle: config.heroTitle,
    heroSummary: config.heroSummary,
    evidenceLabel: config.evidenceLabel,
    deckVisuals: [
      {
        id: `${module.id}-visual-1`,
        title: config.lessonTitle,
        caption: `${config.deckTitle} is framed as a visible lesson page so ${module.skillFocus.toLowerCase()} stays grounded in a real module sequence rather than a generic fallback view.`,
        imageUrl: createTrainingDeckVisualDataUrl(config.lessonTitle, module.title, config.accentColor),
        sourceDeck: config.deckTitle,
        pageLabel: "Lesson frame 1",
      },
      {
        id: `${module.id}-visual-2`,
        title: config.workflowTitle,
        caption: `The curriculum view now keeps the workflow and coaching cues visible while the learner studies ${config.workflowTitle.toLowerCase()} and prepares for rehearsal.`,
        imageUrl: createTrainingDeckVisualDataUrl(config.workflowTitle, config.scenarioTitle, config.accentColor),
        sourceDeck: config.deckTitle,
        pageLabel: "Lesson frame 2",
      },
      {
        id: `${module.id}-visual-3`,
        title: config.transferTitle,
        caption: `Transfer prompts, proof points, and review expectations are presented as part of the module so the learner knows exactly what success should look like after launch.`,
        imageUrl: createTrainingDeckVisualDataUrl(config.transferTitle, tertiarySignal, config.accentColor),
        sourceDeck: config.deckTitle,
        pageLabel: "Transfer frame",
      },
    ],
    insightCharts: [
      {
        id: `${module.id}-chart-1`,
        title: config.chartTitle,
        description: config.chartDescription,
        metricLabel: config.chartMetricLabel,
        chartType: "comparison",
        insightNote: config.chartInsight,
        data: config.chartData,
      },
    ],
    slides: [
      {
        id: `${module.id}-lesson-1`,
        eyebrow: "Lesson focus",
        title: config.lessonTitle,
        narrative: config.lessonNarrative,
        bullets: [...config.lessonBullets],
        speakerNotes: [
          `Use ${config.lessonTitle.toLowerCase()} as the opening lesson anchor so the learner can name the behavior before moving to process detail.`,
          `Tie every coaching note back to ${module.skillFocus.toLowerCase()} so the transfer signal stays measurable.`,
        ],
        visualTone: "Lesson frame",
      },
      {
        id: `${module.id}-lesson-2`,
        eyebrow: "Workflow cue",
        title: config.workflowTitle,
        narrative: config.workflowNarrative,
        bullets: [...config.workflowBullets],
        speakerNotes: [
          `This page should make the module's workflow standard observable enough for QA, coaching, or leadership review.`,
          `If the learner cannot point to proof, revisit the module before moving to rehearsal.`,
        ],
        visualTone: "Workflow signal",
      },
      {
        id: `${module.id}-lesson-3`,
        eyebrow: "Transfer expectation",
        title: config.transferTitle,
        narrative: config.transferNarrative,
        bullets: [...config.transferBullets],
        speakerNotes: [
          `The learner should leave this page knowing which proof point to document after the next live example.`,
          `Coaches can use these bullets as the debrief frame after a monitored interaction or review cycle.`,
        ],
        visualTone: "Transfer plan",
      },
    ],
    practiceSlides: [
      {
        id: `${module.id}-practice-1`,
        eyebrow: "Guided rehearsal",
        title: config.scenarioTitle,
        narrative: config.scenarioSituation,
        bullets: [...config.successSignals],
        speakerNotes: [
          `Listen for whether the learner can make ${config.successSignals[0].toLowerCase()} audible without overexplaining.`,
          `The rehearsal should sound coached, specific, and ready for live work.`,
        ],
        visualTone: "Guided rehearsal",
      },
      {
        id: `${module.id}-practice-2`,
        eyebrow: "Coach cue",
        title: `What good rehearsal sounds like for ${module.title}`,
        narrative: `Use ${config.workflowTitle.toLowerCase()} to keep rehearsal tied to a visible operational standard instead of a generic confidence check.`,
        bullets: [...config.workflowBullets],
        speakerNotes: [
          `Rehearsal should sound like a coached proof point, not a vague summary of the lesson.`,
          `If the learner skips a signal, pause and restate the expected move before progressing.`,
        ],
        visualTone: "Observable coaching",
      },
    ],
    applySlides: [
      {
        id: `${module.id}-apply-1`,
        eyebrow: "Transfer",
        title: config.transferTitle,
        narrative: config.transferNarrative,
        bullets: [...config.transferBullets],
        speakerNotes: [
          `Make the learner name where this lesson will show up in live work during the next shift or review window.`,
          `A strong answer should connect the deck message to one concrete observation point.`,
        ],
        visualTone: "Transfer proof",
      },
      {
        id: `${module.id}-apply-2`,
        eyebrow: "Proof point",
        title: "What to document after the next live example",
        narrative: `Capture one example where ${secondarySignal.toLowerCase()} and ${tertiarySignal.toLowerCase()} appeared together so the follow-up conversation has real evidence to review.`,
        bullets: [
          `Document the specific moment where ${config.successSignals[0].toLowerCase()} became visible.`,
          `Tie the outcome back to ${module.skillFocus.toLowerCase()} so the lesson stays measurable.`,
          "Use the proof point in the next QA, manager, or coaching follow-up instead of relying on recall alone.",
        ],
        speakerNotes: [
          "This page exists to stop the module from feeling complete until the learner can describe what success will look like in live work.",
          "The review conversation should start with proof, not with general confidence.",
        ],
        visualTone: "Operational evidence",
      },
    ],
    coachPrompts: [...config.coachPrompts],
    reflectionPrompts: [...config.reflectionPrompts],
    practiceScenario: {
      title: config.scenarioTitle,
      situation: config.scenarioSituation,
      learnerTask: config.learnerTask,
      successSignals: [...config.successSignals],
    },
    applicationActivity: {
      title: `Apply ${module.title}`,
      objective: `Confirm the learner can turn ${module.skillFocus.toLowerCase()} into a live-work plan with observable proof.`,
      instructions: "Pass at least 80% of the questions to confirm the lesson can transfer into monitored work, review, or leadership follow-through.",
      passingScore: 3,
      passingPercent: 80,
      passMessage: "Passed. The lesson can now transfer into a documented action plan with a clear coaching or review proof point.",
      failMessage: "Not yet passed. Revisit the lesson and rehearsal frames until the transfer signals are specific enough to coach or review without guesswork.",
      style: "kahoot",
      questions: [
        createMultipleChoiceQuestion(
          `${module.id}-apply-q1`,
          `Which move best represents the opening lesson focus for ${module.skillFocus.toLowerCase()}?`,
          config.lessonBullets[0],
          [config.workflowBullets[0], config.transferBullets[0]],
          "Correct. That move reflects the opening module behavior the learner should recognize immediately.",
          "Not yet. Revisit the first lesson page and choose the behavior the module makes most visible from the start.",
        ),
        createMultipleChoiceQuestion(
          `${module.id}-apply-q2`,
          `Which success signal should a coach or reviewer hear in ${config.scenarioTitle.toLowerCase()}?`,
          config.successSignals[0],
          [config.successSignals[1], config.transferBullets[1]],
          "Correct. That signal is part of the rehearsal standard the learner should demonstrate before moving on.",
          "Not yet. The strongest answer matches the rehearsal success signals shown beside the scenario.",
        ),
        createShortAnswerQuestion(
          `${module.id}-apply-q3`,
          "Write the proof point the learner should document after using this lesson in live work.",
          [config.transferBullets[0], config.transferBullets[1], module.skillFocus],
          `Example: ${config.transferBullets[0]}`,
          "Correct. Your answer names a proof point that can be reviewed in the next follow-up conversation.",
          `Use one of the transfer cues such as "${config.transferBullets[0]}" or another phrase directly tied to ${module.skillFocus.toLowerCase()}.`,
        ),
      ],
    },
    resourceActions: config.resourceActions.map((resource, index) => ({
      id: `${module.id}-resource-${index + 1}`,
      label: resource.label,
      detail: resource.detail,
    })),
  };
}

function buildExpandedCurriculumMigrationPresentation(module: ModuleLike): Omit<TrainingPresentation, "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz"> | null {
  switch (module.id) {
    case "mod-wp-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Verification confidence and workflow control",
        heroSummary: "This lesson turns verification, documentation, and next-step control into one visible workflow sequence so quality review conversations can coach precision instead of generic compliance reminders.",
        evidenceLabel: "Workflow Precision curriculum mapped into a module-aware QA and launch-readiness lesson",
        deckTitle: "Quality Assurance Essentials",
        accentColor: "#38BDF8",
        lessonTitle: "What accurate verification sounds like",
        lessonNarrative: "Verification is not a preamble. It is the first proof that the learner can control workflow risk, keep the record clean, and prepare the next step without confusion.",
        lessonBullets: [
          "Open with the exact verification point that protects the rest of the workflow from rework.",
          "State the process step in plain language so the learner sounds accurate instead of scripted.",
          "Confirm the record and next move before shifting into resolution or escalation.",
        ],
        workflowTitle: "Documentation and handoff discipline",
        workflowNarrative: "The workflow standard is visible when documentation, ownership, and follow-through cues remain clear enough for QA, coaching, and launch support to review later.",
        workflowBullets: [
          "Tie the verified detail directly to the note or workflow field that will be reviewed later.",
          "Use one clean handoff phrase so ownership never becomes ambiguous.",
          "Close the step with a visible next action instead of assuming the workflow is obvious.",
        ],
        transferTitle: "How to prove workflow precision in live work",
        transferNarrative: "After rehearsal, the learner should be able to show where verification protected the customer, the process, and the downstream reviewer at the same time.",
        transferBullets: [
          "Save one example where the verified detail prevented a documentation miss.",
          "Note the moment where the next step was stated clearly enough for a reviewer to track later.",
          "Use the example in the next QA or manager review to prove the workflow standard held under pressure.",
        ],
        scenarioTitle: "Launch-readiness verification drill",
        scenarioSituation: "A new process update has changed the fields and review expectations for a high-volume interaction. The learner must verify the key detail, document the evidence, and keep the next step unmistakable.",
        learnerTask: "Deliver the verification statement, log the field-level proof point, and transition into the next action without losing ownership.",
        successSignals: [
          "The verified detail is stated clearly before any process explanation begins.",
          "Documentation language matches the workflow field the reviewer expects to see later.",
          "The next action is specific enough for QA or coaching follow-up.",
        ],
        chartTitle: "Workflow precision adoption",
        chartDescription: "This evidence view shows whether the lesson is producing stronger verification and documentation discipline in monitored work.",
        chartMetricLabel: "% of reviewed interactions",
        chartData: [
          { label: "Verified detail stated", value: 88, benchmark: 82 },
          { label: "Documentation aligned", value: 84, benchmark: 78 },
          { label: "Next step explicit", value: 80, benchmark: 76 },
        ],
        chartInsight: "The coaching conversation should link verification language to both the note trail and the next-step clarity score.",
        coachPrompts: [
          "Which exact phrase made the verified detail unmistakable before the workflow explanation started?",
          "Where in the record could a QA reviewer see proof that the learner controlled the handoff instead of assuming it?",
        ],
        reflectionPrompts: [
          "What part of the workflow became easier once the verification point was said out loud first?",
          "How would you prove documentation discipline to a reviewer who only sees the notes and the close?",
        ],
        resourceActions: [
          { label: "Verification phrase bank", detail: "Review the approved verification openers before the next monitored workflow example." },
          { label: "Documentation proof checklist", detail: "Use the checklist to confirm the verified detail, field update, and next-step note all match." },
          { label: "QA review handoff", detail: "Bring one saved proof point into the next QA or manager review conversation." },
        ],
      });
    case "mod-rtc-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Trust-building coaching that creates movement",
        heroSummary: "This lesson turns coaching presence, observable feedback, and follow-through into a real practice sequence so the conversation produces ownership instead of a polite but forgettable check-in.",
        evidenceLabel: "Real-time Coaching curriculum mapped into a module-aware coaching-practice lesson",
        deckTitle: "Real-time Coaching",
        accentColor: "#F59E0B",
        lessonTitle: "What strong coaching presence looks like",
        lessonNarrative: "The opening minute of a coaching conversation should reduce defensiveness, make the standard visible, and give the learner a reason to stay in the conversation instead of waiting for the correction to end.",
        lessonBullets: [
          "Open with one observed strength or anchor so the learner feels grounded before the gap is discussed.",
          "Describe the behavior in plain language instead of labeling the person or guessing at intent.",
          "Ask for reflection early enough that the learner becomes part of the coaching move, not just the recipient of it.",
        ],
        workflowTitle: "Observable feedback and ownership",
        workflowNarrative: "A coaching conversation becomes useful when the feedback is specific, the next move is co-owned, and the manager can revisit the agreement later without ambiguity.",
        workflowBullets: [
          "Tie the feedback to one visible behavior the learner can hear or see again later.",
          "Turn the conversation into one actionable improvement move instead of a list of reminders.",
          "Document the follow-through expectation before the conversation closes.",
        ],
        transferTitle: "How to carry the coaching move into follow-through",
        transferNarrative: "The learner should leave this module ready to use the same structure in the next live coaching moment, including the recap and accountability checkpoint.",
        transferBullets: [
          "Capture the agreed next move in language the learner could repeat back accurately.",
          "Schedule the follow-up checkpoint while the conversation is still fresh.",
          "Use the follow-up to review behavior evidence, not just confidence or intent.",
        ],
        scenarioTitle: "High-friction coaching follow-up",
        scenarioSituation: "A recent review showed inconsistency in call control. The coach must open the conversation calmly, describe the behavior precisely, and secure a real improvement commitment without making the learner defensive.",
        learnerTask: "Lead the opening coaching exchange, name the behavior, and document the follow-through action the learner will complete before the next review.",
        successSignals: [
          "The coach names one observed behavior instead of making a personality judgment.",
          "The learner is asked to reflect before the action plan is finalized.",
          "The follow-up expectation is documented clearly enough to review later.",
        ],
        chartTitle: "Coaching follow-through reliability",
        chartDescription: "This view tracks whether coaching conversations are producing documented next steps and observable ownership signals.",
        chartMetricLabel: "% of coaching cycles",
        chartData: [
          { label: "Behavior named clearly", value: 91, benchmark: 84 },
          { label: "Learner reflection captured", value: 83, benchmark: 76 },
          { label: "Follow-up documented", value: 86, benchmark: 80 },
        ],
        chartInsight: "The module works best when the coach moves from behavior evidence into one clear follow-up checkpoint without drifting into generic encouragement.",
        coachPrompts: [
          "What exact behavior did the learner hear from you, and how do you know it was specific enough to act on?",
          "Where in the recap did you make the next follow-up date or proof point unmistakable?",
        ],
        reflectionPrompts: [
          "Which opening phrase reduced defensiveness and made the learner willing to stay engaged?",
          "How will you know the next coaching conversation is reviewing evidence rather than repeating advice?",
        ],
        resourceActions: [
          { label: "Coaching opener guide", detail: "Use the guide to frame the first minute with calm clarity and one visible strength." },
          { label: "Behavior-to-action recap", detail: "Review the recap structure that links observed behavior, learner reflection, and the next commitment." },
          { label: "Follow-up checkpoint template", detail: "Log the date, proof point, and owner for the next coaching review." },
        ],
      });
    case "mod-dl-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Reading KPIs without losing the operational story",
        heroSummary: "This lesson turns KPI review into a practical leadership rhythm so score movement, root-cause questions, and decision quality stay connected instead of becoming isolated dashboard commentary.",
        evidenceLabel: "Data-led leadership curriculum mapped into a module-aware KPI interpretation lesson",
        deckTitle: "Unlocking the Power of Data",
        accentColor: "#8B5CF6",
        lessonTitle: "What the KPI is really signaling",
        lessonNarrative: "A metric matters only when the leader can explain what behavior it reflects, where the risk is forming, and which follow-up question should come next.",
        lessonBullets: [
          "Start with the behavior or workflow the KPI is measuring before reacting to the score itself.",
          "Compare the movement against the benchmark so the trend has context instead of drama.",
          "State the next operational question that should guide the review conversation.",
        ],
        workflowTitle: "Root-cause framing before action",
        workflowNarrative: "Strong KPI interpretation slows the rush to action just long enough to validate the pattern, ask the right question, and prevent overcorrection.",
        workflowBullets: [
          "Separate signal from noise by naming the time period, segment, or comparison point involved.",
          "Ask which workflow, behavior, or leader action could be creating the movement.",
          "Choose one next review step that will confirm the story before a broader rollout happens.",
        ],
        transferTitle: "How to turn the metric into a decision-ready review",
        transferNarrative: "The lesson should help the learner leave the dashboard with a sharper operating question, a cleaner comparison, and one decision-ready follow-up action.",
        transferBullets: [
          "Document the comparison point that makes the KPI trend meaningful.",
          "Record the root-cause hypothesis that needs to be checked next.",
          "Bring the finding into the next leadership review with one evidence-backed recommendation.",
        ],
        scenarioTitle: "Executive KPI review huddle",
        scenarioSituation: "A service line has improved on volume but slipped on downstream quality. The executive must explain what the KPI trend may mean without overreacting, then guide the team into a better follow-up question.",
        learnerTask: "Interpret the KPI, frame the likely story behind the movement, and set the next evidence check before the team commits to action.",
        successSignals: [
          "The KPI is tied to a clear operational behavior instead of treated as an isolated number.",
          "A benchmark or comparison point is named before conclusions are made.",
          "The next review question is specific enough to guide the team into evidence-based action.",
        ],
        chartTitle: "Decision-ready KPI review behavior",
        chartDescription: "This chart tracks whether leaders are turning score movement into better questions, better comparisons, and better next-step decisions.",
        chartMetricLabel: "% of leadership reviews",
        chartData: [
          { label: "Behavior tied to KPI", value: 82, benchmark: 78 },
          { label: "Benchmark referenced", value: 79, benchmark: 74 },
          { label: "Next question defined", value: 76, benchmark: 72 },
        ],
        chartInsight: "Leaders improve fastest when they state the comparison point before they state the conclusion.",
        coachPrompts: [
          "What behavior or workflow did you connect to the KPI before the team moved into reaction mode?",
          "Which next question did you choose, and why was it the best evidence check before action?",
        ],
        reflectionPrompts: [
          "Where are you most tempted to react to the score before naming the comparison point?",
          "How could one stronger follow-up question improve the next leadership review conversation?",
        ],
        resourceActions: [
          { label: "KPI interpretation guide", detail: "Use the guide to connect score movement to the operational behavior it reflects." },
          { label: "Benchmark comparison note", detail: "Capture the comparison point before the next executive review begins." },
          { label: "Decision-ready recap", detail: "Summarize the likely story, the open question, and the next validation step for the team." },
        ],
      });
    case "mod-lfs-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Professional clarity inside regulated conversations",
        heroSummary: "This lesson brings regulated service conversations into a visible module sequence so clarity, composure, and secure workflow language stay aligned under compliance pressure.",
        evidenceLabel: "Regulated service curriculum mapped into a module-aware clarity and compliance lesson",
        deckTitle: "Soft Skills & Customer/Patient Service Foundation",
        accentColor: "#0EA5E9",
        lessonTitle: "What calm clarity sounds like under pressure",
        lessonNarrative: "In regulated service work, clarity must sound composed, accurate, and safe enough for both the customer and the reviewer to trust the interaction.",
        lessonBullets: [
          "Open with a calm explanation of what can be confirmed right now.",
          "Use precise language that protects the process without sounding cold or evasive.",
          "Keep ownership visible while you move through the required secure steps.",
        ],
        workflowTitle: "Secure handoff discipline",
        workflowNarrative: "Professional clarity matters most when the learner can hold the compliance line and still make the next step understandable to the customer.",
        workflowBullets: [
          "State the secure verification requirement before moving deeper into the request.",
          "Use a handoff phrase that keeps the customer informed without overpromising.",
          "Confirm the protected next step before closing the interaction.",
        ],
        transferTitle: "How to prove clarity in a regulated workflow",
        transferNarrative: "The learner should be able to show where calm language protected the process while still building trust and keeping the record reviewable.",
        transferBullets: [
          "Save one example where clarity reduced confusion without bypassing a secure step.",
          "Document the exact phrase that kept ownership visible during the handoff.",
          "Use the example in the next compliance or manager review conversation.",
        ],
        scenarioTitle: "Regulated-service reassurance drill",
        scenarioSituation: "A customer is frustrated by a required secure step and wants the agent to move faster. The learner must hold the compliance line, reassure clearly, and preserve trust.",
        learnerTask: "Explain the secure step calmly, keep ownership visible, and confirm the protected next action without sounding defensive.",
        successSignals: [
          "The secure requirement is explained clearly before the interaction moves forward.",
          "Reassurance language sounds calm and accurate rather than vague.",
          "Ownership of the next step remains visible through the close.",
        ],
        chartTitle: "Regulated conversation clarity",
        chartDescription: "This view tracks whether regulated interactions show stronger composure, secure-step clarity, and customer-ready next-step control.",
        chartMetricLabel: "% of reviewed interactions",
        chartData: [
          { label: "Secure step explained", value: 85, benchmark: 80 },
          { label: "Reassurance accurate", value: 82, benchmark: 76 },
          { label: "Ownership retained", value: 79, benchmark: 74 },
        ],
        chartInsight: "The best conversations make the secure step feel controlled rather than obstructive because the ownership language stays clear.",
        coachPrompts: [
          "Which phrase protected the secure process without making the customer feel blocked?",
          "How did you keep ownership visible while the compliance step stayed in place?",
        ],
        reflectionPrompts: [
          "What language helps you sound both accurate and human when the process tightens?",
          "Where in the conversation can you make the next step clearer without overpromising?",
        ],
        resourceActions: [
          { label: "Regulated-language guide", detail: "Review the calm, compliant phrases that protect the process without sounding evasive." },
          { label: "Secure handoff recap", detail: "Use the recap structure to confirm the step, the owner, and the next update." },
          { label: "Compliance review proof", detail: "Bring one saved interaction into the next compliance or coaching review." },
        ],
      });
    case "mod-lfd-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Bias-aware data interpretation for leadership reviews",
        heroSummary: "This lesson helps leaders slow down long enough to test assumptions, validate comparisons, and keep data analysis from drifting into convenient stories.",
        evidenceLabel: "Leadership data curriculum mapped into a module-aware bias and validation lesson",
        deckTitle: "Unlocking the Power of Data",
        accentColor: "#A855F7",
        lessonTitle: "What a biased read looks like",
        lessonNarrative: "A strong analyst can spot where a conclusion is moving faster than the evidence and pause the conversation before the wrong story becomes the plan.",
        lessonBullets: [
          "Name the assumption hiding inside the first conclusion.",
          "Check whether the comparison point actually supports that conclusion.",
          "Slow the team down long enough to validate the pattern before action begins.",
        ],
        workflowTitle: "Validation before rollout",
        workflowNarrative: "Validation is a leadership discipline. It protects decisions from recency bias, single-team assumptions, and noisy comparisons that should not drive action alone.",
        workflowBullets: [
          "Compare the trend across another team, period, or segment before escalating it.",
          "Ask what evidence would disprove the first conclusion rather than only what confirms it.",
          "Define the next validation check before the recommendation is formalized.",
        ],
        transferTitle: "How to prove better analysis discipline",
        transferNarrative: "The learner should leave this lesson ready to challenge the first story, validate the pattern, and present a cleaner recommendation in the next leadership review.",
        transferBullets: [
          "Document the assumption you challenged before the recommendation moved forward.",
          "Record the validating comparison that strengthened or weakened the original conclusion.",
          "Use the refined story in the next cross-team review instead of repeating the first draft conclusion.",
        ],
        scenarioTitle: "Cross-team trend validation review",
        scenarioSituation: "One team appears to be outperforming another, but the time periods and case mix are different. The leader must avoid a premature conclusion and validate the comparison before recommending action.",
        learnerTask: "State the hidden assumption, choose the validation comparison, and explain how the recommendation should change based on the stronger evidence.",
        successSignals: [
          "The first assumption is named before the recommendation is finalized.",
          "A stronger comparison point is selected to validate the story.",
          "The next decision reflects the validated evidence rather than the first convenient conclusion.",
        ],
        chartTitle: "Validation discipline in leadership reviews",
        chartDescription: "This chart measures whether leaders are checking assumptions and comparisons before turning trend movement into action.",
        chartMetricLabel: "% of review cycles",
        chartData: [
          { label: "Assumption named", value: 81, benchmark: 75 },
          { label: "Comparison validated", value: 78, benchmark: 72 },
          { label: "Decision refined", value: 74, benchmark: 70 },
        ],
        chartInsight: "The strongest improvement comes when leaders say what could disprove the first conclusion before they defend it.",
        coachPrompts: [
          "Which assumption did you surface first, and how did that change the direction of the conversation?",
          "What comparison did you choose to validate the story before the recommendation moved forward?",
        ],
        reflectionPrompts: [
          "Where are you most likely to trust the first plausible explanation without validating it?",
          "How would stronger comparison discipline improve the next executive recommendation you make?",
        ],
        resourceActions: [
          { label: "Assumption check prompt", detail: "Use the prompt set to surface hidden assumptions before the next leadership review." },
          { label: "Comparison validation worksheet", detail: "Record the segment, timeframe, and evidence needed to validate the trend." },
          { label: "Decision refinement recap", detail: "Summarize how the recommendation changed after the evidence was tested." },
        ],
      });
    case "mod-hcs-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Human service language for fast digital care",
        heroSummary: "This lesson keeps digital-service tone, ownership, and speed aligned so fast channels still sound human, reassuring, and accountable.",
        evidenceLabel: "Digital care service curriculum mapped into a module-aware tone and ownership lesson",
        deckTitle: "Customer Service Foundations for Digital Care",
        accentColor: "#14B8A6",
        lessonTitle: "What human service language sounds like in a fast channel",
        lessonNarrative: "When the channel is fast, the learner still has to sound present, human, and in control. Speed cannot replace warmth, clarity, or issue ownership.",
        lessonBullets: [
          "Acknowledge the customer’s need in plain language before moving into the workflow step.",
          "Use short phrases that sound human rather than clipped or transactional.",
          "Keep ownership visible even when the channel requires brevity.",
        ],
        workflowTitle: "Fast-channel ownership cues",
        workflowNarrative: "A digital interaction still needs a visible owner, a clean transition, and a close that tells the customer what happens next.",
        workflowBullets: [
          "State who is taking the next step instead of implying that the system will handle it.",
          "Make the transition clean so the customer never has to guess what is happening.",
          "Close with one confidence-building next step instead of an abrupt end.",
        ],
        transferTitle: "How to prove tone and ownership under speed",
        transferNarrative: "The learner should be able to show where brevity stayed human and where ownership remained visible through the transfer or close.",
        transferBullets: [
          "Save one interaction where a short reply still sounded warm and accountable.",
          "Document the phrase that made the next step clear without adding clutter.",
          "Use the example in the next digital-care review or coaching session.",
        ],
        scenarioTitle: "Digital-care tone reset",
        scenarioSituation: "A customer in a fast channel is frustrated by an unresolved issue. The learner must respond quickly, sound human, and keep the next step clear without overloading the message.",
        learnerTask: "Write the short response that acknowledges the issue, keeps ownership visible, and clarifies the next action.",
        successSignals: [
          "The message sounds human before it sounds procedural.",
          "Ownership of the next action is visible in the response.",
          "The customer can tell what will happen next without needing a second explanation.",
        ],
        chartTitle: "Digital-care tone adoption",
        chartDescription: "This view shows whether fast-channel interactions keep warmth, ownership, and next-step clarity visible at the same time.",
        chartMetricLabel: "% of reviewed digital interactions",
        chartData: [
          { label: "Human tone visible", value: 84, benchmark: 78 },
          { label: "Ownership named", value: 80, benchmark: 74 },
          { label: "Next step clear", value: 82, benchmark: 76 },
        ],
        chartInsight: "The best responses stay short without sounding detached because ownership and next-step clarity remain explicit.",
        coachPrompts: [
          "Which short phrase made the reply sound human before it sounded operational?",
          "How did you keep ownership visible without slowing the interaction down?",
        ],
        reflectionPrompts: [
          "Where do you tend to sound too abrupt when the pace of the channel increases?",
          "What wording helps you preserve warmth and control in the same reply?",
        ],
        resourceActions: [
          { label: "Digital tone examples", detail: "Review high-performing short replies that still sound human and accountable." },
          { label: "Ownership phrase set", detail: "Use the phrase set to keep the next action visible in fast channels." },
          { label: "Digital-care proof log", detail: "Save one reviewed example for the next coaching or calibration session." },
        ],
      });
    case "mod-lfp-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Performance segmentation that leads to better coaching",
        heroSummary: "This lesson turns performance buckets into a practical leadership discipline so segmentation, fairness, and coaching action stay connected instead of becoming an abstract dashboard exercise.",
        evidenceLabel: "Performance-management curriculum mapped into a module-aware segmentation and calibration lesson",
        deckTitle: "Utilizing Performance Management to Maximize Results",
        accentColor: "#FB7185",
        lessonTitle: "What a useful performance bucket does",
        lessonNarrative: "A performance bucket is only useful when it helps the leader see the right coaching move, protect fairness, and avoid treating different problems as if they were the same.",
        lessonBullets: [
          "Name the pattern that places the learner in the bucket rather than jumping straight to the intervention.",
          "Compare the pattern against the fairness standard before escalating it.",
          "Use the bucket to choose one coaching move that matches the real need.",
        ],
        workflowTitle: "Calibration before coaching action",
        workflowNarrative: "Segmentation creates value when the leader can explain why the bucket fits, what evidence supports it, and what action should happen next without bias.",
        workflowBullets: [
          "Check the evidence against another reviewer, segment, or period before finalizing the bucket.",
          "State the difference between a skill gap, a consistency issue, and an accountability issue.",
          "Choose one coaching move that matches the segment instead of using the same response for everyone.",
        ],
        transferTitle: "How to prove fair segmentation in leadership rhythm",
        transferNarrative: "The learner should leave able to justify the segment, explain the coaching move, and show why the decision was fair enough to defend in calibration.",
        transferBullets: [
          "Document the evidence that justified the chosen performance bucket.",
          "Record the calibration check that protected the decision from bias.",
          "Use the note in the next performance review or coaching-planning cycle.",
        ],
        scenarioTitle: "Manager segmentation review",
        scenarioSituation: "A team member's scores and workflow signals are drifting, but the pattern is mixed. The manager must decide which bucket fits, explain the evidence, and choose a fair coaching move.",
        learnerTask: "Name the segment, justify it with evidence, and outline the coaching action that best matches the actual need.",
        successSignals: [
          "The segment is tied to a clear pattern instead of a vague impression.",
          "A fairness or calibration check is named before the coaching action is finalized.",
          "The coaching move matches the actual segment rather than a generic response.",
        ],
        chartTitle: "Performance segmentation quality",
        chartDescription: "This chart tracks whether leaders are using evidence, fairness checks, and tailored follow-through when placing learners into performance buckets.",
        chartMetricLabel: "% of performance reviews",
        chartData: [
          { label: "Pattern defined", value: 86, benchmark: 80 },
          { label: "Calibration check named", value: 79, benchmark: 74 },
          { label: "Action matched", value: 82, benchmark: 76 },
        ],
        chartInsight: "Segmentation becomes credible when leaders can explain the evidence and the fairness check before they explain the intervention.",
        coachPrompts: [
          "What evidence made the performance bucket defensible rather than convenient?",
          "How did you confirm the coaching move matched the real segment instead of a generic plan?",
        ],
        reflectionPrompts: [
          "Where might bias show up if you skip the calibration check?",
          "How would a more precise segment change the way you plan the next coaching conversation?",
        ],
        resourceActions: [
          { label: "Performance bucket guide", detail: "Review the signs that distinguish skill, consistency, and accountability patterns." },
          { label: "Calibration recap", detail: "Use the recap to validate the bucket before the coaching plan is finalized." },
          { label: "Leadership action planner", detail: "Document the coaching move and the follow-up proof point for the next review." },
        ],
      });
    case "mod-hce-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Recognition systems that create repeatable engagement",
        heroSummary: "This lesson turns gamification and recognition into a leadership operating rhythm so motivation, fairness, and measurable reinforcement stay connected instead of becoming one-off morale tactics.",
        evidenceLabel: "Engagement-design curriculum mapped into a module-aware recognition and motivation lesson",
        deckTitle: "Gamification for Remote Teams: Engaging and Empowering Leaders",
        accentColor: "#22C55E",
        lessonTitle: "What a healthy recognition system actually reinforces",
        lessonNarrative: "A recognition system should make desired behaviors more visible, more repeatable, and easier for the team to understand without creating noise or favoritism.",
        lessonBullets: [
          "Define the behavior the recognition system is meant to reinforce before designing the reward.",
          "Keep the criteria clear enough that the team can predict what earns recognition.",
          "Make the reinforcement rhythm consistent so motivation does not depend on randomness.",
        ],
        workflowTitle: "Fairness and operating rhythm",
        workflowNarrative: "Recognition works when leaders can explain why a reward happened, how often it should happen, and what signal shows the system is working for the whole team.",
        workflowBullets: [
          "Use visible criteria so recognition does not feel arbitrary or personality-driven.",
          "Choose a cadence that matches the team's working rhythm instead of overwhelming it.",
          "Measure whether the reinforced behavior is actually showing up more often over time.",
        ],
        transferTitle: "How to prove engagement design is working",
        transferNarrative: "The learner should be able to explain the behavior, the cadence, and the measurement plan before launching the next recognition or gamification move.",
        transferBullets: [
          "Document the behavior the recognition system is meant to amplify.",
          "Record the cadence and visibility rule so the rhythm can be reviewed later.",
          "Bring one engagement metric into the next leadership or culture review.",
        ],
        scenarioTitle: "Recognition-rhythm design review",
        scenarioSituation: "A remote team has become inconsistent in engagement and the current rewards feel random. The leader must redesign the rhythm so recognition supports the right behavior and can be measured over time.",
        learnerTask: "Define the target behavior, explain the cadence, and show how the team will know the system is fair and working.",
        successSignals: [
          "The recognized behavior is named clearly before rewards are discussed.",
          "The cadence is practical enough for the team to experience consistently.",
          "A measurable signal is chosen to prove the system is reinforcing the right pattern.",
        ],
        chartTitle: "Recognition-system stability",
        chartDescription: "This chart shows whether the leadership rhythm is making engagement behavior more visible, more predictable, and easier to sustain.",
        chartMetricLabel: "% of team cycles",
        chartData: [
          { label: "Criteria clear", value: 87, benchmark: 80 },
          { label: "Cadence consistent", value: 81, benchmark: 75 },
          { label: "Behavior rising", value: 78, benchmark: 72 },
        ],
        chartInsight: "Recognition systems hold better when leaders define the behavior first and the reward second.",
        coachPrompts: [
          "What behavior did you decide to reinforce, and how will the team know the criteria are fair?",
          "How will you prove the recognition rhythm is changing behavior rather than just creating novelty?",
        ],
        reflectionPrompts: [
          "Where could randomness or favoritism creep into your current engagement rhythm?",
          "What would make your next recognition system easier for the whole team to trust?",
        ],
        resourceActions: [
          { label: "Recognition criteria template", detail: "Define the behavior, evidence, and eligibility rule before launching the next reward cycle." },
          { label: "Cadence planner", detail: "Choose the review rhythm that fits the team's work pattern without overwhelming it." },
          { label: "Engagement metric recap", detail: "Bring one engagement signal into the next leadership check-in to validate the design." },
        ],
      });
    case "mod-hcd-1":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Engagement visibility that leaders can operate from",
        heroSummary: "This lesson helps leaders connect culture and engagement signals to operating rhythm, measurement, and follow-through so motivation work becomes decision-ready instead of anecdotal.",
        evidenceLabel: "Executive culture curriculum mapped into a module-aware engagement-visibility lesson",
        deckTitle: "Culture Momentum and Readiness Visibility",
        accentColor: "#F97316",
        lessonTitle: "What engagement metrics are actually telling you",
        lessonNarrative: "A culture metric matters only when the leader can explain what behavior or rhythm it reflects and what operating question should come next.",
        lessonBullets: [
          "Start with the engagement behavior or cadence the metric is supposed to reveal.",
          "Compare the signal against a meaningful benchmark or prior period before reacting.",
          "Use the metric to open one operating question, not to close the conversation prematurely.",
        ],
        workflowTitle: "Operating rhythm before broad conclusions",
        workflowNarrative: "Executive culture work becomes credible when the signal is tied to leadership rhythm, reinforcement, and one clear follow-up action instead of generalized optimism or concern.",
        workflowBullets: [
          "Link the metric to one leadership habit or cadence that can be reviewed directly.",
          "State what follow-up check would validate the cultural story behind the number.",
          "Choose one leadership action that keeps reinforcement visible after the review ends.",
        ],
        transferTitle: "How to prove culture visibility in leadership review",
        transferNarrative: "The learner should leave able to explain what the engagement signal means, what rhythm supports it, and what evidence will confirm the story over time.",
        transferBullets: [
          "Document the leadership habit or cadence connected to the engagement score.",
          "Record the validation check that should happen before the next executive conclusion.",
          "Use the note to guide the next operating-rhythm review across the leadership team.",
        ],
        scenarioTitle: "Executive engagement review",
        scenarioSituation: "A distributed team is showing signs of engagement fatigue, but the underlying causes are unclear. The executive must interpret the signal carefully, connect it to operating rhythm, and choose the next validation step.",
        learnerTask: "Explain what the metric may be revealing, identify the leadership rhythm behind it, and define the next check before broad action is taken.",
        successSignals: [
          "The engagement signal is tied to a specific operating rhythm or leadership habit.",
          "A benchmark or validation check is named before the conclusion hardens.",
          "The next leadership action keeps reinforcement visible rather than symbolic.",
        ],
        chartTitle: "Culture visibility in leadership rhythm",
        chartDescription: "This chart measures whether executives are turning engagement signals into clearer rhythm, validation, and follow-through behavior.",
        chartMetricLabel: "% of executive reviews",
        chartData: [
          { label: "Rhythm tied to metric", value: 80, benchmark: 74 },
          { label: "Validation defined", value: 77, benchmark: 71 },
          { label: "Action sustained", value: 75, benchmark: 69 },
        ],
        chartInsight: "Engagement visibility improves when leaders name the operating rhythm behind the score before proposing a fix.",
        coachPrompts: [
          "Which operating rhythm or habit did you connect to the engagement signal, and why?",
          "What validation check keeps the executive conversation evidence-based instead of symbolic?",
        ],
        reflectionPrompts: [
          "Where do culture conversations become too abstract for you to act on?",
          "What leadership rhythm would you review first the next time engagement momentum slips?",
        ],
        resourceActions: [
          { label: "Engagement rhythm recap", detail: "Use the recap to connect a culture score to a specific leadership cadence or habit." },
          { label: "Validation check planner", detail: "Define the next evidence check before the executive story hardens into action." },
          { label: "Culture review note", detail: "Carry one documented signal into the next executive operating-rhythm meeting." },
        ],
      });
    case "mod-wp-2":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Turning QA findings into coachable behavior",
        heroSummary: "This lesson converts scorecard observations into observable coaching language so leaders can move from issue labels to specific behavior change without losing accountability.",
        evidenceLabel: "Workflow Precision curriculum mapped into a module-aware QA-to-coaching lesson",
        deckTitle: "Quality Assurance Essentials",
        accentColor: "#38BDF8",
        lessonTitle: "What a behavior-ready QA finding includes",
        lessonNarrative: "A QA finding becomes useful only when the reviewer can point to what happened, why it mattered, and what the learner should do differently next time.",
        lessonBullets: [
          "Start with the observable behavior instead of the score label or emotional reaction.",
          "Tie the finding to one customer, workflow, or documentation risk the learner can understand immediately.",
          "State the improvement move in language the learner can repeat back and use on the next interaction.",
        ],
        workflowTitle: "Coaching from evidence instead of score language",
        workflowNarrative: "Scorecards create better coaching when leaders move from evidence to behavior to action, rather than staying trapped in numeric findings that never change live work.",
        workflowBullets: [
          "Quote or summarize the exact behavior the QA review surfaced before discussing severity.",
          "Translate the score impact into a plain-language coaching consequence the learner can picture in live work.",
          "Close with one measurable behavior target instead of a broad reminder to improve.",
        ],
        transferTitle: "How to prove a QA finding changed behavior",
        transferNarrative: "The learner should leave able to document the finding, the coaching move, and the next monitored proof point that will confirm the behavior actually changed.",
        transferBullets: [
          "Save one scorecard example and rewrite it as a behavior-based coaching note.",
          "Document the exact language or workflow move the learner will use differently next time.",
          "Review the next monitored interaction for proof that the coached behavior appeared under pressure.",
        ],
        scenarioTitle: "Behavior-coaching QA debrief",
        scenarioSituation: "A recent QA review shows inconsistent documentation and a weak close, but the learner is focused only on the score. The leader must redirect the conversation toward observable behavior and a usable improvement move.",
        learnerTask: "State the finding in behavior terms, explain the operational risk, and define the one coached behavior that should change on the next monitored interaction.",
        successSignals: [
          "The QA issue is translated into one clear behavior instead of a vague quality label.",
          "The operational consequence is explained without shaming the learner.",
          "The next coached move is specific enough to monitor and score later.",
        ],
        chartTitle: "Behavior-based QA coaching adoption",
        chartDescription: "This view tracks whether QA findings are being converted into concrete behavior coaching and monitored follow-through.",
        chartMetricLabel: "% of QA coaching reviews",
        chartData: [
          { label: "Behavior named", value: 89, benchmark: 82 },
          { label: "Risk explained", value: 84, benchmark: 78 },
          { label: "Next move documented", value: 81, benchmark: 75 },
        ],
        chartInsight: "QA findings create better movement when leaders coach from the behavior the learner can repeat, not the score the learner is trying to defend.",
        coachPrompts: [
          "What exact behavior did the scorecard reveal, and how did you keep the learner focused on that instead of the number?",
          "Which monitored proof point will tell you the coached behavior actually changed on the next review?",
        ],
        reflectionPrompts: [
          "Where do your QA debriefs drift into score language instead of behavior change?",
          "How would clearer behavior translation improve the next coaching conversation you lead?",
        ],
        resourceActions: [
          { label: "QA-to-behavior translator", detail: "Convert score labels into behavior-based coaching language before the next review." },
          { label: "Coaching proof template", detail: "Document the finding, the coached move, and the next monitored proof point in one place." },
          { label: "Behavior follow-up guide", detail: "Use the guide to evaluate whether the corrected behavior holds during the next QA cycle." },
        ],
      });
    case "mod-rtc-2":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "SMART coaching goals that survive follow-through",
        heroSummary: "This lesson shows how strong coaching goals become visible commitments with owners, evidence, and review cadence instead of friendly promises that disappear after the conversation.",
        evidenceLabel: "Real-time Coaching curriculum mapped into a module-aware SMART-goal and documentation lesson",
        deckTitle: "Real-time Coaching",
        accentColor: "#F59E0B",
        lessonTitle: "What a usable SMART coaching goal sounds like",
        lessonNarrative: "A coaching goal should be specific enough to act on, measurable enough to review, and realistic enough that the learner can own it without guessing what success means.",
        lessonBullets: [
          "Name the exact behavior or workflow move the learner will improve.",
          "Define the proof that will confirm the goal is actually happening in live work.",
          "Set a review rhythm that keeps the goal visible before momentum fades.",
        ],
        workflowTitle: "Documentation that protects accountability",
        workflowNarrative: "Documentation turns the coaching goal into an operating tool. It preserves the commitment, the evidence standard, and the next review point for both the coach and the learner.",
        workflowBullets: [
          "Capture the goal in plain language the learner could repeat back accurately.",
          "Record the evidence source or score signal that will be reviewed at follow-up.",
          "Document the next checkpoint date before the conversation closes.",
        ],
        transferTitle: "How to prove the goal stayed alive after coaching",
        transferNarrative: "The learner should leave ready to write a SMART goal, document it cleanly, and revisit it with observable evidence instead of vague confidence updates.",
        transferBullets: [
          "Save one documented goal with its proof source and follow-up date.",
          "Review the next checkpoint using behavior or score evidence rather than memory.",
          "Refine the goal only after the first evidence review shows what is or is not changing.",
        ],
        scenarioTitle: "SMART-goal coaching recap",
        scenarioSituation: "A learner agrees improvement is needed, but past coaching goals have been too broad to revisit effectively. The coach must define the commitment, document it, and lock in the follow-up rhythm.",
        learnerTask: "Write the SMART coaching goal, state the proof source, and document the exact follow-up checkpoint that will test progress.",
        successSignals: [
          "The goal is specific enough that two reviewers would describe it the same way.",
          "The proof source is identified before the conversation ends.",
          "The follow-up date and accountability owner are documented clearly.",
        ],
        chartTitle: "SMART-goal follow-through reliability",
        chartDescription: "This chart tracks whether coaching goals are documented with usable evidence and reviewed on time.",
        chartMetricLabel: "% of documented coaching goals",
        chartData: [
          { label: "Goal specific", value: 90, benchmark: 83 },
          { label: "Evidence attached", value: 86, benchmark: 79 },
          { label: "Follow-up on time", value: 82, benchmark: 76 },
        ],
        chartInsight: "The biggest drop-off happens when goals sound encouraging but are never tied to concrete proof or a real follow-up date.",
        coachPrompts: [
          "Which part of the goal made it most measurable, and how will you know the learner understood it the same way you did?",
          "What documentation detail will make the next follow-up easier to lead with evidence instead of memory?",
        ],
        reflectionPrompts: [
          "Where do your coaching goals become too broad to revisit honestly?",
          "How would stronger documentation change the quality of your next accountability conversation?",
        ],
        resourceActions: [
          { label: "SMART goal worksheet", detail: "Use the worksheet to define the behavior, proof source, and review cadence before closing the coaching conversation." },
          { label: "Documentation recap", detail: "Capture the goal in language the learner can repeat back and act on later." },
          { label: "Follow-up cadence planner", detail: "Choose the review interval and evidence source for the next coaching checkpoint." },
        ],
      });
    case "mod-dl-2":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Turning trend movement into actionable insight",
        heroSummary: "This lesson helps leaders convert data movement into root-cause questions, priority choices, and credible next actions instead of stopping at dashboard commentary.",
        evidenceLabel: "Data-led leadership curriculum mapped into a module-aware action-planning insight lesson",
        deckTitle: "Unlocking the Power of Data",
        accentColor: "#8B5CF6",
        lessonTitle: "What makes an insight actionable",
        lessonNarrative: "An insight is only useful when the leader can explain what changed, why it matters operationally, and what decision should happen next because of the evidence.",
        lessonBullets: [
          "Describe the movement in practical operational terms before proposing action.",
          "Connect the trend to the likely behavior, workflow, or process pressure behind it.",
          "Choose the next question or intervention the data is strong enough to support right now.",
        ],
        workflowTitle: "Root-cause questions before rollout",
        workflowNarrative: "Actionable insight slows leaders down just enough to distinguish the first visible trend from the true operational decision that should follow.",
        workflowBullets: [
          "Name the root-cause question that must be answered before scaling the response.",
          "Prioritize the segment or workflow where the evidence is strongest rather than acting everywhere at once.",
          "Turn the conclusion into one next action that can be reviewed for impact later.",
        ],
        transferTitle: "How to prove the data changed the next move",
        transferNarrative: "The learner should leave able to document the trend, the operational question, and the specific action that followed from the evidence review.",
        transferBullets: [
          "Capture one trend and the root-cause question it created.",
          "Record the action chosen because of the evidence, not because it felt familiar.",
          "Review the next reporting cycle to confirm whether the action improved the targeted signal.",
        ],
        scenarioTitle: "Insight-to-action leadership review",
        scenarioSituation: "A readiness score is slipping across two teams, but the patterns differ by queue and leader rhythm. The executive must identify the right question, choose the first action, and avoid a generic response plan.",
        learnerTask: "Explain the trend, define the root-cause question, and choose the first action the data genuinely supports.",
        successSignals: [
          "The trend is translated into an operational question before action is proposed.",
          "The chosen response targets the area where the evidence is strongest.",
          "A review point is named so the action can be tested in the next cycle.",
        ],
        chartTitle: "Insight-to-action conversion quality",
        chartDescription: "This chart shows whether leaders are turning trend movement into clear questions, targeted actions, and reviewable follow-through.",
        chartMetricLabel: "% of leadership reviews",
        chartData: [
          { label: "Question defined", value: 88, benchmark: 80 },
          { label: "Target narrowed", value: 82, benchmark: 76 },
          { label: "Action reviewable", value: 79, benchmark: 73 },
        ],
        chartInsight: "Action quality improves when leaders let the trend create the next question before they let it create a company-wide reaction.",
        coachPrompts: [
          "What root-cause question did the data create, and how did that change the action you would have taken first?",
          "Which review point will tell you whether the chosen action was actually supported by the trend?",
        ],
        reflectionPrompts: [
          "Where do you move from trend to action too quickly in your current reporting rhythm?",
          "How would clearer question-setting improve the next executive review you lead?",
        ],
        resourceActions: [
          { label: "Insight framing guide", detail: "Translate the trend into a root-cause question before the next decision meeting." },
          { label: "Action-priority worksheet", detail: "Choose the first action based on evidence strength, segment relevance, and reviewability." },
          { label: "Impact review recap", detail: "Document the metric, action, and next check so the follow-up stays evidence-based." },
        ],
      });
    case "mod-lfs-2":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Secure verification that protects trust and flow",
        heroSummary: "This lesson turns regulated verification and handoff language into a visible trust-building sequence so secure steps feel controlled, clear, and professionally owned.",
        evidenceLabel: "Regulated service curriculum mapped into a module-aware secure-verification and handoff lesson",
        deckTitle: "Soft Skills & Customer/Patient Service Foundation",
        accentColor: "#0EA5E9",
        lessonTitle: "What secure verification sounds like when it is done well",
        lessonNarrative: "Verification discipline should make the customer feel guided and protected rather than stalled, even when the process requires firm secure controls.",
        lessonBullets: [
          "Explain the reason for the secure step in plain language before the customer feels blocked by it.",
          "Move through the verification points with calm precision instead of rushed compliance language.",
          "Keep ownership visible so the customer knows who is guiding the process from start to finish.",
        ],
        workflowTitle: "Secure handoffs without confidence loss",
        workflowNarrative: "A regulated handoff works when the learner protects the secure step, states the owner clearly, and makes the next update feel reliable instead of uncertain.",
        workflowBullets: [
          "Confirm which step must happen before any transfer or escalation can continue.",
          "Use one handoff phrase that names the next owner and the protected reason for the step.",
          "Close with a next-update statement that preserves trust without overpromising timing or outcome.",
        ],
        transferTitle: "How to prove secure verification held under pressure",
        transferNarrative: "The learner should leave ready to document where the verification step protected the workflow and where the handoff still sounded calm, accurate, and trustworthy.",
        transferBullets: [
          "Save one regulated interaction where the secure step was explained before resistance escalated.",
          "Document the handoff phrase that kept ownership visible through the transition.",
          "Use the example in the next compliance or manager review to show that trust held without bypassing the process.",
        ],
        scenarioTitle: "Secure-handoff compliance review",
        scenarioSituation: "A customer needs an urgent update but becomes frustrated when verification is required before the case can move to another team. The learner must keep the process secure and the handoff understandable.",
        learnerTask: "Explain the verification step, name the next owner, and confirm the protected next update without sounding evasive or uncertain.",
        successSignals: [
          "The secure requirement is explained before the transfer feels blocked.",
          "The next owner is named clearly during the handoff.",
          "The close preserves trust while staying accurate about what can and cannot happen next.",
        ],
        chartTitle: "Secure verification and handoff reliability",
        chartDescription: "This chart measures whether regulated interactions keep trust, security, and next-step clarity aligned.",
        chartMetricLabel: "% of regulated interactions",
        chartData: [
          { label: "Verification explained", value: 87, benchmark: 80 },
          { label: "Owner stated", value: 83, benchmark: 76 },
          { label: "Close trustworthy", value: 80, benchmark: 73 },
        ],
        chartInsight: "Trust rises when the customer hears why the secure step matters and who still owns the outcome after the handoff.",
        coachPrompts: [
          "Which phrase helped the customer understand the secure step instead of experiencing it as a blocker?",
          "How did you keep ownership visible while the case moved through a protected handoff?",
        ],
        reflectionPrompts: [
          "Where does your regulated verification language feel most likely to sound cold or rushed?",
          "How would stronger owner statements improve your next secure handoff?",
        ],
        resourceActions: [
          { label: "Secure verification opener", detail: "Review the phrases that explain why the protected step matters before resistance grows." },
          { label: "Handoff ownership guide", detail: "Use the guide to name the next owner and confirm the protected transition clearly." },
          { label: "Compliance trust check", detail: "Bring one saved example into the next compliance or coaching review." },
        ],
      });
    case "mod-lfp-2":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Calibration conversations that keep coaching fair",
        heroSummary: "This lesson turns calibration and QA evidence into a defensible leadership rhythm so coaching actions stay consistent, explainable, and protected from bias.",
        evidenceLabel: "Performance-management curriculum mapped into a module-aware calibration and QA-driven coaching lesson",
        deckTitle: "Utilizing Performance Management to Maximize Results",
        accentColor: "#FB7185",
        lessonTitle: "What a strong calibration discussion includes",
        lessonNarrative: "Calibration is the discipline that checks whether the evidence, the score interpretation, and the coaching response actually match before leaders act on performance concerns.",
        lessonBullets: [
          "Bring comparable evidence into the discussion before defending the first interpretation.",
          "Separate score movement from the broader assumptions that can distort coaching decisions.",
          "Use calibration to improve the coaching choice, not simply to win agreement.",
        ],
        workflowTitle: "QA evidence into fair coaching action",
        workflowNarrative: "Leaders coach more fairly when calibration tests the score story, validates the pattern, and matches the intervention to the actual performance problem.",
        workflowBullets: [
          "Compare the QA finding against another reviewer, period, or case type before finalizing the coaching response.",
          "Name what makes the issue a skill, consistency, or accountability pattern before assigning the intervention.",
          "Choose the coaching action only after the calibration check confirms the pattern is real.",
        ],
        transferTitle: "How to prove the calibration improved the coaching move",
        transferNarrative: "The learner should leave able to document the QA evidence, the calibration check, and the reason the final coaching action is fair enough to defend.",
        transferBullets: [
          "Save one QA example and the comparison used to validate the pattern.",
          "Record how the calibration check changed or confirmed the coaching action.",
          "Use the note in the next manager review to show why the decision was fair and evidence-led.",
        ],
        scenarioTitle: "Calibration-led coaching review",
        scenarioSituation: "A manager believes a learner needs corrective action after a low QA trend, but another reviewer sees a narrower skill issue. The leader must calibrate the evidence and choose the right coaching response.",
        learnerTask: "Summarize the QA evidence, state the calibration check, and select the coaching action that best fits the validated pattern.",
        successSignals: [
          "A calibration step is named before the intervention is finalized.",
          "The pattern is described precisely enough to support a fair coaching choice.",
          "The final action matches the validated issue rather than the first reaction.",
        ],
        chartTitle: "Calibration-driven coaching quality",
        chartDescription: "This chart tracks whether leaders are validating QA patterns before assigning corrective coaching action.",
        chartMetricLabel: "% of calibrated reviews",
        chartData: [
          { label: "Evidence compared", value: 84, benchmark: 78 },
          { label: "Pattern validated", value: 80, benchmark: 74 },
          { label: "Action matched", value: 82, benchmark: 76 },
        ],
        chartInsight: "Coaching fairness improves when calibration is used to test the pattern, not to defend a decision that was already made.",
        coachPrompts: [
          "What comparison or second look protected this coaching decision from bias or overreaction?",
          "How did the calibration step change the final coaching action you selected?",
        ],
        reflectionPrompts: [
          "Where in your current performance process do you tend to finalize the action before the calibration is complete?",
          "How would stronger QA comparison discipline improve the next leadership review you lead?",
        ],
        resourceActions: [
          { label: "Calibration review guide", detail: "Use the guide to compare evidence and test the pattern before assigning the coaching action." },
          { label: "QA evidence worksheet", detail: "Document the score signal, the comparison point, and the final validated pattern." },
          { label: "Fair-action recap", detail: "Summarize why the final coaching move matched the evidence more accurately than the first reaction." },
        ],
      });
    case "mod-hce-2":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Designing reward rhythms teams will trust",
        heroSummary: "This lesson helps leaders build rewards, games, and recognition cycles that feel fair, motivating, and sustainable rather than random or short-lived.",
        evidenceLabel: "Engagement-design curriculum mapped into a module-aware reward-rhythm and trust lesson",
        deckTitle: "Gamification for Remote Teams: Engaging and Empowering Leaders",
        accentColor: "#22C55E",
        lessonTitle: "What a trusted reward system is built on",
        lessonNarrative: "Reward design works when the team can predict what earns recognition, why it matters, and how often the reinforcement will show up without favoritism.",
        lessonBullets: [
          "Define the target behavior before choosing the reward mechanic or prize.",
          "Make the eligibility rules visible enough that the team sees the system as fair.",
          "Choose a cadence the leader can sustain without flooding the team with noise.",
        ],
        workflowTitle: "Game mechanics with fairness and rhythm",
        workflowNarrative: "A usable engagement system connects the reward rule, the review rhythm, and the measurement signal so motivation feels structured instead of arbitrary.",
        workflowBullets: [
          "Match the game or reward mechanic to a behavior the team can repeat often.",
          "Set a review cadence that keeps the reinforcement noticeable but not exhausting.",
          "Track one engagement or performance signal to prove the system is reinforcing the right habit.",
        ],
        transferTitle: "How to prove the reward rhythm is working",
        transferNarrative: "The learner should leave able to explain the reward rule, the cadence, and the measurement plan before launching the next recognition cycle.",
        transferBullets: [
          "Document the behavior, the reward trigger, and the cadence in one visible plan.",
          "Record the fairness check that will protect the system from favoritism.",
          "Review one engagement signal after the first cycle to confirm the rhythm is reinforcing the right pattern.",
        ],
        scenarioTitle: "Remote-team reward redesign",
        scenarioSituation: "A recognition program has lost momentum because rewards feel inconsistent and not everyone trusts how winners are chosen. The leader must redesign the cycle so the team sees the system as fair and worth engaging in.",
        learnerTask: "Define the target behavior, explain the reward rhythm, and state how the team will know the system is fair and effective.",
        successSignals: [
          "The target behavior is named before any reward mechanic is introduced.",
          "The cadence is realistic enough for leaders to maintain consistently.",
          "A fairness or measurement check is included before launch.",
        ],
        chartTitle: "Reward-rhythm trust and adoption",
        chartDescription: "This chart shows whether recognition systems are earning trust, sustaining cadence, and reinforcing the intended behavior over time.",
        chartMetricLabel: "% of engagement cycles",
        chartData: [
          { label: "Rule understood", value: 88, benchmark: 81 },
          { label: "Cadence sustained", value: 80, benchmark: 74 },
          { label: "Trust retained", value: 78, benchmark: 72 },
        ],
        chartInsight: "Recognition systems remain credible when the rule is predictable, the cadence is stable, and the fairness check is visible before launch.",
        coachPrompts: [
          "Which part of the reward design makes the system easiest for the team to trust?",
          "How will you know the cadence is reinforcing behavior instead of creating novelty fatigue?",
        ],
        reflectionPrompts: [
          "Where could unfairness or inconsistency creep into your current recognition cycle?",
          "How would clearer reward rules change engagement in your next team rhythm?",
        ],
        resourceActions: [
          { label: "Reward-rule template", detail: "Define the behavior, trigger, and fairness check before launching the next recognition cycle." },
          { label: "Cadence planner", detail: "Choose the review rhythm that fits the team’s workload and keeps reinforcement visible." },
          { label: "Engagement impact recap", detail: "Track one signal after the first cycle to confirm the design is working as intended." },
        ],
      });
    case "mod-hcd-2":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Distributed-team rhythm leaders can reinforce",
        heroSummary: "This lesson helps executives turn cadence, communication rhythm, and visibility habits into an operating model that keeps distributed teams aligned and engaged.",
        evidenceLabel: "Executive culture curriculum mapped into a module-aware distributed-team rhythm lesson",
        deckTitle: "Culture Momentum and Readiness Visibility",
        accentColor: "#F97316",
        lessonTitle: "What a healthy distributed-team rhythm includes",
        lessonNarrative: "Distributed teams need visible leadership rhythm: clear check-ins, predictable reinforcement, and communication patterns that keep people connected to priorities and progress.",
        lessonBullets: [
          "Define the leadership cadence that keeps distributed work visible instead of fragmented.",
          "Use communication rituals that reinforce priorities without overwhelming the team.",
          "Make reinforcement and recognition part of the operating rhythm, not an occasional add-on.",
        ],
        workflowTitle: "Cadence, visibility, and follow-through",
        workflowNarrative: "A distributed-team rhythm becomes credible when leaders can show how meetings, updates, and reinforcement habits connect to readiness and engagement outcomes.",
        workflowBullets: [
          "Name the recurring rhythm that keeps priorities and barriers visible across locations or schedules.",
          "Clarify which update, check-in, or signal owners will review between formal meetings.",
          "Carry one reinforcement habit through the cadence so momentum is sustained over time.",
        ],
        transferTitle: "How to prove the rhythm is working across the team",
        transferNarrative: "The learner should leave able to document the cadence, the visibility rule, and the follow-up check that will confirm the distributed-team rhythm is supporting readiness.",
        transferBullets: [
          "Record the check-in cadence and the operating purpose of each touchpoint.",
          "Document the visibility rule that keeps progress and risk reviewable between meetings.",
          "Bring one readiness or engagement signal into the next executive review to test whether the rhythm is working.",
        ],
        scenarioTitle: "Distributed-team operating review",
        scenarioSituation: "A hybrid team is missing follow-through and momentum because priorities are communicated inconsistently across sites and schedules. The executive must define a clearer operating rhythm without adding unnecessary meeting weight.",
        learnerTask: "State the leadership cadence, explain the visibility rule, and identify the signal that will prove the new rhythm is helping the team stay aligned.",
        successSignals: [
          "The cadence is specific enough that leaders and teams would experience it consistently.",
          "A visibility rule is named to keep work reviewable between check-ins.",
          "A measurable signal is selected to validate whether the rhythm is improving readiness or engagement.",
        ],
        chartTitle: "Distributed-team rhythm stability",
        chartDescription: "This chart measures whether leadership cadence, visibility, and reinforcement habits are strengthening distributed-team alignment over time.",
        chartMetricLabel: "% of operating cycles",
        chartData: [
          { label: "Cadence clear", value: 82, benchmark: 75 },
          { label: "Visibility sustained", value: 79, benchmark: 72 },
          { label: "Momentum reinforced", value: 76, benchmark: 69 },
        ],
        chartInsight: "Distributed teams stay aligned when leaders make the rhythm predictable enough to trust and light enough to sustain.",
        coachPrompts: [
          "Which part of the cadence keeps distributed work most visible between meetings or sites?",
          "How will you confirm the new rhythm improves readiness rather than simply increasing communication volume?",
        ],
        reflectionPrompts: [
          "Where does your current leadership rhythm leave distributed teams guessing about priorities or progress?",
          "What one visibility rule would make your next executive cadence easier to sustain across locations?",
        ],
        resourceActions: [
          { label: "Cadence map", detail: "Define the recurring touchpoints, their purpose, and the visibility signal each one should protect." },
          { label: "Distributed-team check-in guide", detail: "Use the guide to keep updates short, consistent, and tied to real operating decisions." },
          { label: "Readiness rhythm recap", detail: "Bring one alignment or engagement signal into the next executive review to test the model." },
        ],
      });
    case "mod-wp-3":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Calibration habits that make QA scoring fair",
        heroSummary: "This lesson helps quality leaders distinguish between evidence-based calibration and opinion-driven score defense so QA reviews become more consistent and coachable.",
        evidenceLabel: "Quality Assurance Essentials curriculum mapped into a module-aware calibration and score-interpretation lesson",
        deckTitle: "Quality Assurance Essentials",
        accentColor: "#0F766E",
        lessonTitle: "What fair score interpretation depends on",
        lessonNarrative: "Calibration is not just comparing scores. It is the discipline of checking whether evidence was weighed consistently, the standard was understood the same way, and coaching consequences match the validated pattern.",
        lessonBullets: [
          "Anchor every score conversation to the observable evidence before discussing judgment.",
          "Use the standard and comparison examples to test whether the score logic was applied consistently.",
          "Separate calibration from punishment so the discussion improves reliability instead of creating defensiveness.",
        ],
        workflowTitle: "How to run a calibration review leaders can trust",
        workflowNarrative: "Strong calibration moves through the evidence, the standard, and the final score decision in a predictable sequence so reviewers can explain why the result is fair.",
        workflowBullets: [
          "Bring the scored interaction, the standard, and one comparison example into the same review.",
          "State where the original interpretation was sound and where it drifted from the standard.",
          "Document the validated score and the coaching implication that follows from the corrected pattern.",
        ],
        transferTitle: "How to prove calibration improved the decision",
        transferNarrative: "The learner should leave able to show which evidence point changed the interpretation, why the final score is fairer, and how that affects the next coaching step.",
        transferBullets: [
          "Record the evidence point that most influenced the score discussion.",
          "Summarize the standard language that resolved the disagreement.",
          "Tie the final decision to the coaching action the agent will actually experience next.",
        ],
        scenarioTitle: "QA calibration and score challenge",
        scenarioSituation: "Two reviewers disagree on whether a low score reflects an actual behavior gap or a harsh interpretation of the standard. The quality lead must facilitate calibration without turning the meeting into opinion trading.",
        learnerTask: "Explain how you would use evidence, standards, and comparison examples to land on a fair score and a justified coaching action.",
        successSignals: [
          "The evidence is reviewed before anyone argues for a score outcome.",
          "A standard or comparison example is used to settle the disagreement.",
          "The final coaching action is explicitly tied to the calibrated pattern.",
        ],
        chartTitle: "Calibration reliability by review step",
        chartDescription: "This chart shows whether QA teams are using evidence, standards, and follow-through in a way that improves scoring fairness over time.",
        chartMetricLabel: "% of scored reviews",
        chartData: [
          { label: "Evidence aligned", value: 90, benchmark: 83 },
          { label: "Standards applied consistently", value: 84, benchmark: 78 },
          { label: "Coaching implication documented", value: 76, benchmark: 69 },
        ],
        chartInsight: "Calibration becomes credible when reviewers can explain the score through the evidence and the standard, not through seniority or preference.",
        coachPrompts: [
          "What part of the review most often turns a score discussion into opinion instead of calibration?",
          "How will you prove to agents that the final score is more reliable than the original reaction?",
        ],
        reflectionPrompts: [
          "Where in your current QA flow does fairness depend too much on who is in the room?",
          "What would make your next calibration review easier to defend to a skeptical coach or agent?",
        ],
        resourceActions: [
          { label: "Calibration meeting guide", detail: "Use the guide to sequence evidence, standards, and outcome decisions consistently in each review." },
          { label: "Score-defense checklist", detail: "Test whether the interpretation is grounded in the standard before finalizing the rating." },
          { label: "Fairness recap template", detail: "Capture the validated score logic and the coaching action that follows from it." },
        ],
      });
    case "mod-rtc-3":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Accountability conversations that match the learner",
        heroSummary: "This lesson helps coaches tailor accountability conversations to learning style, readiness, and follow-through risk so commitments feel relevant and durable instead of generic.",
        evidenceLabel: "Real-time Coaching curriculum mapped into a module-aware learning-style and accountability conversation lesson",
        deckTitle: "Real-Time Coaching",
        accentColor: "#7C3AED",
        lessonTitle: "What personalized accountability actually sounds like",
        lessonNarrative: "Accountability improves when the coach adapts the conversation to how the learner processes feedback, remembers commitments, and responds to challenge without losing clarity or standards.",
        lessonBullets: [
          "Match the coaching prompt to the learner’s style of processing, not just the coach’s preferred language.",
          "Keep the accountability expectation specific enough that the learner can restate it independently.",
          "Use the close of the conversation to confirm ownership, timing, and support needs.",
        ],
        workflowTitle: "From learning style to accountable follow-through",
        workflowNarrative: "A useful coaching rhythm connects the feedback delivery style, the learner’s response, and the next accountability checkpoint so the commitment holds after the meeting ends.",
        workflowBullets: [
          "Identify whether the learner needs demonstration, reflection time, or direct challenge to process the coaching point.",
          "Translate the feedback into one visible behavior commitment with an owner and a timeline.",
          "Close with a follow-up check that tests whether the learner can apply the commitment independently.",
        ],
        transferTitle: "How to prove the accountability conversation worked",
        transferNarrative: "The learner should leave able to describe the tailored coaching move, the exact commitment, and the checkpoint that will show whether the behavior changed.",
        transferBullets: [
          "Record which coaching style best matched the learner in the conversation.",
          "Write the commitment in observable terms instead of motivational language.",
          "Name the follow-up evidence that will confirm the learner owned the action.",
        ],
        scenarioTitle: "Personalized accountability reset",
        scenarioSituation: "A high-potential employee agrees with coaching in the moment but repeatedly fails to apply the change afterward. The coach must adapt the conversation so ownership becomes clearer and more durable.",
        learnerTask: "Describe how you would tailor the accountability conversation to the learner’s style and define the checkpoint that will prove follow-through.",
        successSignals: [
          "The coaching approach is adapted to the learner’s processing style rather than delivered generically.",
          "The commitment is observable, time-bound, and restated by the learner.",
          "A follow-up check is named to verify behavior change after the conversation.",
        ],
        chartTitle: "Accountability follow-through by coaching style fit",
        chartDescription: "This chart shows whether matching coaching style to learner need improves ownership, retention, and follow-through after the session ends.",
        chartMetricLabel: "% of coaching cycles",
        chartData: [
          { label: "Commitment restated", value: 89, benchmark: 82 },
          { label: "Follow-up kept", value: 81, benchmark: 74 },
          { label: "Behavior retained", value: 73, benchmark: 67 },
        ],
        chartInsight: "Learners follow through more consistently when the coach adapts the conversation format without lowering the accountability standard.",
        coachPrompts: [
          "How do you currently tell whether the learner understood the commitment or only agreed politely?",
          "Which learning-style adjustment would make your next accountability conversation more likely to stick?",
        ],
        reflectionPrompts: [
          "Where do your current coaching habits favor your style over the learner’s needs?",
          "What would better follow-through sound like in your next accountability conversation?",
        ],
        resourceActions: [
          { label: "Coaching-style quick guide", detail: "Match the conversation structure to the learner’s need for challenge, reflection, or demonstration." },
          { label: "Ownership statement template", detail: "Capture the learner’s commitment in language they can restate and act on independently." },
          { label: "Follow-through checkpoint planner", detail: "Define the evidence and timing that will verify whether the coaching conversation worked." },
        ],
      });
    case "mod-dl-3":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Validating data stories before leaders act on them",
        heroSummary: "This lesson helps leaders pressure-test conclusions, compare signal sources, and build reports that support confident action instead of fragile storytelling.",
        evidenceLabel: "Unlocking the Power of Data curriculum mapped into a module-aware validation and reporting lesson",
        deckTitle: "Unlocking the Power of Data",
        accentColor: "#2563EB",
        lessonTitle: "What makes a conclusion decision-ready",
        lessonNarrative: "A conclusion becomes useful when leaders can show the evidence source, the comparison that tested it, and the reason the final recommendation still holds under scrutiny.",
        lessonBullets: [
          "Treat the first pattern you notice as a hypothesis, not a finished conclusion.",
          "Compare time periods, segments, or supporting signals before naming the root cause.",
          "Build the report so the recommendation is traceable to the evidence that supports it.",
        ],
        workflowTitle: "How to validate the story before presenting it",
        workflowNarrative: "Strong reporting moves from signal to comparison to recommendation so decision-makers can see what was tested and why the final conclusion is credible.",
        workflowBullets: [
          "Start with the signal that created the question, not the answer you hope to prove.",
          "Run one comparison that could disconfirm the initial interpretation.",
          "Present the recommendation with the evidence trail and any remaining uncertainty clearly stated.",
        ],
        transferTitle: "How to prove the report is trustworthy",
        transferNarrative: "The learner should leave able to show what was validated, what changed after comparison, and why the recommendation deserves action now.",
        transferBullets: [
          "Document the original observation and the comparison test that challenged it.",
          "Name the evidence that strengthened or weakened the conclusion.",
          "State the recommendation in a way that shows both action and confidence level.",
        ],
        scenarioTitle: "Executive report review before escalation",
        scenarioSituation: "A leader wants to escalate a staffing decision based on a worrying KPI trend, but the analysis has not yet been pressure-tested across teams and time periods. The analyst must validate the story before the meeting.",
        learnerTask: "Explain how you would test the conclusion, improve the report, and present the recommendation with the right level of confidence.",
        successSignals: [
          "A comparison or disconfirming test is used before finalizing the recommendation.",
          "The report makes the evidence trail visible to the audience.",
          "The recommendation reflects both the signal strength and the remaining uncertainty.",
        ],
        chartTitle: "Decision-ready reporting quality",
        chartDescription: "This chart shows whether reports are being validated across sources and time periods before leaders act on the recommendation.",
        chartMetricLabel: "% of leadership reports",
        chartData: [
          { label: "Signal pressure-tested", value: 87, benchmark: 79 },
          { label: "Evidence trail visible", value: 83, benchmark: 76 },
          { label: "Recommendation accepted", value: 74, benchmark: 68 },
        ],
        chartInsight: "Leaders act faster on reports that make the validation work visible instead of forcing the audience to infer it.",
        coachPrompts: [
          "Which comparison or alternative explanation most improves confidence in the recommendation?",
          "How will you show the audience that the report is rigorous without overwhelming them with raw detail?",
        ],
        reflectionPrompts: [
          "Where do your current reports jump from signal to answer too quickly?",
          "What one validation step would make your next leadership report easier to defend?",
        ],
        resourceActions: [
          { label: "Validation sequence guide", detail: "Use the guide to move from signal to comparison to recommendation in a repeatable order." },
          { label: "Evidence-trail report template", detail: "Present the key comparison, the tested conclusion, and the action recommendation together." },
          { label: "Decision-confidence recap", detail: "Summarize why the recommendation is strong enough to act on and where uncertainty remains." },
        ],
      });
    case "mod-lfs-3":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Reassurance language that protects trust under pressure",
        heroSummary: "This lesson helps frontline teams choose phrases that calm the interaction, preserve compliance, and build trust without overpromising or sounding scripted.",
        evidenceLabel: "Regulated service curriculum mapped into a module-aware trust-building reassurance lesson",
        deckTitle: "Soft Skills & Customer/Patient Service Foundation",
        accentColor: "#0EA5E9",
        lessonTitle: "What trust-building reassurance includes",
        lessonNarrative: "Effective reassurance names what the team member can do, acknowledges the emotion or disruption, and keeps the message credible inside the rules of the environment.",
        lessonBullets: [
          "Use reassurance phrases that clarify support without promising outcomes you cannot control.",
          "Pair empathy with the next safe action so the interaction feels steady, not vague.",
          "Choose language the customer or patient can trust even when the issue cannot be resolved immediately.",
        ],
        workflowTitle: "From tension to credible reassurance",
        workflowNarrative: "A strong reassurance move connects acknowledgment, action clarity, and compliance-safe wording so the interaction feels calm and reliable.",
        workflowBullets: [
          "Name the concern in language that shows the person was heard accurately.",
          "Explain the safe next step without expanding beyond what the process allows.",
          "Close with wording that reinforces support and keeps trust intact during the wait or handoff.",
        ],
        transferTitle: "How to prove the phrase choice is working",
        transferNarrative: "The learner should leave able to explain why the phrase is empathetic, compliant, and useful enough to reduce tension in the moment.",
        transferBullets: [
          "Document the exact phrase that balances empathy and accuracy.",
          "Tie the reassurance language to a next step the team can genuinely deliver.",
          "Check whether the wording would still sound credible if repeated under escalation pressure.",
        ],
        scenarioTitle: "Regulated-service reassurance reset",
        scenarioSituation: "A caller is anxious and frustrated because they feel bounced between teams. The frontline employee must calm the situation using language that builds trust without making unsafe promises.",
        learnerTask: "Choose the reassurance approach, explain the compliant next step, and show how the wording keeps trust intact while the case moves forward.",
        successSignals: [
          "The reassurance phrase acknowledges the concern without exaggerating certainty.",
          "The next step is concrete and still compliant with the process.",
          "The closing language strengthens trust instead of sounding dismissive or scripted.",
        ],
        chartTitle: "Trust-safe reassurance performance",
        chartDescription: "This chart shows whether reassurance language is reducing friction while preserving credibility in regulated conversations.",
        chartMetricLabel: "% of reviewed interactions",
        chartData: [
          { label: "Concern acknowledged clearly", value: 91, benchmark: 84 },
          { label: "Promise stayed compliant", value: 86, benchmark: 80 },
          { label: "Trust maintained through handoff", value: 78, benchmark: 71 },
        ],
        chartInsight: "Trust rises when reassurance language is both emotionally steady and operationally honest.",
        coachPrompts: [
          "Which reassurance phrase would calm this interaction without implying a result you cannot guarantee?",
          "How will you tell whether the wording reduced tension or only delayed the frustration?",
        ],
        reflectionPrompts: [
          "Where does your current reassurance language drift into vagueness or overpromising?",
          "What phrase would make your next difficult call feel more supportive and still fully credible?",
        ],
        resourceActions: [
          { label: "Trust-safe phrase bank", detail: "Use the bank to choose reassuring language that remains accurate under pressure." },
          { label: "Compliance wording guide", detail: "Check whether the next-step explanation stays within process while sounding supportive." },
          { label: "Reassurance practice recap", detail: "Review the phrases that reduced tension most effectively in recent regulated interactions." },
        ],
      });
    case "mod-lfp-3":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Performance plans leaders can tailor and sustain",
        heroSummary: "This lesson helps leaders move from generic corrective plans to role-specific performance rituals that improve follow-through, fairness, and coaching clarity over time.",
        evidenceLabel: "Performance-management curriculum mapped into a module-aware tailored performance-plan lesson",
        deckTitle: "Utilizing Performance Management to Maximize Results",
        accentColor: "#A855F7",
        lessonTitle: "What a tailored performance plan must include",
        lessonNarrative: "Useful performance plans are specific to the employee’s pattern, connected to leadership rhythm, and structured so improvement can be reviewed without ambiguity or drift.",
        lessonBullets: [
          "Build the plan around the actual pattern rather than a generic list of expectations.",
          "Pair each expectation with a leadership ritual that reinforces review and support.",
          "Keep the plan measurable enough that progress can be seen before the next escalation point.",
        ],
        workflowTitle: "From diagnosis to performance ritual",
        workflowNarrative: "Leaders create stronger improvement plans when they connect the performance diagnosis, the tailored action, and the operating rhythm that will keep the plan alive.",
        workflowBullets: [
          "Start with the specific performance pattern that justifies the plan.",
          "Choose one or two tailored actions the employee can practice with coaching support.",
          "Define the leadership ritual that will review progress, remove blockers, and protect accountability.",
        ],
        transferTitle: "How to prove the plan is more than paperwork",
        transferNarrative: "The learner should leave able to show why the plan fits the employee, how leaders will reinforce it, and what signal will confirm the plan is working.",
        transferBullets: [
          "State the pattern the plan is designed to improve and why it matters.",
          "Document the leadership ritual that will keep the plan active each week.",
          "Name the signal that will show whether the employee is actually improving against the plan.",
        ],
        scenarioTitle: "Tailored performance plan redesign",
        scenarioSituation: "A supervisor has used the same improvement-plan template for multiple employees, but the plans are not changing behavior. The leader must redesign one plan so it fits the employee’s actual gap and coaching rhythm.",
        learnerTask: "Explain how you would tailor the plan, define the leadership ritual, and choose the evidence that will prove the plan is working.",
        successSignals: [
          "The plan is tailored to the employee’s real performance pattern instead of a generic template.",
          "A recurring leadership ritual is named to keep support and accountability active.",
          "The success measure makes progress visible before the next escalation step.",
        ],
        chartTitle: "Performance-plan follow-through strength",
        chartDescription: "This chart shows whether tailored plans and leadership rituals are improving plan adherence and observable behavior change over time.",
        chartMetricLabel: "% of performance plans",
        chartData: [
          { label: "Plan tailored to pattern", value: 88, benchmark: 80 },
          { label: "Leadership rhythm sustained", value: 79, benchmark: 72 },
          { label: "Improvement visible", value: 71, benchmark: 65 },
        ],
        chartInsight: "Performance plans work better when leaders design them as an operating rhythm, not a one-time document.",
        coachPrompts: [
          "What would make this plan feel clearly different from the generic template used before?",
          "Which leadership ritual will best protect follow-through if the employee starts to drift again?",
        ],
        reflectionPrompts: [
          "Where do your current performance plans rely on paperwork more than reinforcement?",
          "What one leadership habit would make your next improvement plan easier to sustain fairly?",
        ],
        resourceActions: [
          { label: "Tailored plan template", detail: "Build the plan around the actual pattern, the target behavior, and the evidence that will show improvement." },
          { label: "Leadership ritual planner", detail: "Choose the meeting, observation, or feedback rhythm that will keep the plan active." },
          { label: "Performance proof recap", detail: "Track the signal that demonstrates the plan is changing behavior rather than only documenting concern." },
        ],
      });
    case "mod-hce-3":
      return buildCurriculumMigrationPresentation(module, {
        heroTitle: "Measuring engagement so the program keeps improving",
        heroSummary: "This lesson helps leaders move beyond launching games and rewards into measuring what is working, what is fading, and how to iterate the program without losing trust.",
        evidenceLabel: "Engagement-design curriculum mapped into a module-aware measurement and iteration lesson",
        deckTitle: "Gamification for Remote Teams: Engaging and Empowering Leaders",
        accentColor: "#22C55E",
        lessonTitle: "What engagement measurement needs to capture",
        lessonNarrative: "Measurement matters because engagement programs often feel successful before the evidence confirms they are reinforcing the right behavior consistently across the team.",
        lessonBullets: [
          "Track signals that show both participation and behavior change, not novelty alone.",
          "Review the program often enough to spot drop-off before trust erodes.",
          "Use the measurement cycle to refine the design instead of defending the original launch plan.",
        ],
        workflowTitle: "From engagement signal to program iteration",
        workflowNarrative: "A strong iteration rhythm connects the metric review, the design adjustment, and the communication plan so teams understand why the program is changing.",
        workflowBullets: [
          "Choose the one or two signals that best reflect the behavior the program is trying to reinforce.",
          "Review the data on a steady cadence to spot momentum loss or uneven participation.",
          "Adjust one design element at a time and communicate the reason clearly to the team.",
        ],
        transferTitle: "How to prove the program is learning, not drifting",
        transferNarrative: "The learner should leave able to show what was measured, what changed, and how the next iteration keeps the program credible and useful.",
        transferBullets: [
          "Document the signal that triggered the redesign or adjustment.",
          "State which program element will change and what outcome you expect to improve.",
          "Explain how the team will be told why the iteration is happening.",
        ],
        scenarioTitle: "Engagement-program redesign review",
        scenarioSituation: "A remote-team recognition program launched with strong enthusiasm, but participation is flattening and some employees question whether the program still matters. The leader must review the evidence and improve the design without losing trust.",
        learnerTask: "Describe how you would measure the program, choose the adjustment, and explain the iteration to the team.",
        successSignals: [
          "The measurement plan looks beyond participation counts to actual behavior reinforcement.",
          "The adjustment is tied to evidence rather than assumption or preference.",
          "The communication plan protects trust while explaining the reason for the change.",
        ],
        chartTitle: "Engagement-program iteration readiness",
        chartDescription: "This chart shows whether engagement leaders are measuring program quality consistently enough to make smart improvements over time.",
        chartMetricLabel: "% of engagement reviews",
        chartData: [
          { label: "Signal reviewed on cadence", value: 86, benchmark: 78 },
          { label: "Adjustment tied to evidence", value: 80, benchmark: 73 },
          { label: "Trust retained after change", value: 75, benchmark: 69 },
        ],
        chartInsight: "Teams stay engaged when leaders show that program changes come from measured learning, not from shifting whims.",
        coachPrompts: [
          "Which signal best tells you the program is reinforcing the intended behavior rather than only generating clicks?",
          "How will you explain the iteration so the team experiences it as improvement instead of inconsistency?",
        ],
        reflectionPrompts: [
          "Where does your current engagement program rely too much on enthusiasm and not enough on evidence?",
          "What one metric would help you improve your next recognition cycle more intelligently?",
        ],
        resourceActions: [
          { label: "Engagement metrics planner", detail: "Choose the signals that show both participation and behavior change in the program." },
          { label: "Iteration decision guide", detail: "Use the guide to connect the evidence review to one clear design adjustment." },
          { label: "Program-change communication recap", detail: "Explain to the team what changed, why it changed, and how the next cycle will be evaluated." },
        ],
      });
    default:
      return null;
  }
}

// Real converted slide decks for every training whose deck has been converted, so the
// lesson shows the actual uploaded PowerPoint slides instead of a generated title card.
// The slide list lives in ./slideManifest (the single place to add the rest of a deck);
// this just maps the matched deck's slides onto the player's visual shape. Modules with
// no converted deck (Real-time Coaching, Culture Momentum) return [] and keep generated
// visuals until a deck is added to the manifest.
function realDeckVisualsForModule(module: ModuleLike): TrainingDeckVisual[] {
  const deck = slideDeckForModuleId(module.id);
  if (!deck) return [];
  return deck.slides.map((slide, index) => ({
    id: `${module.id}-realdeck-${index + 1}`,
    title: slide.title ?? `${deck.sourceDeck} · ${slidePageLabel(slide.file)}`,
    caption:
      slide.caption ??
      `This slide from the ${deck.sourceDeck} deck is shown in-platform so the learner can study the original material without leaving the course.`,
    imageUrl: `/slides/${slide.file}`,
    sourceDeck: deck.sourceDeck,
    pageLabel: slidePageLabel(slide.file),
    ...(slide.scorecard ? { scorecardId: slide.scorecard } : {}),
  }));
}

// Show the full converted deck for the module whenever one exists, so every lesson
// pages through its complete PowerPoint (not a hand-picked subset). Modules with no
// converted deck keep whatever visuals the presentation already carries.
function applyRealDeckVisuals<T extends { deckVisuals: TrainingDeckVisual[] }>(presentation: T, realDecks: TrainingDeckVisual[]): T {
  if (!realDecks.length) return presentation;
  return { ...presentation, deckVisuals: realDecks };
}

export function getTrainingPresentation(module: ModuleLike, journeyTitle: string, competencyGap: string): TrainingPresentation {
  const mapped = trainingPresentationByModuleId[module.id] ?? buildExpandedCurriculumMigrationPresentation(module);
  // Prefer the real converted deck for this module over a generated title card.
  const realDecks = realDeckVisualsForModule(module);

  if (mapped) {
    return enrichPresentation(module, applyRealDeckVisuals(mapped, realDecks));
  }

  const moduleKeywords = `${module.title} ${module.skillFocus} ${journeyTitle} ${competencyGap}`.toLowerCase();
  const isPerformanceLeadershipFamily =
    moduleKeywords.includes("performance") ||
    moduleKeywords.includes("calibration") ||
    moduleKeywords.includes("movable middle") ||
    moduleKeywords.includes("pip") ||
    moduleKeywords.includes("improvement plan") ||
    moduleKeywords.includes("discipline") ||
    moduleKeywords.includes("high performer");
  const isCoachingLeadershipFamily =
    moduleKeywords.includes("real-time coaching") ||
    moduleKeywords.includes("coaching pillars") ||
    moduleKeywords.includes("smart goals") ||
    moduleKeywords.includes("learning styles") ||
    moduleKeywords.includes("accountability conversations") ||
    moduleKeywords.includes("self-discovery") ||
    moduleKeywords.includes("documenting coaching");
  const isLeadershipFamily =
    moduleKeywords.includes("data") ||
    moduleKeywords.includes("kpi") ||
    moduleKeywords.includes("insight") ||
    moduleKeywords.includes("trend") ||
    moduleKeywords.includes("dashboard") ||
    moduleKeywords.includes("action planning") ||
    (moduleKeywords.includes("leadership") && !isPerformanceLeadershipFamily && !isCoachingLeadershipFamily);
  const isWorkflowFamily =
    moduleKeywords.includes("qa") ||
    moduleKeywords.includes("quality") ||
    moduleKeywords.includes("workflow") ||
    moduleKeywords.includes("verification") ||
    moduleKeywords.includes("adherence") ||
    moduleKeywords.includes("documentation") ||
    moduleKeywords.includes("score");
  const isEngagementFamily =
    moduleKeywords.includes("engagement") ||
    moduleKeywords.includes("recognition") ||
    moduleKeywords.includes("gamification") ||
    moduleKeywords.includes("reward") ||
    moduleKeywords.includes("motivation") ||
    moduleKeywords.includes("remote team") ||
    moduleKeywords.includes("culture");
  const usePerformanceBiasVisual = moduleKeywords.includes("bias") || moduleKeywords.includes("archetype") || moduleKeywords.includes("segmentation");
  const useLeadershipWorkshopVisual =
    moduleKeywords.includes("false conclusions") ||
    moduleKeywords.includes("root cause") ||
    moduleKeywords.includes("trend validation") ||
    moduleKeywords.includes("dashboard reviews");
  const useWorkflowCoachingVisual = moduleKeywords.includes("coaching") || moduleKeywords.includes("listening") || moduleKeywords.includes("behavior");
  const useEngagementProgramVisual =
    moduleKeywords.includes("points") ||
    moduleKeywords.includes("badges") ||
    moduleKeywords.includes("meaningful recognition") ||
    moduleKeywords.includes("pilot");

  const fallbackDeckVisuals: TrainingDeckVisual[] = isPerformanceLeadershipFamily
    ? [
        {
          id: `${module.id}-performance-visual-1`,
          title: "Bucketing activity",
          caption: "This performance-leadership frame brings calibration and performance segmentation into the lesson as a structured activity instead of a text-only explanation.",
          imageUrl: "/slides/performance-leadership-08_61606933.png",
          sourceDeck: "Utilizing Performance Management to Maximize Results",
          pageLabel: "Slide 8",
        },
        {
          id: `${module.id}-performance-visual-2`,
          title: usePerformanceBiasVisual ? "Avoiding mislabeling and bias" : "Engaging and developing high performers",
          caption: usePerformanceBiasVisual
            ? "This bias-check visual gives calibration modules a more explicit fairness frame so leaders can compare evidence, documentation quality, and labeling discipline before deciding on next actions."
            : "The platform uses this development frame to show how performance leadership includes stretch assignment planning, mentorship, and retention strategy rather than only correction.",
          imageUrl: usePerformanceBiasVisual ? "/slides/performance-leadership-09_edfbb1ea.png" : "/slides/performance-leadership-15_3215473c.png",
          sourceDeck: "Utilizing Performance Management to Maximize Results",
          pageLabel: usePerformanceBiasVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-performance-visual-3`,
          title: "Performance conversation framing",
          caption: "A third performance deck frame is now surfaced so the module carries more of the original workshop logic into the lesson and makes calibration, development, and documentation feel like one connected system.",
          imageUrl: "/slides/performance-leadership-10_f976e1db.png",
          sourceDeck: "Utilizing Performance Management to Maximize Results",
          pageLabel: "Slide 10",
        },
        {
          id: `${module.id}-performance-visual-4`,
          title: "Improvement-plan decision ladder",
          caption: "A fourth leadership-performance visual extends the lesson with a clearer improvement ladder so supervisors can distinguish correction, coaching intensity, recognition, and development planning more explicitly.",
          imageUrl: "/manus-storage/performance-leadership-14_686d8ef6.png",
          sourceDeck: "Utilizing Performance Management to Maximize Results",
          pageLabel: "Slide 14",
        },
      ]
    : isCoachingLeadershipFamily
      ? []
    : isLeadershipFamily
      ? [
          {
            id: `${module.id}-leadership-visual-1`,
            title: "How to read KPI reports",
            caption: "This leadership deck frame brings KPI trend reading, target comparison, and outlier detection directly into the lesson so leaders can study the original visual logic in-platform.",
            imageUrl: "/slides/leadership-data-08_d8fd351a.png",
            sourceDeck: "Unlocking the Power of Data",
            pageLabel: "Slide 8",
          },
        {
          id: `${module.id}-leadership-visual-2`,
          title: useLeadershipWorkshopVisual ? "Interpreting KPI activity" : "From insight to action",
          caption: useLeadershipWorkshopVisual
            ? "This workshop-style KPI activity helps leadership modules feel more hands-on by showing how trend reading, concern detection, and next-step planning can be practiced in-platform."
            : "The lesson uses this original action-planning frame to turn analysis into a coached next move instead of leaving KPI interpretation as passive review.",
          imageUrl: useLeadershipWorkshopVisual ? "/slides/leadership-data-09_f158ab35.png" : "/slides/leadership-data-15_c9ba127f.png",
          sourceDeck: "Unlocking the Power of Data",
          pageLabel: useLeadershipWorkshopVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-leadership-visual-3`,
          title: "Examples of flawed analysis",
          caption: "A third leadership slide is now embedded so executives can study common analysis errors such as correlation mistakes, confirmation bias, recency bias, and overreliance on averages instead of seeing the same action-planning frame twice.",
          imageUrl: "/slides/leadership-data-17_e47d3a3d.png",
          sourceDeck: "Unlocking the Power of Data",
          pageLabel: "Slide 17",
        },
        {
          id: `${module.id}-leadership-visual-4`,
          title: "Question-led KPI review prompts",
          caption: "A fourth KPI slide gives the lesson a stronger workshop feel by surfacing the guiding questions leaders should ask before moving from a metric reading to a team action plan.",
          imageUrl: "/manus-storage/leadership-data-10_173605c2.png",
          sourceDeck: "Unlocking the Power of Data",
          pageLabel: "Slide 10",
        },

        ]
      : isWorkflowFamily
      ? [
          {
            id: `${module.id}-qa-visual-1`,
            title: "Quality scoring categories",
            caption: "This QA framework visual turns score weighting into an in-platform lesson asset so learners and managers can interpret what matters most without opening the deck separately.",
            imageUrl: "/manus-storage/qa-09_72f7b2b0.png",
            sourceDeck: "Quality Assurance Essentials",
            pageLabel: "Slide 9",
          },
        {
          id: `${module.id}-qa-visual-2`,
          title: useWorkflowCoachingVisual ? "Active listening coaching model" : "High-scoring behavior board",
          caption: useWorkflowCoachingVisual
            ? "This coaching-oriented QA visual helps workflow lessons show exactly what observable listening behavior looks like, making review conversations more behavior-specific and less abstract."
            : "The board-style slide is preserved as a lesson visual so teams can compare high-scoring workflow habits and calibration cues directly inside the platform.",
          imageUrl: useWorkflowCoachingVisual ? "/slides/qa-11_a61e56b8.png" : "/manus-storage/qa-17_b0a99fe7.png",
          sourceDeck: "Quality Assurance Essentials",
          pageLabel: useWorkflowCoachingVisual ? "Slide 11" : "Slide 17",
        },
        {
          id: `${module.id}-qa-visual-3`,
          title: "Greeting and verification workflow",
          caption: "A third QA deck frame is now kept in-platform so workflow lessons preserve concrete greeting, verification, and compliance behaviors from the PowerPoint material instead of reusing the same evidence board twice.",
          imageUrl: "/slides/qa-10_c1b475bc.png",
          sourceDeck: "Quality Assurance Essentials",
          pageLabel: "Slide 10",
        },
        {
          id: `${module.id}-qa-visual-4`,
          title: "Call-closing compliance sequence",
          caption: "A fourth QA visual broadens the module with a closing-sequence reference so workflow lessons show both opening verification and end-of-call control instead of concentrating on one section of the conversation.",
          imageUrl: "/manus-storage/qa-12_1bf3d661.png",
          sourceDeck: "Quality Assurance Essentials",
          pageLabel: "Slide 12",
        },

        ]
      : isEngagementFamily
      ? [
          {
            id: `${module.id}-engagement-visual-1`,
            title: "Gamification mistakes to avoid",
            caption: "This frame helps leaders design engagement loops carefully by surfacing the risks of overcomplication, unfairness, burnout, and stale reward structures directly inside the lesson.",
            imageUrl: "/slides/gamification-08_78b0164d.png",
            sourceDeck: "Gamification for Remote Teams: Engaging and Empowering Leaders",
            pageLabel: "Slide 8",
          },
        {
          id: `${module.id}-engagement-visual-2`,
          title: useEngagementProgramVisual ? "Gamification program design" : "Recognition cadence operating rhythm",
          caption: useEngagementProgramVisual
            ? "This step-by-step program-design slide makes engagement lessons more concrete by showing how purpose, rules, metrics, rewards, pilot feedback, and iteration fit together."
            : "The course uses this timeline visual to show how daily, weekly, monthly, and quarterly recognition moments can become an intentional operating rhythm instead of an ad hoc morale tactic.",
          imageUrl: useEngagementProgramVisual ? "/slides/gamification-09_013f4839.png" : "/slides/gamification-15_b67831b0.png",
          sourceDeck: "Gamification for Remote Teams: Engaging and Empowering Leaders",
          pageLabel: useEngagementProgramVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-engagement-visual-3`,
          title: "What makes a good reward",
          caption: "A third gamification slide is now embedded so the engagement modules preserve concrete reward-design options such as recognition, badges, time-off tokens, spotlight moments, and non-monetary rewards from the presentation.",
          imageUrl: "/slides/gamification-10_48ec527b.png",
          sourceDeck: "Gamification for Remote Teams: Engaging and Empowering Leaders",
          pageLabel: "Slide 10",
        },
        {
          id: `${module.id}-engagement-visual-4`,
          title: "Recognition loop design checklist",
          caption: "A fourth engagement visual extends the module with a repeatable checklist so managers can review fairness, cadence, visibility, and reward sustainability before launching a motivation program.",
          imageUrl: "/manus-storage/gamification-14_8cfa45db.png",
          sourceDeck: "Gamification for Remote Teams: Engaging and Empowering Leaders",
          pageLabel: "Slide 14",
        },

        ]
      : [];
  const fallbackInsightCharts: TrainingInsightChart[] = isPerformanceLeadershipFamily
    ? [
          {
            id: `${module.id}-chart-1`,
            title: "Performance bucket distribution",
            description: `A performance-leadership chart showing how ${module.skillFocus.toLowerCase()} can be used to segment coaching effort across high performers, the movable middle, and urgent-support populations.`,
            metricLabel: "% of population",
            chartType: "comparison",
            insightNote: "This distribution should be read side by side with the benchmark so leaders avoid overreacting to one segment in isolation.",
            data: [

            { label: "High performers", value: 22, benchmark: 20 },
            { label: "Movable middle", value: 56, benchmark: 58 },
            { label: "Urgent support", value: 22, benchmark: 18 },
          ],
        },
          {
            id: `${module.id}-chart-2`,
            title: "Coaching leverage by performance group",
            description: "This chart reframes the deck's leadership guidance into an in-platform view of where development effort, recognition, and intervention create the most organizational lift.",
            metricLabel: "Leadership impact score",
            chartType: "comparison",
            insightNote: "Higher leverage signals where a coach or leader should invest attention first, rather than treating every group identically.",
            data: [

            { label: "Recognition and stretch", value: 82, benchmark: 78 },
            { label: "Targeted coaching", value: 89, benchmark: 84 },
            { label: "Structured correction", value: 67, benchmark: 70 },
          ],
        },
      ]
    : isCoachingLeadershipFamily
      ? [
          {
            id: `${module.id}-chart-1`,
            title: "Coaching conversation readiness",
            description: `A leadership-coaching view showing how ${module.skillFocus.toLowerCase()} should strengthen trust-building, goal clarity, and accountable follow-through.`,
            metricLabel: "Readiness score",
            chartType: "comparison",
            insightNote: "The strongest coaching modules improve connection, clarity, and ownership together instead of treating feedback as a one-off event.",
            data: [
              { label: "Connection and trust", value: 86, benchmark: 80 },
              { label: "Goal clarity", value: 82, benchmark: 78 },
              { label: "Accountability follow-through", value: 74, benchmark: 72 },
            ],
          },
          {
            id: `${module.id}-chart-2`,
            title: "Coaching transfer cadence",
            description: "This chart mirrors the workshop's emphasis on preparation, live delivery, documentation, and follow-up rather than one-off feedback moments.",
            metricLabel: "Cadence score",
            chartType: "trend",
            insightNote: "A durable coaching system depends on preparation, practice, documentation, and visible follow-through.",
            data: [
              { label: "Prepared", value: 79, benchmark: 75 },
              { label: "Documented", value: 71, benchmark: 70 },
              { label: "Followed through", value: 68, benchmark: 72 },
            ],
          },
        ]
    : isLeadershipFamily
      ? [
          {
            id: `${module.id}-chart-1`,
            title: "KPI interpretation readiness",
            description: `A leadership-ready in-platform graph showing how ${module.skillFocus.toLowerCase()} should translate into trend reading, target comparison, and outlier detection.`,
            metricLabel: "Readiness score",
            chartType: "comparison",
            insightNote: "This comparison keeps the leadership lesson grounded in the three analytical behaviors the deck expects leaders to perform consistently.",
            data: [
              { label: "Trend reading", value: 78, benchmark: 72 },
              { label: "Target comparison", value: 84, benchmark: 80 },
              { label: "Outlier detection", value: 69, benchmark: 66 },
            ],
          },
          {
            id: `${module.id}-chart-2`,
            title: "Insight-to-action conversion",
            description: "This panel mirrors the leadership deck by showing whether observations are being converted into specific team actions fast enough to influence performance.",
            metricLabel: "% of reviewed patterns",
            chartType: "trend",
            insightNote: "The sequence should tighten from observed to actioned, making it obvious where decision flow is stalling.",
            data: [
              { label: "Observed", value: 91, benchmark: 85 },
              { label: "Explained", value: 76, benchmark: 74 },
              { label: "Actioned", value: 63, benchmark: 68 },
            ],
          },
        ]
      : isWorkflowFamily
      ? [
          {
            id: `${module.id}-chart-1`,
            title: "Workflow scoring emphasis",
            description: `A deck-aligned view of how ${module.skillFocus.toLowerCase()} should influence weighted quality outcomes and audit reliability.`,
            metricLabel: "Weighted score",
            chartType: "comparison",
            insightNote: "This comparison clarifies which workflow moments carry the greatest audit weight, helping coaches prioritize the highest-impact corrections.",
            data: [
              { label: "Verification", value: 81, benchmark: 78 },
              { label: "Documentation", value: 76, benchmark: 74 },
              { label: "Workflow control", value: 84, benchmark: 80 },
            ],
          },
          {
            id: `${module.id}-chart-2`,
            title: "Calibration consistency",
            description: "This graph complements the QA lesson visuals by showing whether reviewers and coaches are identifying the same high-impact workflow behaviors consistently.",
            metricLabel: "Agreement rate",
            chartType: "comparison",
            insightNote: "Agreement should remain tight across reviewers and coaches so the learner receives one coherent message rather than conflicting feedback.",
            data: [
              { label: "Reviewer alignment", value: 88, benchmark: 84 },
              { label: "Coach alignment", value: 82, benchmark: 80 },
              { label: "Auto-fail accuracy", value: 94, benchmark: 92 },
            ],
          },
        ]
      : isEngagementFamily
      ? [
          {
            id: `${module.id}-chart-1`,
            title: "Recognition rhythm coverage",
            description: `A deck-backed engagement view showing whether ${module.skillFocus.toLowerCase()} is reinforced across daily, weekly, monthly, and quarterly rhythms instead of being left to isolated morale events.`,
            metricLabel: "Coverage score",
            data: [
              { label: "Daily moments", value: 72, benchmark: 68 },
              { label: "Weekly rituals", value: 81, benchmark: 76 },
              { label: "Monthly spotlight", value: 77, benchmark: 74 },
            ],
          },
          {
            id: `${module.id}-chart-2`,
            title: "Motivation design balance",
            description: "This graph pairs with the gamification caution slide by showing whether challenge design is balancing energy, fairness, and refresh cadence strongly enough to stay healthy over time.",
            metricLabel: "Design score",
            data: [
              { label: "Fairness", value: 84, benchmark: 80 },
              { label: "Burnout risk", value: 26, benchmark: 20 },
              { label: "Program refresh", value: 69, benchmark: 72 },
            ],
          },
        ]
      : [
          {
            id: `${module.id}-chart-1`,
            title: `${module.skillFocus} transfer signal`,
            description: `A lightweight in-platform graph showing how ${module.skillFocus.toLowerCase()} should appear in observable workflow behavior.`,
            metricLabel: "Behavior score",
            data: [
              { label: "Awareness", value: 62, benchmark: 60 },
              { label: "Execution", value: 74, benchmark: 70 },
              { label: "Evidence", value: 69, benchmark: 66 },
            ],
          },
        ];

  const fallbackHeroSummary = isPerformanceLeadershipFamily
    ? `This ${module.format.toLowerCase()} turns ${module.skillFocus.toLowerCase()} into a calibration and coaching lesson inside ${journeyTitle}, helping leaders compare segments, protect fairness, and choose the next development move with more evidence.`
    : isCoachingLeadershipFamily
      ? `This ${module.format.toLowerCase()} brings the Real-time Coaching curriculum into ${journeyTitle}, connecting trust-building, feedback delivery, SMART action planning, and accountability follow-through.`
    : isLeadershipFamily
      ? `This ${module.format.toLowerCase()} reframes ${module.skillFocus.toLowerCase()} as a decision-making lesson inside ${journeyTitle}, connecting KPI interpretation, pattern recognition, and action planning to the broader competency gap of ${competencyGap.toLowerCase()}.`
      : isWorkflowFamily
        ? `This ${module.format.toLowerCase()} presents ${module.skillFocus.toLowerCase()} as a workflow-control lesson inside ${journeyTitle}, combining QA structure, observable behaviors, and documentation discipline so the learner can transfer the lesson into scored work.`
        : isEngagementFamily
          ? `This ${module.format.toLowerCase()} brings ${module.skillFocus.toLowerCase()} into ${journeyTitle} as an operating-rhythm lesson, showing how recognition design, motivation balance, and measurable reinforcement support the wider competency gap of ${competencyGap.toLowerCase()}.`
          : `This ${module.format.toLowerCase()} is presented as a guided lesson inside ${journeyTitle}, with the focus placed on ${module.skillFocus.toLowerCase()} and the broader competency gap of ${competencyGap.toLowerCase()}.`;
  const fallbackEvidenceLabel = isPerformanceLeadershipFamily
    ? "Performance-management deck translated into calibration, fairness, and development views"
    : isCoachingLeadershipFamily
      ? "Real-time Coaching deck translated into preparation, feedback, and accountability views"
    : isLeadershipFamily
      ? "Leadership-data deck translated into KPI interpretation and action-planning views"
      : isWorkflowFamily
        ? "QA deck translated into workflow-control and coaching-ready lesson views"
        : isEngagementFamily
          ? "Engagement-design deck translated into recognition and motivation system views"
          : fallbackDeckVisuals.length > 0
            ? "Deck-derived fallback presentation view"
            : "Fallback presentation view";
  const fallbackResourceActions = isPerformanceLeadershipFamily
    ? [
        { id: `${module.id}-resource-1`, label: "Calibration recap", detail: "Summarize the segment logic, fairness check, and next coaching move for the current performance group." },
        { id: `${module.id}-resource-2`, label: "Manager checkpoint", detail: "Use the lesson in the next coaching review and document which evidence supported the decision." },
        { id: `${module.id}-resource-3`, label: "Bias guardrail", detail: "Review the documentation signals that help leaders avoid labeling errors before escalating action." },
      ]
    : isCoachingLeadershipFamily
      ? [
          { id: `${module.id}-resource-1`, label: "Coaching prep sheet", detail: "Capture the session goal, the evidence you will use, and the discovery question that should open the conversation." },
          { id: `${module.id}-resource-2`, label: "SMART follow-up", detail: "Write the behavior change, the measurement, and the timeline that should be reviewed after the session." },
          { id: `${module.id}-resource-3`, label: "Accountability prompt", detail: "Note how the learner's progress will be documented and when the next follow-up conversation should happen." },
        ]
    : isLeadershipFamily
      ? [
          { id: `${module.id}-resource-1`, label: "KPI review worksheet", detail: "Capture the pattern, explain the likely cause, and note the action that should follow the data review." },
          { id: `${module.id}-resource-2`, label: "Executive follow-up", detail: "Use the lesson in the next business review to connect observations, causes, and ownership." },
          { id: `${module.id}-resource-3`, label: "Trend-reading prompt", detail: "Flag which metric relationship deserves another pass before a decision is finalized." },
        ]
      : isWorkflowFamily
        ? [
            { id: `${module.id}-resource-1`, label: "Workflow recap", detail: "Summarize the workflow behavior, score sensitivity, and review expectation for the lesson." },
            { id: `${module.id}-resource-2`, label: "QA coaching note", detail: "Bring the lesson into the next QA or calibration conversation with one observable example." },
            { id: `${module.id}-resource-3`, label: "Evidence capture", detail: "Record which behavior, documentation cue, or listening signal should improve after the lesson." },
          ]
        : isEngagementFamily
          ? [
              { id: `${module.id}-resource-1`, label: "Recognition recap", detail: "Summarize the motivation loop, operating rhythm, and design rule reinforced in the lesson." },
              { id: `${module.id}-resource-2`, label: "Leader follow-up", detail: "Use the lesson in the next team check-in to test whether the recognition design is fair and sustainable." },
              { id: `${module.id}-resource-3`, label: "Iteration cue", detail: "Identify which reward, metric, or ritual should be refreshed before the next engagement cycle." },
            ]
          : [
              { id: `${module.id}-resource-1`, label: "Lesson recap", detail: "Summarize the behavior, workflow use case, and coaching expectation." },
              { id: `${module.id}-resource-2`, label: "Manager follow-up", detail: "Use the lesson in the next coaching or review checkpoint." },
            ];

  return enrichPresentation(module, {
    heroTitle: module.title,
    heroSummary: fallbackHeroSummary,
    evidenceLabel: fallbackEvidenceLabel,
    deckVisuals: realDecks.length ? realDecks : fallbackDeckVisuals,
    insightCharts: fallbackInsightCharts,
    slides: isWorkflowFamily
      ? [
          {
            id: `${module.id}-slide-1`,
            eyebrow: "QA focus",
            title: module.skillFocus,
            narrative: `The lesson opens by clarifying why ${module.skillFocus.toLowerCase()} matters inside ${journeyTitle}, with the QA weighting and workflow consequence made explicit from the first page.`,
            bullets: [
              `Clarify the expected behavior for ${module.skillFocus.toLowerCase()}.`,
              "Name which scored workflow moments carry the greatest audit risk if the behavior is missed.",
              "Translate the quality standard into an observable performance behavior.",
            ],
            visualTone: "Focus frame",
          },
          {
            id: `${module.id}-slide-2`,
            eyebrow: "Scorecard framing",
            title: "Read the QA scorecard like an operating model",
            narrative: "The learner studies how weighted scoring, compliance checkpoints, and reviewer expectations fit together so the deck feels like a live quality rubric instead of a static reference slide.",
            bullets: [
              "Identify which scorecard categories drive the biggest weighted impact.",
              "Translate each category into a behavior a coach or reviewer can actually hear.",
              "Use QA language consistently so calibration and coaching stay aligned.",
            ],
            visualTone: "Deck bridge",
          },
          {
            id: `${module.id}-slide-3`,
            eyebrow: "Call-flow translation",
            title: "Map the QA standard into the customer workflow",
            narrative: "This page turns the deck cues into a call-flow sequence so the learner can picture where the behavior should show up during verification, documentation, and the close rather than only at scoring time.",
            bullets: [
              "Pin the behavior to the exact moment in the workflow where QA expects to hear it.",
              "Show how documentation and verbal behavior should reinforce each other.",
              "Make the proof point visible before the interaction moves on.",
            ],
            visualTone: "Workflow bridge",
          },
          {
            id: `${module.id}-slide-4`,
            eyebrow: "Calibration transfer",
            title: "Turn QA findings into coaching action",
            narrative: "The final brief page keeps more of the source material present by connecting the score, the evidence note, and the coaching conversation the learner should expect after review.",
            bullets: [
              "Map the finding into a coaching note that names the behavior clearly.",
              "Capture the evidence a reviewer should document after the interaction.",
              "Use the QA signal to drive a specific next coaching action.",
            ],
            visualTone: "Application frame",
          },
        ]
      : [
          {
            id: `${module.id}-slide-1`,
            eyebrow: "Focus",
            title: module.skillFocus,
            narrative: `The lesson opens by clarifying why ${module.skillFocus.toLowerCase()} matters inside ${journeyTitle}.`,
            bullets: [
              `Clarify the expected behavior for ${module.skillFocus.toLowerCase()}.`,
              `Connect the skill to the surrounding competency gap: ${competencyGap.toLowerCase()}.`,
              "Translate the content into an observable performance behavior.",
            ],
            visualTone: "Focus frame",
          },
          {
            id: `${module.id}-slide-2`,
            eyebrow: "PowerPoint framing",
            title: "Read the deck like an operating model",
            narrative: "The source presentation is now carried deeper into the lesson so the learner studies the original framing, not only a short summary.",
            bullets: [
              "Identify what the source deck is emphasizing visually.",
              "Translate that framing into a work-ready behavior cue.",
              "Use the deck language to reinforce coaching and review consistency.",
            ],
            visualTone: "Deck bridge",
          },
          {
            id: `${module.id}-slide-3`,
            eyebrow: "Application",
            title: "Use the content in real work",
            narrative: "The module is connected to interventions, coaching, and workflow reinforcement so the learner sees where the lesson should appear on the job.",
            bullets: [
              "Map the skill into coaching and review conversations.",
              "Use supporting assets to reinforce the behavior.",
              "Capture one proof point in the documentation flow.",
            ],
            visualTone: "Application frame",
          },
        ],
    practiceSlides: [
      {
        id: `${module.id}-practice-1`,
        eyebrow: "Guided practice",
        title: `Rehearse ${module.skillFocus.toLowerCase()} in sequence`,
        narrative: `The learner studies the key moves for ${module.skillFocus.toLowerCase()} before choosing a rehearsal mode.`,
        bullets: [
          "Notice the signal in the workflow moment.",
          "Choose language that reflects the lesson expectations.",
          "Prepare one observable behavior for the next coaching checkpoint.",
        ],
        visualTone: "Practice frame",
      },
      {
        id: `${module.id}-practice-2`,
        eyebrow: "Deck rehearsal",
        title: "Translate the slide into live behavior",
        narrative: "A second practice page keeps more of the PowerPoint logic active by asking the learner to connect the deck frame to a real coaching or workflow moment.",
        bullets: [
          "Name which slide cue matters most in the scenario.",
          "Choose the phrase or action that makes the cue visible.",
          "Prepare the evidence a reviewer or coach should hear afterward.",
        ],
        visualTone: "Deck rehearsal",
      },
    ],
    applySlides: [
      {
        id: `${module.id}-apply-1`,
        eyebrow: "Application checkpoint",
        title: "Pass the transfer gate",
        narrative: "The learner must now prove they can apply the lesson content in a realistic work choice before moving forward.",
        bullets: [
          "Choose the answer that reflects the lesson behavior.",
          "Advance only after the behavior pattern is demonstrated correctly.",
          "Use failure feedback as a cue to review and retry.",
        ],
        visualTone: "Assessment frame",
      },
      {
        id: `${module.id}-apply-2`,
        eyebrow: "Transfer evidence",
        title: "Show how the lesson would be seen on the job",
        narrative: "The application section now keeps more instructional framing visible by clarifying what proof, documentation, or coaching evidence should exist after transfer.",
        bullets: [
          "Name the observable behavior the module should create.",
          "Tie the lesson to documentation or review evidence.",
          "Confirm what the next coaching checkpoint should validate.",
        ],
        visualTone: "Transfer evidence",
      },
    ],
    coachPrompts: [
      "What behavior should the learner demonstrate next?",
      "What evidence will prove the lesson transferred into work?",
    ],
    reflectionPrompts: [
      "What will you change in the next workflow moment?",
      "How will your manager know the change happened?",
    ],
    practiceScenario: {
      title: "Applied workflow rehearsal",
      situation: `The learner must apply ${module.skillFocus.toLowerCase()} in a realistic work situation tied to ${journeyTitle}.`,
      learnerTask: "Use the lesson content to choose language, structure, and next actions in a way that can be coached and documented.",
      successSignals: [
        "The behavior is visible.",
        "The workflow stays controlled.",
        "The next step can be documented clearly.",
      ],
    },
    applicationActivity: {
      title: "Application check",
      objective: `Demonstrate that you can apply ${module.skillFocus.toLowerCase()} in a work-ready decision before advancing.`,
      instructions: "Pass both questions to unlock the final reflection step.",
      passingScore: 2,
      passMessage: "Passed. Your choices show that the lesson has transferred into a work-ready behavior pattern.",
      failMessage: "Not yet passed. Review the lesson pages, then retry until you can consistently choose the work-ready response.",
      questions: [
        {
          id: `${module.id}-q1`,
          prompt: `Which option best applies ${module.skillFocus.toLowerCase()} in a realistic workflow moment?`,
          options: [
            {
              id: `${module.id}-q1-a`,
              label: "Choose the response that makes the behavior visible and coachable.",
              rationale: "This option matches the lesson goal.",
            },
            {
              id: `${module.id}-q1-b`,
              label: "Choose the response that sounds fast but leaves the next step unclear.",
              rationale: "This weakens transfer and evidence.",
            },
            {
              id: `${module.id}-q1-c`,
              label: "Choose the response that overpromises certainty before the workflow is verified.",
              rationale: "This introduces risk and breaks the behavior model.",
            },
          ],
          correctOptionId: `${module.id}-q1-a`,
          successFeedback: "Correct. The best answer makes the behavior visible in a way a coach or reviewer can observe.",
          failureFeedback: "This does not yet reflect the lesson. The correct answer is the one that creates a visible, coachable, work-ready behavior.",
        },
        {
          id: `${module.id}-q2`,
          prompt: "What proves the lesson transferred successfully into work?",
          options: [
            {
              id: `${module.id}-q2-a`,
              label: "The learner can link the behavior to a clear next step and a recordable proof point.",
              rationale: "This is the transfer standard used across the training.",
            },
            {
              id: `${module.id}-q2-b`,
              label: "The learner sounds confident even if the action is not documented.",
              rationale: "Confidence without evidence is not enough.",
            },
            {
              id: `${module.id}-q2-c`,
              label: "The learner completes the module without changing the workflow behavior.",
              rationale: "Completion alone does not prove transfer.",
            },
          ],
          correctOptionId: `${module.id}-q2-a`,
          successFeedback: "Correct. Transfer is proven when the behavior shows up in the workflow and can be evidenced later.",
          failureFeedback: "Not yet. The lesson expects a behavior that is both visible in work and easy to document or coach later.",
        },
      ],
    },
    resourceActions: fallbackResourceActions,
  });
}

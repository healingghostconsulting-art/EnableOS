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
        imageUrl: "/manus-storage/softskills-08_fd8d5235.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 8",
      },
      {
        id: "listen-visual-2",
        title: "Communication skills deep dive",
        caption: "This slide’s icon-led capability board becomes a first-class lesson visual for active listening, articulation, empathy, and service readiness.",
        imageUrl: "/manus-storage/softskills-14_e11945d2.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 14",
      },
      {
        id: "listen-visual-3",
        title: "Ask-probe-confirm reassurance model",
        caption: "A distinct service-behavior slide is now embedded beside the listening visuals so the learner can connect clarification, probing, and confirmation language to the opening call sequence without reusing the same empathy frame again.",
        imageUrl: "/manus-storage/softskills-16_351b1cea.png",
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
        imageUrl: "/manus-storage/softskills-09_815688d7.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 9",
      },
      {
        id: "reassure-visual-2",
        title: "Empathy script rewrite activity",
        caption: "The rewrite activity is embedded as a visual board to show how frustration cues become empathetic language and personalized response patterns.",
        imageUrl: "/manus-storage/softskills-27_c4f51069.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 27",
      },
      {
        id: "reassure-visual-3",
        title: "Escalation curve for reassurance moments",
        caption: "This extra presentation frame gives the reassurance module a distinct de-escalation visual so learners can see how calm, frustration, upset, and anger states affect the response strategy when outcomes are still unresolved.",
        imageUrl: "/manus-storage/softskills-31_e39fe3f8.png",
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
        imageUrl: "/manus-storage/softskills-30_0b757800.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 30",
      },
      {
        id: "deescalate-visual-2",
        title: "4-step de-escalation model",
        caption: "The platform now carries the full four-step recovery framework into the lesson instead of reducing it to a short summary card.",
        imageUrl: "/manus-storage/softskills-32_55dd4a02.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 32",
      },
      {
        id: "deescalate-visual-3",
        title: "Professional presence during recovery",
        caption: "A third deck image is now surfaced in the recovery lesson so learners can connect de-escalation language with professional presence and brand representation inside the same module rather than seeing the same rewrite board twice.",
        imageUrl: "/manus-storage/softskills-35_8c2ed919.png",
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
        imageUrl: "/manus-storage/softskills-33_546a5078.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 33",
      },
      {
        id: "close-visual-2",
        title: "Digital professionalism standards",
        caption: "This original standards slide is used as a lesson visual so the learner sees the detailed operational expectations that support a confident and compliant close.",
        imageUrl: "/manus-storage/softskills-34_229ecb62.png",
        sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
        pageLabel: "Slide 34",
      },
      {
        id: "close-visual-3",
        title: "Digital professionalism standards",
        caption: "The closing lesson now adds a distinct deck-derived professionalism board so the final handoff feels tied to quiet-space, camera, attire, and background expectations rather than reusing the same communication board again.",
        imageUrl: "/manus-storage/softskills-36_081f2024.png",
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

export function getTrainingPresentation(module: ModuleLike, journeyTitle: string, competencyGap: string): TrainingPresentation {
  const mapped = trainingPresentationByModuleId[module.id];

  if (mapped) {
    return enrichPresentation(module, mapped);
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
  const isLeadershipFamily =
    moduleKeywords.includes("data") ||
    moduleKeywords.includes("kpi") ||
    moduleKeywords.includes("insight") ||
    moduleKeywords.includes("trend") ||
    moduleKeywords.includes("dashboard") ||
    moduleKeywords.includes("action planning") ||
    (moduleKeywords.includes("leadership") && !isPerformanceLeadershipFamily);
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
          imageUrl: "/manus-storage/performance-leadership-08_61606933.png",
          sourceDeck: "Maximizing performance through performance management",
          pageLabel: "Slide 8",
        },
        {
          id: `${module.id}-performance-visual-2`,
          title: usePerformanceBiasVisual ? "Avoiding mislabeling and bias" : "Engaging and developing high performers",
          caption: usePerformanceBiasVisual
            ? "This bias-check visual gives calibration modules a more explicit fairness frame so leaders can compare evidence, documentation quality, and labeling discipline before deciding on next actions."
            : "The platform uses this development frame to show how performance leadership includes stretch assignment planning, mentorship, and retention strategy rather than only correction.",
          imageUrl: usePerformanceBiasVisual ? "/manus-storage/performance-leadership-09_edfbb1ea.png" : "/manus-storage/performance-leadership-15_3215473c.png",
          sourceDeck: "Maximizing performance through performance management",
          pageLabel: usePerformanceBiasVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-performance-visual-3`,
          title: "Performance conversation framing",
          caption: "A third performance deck frame is now surfaced so the module carries more of the original workshop logic into the lesson and makes calibration, development, and documentation feel like one connected system.",
          imageUrl: "/manus-storage/performance-leadership-10_f976e1db.png",
          sourceDeck: "Maximizing performance through performance management",
          pageLabel: "Slide 10",
        },
        {
          id: `${module.id}-performance-visual-4`,
          title: "Improvement-plan decision ladder",
          caption: "A fourth leadership-performance visual extends the lesson with a clearer improvement ladder so supervisors can distinguish correction, coaching intensity, recognition, and development planning more explicitly.",
          imageUrl: "/manus-storage/performance-leadership-14_686d8ef6.png",
          sourceDeck: "Maximizing performance through performance management",
          pageLabel: "Slide 14",
        },
      ]
    : isLeadershipFamily
      ? [
          {
            id: `${module.id}-leadership-visual-1`,
            title: "How to read KPI reports",
            caption: "This leadership deck frame brings KPI trend reading, target comparison, and outlier detection directly into the lesson so leaders can study the original visual logic in-platform.",
            imageUrl: "/manus-storage/leadership-data-08_d8fd351a.png",
            sourceDeck: "Unlocking the power of date",
            pageLabel: "Slide 8",
          },
        {
          id: `${module.id}-leadership-visual-2`,
          title: useLeadershipWorkshopVisual ? "Interpreting KPI activity" : "From insight to action",
          caption: useLeadershipWorkshopVisual
            ? "This workshop-style KPI activity helps leadership modules feel more hands-on by showing how trend reading, concern detection, and next-step planning can be practiced in-platform."
            : "The lesson uses this original action-planning frame to turn analysis into a coached next move instead of leaving KPI interpretation as passive review.",
          imageUrl: useLeadershipWorkshopVisual ? "/manus-storage/leadership-data-09_f158ab35.png" : "/manus-storage/leadership-data-15_c9ba127f.png",
          sourceDeck: "Unlocking the power of date",
          pageLabel: useLeadershipWorkshopVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-leadership-visual-3`,
          title: "Examples of flawed analysis",
          caption: "A third leadership slide is now embedded so executives can study common analysis errors such as correlation mistakes, confirmation bias, recency bias, and overreliance on averages instead of seeing the same action-planning frame twice.",
          imageUrl: "/manus-storage/leadership-data-17_e47d3a3d.png",
          sourceDeck: "Unlocking the power of date",
          pageLabel: "Slide 17",
        },
        {
          id: `${module.id}-leadership-visual-4`,
          title: "Question-led KPI review prompts",
          caption: "A fourth KPI slide gives the lesson a stronger workshop feel by surfacing the guiding questions leaders should ask before moving from a metric reading to a team action plan.",
          imageUrl: "/manus-storage/leadership-data-10_173605c2.png",
          sourceDeck: "Unlocking the power of date",
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
          imageUrl: useWorkflowCoachingVisual ? "/manus-storage/qa-11_a61e56b8.png" : "/manus-storage/qa-17_b0a99fe7.png",
          sourceDeck: "Quality Assurance Essentials",
          pageLabel: useWorkflowCoachingVisual ? "Slide 11" : "Slide 17",
        },
        {
          id: `${module.id}-qa-visual-3`,
          title: "Greeting and verification workflow",
          caption: "A third QA deck frame is now kept in-platform so workflow lessons preserve concrete greeting, verification, and compliance behaviors from the PowerPoint material instead of reusing the same evidence board twice.",
          imageUrl: "/manus-storage/qa-10_c1b475bc.png",
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
            imageUrl: "/manus-storage/gamification-08_78b0164d.png",
            sourceDeck: "Gamification & Work From Home",
            pageLabel: "Slide 8",
          },
        {
          id: `${module.id}-engagement-visual-2`,
          title: useEngagementProgramVisual ? "Gamification program design" : "Recognition cadence operating rhythm",
          caption: useEngagementProgramVisual
            ? "This step-by-step program-design slide makes engagement lessons more concrete by showing how purpose, rules, metrics, rewards, pilot feedback, and iteration fit together."
            : "The course uses this timeline visual to show how daily, weekly, monthly, and quarterly recognition moments can become an intentional operating rhythm instead of an ad hoc morale tactic.",
          imageUrl: useEngagementProgramVisual ? "/manus-storage/gamification-09_013f4839.png" : "/manus-storage/gamification-15_b67831b0.png",
          sourceDeck: "Gamification & Work From Home",
          pageLabel: useEngagementProgramVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-engagement-visual-3`,
          title: "What makes a good reward",
          caption: "A third gamification slide is now embedded so the engagement modules preserve concrete reward-design options such as recognition, badges, time-off tokens, spotlight moments, and non-monetary rewards from the presentation.",
          imageUrl: "/manus-storage/gamification-10_48ec527b.png",
          sourceDeck: "Gamification & Work From Home",
          pageLabel: "Slide 10",
        },
        {
          id: `${module.id}-engagement-visual-4`,
          title: "Recognition loop design checklist",
          caption: "A fourth engagement visual extends the module with a repeatable checklist so managers can review fairness, cadence, visibility, and reward sustainability before launching a motivation program.",
          imageUrl: "/manus-storage/gamification-14_8cfa45db.png",
          sourceDeck: "Gamification & Work From Home",
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
    : isLeadershipFamily
      ? `This ${module.format.toLowerCase()} reframes ${module.skillFocus.toLowerCase()} as a decision-making lesson inside ${journeyTitle}, connecting KPI interpretation, pattern recognition, and action planning to the broader competency gap of ${competencyGap.toLowerCase()}.`
      : isWorkflowFamily
        ? `This ${module.format.toLowerCase()} presents ${module.skillFocus.toLowerCase()} as a workflow-control lesson inside ${journeyTitle}, combining QA structure, observable behaviors, and documentation discipline so the learner can transfer the lesson into scored work.`
        : isEngagementFamily
          ? `This ${module.format.toLowerCase()} brings ${module.skillFocus.toLowerCase()} into ${journeyTitle} as an operating-rhythm lesson, showing how recognition design, motivation balance, and measurable reinforcement support the wider competency gap of ${competencyGap.toLowerCase()}.`
          : `This ${module.format.toLowerCase()} is presented as a guided lesson inside ${journeyTitle}, with the focus placed on ${module.skillFocus.toLowerCase()} and the broader competency gap of ${competencyGap.toLowerCase()}.`;
  const fallbackEvidenceLabel = isPerformanceLeadershipFamily
    ? "Performance-leadership deck translated into calibration, fairness, and development views"
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
    deckVisuals: fallbackDeckVisuals,
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
          "Choose language that reflects CHCG expectations.",
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

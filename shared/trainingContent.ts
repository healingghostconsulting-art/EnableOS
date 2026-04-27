export type TrainingPresentationSlide = {
  id: string;
  eyebrow: string;
  title: string;
  narrative: string;
  bullets: string[];
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
    title: `Final knowledge sprint: ${module.title}`,
    objective: `Complete a Kahoot-style module quiz to prove retention of ${module.skillFocus.toLowerCase()} before the module can be completed.`,
    instructions: "Score at least 80% to pass this end-of-module knowledge check.",
    passingScore: Math.max(1, Math.ceil(questions.length * 0.8)),
    passingPercent: 80,
    passMessage: "Passed. You cleared the end-of-module quiz and proved the lesson knowledge strongly enough to complete the module.",
    failMessage: "Not yet passed. Review the lesson pages and retry until you reach the required 80% score.",
    style: "kahoot",
    questions,
  };
}

function enrichPresentation(module: ModuleLike, presentation: Omit<TrainingPresentation, "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz">): TrainingPresentation {
  const normalizedApplicationQuestions = presentation.applicationActivity.questions.map((question) => ({
    ...question,
    type: question.type ?? "multiple_choice",
  }));

  const normalizedPresentation = {
    ...presentation,
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
    heroSummary: "This lesson reframes active listening as a visible service behavior: acknowledge emotion, isolate the operational issue, and confirm the next step without losing control of the interaction.",
    evidenceLabel: "Soft-skills deck translated into service-ready listening visuals",
    deckVisuals: [
      {
        id: "listen-visual-1",
        title: "Communication foundations overview",
        caption: "The original communication slide is shown directly in-platform so the learner can read the deck’s structure, layout, and instructional emphasis without leaving the course.",
        imageUrl: "/manus-storage/softskills-08_fd8d5235.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
        pageLabel: "Slide 8",
      },
      {
        id: "listen-visual-2",
        title: "Communication skills deep dive",
        caption: "This slide’s icon-led capability board becomes a first-class lesson visual for active listening, articulation, empathy, and service readiness.",
        imageUrl: "/manus-storage/softskills-14_e11945d2.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
        pageLabel: "Slide 14",
      },
      {
        id: "listen-visual-3",
        title: "Ask-probe-confirm reassurance model",
        caption: "A distinct service-behavior slide is now embedded beside the listening visuals so the learner can connect clarification, probing, and confirmation language to the opening call sequence without reusing the same empathy frame again.",
        imageUrl: "/manus-storage/softskills-16_351b1cea.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
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
        title: "What strong listening sounds like in the first 30 seconds",
        narrative: "The strongest performers slow the opening, mirror the customer concern in plain language, and keep the interaction structured instead of rushing into scripts.",
        bullets: [
          "Name the concern before solving it so the customer feels understood.",
          "Use one sentence to confirm ownership and one sentence to define the next action.",
          "Replace filler language with concrete transitions that keep control of the conversation.",
        ],
        visualTone: "Signal framing",
      },
      {
        id: "listen-breakdown",
        eyebrow: "Presentation content",
        title: "The CHCG listening model broken into visible moves",
        narrative: "The original presentation concepts are turned into a visual sequence so the learner can see the behavior stack instead of only reading a title.",
        bullets: [
          "Hear: identify the emotional driver and the operational problem separately.",
          "Hold: avoid premature reassurance before the facts are stable.",
          "Hand back: summarize the concern in the customer’s language, then redirect to the verified action.",
        ],
        visualTone: "Method breakdown",
      },
      {
        id: "listen-risk",
        eyebrow: "Coaching cue",
        title: "Where listening breaks down during high-friction calls",
        narrative: "Most misses happen when the learner jumps to policy, overexplains the system, or closes before the customer hears a clear next-step summary.",
        bullets: [
          "Do not stack three explanations before validating the concern.",
          "Do not promise outcomes before the workflow is confirmed.",
          "Do not end the call without a concise recap the customer can repeat back.",
        ],
        visualTone: "Risk pattern",
      },
      {
        id: "listen-deck-bridge",
        eyebrow: "PowerPoint bridge",
        title: "What the original communication deck wants the learner to notice",
        narrative: "This extra lesson page keeps more of the presentation framing visible by translating the communication deck into an explicit read-before-you-respond checklist.",
        bullets: [
          "Start with acknowledgment before explanation.",
          "Personalize the summary so the customer hears their own concern reflected back.",
          "Move into the next verified action only after ownership is clear.",
        ],
        visualTone: "Deck translation",
      },
    ],
    practiceSlides: [
      {
        id: "listen-practice-1",
        eyebrow: "Scenario walkthrough",
        title: "Read the emotional signal before you answer",
        narrative: "The customer’s first sentence usually tells you both the emotional state and the operational risk. Good listeners separate those two signals before responding.",
        bullets: [
          "Emotion signal: the customer believes they are repeating themselves.",
          "Operational signal: ownership is unclear.",
          "Coaching move: answer the emotion first, then define ownership.",
        ],
        visualTone: "Scenario decode",
      },
      {
        id: "listen-practice-2",
        eyebrow: "Modeled response",
        title: "A strong opening sounds calm, specific, and owned",
        narrative: "The presentation content is converted into a modeled opening pattern the learner can study before choosing a rehearsal path.",
        bullets: [
          "I hear why this feels frustrating, and I’m going to own the next step with you.",
          "Let me confirm exactly what has happened so I can move this forward correctly.",
          "Once I verify that piece, I’ll give you the clearest next action before we end this call.",
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
      "Where in the opening did the learner acknowledge emotion versus only process?",
      "Which phrase kept ownership clear without sounding defensive or scripted?",
      "What one sentence would you ask the learner to shorten for clarity?",
    ],
    reflectionPrompts: [
      "What phrase will you use to show understanding before solving?",
      "How will you signal ownership without overcommitting?",
      "What exact closing summary will you practice on the next call?",
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
    heroSummary: "This module turns reassurance language into a decision tool so the learner can sound confident, protect trust, and avoid making commitments the workflow cannot support.",
    evidenceLabel: "Language-confidence deck translated into reusable reassurance patterns",
    deckVisuals: [
      {
        id: "reassure-visual-1",
        title: "Empathy foundations",
        caption: "The empathy overview slide is preserved as a direct lesson visual so the learner sees the original quadrant framing for understanding needs, anticipating emotion, personalizing the response, and staying professional.",
        imageUrl: "/manus-storage/softskills-09_815688d7.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
        pageLabel: "Slide 9",
      },
      {
        id: "reassure-visual-2",
        title: "Empathy script rewrite activity",
        caption: "The rewrite activity is embedded as a visual board to show how frustration cues become empathetic language and personalized response patterns.",
        imageUrl: "/manus-storage/softskills-27_c4f51069.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
        pageLabel: "Slide 27",
      },
      {
        id: "reassure-visual-3",
        title: "Escalation curve for reassurance moments",
        caption: "This extra presentation frame gives the reassurance module a distinct de-escalation visual so learners can see how calm, frustration, upset, and anger states affect the response strategy when outcomes are still unresolved.",
        imageUrl: "/manus-storage/softskills-31_e39fe3f8.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
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
        title: "Confidence phrases that build trust without creating risk",
        narrative: "The lesson visualizes which phrases communicate ownership and which phrases create hidden promise debt.",
        bullets: [
          "Use certainty about effort and follow-through, not certainty about an unresolved outcome.",
          "Anchor reassurance to the verified process, not to hope or guesswork.",
          "Separate what you know now from what you are doing next.",
        ],
        visualTone: "Language design",
      },
      {
        id: "reassure-do-dont",
        eyebrow: "Do / do not",
        title: "What to say versus what to avoid",
        narrative: "The original presentation contrast is converted into a visual behavior card so the learner can compare effective phrasing side by side.",
        bullets: [
          "Say: I’m staying with this and I’ll walk you through the next confirmed step.",
          "Avoid: Don’t worry, this will definitely be fixed today.",
          "Say: Here is what I can confirm right now and what happens next.",
        ],
        visualTone: "Contrast board",
      },
      {
        id: "reassure-escalation",
        eyebrow: "Workflow transfer",
        title: "How reassurance changes during escalation",
        narrative: "As issues become more complex, reassurance should become more transparent, not more optimistic.",
        bullets: [
          "Increase clarity as uncertainty increases.",
          "Explain ownership points across teams without blaming the system.",
          "Close with a documented next step the manager can audit later.",
        ],
        visualTone: "Escalation logic",
      },
      {
        id: "reassure-deck-bridge",
        eyebrow: "PowerPoint bridge",
        title: "How the empathy deck reframes reassurance language",
        narrative: "This additional lesson page keeps more of the source deck visible by showing how reassurance should sound personalized, specific, and professional at the same time.",
        bullets: [
          "Use language that sounds steady without sounding absolute.",
          "Tie reassurance to what has been verified and what will happen next.",
          "Personalize the response so trust grows without creating promise debt.",
        ],
        visualTone: "Deck translation",
      },
    ],
    practiceSlides: [
      {
        id: "reassure-practice-1",
        eyebrow: "Scenario decode",
        title: "Spot the hidden promise risk before you answer",
        narrative: "The learner studies a tense moment where customer anxiety creates pressure to sound more certain than the workflow allows.",
        bullets: [
          "Anxiety increases the temptation to overpromise.",
          "The correct move is to sound confident about ownership, not outcome certainty.",
          "Trust grows when the next action is clear and auditable.",
        ],
        visualTone: "Risk decode",
      },
      {
        id: "reassure-practice-2",
        eyebrow: "Response builder",
        title: "Build reassurance from what is verified",
        narrative: "The deck content is turned into a reusable response-builder pattern so the learner can rehearse a safer confidence script.",
        bullets: [
          "State what is confirmed now.",
          "State what you are doing next.",
          "State when the customer will hear from you again.",
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
      "Which reassurance phrase felt strong because it was specific, not vague?",
      "Where did the learner imply certainty that the process could not guarantee?",
      "How could the learner sound more confident while staying accurate?",
    ],
    reflectionPrompts: [
      "Which promise-risk phrase will you retire immediately?",
      "What reassurance line will become your new default?",
      "How will you document the next-step language after the call?",
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
    heroSummary: "This scenario page converts the presentation into a visible recovery flow: stabilize emotion, narrow the issue, confirm the recovery path, and preserve confidence under pressure.",
    evidenceLabel: "Scenario content translated into a guided recovery storyboard",
    deckVisuals: [
      {
        id: "deescalate-visual-1",
        title: "Why patients become upset",
        caption: "The original cause-analysis slide is embedded so the learner can study the recurring frustration drivers before rehearsing recovery language.",
        imageUrl: "/manus-storage/softskills-30_0b757800.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
        pageLabel: "Slide 30",
      },
      {
        id: "deescalate-visual-2",
        title: "4-step de-escalation model",
        caption: "The platform now carries the full four-step recovery framework into the lesson instead of reducing it to a short summary card.",
        imageUrl: "/manus-storage/softskills-32_55dd4a02.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
        pageLabel: "Slide 32",
      },
      {
        id: "deescalate-visual-3",
        title: "Professional presence during recovery",
        caption: "A third deck image is now surfaced in the recovery lesson so learners can connect de-escalation language with professional presence and brand representation inside the same module rather than seeing the same rewrite board twice.",
        imageUrl: "/manus-storage/softskills-35_8c2ed919.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
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
        narrative: "The learner needs to interrupt the spiral without sounding abrupt. The visual frame highlights the moment where tone, pacing, and structure matter most.",
        bullets: [
          "Acknowledge the frustration directly.",
          "Use a short stabilizing phrase before gathering detail.",
          "Move from emotion to problem definition in one clean transition.",
        ],
        visualTone: "Recovery opening",
      },
      {
        id: "deescalate-middle",
        eyebrow: "Recovery path",
        title: "Build calm by making the process legible",
        narrative: "The presentation’s recovery guidance becomes a visual sequence of what the learner should make visible to the customer at each step.",
        bullets: [
          "Clarify what has already happened.",
          "State what you are verifying now.",
          "Name what the customer should expect next and when.",
        ],
        visualTone: "Process visibility",
      },
      {
        id: "deescalate-close",
        eyebrow: "Close strong",
        title: "End the recovery with confidence, not relief",
        narrative: "A successful close should sound deliberate and owned, not like the learner is simply glad the conversation is over.",
        bullets: [
          "Summarize the agreed action.",
          "Restate who owns the next move.",
          "Leave the customer with a sentence they can repeat back confidently.",
        ],
        visualTone: "Resolution close",
      },
      {
        id: "deescalate-deck-bridge",
        eyebrow: "PowerPoint bridge",
        title: "How the original recovery deck sequences the conversation",
        narrative: "This added lesson page brings more of the source PowerPoint into the module by turning the four-step deck model into a visible sequencing guide for the learner.",
        bullets: [
          "Stabilize the emotion before solving the workflow issue.",
          "Clarify the real blocker in simple language.",
          "Name the next step in a way the customer can repeat back.",
        ],
        visualTone: "Deck translation",
      },
    ],
    practiceSlides: [
      {
        id: "deescalate-practice-1",
        eyebrow: "Pressure test",
        title: "Read the moment where emotional heat can rise or fall",
        narrative: "The learner sees where the recovery arc can either stabilize or intensify depending on the opening phrase they choose.",
        bullets: [
          "Fast facts alone will not lower the temperature.",
          "A stabilizing phrase creates room for process clarity.",
          "Tone and structure matter as much as the content itself.",
        ],
        visualTone: "Pressure map",
      },
      {
        id: "deescalate-practice-2",
        eyebrow: "Recovery storyboard",
        title: "Turn the process into something the customer can follow",
        narrative: "The presentation’s recovery logic is transformed into a storyboard the learner can rehearse step by step.",
        bullets: [
          "Name what happened.",
          "State what is being checked now.",
          "Close with the owned next move.",
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
      "At what point did the learner regain control of the interaction?",
      "How clearly did the learner explain the recovery sequence?",
      "Did the close sound deliberate and accountable?",
    ],
    reflectionPrompts: [
      "What is your stabilizing phrase for the next escalated moment?",
      "How will you make the process visible without overexplaining it?",
      "What close will signal ownership at the end of recovery?",
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
        sourceDeck: "Soft Skills & Patient Service Foundations",
        pageLabel: "Slide 33",
      },
      {
        id: "close-visual-2",
        title: "Digital professionalism standards",
        caption: "This original standards slide is used as a lesson visual so the learner sees the detailed operational expectations that support a confident and compliant close.",
        imageUrl: "/manus-storage/softskills-34_229ecb62.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
        pageLabel: "Slide 34",
      },
      {
        id: "close-visual-3",
        title: "Digital professionalism standards",
        caption: "The closing lesson now adds a distinct deck-derived professionalism board so the final handoff feels tied to quiet-space, camera, attire, and background expectations rather than reusing the same communication board again.",
        imageUrl: "/manus-storage/softskills-36_081f2024.png",
        sourceDeck: "Soft Skills & Patient Service Foundations",
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
          sourceDeck: "Utilizing Performance to Maximize Performance",
          pageLabel: "Slide 8",
        },
        {
          id: `${module.id}-performance-visual-2`,
          title: usePerformanceBiasVisual ? "Avoiding mislabeling and bias" : "Engaging and developing high performers",
          caption: usePerformanceBiasVisual
            ? "This bias-check visual gives calibration modules a more explicit fairness frame so leaders can compare evidence, documentation quality, and labeling discipline before deciding on next actions."
            : "The platform uses this development frame to show how performance leadership includes stretch assignment planning, mentorship, and retention strategy rather than only correction.",
          imageUrl: usePerformanceBiasVisual ? "/manus-storage/performance-leadership-09_edfbb1ea.png" : "/manus-storage/performance-leadership-15_3215473c.png",
          sourceDeck: "Utilizing Performance to Maximize Performance",
          pageLabel: usePerformanceBiasVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-performance-visual-3`,
          title: "Performance conversation framing",
          caption: "A third performance deck frame is now surfaced so the module carries more of the original workshop logic into the lesson and makes calibration, development, and documentation feel like one connected system.",
          imageUrl: "/manus-storage/performance-leadership-10_f976e1db.png",
          sourceDeck: "Utilizing Performance to Maximize Performance",
          pageLabel: "Slide 10",
        },
        {
          id: `${module.id}-performance-visual-4`,
          title: "Improvement-plan decision ladder",
          caption: "A fourth leadership-performance visual extends the lesson with a clearer improvement ladder so supervisors can distinguish correction, coaching intensity, recognition, and development planning more explicitly.",
          imageUrl: "/manus-storage/performance-leadership-14_686d8ef6.png",
          sourceDeck: "Utilizing Performance to Maximize Performance",
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
            sourceDeck: "Leadership Module 1: Unlocking the Power of Data",
            pageLabel: "Slide 8",
          },
        {
          id: `${module.id}-leadership-visual-2`,
          title: useLeadershipWorkshopVisual ? "Interpreting KPI activity" : "From insight to action",
          caption: useLeadershipWorkshopVisual
            ? "This workshop-style KPI activity helps leadership modules feel more hands-on by showing how trend reading, concern detection, and next-step planning can be practiced in-platform."
            : "The lesson uses this original action-planning frame to turn analysis into a coached next move instead of leaving KPI interpretation as passive review.",
          imageUrl: useLeadershipWorkshopVisual ? "/manus-storage/leadership-data-09_f158ab35.png" : "/manus-storage/leadership-data-15_c9ba127f.png",
          sourceDeck: "Leadership Module 1: Unlocking the Power of Data",
          pageLabel: useLeadershipWorkshopVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-leadership-visual-3`,
          title: "Examples of flawed analysis",
          caption: "A third leadership slide is now embedded so executives can study common analysis errors such as correlation mistakes, confirmation bias, recency bias, and overreliance on averages instead of seeing the same action-planning frame twice.",
          imageUrl: "/manus-storage/leadership-data-17_e47d3a3d.png",
          sourceDeck: "Leadership Module 1: Unlocking the Power of Data",
          pageLabel: "Slide 17",
        },
        {
          id: `${module.id}-leadership-visual-4`,
          title: "Question-led KPI review prompts",
          caption: "A fourth KPI slide gives the lesson a stronger workshop feel by surfacing the guiding questions leaders should ask before moving from a metric reading to a team action plan.",
          imageUrl: "/manus-storage/leadership-data-10_173605c2.png",
          sourceDeck: "Leadership Module 1: Unlocking the Power of Data",
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
            sourceDeck: "Gamification for Remote Teams",
            pageLabel: "Slide 8",
          },
        {
          id: `${module.id}-engagement-visual-2`,
          title: useEngagementProgramVisual ? "Gamification program design" : "Recognition cadence operating rhythm",
          caption: useEngagementProgramVisual
            ? "This step-by-step program-design slide makes engagement lessons more concrete by showing how purpose, rules, metrics, rewards, pilot feedback, and iteration fit together."
            : "The course uses this timeline visual to show how daily, weekly, monthly, and quarterly recognition moments can become an intentional operating rhythm instead of an ad hoc morale tactic.",
          imageUrl: useEngagementProgramVisual ? "/manus-storage/gamification-09_013f4839.png" : "/manus-storage/gamification-15_b67831b0.png",
          sourceDeck: "Gamification for Remote Teams",
          pageLabel: useEngagementProgramVisual ? "Slide 9" : "Slide 15",
        },
        {
          id: `${module.id}-engagement-visual-3`,
          title: "What makes a good reward",
          caption: "A third gamification slide is now embedded so the engagement modules preserve concrete reward-design options such as recognition, badges, time-off tokens, spotlight moments, and non-monetary rewards from the presentation.",
          imageUrl: "/manus-storage/gamification-10_48ec527b.png",
          sourceDeck: "Gamification for Remote Teams",
          pageLabel: "Slide 10",
        },
        {
          id: `${module.id}-engagement-visual-4`,
          title: "Recognition loop design checklist",
          caption: "A fourth engagement visual extends the module with a repeatable checklist so managers can review fairness, cadence, visibility, and reward sustainability before launching a motivation program.",
          imageUrl: "/manus-storage/gamification-14_8cfa45db.png",
          sourceDeck: "Gamification for Remote Teams",
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
    slides: [
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

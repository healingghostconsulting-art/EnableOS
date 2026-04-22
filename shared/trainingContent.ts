export type TrainingPresentationSlide = {
  id: string;
  eyebrow: string;
  title: string;
  narrative: string;
  bullets: string[];
  visualTone: string;
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
  options: TrainingApplicationOption[];
  correctOptionId: string;
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
};

export type TrainingPresentation = {
  heroTitle: string;
  heroSummary: string;
  evidenceLabel: string;
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
  applicationActivity: TrainingApplicationActivity;
  resourceActions: TrainingPresentationResource[];
};

type ModuleLike = {
  id: string;
  title: string;
  format: string;
  durationMinutes: number;
  skillFocus: string;
};

const trainingPresentationByModuleId: Record<string, TrainingPresentation> = {
  "mod-sf-1": {
    heroTitle: "Listening precision under friction",
    heroSummary: "This lesson reframes active listening as a visible service behavior: acknowledge emotion, isolate the operational issue, and confirm the next step without losing control of the interaction.",
    evidenceLabel: "Soft-skills deck translated into service-ready listening visuals",
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
    heroTitle: "Reassurance without overpromising",
    heroSummary: "This module turns reassurance language into a decision tool so the learner can sound confident, protect trust, and avoid making commitments the workflow cannot support.",
    evidenceLabel: "Language-confidence deck translated into reusable reassurance patterns",
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
    heroTitle: "De-escalation with professional recovery",
    heroSummary: "This scenario page converts the presentation into a visible recovery flow: stabilize emotion, narrow the issue, confirm the recovery path, and preserve confidence under pressure.",
    evidenceLabel: "Scenario content translated into a guided recovery storyboard",
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
    heroTitle: "Closings that protect confidence and workflow precision",
    heroSummary: "This checklist module turns closing behavior into a visible quality standard so learners can end interactions with clarity, ownership, and documented next-step confidence.",
    evidenceLabel: "Checklist content translated into an audit-ready closing sequence",
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
    return mapped;
  }

  return {
    heroTitle: module.title,
    heroSummary: `This ${module.format.toLowerCase()} is presented as a guided lesson inside ${journeyTitle}, with the focus placed on ${module.skillFocus.toLowerCase()} and the broader competency gap of ${competencyGap.toLowerCase()}.`,
    evidenceLabel: "Fallback presentation view",
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
    resourceActions: [
      { id: `${module.id}-resource-1`, label: "Lesson recap", detail: "Summarize the behavior, workflow use case, and coaching expectation." },
      { id: `${module.id}-resource-2`, label: "Manager follow-up", detail: "Use the lesson in the next coaching or review checkpoint." },
    ],
  };
}

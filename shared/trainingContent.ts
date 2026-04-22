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

export type TrainingPresentation = {
  heroTitle: string;
  heroSummary: string;
  evidenceLabel: string;
  slides: TrainingPresentationSlide[];
  coachPrompts: string[];
  reflectionPrompts: string[];
  practiceScenario: {
    title: string;
    situation: string;
    learnerTask: string;
    successSignals: string[];
  };
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
    resourceActions: [
      { id: `${module.id}-resource-1`, label: "Lesson recap", detail: "Summarize the behavior, workflow use case, and coaching expectation." },
      { id: `${module.id}-resource-2`, label: "Manager follow-up", detail: "Use the lesson in the next coaching or review checkpoint." },
    ],
  };
}

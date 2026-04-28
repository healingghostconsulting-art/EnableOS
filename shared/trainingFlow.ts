import type { TrainingPresentation } from "./trainingContent";

export type TrainingTrackFamily = "learner" | "leadership";

export type GuidedQuizTrigger = {
  id: string;
  stageId: "brief" | "practice" | "apply" | "reflect";
  pageIndex: number;
  pageCount: number;
  label: string;
  assessmentKey: "briefCheckpoint" | "practiceCheckpoint" | "applicationActivity" | "finalQuiz";
  modalTitle: string;
  modalPrompt: string;
};

export type GuidedTrainingPlan = {
  family: TrainingTrackFamily;
  targetDurationMinutes: number;
  targetDurationLabel: string;
  pacingLabel: string;
  slideCount: number;
  stageDurations: Array<{
    stageId: GuidedQuizTrigger["stageId"];
    label: string;
    minutes: number;
    durationLabel: string;
  }>;
  quizTriggers: GuidedQuizTrigger[];
};

function isLeadershipFamily(journeyTitle: string, moduleTitle: string, skillFocus: string) {
  const haystack = `${journeyTitle} ${moduleTitle} ${skillFocus}`.toLowerCase();
  return [
    "leadership",
    "executive",
    "kpi",
    "performance",
    "calibration",
    "engagement",
    "recognition",
    "trend",
    "governance",
    "roi",
  ].some((token) => haystack.includes(token));
}

function buildDurationLabel(minutes: number) {
  const hours = minutes / 60;
  if (hours >= 1) {
    return `${hours.toFixed(1)} hr guided experience`;
  }
  return `${minutes} min guided experience`;
}

function buildStageDurations(family: TrainingTrackFamily) {
  const minutes = family === "leadership"
    ? { brief: 70, practice: 55, apply: 50, reflect: 50 }
    : { brief: 50, practice: 40, apply: 40, reflect: 35 };

  return [
    { stageId: "brief" as const, label: "Brief + narrated walkthrough", minutes: minutes.brief, durationLabel: buildDurationLabel(minutes.brief) },
    { stageId: "practice" as const, label: "Practice + coached rehearsal", minutes: minutes.practice, durationLabel: buildDurationLabel(minutes.practice) },
    { stageId: "apply" as const, label: "Application + transfer proof", minutes: minutes.apply, durationLabel: buildDurationLabel(minutes.apply) },
    { stageId: "reflect" as const, label: "Reflection + final sprint", minutes: minutes.reflect, durationLabel: buildDurationLabel(minutes.reflect) },
  ];
}

function buildStageTriggers(
  stageId: GuidedQuizTrigger["stageId"],
  pageCount: number,
  assessmentKey: GuidedQuizTrigger["assessmentKey"],
  label: string,
  modalTitle: string,
  modalPrompt: string,
): GuidedQuizTrigger[] {
  if (pageCount <= 0) {
    return [] as GuidedQuizTrigger[];
  }

  const checkpointPageIndexes = Array.from(
    new Set([
      Math.max(0, Math.floor(pageCount / 2) - 1),
      Math.max(0, pageCount - 1),
    ])
  );

  return checkpointPageIndexes.map((pageIndex, triggerIndex) => ({
    id: `${stageId}-${assessmentKey}-${pageIndex}`,
    stageId,
    pageIndex,
    pageCount,
    label: triggerIndex === checkpointPageIndexes.length - 1 ? `${label} gate` : `${label} pulse check`,
    assessmentKey,
    modalTitle,
    modalPrompt,
  }));
}

export function buildGuidedTrainingPlan({
  journeyTitle,
  moduleTitle,
  skillFocus,
  presentation,
}: {
  journeyTitle: string;
  moduleTitle: string;
  skillFocus: string;
  presentation: TrainingPresentation | null;
}): GuidedTrainingPlan {
  const family = isLeadershipFamily(journeyTitle, moduleTitle, skillFocus) ? "leadership" : "learner";
  const targetDurationMinutes = family === "leadership" ? 225 : 165;
  const slideCount = (presentation?.slides.length ?? 0) + (presentation?.practiceSlides.length ?? 0) + (presentation?.applySlides.length ?? 0);

  const stageDurations = buildStageDurations(family);

  const quizTriggers: GuidedQuizTrigger[] = presentation
    ? [
        ...buildStageTriggers(
          "brief",
          presentation.slides.length,
          "briefCheckpoint",
          "Knowledge",
          `Checkpoint: ${moduleTitle}`,
          "Pause the guided walkthrough and confirm the learner understands the key lesson before moving forward.",
        ),
        ...buildStageTriggers(
          "practice",
          presentation.practiceSlides.length,
          "practiceCheckpoint",
          "Practice",
          `Rehearsal check: ${moduleTitle}`,
          "Use this popup checkpoint to confirm the learner can apply the behavior in a realistic rehearsal moment.",
        ),
        ...buildStageTriggers(
          "apply",
          presentation.applySlides.length,
          "applicationActivity",
          "Transfer",
          `Transfer gate: ${moduleTitle}`,
          "Confirm the learner can carry the guided lesson into live work before the module advances.",
        ),
        {
          id: `reflect-finalQuiz-0`,
          stageId: "reflect",
          pageIndex: 0,
          pageCount: 1,
          label: "Final sprint",
          assessmentKey: "finalQuiz",
          modalTitle: `Final knowledge sprint: ${moduleTitle}`,
          modalPrompt: "Finish the module with a scored end-of-module quiz that proves retention before completion is awarded.",
        },
      ]
    : [];

  return {
    family,
    targetDurationMinutes,
    targetDurationLabel: buildDurationLabel(targetDurationMinutes),
    pacingLabel:
      family === "leadership"
        ? "Designed as a deeper executive or leadership workshop with extended interpretation, decision framing, and transfer review."
        : "Designed as a longer guided learner path with narration, practice, transfer checks, and repeated comprehension confirmation.",
    slideCount,
    stageDurations,
    quizTriggers,
  };
}

import type { TrainingPresentation } from "./trainingContent";

export type TrainingTrackFamily = "learner" | "leadership";

export type StageId = "brief" | "practice" | "apply" | "reflect";

/**
 * SINGLE SOURCE OF TRUTH for the four guided training stages. BOTH the runtime stage array
 * in client/src/pages/EnableOSViews.tsx and buildGuidedTrainingPlan (below) read this, so a
 * stage id resolves to exactly one of each label. The three per-stage strings are distinct:
 *   - `label`          — the canonical stage NAME (Learn/Practice/Apply/Reflect).
 *   - `detail`         — content description ("Brief + narrated walkthrough" …).
 *   - `navigatorLabel` — stage-navigator description copy ("Focused lesson path" …).
 * `detail` and `navigatorLabel` are description copy and must NEVER stand in for the name.
 *
 * NOTE: the `id` values are PERSISTED — they appear in localStorage training progress
 * (assessmentKey-derived fields) and in quiz-trigger ids (`${stageId}-...`) stored in
 * dismissedQuizTriggerIds/completedQuizTriggerIds. Do NOT rename them or saved learner
 * progress is orphaned. See CLAUDE.md.
 */
export type StageDefinition = { id: StageId; label: string; detail: string; navigatorLabel: string };

export const STAGES: ReadonlyArray<StageDefinition> = [
  { id: "brief", label: "Learn", detail: "Brief + narrated walkthrough", navigatorLabel: "Focused lesson path" },
  { id: "practice", label: "Practice", detail: "Practice + coached rehearsal", navigatorLabel: "Practice walkthrough" },
  { id: "apply", label: "Apply", detail: "Application + transfer proof", navigatorLabel: "Transfer walkthrough" },
  { id: "reflect", label: "Reflect", detail: "Reflection + final quiz", navigatorLabel: "Reflection checkpoint" },
];

export const STAGE_BY_ID: Record<StageId, StageDefinition> =
  Object.fromEntries(STAGES.map((stage) => [stage.id, stage])) as Record<StageId, StageDefinition>;

export type GuidedQuizTrigger = {
  id: string;
  stageId: StageId;
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
    detail: string;
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
  const minutes: Record<StageId, number> = family === "leadership"
    ? { brief: 70, practice: 55, apply: 50, reflect: 50 }
    : { brief: 50, practice: 40, apply: 40, reflect: 35 };

  // Read labels + content details from the single STAGES source. The canonical stage NAME
  // is `label`; the old "Brief + narrated walkthrough"-style copy now lives in `detail`.
  return STAGES.map((stage) => ({
    stageId: stage.id,
    label: stage.label,
    detail: stage.detail,
    minutes: minutes[stage.id],
    durationLabel: buildDurationLabel(minutes[stage.id]),
  }));
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
    label: triggerIndex === checkpointPageIndexes.length - 1 ? `${label} check` : `${label} review`,
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
          `Knowledge check: ${moduleTitle}`,
          "Complete this inline knowledge check before moving deeper into the lesson.",
        ),
        ...buildStageTriggers(
          "practice",
          presentation.practiceSlides.length,
          "practiceCheckpoint",
          "Practice",
          `Practice check: ${moduleTitle}`,
          "Use this inline practice check to confirm the learner can apply the behavior in a realistic rehearsal moment.",
        ),
        ...buildStageTriggers(
          "apply",
          presentation.applySlides.length,
          "applicationActivity",
          "Transfer",
          `Transfer check: ${moduleTitle}`,
          "Confirm the learner can carry the guided lesson into live work before the module advances.",
        ),
        {
          id: `reflect-finalQuiz-0`,
          stageId: "reflect",
          pageIndex: 0,
          pageCount: 1,
          label: "Final Quiz",
          assessmentKey: "finalQuiz",
          modalTitle: `Final Quiz: ${moduleTitle}`,
          modalPrompt: "Finish the module with the inline final quiz and score at least 80% before completion is awarded.",
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

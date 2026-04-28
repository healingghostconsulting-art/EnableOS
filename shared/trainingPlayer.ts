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

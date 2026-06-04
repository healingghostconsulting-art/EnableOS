// ─────────────────────────────────────────────────────────────────────────────
// SLIDE MANIFEST — single source of truth for the converted PowerPoint slides
// that the Training Zone player shows in-lesson.
//
// To add the rest of a deck's slides (or a whole new deck):
//   1. Export each slide as an image into  client/public/slides/
//      (PNG, 16:9, ~1500px wide is plenty — keep each file well under ~1 MB).
//   2. Add an entry to the matching deck's `slides` array below, in slide order.
//      Only `file` is required; `title`/`caption` are optional polish.
//   3. New deck? Add a new object to `slideDecks` and list the module-id
//      prefixes (and Switch-lane preview ids) that should use it.
//
// See docs/IMPORTING_SLIDES.md for the full step-by-step (incl. how to convert
// a .pptx to per-slide PNGs).
// ─────────────────────────────────────────────────────────────────────────────

export interface ManifestSlide {
  /** File name inside client/public/slides/ — e.g. "softskills-08_fd8d5235.png". */
  file: string;
  /** Optional learner-facing title. Falls back to "<deck> · Slide N". */
  title?: string;
  /** Optional learner-facing caption. Falls back to a generic in-platform note. */
  caption?: string;
}

export interface SlideDeck {
  /** Stable deck id. */
  id: string;
  /** Display name of the source PowerPoint. */
  sourceDeck: string;
  /**
   * Module-id (and Switch-lane preview-id) prefixes that map to this deck.
   * Matched with String.startsWith, so "mod-wp" covers mod-wp-1/2/3.
   */
  modulePrefixes: string[];
  /** Ordered slides shown in the lesson (Previous/Next pages through these). */
  slides: ManifestSlide[];
}

export const slideDecks: SlideDeck[] = [
  {
    id: "softskills",
    sourceDeck: "Soft Skills & Customer/Patient Service Foundation",
    modulePrefixes: ["mod-sf", "mod-lfs", "mod-hcs"],
    slides: [
      { file: "softskills-08_fd8d5235.png", title: "Communication foundations overview" },
      { file: "softskills-09_815688d7.png", title: "Empathy foundations" },
      { file: "softskills-14_e11945d2.png", title: "Communication skills deep dive" },
      { file: "softskills-16_351b1cea.png", title: "Ask-probe-confirm service model" },
      { file: "softskills-27_c4f51069.png", title: "Empathy script rewrite activity" },
      { file: "softskills-30_0b757800.png", title: "Why patients become upset" },
      { file: "softskills-31_e39fe3f8.png", title: "Escalation curve for reassurance moments" },
      { file: "softskills-32_55dd4a02.png", title: "4-step de-escalation model" },
      { file: "softskills-33_546a5078.png", title: "Professionalism and branding" },
      { file: "softskills-34_229ecb62.png", title: "Digital professionalism standards" },
      { file: "softskills-35_8c2ed919.png", title: "Professional presence during recovery" },
      { file: "softskills-36_081f2024.png", title: "Closing with confidence and clarity" },
    ],
  },
  {
    id: "qa",
    sourceDeck: "Quality Assurance Essentials",
    modulePrefixes: ["mod-wp", "preview-workflow"],
    slides: [
      { file: "qa-10_c1b475bc.png", title: "Greeting and verification workflow" },
      { file: "qa-11_a61e56b8.png", title: "High-scoring behavior model" },
    ],
  },
  {
    id: "leadership-data",
    sourceDeck: "Unlocking the Power of Data",
    modulePrefixes: ["mod-dl", "mod-lfd", "preview-leadership"],
    slides: [
      { file: "leadership-data-08_d8fd351a.png", title: "How to read KPI reports" },
      { file: "leadership-data-09_f158ab35.png", title: "Interpreting KPI activity" },
      { file: "leadership-data-15_c9ba127f.png", title: "From insight to action" },
      { file: "leadership-data-17_e47d3a3d.png", title: "Examples of flawed analysis" },
    ],
  },
  {
    id: "performance-leadership",
    sourceDeck: "Utilizing Performance Management to Maximize Results",
    modulePrefixes: ["mod-lfp", "preview-performance"],
    slides: [
      { file: "performance-leadership-08_61606933.png", title: "Bucketing activity" },
      { file: "performance-leadership-09_edfbb1ea.png", title: "Avoiding mislabeling and bias" },
      { file: "performance-leadership-10_f976e1db.png", title: "Performance conversation framing" },
      { file: "performance-leadership-15_3215473c.png", title: "Engaging and developing high performers" },
    ],
  },
  {
    id: "gamification",
    sourceDeck: "Gamification for Remote Teams: Engaging and Empowering Leaders",
    modulePrefixes: ["mod-hce", "preview-engagement"],
    slides: [
      { file: "gamification-08_78b0164d.png", title: "Gamification mistakes to avoid" },
      { file: "gamification-09_013f4839.png", title: "Gamification program design" },
      { file: "gamification-10_48ec527b.png", title: "What makes a good reward" },
      { file: "gamification-15_b67831b0.png", title: "Recognition cadence operating rhythm" },
    ],
  },
];

/** Derive a "Slide N" page label from a slide filename like "qa-10_abc.png". */
export function slidePageLabel(file: string): string {
  const match = file.match(/-(\d+)(?:_|\.)/);
  return match ? `Slide ${Number.parseInt(match[1], 10)}` : "Slide";
}

/** The deck whose module-id prefixes match this module, or null if none. */
export function slideDeckForModuleId(moduleId: string): SlideDeck | null {
  return slideDecks.find((deck) => deck.modulePrefixes.some((prefix) => moduleId.startsWith(prefix))) ?? null;
}

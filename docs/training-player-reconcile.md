# Training player reskin — Phase 1 reconcile

Reconnaissance of the real `/training` lesson player before the v3 dual-theme reskin,
reconciled against the (separately-held) Design spec. Read by line range because
`EnableOSViews.tsx` is ~728 KB (past the grep cap).

## Location & ownership
- Component: `TrainingExperienceView` in `client/src/pages/EnableOSViews.tsx`,
  **lines 3848–6737** (~2,890 lines). JSX return root at **5340** (`<div className="focus-stack">`).
- `/training` is **Claude-owned** per `CLAUDE.md` — safe to modify here; Manus owns the rest.

## Current theme: dark-only
The player is styled **dark, hardcoded** — `text-white`, `text-slate-200/300/400`, `text-subtle-dark`,
`bg-white/6…12`, `border-white/10…12`, cyan accents, and the shared **`PremiumCard`** (a dark surface
used app-wide). There is **no light mode and no theme switch today**. Dual light/dark (Phase 3) means
driving every surface off `PlayerThemeContext` instead of these fixed dark classes.

## Band map (line anchors)
| Band | Lines | Notes |
|---|---|---|
| `focus-stack` root | 5340 | container |
| Header bar (`PremiumCard`, h-14) | 5344–5372 | title · Stage/Slide/% · "Focus" · "Back to learner". **Toggle goes here.** |
| 3-col grid (nav / canvas / rail) | 5373 | collapsible nav + collapsible progress rail; widths swap on collapse |
| Stages + Pages nav (`aside`) | 5375–5457 | active state = `bg-white text-slate-950` + numbered circle — **NOT** the v3 accessible cue; Phase 3 → gold pill + navy ink + check, ≥44px |
| Lesson canvas + "Training pages" `command-band` | 5459–6311 | sub-pages switch on `trainingWorkspacePage` |
| Deck viewer / interactive visual | 5554 | `TrainingVisualFrame` / `KpiScorecard` — **the deck slide stays light in both modes** |
| Coach speaker notes | 5691–5698 | facilitator-only, not learner notes |
| Checkpoint quiz (per stage) + modal | 6080–6311 | `InlineAssessmentShell` at 6291; verdict styling here |
| Deep resources card | 6313 | resources sub-page |
| Progress rail (`PremiumCard`, `2xl:sticky`) | 6383–6535 | collapsible; "Stage overview" at 6519 → Phase 4 becomes a stat strip < 1024px |
| Enlarge lightbox (`Dialog`) | 6537 | → Phase 3 uses the shipped `Modal` with a **dark tone** |
| Curriculum viewer (`Dialog`) | 6561 | slide deck modal |

Sub-page state: `trainingWorkspacePage: "brief" | "lesson" | "checkpoint" | "resources"` — **4 pages**.
Note the key `"brief"` renders the **"Overview"** label (5418).

## Extra-features reconcile (bookmarking / notes / inline video)
Probed the whole 3848–6737 range:
- **Bookmarking — ABSENT.** No `bookmark` anywhere.
- **Inline video — ABSENT.** No `<video>`, `<iframe>`, or `videoUrl`. Media is deck-slide images
  (`TrainingVisualFrame`, `KpiScorecard`) plus **audio narration** (`narrationStatus` play/pause).
- **Notes — no LEARNER notes.** What exists: coach `speakerNotes` (5697), a coach `coachCheckpointNote`
  textarea (3896), and the KPI scorecard `note` prop. All coach/facilitator-side.

**Conclusion:** there is nothing pre-existing to "fold in" — bookmarking, learner notes, and inline
video are **net-new** if the spec wants them. They are **not** added in this reconcile; flagging for
confirmation so the reskin doesn't silently invent features. The player's real interactive extras to
preserve are: audio narration, `BriefFlashCardDeck`, interactive visuals / deck viewer, the modal +
inline assessments, and the curriculum viewer.

## Shared-component coupling (affects Phase 3)
The player leans on globally-shared, dark-styled primitives: `PremiumCard` / `Card*`, `Badge`,
`Button`, `Dialog`, `AssessmentPanel`, `InlineAssessmentShell`, `BriefFlashCardDeck`. These are used by
other (non-training) surfaces, so the dual-mode reskin must be **theme-conditional inside the player**
(driven by `PlayerThemeContext`) rather than restyling the shared primitives — except the shipped v3
`Modal`, which gets a `tone` prop (Phase 2) so the Enlarge lightbox can go dark without call-site forks.

## Dominant risk: source-snapshot tests
~10 test files `readFileSync` this source and assert **exact copy/markup/class strings**:
`enableosTrainingLayout.test.ts` (**87 assertions**), `briefBoxPages`, `assessmentPanelStyles`,
`learnerWorkspaceCopy`, `pageTransition`, `trainingRoleContext`, `trainingCompletionRouting`,
`trainingProgressPersistence`, `learnerJourneyRouting`, `consistencyWrap`. **Any markup/class/copy
change in Phase 3 breaks these and must be updated in the same commit** — this is the primary effort
multiplier and the main way the demo/tests could break, so each reskin step is paired with its
assertion updates.

## Plan (subsequent phases)
- **P2 Primitives:** `PlayerThemeContext` mirroring `GrayscaleContext` (`enableos.player.theme`, default
  `focus`, persisted, **no document-root class** — never touch app `ThemeContext`/`.dark`); add `tone`
  to `Modal` (light default + dark variant).
- **P3 Reskin (both modes):** header, Stages+Pages nav (accessible active state), deck viewer
  (slide stays light), Enlarge lightbox (Modal tone), progress rail (`StatusMark`/`InfoTile`),
  Overview/Checkpoint+quiz/Resources/Curriculum sub-pages; header toggle, default focus, persisted.
- **P4 a11y + responsive:** quiz verdict = glyph + label + live-region announce; toggle announces
  state; focus rings; ≥44px; < 1024px → Contents to the shipped NavDrawer, progress rail → stat strip.

DEMO_MODE gating and the deck-visual content stay intact throughout.

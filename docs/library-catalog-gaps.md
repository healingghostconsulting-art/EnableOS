# Library Catalog — Data-Layer Gap Report

Diagnosis from CAT1 (Library Catalog data layer). Records what the catalog needs,
what's already available, and the gaps. **Update (CAT3): because this is a
tightly-coupled UI↔data contract, Claude Code owns both sides — the per-course
fields and seeded statuses below are being implemented in `listContentLibrary`
directly rather than handed off.**

## Context
The catalog (CAT3–CAT6) needs, per course: cover image, track, slide count,
duration, and per-learner status (not started / in-progress % / completed /
recommended). Served by `trpc.demo.secureLibrary` → `listContentLibrary()`
(`server/demoPlatform.ts`). The 7 real slide decks (covers/counts) live in
`shared/slideManifest.ts`.

## Available now (UI can derive)
| Field | Source |
|---|---|
| Cover image | `slideManifest` deck `slides[0]` (e.g. `softskills-01.jpg`) |
| Slide count | `slideManifest` deck `slides.length` (46/38/31/30/25/27/48) |
| Track | `asset.category` + `tracks[]` |
| Duration (estimate) | sum of `journey.modules[].durationMinutes`, or `runtimeByFormat` |
| In-progress % (current learner only) | client `sessionStorage: chcg-enableos-training-progress` |
| Source (CHCG vs client) | `asset.sourceKind` |

## Gaps (now being implemented server-side in CAT3)
1. **Per-learner course status** — `secureLibrary` returned no learner progress.
   Adding `status`, `percentComplete`, `lastSlideIndex` per course (seeded, realistic).
2. **Direct deck linkage** — adding `deckId` (slideManifest slug) per course.
3. **Cover + slideCount + durationMinutes on the payload** — resolved server-side
   from the manifest so the UI doesn't re-derive.
4. **Recommended reason** — adding `recommended: boolean` (+ optional reason),
   seeded from readiness/assignment intent.
5. **Course ↔ asset reconciliation** — a "course" = a deck-backed journey;
   client uploads are a separate source within tracks.

## Proposed data contract
```ts
type CatalogCourse = {
  id: string;
  title: string;
  track: string;                 // track id
  deckId: string;                // slideManifest slug
  coverImage: string;            // resolved server-side
  slideCount: number;
  durationMinutes: number;
  source: "chcg" | "client_upload";
  tags: string[];
  status: "not_started" | "in_progress" | "completed" | "recommended";
  percentComplete: number;
  lastSlideIndex?: number;       // resume point
  recommended: boolean;
  launchPath: string;
};
```

## Build implications
- CAT2 (shell): done, no data dependency.
- CAT3 (shelves + covers): builds on the new `courses` payload with seeded status.
- CAT4 (continue learning + recommended): works off the same seeded `status` /
  `percentComplete` / `lastSlideIndex` / `recommended` values.
- CAT5/CAT6 (search/filter, detail): buildable on the same contract.

## Phase-2 takeaway on the Manus/Claude Code split
The split depends on the work. Genuinely separate data (KPI thresholds, coaching
dates) → Manus preps in parallel (real speedup). Tightly-coupled UI↔data
contracts like this catalog → one owner is safer than a split.

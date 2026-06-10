# Importing PowerPoint slides into the Training Zone

The lesson player shows real, per-slide images from each course's PowerPoint.
This guide explains how to add the **rest** of a deck's slides (or a brand-new
deck) so they appear in the lesson.

There are only two moving parts:

1. **The images** live in `client/public/slides/` (served at `/slides/<file>`).
2. **The manifest** — [`shared/slideManifest.ts`](../shared/slideManifest.ts) —
   lists, per deck, which images to show and in what order. It also maps each
   deck to the modules that use it.

Add an image + a manifest line and the slide shows up. No other code changes.

---

## 1. Convert a `.pptx` to one image per slide

Pick whichever you have available:

### Option A — LibreOffice (free, scriptable, best for bulk)
```bash
# Step 1: pptx -> pdf
soffice --headless --convert-to pdf --outdir ./out "MyDeck.pptx"

# Step 2: pdf -> one PNG per page (needs poppler / ImageMagick)
pdftoppr -png -r 150 ./out/MyDeck.pdf ./out/mydeck       # poppler  -> mydeck-01.png, ...
# or:  magick -density 150 ./out/MyDeck.pdf ./out/mydeck-%02d.png   # ImageMagick
```

### Option B — PowerPoint / Keynote (manual, no tools)
`File ▸ Export ▸ File Format: PNG ▸ Save Every Slide`. PowerPoint writes
`Slide1.png, Slide2.png, …`.

### Option C — hand it to Cowork / Claude
Drop the `.pptx` into the repo (or attach it) and ask Claude to convert it. The
pptx skill can read the deck and Claude can produce the per-slide PNGs and the
manifest entries for you.

**Image tips**
- 16:9, ~1500 px wide is plenty (the player renders ≤ ~900 px).
- Keep each file well under ~1 MB (compress big exports — TinyPNG, `pngquant`,
  or `magick … -quality 82`). The whole `/slides/` folder is committed to git,
  so size adds up.

---

## 2. Name and drop the images

Put the PNGs in `client/public/slides/`. Use a clear, deck-prefixed name with a
zero-padded slide number, e.g.:

```
client/public/slides/qa-01.png
client/public/slides/qa-02.png
client/public/slides/qa-03.png
```

The original Manus exports carry a hash suffix (`qa-10_c1b475bc.png`); new files
don't need one — any filename works as long as it matches the manifest exactly.

---

## 3. Register them in the manifest

Open [`shared/slideManifest.ts`](../shared/slideManifest.ts) and add a line per
slide to the matching deck's `slides` array, **in slide order**. Only `file` is
required; `title` and `caption` are optional polish shown above/below the slide.

```ts
{
  id: "qa",
  sourceDeck: "Quality Assurance Essentials",
  modulePrefixes: ["mod-wp", "preview-workflow"],
  slides: [
    { file: "qa-01.png", title: "Why quality scoring exists" },
    { file: "qa-02.png", title: "The QA scorecard at a glance" },
    { file: "qa-03.png" },              // title/caption optional
    // …add the rest of the deck here…
  ],
},
```

### Adding a brand-new deck
Append a new object to `slideDecks` and list the module-id prefixes that should
use it. Prefixes are matched with `startsWith`, so `"mod-wp"` covers
`mod-wp-1/2/3`. Current module families:

| Deck | `modulePrefixes` |
|------|------------------|
| Soft Skills / Service | `mod-sf`, `mod-lfs`, `mod-hcs` |
| Quality Assurance | `mod-wp`, `preview-workflow` |
| Unlocking the Power of Data | `mod-dl`, `mod-lfd`, `preview-leadership` |
| Performance Management | `mod-lfp`, `preview-performance` |
| Gamification | `mod-hce`, `preview-engagement` |
| Real-time Coaching | *(none yet — needs a converted deck)* |
| Culture Momentum | *(none yet — needs a converted deck)* |

> The `preview-*` ids are the "Switch lane" preview scenarios managers/coaches
> see; include them so previews show real slides too.

The two journeys with *no* deck yet (**Real-time Coaching**, **Culture
Momentum**) currently fall back to generated title cards. Convert those decks
and add them as new entries to light them up.

---

## 4. Verify

```bash
pnpm test          # resolver coverage test confirms each deck stays "real"
pnpm dev           # open /training, page through the lesson with Previous/Next
```

The lesson's "Visual X of N" counter should equal the number of slides you
listed for that deck, and Previous/Next should page through them in order.

---

## Per-client KPI scorecards (WFM & KPI training)

The **Workforce Management & KPIs** deck (`mod-wfm-*` → deck `wfm-kpi`) has three
"KPI Scorecard" slides that are **not** shown as static images. Instead the lesson
renders a **live table** from [`shared/kpiScorecards.ts`](../shared/kpiScorecards.ts),
so each client's targets stay editable without re-exporting PowerPoint.

How it's wired:
- In `shared/slideManifest.ts`, the three scorecard slides carry a `scorecard` id:
  `wfm-kpi-29` → `"patient-service"`, `wfm-kpi-30` → `"efficiency"`, `wfm-kpi-31` → `"wfm"`.
- The player swaps the slide image for the `<KpiScorecard>` component whenever a slide
  has a `scorecard` id.

### Edit a client's targets
Open `shared/kpiScorecards.ts` and change the `goal` values in `aspirusKpiProfile`.
Each row is `{ metric, goal, definition }` — `goal` is the per-client number.

### Onboard a new client
1. Copy `aspirusKpiProfile`, rename it (e.g. `acmeKpiProfile`), set `clientId` / `clientName`.
2. Edit the `goal` values (and rows) for that client.
3. Register it in `clientKpiProfiles` (keyed by `clientId`).
4. (Optional) map a workspace tenant to that client in `tenantClientId` so the right
   targets show automatically per tenant. With no mapping it falls back to Aspirus.

No image work and no PowerPoint re-export is needed to change KPI numbers.

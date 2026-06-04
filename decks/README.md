# Source decks — drop your PowerPoints here

Put the original `.pptx` (or `.pdf`) course decks in this folder, then tell
Claude/Cowork to import them. Claude will:

1. Render **every** slide to a PNG (native PowerPoint export, 16:9) into
   `client/public/slides/`.
2. Pull each slide's title and register all slides in
   [`shared/slideManifest.ts`](../shared/slideManifest.ts), in order.
3. Run the tests and confirm each lesson pages through the full deck.

See [`docs/IMPORTING_SLIDES.md`](../docs/IMPORTING_SLIDES.md) for the full process.

**Naming tip:** name files by course so the deck is obvious, e.g.
`real-time-coaching.pptx`, `culture-momentum.pptx`, `quality-assurance.pptx`.

> The heavy source files in this folder are **git-ignored** on purpose — only
> the converted PNGs and the manifest get committed.

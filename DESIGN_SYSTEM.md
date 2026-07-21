# EnableOS Design System

The design system **as built**, on the Coach Studio standard adopted across every
workspace. This documents what ships today; v3 evolves the information architecture
(see [v3 direction](#v3-direction)) but reuses these tokens.

**Sources of truth**

- Tokens: [`client/src/index.css`](client/src/index.css) — the `@theme` block + `:root`.
- Chrome: [`client/src/components/WorkspaceShell.tsx`](client/src/components/WorkspaceShell.tsx).
- Cards: [`client/src/components/ActionCard.tsx`](client/src/components/ActionCard.tsx).

If this doc and those files disagree, the files win — update this doc.

---

## Palette (CHCG brand)

| Role | Hex | Token | Notes |
| --- | --- | --- | --- |
| Navy | `#1B303C` | `--brand-navy` / `text-brand-navy` | Primary text on light; header H1. |
| Gold | `#FCBC34` | `--accent-gold` / `text-accent-gold` | The one accent. Labels/eyebrows on **dark**. |
| Gold ink | `#7A5200` | `--accent-gold-ink` / `text-accent-gold-ink` | Gold darkened for **AA on light** surfaces. |
| Lighter blue | `#4A6373` | `--brand-blue` / `text-brand-blue` | Secondary text, subtitles on light. |
| Black | `#0b1826`–`#0f2334` | `.surface-dark` | Dark card/stat-bar surface (navy-black gradient). |
| White | `#ffffff` | — | Header container, light surfaces, logo on dark. |

The gold token is exact to the brand guide. Navy and lighter-blue are now tokenized
in `index.css` too; **existing components still reference them as inline `text-[#1B303C]`
/ `text-[#4A6373]` literals** — rewiring those onto the tokens is a v3 follow-up, not
done here. Semantic muted-label tokens for text on dark: `.text-muted-dark` (`#94a3b8`,
~5:1) and `.text-subtle-dark` (`#cbd5e1`).

### Dual-surface gold rule

Gold appears in two forms depending on the surface it sits on, so the accent reads at
AA either way:

- **On dark** surfaces (stat bar, dark cards) → `text-accent-gold` (`#FCBC34`).
- **On light** surfaces (white header band, the light gold `ActionCard`, modes label
  on the `command-band`) → `text-accent-gold-ink` (`#7A5200`).

`ActionCard` and `WorkspaceShell` already single-source this: the shell's stat-bar
label is `text-accent-gold`; its modes label is `text-accent-gold-ink`. The same rule
applies to the CHCG logo — White mark on dark, Navy mark on light (see
[`client/public/brand/README.md`](client/public/brand/README.md)).

---

## Typography

**Montserrat** for headings and body — weights 400 / 500 / 600 / 700 / 800.

- Loaded via `<link>` in [`client/index.html`](client/index.html).
- Set as the default sans through `--font-sans` in the `@theme` block; `body` inherits
  `var(--font-sans)`, and the Tailwind `font-sans` utility resolves to it.
- Do **not** add Mentone or a second display face — Montserrat covers headings + body.

Heading scale is set per surface (e.g. the `WorkspaceShell` H1 is `text-[1.2rem]`/
`sm:text-[1.3rem]`, weight 600, `text-brand-navy`). Uppercase micro-labels use
`tracking-[0.2em]`–`[0.24em]` at `text-[10px]`–`[11px]`.

---

## Components

### `WorkspaceShell`

The canonical page chrome every workspace routes through (Coach / Manager / Learner /
Library / Mission Hub / Guide / Reporting / Client Control / CHCG Command).

Props: `title`, `subtitle`, `actions`, `stats` (`WorkspaceStat[]`), `tabs`
(`WorkspaceTab[]`), `activeTab`, `onTabChange`, `modesLabel`, `modesSubtitle`,
`statsLead`, `betweenStatsAndTabs`, `statsGridClassName`, `subTruncate`, `children`.

Three bands:

1. **Header** — white rounded container, short **title** (H1, `text-brand-navy`) +
   **subtitle** (`#4A6373`). Optional top-right `actions`. Short name, not a sentence.
2. **Stat bar** — one continuous dark band (`.surface-dark`-style gradient) of compact
   tiles: icon + **gold** uppercase label + white value + slate sub. Omit `stats` to
   skip it. Optional `statsLead` context segment.
3. **Modes row** — the light `command-band`: gold-ink `modesLabel` + a white pill
   tab-group (active = white). Omit `tabs` for an overview page with no modes; tab
   badges (e.g. Alerts) supported.

### `ActionCard`

The shared primary/secondary card family (promoted from Coach Studio's
`CoachLaneActionCard`). Props: `eyebrow`, `title`, `body`, `action`, `accent`.

- `accent="gold"` — highlighted **primary** action (light gold card, `accent-gold-ink`
  eyebrow, navy title).
- `accent="dark"` — **secondary** action (dark card, `accent-gold` eyebrow, white title).
- `accent="emerald"` — positive / confirm.

### InfoTile (pattern, not yet a component)

Read-only stat/info tiles on dark cards use a recurring inline pattern —
`rounded-[1.35rem] border border-white/12 bg-slate-950/50 px-4 py-4` with a
`text-accent-gold` label, white value, and slate sub (see Client Control / CHCG
Command). This is **not** extracted into a component yet; promoting it to an
`InfoTile` is a v3 candidate. `ActionCard` is for *actionable* cards; info tiles have
no action slot.

---

## Contrast (WCAG AA)

- Label accents follow the [dual-surface gold rule](#dual-surface-gold-rule) so they
  clear AA on their background.
- On dark surfaces, use `.text-muted-dark` / `.text-subtle-dark` for secondary labels
  instead of `text-slate-500` (~2.9:1 on navy — fails).
- On light surfaces, faint micro-labels use `slate-600`, not `slate-500`.
- The header tenant badge uses `text-slate-600` (was `text-slate-300`, which failed on
  the near-white header).

---

## v3 direction

v3's target information architecture is a **left-nav, dashboard-first shell** (persistent
sidebar navigation, a dashboard landing). The tokens and components here carry across —
palette, Montserrat, the dual-surface gold rule, `WorkspaceShell`, and `ActionCard` are
the substrate v3 builds on. Non-shipped design references (goal mock-ups, brand PDF) live
in [`docs/design/`](docs/design/).

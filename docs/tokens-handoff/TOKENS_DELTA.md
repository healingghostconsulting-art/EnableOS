# EnableOS v3 — Canonical token standard & port deltas

**Design system:** this project · **Deployed app:** `healingghostconsulting-art/EnableOS` @ `a6a5685`
(verified: `a6a5685` ≡ `main`, no changes between them as of 2026‑08‑03).

This is the canonical standard for the interaction-layer reskin. Section 1 is the standard as it
stands. Section 2 is the **delta to port** — every place the design standard and the deployed app
disagree, or where the standard defines something the app has no token for.

---

## 1 · The standard

### 1.1 Color — brand core

| Token | Value | Role |
| --- | --- | --- |
| `--brand-navy` | `#1B303C` | Primary text on light · H1 · primary button fill |
| `--gold` | `#FCBC34` | The one accent — **dark surfaces / fills only** |
| `--gold-ink` | `#7A5200` | Gold darkened for AA — **all gold text on light** |
| `--brand-blue` | `#4A6373` | Secondary text · subtitles |
| `--black` / `--white` | `#000000` / `#FFFFFF` | — |

**Dual-surface gold rule (non-negotiable):** `#FCBC34` only on dark surfaces or as a fill behind
dark text. Gold *text* on light is always `#7A5200`. `#FCBC34` on white fails WCAG AA.

### 1.2 Color — semantic

| Token | Base | `-ink` (text on light) | `-soft` (fill) | Role |
| --- | --- | --- | --- | --- |
| `--status-info` | `#22b8cf` | `#0e7490` | `rgba(34,184,207,.12)` | **Cyan** — coaching |
| `--status-green` | `#10b981` | `#047857` | `rgba(16,185,129,.15)` | **Emerald** — positive / on-track |
| `--status-red` | `#f43f5e` | `#be123c` | `rgba(244,63,94,.15)` | **Rose** — alert / at-risk |
| `--status-amber` | `#f59e0b` | `#b45309` | `rgba(245,158,11,.15)` | Watch / monitor |

Status is **never** color alone — always paired with an icon and a text label.

### 1.3 Color — surfaces

**Light:** `--surface-page #f7f8fa` · `--surface-card #ffffff` · `--surface-sunken #f2f4f6`
**Dark:** gradient `160deg, #0b1826 → #0f2334`; raised tile `#142430`
**Text on dark:** `#ffffff` · `--text-muted-dark #94a3b8` (~5:1) · `--text-subtle-dark #cbd5e1`
**Hairlines:** light `rgba(27,48,60,.10)` · dark `rgba(255,255,255,.12)` · gold `rgba(252,188,52,.35)`

### 1.4 Type — Montserrat (single family, headings + body)

Weights 400 / 500 / 600 / 700 / 800 — **600 is the workhorse**.

| Token | px | Use |
| --- | --- | --- |
| `--fs-display` | 30 | Hero |
| `--fs-h1` | 21 | Shell H1 |
| `--fs-h2` | 17 | Card / section title |
| `--fs-h3` | 15 | Sub-card title |
| `--fs-body` | 14 | Body |
| `--fs-sm` | 13 | Secondary |
| `--fs-xs` | 12 | Meta / table |
| `--fs-micro` | 11 | Uppercase micro-label |
| `--fs-nano` | 10 | Tightest eyebrow |

Line heights `1.15 / 1.35 / 1.5`. Headings `-0.01em`. Uppercase labels track `0.2em`–`0.24em`.

### 1.5 Spacing — 4px rhythm

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64` (`--space-1` … `--space-16`)

### 1.6 Radius

`--radius-xs 8` · `sm 12` · `md 16` · `lg 20` · `xl 26` · `2xl 32` · `3xl 40` · `pill 9999`

### 1.7 Elevation — navy-tinted, large-radius, low-opacity

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-xs` | `0 1px 2px rgba(27,48,60,.06)` | Controls |
| `--shadow-sm` | `0 10px 24px rgba(27,48,60,.06)` | Hover / chips |
| `--shadow-card` | `0 18px 44px rgba(15,23,42,.06)` | Widget cards |
| `--shadow-md` | `0 14px 30px rgba(15,23,42,.12)` | Action / dark tiles |
| `--shadow-lg` | `0 24px 80px rgba(27,48,60,.10)` | Glass panels |
| `--shadow-xl` | `0 30px 120px rgba(27,48,60,.10)` | Shells / modals |
| `--ring` | `0 0 0 3px rgba(252,188,52,.45)` | **Gold focus ring** |

### 1.8 Motion

`--ease-out cubic-bezier(.16,1,.3,1)` · `--dur-fast 180ms` · `--dur 280ms` · `--dur-slow 400ms`
Hover lifts `translateY(-3px)` and warms the border toward gold. No bounce, no springy overshoot.

---

## 2 · Deltas to port

### 2.1 🔴 BREAKING — radius tokens collide

The app derives radii from a single `--radius: 1rem` via `calc()`. **The same token names carry
different values.** Porting the standard's values without renaming will silently change geometry
across every shadcn primitive.

| Token | Deployed (`a6a5685`) | Standard | Δ |
| --- | --- | --- | --- |
| `--radius-sm` | `calc(1rem - 4px)` = **12px** | 12px | ✅ match |
| `--radius-md` | `calc(1rem - 2px)` = **14px** | **16px** | ⚠️ +2px |
| `--radius-lg` | `1rem` = **16px** | **20px** | ⚠️ +4px |
| `--radius-xl` | `calc(1rem + 4px)` = **20px** | **26px** | ⚠️ +6px |
| `--radius-xs` / `2xl` / `3xl` / `pill` | *absent* | 8 / 32 / 40 / 9999 | ➕ new |

**Recommendation:** keep the app's `--radius`-derived scale for shadcn internals, and add the
standard's values under an explicit `--eos-radius-*` namespace. Do **not** overwrite in place.

### 2.2 ➕ Semantic colors are not tokenized

`index.css` tokenizes only `--accent-gold`, `--accent-gold-ink`, `--brand-navy`, `--brand-blue`.
Cyan / emerald / rose exist **only as inline Tailwind classes** (`cyan-100/800`, `emerald-50/700`,
`amber-50`) inside `v3/InfoTile.tsx` and `v3/RoleCard.tsx`. There is no `--status-*` family.

**Port:** add the full `--status-{info,green,red,amber}` + `-ink` + `-soft` set, then rewire those
two components off inline classes.

### 2.3 ➕ No type-scale, spacing, or elevation tokens

The app tokenizes `--font-sans` (Montserrat ✅) and nothing else from §1.4–1.7. Every size, gap, and
shadow is an inline Tailwind literal (`text-[12px]`, `gap-5`, `shadow-[0_18px_44px_rgba(15,23,42,0.06)]`).

**Port:** add §1.4, §1.5, §1.7 as tokens. This is the highest-leverage item — it is what makes the
reskin editable rather than a find-and-replace across ~20 files.

### 2.4 ⚠️ Naming mismatch: `--gold` vs `--accent-gold`

Deployed uses `--accent-gold` / `--accent-gold-ink`; the standard uses `--gold` / `--gold-ink`.
Same values. **Recommendation:** keep the app's names, alias in the design system — a rename would
touch every `text-accent-gold` utility for no visual gain.

### 2.5 ⚠️ Dark mode: two incompatible models

The app ships a **full `.dark` class palette** in oklch (`--background`, `--card`, `--popover`,
`--border`, …). The design standard has **no `.dark` block** — it expresses dark surfaces as explicit
tokens (`--dark-1/2/3`, `--text-muted-dark`) applied per-component via an `onDark` prop.

This is the single biggest structural gap and it directly affects the reskin: the interaction specs
below define dark variants per-component, which maps to the `onDark` model, **not** to `.dark`.

**Decision needed:** either (a) the interaction layer stays light-only in-app and dark variants are
reserved for dark *surfaces* inside light pages (the current v3 reality), or (b) the app's `.dark`
palette becomes real and the specs get remapped onto it. I've specced for (a) since that is what v3
actually renders today — flag if you want (b).

### 2.6 ⚠️ Chart ramp: hex vs oklch

Standard `--chart-1…5` are hex (`#4A6373`, `#FCBC34`, `#1B303C`, `#22b8cf`, `#94a3b8`); deployed are
oklch and **not the same colors** (`--chart-4` deployed is `oklch(0.24 0 0)` ≈ near-black, standard is
cyan). Any donut/chart reskin must reconcile these.

### 2.7 ⚠️ Skeletons currently shimmer gold

`ui/skeleton.tsx` is `bg-accent animate-pulse`, and `--accent` is `oklch(0.95 0.03 84)` — a warm
gold tint. Loading states therefore read as branded gold rather than neutral. The spec below
specifies a **neutral** skeleton (`--surface-sunken`) with gold reserved for real accent moments.

### 2.8 Interaction primitives exist but are unstyled

`dialog · input · select · dropdown-menu · textarea · label · alert · skeleton · sonner` are all
present as stock shadcn. They inherit `--ring` (already gold ✅) but otherwise carry no brand
treatment. Concrete geometry gaps against the specs:

| Primitive | Deployed | Spec |
| --- | --- | --- |
| `DialogContent` | `rounded-lg` (16px), `max-w-lg`, `p-6` | 26px radius, `--shadow-xl` |
| `DialogOverlay` | `bg-black/50` | `rgba(11,24,38,.52)` + `blur(3px)` navy scrim |
| `Input` | `h-9` (36px), `rounded-md` (14px) | 42px, 12px radius |
| `SelectTrigger` | `h-9`, `w-fit` | 42px, full-width in forms |
| `Skeleton` | `bg-accent` (gold-tinted) | `--surface-sunken` (neutral) |
| `Toaster` | sonner defaults via `--popover` | brand surface + status accent bar |

---

## 3 · Port order (recommended)

1. **Tokens first** — §2.3 (type / spacing / elevation) and §2.2 (semantic colors), under the
   `--eos-*` namespace to avoid the §2.1 collision.
2. **Resolve §2.1 and §2.5** — these are decisions, not edits.
3. **Reskin the primitives** — §2.8, one file each, against the specs in
   `templates/interaction-specs/`.
4. **Rewire inline literals** — `InfoTile`, `RoleCard`, and the v3 components listed in
   `code-connect.json` → `tokens.map[].literalsIn`.

# Design references (non-shipped)

This folder holds **design intent**, not application assets. Nothing here is imported,
bundled, or served by the app — it's versioned so the goal is reviewable alongside the
code that chases it.

## What belongs here

- The v3 goal mock-ups (the target left-nav, dashboard-first shell).
- The CHCG brand PDF / brand guide.
- Any exploration, redlines, or reference exports that inform the build.

## What does NOT belong here

- **Shipped brand assets** (the official logo SVGs) → those live in
  [`client/public/brand/`](../../client/public/brand/), which the app actually serves.
- **The design system as built** → documented in
  [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) at the repo root.

Think of it as: `docs/design/` = where we're going (intent), `DESIGN_SYSTEM.md` = what
exists today, `client/public/brand/` = the real assets in the product.

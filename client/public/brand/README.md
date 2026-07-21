# CHCG Brand Assets

Official CH Consulting Group (CHCG) logo assets, served statically from
`/brand/…` (Vite serves `client/public/` at the web root).

## Files

| File | Use on | Status |
| --- | --- | --- |
| `CHCG-Logo-Navy.svg` | **Light** surfaces (white / cream / light-gray backgrounds) | ⛔ **not yet in repo — drop the official file here** |
| `CHCG-Logo-White.svg` | **Dark** surfaces (navy / slate / photographic backgrounds) | ⛔ **not yet in repo — drop the official file here** |

> These two SVGs are the **official** marks and must be supplied by the brand owner.
> Do not generate, trace, or approximate them — this folder only documents the slot
> and usage rules until the real files are added. Once present, remove the ⛔ notes.

## Usage rules

- **Dual-surface rule:** White logo on dark surfaces, Navy logo on light surfaces.
  Pick the variant by the background it sits on, never by the current view's role.
- **Do not recolor.** The SVG fills are brand-correct as delivered — leave the SVG
  internals untouched. Don't override `fill`, apply CSS filters, or wrap in a tinted
  container that bleeds through.
- **Do not stretch or skew.** Scale uniformly (preserve aspect ratio); constrain by
  width or height, never both to different ratios.
- **Clear space & min size:** keep legible padding around the mark and don't render
  it so small the wordmark breaks up.

## Reference in the app

```html
<!-- light surface -->
<img src="/brand/CHCG-Logo-Navy.svg" alt="CH Consulting Group" />
<!-- dark surface -->
<img src="/brand/CHCG-Logo-White.svg" alt="CH Consulting Group" />
```

## Not yet available

The **CH monogram** is not yet a standalone asset. When the owner supplies it, add it
here (e.g. `CHCG-Monogram-Navy.svg` / `-White.svg`) and document it in this table.

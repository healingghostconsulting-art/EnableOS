import { describe, it, expect } from "vitest";
import {
  authorDeckVisual,
  getAuthoringDeck,
  getResolvedPresentation,
  validateDeckImage,
} from "./demoPlatform";

// Minimal valid image byte-signatures for the magic-byte validator.
function pngBuffer(width: number, height: number): Buffer {
  const b = Buffer.alloc(28);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  b[24] = 8; b[25] = 6;
  return b;
}
function jpegBuffer(width: number, height: number): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff, (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
  ]);
}
function webpBuffer(width: number, height: number): Buffer {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(22, 4);
  b.write("WEBP", 8, "ascii");
  b.write("VP8X", 12, "ascii");
  b.writeUInt32LE(10, 16);
  const w1 = width - 1, h1 = height - 1;
  b[24] = w1 & 0xff; b[25] = (w1 >> 8) & 0xff; b[26] = (w1 >> 16) & 0xff;
  b[27] = h1 & 0xff; b[28] = (h1 >> 8) & 0xff; b[29] = (h1 >> 16) & 0xff;
  return b;
}

// DECK2 (Wave 5): deck-visual authoring on the ContentStore seam. Deck visuals
// resolve per-module (key = moduleId) even though decks are shared, so an edit
// stays scoped to the module. Only title/caption are editable; image + scorecard +
// deck identity are locked.
describe("DECK2 — deck-visual authoring", () => {
  // mod-sf-1, mod-lfs-1, mod-hcs-1 all render the shared "softskills" deck.
  const M1 = "mod-sf-1";
  const M2 = "mod-lfs-1";

  it("core title/caption edit shows on that module for all tenants, but NOT on a sibling module sharing the same deck", () => {
    const idx = 7;
    const before2 = getResolvedPresentation(M2, null)!.deckVisuals[idx]!;
    const beforeImage = getResolvedPresentation(M1, null)!.deckVisuals[idx]!.imageUrl;

    authorDeckVisual({ scope: "core", moduleId: M1, op: { kind: "patch", id: String(idx), patch: { title: "Core deck title", caption: "Core deck caption" } } });

    // Applies to M1 for core AND every tenant.
    expect(getResolvedPresentation(M1, null)!.deckVisuals[idx]!.title).toBe("Core deck title");
    expect(getResolvedPresentation(M1, "deck-t1")!.deckVisuals[idx]!.title).toBe("Core deck title");
    expect(getResolvedPresentation(M1, null)!.deckVisuals[idx]!.caption).toBe("Core deck caption");
    // Image (and the rest) preserved — only text changed.
    expect(getResolvedPresentation(M1, null)!.deckVisuals[idx]!.imageUrl).toBe(beforeImage);

    // The sibling module on the same deck is untouched (per-module isolation).
    expect(getResolvedPresentation(M2, null)!.deckVisuals[idx]!.title).toBe(before2.title);
    expect(getResolvedPresentation(M2, null)!.deckVisuals[idx]!.title).not.toBe("Core deck title");
  });

  it("tenant edit is scoped to that tenant + module only", () => {
    const idx = 3;
    authorDeckVisual({ scope: "tenant", tenantId: "deck-t1", moduleId: M1, op: { kind: "patch", id: String(idx), patch: { caption: "Tenant-only caption" } } });

    expect(getResolvedPresentation(M1, "deck-t1")!.deckVisuals[idx]!.caption).toBe("Tenant-only caption");
    expect(getResolvedPresentation(M1, "deck-t2")!.deckVisuals[idx]!.caption).not.toBe("Tenant-only caption");
    expect(getResolvedPresentation(M1, null)!.deckVisuals[idx]!.caption).not.toBe("Tenant-only caption");
  });

  it("hide drops a deck slide from the player + lists it in hidden; unhide restores; other tenants unaffected", () => {
    const M = "mod-hcs-1";
    const total = getResolvedPresentation(M, "deck-t3")!.deckVisuals.length;
    expect(total).toBeGreaterThan(5);

    authorDeckVisual({ scope: "tenant", tenantId: "deck-t3", moduleId: M, op: { kind: "hide", id: "2" } });
    expect(getResolvedPresentation(M, "deck-t3")!.deckVisuals).toHaveLength(total - 1);
    expect(getAuthoringDeck({ scope: "tenant", tenantId: "deck-t3", moduleId: M })!.hiddenSlides.some((s) => s.index === 2)).toBe(true);
    // Another tenant keeps the full deck.
    expect(getResolvedPresentation(M, "deck-t4")!.deckVisuals).toHaveLength(total);

    authorDeckVisual({ scope: "tenant", tenantId: "deck-t3", moduleId: M, op: { kind: "unhide", id: "2" } });
    expect(getResolvedPresentation(M, "deck-t3")!.deckVisuals).toHaveLength(total);
    expect(getAuthoringDeck({ scope: "tenant", tenantId: "deck-t3", moduleId: M })!.hiddenSlides).toHaveLength(0);
  });

  it("rejects locked-field edits (file / scorecard) and add/remove", () => {
    expect(() => authorDeckVisual({ scope: "core", moduleId: M1, op: { kind: "patch", id: "1", patch: { file: "hacked.jpg" } as never } })).toThrow(/locked/i);
    expect(() => authorDeckVisual({ scope: "core", moduleId: M1, op: { kind: "patch", id: "1", patch: { scorecard: "wfm" } as never } })).toThrow(/locked/i);
    expect(() => authorDeckVisual({ scope: "tenant", tenantId: "deck-t1", moduleId: M1, op: { kind: "add", item: { id: "99", title: "x", caption: "y", file: "z.jpg" } } as never })).toThrow(/cannot be added/i);
    expect(() => authorDeckVisual({ scope: "core", moduleId: M1, op: { kind: "remove", id: "1" } as never })).toThrow(/cannot be removed/i);
  });

  it("preserves the scorecard binding across a title edit on a scorecard-bearing slide", () => {
    const moduleId = "mod-wfm-1"; // renders the wfm-kpi deck (scorecard-linked slides)
    const deckVisuals = getResolvedPresentation(moduleId, null)!.deckVisuals;
    const scoreIndex = deckVisuals.findIndex((v) => v.scorecardId === "wfm");
    expect(scoreIndex).toBeGreaterThanOrEqual(0);

    authorDeckVisual({ scope: "core", moduleId, op: { kind: "patch", id: String(scoreIndex), patch: { title: "Edited scorecard slide title" } } });
    const after = getResolvedPresentation(moduleId, null)!.deckVisuals[scoreIndex]!;
    expect(after.title).toBe("Edited scorecard slide title");
    // The scorecard binding + image survive the text edit.
    expect(after.scorecardId).toBe("wfm");
    expect(after.imageUrl).toContain("/slides/");
  });
});

describe("DECK3 — image upload validation + tenant isolation", () => {
  it("accepts valid PNG / JPEG / WEBP by magic bytes", () => {
    expect(validateDeckImage(pngBuffer(100, 100)).type).toBe("png");
    expect(validateDeckImage(jpegBuffer(100, 100)).type).toBe("jpeg");
    expect(validateDeckImage(webpBuffer(100, 100)).type).toBe("webp");
  });

  it("rejects empty, oversized, wrong-type, SVG, script-bearing, spoofed, and absurd-dimension uploads", () => {
    expect(() => validateDeckImage(Buffer.alloc(0))).toThrow(/empty/i);
    // Oversized (>5 MB) — rejected before type detection.
    expect(() => validateDeckImage(Buffer.alloc(5 * 1024 * 1024 + 1))).toThrow(/5 MB/i);
    // Not an image at all.
    expect(() => validateDeckImage(Buffer.from("this is just plain text, not an image"))).toThrow(/unsupported/i);
    // SVG (script-capable) — not a raster signature.
    expect(() => validateDeckImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toThrow(/unsupported/i);
    // HTML/script payload.
    expect(() => validateDeckImage(Buffer.from("<html><body><script>steal()</script></body></html>"))).toThrow(/unsupported/i);
    // Content-type spoof: begins like a PNG but the signature is corrupt / non-PNG bytes.
    expect(() => validateDeckImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00, 0x11, 0x22, 0x33, 0x44]))).toThrow(/unsupported/i);
    // Absurd dimensions.
    expect(() => validateDeckImage(pngBuffer(999999, 999999))).toThrow(/out of range/i);
  });

  it("enforces tenant isolation on the imageKey reference — a caller can only reference its own scope's key", () => {
    const M = "mod-sf-1";
    const idx = "5";
    const tenantAKey = "deck-visual-images/tenant/deck-tA/abc123_deadbeef.png";

    // Tenant A may reference its own key.
    expect(() => authorDeckVisual({ scope: "tenant", tenantId: "deck-tA", moduleId: M, op: { kind: "patch", id: idx, patch: { imageKey: tenantAKey } } })).not.toThrow();
    // Tenant A may NOT reference tenant B's key, a core key, or an arbitrary key.
    expect(() => authorDeckVisual({ scope: "tenant", tenantId: "deck-tA", moduleId: M, op: { kind: "patch", id: idx, patch: { imageKey: "deck-visual-images/tenant/deck-tB/x.png" } } })).toThrow(/does not belong/i);
    expect(() => authorDeckVisual({ scope: "tenant", tenantId: "deck-tA", moduleId: M, op: { kind: "patch", id: idx, patch: { imageKey: "deck-visual-images/core/x.png" } } })).toThrow(/does not belong/i);
    expect(() => authorDeckVisual({ scope: "tenant", tenantId: "deck-tA", moduleId: M, op: { kind: "patch", id: idx, patch: { imageKey: "demo-content-library/deck-tA/x.png" } } })).toThrow(/does not belong/i);
    // Core may reference a core key but not a tenant key.
    expect(() => authorDeckVisual({ scope: "core", moduleId: M, op: { kind: "patch", id: idx, patch: { imageKey: "deck-visual-images/core/core1.png" } } })).not.toThrow();
    expect(() => authorDeckVisual({ scope: "core", moduleId: M, op: { kind: "patch", id: idx, patch: { imageKey: "deck-visual-images/tenant/deck-tA/x.png" } } })).toThrow(/does not belong/i);
  });

  it("resolves the replaced image for the authoring scope, and revert clears it back to the manifest image", () => {
    const M = "mod-sf-1";
    const idx = 6;
    const manifestUrl = getResolvedPresentation(M, null)!.deckVisuals[idx]!.imageUrl;
    expect(manifestUrl).toContain("/slides/");

    // Core image replacement surfaces to the player for that module (all tenants).
    const coreKey = "deck-visual-images/core/replacement_112233.png";
    authorDeckVisual({ scope: "core", moduleId: M, op: { kind: "patch", id: String(idx), patch: { imageKey: coreKey } } });
    expect(getResolvedPresentation(M, null)!.deckVisuals[idx]!.imageUrl).toBe(`/manus-storage/${coreKey}`);
    expect(getResolvedPresentation(M, "deck-any")!.deckVisuals[idx]!.imageUrl).toBe(`/manus-storage/${coreKey}`);
    // getAuthoringDeck flags it as replaced.
    const slide = getAuthoringDeck({ scope: "core", moduleId: M })!.slides[idx]!;
    expect(slide.imageReplaced).toBe(true);

    // Revert (imageKey:null) falls back to the manifest image.
    authorDeckVisual({ scope: "core", moduleId: M, op: { kind: "patch", id: String(idx), patch: { imageKey: null } } });
    expect(getResolvedPresentation(M, null)!.deckVisuals[idx]!.imageUrl).toBe(manifestUrl);
    expect(getAuthoringDeck({ scope: "core", moduleId: M })!.slides[idx]!.imageReplaced).toBe(false);
  });
});

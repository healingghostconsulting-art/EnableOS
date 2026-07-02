import { describe, it, expect } from "vitest";
import {
  authorDeckVisual,
  getAuthoringDeck,
  getResolvedPresentation,
} from "./demoPlatform";

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

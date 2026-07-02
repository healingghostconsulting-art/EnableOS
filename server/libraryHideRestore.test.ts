import { describe, it, expect } from "vitest";
import {
  authorLibraryContent,
  getAuthoringLibraryContent,
  getHiddenLibraryAssets,
} from "./demoPlatform";

// LIBRARY4: reversible hide + restore for library assets, reusing the generic
// hide/unhide store op. resolveLibraryAssets is unchanged; getHiddenLibraryAssets
// surfaces the current scope's tombstones.
describe("LIBRARY4 — library hide / restore", () => {
  const hasAsset = (res: { assets: Array<{ id: string }> }, id: string) => res.assets.some((asset) => asset.id === id);

  it("core hide removes an asset from resolve and surfaces it in hidden; unhide reverses both", () => {
    const coreId = getAuthoringLibraryContent({ scope: "core" }).assets[0]!.id;

    authorLibraryContent({ scope: "core", op: { kind: "hide", id: coreId } });
    expect(hasAsset(getAuthoringLibraryContent({ scope: "core" }), coreId)).toBe(false);
    const hidden = getHiddenLibraryAssets({ scope: "core" });
    expect(hidden.assets.some((a) => a.id === coreId)).toBe(true);
    // Hidden entries carry resolved title + source + category for the shelf.
    const entry = hidden.assets.find((a) => a.id === coreId)!;
    expect(entry.title.length).toBeGreaterThan(0);
    expect(["chcg", "client_upload"]).toContain(entry.sourceKind);

    authorLibraryContent({ scope: "core", op: { kind: "unhide", id: coreId } });
    expect(hasAsset(getAuthoringLibraryContent({ scope: "core" }), coreId)).toBe(true);
    expect(getHiddenLibraryAssets({ scope: "core" }).assets.some((a) => a.id === coreId)).toBe(false);
  });

  it("tenant hide of a core asset is scoped: absent for that tenant, present in its hidden list, untouched elsewhere", () => {
    const coreId = getAuthoringLibraryContent({ scope: "core" }).assets[0]!.id;

    authorLibraryContent({ scope: "tenant", tenantId: "lib4-t1", op: { kind: "hide", id: coreId } });
    // Scoped out for this tenant only.
    expect(hasAsset(getAuthoringLibraryContent({ scope: "tenant", tenantId: "lib4-t1" }), coreId)).toBe(false);
    expect(hasAsset(getAuthoringLibraryContent({ scope: "tenant", tenantId: "lib4-t2" }), coreId)).toBe(true);
    // In this tenant's hidden list, but not another tenant's, and not core's.
    expect(getHiddenLibraryAssets({ scope: "tenant", tenantId: "lib4-t1" }).assets.some((a) => a.id === coreId)).toBe(true);
    expect(getHiddenLibraryAssets({ scope: "tenant", tenantId: "lib4-t2" }).assets.some((a) => a.id === coreId)).toBe(false);
    expect(getHiddenLibraryAssets({ scope: "core" }).assets.some((a) => a.id === coreId)).toBe(false);

    authorLibraryContent({ scope: "tenant", tenantId: "lib4-t1", op: { kind: "unhide", id: coreId } });
    expect(hasAsset(getAuthoringLibraryContent({ scope: "tenant", tenantId: "lib4-t1" }), coreId)).toBe(true);
    expect(getHiddenLibraryAssets({ scope: "tenant", tenantId: "lib4-t1" }).assets.some((a) => a.id === coreId)).toBe(false);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  putCoreContent,
  putTenantContent,
  hydrateContentStore,
  __setContentOverrideRepository,
  __resetContentStore,
  __snapshotContentStore,
} from "./demoPlatform";
import { InMemoryContentOverrideRepository, type OverrideRow } from "./contentOverrideRepository";

// PERSIST2: each op persists the right row(s); loadAll → rebuild reconstructs the
// in-memory Maps exactly. Uses the in-memory repository — no real DB.
type Item = { id: string; label?: string; note?: string };

let repo: InMemoryContentOverrideRepository;
beforeEach(() => {
  repo = new InMemoryContentOverrideRepository();
  __setContentOverrideRepository(repo);
  __resetContentStore();
});

describe("ContentStore persistence (PERSIST2)", () => {
  it("patch persists a single merged patch row", async () => {
    putCoreContent<Item>("quizQuestions", "k1", { kind: "patch", id: "a", patch: { label: "one" } });
    putCoreContent<Item>("quizQuestions", "k1", { kind: "patch", id: "a", patch: { note: "n" } });
    const rows = await repo.loadAll();
    const patchRows = rows.filter((r) => r.op === "patch" && r.itemId === "a");
    expect(patchRows).toHaveLength(1);
    expect(JSON.parse(patchRows[0]!.payload!)).toEqual({ label: "one", note: "n" });
    expect(patchRows[0]).toMatchObject({ scope: "core", tenantId: "", contentType: "quizQuestions", collectionKey: "k1" });
  });

  it("hide persists a null-payload row; unhide deletes it", async () => {
    putTenantContent<Item>("t1", "libraryAsset", "library", { kind: "hide", id: "x" });
    let rows = await repo.loadAll();
    const hideRow = rows.find((r) => r.op === "hide" && r.itemId === "x");
    expect(hideRow).toBeDefined();
    expect(hideRow!.payload).toBeNull();
    expect(hideRow).toMatchObject({ scope: "tenant", tenantId: "t1" });

    putTenantContent<Item>("t1", "libraryAsset", "library", { kind: "unhide", id: "x" });
    rows = await repo.loadAll();
    expect(rows.some((r) => r.op === "hide" && r.itemId === "x")).toBe(false);
  });

  it("add persists the item + position; remove deletes all rows for that item", async () => {
    putTenantContent<Item>("t1", "moduleLesson", "m::brief", { kind: "add", item: { id: "s1", label: "first" } });
    putTenantContent<Item>("t1", "moduleLesson", "m::brief", { kind: "add", item: { id: "s2", label: "second" } });
    putTenantContent<Item>("t1", "moduleLesson", "m::brief", { kind: "patch", id: "s1", patch: { note: "edited" } });
    let rows = await repo.loadAll();
    expect(rows.find((r) => r.op === "add" && r.itemId === "s1")!.position).toBe(0);
    expect(rows.find((r) => r.op === "add" && r.itemId === "s2")!.position).toBe(1);
    expect(JSON.parse(rows.find((r) => r.op === "add" && r.itemId === "s2")!.payload!)).toEqual({ id: "s2", label: "second" });
    expect(rows.some((r) => r.op === "patch" && r.itemId === "s1")).toBe(true);

    putTenantContent<Item>("t1", "moduleLesson", "m::brief", { kind: "remove", id: "s1" });
    rows = await repo.loadAll();
    expect(rows.some((r) => r.itemId === "s1")).toBe(false);
    expect(rows.some((r) => r.itemId === "s2")).toBe(true);
  });

  it("meta persists a single set-level (item_id='') row with the merged meta", async () => {
    putCoreContent<Item>("quizQuestions", "m1", { kind: "meta", meta: { passingScore: 2 } });
    putCoreContent<Item>("quizQuestions", "m1", { kind: "meta", meta: { passingPercent: 80 } });
    const rows = await repo.loadAll();
    const metaRows = rows.filter((r: OverrideRow) => r.op === "meta");
    expect(metaRows).toHaveLength(1);
    expect(metaRows[0]!.itemId).toBe("");
    expect(JSON.parse(metaRows[0]!.payload!)).toEqual({ passingScore: 2, passingPercent: 80 });
  });

  it("loadAll → rebuild reconstructs the Maps exactly (incl. patched-added items + null hide payloads)", async () => {
    putCoreContent<Item>("quizQuestions", "k1", { kind: "patch", id: "a", patch: { label: "A" } });
    putCoreContent<Item>("quizQuestions", "k1", { kind: "meta", meta: { passingScore: 3 } });
    putCoreContent<Item>("deckVisual", "mod-x", { kind: "hide", id: "5" });
    putTenantContent<Item>("t1", "libraryAsset", "library", { kind: "add", item: { id: "lib-1", label: "L1" } });
    putTenantContent<Item>("t1", "libraryAsset", "library", { kind: "add", item: { id: "lib-2", label: "L2" } });
    putTenantContent<Item>("t1", "libraryAsset", "library", { kind: "patch", id: "lib-1", patch: { note: "n" } });
    putTenantContent<Item>("t1", "moduleLesson", "m::brief", { kind: "hide", id: "core-slide" });
    putTenantContent<Item>("t2", "quizQuestions", "k1", { kind: "patch", id: "b", patch: { label: "B" } });

    const before = __snapshotContentStore();
    __resetContentStore();
    await hydrateContentStore();
    const after = __snapshotContentStore();

    expect(after).toEqual(before);
    // Sanity: the patched-added item carried its patch through the rebuild.
    expect((after.tenant.t1 as Record<string, { added: Item[] }>)["libraryAsset::library"].added.find((i) => i.id === "lib-1")).toEqual({ id: "lib-1", label: "L1", note: "n" });
  });
});

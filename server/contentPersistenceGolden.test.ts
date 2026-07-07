import { describe, it, expect, beforeAll } from "vitest";
import {
  authorQuizContent,
  authorLibraryContent,
  authorLessonSlide,
  authorModuleBrief,
  authorDeckVisual,
  getResolvedPresentation,
  getAuthoringLibraryContent,
  getAuthoringLesson,
  getAuthoringDeck,
  resolveForTenant,
  putCoreContent,
  putTenantContent,
  hydrateContentStore,
  __setContentOverrideRepository,
  __resetContentStore,
} from "./demoPlatform";
import { InMemoryContentOverrideRepository, DrizzleContentOverrideRepository } from "./contentOverrideRepository";

// PERSIST3: author an edit of EVERY authoring type across BOTH core and a tenant
// scope, snapshot the resolved output, simulate a restart (fresh store + hydrate
// from the same rows), and assert byte-identical resolution.
const M = "mod-sf-1"; // softskills deck + lessons/brief/quiz
const TEN = "persist-golden-t1";
const CORE_KEY = "deck-visual-images/core/golden-core.png";
const TENANT_KEY = `deck-visual-images/tenant/${TEN}/golden-tenant.png`;

const libraryAsset = (id: string, title: string) => ({
  id, title, summary: "golden summary", category: "Operations", format: "Playbook" as const,
  linkedRoles: ["all" as const], tags: ["golden"], sourceLabel: "Golden test",
  tenantId: "all", sourceKind: "chcg" as const, linkedJourneyIds: [], linkedInterventionRuleIds: [], createdAt: "",
});

describe("PERSIST3 — byte-identical boot-cycle across all authoring types (in-memory repo)", () => {
  let repo: InMemoryContentOverrideRepository;
  let ids: { coreAssetA: string; coreAssetB: string; briefSlides: string[]; briefQ1: string; practiceQ1: string };

  const snapshot = () => structuredClone({
    coreView: getResolvedPresentation(M, null),
    tenantView: getResolvedPresentation(M, TEN),
    coreLibrary: getAuthoringLibraryContent({ scope: "core" }),
    tenantLibrary: getAuthoringLibraryContent({ scope: "tenant", tenantId: TEN }),
  });

  beforeAll(() => {
    repo = new InMemoryContentOverrideRepository();
    __setContentOverrideRepository(repo);
    __resetContentStore();

    // Capture ids from the un-edited base.
    const coreAssets = getAuthoringLibraryContent({ scope: "core" }).assets;
    const brief = getAuthoringLesson({ scope: "core", moduleId: M })!.stages.brief;
    const basePres = getResolvedPresentation(M, null)!;
    ids = {
      coreAssetA: coreAssets[0]!.id,
      coreAssetB: coreAssets[1]!.id,
      briefSlides: brief.map((s) => s.id),
      briefQ1: basePres.briefCheckpoint.questions[0]!.id,
      practiceQ1: basePres.practiceCheckpoint.questions[0]!.id,
    };
    expect(ids.briefSlides.length).toBeGreaterThanOrEqual(3);

    // ── CORE edits — one per type ──
    authorQuizContent({ scope: "core", moduleId: M, checkpoint: "brief", op: { kind: "patch", id: ids.briefQ1, patch: { prompt: "Core brief prompt" } } });
    authorQuizContent({ scope: "core", moduleId: M, checkpoint: "final", op: { kind: "meta", meta: { passingScore: 5, passingPercent: 90 } } });
    authorLibraryContent({ scope: "core", op: { kind: "add", item: libraryAsset("golden-core-lib", "Golden Core Asset") } });
    authorLibraryContent({ scope: "core", op: { kind: "hide", id: ids.coreAssetA } });
    authorLessonSlide({ scope: "core", moduleId: M, stage: "brief", op: { kind: "patch", id: ids.briefSlides[0]!, patch: { narrative: "Core edited narrative" } } });
    authorLessonSlide({ scope: "core", moduleId: M, stage: "brief", op: { kind: "hide", id: ids.briefSlides[1]! } });
    authorModuleBrief({ scope: "core", moduleId: M, op: { kind: "patch", id: M, patch: { heroTitle: "Core Hero", heroSummary: "Core hero summary" } } });
    authorDeckVisual({ scope: "core", moduleId: M, op: { kind: "patch", id: "2", patch: { title: "Core deck title", caption: "Core deck caption" } } });
    authorDeckVisual({ scope: "core", moduleId: M, op: { kind: "patch", id: "3", patch: { imageKey: CORE_KEY } } });   // replace
    authorDeckVisual({ scope: "core", moduleId: M, op: { kind: "patch", id: "3", patch: { imageKey: null } } });       // revert (null must survive)
    authorDeckVisual({ scope: "core", moduleId: M, op: { kind: "hide", id: "4" } });

    // ── TENANT edits — one per type ──
    authorQuizContent({ scope: "tenant", tenantId: TEN, moduleId: M, checkpoint: "practice", op: { kind: "patch", id: ids.practiceQ1, patch: { prompt: "Tenant practice prompt" } } });
    authorQuizContent({ scope: "tenant", tenantId: TEN, moduleId: M, checkpoint: "final", op: { kind: "meta", meta: { passingScore: 3 } } });
    authorLibraryContent({ scope: "tenant", tenantId: TEN, op: { kind: "add", item: { ...libraryAsset("golden-tenant-lib", "Golden Tenant Asset"), tenantId: TEN, sourceKind: "client_upload" } } });
    authorLibraryContent({ scope: "tenant", tenantId: TEN, op: { kind: "hide", id: ids.coreAssetB } });
    authorLessonSlide({ scope: "tenant", tenantId: TEN, moduleId: M, stage: "brief", op: { kind: "add", item: { id: "golden-tenant-slide", eyebrow: "T", title: "Tenant slide", narrative: "Tenant narrative", bullets: ["a", "b"], visualTone: "Tone" } } });
    authorLessonSlide({ scope: "tenant", tenantId: TEN, moduleId: M, stage: "brief", op: { kind: "patch", id: ids.briefSlides[2]!, patch: { bullets: ["Tenant bullet 1", "Tenant bullet 2"] } } });
    authorModuleBrief({ scope: "tenant", tenantId: TEN, moduleId: M, op: { kind: "patch", id: M, patch: { heroSummary: "Tenant hero summary" } } });
    authorDeckVisual({ scope: "tenant", tenantId: TEN, moduleId: M, op: { kind: "patch", id: "5", patch: { title: "Tenant deck title", caption: "Tenant deck caption", imageKey: TENANT_KEY } } });
    authorDeckVisual({ scope: "tenant", tenantId: TEN, moduleId: M, op: { kind: "hide", id: "6" } });
  });

  it("resolved output survives a restart byte-identically (all types, both scopes)", async () => {
    const before = snapshot();

    // Simulate a restart: fresh store, hydrate from the same persisted rows.
    __resetContentStore();
    await hydrateContentStore();
    const after = snapshot();

    expect(after).toEqual(before);
  });

  it("the imageKey:null revert survived (manifest image, not the replaced key)", async () => {
    __resetContentStore();
    await hydrateContentStore();
    const deck = getAuthoringDeck({ scope: "core", moduleId: M })!;
    const slide3 = deck.slides.find((s) => s.index === 3)!;
    expect(slide3.imageReplaced).toBe(false);
    expect(slide3.imageUrl).toContain("/slides/");
    expect(getResolvedPresentation(M, null)!.deckVisuals[3]!.imageUrl).toContain("/slides/");
  });

  it("quiz meta (passing score/percent) and tenant image replace + core/tenant separation survived", async () => {
    __resetContentStore();
    await hydrateContentStore();
    const core = getResolvedPresentation(M, null)!;
    const tenant = getResolvedPresentation(M, TEN)!;

    // Meta channel.
    expect(core.finalQuiz.passingScore).toBe(5);
    expect(core.finalQuiz.passingPercent).toBe(90);
    expect(tenant.finalQuiz.passingScore).toBe(3); // tenant meta wins for the tenant view

    // Core/tenant separation: core edit visible in both; tenant edit only in tenant.
    expect(core.briefCheckpoint.questions[0]!.prompt).toBe("Core brief prompt");
    expect(tenant.briefCheckpoint.questions[0]!.prompt).toBe("Core brief prompt");
    const corePracticePrompt = core.practiceCheckpoint.questions[0]!.prompt;
    expect(tenant.practiceCheckpoint.questions[0]!.prompt).toBe("Tenant practice prompt");
    expect(corePracticePrompt).not.toBe("Tenant practice prompt");

    // Tenant deck image replace persisted; core view unaffected. (Find by title —
    // hides re-index the array, so a fixed position isn't the original slide.)
    const tenantDeckSlide = tenant.deckVisuals.find((v) => v.title === "Tenant deck title");
    expect(tenantDeckSlide?.imageUrl).toBe(`/manus-storage/${TENANT_KEY}`);
    expect(core.deckVisuals.some((v) => v.title === "Tenant deck title")).toBe(false);
    expect(core.deckVisuals.some((v) => v.imageUrl === `/manus-storage/${TENANT_KEY}`)).toBe(false);
    expect(core.deckVisuals.find((v) => v.title === "Core deck title")?.imageUrl).toContain("/slides/");
  });
});

// Real-DB integration round-trip — skipped unless DATABASE_URL is set.
const dbIt = process.env.DATABASE_URL ? it : it.skip;
describe("PERSIST3 — Drizzle DB-backed round-trip", () => {
  dbIt("put ops → flush → reload → resolveForTenant is identical", async () => {
    const repo = new DrizzleContentOverrideRepository();
    __setContentOverrideRepository(repo);
    __resetContentStore();
    const KEY = "persist3-db-golden";
    const base = [{ id: "a", label: "base-a" }, { id: "b", label: "base-b" }];

    putCoreContent<{ id: string; label?: string }>("libraryAsset", KEY, { kind: "patch", id: "a", patch: { label: "core-A" } });
    putCoreContent<{ id: string; label?: string }>("libraryAsset", KEY, { kind: "meta", meta: { passingScore: 7 } });
    putTenantContent<{ id: string; label?: string }>("db-ten", "libraryAsset", KEY, { kind: "hide", id: "b" });
    putTenantContent<{ id: string; label?: string }>("db-ten", "libraryAsset", KEY, { kind: "add", item: { id: "c", label: "added-c" } });
    putTenantContent<{ id: string; label?: string }>("db-ten", "libraryAsset", KEY, { kind: "patch", id: "c", patch: { label: "added-c-edited" } });
    await repo.flush();

    const coreBefore = resolveForTenant("libraryAsset", null, KEY, base);
    const tenantBefore = resolveForTenant("libraryAsset", "db-ten", KEY, base);

    __resetContentStore();
    await hydrateContentStore(); // loadAll from the real DB

    const coreAfter = resolveForTenant("libraryAsset", null, KEY, base);
    const tenantAfter = resolveForTenant("libraryAsset", "db-ten", KEY, base);
    expect(coreAfter).toEqual(coreBefore);
    expect(tenantAfter).toEqual(tenantBefore);
    expect(coreAfter.meta.passingScore).toBe(7);

    // Best-effort cleanup of this test's rows.
    repo.deleteItem({ scope: "core", tenantId: "", contentType: "libraryAsset", collectionKey: KEY }, "a");
    repo.deleteRow({ scope: "core", tenantId: "", contentType: "libraryAsset", collectionKey: KEY, itemId: "", op: "meta" });
    repo.deleteRow({ scope: "tenant", tenantId: "db-ten", contentType: "libraryAsset", collectionKey: KEY, itemId: "b", op: "hide" });
    repo.deleteItem({ scope: "tenant", tenantId: "db-ten", contentType: "libraryAsset", collectionKey: KEY }, "c");
    await repo.flush();
  });
});

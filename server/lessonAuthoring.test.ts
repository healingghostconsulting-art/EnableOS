import { describe, it, expect } from "vitest";
import {
  authorLessonSlide,
  authorModuleBrief,
  getAuthoringLesson,
  getResolvedPresentation,
  authorQuizContent,
} from "./demoPlatform";

// LESSON2 (Wave 3): moduleLesson + moduleBrief on the ContentStore seam. Lessons
// resolve on the PRE-expansion seed slides; assembly then re-derives companions +
// still-generated checkpoints. These tests pin the field table by scope and the
// slide↔checkpoint rule.
const M = "mod-sf-1";

describe("LESSON2 — moduleLesson authoring", () => {
  it("core edit of a slide is visible to every tenant", () => {
    const firstId = getAuthoringLesson({ scope: "core", moduleId: M })!.stages.brief[0].id;
    authorLessonSlide({ scope: "core", moduleId: M, stage: "brief", op: { kind: "patch", id: firstId, patch: { narrative: "Core-edited narrative" } } });

    expect(getAuthoringLesson({ scope: "core", moduleId: M })!.stages.brief.find((s) => s.id === firstId)?.narrative).toBe("Core-edited narrative");
    expect(getAuthoringLesson({ scope: "tenant", tenantId: "lesson-t1", moduleId: M })!.stages.brief.find((s) => s.id === firstId)?.narrative).toBe("Core-edited narrative");
    expect(getAuthoringLesson({ scope: "tenant", tenantId: "lesson-t9", moduleId: M })!.stages.brief.find((s) => s.id === firstId)?.narrative).toBe("Core-edited narrative");
  });

  it("tenant light-patch of bullets[] on a core slide is scoped to that tenant", () => {
    const firstId = getAuthoringLesson({ scope: "core", moduleId: M })!.stages.brief[0].id;
    authorLessonSlide({ scope: "tenant", tenantId: "lesson-t1", moduleId: M, stage: "brief", op: { kind: "patch", id: firstId, patch: { bullets: ["Tenant bullet A", "Tenant bullet B"] } } });

    expect(getAuthoringLesson({ scope: "tenant", tenantId: "lesson-t1", moduleId: M })!.stages.brief.find((s) => s.id === firstId)?.bullets).toEqual(["Tenant bullet A", "Tenant bullet B"]);
    // A different tenant keeps the core bullets.
    expect(getAuthoringLesson({ scope: "tenant", tenantId: "lesson-t9", moduleId: M })!.stages.brief.find((s) => s.id === firstId)?.bullets).not.toEqual(["Tenant bullet A", "Tenant bullet B"]);
  });

  it("tenant edit of a LOCKED field (title / narrative / eyebrow / visualTone) on a core slide is rejected", () => {
    const firstId = getAuthoringLesson({ scope: "core", moduleId: M })!.stages.brief[0].id;
    for (const patch of [{ title: "x" }, { narrative: "x" }, { eyebrow: "x" }, { visualTone: "x" }]) {
      expect(() => authorLessonSlide({ scope: "tenant", tenantId: "lesson-t1", moduleId: M, stage: "brief", op: { kind: "patch", id: firstId, patch } })).toThrow(/locked/i);
    }
  });

  it("a tenant-added slide appears and re-derives its 3 companion slides through expansion", () => {
    const added = { id: "lesson-tenant-add-1", eyebrow: "Tenant eyebrow", title: "Tenant slide title", narrative: "Tenant authored narrative", bullets: ["b1", "b2", "b3"], visualTone: "Tenant tone" };
    authorLessonSlide({ scope: "tenant", tenantId: "lesson-t1", moduleId: M, stage: "brief", op: { kind: "add", item: added } });

    const authoring = getAuthoringLesson({ scope: "tenant", tenantId: "lesson-t1", moduleId: M })!;
    expect(authoring.stages.brief.some((s) => s.id === "lesson-tenant-add-1")).toBe(true);

    const resolved = getResolvedPresentation(M, "lesson-t1")!;
    const ids = resolved.slides.map((s) => s.id);
    // Original kept + exactly 3 companions derived from it; each seed slide expands to 4.
    expect(ids).toContain("lesson-tenant-add-1");
    expect(ids.filter((id) => id.startsWith("lesson-tenant-add-1-brief-"))).toHaveLength(3);
    expect(resolved.slides.length).toBe(authoring.stages.brief.length * 4);
    // The companions derive their content from the tenant slide's narrative.
    const companion = resolved.slides.find((s) => s.id.startsWith("lesson-tenant-add-1-brief-guided"));
    expect(companion?.narrative).toContain("Tenant authored narrative");
    // Another tenant never sees the added slide.
    expect(getResolvedPresentation(M, "lesson-t9")!.slides.map((s) => s.id)).not.toContain("lesson-tenant-add-1");
  });

  it("hide tombstones a core slide for one tenant; unhide restores it; other tenants are unaffected", () => {
    const practiceId = getAuthoringLesson({ scope: "core", moduleId: M })!.stages.practice[0].id;

    authorLessonSlide({ scope: "tenant", tenantId: "lesson-t2", moduleId: M, stage: "practice", op: { kind: "hide", id: practiceId } });
    expect(getAuthoringLesson({ scope: "tenant", tenantId: "lesson-t2", moduleId: M })!.stages.practice.some((s) => s.id === practiceId)).toBe(false);
    expect(getAuthoringLesson({ scope: "tenant", tenantId: "lesson-t9", moduleId: M })!.stages.practice.some((s) => s.id === practiceId)).toBe(true);

    authorLessonSlide({ scope: "tenant", tenantId: "lesson-t2", moduleId: M, stage: "practice", op: { kind: "unhide", id: practiceId } });
    expect(getAuthoringLesson({ scope: "tenant", tenantId: "lesson-t2", moduleId: M })!.stages.practice.some((s) => s.id === practiceId)).toBe(true);
  });

  it("a slide edit flows into a still-generated checkpoint, but never overrides an already-overridden one", () => {
    const moduleId = "mod-sf-2";
    const tenant = "lesson-t3";
    const correctLabel = (q: any) => q.options.find((o: any) => o.id === q.correctOptionId)?.label;

    const before = getResolvedPresentation(moduleId, tenant)!;
    const labelBefore = correctLabel(before.briefCheckpoint.questions[0]);

    // The brief-q1 correct answer derives from the first brief slide's bullets[0].
    const firstBriefId = getAuthoringLesson({ scope: "core", moduleId })!.stages.brief[0].id;
    authorLessonSlide({ scope: "core", moduleId, stage: "brief", op: { kind: "patch", id: firstBriefId, patch: { bullets: ["BRAND NEW BEHAVIOR CUE", "second cue", "third cue"] } } });

    const afterSlideEdit = getResolvedPresentation(moduleId, tenant)!;
    const labelAfter = correctLabel(afterSlideEdit.briefCheckpoint.questions[0]);
    // Un-overridden checkpoint: the generated question tracked the slide edit.
    expect(labelAfter).not.toBe(labelBefore);
    expect(labelAfter).toContain("BRAND NEW BEHAVIOR CUE");

    // Now override that checkpoint question's prompt for this tenant (AUTHOR3 layer).
    const briefQ1Id = afterSlideEdit.briefCheckpoint.questions[0].id;
    authorQuizContent({ scope: "tenant", tenantId: tenant, moduleId, checkpoint: "brief", op: { kind: "patch", id: briefQ1Id, patch: { prompt: "OVERRIDDEN BRIEF PROMPT" } } });

    // A further slide edit must NOT change the overridden field — the override wins.
    authorLessonSlide({ scope: "core", moduleId, stage: "brief", op: { kind: "patch", id: firstBriefId, patch: { bullets: ["ANOTHER CUE ENTIRELY", "x", "y"] } } });
    const afterOverride = getResolvedPresentation(moduleId, tenant)!;
    expect(afterOverride.briefCheckpoint.questions[0].prompt).toBe("OVERRIDDEN BRIEF PROMPT");
    // A tenant without the override still sees the slide-derived prompt change.
    expect(getResolvedPresentation(moduleId, "lesson-t9")!.briefCheckpoint.questions[0].prompt).not.toBe("OVERRIDDEN BRIEF PROMPT");
  });
});

describe("LESSON2 — moduleBrief authoring", () => {
  const moduleId = "mod-sf-3";
  it("core edits hero + scenario fields for all tenants; tenant may light-patch heroSummary; locked brief fields are rejected", () => {
    authorModuleBrief({ scope: "core", moduleId, op: { kind: "patch", id: moduleId, patch: { heroTitle: "Core hero title", heroSummary: "Core hero summary" } } });
    expect(getResolvedPresentation(moduleId, null)!.heroTitle).toBe("Core hero title");
    expect(getResolvedPresentation(moduleId, "lesson-t4")!.heroTitle).toBe("Core hero title");

    // Tenant light-patch of heroSummary is scoped and allowed.
    authorModuleBrief({ scope: "tenant", tenantId: "lesson-t4", moduleId, op: { kind: "patch", id: moduleId, patch: { heroSummary: "Tenant hero summary" } } });
    expect(getResolvedPresentation(moduleId, "lesson-t4")!.heroSummary).toBe("Tenant hero summary");
    expect(getResolvedPresentation(moduleId, "lesson-t9")!.heroSummary).toBe("Core hero summary");

    // Locked tenant fields are rejected.
    expect(() => authorModuleBrief({ scope: "tenant", tenantId: "lesson-t4", moduleId, op: { kind: "patch", id: moduleId, patch: { heroTitle: "x" } } })).toThrow(/locked/i);
    expect(() => authorModuleBrief({ scope: "tenant", tenantId: "lesson-t4", moduleId, op: { kind: "patch", id: moduleId, patch: { evidenceLabel: "x" } } })).toThrow(/locked/i);
    expect(() => authorModuleBrief({ scope: "tenant", tenantId: "lesson-t4", moduleId, op: { kind: "patch", id: moduleId, patch: { scenarioTitle: "x" } } })).toThrow(/locked/i);
  });
});

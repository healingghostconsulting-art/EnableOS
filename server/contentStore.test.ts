import { describe, it, expect } from "vitest";
import {
  resolveForTenant,
  putCoreContent,
  putTenantContent,
  getAuthoringQuizContent,
  authorQuizContent,
} from "./demoPlatform";

type Item = { id: string; label: string };

// The ContentStore seam (AUTHOR2 / Wave 1). These exercise the two-tier
// resolution directly so the durable-backend swap can be validated against the
// same contract later.
describe("ContentStore seam", () => {
  it("core layer applies to every tenant; tenant layer is scoped and wins", () => {
    const base: Item[] = [{ id: "a", label: "core-a" }, { id: "b", label: "core-b" }];

    putCoreContent<Item>("quizQuestions", "k1", { kind: "patch", id: "a", patch: { label: "CORE-A" } });
    expect(resolveForTenant<Item>("quizQuestions", null, "k1", base).items.find((i) => i.id === "a")?.label).toBe("CORE-A");
    expect(resolveForTenant<Item>("quizQuestions", "t1", "k1", base).items.find((i) => i.id === "a")?.label).toBe("CORE-A");

    putTenantContent<Item>("t1", "quizQuestions", "k1", { kind: "patch", id: "a", patch: { label: "T1-A" } });
    expect(resolveForTenant<Item>("quizQuestions", "t1", "k1", base).items.find((i) => i.id === "a")?.label).toBe("T1-A");
    // A different tenant still sees the core value — tenant edits never leak across tenants.
    expect(resolveForTenant<Item>("quizQuestions", "t2", "k1", base).items.find((i) => i.id === "a")?.label).toBe("CORE-A");
  });

  it("hide tombstones a base item and add appends within the layer", () => {
    const base: Item[] = [{ id: "x", label: "x" }];

    putTenantContent<Item>("ten", "quizQuestions", "k2", { kind: "hide", id: "x" });
    expect(resolveForTenant<Item>("quizQuestions", "ten", "k2", base).items).toHaveLength(0);
    // Untouched for everyone else.
    expect(resolveForTenant<Item>("quizQuestions", "other", "k2", base).items).toHaveLength(1);

    putTenantContent<Item>("ten", "quizQuestions", "k2", { kind: "add", item: { id: "y", label: "added" } });
    expect(resolveForTenant<Item>("quizQuestions", "ten", "k2", base).items.map((i) => i.id)).toEqual(["y"]);
  });

  it("collection-level meta resolves core then tenant (tenant wins)", () => {
    putCoreContent("quizQuestions", "k3", { kind: "meta", meta: { passingScore: 2 } });
    expect(resolveForTenant("quizQuestions", null, "k3", []).meta.passingScore).toBe(2);

    putTenantContent("tm", "quizQuestions", "k3", { kind: "meta", meta: { passingScore: 5 } });
    expect(resolveForTenant("quizQuestions", "tm", "k3", []).meta.passingScore).toBe(5);
    expect(resolveForTenant("quizQuestions", "other", "k3", []).meta.passingScore).toBe(2);
  });

  const checkpointQuestions = (res: { modules: Array<{ checkpoints: Array<{ checkpoint: string; questions: Array<{ id: string; prompt: string }> }> }> }, key: string) =>
    res.modules[0]?.checkpoints.find((entry) => entry.checkpoint === key)?.questions;

  it("authorQuizContent edits a real module's apply checkpoint and stays tenant-scoped", () => {
    const moduleId = "mod-sf-1";
    const before = getAuthoringQuizContent({ scope: "tenant", tenantId: "tenant-z", moduleId });
    const firstId = checkpointQuestions(before, "application")?.[0]?.id;
    expect(firstId).toBeTruthy();

    authorQuizContent({
      scope: "tenant",
      tenantId: "tenant-z",
      moduleId,
      checkpoint: "application",
      op: { kind: "patch", id: firstId as string, patch: { prompt: "Edited prompt for tenant-z" } },
    });

    const after = getAuthoringQuizContent({ scope: "tenant", tenantId: "tenant-z", moduleId });
    expect(checkpointQuestions(after, "application")?.find((q) => q.id === firstId)?.prompt).toBe("Edited prompt for tenant-z");
    // Another tenant resolving the same module is unaffected.
    const other = getAuthoringQuizContent({ scope: "tenant", tenantId: "tenant-q", moduleId });
    expect(checkpointQuestions(other, "application")?.find((q) => q.id === firstId)?.prompt).not.toBe("Edited prompt for tenant-z");
  });

  // AUTHOR3 (Wave 1.5): the three generated checkpoints are authorable through the
  // same seam, with the same core-vs-tenant routing and tenant-wins rule.
  it("authors the generated brief/practice/final checkpoints, scoped and isolated per checkpoint", () => {
    const moduleId = "mod-sf-2";

    // All four checkpoints are exposed for authoring, in order.
    const initial = getAuthoringQuizContent({ scope: "core", moduleId });
    expect(initial.modules[0]?.checkpoints.map((entry) => entry.checkpoint)).toEqual(["application", "brief", "practice", "final"]);

    const briefId = checkpointQuestions(initial, "brief")?.[0]?.id as string;
    const practiceFirstBefore = checkpointQuestions(initial, "practice")?.[0]?.prompt;
    expect(briefId).toContain("-brief-");

    // A core edit to the brief checkpoint reaches every tenant.
    authorQuizContent({ scope: "core", moduleId, checkpoint: "brief", op: { kind: "patch", id: briefId, patch: { prompt: "Core-edited brief prompt" } } });
    const tenantView = getAuthoringQuizContent({ scope: "tenant", tenantId: "tenant-a", moduleId });
    expect(checkpointQuestions(tenantView, "brief")?.find((q) => q.id === briefId)?.prompt).toBe("Core-edited brief prompt");

    // A tenant edit to the final checkpoint stays scoped and wins over core.
    const finalId = checkpointQuestions(initial, "final")?.[0]?.id as string;
    authorQuizContent({ scope: "tenant", tenantId: "tenant-a", moduleId, checkpoint: "final", op: { kind: "patch", id: finalId, patch: { prompt: "Tenant-a final prompt" } } });
    expect(checkpointQuestions(getAuthoringQuizContent({ scope: "tenant", tenantId: "tenant-a", moduleId }), "final")?.find((q) => q.id === finalId)?.prompt).toBe("Tenant-a final prompt");
    expect(checkpointQuestions(getAuthoringQuizContent({ scope: "tenant", tenantId: "tenant-b", moduleId }), "final")?.find((q) => q.id === finalId)?.prompt).not.toBe("Tenant-a final prompt");

    // Editing one checkpoint leaves the others (still generated) untouched.
    expect(checkpointQuestions(getAuthoringQuizContent({ scope: "core", moduleId }), "practice")?.[0]?.prompt).toBe(practiceFirstBefore);
  });
});

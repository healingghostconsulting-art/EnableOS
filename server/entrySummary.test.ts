import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getEntrySummary } from "./demoPlatform";

// Pilot 1 (v3 Workspace Entry) — the real-count backing + the route swap + brand rules.

describe("entry summary (real counts)", () => {
  it("computes tenant-scoped counts in valid ranges", () => {
    const summary = getEntrySummary("atlas-operations");
    expect(summary.teamMembers).toBeGreaterThan(0);
    expect(summary.coachingDue).toBeGreaterThanOrEqual(0);
    expect(summary.trainingCompletion).toBeGreaterThanOrEqual(0);
    expect(summary.trainingCompletion).toBeLessThanOrEqual(100);
  });

  it("defaults to the primary tenant when no id is given (pre-auth entry)", () => {
    expect(getEntrySummary()).toEqual(getEntrySummary("atlas-operations"));
  });

  it("isolates counts per tenant", () => {
    const atlas = getEntrySummary("atlas-operations");
    const lighthouse = getEntrySummary("lighthouse-finance");
    // Different tenants have their own rosters — counts should not be forced equal.
    expect(atlas).not.toEqual(lighthouse);
  });
});

describe("v3 front-door route swap + brand rules (source)", () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
  const app = read("client/src/App.tsx");
  const view = read("client/src/pages/WorkspaceEntryView.tsx");

  it('routes "/" to the v3 WorkspaceEntryView, keeping v2 LandingView for a one-line revert', () => {
    expect(app).toContain('<Route path="/" component={WorkspaceEntryView} />');
    expect(app).toContain("import { WorkspaceEntryView }");
    expect(app).toContain("LandingView"); // v2 kept in the repo/import for revert
    expect(app).not.toContain('<Route path="/" component={LandingView} />');
  });

  it("wires the four role routes + real counts and matches the template copy", () => {
    expect(view).toContain("trpc.demo.entrySummary.useQuery");
    for (const route of ["/manager", "/coach", "/learner", "/admin"]) expect(view).toContain(`route: "${route}"`);
    expect(view).toContain("Choose your workspace.");
    expect(view).toContain("Team Members");
    expect(view).toContain("Coaching Due");
    expect(view).toContain("Training Completion");
    // Reuses the v2 login flow (getLoginUrl) so sign-in returns to the chosen workspace.
    expect(view).toContain("getLoginUrl(route)");
  });

  it("obeys the dual-surface gold rule: gold TEXT uses #7A5200, never #FCBC34, on the light screen", () => {
    for (const rel of [
      "client/src/pages/WorkspaceEntryView.tsx",
      "client/src/components/v3/InfoTile.tsx",
      "client/src/components/v3/InfoPanel.tsx",
      "client/src/components/v3/RoleCard.tsx",
    ]) {
      expect(read(rel)).not.toContain("text-[#FCBC34]");
    }
    expect(view).toContain("text-[#7A5200]");
  });
});

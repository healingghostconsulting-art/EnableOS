import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canGrantAccessWorkspace, WORKSPACE_SUBROUTE_PARENT, WORKSPACE_ACCESS } from "../shared/workspaceAccess";

// Learner Goals (/goals) — a v3 sub-surface of the learner workspace. Source-level
// assertions (the repo has no DOM runner); data-sourcing correctness rides on the
// existing secureLearner suite that AgentWorkspaceView shares.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("Learner Goals — route + access", () => {
  const app = read("client/src/App.tsx");

  it("routes /goals to LearnerGoalsView behind the chrome-less v3 guard", () => {
    expect(app).toContain("import { LearnerGoalsView }");
    expect(app).toContain('<GuardedV3Route path="/goals">');
    expect(app).toContain("<LearnerGoalsView />");
  });

  it("gates /goals exactly like /learner via the sub-route→parent map, without joining the nav matrix", () => {
    expect(WORKSPACE_SUBROUTE_PARENT["/goals"]).toBe("/learner");
    // Same reachability as /learner: learner/coach/manager/admin roles yes, executive no.
    for (const role of ["learner", "coach", "manager", "client_admin", "platform_admin"] as const) {
      expect(canGrantAccessWorkspace(role, "/goals")).toBe(canGrantAccessWorkspace(role, "/learner"));
    }
    expect(canGrantAccessWorkspace("executive", "/goals")).toBe(false);
    // Not added to the matrix-built sidebars (would pollute other rails / snapshot tests).
    for (const role of Object.keys(WORKSPACE_ACCESS) as Array<keyof typeof WORKSPACE_ACCESS>) {
      expect((WORKSPACE_ACCESS[role] as readonly string[]).includes("/goals")).toBe(false);
    }
  });
});

describe("Learner Goals — view", () => {
  const view = read("client/src/pages/LearnerGoalsView.tsx");

  it("renders on the v3 AppShell with the goals content per spec", () => {
    expect(view).toContain("import { AppShell }");
    for (const bit of ["Summary strip", "Filter switch", "Goal cards", "Add goal", "Update goal", "progressbar"]) {
      expect(view).toContain(bit);
    }
    // Deep-link receiver + a stable id so inbound #anchors land.
    expect(view).toContain("useDeepLinkTarget()");
    expect(view).toContain('id="learner-goals"');
  });

  it("sources learner-scoped data with the demo fallback and no team KPIs", () => {
    expect(view).toContain("trpc.demo.secureLearner.useQuery");
    expect(view).toContain("secureLearner.data ?? (demoMode ? publicLearner.data : undefined)");
    expect(view).not.toContain("teamLearners");
    // Seeded from real values (the all-zeros fix), not a blank empty state.
    expect(view).toContain("seedGoalsFromLearner");
  });

  it("follows the dual-surface gold rule (gold-ink on light, never text gold)", () => {
    expect(view).not.toContain("text-[#FCBC34]");
    expect(view).toContain("text-[#7A5200]");
  });
});

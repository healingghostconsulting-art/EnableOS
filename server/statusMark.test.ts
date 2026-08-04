import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// StatusMark — status is never color-only; each maps to a distinct-silhouette icon.
// Source-level assertions (no DOM runner). The alias table is validated structurally
// against the component source so the canonical vocabulary can't silently drift.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const src = read("client/src/components/v3/StatusMark.tsx");

describe("StatusMark — canonical status → icon system", () => {
  it("maps each semantic status to a distinct-silhouette icon", () => {
    // coaching→people, positive→check-ring, alert→triangle, overdue→clock, neutral→dash.
    for (const icon of ["AlertTriangle", "CheckCircle2", "Clock", "Minus", "Users"]) {
      expect(src).toContain(icon);
    }
    expect(src).toContain("coaching: { icon: Users");
    expect(src).toContain("positive: { icon: CheckCircle2");
    expect(src).toContain("alert: { icon: AlertTriangle");
    expect(src).toContain("overdue: { icon: Clock");
    expect(src).toContain("neutral: { icon: Minus");
  });

  it("aliases the existing vocabulary onto the canonical set so call sites don't rename", () => {
    for (const alias of ["on_track", "strong", "monitor", "needs_attention", "behind", "at_risk", "warning"]) {
      expect(src).toContain(`${alias}:`);
    }
    expect(src).toContain("export function normalizeStatus");
  });

  it("ships all four presentation variants", () => {
    for (const v of ["pill", "badge", "inline", "dot"]) {
      expect(src).toContain(`"${v}"`);
    }
    // Icon-only marks still expose the label to assistive tech.
    expect(src).toContain("sr-only");
  });
});

describe("StatusMark — applied on the dashboards + My Team roster", () => {
  it("replaces the color-only readiness pills and the donut-legend dots", () => {
    const team = read("client/src/pages/CoachTeamView.tsx");
    const coach = read("client/src/pages/CoachWorkspaceView.tsx");
    expect(team).toContain("StatusMark");
    expect(team).toContain('variant="pill"');
    expect(coach).toContain("StatusMark");
    // Team Readiness breakdown (donut legend) now uses semantic dot marks.
    expect(coach).toContain('variant="dot"');
    // Readiness now resolves to a canonical status, not a bare color tint.
    expect(coach).toContain('status: "positive"');
    expect(team).toContain('status: "alert"');
  });

  it("is extended to the Learner Goals cards and the My Team summary silhouettes", () => {
    const goals = read("client/src/pages/LearnerGoalsView.tsx");
    const team = read("client/src/pages/CoachTeamView.tsx");
    // Goal status pills route through StatusMark instead of a bare color pill.
    expect(goals).toContain("StatusMark");
    expect(goals).toContain("status={goal.status}");
    expect(goals).not.toContain("STATUS_META");
    // My Team summary tiles use the canonical positive/alert silhouettes.
    expect(team).toContain("icon: CheckCircle2");
    expect(team).toContain("icon: AlertTriangle");
  });
});

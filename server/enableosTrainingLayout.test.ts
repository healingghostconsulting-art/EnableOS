import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getBriefBoxPages, getBriefCompletionStatus, getModalCheckpointResetKey, getStageNavigatorLabel } from "../client/src/pages/EnableOSViews";

describe("learner training layout helpers", () => {
  const pages = Array.from({ length: 8 }, (_, index) => ({ id: `brief-${index + 1}` }));
  const trainingViewSource = readFileSync(join(process.cwd(), "client/src/pages/EnableOSViews.tsx"), "utf8");

  it("anchors the first brief window at the start of the stage", () => {
    const result = getBriefBoxPages(pages, 0);

    expect(result.currentPage).toEqual(pages[0]);
    expect(result.previousPage).toBeNull();
    expect(result.nextPage).toEqual(pages[1]);
    expect(result.boundedIndex).toBe(0);
  });

  it("keeps the active brief centered between adjacent previews when possible", () => {
    const result = getBriefBoxPages(pages, 3);

    expect(result.currentPage).toEqual(pages[3]);
    expect(result.previousPage).toEqual(pages[2]);
    expect(result.nextPage).toEqual(pages[4]);
    expect(result.boundedIndex).toBe(3);
  });

  it("pins the final brief safely when the learner reaches the end of the sequence", () => {
    const result = getBriefBoxPages(pages, 7);

    expect(result.currentPage).toEqual(pages[7]);
    expect(result.previousPage).toEqual(pages[6]);
    expect(result.nextPage).toBeNull();
    expect(result.boundedIndex).toBe(7);
  });

  it("returns the branded stage label for each learner training phase", () => {
    expect(getStageNavigatorLabel("brief")).toBe("Focused lesson path");
    expect(getStageNavigatorLabel("practice")).toBe("Practice walkthrough");
    expect(getStageNavigatorLabel("apply")).toBe("Transfer walkthrough");
    expect(getStageNavigatorLabel("reflect")).toBe("Reflection checkpoint");
    expect(getStageNavigatorLabel()).toBe("Reflection checkpoint");
  });

  it("uses lesson-step completion wording for the streamlined opening lesson", () => {
    expect(getBriefCompletionStatus(1, 5)).toMatchObject({
      completedCount: 2,
      totalCount: 5,
      percentComplete: 40,
      statusLabel: "2 of 5 lesson steps complete",
    });
  });

  it("creates a stable modal reset key from trigger identity instead of object reference", () => {
    expect(getModalCheckpointResetKey({ id: "brief-6", assessmentKey: "briefCheckpoint" })).toBe("brief-6:briefCheckpoint");
    expect(getModalCheckpointResetKey({ id: "brief-6", assessmentKey: "briefCheckpoint" })).toBe("brief-6:briefCheckpoint");
    expect(getModalCheckpointResetKey({ id: "apply-2", assessmentKey: "applicationActivity" })).toBe("apply-2:applicationActivity");
    expect(getModalCheckpointResetKey(null)).toBe("none");
  });

  it("keeps learner-facing affordances for collapsing the path navigator and scanning quiz match banks", () => {
    expect(trainingViewSource).toContain("setNavigatorCollapsed");
    expect(trainingViewSource).toContain('navigatorCollapsed ? "Expand" : "Minimize"');
    expect(trainingViewSource).toContain("Match bank");
    expect(trainingViewSource).toContain("Passing threshold");
  });

  it("preserves the stronger learner readability treatments on the assignment and banner cards", () => {
    expect(trainingViewSource).toContain("Learner shell active");
    expect(trainingViewSource).toContain("Priority retraining notification");
    expect(trainingViewSource).toContain("text-cyan-50");
    expect(trainingViewSource).toContain("text-slate-50");
    expect(trainingViewSource).toContain("text-slate-300");
    expect(trainingViewSource).toContain("bg-slate-950/68");
  });

  it("keeps the learner training shell concise, brighter, and explicit about human-in-the-loop behavior", () => {
    expect(trainingViewSource).toContain("Human-in-the-loop cue");
    expect(trainingViewSource).toContain("Agent-assist tools can accelerate preparation, but the human still owns judgment, empathy, and the final response.");
    expect(trainingViewSource).toContain("Shorter context panels and brighter surfaces keep the next learner action easier to spot.");
    expect(trainingViewSource).toContain("bg-cyan-400/8");
    expect(trainingViewSource).toContain("bg-white/8");
  });

  it("keeps the public-facing brand hierarchy product-first with CHCG as the supporting methodology layer", () => {
    expect(trainingViewSource).toContain("EnableOS mission hub");
    expect(trainingViewSource).toContain("Powered by CHCG performance methodology");
    expect(trainingViewSource).toContain("EnableOS frames learning, coaching, and governance as one connected operating system");
    expect(trainingViewSource).toContain("CHCG powers the underlying methodology and execution discipline");
  });

  it("gives managers a focused coaching-log pop-up path without removing the inline workflow", () => {
    expect(trainingViewSource).toContain("Open the coaching log in a focused pop-up");
    expect(trainingViewSource).toContain("Launch coaching log pop-up");
    expect(trainingViewSource).toContain("Weekly coaching log pop-up");
    expect(trainingViewSource).toContain("setManagerCoachingDialogOpen(true)");
    expect(trainingViewSource).toContain("<WeeklyCoachingLogComposer");
  });

  it("keeps executive question reporting visible with peer comparison and high-alert language", () => {
    expect(trainingViewSource).toContain("Assessment question reporting");
    expect(trainingViewSource).toContain("Miss rate");
    expect(trainingViewSource).toContain("Peer baseline");
    expect(trainingViewSource).toContain("Peer percentile");
    expect(trainingViewSource).toContain("High alert");
  });

  it("keeps tenure-aware lifecycle reporting visible for staged cohort comparison", () => {
    expect(trainingViewSource).toContain("Tenure-aware lifecycle reporting");
    expect(trainingViewSource).toContain("employee lifecycle");
    expect(trainingViewSource).toContain("specialists");
    expect(trainingViewSource).toContain("Readiness");
    expect(trainingViewSource).toContain("QA score");
    expect(trainingViewSource).toContain("Intervention close rate");
    expect(trainingViewSource).toContain("Coaching focus:");
  });
});

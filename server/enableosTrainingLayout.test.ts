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
    expect(getModalCheckpointResetKey({ id: "brief-6", assessmentKey: "briefCheckpoint" })).toBe("brief-6-briefCheckpoint");
    expect(getModalCheckpointResetKey({ id: "brief-6", assessmentKey: "briefCheckpoint" })).toBe("brief-6-briefCheckpoint");
    expect(getModalCheckpointResetKey({ id: "apply-2", assessmentKey: "applicationActivity" })).toBe("apply-2-applicationActivity");
    expect(getModalCheckpointResetKey(null)).toBe("default-none");
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
    expect(trainingViewSource).toContain("Guided by CHCG performance methodology");
    expect(trainingViewSource).toContain("EnableOS frames learning, coaching, and governance as one connected operating system");
    expect(trainingViewSource).toContain("CHCG powers the underlying methodology and execution discipline");
  });

  it("keeps the landing page denser and more proof-led after the KnowBe4-inspired cleanup", () => {
    expect(trainingViewSource).toContain("One-screen proof");
    expect(trainingViewSource).toContain("Browse less. Launch faster. Prove movement.");
    expect(trainingViewSource).toContain("Smooth launch rhythm");
    expect(trainingViewSource).toContain("Keep proof, launch, and search above the fold.");
    expect(trainingViewSource).toContain("Scrolling guardrail");
    expect(trainingViewSource).toContain("Proof, launch, and search now lead the page.");
    expect(trainingViewSource).toContain("The densest evidence and the primary calls to action now sit inside the hero");
    expect(trainingViewSource).toContain("Search-first mission entry");
  });

  it("gives managers a focused coaching-log pop-up path without removing the inline workflow", () => {
    expect(trainingViewSource).toContain("Open the coaching log in a focused pop-up");
    expect(trainingViewSource).toContain("Launch coaching log pop-up");
    expect(trainingViewSource).toContain("Weekly coaching log pop-up");
    expect(trainingViewSource).toContain("function WeeklyCoachingLogPopupBox");
    expect(trainingViewSource).toContain("composerProps: WeeklyCoachingLogComposerProps");
    expect(trainingViewSource).toContain("<WeeklyCoachingLogPopupBox");
    expect(trainingViewSource).toContain("<WeeklyCoachingLogComposer");
  });

  it("keeps executive question reporting visible with peer comparison and high-alert language", () => {
    expect(trainingViewSource).toContain("Client reporting workspace");
    expect(trainingViewSource).toContain("Assessment question reporting");
    expect(trainingViewSource).toContain("Miss rate");
    expect(trainingViewSource).toContain("Peer readiness");
    expect(trainingViewSource).toContain("Peer percentile");
    expect(trainingViewSource).toContain("Recommended coaching action:");
    expect(trainingViewSource).toContain("Retry dependency");
    expect(trainingViewSource).toContain("High alert");
  });

  it("keeps tenure-aware lifecycle reporting visible for staged cohort comparison", () => {
    expect(trainingViewSource).toContain("Tenure-aware lifecycle reporting");
    expect(trainingViewSource).toContain("employee lifecycle");
    expect(trainingViewSource).toContain("specialists");
    expect(trainingViewSource).toContain("Readiness");
    expect(trainingViewSource).toContain("QA score");
    expect(trainingViewSource).toContain("Close rate");
    expect(trainingViewSource).toContain("error pressure");
    expect(trainingViewSource).toContain("peer position");
  });

  it("keeps executive proof-of-impact evidence visible without causal overclaiming", () => {
    expect(trainingViewSource).not.toContain("Peer benchmark watch");
    expect(trainingViewSource).toContain("Repeat-module escalation watch");
    expect(trainingViewSource).toContain("Coaching consistency reporting");
    expect(trainingViewSource).toContain("Behavior analysis");
    expect(trainingViewSource).toContain("Error-rate reporting");
    expect(trainingViewSource).toContain("Executive proof of impact");
    expect(trainingViewSource).toContain("Before/after movement");
    expect(trainingViewSource).toContain("Intervention correlation");
    expect(trainingViewSource).toContain("Sustained readiness evidence");
    expect(trainingViewSource).toContain("Evidence note:");
    expect(trainingViewSource).toContain("without overstating causation");
  });

  it("keeps reporting available as a dedicated workspace with interactive trend charts", () => {
    expect(trainingViewSource).toContain("Client reporting workspace");
    expect(trainingViewSource).toContain("Interactive ROI trend explorer");
    expect(trainingViewSource).toContain("Interactive error-rate trend explorer");
    expect(trainingViewSource).toContain("ROI trend over time");
    expect(trainingViewSource).toContain("Error-rate movement over time");
    expect(trainingViewSource).toContain("Interactive ROI trend");
    expect(trainingViewSource).toContain("Interactive error-rate trend");
  });

  it("keeps coach and learner workspaces in the new segmented mission-control flow", () => {
    expect(trainingViewSource).toContain("Coach studio mission");
    expect(trainingViewSource).toContain("Coach modes");
    expect(trainingViewSource).toContain("Coaching lane");
    expect(trainingViewSource).toContain("Training transfer");
    expect(trainingViewSource).toContain("Learner journey");
    expect(trainingViewSource).toContain("Learner modes");
    expect(trainingViewSource).toContain("Re-engagements");
    expect(trainingViewSource).toContain("One clear next step at a time");
  });

  it("keeps the training-zone lesson brief inside a guided flash-card deck", () => {
    expect(trainingViewSource).toContain("function BriefFlashCardDeck");
    expect(trainingViewSource).toContain("This stage now keeps progress, context, and flash-card review inside one tighter lesson surface");
    expect(trainingViewSource).toContain("Tap, click, or press Enter to flip. Keep the brief, detail, and next-step cue in one compact panel.");
    expect(trainingViewSource).toContain("Inline lesson flash cards");
    expect(trainingViewSource).toContain("Jump to card");
    expect(trainingViewSource).toContain("Use the inline index strip for faster deck navigation.");
    expect(trainingViewSource).toContain("onJumpToIndex={(index) => {");
    expect(trainingViewSource).toContain("Previous card");
    expect(trainingViewSource).toContain("Show front");
    expect(trainingViewSource).toContain("All lesson flash cards reviewed. Move into the knowledge gate when ready.");
  });

  it("keeps the content-library launch brief in the same flash-card pattern", () => {
    expect(trainingViewSource).toContain("Launch brief card");
    expect(trainingViewSource).toContain("Set the receiving role, confirm the source context, and use the flash cards as one compact launch handoff instead of separate brief tiles.");
    expect(trainingViewSource).toContain("Launch brief reviewed for the");
    expect(trainingViewSource).toContain("Source label ·");
    expect(trainingViewSource).toContain("Current launch lane");
    expect(trainingViewSource).toContain("setLaunchBriefCardIndex(index)");
  });

  it("keeps client control and content library in the mission-control pattern", () => {
    expect(trainingViewSource).toContain("Client control");
    expect(trainingViewSource).toContain("Client control modes");
    expect(trainingViewSource).toContain("Action launcher");
    expect(trainingViewSource).toContain("Content mission control");
    expect(trainingViewSource).toContain("Library modes");
    expect(trainingViewSource).toContain("Switch between launcher, explore, and ingest");
    expect(trainingViewSource).toContain("Open asset explorer");
    expect(trainingViewSource).toContain("Ingestion checklist");
  });

  it("keeps the shared mission-control shell animated and reward-aware without overwhelming the workflow", () => {
    expect(trainingViewSource).toContain("Mascot cue active");
    expect(trainingViewSource).toContain("Mascot moment");
    expect(trainingViewSource).toContain("Celebration ready");
    expect(trainingViewSource).toContain("🎈");
  });
});

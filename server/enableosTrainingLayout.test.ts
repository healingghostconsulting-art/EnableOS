import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getBriefBoxPages, getBriefCompletionStatus, getModalCheckpointResetKey, getStageNavigatorLabel } from "../client/src/pages/EnableOSViews";

describe("learner training layout helpers", () => {
  const pages = Array.from({ length: 8 }, (_, index) => ({ id: `brief-${index + 1}` }));
  const trainingViewSource = readFileSync(join(process.cwd(), "client/src/pages/EnableOSViews.tsx"), "utf8");
  const dashboardLayoutSource = readFileSync(join(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");

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

  it("keeps learner-facing affordances for focused lesson controls and quiz match-bank scanning", () => {
    expect(trainingViewSource).toContain("setTrainingWorkspacePage(\"lesson\")");
    expect(trainingViewSource).toContain("Switch modes from one compact control or open the mapped curriculum deck.");
    expect(trainingViewSource).toContain("Curriculum");
    expect(trainingViewSource).toContain("Return to lesson");
    expect(trainingViewSource).toContain("Match bank");
    expect(trainingViewSource).toContain("Passing threshold");
  });

  it("preserves the stronger learner readability treatments on the assignment and banner cards", () => {
    expect(trainingViewSource).toContain("Learner journey");
    expect(trainingViewSource).toContain("Priority retraining notification");
    expect(trainingViewSource).toContain("Recommended path");
    expect(trainingViewSource).toContain("text-cyan-50");
    expect(trainingViewSource).toContain("text-slate-50");
    expect(trainingViewSource).toContain("text-slate-300");
  });

  it("keeps the learner training shell concise and explicit about reveal-on-demand support", () => {
    expect(trainingViewSource).toContain("The player keeps the lesson frame dominant and leaves supporting material closed until the learner asks for it.");
    expect(trainingViewSource).toContain("Transcript");
    expect(trainingViewSource).toContain("Visual storyboard");
    expect(trainingViewSource).toContain("Keep the storyboard hidden until the learner wants supporting sequence detail.");
    expect(trainingViewSource).toContain("Open narration controls and the page transcript only when needed.");
  });

  it("keeps the public-facing brand hierarchy product-first with CHCG as the supporting methodology layer", () => {
    expect(trainingViewSource).toContain("EnableOS mission hub");
    expect(trainingViewSource).toContain("Search, resume, and launch from one operational console so users can move into training, coaching, and workspace tasks without crossing showcase-style hero content first.");
    expect(trainingViewSource).toContain("CHCG core");
    expect(trainingViewSource).toContain("CHCG asset");
    expect(trainingViewSource).toContain("Client upload");
  });

  it("keeps the landing page denser and more proof-led after the compact mission-hub approval", () => {
    expect(trainingViewSource).toContain("EnableOS mission hub");
    expect(trainingViewSource).toContain("Primary queue");
    expect(trainingViewSource).toContain("Workspace launch");
    expect(trainingViewSource).toContain("Operations home");
    expect(trainingViewSource).toContain("Start with the next assigned action.");
    expect(trainingViewSource).toContain("Search, resume, and launch from one operational console so users can move into training, coaching, and workspace tasks without crossing showcase-style hero content first.");
    expect(trainingViewSource).toContain("Training queue");
    expect(trainingViewSource).toContain("Workspace launchers");
  });

  it("gives coaching workspaces a visible ribbon-level pop-up logging path while preserving the shared composer", () => {
    expect(trainingViewSource).toContain("Log a coaching");
    expect(trainingViewSource).toContain("The primary coaching-log button now lives directly in the top coach ribbon");
    expect(trainingViewSource).toContain("force the structured log to open in a focused pop-up window");
    expect(trainingViewSource).toContain("Focused coaching log capture");
    expect(trainingViewSource).toContain("Use the ribbon action or this button to open the structured coaching log in a pop-up");
    expect(trainingViewSource).toContain("coachWeeklyCoachingLogProps");
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

  it("keeps the training-zone lesson brief inside a guided flash-card deck and a page-based workspace flow", () => {
    expect(trainingViewSource).toContain("function BriefFlashCardDeck");
    expect(trainingViewSource).toContain("Training pages");
    expect(trainingViewSource).toContain("Switch modes from one compact control or open the mapped curriculum deck.");
    expect(trainingViewSource).toContain("Curriculum");
    expect(trainingViewSource).toContain("Return to lesson");
    expect(trainingViewSource).toContain("Resources");
    expect(trainingViewSource).toContain("inline-flex min-w-max items-center gap-1 rounded-full border border-[#1B303C]/10 bg-white/85 p-1");
    expect(trainingViewSource).toContain("trainingWorkspacePage");
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

  it("keeps the content-library launch brief in the same flash-card pattern while shifting launch into a focused window", () => {
    expect(trainingViewSource).toContain("Launch brief card");
    expect(trainingViewSource).toContain("Launch brief reviewed for the");
    expect(trainingViewSource).toContain("Source label ·");
    expect(trainingViewSource).toContain("Receiving lane ·");
    expect(trainingViewSource).toContain("Launch focused player");
    expect(trainingViewSource).toContain("setLaunchBriefCardIndex(index)");
  });

  it("keeps client control and content library in the mission-control pattern with the denser browse-and-detail flow", () => {
    expect(trainingViewSource).toContain("Content Missions Library");
    expect(trainingViewSource).toContain("Compact rows");
    expect(trainingViewSource).toContain("Training queue");
    expect(trainingViewSource).toContain("Selected module detail");
    expect(trainingViewSource).toContain("Course detail staging");
    expect(trainingViewSource).toContain("Launch sequence");
    expect(trainingViewSource).toContain("Launch focused player");
    expect(trainingViewSource).toContain("Open compact shelves");
  });

  it("uses a compact shell when training opens from the library or a direct course launch", () => {
    expect(trainingViewSource).toContain("function SectionShell");
    expect(trainingViewSource).toContain("compact = true");
    expect(trainingViewSource).toContain("eyebrow={isDirectModuleLaunch ? \"Course Player\" : \"Interactive Training\"}");
    expect(trainingViewSource).toContain("Lesson first.");
    expect(trainingViewSource).toContain("Launch setup");
    expect(trainingViewSource).toContain("Focused player");
    expect(trainingViewSource).toContain("Lesson first, with compact progress and support controls.");
    expect(trainingViewSource).toContain("Lesson canvas ·");
    expect(trainingViewSource).toContain("Progress rail");
    expect(trainingViewSource).toContain("Select a response before submitting. Validation now stays inside the EnableOS assessment surface instead of relying on a generic browser prompt.");
    expect(trainingViewSource).toContain("Checkpoint cleared");
    expect(trainingViewSource).toContain("Retry required");
    expect(trainingViewSource).toContain("compact");
  });

  it("routes the landing mission queue into exact library detail states or focused player launches instead of generic same-screen fallbacks", () => {
    expect(trainingViewSource).toContain("/library?assetId=library-service-foundations-core");
    expect(trainingViewSource).toContain("assetTitle=Quality%20Assurance%20Essentials");
    expect(trainingViewSource).toContain("journey-coach-practice-atlas");
    expect(trainingViewSource).toContain("const [location, setLocation] = useLocation()");
    expect(trainingViewSource).toContain("const requestedAssetTitle = queryParams.get(\"assetTitle\")");
    expect(trainingViewSource).toContain("if (matchedAsset && libraryMode !== \"launcher\")");
  });

  it("applies the compact authenticated workspace header across every primary role-based surface", () => {
    expect(dashboardLayoutSource).toContain("compactWorkspaceHeaderPaths");
    expect(dashboardLayoutSource).toContain('"/executive"');
    expect(dashboardLayoutSource).toContain('"/reporting"');
    expect(dashboardLayoutSource).toContain('"/manager"');
    expect(dashboardLayoutSource).toContain('"/coach"');
    expect(dashboardLayoutSource).toContain('"/learner"');
    expect(dashboardLayoutSource).toContain('"/admin"');
    expect(dashboardLayoutSource).toContain('"/chcg-admin"');
  });

  it("keeps the shared mission-control shell animated and reward-aware without overwhelming the workflow", () => {
    expect(trainingViewSource).toContain("Mascot cue active");
    expect(trainingViewSource).toContain("Mascot moment");
    expect(trainingViewSource).toContain("Celebration ready");
    expect(trainingViewSource).toContain("🎈");
  });
});

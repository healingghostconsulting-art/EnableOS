import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildLearnerFeedbackPreferencesStorageKey,
  getBriefBoxPages,
  getBriefCompletionStatus,
  getLearnerFeedbackDescription,
  getLearnerFeedbackMotionLabel,
  getLearnerFeedbackMotionStatus,
  getLearnerFeedbackStatusLabel,
  getModalCheckpointResetKey,
  getStageNavigatorLabel,
  loadLearnerFeedbackPreferences,
  persistLearnerFeedbackPreferences,
  readMotionPreferenceFromMediaQuery,
} from "../client/src/pages/EnableOSViews";
import { afterEach, vi } from "vitest";

describe("learner training layout helpers", () => {
  const pages = Array.from({ length: 8 }, (_, index) => ({ id: `brief-${index + 1}` }));
  const trainingViewSource = readFileSync(join(process.cwd(), "client/src/pages/EnableOSViews.tsx"), "utf8");
  const dashboardLayoutSource = readFileSync(join(process.cwd(), "client/src/components/DashboardLayout.tsx"), "utf8");

  const createWindowStub = (
    initialStorage: Record<string, string> = {},
    reducedMotion = false,
  ) => {
    const storage = new Map(Object.entries(initialStorage));

    return {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
      matchMedia: vi.fn().mockImplementation(() => ({
        matches: reducedMotion,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn().mockReturnValue(false),
      })),
    } as unknown as Window & typeof globalThis;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  it("scopes learner feedback preference storage keys by tenant and role", () => {
    expect(buildLearnerFeedbackPreferencesStorageKey({ tenantId: "tenant-west", requestedRoleFilter: "learner" })).toBe(
      "chcg-enableos-learner-feedback:tenant-west:role=learner",
    );
    expect(buildLearnerFeedbackPreferencesStorageKey({ tenantId: null, requestedRoleFilter: null })).toBe(
      "chcg-enableos-learner-feedback:tenantless:role=learner",
    );
    expect(buildLearnerFeedbackPreferencesStorageKey({ tenantId: "tenant-west", requestedRoleFilter: "manager" })).toBe(
      "chcg-enableos-learner-feedback:tenant-west:role=manager",
    );
  });

  it("loads and persists learner feedback preferences with reduced-motion fallback awareness", () => {
    const storageKey = buildLearnerFeedbackPreferencesStorageKey({ tenantId: "tenant-west", requestedRoleFilter: "learner" });
    const windowStub = createWindowStub({}, true);
    vi.stubGlobal("window", windowStub);

    expect(readMotionPreferenceFromMediaQuery()).toBe(true);
    expect(loadLearnerFeedbackPreferences(storageKey, readMotionPreferenceFromMediaQuery())).toEqual({
      successSoundMuted: false,
      reducedMotion: true,
    });

    persistLearnerFeedbackPreferences(storageKey, {
      successSoundMuted: true,
      reducedMotion: false,
    });

    expect(windowStub.localStorage.getItem(storageKey)).toBe(JSON.stringify({
      successSoundMuted: true,
      reducedMotion: false,
    }));
    expect(loadLearnerFeedbackPreferences(storageKey, true)).toEqual({
      successSoundMuted: true,
      reducedMotion: false,
    });
  });

  it("drops invalid learner feedback preference payloads and reverts to the provided motion fallback", () => {
    const storageKey = buildLearnerFeedbackPreferencesStorageKey({ tenantId: "tenant-west", requestedRoleFilter: "learner" });
    const windowStub = createWindowStub({ [storageKey]: "not-json" }, false);
    vi.stubGlobal("window", windowStub);

    expect(loadLearnerFeedbackPreferences(storageKey, true)).toEqual({
      successSoundMuted: false,
      reducedMotion: true,
    });
    expect(windowStub.localStorage.getItem(storageKey)).toBeNull();
  });

  it("returns explicit learner feedback status and motion-toggle copy for active and reduced celebration states", () => {
    expect(getLearnerFeedbackStatusLabel({ soundMuted: false, reducedMotion: false })).toBe("Sound on · Motion on");
    expect(getLearnerFeedbackStatusLabel({ soundMuted: true, reducedMotion: true })).toBe("Sound muted · Reduced motion");
    expect(getLearnerFeedbackMotionLabel(false)).toBe("Celebration motion on");
    expect(getLearnerFeedbackMotionLabel(true)).toBe("Celebration motion reduced");
    expect(getLearnerFeedbackMotionStatus(false)).toBe("Motion ready");
    expect(getLearnerFeedbackMotionStatus(true)).toBe("Reduced motion");
    expect(getLearnerFeedbackDescription(true)).toContain("Reduced motion keeps the success state visible");
  });

  it("keeps learner-facing affordances for focused lesson controls and quiz match-bank scanning", () => {
    expect(trainingViewSource).toContain("setTrainingWorkspacePage(\"lesson\")");
    expect(trainingViewSource).toContain("setTrainingWorkspacePage(page.key)");
    expect(trainingViewSource).toContain("selectedModule?.title ?? requestedModuleId ?? \"Training module\"");
    expect(trainingViewSource).toContain("selectedModuleTitle} curriculum");
    expect(trainingViewSource).toContain("Curriculum");
    expect(trainingViewSource).toContain("Return to lesson");
    expect(trainingViewSource).toContain("Match bank");
    expect(trainingViewSource).toContain("Passing threshold");
  });

  it("preserves the stronger learner readability treatments on the assignment and banner cards", () => {
    expect(trainingViewSource).toContain("Learner journey");
    expect(trainingViewSource).toContain("Recommended path");
    expect(trainingViewSource).toContain("text-cyan-50");
    expect(trainingViewSource).toContain("text-slate-50");
    expect(trainingViewSource).toContain("text-slate-300");
  });

  it("collapses required retraining into a single priority next-step strip (L3)", () => {
    // One slim strip carries the assignment; the big amber notification + duplicate cards are gone.
    expect(trainingViewSource).toContain('id="learner-priority-strip"');
    expect(trainingViewSource).not.toContain("Priority retraining notification");
    expect(trainingViewSource).not.toContain('id="learner-priority-retraining"');
    expect(trainingViewSource).not.toContain("has been assigned to you");
    // The Journey-tab card references the strip instead of restating the assignment title.
    expect(trainingViewSource).toContain("pinned in the priority bar above");
  });

  it("consolidates learner stats into one compact top row (L4)", () => {
    // The learner stat row is now a WorkspaceShell stats array (one compact dark band, like Coach Studio).
    expect(trainingViewSource).toContain("const learnerStats: WorkspaceStat[]");
    expect(trainingViewSource).toContain("Modules complete");
    // The scattered learner mid-page stat clusters are gone (folded into the top row or dropped).
    expect(trainingViewSource).not.toContain("Coach milestone");
    expect(trainingViewSource).not.toContain("Achievement layer");
    expect(trainingViewSource).not.toContain("Learning signals");
  });

  it("gates the four learner modes and folds resources + history into the right modes (L5)", () => {
    // Exactly four modes, Radix-gated (only the active TabsContent renders), default Journey.
    expect(trainingViewSource).toContain('useState<"journey" | "reengagements" | "coaching" | "evidence">("journey")');
    expect(trainingViewSource).toContain('setActiveTab(value as "journey" | "reengagements" | "coaching" | "evidence")');
    // Mapped resources folded into Journey as a secondary "Resources" section (no own tab).
    expect(trainingViewSource).toContain('<WorkflowLibraryPanel title="Resources"');
    expect(trainingViewSource).not.toContain('title="Journey resource mix"');
    // Past retraining history lives in Evidence alongside completion records.
    expect(trainingViewSource).toContain('title="Past retraining history"');
  });

  it("keeps the learner training shell concise and explicit about reveal-on-demand support", () => {
    expect(trainingViewSource).toContain("Speaker and facilitator notes stay out of the learner flow until opened.");
    expect(trainingViewSource).toContain("Transcript");
    expect(trainingViewSource).toContain("Visual storyboard");
    expect(trainingViewSource).toContain("Keep the storyboard hidden until the learner wants supporting sequence detail.");
    expect(trainingViewSource).toContain("Open narration controls and the page transcript only when needed.");
  });

  it("keeps the public-facing brand hierarchy product-first while simplifying the landing choice into workspace-first entry", () => {
    expect(trainingViewSource).toContain("EnableOS entry");
    expect(trainingViewSource).toContain("Choose your workspace.");
    expect(trainingViewSource).toContain("Select the workspace that matches your day");
    expect(trainingViewSource).toContain("CHCG core");
    expect(trainingViewSource).toContain("CHCG asset");
    expect(trainingViewSource).toContain("Client upload");
  });

  it("uses a cleaner workspace-first landing flow that routes users into login after role selection", () => {
    expect(trainingViewSource).toContain("EnableOS entry");
    expect(trainingViewSource).toContain("Workspace-first login");
    expect(trainingViewSource).toContain("Choose your workspace.");
    expect(trainingViewSource).toContain("Select a workspace, then sign in");
    expect(trainingViewSource).toContain("Each workspace card below routes into login with the correct return path");
    expect(trainingViewSource).toContain("Workspace selector");
    expect(trainingViewSource).toContain("Select and sign in");
    expect(trainingViewSource).toContain("Open my assigned workspace");
  });

  it("keeps the coach workspace on compact popup action cards while preserving weekly-log, follow-up, and history workflows", () => {
    expect(trainingViewSource).toContain("Select a learner, review status, and open the next coaching task.");
    expect(trainingViewSource).toContain('id="coach-weekly-logs" className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4');
    expect(trainingViewSource).toContain('activeTab === "coaching" ? (');
    expect(trainingViewSource).toContain('activeTab === "transfer" ? (');
    expect(trainingViewSource).toContain("Review the note, confirm the next action, and open the full thread from here.");
    expect(trainingViewSource).toContain("Select a thread, review the next action, and open the full thread here when you need detail.");
    expect(trainingViewSource).toContain("function CoachLaneActionCard");
    expect(trainingViewSource).toContain("function CoachLaneDialogAction");
    expect(trainingViewSource).toContain("Open coaching thread");
    expect(trainingViewSource).not.toContain("Open the live coaching thread");
    expect(trainingViewSource).toContain("Complete the weekly one-on-one");
    expect(trainingViewSource).toContain("Open weekly one-on-one");
    expect(trainingViewSource).toContain("Open coach follow-up");
    expect(trainingViewSource).toContain("Open coaching history");
    expect(trainingViewSource).toContain("Open retraining history");
    expect(trainingViewSource).toContain("function WeeklyCoachingLogPopupBox");
    expect(trainingViewSource).toContain("<WeeklyCoachingLogComposer");
    expect(trainingViewSource).not.toContain("Coach Studio pop-up entry");
    expect(trainingViewSource).not.toContain("Coaching log captured from the Coach Studio modal dialog.");
    expect(trainingViewSource).not.toContain("initialValues");
    expect(trainingViewSource).toContain("function WeeklyCoachingLogDetailDialog");
    expect(trainingViewSource).toContain("function DocumentationEntryDetailDialog");
    expect(trainingViewSource).toContain("Open weekly one-on-one");
    expect(trainingViewSource).toContain("Open document details");
    expect(trainingViewSource).toContain("This documentation summary is linked to the exact weekly coaching log recorded for");
    expect(trainingViewSource).toContain("This document captures the exact summary, evidence points, and metadata saved in the documentation stream for this record.");
    expect(trainingViewSource).toContain("Click to review the full documentation summary, evidence points, and saved metadata.");
    expect(trainingViewSource).toContain("Complete the remaining required coaching fields before saving");
    expect(trainingViewSource).toContain("Attendance needs a short status note.");
    expect(trainingViewSource).toContain("Add supporting files");
    expect(trainingViewSource).toContain("Attach any file type to the coaching log");
    expect(trainingViewSource).toContain("Attach files to this log");
    expect(trainingViewSource).toContain("function CoachingAttachmentList");
    expect(trainingViewSource).toContain("Write a coach follow-up or observation");
    expect(trainingViewSource).toContain("Follow-up attachments");
    expect(trainingViewSource).toContain("Coaching observation resources");
    expect(trainingViewSource).toContain("Coach follow-up saved to Documentation.");
    expect(trainingViewSource).toContain("Current learner");
    expect(trainingViewSource).toContain("Select value={selectedLearnerId} onValueChange={setSelectedLearnerId}");
    expect(trainingViewSource).toContain("Select learner");
    expect(trainingViewSource).toContain("Active threads");
    expect(trainingViewSource).toContain("Open coaching work for this learner");
    expect(trainingViewSource).toContain("Learning journey complete");
    expect(trainingViewSource).toContain("Training transfer tasks");
    expect(trainingViewSource).toContain("Open transfer roster");
    expect(trainingViewSource).toContain("Open AI guidance");
    expect(trainingViewSource).toContain("Open module transfer view");
    expect(trainingViewSource).toContain("Open coach-ready assets");
    expect(trainingViewSource).not.toContain("Selected learner");
    expect(trainingViewSource).toContain("Documentation tasks");
    expect(trainingViewSource).toContain("Open documentation queue");
    expect(trainingViewSource).toContain("Open documentation feed");
    expect(trainingViewSource).toContain("Alerts");
    expect(trainingViewSource).toContain("Open alert queue");
    expect(trainingViewSource).toContain("Open alert detail");
    expect(trainingViewSource).toContain("Public / Private visibility");
    expect(trainingViewSource).toContain("Public coaching log");
    expect(trainingViewSource).toContain("Private coaching note");
    expect(trainingViewSource).toContain("Private stays on file for leadership only and does not notify the learner.");
  });

  it("keeps executive question reporting visible with peer comparison, high-alert language, and exact-target drill-down actions", () => {
    expect(trainingViewSource).toContain("Client reporting workspace");
    expect(trainingViewSource).toContain("Assessment question reporting");
    expect(trainingViewSource).toContain("Miss rate");
    expect(trainingViewSource).toContain("Peer readiness");
    expect(trainingViewSource).toContain("Peer percentile");
    expect(trainingViewSource).toContain("Recommended coaching action:");
    expect(trainingViewSource).toContain("Retry dependency");
    expect(trainingViewSource).toContain("High alert");
    expect(trainingViewSource).toContain("Review source detail");
    expect(trainingViewSource).toContain("buildExecutiveTrainingTargetPath");
    expect(trainingViewSource).toContain("buildExecutiveLibraryTargetPath");
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

  it("keeps executive proof-of-impact evidence visible without causal overclaiming and routes repeat assignments into exact targets", () => {
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
    expect(trainingViewSource).toContain("Exact-target tracking enabled");
    expect(trainingViewSource).toContain("Review exact module");
    expect(trainingViewSource).toContain("launchRole=\"manager\"");
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
    expect(trainingViewSource).toContain(">Coach Studio<");
    expect(trainingViewSource).toContain("Select a learner, review status, and open the next coaching task.");
    expect(trainingViewSource).not.toContain("Coach studio mission");
    expect(trainingViewSource).not.toContain("A calmer coach desk keeps guidance, evidence, and follow-through in one polished workspace.");
    expect(trainingViewSource).not.toContain("Coach control surface");
    expect(trainingViewSource).toContain("Training transfer tasks");
    expect(trainingViewSource).toContain("Documentation tasks");
    expect(trainingViewSource).toContain("Alerts");
    expect(trainingViewSource).toContain("Open weekly one-on-one");
    expect(trainingViewSource).toContain("Open documentation queue");
    expect(trainingViewSource).toContain("Open alert queue");
    expect(trainingViewSource).toContain("Choose a tab to coach, review transfer, document evidence, or respond to alerts.");
    expect(trainingViewSource).toContain("border-cyan-300/80 bg-[linear-gradient(180deg,rgba(236,254,255,0.98),rgba(224,242,254,0.94))]");
    expect(trainingViewSource).toContain("border-slate-200 bg-white/88 shadow-[0_10px_22px_rgba(15,23,42,0.05)] hover:border-slate-300 hover:bg-white");
    expect(trainingViewSource).not.toContain("Coach-visible signal trend");
    expect(trainingViewSource).toContain("Coach modes");
    expect(trainingViewSource).toContain("Coaching lane");
    expect(trainingViewSource).toContain("Training transfer");
    expect(trainingViewSource).toContain("Learner journey");
    expect(trainingViewSource).toContain("Learner modes");
    expect(trainingViewSource).toContain("Re-engagements");
    // Self-narrating workspace copy was stripped (L2); these must not return.
    expect(trainingViewSource).not.toContain("One clear next step at a time");
    expect(trainingViewSource).not.toContain("without making people hunt through one long page");
    expect(trainingViewSource).not.toContain("Use the guided modes below");
    expect(trainingViewSource).not.toContain("Recommendation framing");
    expect(trainingViewSource).not.toContain("one mode at a time instead of reading the whole workspace");
  });

  it("extracts the Coach Studio chrome into a reusable WorkspaceShell (W1)", () => {
    const shellSource = readFileSync(join(process.cwd(), "client/src/components/WorkspaceShell.tsx"), "utf8");
    // The shell owns the slim header, the dark high-contrast stat band, and the gated mode tabs.
    expect(shellSource).toContain("export function WorkspaceShell");
    expect(shellSource).toContain("bg-[linear-gradient(135deg,rgba(9,18,28,0.96),rgba(20,32,44,0.92))]"); // dark stat band
    expect(shellSource).toContain("command-band"); // gated mode tabs
    expect(shellSource).toContain("data-[state=active]:bg-white data-[state=active]:text-slate-950"); // tab treatment
    // /coach renders through the shell (non-visual refactor), and the shared header is suppressed
    // so it isn't drawn twice.
    expect(trainingViewSource).toContain("<WorkspaceShell");
    expect(trainingViewSource).toContain("title=\"Coach Studio\"");
    expect(trainingViewSource).toContain("modesLabel=\"Coach modes\"");
    expect(trainingViewSource).toContain("hideHeader={role ===");
  });

  it("routes the Learner Journey through WorkspaceShell with a short header (W2)", () => {
    // Short title + one-line subtitle (demoted from the old long H2); redundant eyebrow dropped.
    expect(trainingViewSource).toContain("title=\"Learner Journey\"");
    expect(trainingViewSource).toContain("subtitle=\"Complete assignments tied to skill opportunities, coaching actions, and readiness progress.\"");
    expect(trainingViewSource).not.toContain("LEARNER ENABLEMENT JOURNEY");
    // The 5 stat tiles inherit the dark high-contrast band via the shell.
    expect(trainingViewSource).toContain("const learnerStats: WorkspaceStat[]");
    expect(trainingViewSource).toContain("modesLabel=\"Learner modes\"");
    // The priority strip stays between the stat row and the tabs.
    expect(trainingViewSource).toContain("betweenStatsAndTabs={");
    expect(trainingViewSource).toContain("id=\"learner-priority-strip\"");
  });

  it("routes Manager Ops through WorkspaceShell and strips the marketing hero (MGR2)", () => {
    expect(trainingViewSource).toContain("title=\"Manager Ops\"");
    expect(trainingViewSource).toContain("modesLabel=\"Manager modes\"");
    // The four metrics become the shared dark stat row.
    expect(trainingViewSource).toContain("const managerWorkspaceStats: WorkspaceStat[]");
    expect(trainingViewSource).toContain("label: \"Active signals\"");
    expect(trainingViewSource).toContain("label: \"Direct report readiness\"");
    // The signal feed + guidance band sits between the stat row and the tabs.
    expect(trainingViewSource).toContain("id=\"manager-signal-trend\"");
    // Marketing header + self-narration removed.
    expect(trainingViewSource).not.toContain("A guided manager desk replaces the long operations page");
    expect(trainingViewSource).not.toContain("manager workspace now opens like");
    expect(trainingViewSource).not.toContain("See the risk, coach the rep, close the action");
  });

  it("aligns the manager coaching launcher to Coach Studio's gold action-card chrome (MGR3)", () => {
    // The cyan PremiumCard launcher is replaced by the shared gold CoachLaneActionCard.
    expect(trainingViewSource).not.toContain("Open the coaching log in a focused pop-up");
    expect(trainingViewSource).not.toContain("Launch a cleaner writing surface without leaving the coaching lane");
    expect(trainingViewSource).toContain("eyebrow=\"Manager coaching\"");
    expect(trainingViewSource).toContain("composerProps={managerWeeklyCoachingLogProps}");
    // Gold primary highlight matching Coach Studio's weekly one-on-one card.
    expect(trainingViewSource).toContain("bg-[#FCBC34] text-slate-950");
  });

  it("aligns Journey-mode module cards to Coach Studio's action-card chrome (W3)", () => {
    // Coach's action-card frame: rounded-[1.25rem], border, compact padding, the shared shadow.
    expect(trainingViewSource).toContain("rounded-[1.25rem] border px-3 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.12)]");
    // The recommended (first) module takes the same gold highlighted-primary gradient as Coach's main action.
    expect(trainingViewSource).toContain("const isPrimary = index === 0;");
    expect(trainingViewSource).toContain("bg-[linear-gradient(180deg,rgba(255,247,216,0.98),rgba(252,228,150,0.94))]");
    expect(trainingViewSource).toContain("border-[#F6C453]/60 bg-[#FCBC34] text-slate-950");
  });

  it("keeps the training-zone lesson brief inside a guided flash-card deck and a page-based workspace flow", () => {
    expect(trainingViewSource).toContain("function BriefFlashCardDeck");
    expect(trainingViewSource).toContain(">Pages<");
    expect(trainingViewSource).toContain("setTrainingWorkspacePage(page.key)");
    expect(trainingViewSource).toContain("selectedModule?.title ?? requestedModuleId ?? \"Training module\"");
    expect(trainingViewSource).toContain("selectedModuleTitle} curriculum");
    expect(trainingViewSource).toContain("Curriculum");
    expect(trainingViewSource).toContain("Return to lesson");
    expect(trainingViewSource).toContain("Resources");
    expect(trainingViewSource).toContain(">Stages<");
    expect(trainingViewSource).toContain("Stage overview");
    expect(trainingViewSource).toContain("setStageIndex(index)");
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
    expect(trainingViewSource).toContain("Launch training");
    expect(trainingViewSource).toContain("Launch pending alignment");
    expect(trainingViewSource).toContain("selectedAssetNextActionLabel");
    expect(trainingViewSource).toContain("setLaunchBriefCardIndex(index)");
  });

  it("keeps client control and content library in the mission-control pattern with the denser browse-and-detail flow", () => {
    // CAT2: /library routes through the shared WorkspaceShell; marketing + self-narrating copy removed.
    expect(trainingViewSource).toContain("title=\"Training Library\"");
    expect(trainingViewSource).toContain("modesLabel=\"Library modes\"");
    expect(trainingViewSource).not.toContain("Content Missions Library");
    expect(trainingViewSource).not.toContain("The library now keeps more titles");
    expect(trainingViewSource).not.toContain("intentionally denser");
    expect(trainingViewSource).not.toContain("Scan many modules, inspect one detail panel");
    // CAT3: real deck covers + the reusable course card.
    expect(trainingViewSource).toContain("course.coverImage");
    expect(trainingViewSource).toContain("function LibraryCourseCard");
    // CAT4: curated Continue learning + Recommended rows; the player resumes to ?slide=N.
    expect(trainingViewSource).toContain("Continue learning");
    expect(trainingViewSource).toContain("Recommended for you");
    // CAT8: curated rows (incl. New) on top + one All-courses grid; per-track shelves removed.
    expect(trainingViewSource).not.toContain("course.track === track.id");
    expect(trainingViewSource).toContain("? \"Results\" : \"All courses\"");
    expect(trainingViewSource).toContain("xl:grid-cols-4");
    expect(trainingViewSource).toContain(">New</h3>");
    expect(trainingViewSource).toContain("course.status === \"in_progress\"");
    expect(trainingViewSource).toContain("course.recommended");
    expect(trainingViewSource).toContain("queryParams.get(\"slide\")");
    // CAT5: one compact filter bar under the stat row (search / track / status / source).
    expect(trainingViewSource).toContain("betweenStatsAndTabs={libraryFilterBar}");
    expect(trainingViewSource).toContain("Search courses");
    expect(trainingViewSource).toContain("const filteredCatalogCourses = catalogCourses.filter");
    expect(trainingViewSource).toContain("statusFilter === \"all\" || course.status === statusFilter");
    // CAT6: clicking a cover opens a focused course-page dialog (cover, description, what's inside, tags, launch).
    expect(trainingViewSource).toContain("onOpen={() => setSelectedCourseId(course.id)}");
    expect(trainingViewSource).toContain("const selectedCourse = catalogCourses.find");
    expect(trainingViewSource).toContain("{selectedCourse.description}");
    expect(trainingViewSource).toContain("What's inside");
    expect(trainingViewSource).toContain("Resume course");
    expect(trainingViewSource).toContain("Selected course detail");
    expect(trainingViewSource).toContain("Curriculum preview");
    expect(trainingViewSource).toContain("Structured ingestion lane");
    expect(trainingViewSource).toContain("Curriculum maintenance plan");
    expect(trainingViewSource).toContain("Launch-readiness note");
    expect(trainingViewSource).toContain("Add structured asset");
    expect(trainingViewSource).toContain("Open compact shelves");
  });

  it("uses a compact shell when training opens from the library or a direct course launch", () => {
    expect(trainingViewSource).toContain("function SectionShell");
    expect(trainingViewSource).toContain("compact = true");
    expect(trainingViewSource).not.toContain("eyebrow={isDirectModuleLaunch ? \"Course Player\" : \"Interactive Training\"}");
    expect(trainingViewSource).not.toContain("Opens directly on the active lesson.");
    expect(trainingViewSource).not.toContain("Focused player");
    expect(trainingViewSource).not.toContain("Lesson first, with compact progress and support controls.");
    expect(trainingViewSource).toContain("Launch setup");
    expect(trainingViewSource).toContain("flex h-14 items-center justify-between gap-4 px-4 py-0");
    expect(trainingViewSource).toContain("Stage {stageIndex + 1} of {stages.length}");
    expect(trainingViewSource).toContain("{remainingRuntimeMinutes} min left");
    expect(trainingViewSource).toContain("Lesson canvas ·");
    expect(trainingViewSource).toContain("Progress rail");
    expect(trainingViewSource).toContain("Select a response before submitting. Validation now stays inside the EnableOS assessment surface instead of relying on a generic browser prompt.");
    expect(trainingViewSource).toContain("Checkpoint cleared");
    expect(trainingViewSource).toContain("Retry required");
    expect(trainingViewSource).toContain("CorrectAnswerCelebration");
    expect(trainingViewSource).toContain("playCorrectAnswerSuccessSound");
    expect(trainingViewSource).toContain("slideInteractionCelebrationActive");
    expect(trainingViewSource).toContain("Success sound");
    expect(trainingViewSource).toContain("Success sound muted");
    expect(trainingViewSource).toContain("Sound ready");
    expect(trainingViewSource).toContain("Knowledge-check sound on");
    expect(trainingViewSource).toContain("Knowledge-check sound muted");
    expect(trainingViewSource).toContain("Knowledge-check sound ready");
    expect(trainingViewSource).toContain("enableos-confetti-fall");
    expect(trainingViewSource).toContain("enableos-balloon-float");
    expect(trainingViewSource).toContain("compact");
  });

  it("collapses launch context, lane setup, and stage overview into a single closed-by-default Course context drawer", () => {
    // The drawer starts collapsed, so none of the three blocks render on load.
    expect(trainingViewSource).toContain("const [courseContextOpen, setCourseContextOpen] = useState(false)");
    expect(trainingViewSource).toContain(">Course context<");
    expect(trainingViewSource).toContain("Launch context, lane setup, and stage overview");
    expect(trainingViewSource).toContain("setCourseContextOpen((current) => !current)");

    // The lane / scenario picker still drives the same handlers after the move.
    expect(trainingViewSource).toContain("onClick={() => setRoleFilter(option.value)}");
    expect(trainingViewSource).toContain("onClick={() => setPreviewScenarioId(scenario.id)}");

    // The three blocks live inside the drawer body (after the courseContextOpen gate).
    // The drawer now sits BELOW the lesson grid, so the grid renders directly under
    // the status strip with no band between them.
    const drawerGate = trainingViewSource.indexOf("{courseContextOpen ? (");
    const lessonCanvas = trainingViewSource.indexOf("Lesson canvas ·");
    const launchContext = trainingViewSource.indexOf("Library launch context");
    const launchSetup = trainingViewSource.indexOf("<span className=\"text-sm font-medium text-white\">Launch setup</span>");
    const stageOverview = trainingViewSource.indexOf("Stage overview");
    expect(drawerGate).toBeGreaterThan(-1);
    expect(drawerGate).toBeGreaterThan(lessonCanvas);
    for (const idx of [launchContext, launchSetup, stageOverview]) {
      expect(idx).toBeGreaterThan(drawerGate);
    }
  });

  it("places the canvas-dominant lesson grid directly under the status strip with the course-context drawer below it", () => {
    // Three-column grid: left rail | dominant lesson canvas | compact right rail.
    expect(trainingViewSource).toContain("xl:grid-cols-[15rem_minmax(0,1fr)_18.75rem]");

    // Order in source: status strip ("Back to learner") -> lesson grid -> course-context drawer.
    const backToLearner = trainingViewSource.indexOf("Back to learner");
    const grid = trainingViewSource.indexOf("xl:grid-cols-[15rem_minmax(0,1fr)_18.75rem]");
    const drawerGate = trainingViewSource.indexOf("{courseContextOpen ? (");
    expect(backToLearner).toBeGreaterThan(-1);
    expect(grid).toBeGreaterThan(backToLearner);
    expect(drawerGate).toBeGreaterThan(grid);
  });

  it("moves stage and page navigation into a single collapsible left rail with no duplicate in-canvas tab strips", () => {
    // 3-column grid (left rail 240px | dominant canvas | right rail 300px), both rails collapsible to ~56px.
    expect(trainingViewSource).toContain("xl:grid-cols-[15rem_minmax(0,1fr)_18.75rem]");
    expect(trainingViewSource).toContain("xl:grid-cols-[3.5rem_minmax(0,1fr)_18.75rem]");
    expect(trainingViewSource).toContain("const [railCollapsed, setRailCollapsed] = useState(false)");
    expect(trainingViewSource).toContain(">Stages<");
    expect(trainingViewSource).toContain(">Pages<");

    // Navigation is still bound to the same state/handlers (highlight uses the same indices).
    expect(trainingViewSource).toContain("setStageIndex(index)");
    expect(trainingViewSource).toContain("setTrainingWorkspacePage(page.key)");
    expect(trainingViewSource).toContain("const isActiveStage = index === stageIndex");
    expect(trainingViewSource).toContain("const isActivePage = trainingWorkspacePage === page.key");

    // The old in-canvas tab strips are gone — one navigation source.
    expect(trainingViewSource).not.toContain("Training pages");
    expect(trainingViewSource).not.toContain("Switch modes from one compact control or open the mapped curriculum deck.");
    expect(trainingViewSource).not.toContain("shrink-0 rounded-full border px-3 py-2 text-left text-xs transition");
  });

  it("re-proportions the player so the center canvas dominates and the narrow side band is removed (W2)", () => {
    // Left rail 240px (15rem), right rail 300px (18.75rem), center canvas takes the remaining width.
    expect(trainingViewSource).toContain("xl:grid-cols-[15rem_minmax(0,1fr)_18.75rem]");
    // All four collapse permutations exist (both rails collapsible to ~56px / 3.5rem).
    expect(trainingViewSource).toContain("xl:grid-cols-[3.5rem_minmax(0,1fr)_18.75rem]");
    expect(trainingViewSource).toContain("xl:grid-cols-[15rem_minmax(0,1fr)_3.5rem]");
    expect(trainingViewSource).toContain("xl:grid-cols-[3.5rem_minmax(0,1fr)_3.5rem]");
    // Right Progress rail is now collapsible.
    expect(trainingViewSource).toContain("const [progressRailCollapsed, setProgressRailCollapsed] = useState(false)");
    expect(trainingViewSource).toContain("setProgressRailCollapsed");
    // The player uses the wide Surface variant (no narrow centered container / side band).
    expect(trainingViewSource).toContain("<Surface wide>");
    // Prose reading width is capped on the now-wide canvas.
    expect(trainingViewSource).toContain("max-w-[54rem] break-words text-sm leading-7");
  });

  it("tightens the lesson headline and lays out storyboard steps as a readable grid (W3)", () => {
    // Opening-control headline reduced from text-2xl to text-xl so it stays within ~2 lines.
    expect(trainingViewSource).toContain("text-xl font-semibold text-white\">{currentLessonPage.title}");
    expect(trainingViewSource).not.toContain("text-2xl font-semibold text-white\">{currentLessonPage.title}");
    // Storyboard steps use an auto-fit grid instead of fixed 3-col skinny towers.
    expect(trainingViewSource).toContain("[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]");
    expect(trainingViewSource).not.toContain("border-t border-cyan-300/15 pt-4 lg:grid-cols-3");
  });

  it("wires the real uploaded deck slides into the lesson viewer with graceful fallback (S3)", () => {
    // Lesson viewer prefers the real deck visuals (served from /slides/) over generated placeholders.
    expect(trainingViewSource).toContain("const deckGalleryVisuals = trainingVisuals.filter((visual) => visual.visualType === \"deck\" && Boolean(visual.imageUrl))");
    expect(trainingViewSource).toContain("const interactiveGalleryVisuals = deckGalleryVisuals.length");
    // Falls back to generated lesson visuals when a module has no converted slides.
    expect(trainingViewSource).toContain("lessonVisualGallery.length");

    // The per-module slide manifest (deckVisuals) points at locally-served /slides/ images.
    const trainingContent = readFileSync(join(process.cwd(), "shared/trainingContent.ts"), "utf8");
    expect(trainingContent).toContain("imageUrl: \"/slides/");
    expect(trainingContent).toContain("/slides/softskills-08_fd8d5235.png");
  });

  it("makes the slide a dominant hero with a full-screen lightbox and thumbnail strip (S4)", () => {
    // Large fitted slide (aspect-video, object-contain) — the forced horizontal-scroll frame is gone.
    expect(trainingViewSource).toContain("flex aspect-video w-full items-center justify-center bg-black/40");
    expect(trainingViewSource).not.toContain("min-w-[980px]");
    // Click-to-enlarge full-screen lightbox.
    expect(trainingViewSource).toContain("const [slideLightboxOpen, setSlideLightboxOpen] = useState(false)");
    expect(trainingViewSource).toContain("<Dialog open={slideLightboxOpen} onOpenChange={setSlideLightboxOpen}>");
    expect(trainingViewSource).toContain("setSlideLightboxOpen(true)");
    // Compact thumbnail strip for quick jumping.
    expect(trainingViewSource).toContain("Go to slide ${index + 1}");
  });

  it("renders the slide ahead of the lesson copy so the canvas is slide-forward (S4b)", () => {
    // The deck slide viewer leads the lesson canvas; the headline/narrative/storyboard follow beneath it.
    expect(trainingViewSource).toContain("Slide-forward: the deck slide leads the lesson canvas");
    const slideIndex = trainingViewSource.indexOf("{activeInteractiveVisual && trainingWorkspacePage === \"lesson\" ? (");
    const headlineIndex = trainingViewSource.indexOf("text-xl font-semibold text-white\">{currentLessonPage.title}");
    const storyboardIndex = trainingViewSource.indexOf("Visual storyboard");
    expect(slideIndex).toBeGreaterThan(-1);
    expect(headlineIndex).toBeGreaterThan(-1);
    // Slide markup appears earlier in the lesson canvas source than the headline + storyboard.
    expect(slideIndex).toBeLessThan(headlineIndex);
    expect(slideIndex).toBeLessThan(storyboardIndex);
  });

  it("adds a focused full-screen mode that overlays the chrome and widens the canvas (F1)", () => {
    // Focused-mode state + enter/exit controls.
    expect(trainingViewSource).toContain("const [focusedMode, setFocusedMode] = useState(false)");
    expect(trainingViewSource).toContain("setFocusedMode(true)");
    expect(trainingViewSource).toContain("setFocusedMode(false)");
    expect(trainingViewSource).toContain("Exit focused full-screen mode");
    expect(trainingViewSource).toContain("Enter focused full-screen mode");
    // Rendered through a portal to document.body so it escapes the layout stacking context
    // and covers the z-40 sidebar/header chrome, while staying below the z-50 dialogs.
    expect(trainingViewSource).toContain("createPortal(");
    expect(trainingViewSource).toContain("fixed inset-0 z-[45]");
    expect(trainingViewSource).toContain("document.body,");
    // The same player body is reused in both modes (state is preserved on the parent).
    expect(trainingViewSource).toContain("const playerBody = (");
    expect(trainingViewSource).toContain("return <Surface wide>{playerBody}</Surface>");
    // An open dialog (lightbox/curriculum) consumes Escape before focus exit.
    expect(trainingViewSource).toContain("if (document.querySelector('[role=\"dialog\"]')) return;");
  });

  it("gates Training Pages content so each tab renders only its own sections", () => {
    // Lesson is the default page on load.
    expect(trainingViewSource).toContain("useState<\"brief\" | \"lesson\" | \"checkpoint\" | \"resources\">(\"lesson\")");

    // The lesson content frame renders for lesson/checkpoint/resources, then each section is page-gated.
    expect(trainingViewSource).toContain("(trainingWorkspacePage === \"lesson\" || trainingWorkspacePage === \"checkpoint\" || trainingWorkspacePage === \"resources\") && currentLessonPage");

    // Checkpoint owns the knowledge check + signal markers.
    expect(trainingViewSource).toContain("currentSlideInteraction && trainingWorkspacePage === \"checkpoint\"");
    expect(trainingViewSource).toContain("lessonSignalCards.length && trainingWorkspacePage === \"checkpoint\"");
    // Lesson owns the interactive slide canvas.
    expect(trainingViewSource).toContain("activeInteractiveVisual && trainingWorkspacePage === \"lesson\"");
    // Resources owns the evidence charts (previously ungated — rendered on every tab).
    expect(trainingViewSource).toContain("insightCharts.length && trainingWorkspacePage === \"resources\"");

    // Gated, not deleted — every section still exists in the source.
    expect(trainingViewSource).toContain("Visual {activeInteractiveVisualIndex + 1} of {interactiveGalleryVisuals.length}");
    expect(trainingViewSource).toContain("Visual storyboard");
    expect(trainingViewSource).toContain("Knowledge check");
    expect(trainingViewSource).toContain("Benchmark {signal.benchmark");
    expect(trainingViewSource).toContain("Transcript");
    expect(trainingViewSource).toContain("Coach notes");
    expect(trainingViewSource).toContain("Evidence graphics");
  });

  it("consolidates the lesson slide into a single viewer with no duplicate slide presentations", () => {
    // One viewer: active slide image + its text, prev/next, and a compact index.
    expect(trainingViewSource).toContain("setSlideLightboxOpen(true)");
    expect(trainingViewSource).toContain("Visual {activeInteractiveVisualIndex + 1} of {interactiveGalleryVisuals.length}");
    expect(trainingViewSource).toContain("TrainingVisualFrame visual={activeInteractiveVisual}");
    expect(trainingViewSource).toContain("Previous slide");
    expect(trainingViewSource).toContain("Next slide");
    // Prev/next stays bound to the existing slide-index state.
    expect(trainingViewSource).toContain("setSelectedDeckVisualIndex");

    // The duplicate slide presentations are gone.
    expect(trainingViewSource).not.toContain("Primary lesson visual");
    expect(trainingViewSource).not.toContain("Interactive slide canvas");
    expect(trainingViewSource).not.toContain("Slide reference");
    expect(trainingViewSource).not.toContain("Visual focus lock");
    expect(trainingViewSource).not.toContain("This area no longer repeats");
  });

  it("compacts the signal markers into a small stat row and hides evidence behind a View evidence reveal", () => {
    // Signal markers: a compact horizontal row of three small stats (no large cards / per-card eyebrow).
    expect(trainingViewSource).toContain("mt-6 grid grid-cols-3 gap-2");
    expect(trainingViewSource).toContain("Benchmark {signal.benchmark");
    expect(trainingViewSource).not.toContain("Signal marker");

    // Evidence charts: collapsed behind one "View evidence" reveal (not two full-height charts by default).
    expect(trainingViewSource).toContain(">View evidence<");
    expect(trainingViewSource).toContain("{insightCharts.length} charts");
    // Charts are revealed on demand, not deleted.
    expect(trainingViewSource).toContain("Lesson graph");
    expect(trainingViewSource).not.toContain("Charts are embedded as part of the lesson storyline");
  });

  it("keeps exact training-target resolution while the front page shifts to a workspace-selector entry flow", () => {
    expect(trainingViewSource).toContain("const CONTENT_LIBRARY_TRAINING_TARGET_ALIASES");
    expect(trainingViewSource).toContain("const [location, setLocation] = useLocation()");
    expect(trainingViewSource).toContain("const requestedAssetTitle = queryParams.get(\"assetTitle\")");
    expect(trainingViewSource).toContain("if (matchedAsset && libraryMode !== \"launcher\")");
    expect(trainingViewSource).toContain("journeyId: journeyId ?? resolvedTrainingTarget?.journeyId");
    expect(trainingViewSource).toContain("moduleId: moduleId ?? resolvedTrainingTarget?.moduleId");
    expect(trainingViewSource).toContain("const requestedTrainingTarget = useMemo(() => resolveTrainingTargetByJourneyId(requestedJourneyId), [requestedJourneyId])");
    expect(trainingViewSource).toContain("return preset ? { journeyId: normalizedJourneyKey, ...preset } : null;");
    expect(trainingViewSource).toContain("window.location.href = getLoginUrl(item.route)");
    expect(trainingViewSource).toContain("Open assigned workspace");
  });

  it("removes the obstructive desktop workspace banner while keeping the shared shell intact", () => {
    expect(dashboardLayoutSource).not.toContain("compactWorkspaceHeaderPaths");
    expect(dashboardLayoutSource).not.toContain("command-band px-4");
    expect(dashboardLayoutSource).not.toContain("commandSignal.headline");
    expect(dashboardLayoutSource).toContain("commandSignal.focus");
    expect(dashboardLayoutSource).toContain("<main className={`flex-1 p-3 pt-4 sm:p-4 sm:pt-5 md:p-6 md:pt-6 xl:p-8 xl:pt-6 ${desktopSidebarUi.mainPaddingClass}`}>{children}</main>");
  });

  it("keeps the shared mission-control shell animated and reward-aware without overwhelming the workflow", () => {
    expect(trainingViewSource).toContain("Mascot cue active");
    expect(trainingViewSource).toContain("Mascot moment");
    expect(trainingViewSource).toContain("Celebration ready");
    expect(trainingViewSource).toContain("🎈");
  });
});

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
    expect(trainingViewSource).toContain("Switch modes from one compact control or open the mapped curriculum deck.");
    expect(trainingViewSource).toContain("selectedModule?.title ?? requestedModuleId ?? \"Training module\"");
    expect(trainingViewSource).toContain("selectedModuleTitle} curriculum");
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

  it("keeps the coach workspace on the inline weekly coaching log flow while preserving the shared structured composer", () => {
    expect(trainingViewSource).toContain("Open weekly coaching log");
    expect(trainingViewSource).toContain("The weekly coaching log is back in the coaching lane");
    expect(trainingViewSource).toContain("jump directly to the inline coaching form below");
    expect(trainingViewSource).toContain("coachWeeklyCoachingLogProps");
    expect(trainingViewSource).toContain("<WeeklyCoachingLogComposer");
    expect(trainingViewSource).toContain("function WeeklyCoachingLogPopupBox");
    expect(trainingViewSource).toContain("function WeeklyCoachingLogDetailDialog");
    expect(trainingViewSource).toContain("function DocumentationEntryDetailDialog");
    expect(trainingViewSource).toContain("Open exact coaching log");
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
    expect(trainingViewSource).toContain("Public / Private visibility");
    expect(trainingViewSource).toContain("Public coaching log");
    expect(trainingViewSource).toContain("Private coaching note");
    expect(trainingViewSource).toContain("Private stays on file for leadership only and does not notify the learner.");
    expect(trainingViewSource).toContain("Coach needs now live inside Documentation mode");
    expect(trainingViewSource).toContain("Alerts mode keeps the coach queue compact until detail is needed.");
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
    expect(trainingViewSource).toContain("Coach studio mission");
    expect(trainingViewSource).toContain("A calmer coach desk keeps guidance, evidence, and follow-through in one polished workspace.");
    expect(trainingViewSource).not.toContain("Coach control surface");
    expect(trainingViewSource).toContain("Coach needs now live inside Documentation mode");
    expect(trainingViewSource).toContain("Alerts mode keeps the coach queue compact until detail is needed.");
    expect(trainingViewSource).toContain("Open weekly coaching log");
    expect(trainingViewSource).toContain("text-slate-700\">Switch between live coaching, transfer evidence, documentation, and alerts without leaving one endless page.");
    expect(trainingViewSource).toContain("border-cyan-300/80 bg-[linear-gradient(180deg,rgba(236,254,255,0.98),rgba(224,242,254,0.94))]");
    expect(trainingViewSource).toContain("border-slate-200 bg-white/88 shadow-[0_16px_35px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-white");
    expect(trainingViewSource).not.toContain("Coach-visible signal trend");
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
    expect(trainingViewSource).toContain("selectedModule?.title ?? requestedModuleId ?? \"Training module\"");
    expect(trainingViewSource).toContain("selectedModuleTitle} curriculum");
    expect(trainingViewSource).toContain("Curriculum");
    expect(trainingViewSource).toContain("Return to lesson");
    expect(trainingViewSource).toContain("Resources");
    expect(trainingViewSource).toContain("rounded-full border px-3 py-2 text-left text-xs transition");
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
    expect(trainingViewSource).toContain("Content Missions Library");
    expect(trainingViewSource).toContain("Compact rows");
    expect(trainingViewSource).toContain("Training queue");
    expect(trainingViewSource).toContain("Selected course detail");
    expect(trainingViewSource).toContain("Course detail staging");
    expect(trainingViewSource).toContain("Curriculum preview");
    expect(trainingViewSource).toContain("Curriculum handoff");
    expect(trainingViewSource).toContain("Structured ingestion lane");
    expect(trainingViewSource).toContain("Curriculum maintenance plan");
    expect(trainingViewSource).toContain("Launch-readiness note");
    expect(trainingViewSource).toContain("Add structured asset");
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

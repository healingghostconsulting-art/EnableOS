import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildLearnerFeedbackPreferencesStorageKey,
  buildPracticeRecallCards,
  nextUnknownIndex,
  selectMissedQuestions,
  orderQuestionsMissedFirst,
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
    // The Journey-tab gold action card is assignment-aware (ALIGN3): assigned retraining vs recommended path.
    expect(trainingViewSource).toContain('title={assignmentDue ? "Open assigned retraining" : "Resume the recommended path"}');
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

  it("gates the learner modes and folds resources + history into the right modes (L5)", () => {
    // Radix-gated modes (only the active TabsContent renders), default Journey. The
    // Leaderboard mode (LEAD2) was added after Journey.
    expect(trainingViewSource).toContain('useState<"journey" | "leaderboard" | "alerts" | "reengagements" | "coaching" | "evidence">("journey")');
    expect(trainingViewSource).toContain('value as "journey" | "leaderboard" | "alerts" | "reengagements" | "coaching" | "evidence"');
    // Mapped resources folded into Journey as a secondary "Resources" section (no own tab).
    expect(trainingViewSource).toContain('<WorkflowLibraryPanel title="Resources"');
    expect(trainingViewSource).not.toContain('title="Journey resource mix"');
    // Past retraining history lives in Evidence alongside completion records.
    expect(trainingViewSource).toContain('title="Past retraining history"');
  });

  it("adds a learner Alerts mode + per-audience unread badge, scoped to coaching+training (NOTIF2)", () => {
    // Learner Alerts mode consuming the engine, with the same reminder chrome.
    expect(trainingViewSource).toContain('buildReminders("learner"');
    expect(trainingViewSource).toContain('{ value: "alerts", label: "Alerts", badge: learnerUnread }');
    expect(trainingViewSource).toContain("<TabsContent value=\"alerts\"");
    expect(trainingViewSource).toContain("reminder={selectedLearnerAlert}");
    // Unread badge wiring on every workspace Alerts tab + mark-read on open.
    expect(trainingViewSource).toContain("badge: coachUnread");
    expect(trainingViewSource).toContain("badge: managerUnread");
    expect(trainingViewSource).toContain("markLearnerRemindersRead()");
    expect(trainingViewSource).toContain("useReminderInbox(");
    // Scope trim: the telephony/WFM reminder labels are gone from the chrome.
    expect(trainingViewSource).not.toContain("kpi_red:");
    expect(trainingViewSource).not.toContain('readiness_red: "Performance"');
  });

  it("brings learner Re-engagements + Evidence onto the shared action-card + preview->popout pattern (ALIGN2)", () => {
    // Reuses the shared CoachLaneActionCard row (gold primary + dark secondaries), not Coach's light list cards.
    expect(trainingViewSource).toContain('eyebrow="Priority re-engagement"');
    expect(trainingViewSource).toContain('title="Start the priority re-engagement"');
    // Re-engagements: selectable list → "Selected re-engagement" detail with a popout.
    expect(trainingViewSource).toContain('>Selected re-engagement<');
    expect(trainingViewSource).toContain('buttonLabel="Open re-engagement plan"');
    // Evidence: gold "latest review" launcher + selectable review list (new state) → detail + popout.
    expect(trainingViewSource).toContain('title="Open your latest review"');
    expect(trainingViewSource).toContain('setSelectedReviewId(entry.id)');
    expect(trainingViewSource).toContain('>Selected review<');
    expect(trainingViewSource).toContain('buttonLabel="Open review"');
    // The old forced two-column "Documentation hub" card is gone (folded into the popout).
    expect(trainingViewSource).not.toContain('<CardTitle className="text-white">Documentation hub</CardTitle>');
  });

  it("adds the learner leaderboard mode ranked via rankLeaderboard with the identity + pin rules (LEAD2)", () => {
    // New mode tab + content, ranked from the config helper.
    expect(trainingViewSource).toContain('{ value: "leaderboard", label: "Leaderboard" }');
    expect(trainingViewSource).toContain("<LearnerLeaderboard leaderboard={data.leaderboard} />");
    expect(trainingViewSource).toContain("rankLeaderboard(roster)");
    // Two scopes via tabs, My team default.
    expect(trainingViewSource).toContain('useState<"team" | "org">("team")');
    expect(trainingViewSource).toContain('["team", "My team"], ["org", "Org-wide"]');
    // Identity: current learner sees full name; others are first name + last initial.
    expect(trainingViewSource).toContain("function leaderboardIdentity(name: string, isCurrent: boolean)");
    expect(trainingViewSource).toContain("if (isCurrent) return name;");
    // Personal rank summary + gap to next.
    expect(trainingViewSource).toContain("You're #");
    expect(trainingViewSource).toContain("pts to #");
    // Top-3 semantic treatment (icon + label) and the pinned current-learner row.
    expect(trainingViewSource).toContain("const LEADERBOARD_TOP3");
    expect(trainingViewSource).toContain("sticky bottom-2");
    // Period selector is intentionally inert until period data exists.
    expect(trainingViewSource).toContain('disabled aria-label="Leaderboard period"');
  });

  it("shows the org reward callout, admin-editable and read-only otherwise (LEAD3)", () => {
    expect(trainingViewSource).toContain("function LeaderboardRewardCallout()");
    expect(trainingViewSource).toContain("<LeaderboardRewardCallout />");
    // Edit affordance gated to admin grant roles only.
    expect(trainingViewSource).toContain('grantRole === "client_admin" || grantRole === "platform_admin"');
    expect(trainingViewSource).toContain("This period's reward");
    expect(trainingViewSource).toContain("leaderboardReward.text");
  });

  it("gives washed bg-white/5 lane cards a dark surface and lifts muted labels off slate-500 (CONTRAST2)", () => {
    const css = readFileSync(join(process.cwd(), "client/src/index.css"), "utf8");
    // Shared tokens: dark surface + muted/subtle on-dark label colors.
    expect(css).toContain(".surface-dark");
    expect(css).toContain(".text-muted-dark");
    expect(css).toContain(".text-subtle-dark");
    // Leaderboard standings + manager queues now sit on a real dark surface.
    expect(trainingViewSource).toContain('className="surface-dark space-y-3 rounded-[1.6rem] border border-white/10 p-3 sm:p-3.5"');
    expect(trainingViewSource).toContain('className="surface-dark space-y-4 rounded-[1.6rem] border border-white/10 p-3"');
    expect(trainingViewSource).toContain('className="surface-dark space-y-2.5 rounded-[1.6rem] border border-white/10 p-3"');
    // On-dark eyebrow/secondary labels lifted off slate-500 (~2.9:1) to the AA token.
    expect(trainingViewSource).toContain('tracking-[0.22em] text-muted-dark">Your standing');
    expect(trainingViewSource).toContain('tracking-[0.22em] text-muted-dark">Team leaderboard');
    expect(trainingViewSource).toContain('text-muted-dark">pts</p>');
  });

  it("sets explicit legible on-dark tick + tooltip-label colors on the dark charts (CONTRAST3)", () => {
    // Axis ticks get an explicit on-dark fill rather than inheriting the dark page color.
    expect(trainingViewSource).toContain('tick={{ fill: "#94a3b8" }}');
    // Tooltip label text lifted off Recharts' default dark color onto a legible slate.
    expect(trainingViewSource).toContain('labelStyle={{ color: "#cbd5e1" }}');
    // No dark-chart axis is left without a tick fill.
    expect(trainingViewSource).not.toMatch(/<YAxis stroke="#94a3b8" tickLine=\{false\} axisLine=\{false\} \/>/);
    expect(trainingViewSource).not.toMatch(/<XAxis dataKey="(label|week|period)" stroke="#94a3b8" tickLine=\{false\} axisLine=\{false\} \/>/);
  });

  it("retargets the Coach + Manager Alerts onto the reminder engine (NOTIF1)", () => {
    expect(trainingViewSource).toContain('buildReminders("coach"');
    expect(trainingViewSource).toContain('buildReminders("manager"');
    expect(trainingViewSource).toContain("<ReminderRow");
    expect(trainingViewSource).toContain("<ReminderDetail");
    // The static notification list is gone from both Alerts modes.
    expect(trainingViewSource).not.toContain("data.notifications.map");
  });

  it("reuses the leaderboard component for a manager board with a three-level scope (LEAD5)", () => {
    // Same component, manager variant, surfaced as a Manager Ops mode.
    expect(trainingViewSource).toContain('<LearnerLeaderboard leaderboard={data.leaderboard} variant="manager" />');
    expect(trainingViewSource).toContain('{ value: "leaderboard", label: "Leaderboard" }');
    expect(trainingViewSource).toContain('id="manager-leaderboard"');
    // Three-level scope Org → Coach Team → Learner, default Org.
    expect(trainingViewSource).toContain('useState<"org" | "team" | "learner">("org")');
    expect(trainingViewSource).toContain('["org", "Org"], ["team", "Coach team"], ["learner", "Learner"]');
    // Managers see full names — the "First L." mask is turned off.
    expect(trainingViewSource).toContain("isCurrent={false} mask={false}");
    // Learner scope defaults to the manager's direct report (else the team's #1).
    expect(trainingViewSource).toContain("leaderboard?.directReportId");
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
    // The signal feed keeps its deep-link anchor (relocated into the gated modes by MGR5).
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

  it("moves the always-on manager blocks into the gated modes so nothing big sits above the tabs (MGR5)", () => {
    // The manager shell no longer carries a betweenStatsAndTabs band (only the learner + library shells do).
    const managerShellStart = trainingViewSource.indexOf("title=\"Manager Ops\"");
    const managerShellOpenEnd = trainingViewSource.indexOf("\n    >", managerShellStart);
    const managerShellHead = trainingViewSource.slice(managerShellStart, managerShellOpenEnd);
    expect(managerShellHead).not.toContain("betweenStatsAndTabs");

    const interventionsAnchor = trainingViewSource.indexOf("id=\"manager-interventions-lane\"");
    const coachingAnchor = trainingViewSource.indexOf("id=\"manager-coaching-lane\"");
    // The Signal severity feed now renders inside the Interventions mode (after its anchor, before Coaching).
    const signalFeed = trainingViewSource.indexOf("Signal severity feed");
    expect(signalFeed).toBeGreaterThan(interventionsAnchor);
    expect(signalFeed).toBeLessThan(coachingAnchor);
    // The AI coaching guidance panel (actorRole="manager") now renders inside the Coaching mode.
    const managerGuidance = trainingViewSource.indexOf("actorRole=\"manager\"");
    expect(managerGuidance).toBeGreaterThan(coachingAnchor);
    // Relocated blocks span the full mode width rather than a column.
    expect(trainingViewSource).toContain("className=\"col-span-full scroll-mt-24\"");
  });

  it("condenses the manager Coaching mode to Coach Studio's preview-to-popout pattern with the two functional changes (MGR6)", () => {
    const coachingStart = trainingViewSource.indexOf("id=\"manager-coaching-lane\"");
    const coachingEnd = trainingViewSource.indexOf("id=\"manager-documentation-lane\"");
    const coachingLane = trainingViewSource.slice(coachingStart, coachingEnd);

    // UI: the inline weekly-coaching-log form and the duplicate direct-report timeline are gone from the lane.
    expect(coachingLane).not.toContain("<WeeklyCoachingLogComposer {...managerWeeklyCoachingLogProps}");
    expect(coachingLane).not.toContain("Coach-lane direct-report logs");
    // History, oversight, and push-training are now popup launcher cards (preview -> popout).
    expect(coachingLane).toContain("Review coaching history");
    expect(coachingLane).toContain("buttonLabel=\"Open coaching history\"");
    expect(coachingLane).toContain("buttonLabel=\"Open coach oversight\"");
    expect(coachingLane).toContain("<PushCoachTrainingCard");
    // The weekly one-on-one still opens only via its popup launcher.
    expect(coachingLane).toContain("buttonLabel=\"Open weekly one-on-one\"");
    // The coaching-session cards + selected-session preview remain as the lane's at-a-glance content.
    expect(coachingLane).toContain("Coaching session");
    expect(coachingLane).toContain("Audit trail");

    // Functional change 1: managers see the AI suggestion read-only; approve/override gated to non-managers.
    expect(trainingViewSource).toContain("{actorRole !== \"manager\" ? (");
    // The approve/override controls still ship for the coach role (Coach Studio unchanged).
    expect(trainingViewSource).toContain("Approve guidance");
    expect(trainingViewSource).toContain("Override suggestion");

    // Functional change 2: the manager pushes coach trainings (select a coach + a library asset).
    expect(trainingViewSource).toContain("function PushCoachTrainingCard");
    expect(trainingViewSource).toContain("Push training to coach");
  });

  it("routes Mission Hub through WorkspaceShell as a tab-less overview and strips its self-narration (COH1)", () => {
    const shellSource = readFileSync(join(process.cwd(), "client/src/components/WorkspaceShell.tsx"), "utf8");
    // The shell now supports a tab-less overview: tabs are optional and the tabs band is skipped when empty.
    expect(shellSource).toContain("tabs = []");
    expect(shellSource).toContain("tabs.length > 0 ? (");
    // Mission Hub keeps the shared slim header + dark stat row (no SectionShell eyebrow hero, no fake modes).
    expect(trainingViewSource).toContain("title=\"Mission Hub\"");
    expect(trainingViewSource).toContain("stats={missionHubContent.progress.map((entry) => ({ label: entry.label, value: entry.value }))}");
    // The big mission hero (the chip + meta-label unique to it) and its self-narrating copy are gone.
    expect(trainingViewSource).not.toContain("Role-relevant summary");
    expect(trainingViewSource).not.toContain("Current program mission");
    expect(trainingViewSource).not.toContain("The current role should only see the goals that matter");
    expect(trainingViewSource).not.toContain("These milestones keep the next checkpoint and progress status visible");
  });

  it("brings EnableOS Guide onto the shared slim header via a stat-less WorkspaceShell (COH2)", () => {
    const shellSource = readFileSync(join(process.cwd(), "client/src/components/WorkspaceShell.tsx"), "utf8");
    // The shell's stat row is now optional too, so a help page can use just the slim header.
    expect(shellSource).toContain("stats = []");
    expect(shellSource).toContain("stats.length > 0 ? (");
    // The Guide renders through WorkspaceShell with a short title (no oversized SectionShell header).
    expect(trainingViewSource).toContain("title=\"EnableOS Guide\"");
    expect(trainingViewSource).not.toContain("compact={false}");
    // Self-narrating header copy is gone.
    expect(trainingViewSource).not.toContain("Learn where to start, what each workspace does, and how EnableOS should flow");
    expect(trainingViewSource).not.toContain("Use this shared guide to orient new users");
  });

  it("dark-ifies the EnableOS Guide body to the shared PremiumCard family (COHESION2)", () => {
    const guideSource = trainingViewSource.slice(trainingViewSource.indexOf("export function GuideView"), trainingViewSource.indexOf("export function LandingView"));
    // The three content lists no longer use the light bg-white/90 Card chrome (the
    // #1B303C header action buttons legitimately stay on the light shell header).
    expect(guideSource).not.toContain("bg-white/90");
    // They render as the shared dark PremiumCard with white/slate text.
    expect(guideSource).toContain("<PremiumCard key={step.title}>");
    expect(guideSource).toContain("<PremiumCard key={workspace.title}>");
    expect(guideSource).toContain("<PremiumCard key={practice.title}>");
    // The in-content tab bar is dark chrome (still content tabs, not WorkspaceShell modes).
    expect(guideSource).toContain('<TabsList className="surface-dark grid w-full grid-cols-3');
    expect(guideSource).toContain('data-[state=active]:bg-white/12 data-[state=active]:text-white');
    // The two self-narrating "Current role focus" bullets are rephrased into user-facing guidance.
    expect(guideSource).not.toContain("Use the Guide to explain the system once");
    expect(guideSource).not.toContain("leaving the Guide available as a safe shared orientation page");
    expect(guideSource).toContain("Lead with your role's daily work");
  });

  it("gives Manager Documentation the preview-to-popout treatment and hides the stale override pill for managers (MGR7)", () => {
    // The inline review-log form + inline history are now launcher cards that open in focused popups.
    expect(trainingViewSource).toContain("title=\"Write a coaching log\"");
    expect(trainingViewSource).toContain("buttonLabel=\"Open coaching log composer\"");
    expect(trainingViewSource).toContain("title=\"Review log history\"");
    expect(trainingViewSource).toContain("buttonLabel=\"Open review history\"");
    // The documentation lane stacks launchers over reference content (not the old two-column inline layout).
    expect(trainingViewSource).toContain("id=\"manager-documentation-lane\" className=\"mt-0 space-y-6 scroll-mt-24\"");
    // The composer popup closes itself on save.
    expect(trainingViewSource).toContain("onCreated={() => { close(); onUpdated?.(); }}");
    // Cosmetic: the "Override enabled" pill is gated off for managers but kept for coaches.
    expect(trainingViewSource).toContain("actorRole !== \"manager\" ? <Badge");
    expect(trainingViewSource).toContain("Override enabled");
  });

  it("condenses the manager AI coaching suggestion into an Open AI guidance launcher (MGR8)", () => {
    // The inline multi-line GuidanceActionPanel no longer sits at the top of the coaching lane.
    expect(trainingViewSource).not.toContain("<GuidanceActionPanel\n            tenantId={data.tenant.id}\n            suggestion={data.aiSuggestion}\n            catalog={data.retrainingCatalog}\n            assignments={data.activeRetrainingAssignments}\n            actorRole=\"manager\"");
    // It is now a read-only preview card that opens the guidance panel in a focused popup.
    expect(trainingViewSource).toContain("title=\"Review the AI coaching suggestion\"");
    expect(trainingViewSource).toContain("dialogTitle=\"AI coaching suggestion\"");
    expect(trainingViewSource).toContain("<GuidanceActionPanel tenantId={data.tenant.id} suggestion={data.aiSuggestion} catalog={data.retrainingCatalog} assignments={data.activeRetrainingAssignments} actorRole=\"manager\" learnerName={data.directReport.name} onUpdated={onUpdated} />");
  });

  it("maps Journey + Coaching onto the shared action-card pattern, dark surfaces (ALIGN3)", () => {
    // The shared CoachLaneActionCard gold chrome is still the row primitive.
    expect(trainingViewSource).toContain("rounded-[1.25rem] border px-3 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.12)]");
    expect(trainingViewSource).toContain("bg-[linear-gradient(180deg,rgba(255,247,216,0.98),rgba(252,228,150,0.94))]");
    // Journey: action row (gold + dark launchers) → selectable path → "Selected module" detail.
    expect(trainingViewSource).toContain('title="Browse the learning path"');
    expect(trainingViewSource).toContain("setSelectedModuleId(module.id)");
    expect(trainingViewSource).toContain('<CardTitle className="text-white">Selected module</CardTitle>');
    // The path list (and the ALIGN2 lists) sit on a real dark surface, not bare bg-white/5.
    expect(trainingViewSource).toContain("surface-dark space-y-2.5 rounded-[1.6rem] border border-white/10 p-3");
    // Coaching: gold take-aways + history popout, with the editable timeline kept as the body.
    expect(trainingViewSource).toContain('title="Add your weekly take-aways"');
    expect(trainingViewSource).toContain('id="learner-coaching-timeline"');
    expect(trainingViewSource).toContain("allowTakeawayEditing");
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

  it("adds a browsable Resources asset shelf that reads the resolved library assets (LIBRARY3)", () => {
    // New Resources tab on the Library WorkspaceShell.
    expect(trainingViewSource).toContain('{ value: "resources", label: "Resources" }');
    expect(trainingViewSource).toContain('value="resources"');
    // Text/badge-forward asset card (not the cover-art course card).
    expect(trainingViewSource).toContain("function LibraryAssetCard");
    expect(trainingViewSource).toContain("ASSET_FORMAT_ICON");
    expect(trainingViewSource).toContain('isCore ? "CHCG core" : "Client upload"');
    // Reads the resolved arrays (live edits/adds/hides) + the added category/format filters.
    expect(trainingViewSource).toContain("const resourceAssets = useMemo");
    expect(trainingViewSource).toContain("library.data?.chcgAssets");
    expect(trainingViewSource).toContain("categoryFilter === \"all\" || asset.category === categoryFilter");
    expect(trainingViewSource).toContain("formatFilter === \"all\" || asset.format === formatFilter");
    // The card maps to the resolved asset list and opens the course-detail launcher.
    expect(trainingViewSource).toContain("resourceAssets.map((asset: any) => (");
    expect(trainingViewSource).toContain("<LibraryAssetCard");
    // The dormant grouping helper was retired.
    expect(trainingViewSource).not.toContain("groupAssetsByTargetDemographic");
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
    expect(trainingViewSource).toContain("Success sound on");
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
    const slideIndex = trainingViewSource.indexOf("{activeInteractiveVisual && trainingWorkspacePage === \"lesson\" && currentStage?.id !== \"practice\" ? (");
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

  it("builds practice recall cards from Q&A — front=prompt, back=answer+rationale, bullets=rationales (FLASH2)", () => {
    const cards = buildPracticeRecallCards(
      [
        { id: "q1", prompt: "Which opening shows strong listening?", correctOptionId: "o2", successFeedback: "Yes", failureFeedback: "No",
          options: [{ id: "o1", label: "Explain first", rationale: "Too fast." }, { id: "o2", label: "Acknowledge then own", rationale: "Names the concern." }] },
        { id: "q2", prompt: "What proves transfer?", correctOptionId: "oa", successFeedback: "Yes", failureFeedback: "No",
          options: [{ id: "oa", label: "Behavior in live work", rationale: "Observable change." }, { id: "ob", label: "A high score", rationale: "Not enough." }] },
      ],
      [],
    );
    expect(cards).toHaveLength(2);
    expect(cards[0].title).toBe("Which opening shows strong listening?");
    expect(cards[0].backNarrative).toBe("Answer: Acknowledge then own — Names the concern.");
    expect(cards[0].bullets).toEqual(["Too fast.", "Names the concern."]);
  });

  it("falls back to practice-slide bullets when a module's Q&A is thin (FLASH2)", () => {
    const cards = buildPracticeRecallCards(
      [{ id: "q1", prompt: "only one", successFeedback: "", failureFeedback: "", options: [{ id: "a", label: "A", rationale: "r" }] }],
      [{ id: "s1", title: "Decode the scenario", narrative: "Read the signal.", bullets: ["Emotional signal", "Operational signal"] }],
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("s1");
    expect(cards[0].title).toBe("Decode the scenario");
    expect(cards[0].bullets).toEqual(["Emotional signal", "Operational signal"]);
  });

  it("nextUnknownIndex skips known cards cyclically so Review-again cards re-queue (FLASH2)", () => {
    expect(nextUnknownIndex(["known", "review", "known", "unseen"], 0)).toBe(1);
    expect(nextUnknownIndex(["known", "review", "known", "unseen"], 1)).toBe(3);
    expect(nextUnknownIndex(["known", "review", "known", "unseen"], 3)).toBe(1); // wrap, skip the known cards
    expect(nextUnknownIndex(["known", "known"], 0)).toBe(0); // all known → stay (completion)
  });

  it("surfaces the recall session only on Practice; Learn + Library decks pass no recall props (FLASH2)", () => {
    // Recall UI is gated on both handlers being present.
    expect(trainingViewSource).toContain("const recallMode = Boolean(onGotIt && onReviewAgain)");
    // Only the practice session supplies the recall handlers — the Learn lesson deck and the
    // Library preview deck are therefore unchanged.
    expect((trainingViewSource.match(/onGotIt=\{/g) ?? []).length).toBe(1);
    expect(trainingViewSource).toContain("<PracticeRecallSession items={practiceRecallCards} theme=\"dark\" />");
    expect(trainingViewSource).toContain("items={lessonBriefFlashCards}");
    expect(trainingViewSource).toContain("items={selectedAssetBriefCards}");
    // The recall deck stands alone on Practice — the slide-image viewer is suppressed there.
    expect(trainingViewSource).toContain("trainingWorkspacePage === \"lesson\" && currentStage?.id !== \"practice\"");
  });

  it("selectMissedQuestions returns only the questions the learner got wrong (QUIZ2)", () => {
    const questions = [
      { id: "q1", prompt: "Q1", correctOptionId: "a", options: [{ id: "a", label: "A", rationale: "ra" }, { id: "b", label: "B", rationale: "rb" }] },
      { id: "q2", prompt: "Q2", correctOptionId: "a", options: [{ id: "a", label: "A", rationale: "ra" }, { id: "b", label: "B", rationale: "rb" }] },
      { id: "q3", prompt: "Q3", correctOptionId: "a", options: [{ id: "a", label: "A", rationale: "ra" }, { id: "b", label: "B", rationale: "rb" }] },
      { id: "q4", type: "short_answer", acceptedAnswers: ["verify the evidence"] },
    ];
    const answers = { q1: "b", q2: "a", q3: "b", q4: "guessing" }; // q1, q3, q4 wrong; q2 right
    const missed = selectMissedQuestions(questions, answers);
    expect(missed.map((q: any) => q.id)).toEqual(["q1", "q3", "q4"]);
    // The "Review your misses" recall deck is built from exactly those — MC only (short-answer q4 dropped).
    const cards = buildPracticeRecallCards(missed, []);
    expect(cards.map((c) => c.id)).toEqual(["q1", "q3"]);
  });

  it("orderQuestionsMissedFirst floats missed questions first, stable within groups (QUIZ2)", () => {
    const questions = [
      { id: "q1", correctOptionId: "a" }, // right
      { id: "q2", correctOptionId: "a" }, // wrong
      { id: "q3", correctOptionId: "a" }, // right
      { id: "q4", correctOptionId: "a" }, // wrong
    ];
    const answers = { q1: "a", q2: "b", q3: "a", q4: "b" };
    expect(orderQuestionsMissedFirst(questions, answers).map((q: any) => q.id)).toEqual(["q2", "q4", "q1", "q3"]);
  });

  it("revives AssessmentPanel as the post-submit review with the correct-option highlight (QUIZ2)", () => {
    // Correct option is highlighted green even when the learner didn't pick it (the one gap).
    expect(trainingViewSource).toContain("border-emerald-400/40 bg-emerald-400/8 ring-1 ring-emerald-300/30");
    expect(trainingViewSource).toContain("Correct answer");
    // Review wiring inside the shell: missed-first AssessmentPanel + score/threshold + miss count.
    expect(trainingViewSource).toContain("reviewMode");
    expect(trainingViewSource).toContain("<AssessmentPanel");
    expect(trainingViewSource).toContain("You missed ${missedQuestions.length} of ${questions.length}");
    // The recall launcher feeds only the missed questions into the FLASH2 session.
    expect(trainingViewSource).toContain("selectMissedQuestions(questions, answers)");
    expect(trainingViewSource).toContain("<PracticeRecallSession items={missedRecallCards} theme=\"dark\" />");
  });

  it("renders the post-submit review inside a bounded focused pop box, taker unchanged (QUIZ3)", () => {
    // Results live in a Dialog that auto-opens on submit; a "View results" reopen stays on the page.
    expect(trainingViewSource).toContain("const [resultsOpen, setResultsOpen] = useState(false)");
    expect(trainingViewSource).toContain("if (submitted) {\n      setResultsOpen(true);");
    expect(trainingViewSource).toContain("View results");
    // Bounded box: max-h-[80vh], flex column, sticky shrink-0 header + scrolling flex-1 body.
    expect(trainingViewSource).toContain("flex max-h-[80vh] flex-col gap-0 overflow-hidden");
    expect(trainingViewSource).toContain('<DialogHeader className="shrink-0');
    expect(trainingViewSource).toContain('<div className="min-h-0 flex-1 overflow-y-auto p-5">');
    // The misses recall swaps the dialog body in-box (Back to results), no second overlay.
    expect(trainingViewSource).toContain("Back to results");
    expect(trainingViewSource).toContain("<PracticeRecallSession items={missedRecallCards} theme=\"dark\" />");
    // The one-question-at-a-time taker still posts via Submit response.
    expect(trainingViewSource).toContain("Submit response");
  });

  it("clears the colored-on-light contrast failures to AA, single-sourced (POLISH1)", () => {
    // StatusBadge is surface-aware: dark (default) keeps the translucent chips exactly as
    // shipped; light uses opaque semantic pills. Both tone sets are present.
    expect(trainingViewSource).toContain('surface = "dark" }: { value: string; surface?: "light" | "dark" }');
    expect(trainingViewSource).toContain("border-amber-500/30 bg-amber-500/12 text-amber-300"); // dark, unchanged
    expect(trainingViewSource).toContain("border-amber-600/30 bg-amber-100 text-amber-800"); // light opaque
    expect(trainingViewSource).toContain("border-emerald-600/25 bg-emerald-100 text-emerald-800");
    // Only the light coach thread list opts into the opaque pills.
    expect(trainingViewSource).toContain('<StatusBadge value={session.status} surface="light" />');
    // Gold action-card eyebrow darkened within the gold palette.
    expect(trainingViewSource).toContain('accent === "gold" ? "text-[#7A5200]"');
    expect(trainingViewSource).not.toContain('text-[#9A6700]');
    // Workspace/section eyebrow slate darkened to the AA secondary-on-light token everywhere.
    expect(trainingViewSource).not.toContain("text-[#6B7E8A]");
  });

  it("wires the Reporting Hub export menu + three exporters, print layout renders the key fields (REPORT2)", () => {
    const reportingPrint = readFileSync(join(process.cwd(), "client/src/components/ReportingPrintLayout.tsx"), "utf8");
    const reportingExport = readFileSync(join(process.cwd(), "client/src/lib/reportingExport.ts"), "utf8");
    // Export menu in the SectionShell actions + the three handlers.
    expect(trainingViewSource).toContain("const handleExportPdf = () => window.print()");
    expect(trainingViewSource).toContain('downloadBlob(blob, "reporting-export.xlsx")');
    expect(trainingViewSource).toContain("copyReportingEmailSummary(query.data)");
    expect(trainingViewSource).toContain("PDF exec summary");
    expect(trainingViewSource).toContain("XLSX spreadsheet");
    expect(trainingViewSource).toContain("Email summary");
    expect(trainingViewSource).toContain("<ReportingPrintLayout data={query.data} />");
    // Intervention confidence is data-sourced (no hardcoded "High" literal left in the card).
    expect(trainingViewSource).toContain("data.interventionConfidence.value");
    expect(trainingViewSource).not.toContain('label="Intervention confidence" value="High"');
    // XLSX via exceljs, one sheet per table; email via the clipboard.
    expect(reportingExport).toContain('import ExcelJS from "exceljs"');
    expect(reportingExport).toContain('workbook.addWorksheet("Summary")');
    for (const sheet of ["ROI trend", "Correlation", "Team readiness", "Question risk", "Lifecycle", "Peer benchmarks", "Repeat escalations", "Coaching cadence", "Error rate"]) {
      expect(reportingExport).toContain(`"${sheet}"`);
    }
    expect(reportingExport).toContain("navigator.clipboard");
    // Print layout (hidden on screen) renders the key fields + charts.
    expect(reportingPrint).toContain("data-reporting-print");
    expect(reportingPrint).toContain("reportingOverview?.headline");
    expect(reportingPrint).toContain("proofOfImpact?.headline");
    expect(reportingPrint).toContain("reportingOverview?.summaryCards");
    expect(reportingPrint).toContain("data.readiness?.score");
    expect(reportingPrint).toContain("data.roiMetrics");
    expect(reportingPrint).toContain("proofOfImpact?.beforeAfter");
    expect(reportingPrint).toContain("proofOfImpact?.sustainedReadiness");
    expect(reportingPrint).toContain("data.questionReporting");
  });

  it("wires the shared quiz authoring panel into both admin surfaces and the player (AUTHOR2)", () => {
    const authoringPanel = readFileSync(join(process.cwd(), "client/src/components/ContentAuthoringPanel.tsx"), "utf8");
    // Client Control: a tenant-scoped Authoring tab.
    expect(trainingViewSource).toContain('<TabsTrigger value="authoring"');
    expect(trainingViewSource).toContain('id="admin-authoring-section"');
    expect(trainingViewSource).toContain('<ContentAuthoringPanel scope="tenant" tenantId={data.tenant.id} />');
    // CHCG Command: a core-scoped authoring card.
    expect(trainingViewSource).toContain("Author CHCG core quiz content");
    expect(trainingViewSource).toContain('<ContentAuthoringPanel scope="core" />');
    // Player: the resolved override layer is spliced into the checkpoints.
    expect(trainingViewSource).toContain("previewAuthoringQuiz");
    expect(trainingViewSource).toContain("resolvedQuizModule");
    // The panel routes writes to core vs tenant and edits the full question shape.
    expect(authoringPanel).toContain("previewAuthorQuizTenant");
    expect(authoringPanel).toContain("previewAuthorQuizCore");
    expect(authoringPanel).toContain('scope === "core"');
    for (const field of ["prompt", "correctOptionId", "acceptedAnswers", "successFeedback", "failureFeedback", "passingScore", "passingPercent"]) {
      expect(authoringPanel).toContain(field);
    }
  });

  it("authors all four checkpoints per module through the seam and splices each into the player (AUTHOR3)", () => {
    const authoringPanel = readFileSync(join(process.cwd(), "client/src/components/ContentAuthoringPanel.tsx"), "utf8");
    // Player splices every resolved checkpoint (brief/practice/final/application), not just the apply one.
    expect(trainingViewSource).toContain("resolvedQuizModule.checkpoints");
    expect(trainingViewSource).toContain("checkpointFieldByKey");
    for (const field of ["applicationActivity", "briefCheckpoint", "practiceCheckpoint", "finalQuiz"]) {
      expect(trainingViewSource).toContain(field);
    }
    // Panel exposes a checkpoint picker and threads the checkpoint through writes.
    expect(authoringPanel).toContain("chosenCheckpoint");
    expect(authoringPanel).toContain("setChosenCheckpoint");
    expect(authoringPanel).toContain("checkpoint: chosenCheckpoint");
    expect(authoringPanel).toContain("activeCheckpoint");
    for (const key of ["application", "brief", "practice", "final"]) {
      expect(authoringPanel).toContain(`"${key}"`);
    }
  });

  it("extends the shared panel with a Quizzes|Library selector + a library asset form (LIBRARY2)", () => {
    const authoringPanel = readFileSync(join(process.cwd(), "client/src/components/ContentAuthoringPanel.tsx"), "utf8");
    // Content-type selector + the library sub-panel.
    expect(authoringPanel).toContain("contentType");
    expect(authoringPanel).toContain("setContentType");
    expect(authoringPanel).toContain("function LibraryAuthoring");
    expect(authoringPanel).toContain('<LibraryAuthoring scope={scope} tenantId={tenantId} />');
    // Reads/writes go through the library authoring procedures (mirrors the quiz pairs).
    expect(authoringPanel).toContain("previewAuthoringLibrary");
    expect(authoringPanel).toContain("previewAuthorLibraryTenant");
    expect(authoringPanel).toContain("previewAuthorLibraryCore");
    // Library form fields.
    for (const field of ["title", "summary", "category", "format", "tags", "linkedRoles", "sourceLabel"]) {
      expect(authoringPanel).toContain(field);
    }
    // A tenant can hide a CHCG core asset for itself.
    expect(authoringPanel).toContain("Hide this CHCG asset for this client");
  });

  it("adds Lessons + Briefs editors with scope-aware locking + a shared restore shelf (LESSON3)", () => {
    const authoringPanel = readFileSync(join(process.cwd(), "client/src/components/ContentAuthoringPanel.tsx"), "utf8");
    // Selector gains Lessons + Briefs; both sub-panels are wired in.
    expect(authoringPanel).toContain('["briefs", "Briefs"]');
    expect(authoringPanel).toContain("function LessonAuthoring");
    expect(authoringPanel).toContain("function BriefAuthoring");
    expect(authoringPanel).toContain("<LessonAuthoring scope={scope} tenantId={tenantId} />");
    expect(authoringPanel).toContain("<BriefAuthoring scope={scope} tenantId={tenantId} />");
    // Reads/writes go through the lesson + brief authoring procedures.
    expect(authoringPanel).toContain("previewAuthoringLesson");
    expect(authoringPanel).toContain("previewAuthorLessonTenant");
    expect(authoringPanel).toContain("previewAuthorLessonCore");
    expect(authoringPanel).toContain("previewAuthorBriefTenant");
    expect(authoringPanel).toContain("previewAuthorBriefCore");
    // Scope-aware locking: tenant may only light-patch bullets/coach notes on a core slide.
    expect(authoringPanel).toContain('scope === "tenant" && draft.origin === "core"');
    expect(authoringPanel).toContain("CHCG-owned");
    // Slide→checkpoint hint.
    expect(authoringPanel).toContain("Feeds {hint}");
    // Shared restore affordance (reused by LIBRARY4) + hide-with-undo.
    expect(authoringPanel).toContain("function HiddenItemsShelf");
    expect(authoringPanel).toContain("Slide hidden");
    expect(authoringPanel).toContain('label: "Undo"');
  });
});

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { buildRetrainingHistoryCsv, filterRetrainingHistoryByWindow, type RetrainingHistoryWindow } from "../../../shared/retrainingHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiScorecard, KpiStatusPill } from "@/components/KpiScorecard";
import { getKpiProfile, getKpiScorecard, rollupKpiProfile, kpiStatusLabel } from "../../../shared/kpiScorecards";
import { rankLeaderboard, leaderboardReward, type LeaderboardEntry } from "../../../shared/leaderboardConfig";
import { ContentAuthoringPanel } from "@/components/ContentAuthoringPanel";
import { ReportingPrintLayout } from "@/components/ReportingPrintLayout";
import { buildReportingWorkbookBlob, copyReportingEmailSummary, downloadBlob } from "@/lib/reportingExport";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { buildReminders, type Reminder, type ReminderType } from "../../../shared/reminders";
import { demoNow } from "../../../shared/demoClock";
import { useReminderBadge } from "@/lib/reminderBadge";
import { WorkspaceShell, type WorkspaceStat } from "@/components/WorkspaceShell";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Gauge,
  Layers3,
  Maximize2,
  Minimize2,
  Mic,
  PauseCircle,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Medal,
  Award,
  Gift,
  Pencil,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Mail,
  Volume2,
  VolumeX,
  Users2,
} from "lucide-react";
import type { DemoRole } from "../../../server/demoPlatform";
import { getTrainingPresentation, type TrainingApplicationQuestion } from "../../../shared/trainingContent";
import { filterTrainingRecords } from "../../../shared/trainingDiscovery";
import {
  buildLessonNarrationScript,
  buildSlideInteraction,
  buildTrainingVisualGallery,
  evaluateCoachCheckpointResponse,
  evaluateSlideInteraction,
  getSlideCanvasVisuals,
  type TrainingGalleryVisual,
} from "../../../shared/trainingPlayer";
import { buildGuidedTrainingPlan } from "../../../shared/trainingFlow";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export const learnerWorkspaceCopy = {
  routeSubtitle: "Complete assignments tied to skill opportunities, coaching actions, and readiness progress.",
  assignedReengagementsMetricLabel: "Assigned Re-engagements",
  assignedReengagementsMetricSupporting: "Skill-opportunity actions linked to manager workflows",
  assignedReengagementsCardTitle: "Assigned Re-engagements",
  activeJourneyDescription: "Role-based learning mapped directly to your Skill Opportunities across Service Foundations and Workflow Precision tracks.",
} as const;

type PersistedTrainingProgress = {
  previewScenarioId: string;
  moduleIndex: number;
  stageIndex: number;
  lessonPageIndex: number;
  briefCheckpointAnswers: Record<string, string>;
  briefCheckpointSubmitted: boolean;
  practiceChoice: "coach_first" | "peer_shadow" | null;
  practiceCheckpointAnswers: Record<string, string>;
  practiceCheckpointSubmitted: boolean;
  reflection: string;
  applicationAnswers: Record<string, string>;
  applicationSubmitted: boolean;
  finalQuizAnswers: Record<string, string>;
  finalQuizSubmitted: boolean;
  selectedDeckVisualIndex: number;
  narrationRate: string;
  dismissedQuizTriggerIds: string[];
  completedQuizTriggerIds: string[];
  coachCheckpointNote: string;
  coachCheckpointSubmitted: boolean;
};

type PersistedLearnerFeedbackPreferences = {
  successSoundMuted: boolean;
  reducedMotion: boolean;
};

const TRAINING_PROGRESS_STORAGE_PREFIX = "chcg-enableos-training-progress";
const LEARNER_FEEDBACK_PREFERENCES_STORAGE_PREFIX = "chcg-enableos-learner-feedback";

export function buildLearnerFeedbackPreferencesStorageKey({
  tenantId,
  requestedRoleFilter,
}: {
  tenantId?: string | null;
  requestedRoleFilter?: DemoRole | null;
}) {
  return [
    LEARNER_FEEDBACK_PREFERENCES_STORAGE_PREFIX,
    tenantId ?? "tenantless",
    `role=${requestedRoleFilter ?? "learner"}`,
  ].join(":");
}

export function normalizePersistedLearnerFeedbackPreferences(parsed: Partial<PersistedLearnerFeedbackPreferences>) {
  return {
    successSoundMuted: Boolean(parsed.successSoundMuted),
    reducedMotion: Boolean(parsed.reducedMotion),
  };
}

export function readMotionPreferenceFromMediaQuery() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function loadLearnerFeedbackPreferences(
  storageKey: string,
  fallbackReducedMotion = false,
): PersistedLearnerFeedbackPreferences {
  if (typeof window === "undefined") {
    return {
      successSoundMuted: false,
      reducedMotion: fallbackReducedMotion,
    };
  }

  const savedPreferences = window.localStorage.getItem(storageKey);
  if (!savedPreferences) {
    return {
      successSoundMuted: false,
      reducedMotion: fallbackReducedMotion,
    };
  }

  try {
    return normalizePersistedLearnerFeedbackPreferences(JSON.parse(savedPreferences) as Partial<PersistedLearnerFeedbackPreferences>);
  } catch {
    window.localStorage.removeItem(storageKey);
    return {
      successSoundMuted: false,
      reducedMotion: fallbackReducedMotion,
    };
  }
}

export function persistLearnerFeedbackPreferences(
  storageKey: string,
  preferences: PersistedLearnerFeedbackPreferences,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(preferences));
}

export function getLearnerFeedbackStatusLabel({
  soundMuted,
  reducedMotion,
}: {
  soundMuted: boolean;
  reducedMotion: boolean;
}) {
  return `${soundMuted ? "Sound muted" : "Sound on"} · ${reducedMotion ? "Reduced motion" : "Motion on"}`;
}

export function getLearnerFeedbackStatusClass({
  soundMuted,
  reducedMotion,
  mutedClass,
  activeClass,
}: {
  soundMuted: boolean;
  reducedMotion: boolean;
  mutedClass: string;
  activeClass: string;
}) {
  return soundMuted || reducedMotion ? mutedClass : activeClass;
}

export function getLearnerFeedbackDescription(reducedMotion: boolean) {
  return reducedMotion
    ? "Reduced motion keeps the success state visible while toning down balloons and confetti."
    : "Celebration motion adds balloons and confetti when the learner clears the active knowledge check correctly.";
}

export function getLearnerFeedbackMotionLabel(reducedMotion: boolean) {
  return reducedMotion ? "Celebration motion reduced" : "Celebration motion on";
}

export function getLearnerFeedbackMotionStatus(reducedMotion: boolean) {
  return reducedMotion ? "Reduced motion" : "Motion ready";
}

export function getLearnerFeedbackMotionIcon(reducedMotion: boolean) {
  return reducedMotion ? PauseCircle : Sparkles;
}

export function clampTrainingProgressIndex(value: number | null | undefined, upperBound: number) {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.max(0, Math.min(numeric, Math.max(upperBound, 0)));
}

export function buildTrainingProgressStorageKey({
  tenantId,
  requestedRoleFilter,
  requestedJourneyId,
  requestedModuleId,
  requestedAssignmentId,
  previewScenarioId,
  requestedFreshStart,
}: {
  tenantId?: string | null;
  requestedRoleFilter?: DemoRole | null;
  requestedJourneyId?: string | null;
  requestedModuleId?: string | null;
  requestedAssignmentId?: string | null;
  previewScenarioId?: string | null;
  requestedFreshStart?: boolean;
}) {
  return [
    TRAINING_PROGRESS_STORAGE_PREFIX,
    tenantId ?? "tenantless",
    `scenario=${previewScenarioId ?? "active"}`,
    `journey=${requestedJourneyId ?? "none"}`,
    `module=${requestedModuleId ?? "none"}`,
    `assignment=${requestedAssignmentId ?? "none"}`,
    `role=${requestedRoleFilter ?? "none"}`,
    `fresh=${requestedFreshStart ? "1" : "0"}`,
  ].join(":");
}

export function normalizePersistedTrainingProgress(
  parsed: Partial<PersistedTrainingProgress>,
  moduleUpperBound: number,
  stageUpperBound: number,
) {
  return {
    moduleIndex: clampTrainingProgressIndex(parsed.moduleIndex, moduleUpperBound),
    stageIndex: clampTrainingProgressIndex(parsed.stageIndex, stageUpperBound),
    lessonPageIndex: Math.max(0, typeof parsed.lessonPageIndex === "number" ? Math.trunc(parsed.lessonPageIndex) : 0),
    briefCheckpointAnswers: parsed.briefCheckpointAnswers ?? {},
    briefCheckpointSubmitted: Boolean(parsed.briefCheckpointSubmitted),
    practiceChoice: parsed.practiceChoice === "coach_first" || parsed.practiceChoice === "peer_shadow" ? parsed.practiceChoice : null,
    practiceCheckpointAnswers: parsed.practiceCheckpointAnswers ?? {},
    practiceCheckpointSubmitted: Boolean(parsed.practiceCheckpointSubmitted),
    reflection: parsed.reflection ?? "",
    applicationAnswers: parsed.applicationAnswers ?? {},
    applicationSubmitted: Boolean(parsed.applicationSubmitted),
    finalQuizAnswers: parsed.finalQuizAnswers ?? {},
    finalQuizSubmitted: Boolean(parsed.finalQuizSubmitted),
    selectedDeckVisualIndex: Math.max(0, typeof parsed.selectedDeckVisualIndex === "number" ? Math.trunc(parsed.selectedDeckVisualIndex) : 0),
    narrationRate: parsed.narrationRate ?? "0.95",
    dismissedQuizTriggerIds: Array.isArray(parsed.dismissedQuizTriggerIds) ? parsed.dismissedQuizTriggerIds : [],
    completedQuizTriggerIds: Array.isArray(parsed.completedQuizTriggerIds) ? parsed.completedQuizTriggerIds : [],
    coachCheckpointNote: parsed.coachCheckpointNote ?? "",
    coachCheckpointSubmitted: Boolean(parsed.coachCheckpointSubmitted),
  };
}

const roleMeta: Record<DemoRole, { title: string; route: string; eyebrow: string; subtitle: string }> = {
  executive: {
    title: "Reporting workspace",
    route: "/reporting",
    eyebrow: "Reporting",
    subtitle: "Review ROI, team readiness, and intervention impact across the tenant.",
  },
  manager: {
    title: "Manager intervention workspace",
    route: "/manager",
    eyebrow: "Manager",
    subtitle: "Review active signals, orchestrate interventions, and govern readiness movement across teams.",
  },
  coach: {
    title: "Coach or supervisor workspace",
    route: "/coach",
    eyebrow: "Coach / Supervisor",
    subtitle: "Run weekly coaching, monitor learner transfer, and connect lesson evidence to live performance follow-through.",
  },
  learner: {
    title: "Learner enablement journey",
    route: "/learner",
    eyebrow: "Learner",
    subtitle: learnerWorkspaceCopy.routeSubtitle,
  },
  client_admin: {
    title: "Client admin control plane",
    route: "/admin",
    eyebrow: "Client Admin",
    subtitle: "Manage white-label branding, tenant boundaries, and role-scoped configuration.",
  },
};

const TRAINING_PREVIEW_BY_ROLE: Partial<Record<DemoRole, string>> = {
  executive: "leadership",
  manager: "workflow",
  coach: "coach-supervision",
  learner: "active",
  client_admin: "active",
};

const TRAINING_ROLE_FILTER_OPTIONS: Array<{ value: DemoRole | "all"; label: string }> = [
  { value: "all", label: "All previews" },
  { value: "executive", label: "Executive" },
  { value: "manager", label: "Manager" },
  { value: "coach", label: "Coach / Supervisor" },
  { value: "learner", label: "Learner" },
  { value: "client_admin", label: "Client admin" },
];

const TRAINING_PREVIEW_IDS_BY_ROLE: Record<DemoRole | "all", string[]> = {
  all: ["active", "workflow", "coach-supervision", "leadership", "performance", "engagement"],
  executive: ["leadership"],
  manager: ["workflow", "performance", "engagement"],
  coach: ["coach-supervision"],
  learner: ["active"],
  client_admin: ["active", "workflow", "coach-supervision", "leadership", "performance", "engagement"],
};

const FORM_INPUT_SURFACE_CLASS = "w-full rounded-2xl border border-white/14 bg-slate-950 px-4 py-3 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] outline-none transition focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-400/12 placeholder:text-slate-400 [color-scheme:dark]";
const READONLY_FORM_INPUT_SURFACE_CLASS = "w-full rounded-2xl border border-white/14 bg-slate-950/88 px-4 py-3 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none [color-scheme:dark]";

function getRoleLabel(role: string) {
  return role === "all" ? "All roles" : role.replaceAll("_", " ");
}

function getWorkspaceRoleLabel(role?: string | null) {
  if (!role) {
    return null;
  }

  if (role in roleMeta) {
    return roleMeta[role as DemoRole].eyebrow;
  }

  if (role === "platform_admin") {
    return "Platform Admin";
  }

  return getRoleLabel(role);
}

export function getLearnerWorkspacePerspectiveNotice(grantRole?: string | null) {
  if (!grantRole || grantRole === "learner") {
    return null;
  }

  const viewerLabel = getWorkspaceRoleLabel(grantRole) ?? "Current role";
  const viewerLane = viewerLabel.toLowerCase();

  return {
    eyebrow: `${viewerLabel} session`,
    title: `You are reviewing the learner experience from the ${viewerLane} lane.`,
    description: `The learner workspace is open, but your signed-in session still belongs to the ${viewerLane}. Keep using the surrounding shell and this banner as the role-context handoff so the perspective change feels intentional instead of abrupt.`,
  };
}

export function filterTrainingPreviewScenariosByRole<T extends { id: string }>(scenarios: T[], roleFilter: DemoRole | "all") {
  if (roleFilter === "all") {
    return scenarios;
  }

  const allowedScenarioIds = new Set(TRAINING_PREVIEW_IDS_BY_ROLE[roleFilter] ?? TRAINING_PREVIEW_IDS_BY_ROLE.all);
  return scenarios.filter((scenario) => allowedScenarioIds.has(scenario.id));
}

export function resolveSelectedAssetWorkflowRoles(linkedRoles: string[]): DemoRole[] {
  const normalizedRoles: DemoRole[] = linkedRoles.includes("all")
    ? TRAINING_ROLE_FILTER_OPTIONS.filter((option) => option.value !== "all").map((option) => option.value as DemoRole)
    : linkedRoles.filter((role): role is DemoRole => role in roleMeta);

  return normalizedRoles.length > 0 ? normalizedRoles : ["learner"];
}

export function resolveDefaultSelectedAssetRole(linkedRoles: string[], preferredRole?: string | null): DemoRole {
  const allowedRoles = resolveSelectedAssetWorkflowRoles(linkedRoles);

  if (preferredRole && preferredRole !== "platform_admin" && allowedRoles.includes(preferredRole as DemoRole)) {
    return preferredRole as DemoRole;
  }

  return allowedRoles[0] ?? "learner";
}

export function getOperationalLaunchReadinessBrief(role: DemoRole) {
  const briefs: Record<DemoRole, {
    title: string;
    trainingUse: string;
    workflowOwner: string;
    launchAlignment: string;
    followThrough: string;
    startLabel: string;
  }> = {
    executive: {
      title: "Executive readiness brief",
      trainingUse: "Frame this asset as a leadership signal pack tied to readiness movement, KPI interpretation, and intervention decisions.",
      workflowOwner: "Executive sponsors use it to connect frontline behavior evidence to trend review and investment decisions.",
      launchAlignment: "The handoff should emphasize outcome visibility, business risk, and the decision-quality lens carried into the training preview.",
      followThrough: "Success looks like clearer executive review points, better intervention prioritization, and visible readiness-story continuity.",
      startLabel: "Launch executive preview",
    },
    manager: {
      title: "Manager launch brief",
      trainingUse: "Position this asset as a workflow, calibration, or coaching execution tool that supports active interventions and learner follow-through.",
      workflowOwner: "Managers use it to direct retraining, inspect evidence, and tie the content into current team performance gaps.",
      launchAlignment: "The surrounding copy should speak to coaching cadence, accountability, and the operational lane the manager owns day to day.",
      followThrough: "Success looks like tighter intervention plans, cleaner coaching documentation, and clearer readiness movement across the team.",
      startLabel: "Launch manager preview",
    },
    coach: {
      title: "Coach launch brief",
      trainingUse: "Treat this asset as a live coaching support tool that sharpens observation, rehearsal language, and weekly follow-through.",
      workflowOwner: "Coaches use it to translate lesson evidence into field conversations, checkpoints, and documented learner commitments.",
      launchAlignment: "The handoff should foreground learner transfer, observational prompts, and the exact behavior the coach will reinforce next.",
      followThrough: "Success looks like clearer weekly coaching logs, stronger transfer notes, and tighter coach-to-learner continuity.",
      startLabel: "Launch coach preview",
    },
    learner: {
      title: "Learner launch brief",
      trainingUse: "Present this asset as learner-facing context that makes the next module, practice language, and transfer expectations feel concrete.",
      workflowOwner: "Learners use it to understand what they should practice now, why it matters, and how the content connects to their assigned path.",
      launchAlignment: "The brief should stay simple, specific, and action-oriented so the learner immediately sees the relevant module lens.",
      followThrough: "Success looks like a clearer next step, stronger practice transfer, and less confusion about which training matters right now.",
      startLabel: "Launch learner preview",
    },
    client_admin: {
      title: "Client admin launch brief",
      trainingUse: "Frame this asset as a governed launch artifact that controls who sees the content, how it is labeled, and where it enters the tenant workflow.",
      workflowOwner: "Client admins use it to manage readiness rollout, role scoping, and branded content activation across the workspace.",
      launchAlignment: "The surrounding panels should stress governance, role mapping, and how the asset travels safely into live training routes.",
      followThrough: "Success looks like clean role alignment, safer launch readiness, and visible tenant-specific governance over the training experience.",
      startLabel: "Launch client-admin preview",
    },
  };

  return briefs[role];
}

export function getBriefBoxPages<T>(pages: T[], lessonPageIndex: number) {
  if (pages.length === 0) {
    return {
      currentPage: null,
      previousPage: null,
      nextPage: null,
      boundedIndex: 0,
    };
  }

  const boundedIndex = Math.min(Math.max(lessonPageIndex, 0), pages.length - 1);

  return {
    currentPage: pages[boundedIndex] ?? null,
    previousPage: boundedIndex > 0 ? pages[boundedIndex - 1] ?? null : null,
    nextPage: boundedIndex < pages.length - 1 ? pages[boundedIndex + 1] ?? null : null,
    boundedIndex,
  };
}

export function getBriefCompletionStatus(lessonPageIndex: number, totalPages: number) {
  if (totalPages <= 0) {
    return {
      completedCount: 0,
      totalCount: 0,
      percentComplete: 0,
      statusLabel: "Waiting for brief content",
    };
  }

  const completedCount = Math.min(Math.max(lessonPageIndex + 1, 1), totalPages);
  const percentComplete = Math.round((completedCount / totalPages) * 100);

  return {
    completedCount,
    totalCount: totalPages,
    percentComplete,
    statusLabel: `${completedCount} of ${totalPages} lesson steps complete`,
  };
}

export function getStageNavigatorLabel(stageId?: string | null) {
  return stageId === "brief"
    ? "Focused lesson path"
    : stageId === "practice"
      ? "Practice walkthrough"
      : stageId === "apply"
        ? "Transfer walkthrough"
        : "Reflection checkpoint";
}


export function getModalCheckpointResetKey(trigger?: { id?: string | null; assessmentKey?: string | null } | null) {
  return `${trigger?.id ?? "default"}-${trigger?.assessmentKey ?? "none"}`;
}

type BriefFlashCardItem = {
  id: string;
  eyebrow: string;
  title: string;
  frontSummary: string;
  backNarrative: string;
  bullets?: string[];
  accentLabel?: string;
  supportLabel?: string;
  supportValue?: string;
};

function BriefFlashCardDeck({
  items,
  activeIndex,
  isFlipped,
  onFlip,
  onPrevious,
  onNext,
  onJumpToIndex,
  canGoPrevious,
  canGoNext,
  progressLabel,
  statusLabel,
  completionLabel,
  emptyTitle,
  emptyBody,
  theme = "light",
  cardStatus,
  onGotIt,
  onReviewAgain,
}: {
  items: BriefFlashCardItem[];
  activeIndex: number;
  isFlipped: boolean;
  onFlip: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToIndex?: (index: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  progressLabel: string;
  statusLabel: string;
  completionLabel: string;
  emptyTitle?: string;
  emptyBody?: string;
  theme?: "light" | "dark";
  // Optional active-recall controls (FLASH2). Absent on the Learn lesson deck and
  // the Library preview, which therefore render exactly as before.
  cardStatus?: "unseen" | "known" | "review";
  onGotIt?: () => void;
  onReviewAgain?: () => void;
}) {
  const recallMode = Boolean(onGotIt && onReviewAgain);
  const boundedIndex = items.length > 0 ? Math.min(Math.max(activeIndex, 0), items.length - 1) : 0;
  const activeItem = items[boundedIndex] ?? null;
  const nextItem = items[boundedIndex + 1] ?? null;
  const progressPercent = items.length > 0 ? Math.round(((boundedIndex + 1) / items.length) * 100) : 0;
  const completionReady = items.length > 0 && boundedIndex >= items.length - 1 && isFlipped;
  const themeClasses = theme === "dark"
    ? {
        shell: "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.78))] shadow-[0_24px_60px_rgba(2,6,23,0.32)]",
        face: "border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),rgba(15,23,42,0.98)_58%)] text-white shadow-[0_24px_60px_rgba(2,6,23,0.45)]",
        muted: "text-slate-300",
        subdued: "text-slate-400",
        badge: "border-white/10 bg-white/8 text-slate-100",
        progressTrack: "bg-white/10",
        progressFill: "bg-[linear-gradient(90deg,rgba(34,211,238,0.92),rgba(16,185,129,0.92))]",
        dotIdle: "bg-white/14",
        dotActive: "bg-cyan-300",
        inlinePanel: "border-white/10 bg-white/8",
        control: "border-white/10 bg-white/8 text-slate-100 hover:bg-white/14 hover:text-white",
        jumpChip: "border-white/10 bg-white/6 text-slate-200 hover:bg-white/12 hover:text-white",
        jumpChipActive: "border-cyan-300/40 bg-cyan-300/16 text-white shadow-[0_10px_28px_rgba(34,211,238,0.16)]",
        focus: "focus-visible:ring-cyan-300/40",
      }
    : {
        shell: "border-stone-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,245,244,0.98))] shadow-[0_20px_48px_rgba(148,163,184,0.12)]",
        face: "border-stone-200 bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.38),rgba(255,255,255,0.99)_52%)] text-slate-950 shadow-[0_20px_48px_rgba(148,163,184,0.16)]",
        muted: "text-slate-700",
        subdued: "text-slate-500",
        badge: "border-stone-200 bg-white text-slate-700",
        progressTrack: "bg-stone-200",
        progressFill: "bg-[linear-gradient(90deg,rgba(14,165,233,0.95),rgba(16,185,129,0.88))]",
        dotIdle: "bg-stone-200",
        dotActive: "bg-sky-500",
        inlinePanel: "border-stone-200 bg-stone-50",
        control: "border-stone-300 bg-white text-slate-700 hover:bg-stone-100 hover:text-slate-900",
        jumpChip: "border-stone-200 bg-white text-slate-600 hover:bg-stone-100 hover:text-slate-900",
        jumpChipActive: "border-sky-300 bg-sky-50 text-sky-700 shadow-[0_10px_24px_rgba(14,165,233,0.12)]",
        focus: "focus-visible:ring-sky-300/45",
      };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" && canGoPrevious) {
      event.preventDefault();
      onPrevious();
      return;
    }

    if (event.key === "ArrowRight" && canGoNext) {
      event.preventDefault();
      onNext();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onFlip();
    }
  };

  if (!activeItem) {
    return (
      <div className={`rounded-[1.45rem] border px-5 py-6 ${themeClasses.shell}`}>
        <p className={`text-[11px] uppercase tracking-[0.22em] ${themeClasses.subdued}`}>Flash card queue</p>
        <h5 className={`mt-2 text-base font-semibold ${theme === "dark" ? "text-white" : "text-slate-950"}`}>{emptyTitle ?? "No flash cards loaded"}</h5>
        <p className={`mt-3 text-sm leading-6 ${themeClasses.muted}`}>{emptyBody ?? "Add or select brief content to populate this flash-card sequence."}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-[1.45rem] border px-4 py-4 sm:px-5 sm:py-5 ${themeClasses.shell}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`rounded-full ${themeClasses.badge}`}>{progressLabel}</Badge>
            <Badge className={`rounded-full ${themeClasses.badge}`}>{statusLabel}</Badge>
            {recallMode && cardStatus && cardStatus !== "unseen" ? (
              <Badge className={`rounded-full border ${cardStatus === "known" ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" : "border-amber-300/40 bg-amber-400/15 text-amber-100"}`}>{cardStatus === "known" ? "Got it" : "To review"}</Badge>
            ) : null}
          </div>
          <div className={`h-2 overflow-hidden rounded-full ${themeClasses.progressTrack}`}>
            <div className={`h-full rounded-full transition-[width] duration-300 ease-out ${themeClasses.progressFill}`} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="max-w-sm">
          <p className={`text-[11px] uppercase tracking-[0.22em] ${themeClasses.subdued}`}>{completionReady ? "Deck reviewed" : "Flash card mode"}</p>
          <p className={`mt-2 text-sm leading-6 ${themeClasses.muted}`}>{completionReady ? completionLabel : "Tap, click, or press Enter to flip. Keep the brief, detail, and next-step cue in one compact panel."}</p>
        </div>
      </div>

      <div className="mt-4 [perspective:1600px]">
        <div
          role="button"
          tabIndex={0}
          aria-label={`Flip flash card ${boundedIndex + 1} of ${items.length}`}
          onClick={onFlip}
          onKeyDown={handleKeyDown}
          className={`group relative min-h-[18rem] cursor-pointer rounded-[1.5rem] outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 ${themeClasses.focus} sm:min-h-[20rem]`}
        >
          <div className={`relative min-h-[18rem] transition-transform duration-500 [transform-style:preserve-3d] sm:min-h-[20rem] ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}>
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <div className={`flex h-full min-h-[18rem] flex-col overflow-hidden rounded-[1.5rem] border px-5 py-5 sm:min-h-[20rem] ${themeClasses.face}`}>
                <div className="min-h-0 flex-1 space-y-4 overflow-auto pr-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className={`text-[11px] uppercase tracking-[0.22em] ${themeClasses.subdued}`}>{activeItem.eyebrow}</p>
                      <h5 className="mt-2 text-lg font-semibold leading-7">{activeItem.title}</h5>
                    </div>
                    {activeItem.accentLabel ? <Badge className={`rounded-full ${themeClasses.badge}`}>{activeItem.accentLabel}</Badge> : null}
                  </div>
                  <p className={`text-sm leading-7 ${themeClasses.muted}`}>{activeItem.frontSummary}</p>
                </div>
                <div className={`mt-4 flex flex-wrap items-end justify-between gap-3 rounded-[1.2rem] border px-4 py-3 ${themeClasses.inlinePanel}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${themeClasses.subdued}`}>{activeItem.supportLabel ?? "Up next"}</p>
                    <p className={`mt-1 text-sm font-medium ${theme === "dark" ? "text-white" : "text-slate-950"}`}>{activeItem.supportValue ?? (nextItem?.title ?? "Flip the card for the detailed brief")}</p>
                  </div>
                  <p className={`text-[11px] uppercase tracking-[0.2em] ${themeClasses.subdued}`}>Front side</p>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <div className={`flex h-full min-h-[18rem] flex-col overflow-hidden rounded-[1.5rem] border px-5 py-5 sm:min-h-[20rem] ${themeClasses.face}`}>
                <div className="min-h-0 flex-1 space-y-4 overflow-auto pr-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-2xl">
                      <p className={`text-[11px] uppercase tracking-[0.22em] ${themeClasses.subdued}`}>Detail side</p>
                      <h5 className="mt-2 text-lg font-semibold leading-7">{activeItem.title}</h5>
                    </div>
                    <Badge className={`rounded-full ${themeClasses.badge}`}>{`Card ${boundedIndex + 1} of ${items.length}`}</Badge>
                  </div>
                  <p className={`text-sm leading-7 ${themeClasses.muted}`}>{activeItem.backNarrative}</p>
                  {(activeItem.bullets ?? []).length > 0 ? (
                    <div className="grid gap-2.5">
                      {(activeItem.bullets ?? []).slice(0, 3).map((bullet) => (
                        <div key={`${activeItem.id}-${bullet}`} className={`rounded-[1.15rem] border px-4 py-3 ${themeClasses.inlinePanel}`}>
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${theme === "dark" ? "text-cyan-300" : "text-sky-600"}`} />
                            <p className={`text-sm leading-6 ${themeClasses.muted}`}>{bullet}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border px-4 py-3 ${themeClasses.inlinePanel}`}>
                  <p className={`text-[11px] uppercase tracking-[0.2em] ${themeClasses.subdued}`}>Detail side</p>
                  <p className={`text-xs leading-5 ${themeClasses.muted}`}>{completionReady ? completionLabel : (nextItem ? `Next card · ${nextItem.title}` : "Deck ready for completion")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {items.length > 1 ? (
        <div className={`mt-4 rounded-[1.15rem] border px-3 py-3 ${themeClasses.inlinePanel}`}>
          <div className="flex items-center justify-between gap-3">
            <p className={`text-[11px] uppercase tracking-[0.2em] ${themeClasses.subdued}`}>Jump to card</p>
            <p className={`text-xs ${themeClasses.muted}`}>Use the inline index strip for faster deck navigation.</p>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {items.map((item, index) => (
              <Button
                key={`${item.id}-jump`}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onJumpToIndex?.(index)}
                className={`min-w-[5.75rem] shrink-0 rounded-[1rem] px-3 py-2 text-left transition ${index === boundedIndex ? themeClasses.jumpChipActive : themeClasses.jumpChip}`}
              >
                <span className="block text-[10px] uppercase tracking-[0.18em] opacity-75">Card {index + 1}</span>
                <span className="mt-1 block line-clamp-2 text-xs font-medium leading-5">{item.supportLabel ?? item.eyebrow}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onPrevious} disabled={!canGoPrevious} className={`rounded-full ${themeClasses.control}`}>
            Previous card
          </Button>
          <Button type="button" variant="outline" onClick={onFlip} className={`rounded-full ${themeClasses.control}`}>
            {isFlipped ? "Show front" : "Flip card"}
          </Button>
          <Button type="button" variant="outline" onClick={onNext} disabled={!canGoNext} className={`rounded-full ${themeClasses.control}`}>
            Next card
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            {items.map((item, index) => (
              <span key={item.id} className={`h-2.5 rounded-full transition-all duration-300 ${index === boundedIndex ? `w-8 ${themeClasses.dotActive}` : `w-2.5 ${themeClasses.dotIdle}`}`} />
            ))}
          </div>
          <p className={`flex items-center gap-2 text-xs leading-5 ${themeClasses.muted}`}>
            {completionReady ? <Sparkles className="h-3.5 w-3.5" /> : null}
            {completionReady ? completionLabel : (nextItem ? `Up next · ${nextItem.title}` : statusLabel)}
          </p>
        </div>
      </div>

      {recallMode ? (
        <div className={`mt-4 flex flex-wrap items-center gap-2 rounded-[1.15rem] border px-3 py-3 ${themeClasses.inlinePanel}`}>
          <p className={`mr-auto text-[11px] uppercase tracking-[0.2em] ${themeClasses.subdued}`}>Self-check recall</p>
          <Button type="button" variant="outline" onClick={onReviewAgain} className="rounded-full border-amber-300/45 bg-amber-400/12 text-amber-100 hover:bg-amber-400/20 hover:text-white">
            Review again
          </Button>
          <Button type="button" onClick={onGotIt} className="rounded-full bg-emerald-500 text-white hover:bg-emerald-400">
            Got it
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type RecallStatus = "unseen" | "known" | "review";

// Turn a module's practice-checkpoint + final-quiz questions into recall cards:
// front = prompt, back = correct option label + rationale, bullets = the rationales.
// Falls back to practice-slide bullets when a module's Q&A is thin, so every module
// gets a deck. Pure + exported for unit testing.
export function buildPracticeRecallCards(
  questions: TrainingApplicationQuestion[],
  practiceSlides: { id?: string; title?: string; eyebrow?: string; narrative?: string; bullets?: string[] }[],
): BriefFlashCardItem[] {
  const qaCards = (questions ?? [])
    .filter((question) => (question.options?.length ?? 0) > 0)
    .map((question, index) => {
      const correct = question.options?.find((option) => option.id === question.correctOptionId) ?? question.options?.[0];
      const rationales = (question.options ?? []).map((option) => option.rationale).filter(Boolean);
      return {
        id: question.id ?? `practice-recall-${index}`,
        eyebrow: "Active recall",
        title: question.prompt,
        frontSummary: "Recall the best answer in your own words, then flip to check yourself.",
        backNarrative: correct ? `Answer: ${correct.label}${correct.rationale ? ` — ${correct.rationale}` : ""}` : question.successFeedback,
        bullets: rationales.slice(0, 3),
        accentLabel: "Practice",
        supportLabel: "Recall prompt",
        supportValue: "Say your answer out loud, then flip.",
      } satisfies BriefFlashCardItem;
    });

  // "Thin" = fewer than 2 answerable questions → use the practice slides instead.
  if (qaCards.length >= 2) return qaCards;

  return (practiceSlides ?? []).map((slide, index) => ({
    id: slide.id ?? `practice-slide-${index}`,
    eyebrow: "Active recall",
    title: slide.title ?? `Practice focus ${index + 1}`,
    frontSummary: "Recall the key points for this practice focus, then flip.",
    backNarrative: slide.narrative ?? "Review the supporting detail for this practice focus.",
    bullets: Array.isArray(slide.bullets) ? slide.bullets.slice(0, 3) : [],
    accentLabel: "Practice",
    supportLabel: "Recall prompt",
    supportValue: "Recall the points, then flip.",
  } satisfies BriefFlashCardItem));
}

// Next card whose status isn't "known", cyclically from `from`. This is how a
// "Review again" card naturally re-queues to the end (known cards are skipped on
// each pass). Returns `from` when everything is known. Pure + exported for tests.
export function nextUnknownIndex(statuses: RecallStatus[], from: number): number {
  if (statuses.length === 0) return from;
  for (let step = 1; step <= statuses.length; step++) {
    const position = (from + step) % statuses.length;
    if (statuses[position] !== "known") return position;
  }
  return from;
}

// Active-recall practice session (FLASH2). Owns the session state (status map +
// position) and drives the shared BriefFlashCardDeck with the recall props.
// Ungraded, client-side only — nothing is persisted.
function PracticeRecallSession({ items, theme = "dark" }: { items: BriefFlashCardItem[]; theme?: "light" | "dark" }) {
  const itemsKey = items.map((item) => item.id).join("|");
  const [position, setPosition] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [statusById, setStatusById] = useState<Record<string, RecallStatus>>({});

  // Reset the session when the deck changes (e.g. the learner switches module).
  useEffect(() => {
    setPosition(0);
    setIsFlipped(false);
    setStatusById({});
  }, [itemsKey]);

  const knownCount = items.filter((item) => statusById[item.id] === "known").length;
  const reviewCount = items.filter((item) => statusById[item.id] === "review").length;
  const allKnown = items.length > 0 && knownCount === items.length;
  const current = items[Math.min(position, Math.max(items.length - 1, 0))] ?? null;

  const judge = (verdict: RecallStatus) => {
    if (!current) return;
    const nextStatus = { ...statusById, [current.id]: verdict };
    setStatusById(nextStatus);
    // TODO(FLASH-leaderboard): a future graded variant would record this verdict here
    // (e.g. feed the learner's quiz/training signal via a secure mutation). Intentionally
    // ungraded + client-only for now — nothing is persisted.
    setIsFlipped(false);
    const statuses = items.map((item) => nextStatus[item.id] ?? "unseen");
    setPosition(nextUnknownIndex(statuses, position));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-dark">Active recall · practice</p>
          <p className="mt-1 text-sm font-medium text-white">
            {knownCount} of {items.length} recalled{reviewCount > 0 ? ` · ${reviewCount} to review` : ""}
          </p>
        </div>
        {allKnown ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100">
            <Sparkles className="h-3.5 w-3.5" /> Deck cleared
          </span>
        ) : (
          <span className="text-xs text-slate-400">Flip, then mark “Got it” or “Review again”.</span>
        )}
      </div>

      {allKnown ? (
        <div className="rounded-[1.45rem] border border-emerald-300/30 bg-emerald-400/10 px-5 py-6 text-emerald-50">
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/80">Practice complete</p>
          <h5 className="mt-2 text-base font-semibold text-white">All {items.length} recall cards marked “Got it”.</h5>
          <p className="mt-2 text-sm leading-6 text-emerald-50/90">Ungraded practice — nothing was recorded. Move into the checkpoint when you’re ready, or run the deck again.</p>
          <Button type="button" variant="outline" onClick={() => { setStatusById({}); setPosition(0); setIsFlipped(false); }} className="mt-4 rounded-full border-white/15 bg-white/8 text-white hover:bg-white/14 hover:text-white">
            Restart practice
          </Button>
        </div>
      ) : (
        <BriefFlashCardDeck
          items={items}
          activeIndex={position}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped((value) => !value)}
          onPrevious={() => { setIsFlipped(false); setPosition((p) => Math.max(0, p - 1)); }}
          onNext={() => { setIsFlipped(false); setPosition((p) => Math.min(items.length - 1, p + 1)); }}
          onJumpToIndex={(index) => { setIsFlipped(false); setPosition(index); }}
          canGoPrevious={position > 0}
          canGoNext={position < items.length - 1}
          progressLabel={`Card ${Math.min(position + 1, items.length)} of ${items.length}`}
          statusLabel="Active recall practice"
          completionLabel="All recall cards marked Got it."
          emptyTitle="Practice recall loading"
          emptyBody="Recall cards will populate from this module's checkpoint questions once the content is ready."
          theme={theme}
          cardStatus={current ? (statusById[current.id] ?? "unseen") : "unseen"}
          onGotIt={() => judge("known")}
          onReviewAgain={() => judge("review")}
        />
      )}
    </div>
  );
}

const sectionMissionNarratives: Record<string, {
  focus: string;
  next: string;
  reward: string;
  guide: string;
}> = {
  Mission: {
    focus: "Daily command",
    next: "Open the highest-value workspace and act on the most urgent opportunity first.",
    reward: "Momentum visible",
    guide: "Use this hub as the front door to the operating system rather than a page that forces you to scan everything at once.",
  },
  Executive: {
    focus: "Program proof",
    next: "Review movement, coaching impact, and the strongest risk signal before opening deeper analytics.",
    reward: "ROI visible",
    guide: "Executives should be able to understand the story of performance quickly, then drill into evidence only when needed.",
  },
  Manager: {
    focus: "Intervention queue",
    next: "Select the current learner or case, launch the right action, and keep the rest of the page secondary.",
    reward: "Case control",
    guide: "Managers should work a guided queue and selected detail view instead of scrolling through every signal at once.",
  },
  Coach: {
    focus: "Coaching flow",
    next: "Start with the active learner, review the coaching prompts, and open the pop-up log when ready.",
    reward: "Support active",
    guide: "Coaches need a focused workspace with fast access to evidence, prompts, and documentation tools.",
  },
  Learner: {
    focus: "Next mission",
    next: "Start your assigned retraining, then continue the next module in your journey.",
    reward: "Progress celebrated",
    guide: "Start the assigned retraining, continue the recommended module, then review coaching and evidence.",
  },
  Training: {
    focus: "Checkpoint flow",
    next: "Keep the current lesson stage dominant and move supporting materials into secondary reveal patterns.",
    reward: "Milestones unlocked",
    guide: "Training should feel cinematic and progressive, with clean stage changes and meaningful completion moments.",
  },
  Guide: {
    focus: "Platform orientation",
    next: "Start with the role you own, keep supporting workspaces secondary, and use Documentation as the final evidence record.",
    reward: "Confidence ready",
    guide: "This shared guide should explain where to click first, what each workspace is for, and how teams hand work off cleanly across EnableOS.",
  },
  Client: {
    focus: "Setup progress",
    next: "Surface the most urgent admin action and keep the rest grouped into manageable completion steps.",
    reward: "Control clearer",
    guide: "Administrative work should feel structured and guided instead of sprawling across one long page.",
  },
  Content: {
    focus: "Search and assign",
    next: "Lead with discovery and preview, then open metadata or assignment workflows only when needed.",
    reward: "Content ready",
    guide: "Content tools should feel search-first and preview-friendly rather than list-heavy and difficult to scan.",
  },
  CHCG: {
    focus: "Platform oversight",
    next: "Keep the riskiest system signal or governance item above the fold, with everything else available on demand.",
    reward: "Oversight active",
    guide: "Platform control works best when the most important status is visible immediately and secondary detail stays compact.",
  },
};

function resolveSectionMissionNarrative(eyebrow: string, title: string) {
  const matchingKey = Object.keys(sectionMissionNarratives).find((key) => eyebrow.includes(key) || title.includes(key));

  return matchingKey
    ? sectionMissionNarratives[matchingKey]
    : {
      focus: "Guided workspace",
      next: "Surface the clearest next action first and keep supporting detail in progressive layers.",
      reward: "Momentum ready",
      guide: "This workspace is being redesigned to guide attention, reduce scrolling, and keep users oriented.",
    };
}

function SectionShell({

  eyebrow,
  title,
  description,
  actions,
  children,
  compact = true,
  hideHeader = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
  hideHeader?: boolean;
}) {
  // Workspaces that render their own chrome (WorkspaceShell) suppress the shared
  // header so it isn't drawn twice.
  if (hideHeader) {
    return <>{children}</>;
  }
  const narrative = resolveSectionMissionNarrative(eyebrow, title);
  const usesSlimCoachHeader = compact && (eyebrow === "Coach / Supervisor" || title === "Coach or supervisor workspace");

  if (compact) {
      return (
      <div className="workspace-stack">
        <div className="rounded-[1.75rem] border border-[#1B303C]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,248,250,0.92))] px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-5">
          <div className={`flex flex-col gap-4 ${usesSlimCoachHeader ? "xl:flex-row xl:items-center xl:justify-between" : "xl:flex-row xl:items-end xl:justify-between"}`}>
            <div className={`max-w-4xl ${usesSlimCoachHeader ? "space-y-1.5" : "space-y-2.5"}`}>
              {usesSlimCoachHeader ? (
                <>
                  <h1 className="text-[1.2rem] font-semibold leading-tight tracking-tight text-[#1B303C] sm:text-[1.3rem]">Coach Studio</h1>
                  <p className="max-w-4xl text-sm leading-6 text-[#4A6373]">Select a learner, review status, and open the next coaching task.</p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge variant="outline" className="mission-chip rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]">
                      {eyebrow}
                    </Badge>
                    <span className="command-pill px-3 py-1 text-[11px] font-medium text-[#4A6373]">{narrative.focus}</span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4A6373]">{title}</p>
                    <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-[#1B303C] sm:text-[1.55rem]">{description}</h1>
                    <p className="max-w-3xl text-sm leading-6 text-[#4A6373]">{narrative.next}</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {actions}
            </div>
          </div>
        </div>
        <div className="focus-stack">{children}</div>
      </div>
    );
  }

  return (
    <div className="workspace-stack">
      <div className="mission-hero">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.16fr)_minmax(20rem,0.84fr)] xl:items-start">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="mission-chip rounded-full px-3.5 py-1.5 text-[12px] uppercase tracking-[0.24em]">
                {eyebrow}
              </Badge>
              <span className="command-pill px-3 py-1 text-[12px] font-medium text-[#4A6373]">{narrative.focus}</span>
              <span className="command-pill px-3 py-1 text-[12px] font-medium text-[#4A6373]">{narrative.reward}</span>
              <span className="command-pill px-3 py-1 text-[12px] font-medium text-[#4A6373]">Mascot cue active</span>
            </div>
            <div className="max-w-[54rem] space-y-3 xl:max-w-[60rem]">
              <h1 className="max-w-[16ch] text-[2.35rem] font-semibold leading-[1.04] tracking-tight text-[#1B303C] sm:text-[2.85rem] xl:max-w-[18ch] xl:text-[3rem]">{title}</h1>
              <p className="max-w-[56rem] text-base leading-8 text-[#4A6373] xl:text-[1.04rem]">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              {actions}
              <div className="command-pill px-3 py-1.5 text-[12px] font-medium text-[#1B303C]">Next: {narrative.next}</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="guide-card px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1B303C]/12 bg-white/80 text-lg shadow-[0_14px_30px_rgba(15,23,42,0.08)]">🎈</span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4A6373]">Guide cue</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[#8AA4B4]">Mascot moment</p>
                </div>
              </div>
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[#1B303C]">{narrative.guide}</p>
              <p className="mt-3 text-sm leading-6 text-[#4A6373]">Reward state: {narrative.reward}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="trophy-card px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#4A6373]">Focus</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#1B303C]">{narrative.focus}</p>
              </div>
              <div className="trophy-card px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#4A6373]">Next action</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#1B303C]">{narrative.next}</p>
              </div>
              <div className="trophy-card px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#4A6373]">Reward</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#1B303C]">{narrative.reward}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8AA4B4]">Celebration ready</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="focus-stack">{children}</div>
    </div>
  );
}

function PremiumCard({ className = "", children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return (
    <Card id={id} className={`energy-frame border border-[#1B303C]/10 bg-[linear-gradient(180deg,rgba(27,48,60,0.98),rgba(17,29,37,0.96))] shadow-[0_28px_90px_rgba(27,48,60,0.18)] backdrop-blur-2xl ${className}`}>
      {children}
    </Card>
  );
}

function TenantPicker({
  tenants,
  tenantId,
  setTenantId,
}: {
  tenants: Array<{ id: string; name: string; industry: string }>;
  tenantId: string;
  setTenantId: (value: string) => void;
}) {
  return (
    <Select value={tenantId} onValueChange={setTenantId}>
      <SelectTrigger className="w-[260px] border-[#1B303C]/10 bg-white text-[#1B303C] shadow-sm">
        <SelectValue placeholder="Choose tenant" />
      </SelectTrigger>
      <SelectContent>
        {tenants.map((tenant: any) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name} · {tenant.industry}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MetricCard({
  label,
  value,
  supporting,
  icon,
  onClick,
  actionLabel = "Open view",
}: {
  label: string;
  value: string;
  supporting: string;
  icon: React.ReactNode;
  onClick?: () => void;
  actionLabel?: string;
}) {
  const content = (
    <PremiumCard className={`h-full min-h-[12.6rem] ${onClick ? "cursor-pointer transition duration-200 hover:-translate-y-1 hover:border-cyan-300/22 hover:bg-white/[0.07]" : ""}`}>
      <CardHeader className="space-y-3 pb-1">
        <div className="flex items-start justify-between gap-3">
          <CardDescription className="max-w-[17ch] text-[10px] font-semibold uppercase leading-[1.5] tracking-[0.16em] text-slate-300/82 xl:max-w-[19ch] xl:text-[10.5px]">{label}</CardDescription>
          <div className="reward-ring mt-0.5 shrink-0 rounded-lg border border-cyan-300/16 bg-gradient-to-br from-cyan-300/18 via-sky-400/8 to-violet-400/12 p-1.5 text-slate-100 [&_svg]:h-3 [&_svg]:w-3">{icon}</div>
        </div>
        <CardTitle className="max-w-[9ch] text-[2rem] font-semibold leading-[1.02] text-white xl:text-[2.15rem]">{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="max-w-[22ch] text-[13.5px] leading-6 text-slate-200/82 xl:max-w-[24ch] xl:text-[14px]">{supporting}</p>
        {onClick ? (
          <div className="mt-4 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.16em] text-cyan-100/85">
            <span>{actionLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        ) : null}
      </CardContent>
    </PremiumCard>
  );

  if (!onClick) {
    return content;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className="rounded-[1.8rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
    >
      {content}
    </div>
  );
}


function getWeeklyCoachingVisibilityPresentation(visibility?: string | null) {
  if ((visibility ?? "public") === "private") {
    return {
      label: "Private coaching note",
      summary: "Private stays on file for leadership only and does not notify the learner.",
      badgeClassName: "border-violet-300/30 bg-violet-400/12 text-violet-100",
    };
  }

  return {
    label: "Public coaching log",
    summary: "Public coaching logs route to the learner, coach, and supervisor so everyone sees the same follow-through record.",
    badgeClassName: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
  };
}

function buildWeeklyCoachingShareRecipients(log: {
  id: string;
  employeeEmail: string;
  coachEmail: string;
  supervisorEmail: string;
  managerOfSupervisorEmail?: string | null;
  visibility?: string | null;
}) {
  const visibility = log.visibility ?? "public";
  const recipients = [
    { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },
    { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },
    log.managerOfSupervisorEmail
      ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }
      : null,
  ].filter(Boolean) as { key: string; label: string }[];

  if (visibility === "public") {
    recipients.unshift({ key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` });
  }

  return recipients;
}

function WeeklyCoachingLogDetailDialog({
  entry,
  log,
  open,
  onOpenChange,
}: {
  entry: any | null;
  log: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry || !log) {
    return null;
  }

  const visibilityPresentation = getWeeklyCoachingVisibilityPresentation(log.visibility);
  const recipients = buildWeeklyCoachingShareRecipients(log);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{entry.title ?? `Weekly coaching log · ${log.employeeName}`}</DialogTitle>
          <DialogDescription className="text-slate-400">
            This documentation summary is linked to the exact weekly coaching log recorded for {log.employeeName}. Review the full coaching record, routing list, and learner take-aways without leaving the documentation lane.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl border border-cyan-400/18 bg-cyan-400/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Documentation summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-100">{entry.summary}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Session date</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{log.sessionDate}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Attendance</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{log.attendance}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Coach</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{log.coachName} · {log.coachEmail}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Employee</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{log.employeeName} · {log.employeeEmail}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Follow-up from previous coaching</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{log.followUpFromPrevious}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Coaching comments</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{log.coachingComments}</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">SMART Goal Coaching Commitment</p>
              <p className="mt-2 text-sm leading-6 text-white">{log.smartGoalCommitment}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Additional support</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{log.additionalSupport}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Agent take-aways</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">{log.agentTakeaways || "The learner has not added take-aways yet."}</p>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Visibility and routing</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{visibilityPresentation.summary}</p>
              </div>
              <Badge variant="outline" className={`rounded-full ${visibilityPresentation.badgeClassName}`}>{visibilityPresentation.label}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {recipients.map((recipient) => (
                <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-950/90 text-slate-100">{recipient.label}</Badge>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Attachments</p>
            <CoachingAttachmentList attachments={log.attachments} emptyLabel="No attachments were saved on this coaching log." />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentationEntryDetailDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) {
    return null;
  }

  const sourceLabel = String(entry.sourceType ?? "documentation_stream").replaceAll("_", " ");
  const detailBadges = [
    { key: `${entry.id}-source`, label: `Source · ${sourceLabel}` },
    entry.authoredByRole ? { key: `${entry.id}-author`, label: `Authored by · ${String(entry.authoredByRole).replaceAll("_", " ")}` } : null,
    entry.createdAt ? { key: `${entry.id}-created`, label: `Created · ${String(entry.createdAt)}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{entry.title ?? "Documentation detail"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            This document captures the exact summary, evidence points, and metadata saved in the documentation stream for this record.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {detailBadges.map((badge) => (
              <Badge key={badge.key} variant="outline" className="rounded-full border-white/12 bg-slate-900/90 text-slate-100">{badge.label}</Badge>
            ))}
          </div>
          <div className="rounded-2xl border border-cyan-400/18 bg-cyan-400/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Documentation summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-100">{entry.summary ?? "No summary was captured for this documentation record."}</p>
          </div>
          <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Evidence points</p>
            {Array.isArray(entry.evidencePoints) && entry.evidencePoints.length > 0 ? (
              <div className="mt-3 space-y-2">
                {entry.evidencePoints.map((point: string, index: number) => (
                  <div key={`${entry.id}-evidence-${index}`} className="rounded-xl border border-white/10 bg-slate-950/75 px-3 py-3 text-sm leading-6 text-slate-100">
                    {point}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-300">No additional evidence points were stored for this record.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentationFeed({ entries, weeklyCoachingLogs = [] }: { entries: any[]; weeklyCoachingLogs?: any[] }) {
  const [selectedDocumentationEntryId, setSelectedDocumentationEntryId] = useState<string | null>(null);

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm text-slate-300">
        No documentation feed entries are available for this view yet.
      </div>
    );
  }

  const selectedDocumentationEntry = entries.find((entry: any) => entry.id === selectedDocumentationEntryId) ?? null;
  const selectedWeeklyCoachingLog = selectedDocumentationEntry?.weeklyCoachingLogId
    ? weeklyCoachingLogs.find((log: any) => log.id === selectedDocumentationEntry.weeklyCoachingLogId) ?? null
    : null;
  const selectedEntryUsesCoachingPopup = selectedDocumentationEntry?.sourceType === "coaching_summary" && selectedWeeklyCoachingLog;

  return (
    <>
      <div className="space-y-3">
        {entries.map((entry: any, index: number) => {
          const linkedWeeklyCoachingLog = entry.weeklyCoachingLogId
            ? weeklyCoachingLogs.find((log: any) => log.id === entry.weeklyCoachingLogId) ?? null
            : null;
          const supportsCoachingPopup = entry.sourceType === "coaching_summary" && linkedWeeklyCoachingLog;

          return (
            <button
              key={entry.id ?? `${entry.title ?? "documentation"}-${index}`}
              type="button"
              onClick={() => setSelectedDocumentationEntryId(entry.id)}
              className={`w-full rounded-2xl px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${
                supportsCoachingPopup
                  ? "border border-cyan-400/18 bg-slate-950/55 hover:border-cyan-300/40 hover:bg-slate-900/90"
                  : "border border-white/10 bg-slate-950/55 hover:border-white/20 hover:bg-slate-900/90"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{entry.title ?? entry.label ?? `Documentation item ${index + 1}`}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{entry.owner ?? entry.status ?? "Documentation stream"}</p>
                </div>
                <Badge className={`rounded-full ${
                  supportsCoachingPopup
                    ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                    : "border-white/12 bg-white/8 text-slate-100"
                }`}>
                  {supportsCoachingPopup ? "Open exact coaching log" : "Open document details"}
                </Badge>
              </div>
              {entry.summary ? <p className="mt-3 text-sm leading-6 text-slate-300">{entry.summary}</p> : null}
              <p className={`mt-3 text-xs uppercase tracking-[0.2em] ${supportsCoachingPopup ? "text-cyan-100/80" : "text-slate-400"}`}>
                {supportsCoachingPopup
                  ? "Click to review the full coaching record, recipients, and learner take-aways."
                  : "Click to review the full documentation summary, evidence points, and saved metadata."}
              </p>
            </button>
          );
        })}
      </div>
      <WeeklyCoachingLogDetailDialog
        entry={selectedDocumentationEntry}
        log={selectedWeeklyCoachingLog}
        open={Boolean(selectedEntryUsesCoachingPopup)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDocumentationEntryId(null);
          }
        }}
      />
      <DocumentationEntryDetailDialog
        entry={selectedEntryUsesCoachingPopup ? null : selectedDocumentationEntry}
        open={Boolean(selectedDocumentationEntry && !selectedEntryUsesCoachingPopup)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDocumentationEntryId(null);
          }
        }}
      />
    </>
  );
}

function revealWorkspaceSection(sectionId: string) {
  if (typeof document === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function buildTrainingLaunchPath({
  asset,
  role,
  journeyId,
  moduleId,
  assignmentId,
  freshStart,
}: {
  asset?: any;
  role?: DemoRole;
  journeyId?: string;
  moduleId?: string;
  assignmentId?: string;
  freshStart?: boolean;
}) {
  const params = new URLSearchParams();
  if (asset?.id) params.set("assetId", asset.id);
  if (asset?.title) params.set("assetTitle", asset.title);
  if (role) params.set("role", role);
  if (journeyId) params.set("journeyId", journeyId);
  if (moduleId) params.set("moduleId", moduleId);
  if (assignmentId) params.set("assignmentId", assignmentId);
  if (freshStart) params.set("freshStart", "1");
  return params.toString() ? `/training?${params.toString()}` : "/training";
}

function buildLibraryDetailPath({
  assetId,
  assetTitle,
  role,
  journeyId,
  moduleId,
}: {
  assetId?: string;
  assetTitle?: string;
  role?: DemoRole;
  journeyId?: string;
  moduleId?: string;
}) {
  const params = new URLSearchParams();
  if (assetId) params.set("assetId", assetId);
  if (assetTitle) params.set("assetTitle", assetTitle);
  if (role) params.set("role", role);
  if (journeyId) params.set("journeyId", journeyId);
  if (moduleId) params.set("moduleId", moduleId);
  return params.toString() ? `/library?${params.toString()}` : "/library";
}

type ContentLibraryTrainingTarget = {
  journeyId: string;
  moduleId: string;
  journeyTitle: string;
  moduleTitle: string;
  moduleFormat: string;
  skillFocus: string;
  previewScenarioId: string;
  curriculumStatusLabel: string;
  nextActionLabel: string;
};

type ContentLibraryIngestionSourceType = "Client SOP" | "QA finding" | "Compliance update" | "Program rollout" | "Leadership enablement";
type ContentLibraryCurriculumStatus = "mapped_ready" | "pending_alignment" | "review_only";

const CONTENT_LIBRARY_TRAINING_TARGET_PRESETS: Record<string, Omit<ContentLibraryTrainingTarget, "journeyId">> = {
  "journey-service-foundations": {
    moduleId: "mod-sf-1",
    journeyTitle: "Soft Skills & Customer/Patient Service Foundation",
    moduleTitle: "Active Listening",
    moduleFormat: "Microlearning",
    skillFocus: "Listening precision",
    previewScenarioId: "active",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open Active Listening in the focused player",
  },
  "journey-service-foundations-lf": {
    moduleId: "mod-lfs-1",
    journeyTitle: "Soft Skills & Customer/Patient Service Foundation",
    moduleTitle: "Professional clarity under compliance pressure",
    moduleFormat: "Microlearning",
    skillFocus: "Composure",
    previewScenarioId: "active",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open Professional clarity under compliance pressure in the focused player",
  },
  "journey-service-foundations-hc": {
    moduleId: "mod-hcs-1",
    journeyTitle: "Customer Service Foundations for Digital Care",
    moduleTitle: "Human service language in fast channels",
    moduleFormat: "Microlearning",
    skillFocus: "Tone control",
    previewScenarioId: "active",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open Human service language in fast channels in the focused player",
  },
  "journey-workflow-precision": {
    moduleId: "mod-wp-1",
    journeyTitle: "Quality Assurance Essentials",
    moduleTitle: "Verification and Workflow Accuracy",
    moduleFormat: "Playbook",
    skillFocus: "Process discipline",
    previewScenarioId: "workflow",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open Verification and Workflow Accuracy in the focused player",
  },
  "journey-coach-practice-atlas": {
    moduleId: "mod-rtc-1",
    journeyTitle: "Real Time Coaching",
    moduleTitle: "5 Coaching Pillars",
    moduleFormat: "Playbook",
    skillFocus: "Trust-building and self-discovery",
    previewScenarioId: "coach-supervision",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open 5 Coaching Pillars in the focused player",
  },
  "journey-coach-practice-lf": {
    moduleId: "mod-rtc-1",
    journeyTitle: "Real Time Coaching",
    moduleTitle: "5 Coaching Pillars",
    moduleFormat: "Playbook",
    skillFocus: "Trust-building and self-discovery",
    previewScenarioId: "coach-supervision",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open 5 Coaching Pillars in the focused player",
  },
  "journey-coach-practice-hc": {
    moduleId: "mod-rtc-1",
    journeyTitle: "Real Time Coaching",
    moduleTitle: "5 Coaching Pillars",
    moduleFormat: "Playbook",
    skillFocus: "Trust-building and self-discovery",
    previewScenarioId: "coach-supervision",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open 5 Coaching Pillars in the focused player",
  },
  "journey-data-led-leadership": {
    moduleId: "mod-dl-1",
    journeyTitle: "Unlocking the Power of Data",
    moduleTitle: "Reading and Understanding KPIs",
    moduleFormat: "Playbook",
    skillFocus: "KPI interpretation",
    previewScenarioId: "leadership",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open Reading and Understanding KPIs in the focused player",
  },
  "journey-data-led-leadership-lf": {
    moduleId: "mod-lfd-1",
    journeyTitle: "Unlocking the Power of Data",
    moduleTitle: "Avoiding Pitfalls in Data Analysis",
    moduleFormat: "Microlearning",
    skillFocus: "Bias-aware interpretation",
    previewScenarioId: "leadership",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open Avoiding Pitfalls in Data Analysis in the focused player",
  },
  "journey-performance-leadership-lf": {
    moduleId: "mod-lfp-1",
    journeyTitle: "Utilizing Performance Management to Maximize Results",
    moduleTitle: "The 3 Performance Buckets",
    moduleFormat: "Playbook",
    skillFocus: "Performance segmentation",
    previewScenarioId: "performance",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open The 3 Performance Buckets in the focused player",
  },
  "journey-engagement-systems-hc": {
    moduleId: "mod-hce-1",
    journeyTitle: "Gamification for Remote Teams: Engaging and Empowering Leaders",
    moduleTitle: "Foundations of Engagement and Gamification",
    moduleFormat: "Playbook",
    skillFocus: "Recognition and motivation design",
    previewScenarioId: "engagement",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open Foundations of Engagement and Gamification in the focused player",
  },
  "journey-exec-culture-hc": {
    moduleId: "mod-hcd-1",
    journeyTitle: "Culture Momentum and Readiness Visibility",
    moduleTitle: "Engagement metrics that matter",
    moduleFormat: "Playbook",
    skillFocus: "Engagement measurement",
    previewScenarioId: "leadership",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open Engagement metrics that matter in the focused player",
  },
  "journey-wfm-kpi": {
    moduleId: "mod-wfm-1",
    journeyTitle: "Workforce Management & KPIs",
    moduleTitle: "WFM Foundations and Adherence",
    moduleFormat: "Playbook",
    skillFocus: "Schedule adherence",
    previewScenarioId: "workflow",
    curriculumStatusLabel: "Curriculum preview ready",
    nextActionLabel: "Open WFM Foundations and Adherence in the focused player",
  },
};

const CONTENT_LIBRARY_TRAINING_TARGET_ALIASES: Record<string, string> = {
  "journey-coach-practice": "journey-coach-practice-atlas",
  "journey-performance-leadership": "journey-performance-leadership-lf",
  "journey-engagement-systems": "journey-engagement-systems-hc",
};

const CONTENT_LIBRARY_INGEST_SOURCE_OPTIONS: Array<{ value: ContentLibraryIngestionSourceType; label: string; description: string }> = [
  { value: "Client SOP", label: "Client SOP", description: "Standard operating procedures, scripts, and service guides maintained by the tenant." },
  { value: "QA finding", label: "QA finding", description: "Calibration gaps, audit themes, or recurring quality findings that need retraining support." },
  { value: "Compliance update", label: "Compliance update", description: "Policy changes, documentation updates, or regulatory adjustments that need controlled rollout." },
  { value: "Program rollout", label: "Program rollout", description: "Launch kits, adoption plans, or enablement packages for new workflow releases." },
  { value: "Leadership enablement", label: "Leadership enablement", description: "Manager, coach, or executive materials that support operational oversight and reinforcement." },
];

const CONTENT_LIBRARY_CURRICULUM_STATUS_OPTIONS: Array<{ value: ContentLibraryCurriculumStatus; label: string; detail: string }> = [
  { value: "mapped_ready", label: "Mapped and launch-ready", detail: "The uploaded asset can hand off directly into a focused Training Zone launch." },
  { value: "pending_alignment", label: "Pending curriculum alignment", detail: "The asset has a planned journey and module target but still needs final deck alignment before launch." },
  { value: "review_only", label: "Shelf review only", detail: "The asset should remain reviewable in Training Library without a direct Training Zone handoff yet." },
];

const CONTENT_LIBRARY_INGEST_JOURNEY_OPTIONS = Object.entries(CONTENT_LIBRARY_TRAINING_TARGET_PRESETS).map(([journeyId, preset]) => ({
  journeyId,
  journeyTitle: preset.journeyTitle,
  moduleId: preset.moduleId,
  moduleTitle: preset.moduleTitle,
  previewScenarioId: preset.previewScenarioId,
}));

function normalizeTrainingJourneyKey(journeyId?: string | null) {
  if (!journeyId) {
    return null;
  }

  if (CONTENT_LIBRARY_TRAINING_TARGET_PRESETS[journeyId]) {
    return journeyId;
  }

  if (CONTENT_LIBRARY_TRAINING_TARGET_ALIASES[journeyId]) {
    return CONTENT_LIBRARY_TRAINING_TARGET_ALIASES[journeyId];
  }

  return journeyId;
}

function resolveTrainingTargetByJourneyId(journeyId?: string | null): ContentLibraryTrainingTarget | null {
  if (!journeyId) {
    return null;
  }

  const normalizedJourneyKey = normalizeTrainingJourneyKey(journeyId);
  if (!normalizedJourneyKey) {
    return null;
  }

  const preset = CONTENT_LIBRARY_TRAINING_TARGET_PRESETS[normalizedJourneyKey];
  return preset ? { journeyId: normalizedJourneyKey, ...preset } : null;
}

function resolveContentLibraryPlannedTrainingTarget(asset?: any): ContentLibraryTrainingTarget | null {
  const candidateJourneyIds = [asset?.maintenanceJourneyId, ...(asset?.linkedJourneyIds ?? [])].filter(Boolean) as string[];
  if (!candidateJourneyIds.length) {
    return null;
  }

  return candidateJourneyIds
    .map((journeyId) => resolveTrainingTargetByJourneyId(journeyId))
    .find((target: ContentLibraryTrainingTarget | null): target is ContentLibraryTrainingTarget => Boolean(target)) ?? null;
}

function resolveContentLibraryTrainingTarget(asset?: any): ContentLibraryTrainingTarget | null {
  const plannedTarget = resolveContentLibraryPlannedTrainingTarget(asset);
  if (!plannedTarget) {
    return null;
  }

  if (asset?.sourceKind === "chcg") {
    return plannedTarget;
  }

  if (asset?.curriculumStatus === "pending_alignment" || asset?.curriculumStatus === "review_only") {
    return null;
  }

  return asset?.linkedJourneyIds?.length ? plannedTarget : null;
}

export function buildLearnerWorkspaceReturnPath({
  assignmentId,
  moduleId,
  focus,
  freshStart,
}: {
  assignmentId?: string | null;
  moduleId?: string | null;
  focus?: "priority-retraining" | null;
  freshStart?: boolean;
}) {
  const params = new URLSearchParams();
  if (assignmentId) params.set("completedAssignmentId", assignmentId);
  if (moduleId) params.set("completedModuleId", moduleId);
  if (focus) params.set("focus", focus);
  if (freshStart) params.set("freshStart", "1");
  return params.toString() ? `/learner?${params.toString()}` : "/learner";
}

export function buildLearnerJourneyModulePath({
  activeJourneyId,
  moduleId,
  activeRetrainingAssignment,
  primaryTrainingPath,
  freshStart,
}: {
  activeJourneyId: string;
  moduleId: string;
  activeRetrainingAssignment?: { moduleId: string } | null;
  primaryTrainingPath: string;
  freshStart?: boolean;
}) {
  if (activeRetrainingAssignment && moduleId === activeRetrainingAssignment.moduleId) {
    return primaryTrainingPath;
  }

  return buildTrainingLaunchPath({
    journeyId: activeJourneyId,
    moduleId,
    freshStart,
  });
}

export function buildLearnerInterventionTrainingOptions({
  activeJourneyId,
  learnerModules,
  activeRetrainingAssignment,
  primaryTrainingPath,
  freshStart,
}: {
  activeJourneyId: string;
  learnerModules: any[];
  activeRetrainingAssignment?: {
    id: string;
    moduleId: string;
    moduleTitle: string;
    journeyTitle: string;
    skillFocus: string;
  } | null;
  primaryTrainingPath: string;
  freshStart?: boolean;
}) {
  return [
    ...(activeRetrainingAssignment ? [{
      id: `assignment-${activeRetrainingAssignment.id}`,
      // Dereferenced: the assignment title lives only in the priority strip; reference it here.
      title: "Your assigned retraining",
      subtitle: `${activeRetrainingAssignment.journeyTitle} · Assigned retraining`,
      detail: activeRetrainingAssignment.skillFocus,
      path: primaryTrainingPath,
      moduleId: activeRetrainingAssignment.moduleId,
      isAssigned: true,
    }] : []),
    ...learnerModules.map((module: any) => ({
      id: module.id,
      title: module.title,
      subtitle: `${module.format} · ${module.durationMinutes} min`,
      detail: module.skillFocus,
      path: buildLearnerJourneyModulePath({
        activeJourneyId,
        moduleId: module.id,
        activeRetrainingAssignment,
        primaryTrainingPath,
        freshStart,
      }),
      moduleId: module.id,
      isAssigned: activeRetrainingAssignment?.moduleId === module.id,
    })),
  ].filter((option, index, options) => options.findIndex((candidate) => candidate.moduleId === option.moduleId) === index);
}

function formatDueWindow(dateValue?: string | null) {
  if (!dateValue) {
    return "Due soon";
  }

  const dueAt = new Date(dateValue).getTime();
  if (Number.isNaN(dueAt)) {
    return "Due soon";
  }

  const diffHours = Math.max(1, Math.round((dueAt - Date.now()) / (1000 * 60 * 60)));
  if (diffHours >= 24) {
    const days = Math.max(1, Math.round(diffHours / 24));
    return `Due in ${days} day${days === 1 ? "" : "s"}`;
  }

  return `Due in ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
}

function ChartFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <PremiumCard>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-300/76">{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">{children}</CardContent>
    </PremiumCard>
  );
}

function StatusBadge({ value, surface = "dark" }: { value: string; surface?: "light" | "dark" }) {
  // Surface-aware (POLISH1): dark keeps the translucent chips exactly as shipped
  // (already AA, tuned in the contrast pass); light uses opaque semantic pills so
  // the colored label clears AA on pale cards where the translucent fill washed out.
  const tone = surface === "light"
    ? value === "completed"
      ? "border-emerald-600/25 bg-emerald-100 text-emerald-800"
      : value === "overdue"
        ? "border-rose-600/25 bg-rose-100 text-rose-800"
        : value === "in_progress" || value === "follow_up_due"
          ? "border-amber-600/30 bg-amber-100 text-amber-800"
          : value === "assigned" || value === "pending"
            ? "border-slate-400/40 bg-slate-100 text-slate-700"
            : "border-blue-600/25 bg-blue-100 text-blue-800"
    : value === "completed"
      ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
      : value === "overdue"
        ? "border-rose-500/30 bg-rose-500/12 text-rose-300"
        : value === "in_progress" || value === "follow_up_due"
          ? "border-amber-500/30 bg-amber-500/12 text-amber-300"
          : value === "assigned" || value === "pending"
            ? "border-slate-400/20 bg-slate-400/10 text-slate-200"
            : "border-blue-500/30 bg-blue-500/12 text-blue-300";
  const label = value === "assigned"
    ? "Pending"
    : value === "in_progress"
      ? "In progress"
      : value.replaceAll("_", " ");

  return <Badge className={`rounded-full border ${tone}`}>{label}</Badge>;
}

function RetrainingHistorySection({
  title,
  description,
  assignments,
  emptyLabel = "No past retraining has been completed yet.",
  launchRole,
}: {
  title: string;
  description: string;
  assignments: any[];
  emptyLabel?: string;
  launchRole?: DemoRole;
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <p className="mt-2 text-sm text-slate-300">{description}</p>
        </div>
        <Badge className="rounded-full border-[#FCBC34]/30 bg-[#FCBC34]/18 text-white">{assignments.length} tracked</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {assignments.length ? assignments.map((assignment: any) => (
          <div key={assignment.id} className="rounded-2xl border border-white/10 bg-[#142129] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{assignment.moduleTitle}</p>
                <p className="mt-1 text-sm text-slate-300">{assignment.journeyTitle} · {assignment.skillFocus}</p>
              </div>
              <StatusBadge value={assignment.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              <span>{assignment.completedAt ? `Completed ${new Date(assignment.completedAt).toLocaleString()}` : `Due ${new Date(assignment.dueAt).toLocaleString()}`}</span>
              <span>·</span>
              <span>Assigned by {assignment.requestedByRole}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={buildTrainingLaunchPath({ role: launchRole, journeyId: assignment.journeyId, moduleId: assignment.moduleId, assignmentId: assignment.id })}>
                <Button variant="outline" className="w-full rounded-full border-white/10 bg-white/6 text-white hover:bg-white/12 hover:text-white sm:w-auto">
                  {assignment.status === "completed" ? "Review exact module" : "Open exact assignment"}
                </Button>
              </Link>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#142129] px-4 py-5 text-sm text-slate-400">{emptyLabel}</div>
        )}
      </div>
    </div>
  );
}

function TrainingVisualFrame({ visual, compact = false }: { visual: TrainingGalleryVisual; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showFallback = !visual.imageUrl || imageFailed;

  if (!showFallback) {
    return (
      <img
        src={visual.imageUrl ?? undefined}
        alt={visual.title}
        className="max-h-full w-full object-contain object-center transition duration-300 group-hover:scale-[1.02]"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className={`flex h-full w-full min-h-0 flex-col rounded-[inherit] border border-white/10 bg-[linear-gradient(180deg,rgba(27,48,60,0.96),rgba(20,33,41,0.98))] text-white ${compact ? "p-3" : "p-5"}`}>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-[#FCBC34]/30 bg-[#FCBC34]/15 text-[#FCBC34]">{visual.pageLabel}</Badge>
          <Badge variant="outline" className="rounded-full border-white/10 bg-white/8 text-slate-200">{visual.stageLabel}</Badge>
        </div>
        <div className="min-w-0">
          <p className={`${compact ? "line-clamp-2 text-sm" : "text-xl"} break-words font-semibold tracking-tight text-white`}>{visual.title}</p>
          <p className={`mt-2 break-words ${compact ? "line-clamp-3 text-xs leading-5" : "text-sm leading-6"} text-slate-300`}>{visual.caption}</p>
        </div>
      </div>
      <div className={`mt-4 grid gap-2 ${compact ? "overflow-hidden" : "max-h-[12rem] overflow-y-auto pr-1"}`}>
        {(visual.bullets.length ? visual.bullets : [visual.narrative]).slice(0, compact ? 2 : 3).map((bullet, index) => (
          <div key={`${visual.id}-bullet-${index}`} className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-left text-xs leading-5 text-slate-200 break-words">
            {bullet}
          </div>
        ))}
      </div>
    </div>
  );
}

function GuidanceActionPanel({
  tenantId,
  suggestion,
  catalog,
  assignments,
  actorRole,
  learnerName,
  onUpdated,
}: {
  tenantId: string;
  suggestion: any;
  catalog: any[];
  assignments: any[];
  actorRole: "manager" | "coach";
  learnerName: string;
  onUpdated?: () => void;
}) {
  const guidanceMutation = trpc.demo.secureApplyCoachingGuidance.useMutation({
    onSuccess: () => {
      setOverrideOpen(false);
      onUpdated?.();
    },
  });
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const activeAssignment = assignments[0] ?? null;
  const selectedJourney = useMemo(
    () => catalog.find((journey: any) => journey.id === selectedJourneyId) ?? null,
    [catalog, selectedJourneyId],
  );

  useEffect(() => {
    if (!overrideOpen) {
      return;
    }

    const fallbackJourneyId = selectedJourneyId || catalog[0]?.id || "";
    if (fallbackJourneyId !== selectedJourneyId) {
      setSelectedJourneyId(fallbackJourneyId);
      return;
    }

    const availableModules = catalog.find((journey: any) => journey.id === fallbackJourneyId)?.modules ?? [];
    if (!availableModules.some((module: any) => module.id === selectedModuleId)) {
      setSelectedModuleId(availableModules[0]?.id ?? "");
    }
  }, [catalog, overrideOpen, selectedJourneyId, selectedModuleId]);

  const submitGuidance = async (mode: "approve" | "override") => {
    await guidanceMutation.mutateAsync({
      tenantId,
      suggestionId: suggestion.id,
      approverRole: actorRole,
      journeyId: mode === "override" ? selectedJourneyId : undefined,
      moduleId: mode === "override" ? selectedModuleId : undefined,
    });
  };

  return (
    <PremiumCard>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-white">AI coaching suggestion</CardTitle>
            <CardDescription className="max-w-2xl text-slate-300/80">Explainable rationale with human override and targeted retraining delivery.</CardDescription>
          </div>
          {actorRole !== "manager" ? <Badge className="rounded-full border-white/10 bg-white/8 px-3 py-1 text-slate-200">Override enabled</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[1.75rem] border border-blue-500/20 bg-blue-500/10 p-5">
          <p className="text-base font-semibold leading-7 text-blue-100">{suggestion.summary}</p>
          <p className="mt-3 text-[15px] leading-7 text-slate-100/92">{suggestion.recommendation}</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Why this was suggested</p>
          {suggestion.rationale.map((reason: string) => (
            <div key={reason} className="rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-4 text-[15px] leading-7 text-slate-200">
              {reason}
            </div>
          ))}
        </div>
        {activeAssignment ? (
          <div className="rounded-[1.6rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/75">Live retraining assignment</p>
                <h4 className="mt-2 text-xl font-semibold text-white">{activeAssignment.moduleTitle}</h4>
                <p className="mt-2 text-sm leading-7 text-emerald-50/92">{activeAssignment.status === "completed" ? `${learnerName} completed this targeted retraining from ${activeAssignment.journeyTitle}.` : `${learnerName} is now assigned to ${activeAssignment.journeyTitle} with a ${formatDueWindow(activeAssignment.dueAt).toLowerCase()} deadline.`}</p>
              </div>
              <StatusBadge value={activeAssignment.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={buildTrainingLaunchPath({ journeyId: activeAssignment.journeyId, moduleId: activeAssignment.moduleId, assignmentId: activeAssignment.id })}>
                <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
                  {activeAssignment.status === "completed" ? "Review completed retraining" : "Open assigned retraining"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/8 px-3 py-1 text-slate-100">{activeAssignment.status === "completed" && activeAssignment.completedAt ? `Completed ${new Date(activeAssignment.completedAt).toLocaleString()}` : new Date(activeAssignment.dueAt).toLocaleString()}</Badge>
            </div>
          </div>
        ) : null}
        {actorRole !== "manager" ? (
          <>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void submitGuidance("approve")} disabled={guidanceMutation.isPending} className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
            {guidanceMutation.isPending ? "Sending guidance..." : "Approve guidance"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setOverrideOpen(true)} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
            Override suggestion
          </Button>
        </div>
        <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
          <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Select the retraining assignment</DialogTitle>
              <DialogDescription className="text-slate-400">Choose the overall training first, then the exact module {learnerName} should complete within the next 48 hours.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-200">Overall training</p>
                <Select value={selectedJourneyId} onValueChange={setSelectedJourneyId}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                    <SelectValue placeholder="Select a training" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((journey: any) => (
                      <SelectItem key={journey.id} value={journey.id}>
                        {journey.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-200">Module</p>
                <Select value={selectedModuleId} onValueChange={setSelectedModuleId} disabled={!selectedJourney}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
                    <SelectValue placeholder="Select a module" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedJourney?.modules ?? []).map((module: any) => (
                      <SelectItem key={`${selectedJourney?.id}-${module.id}`} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedJourney && selectedModuleId ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-200">
                {(selectedJourney.modules.find((module: any) => module.id === selectedModuleId)?.skillFocus ?? "Focused retraining")} will be sent to {learnerName} as a required retraining assignment with a 48-hour due window.
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOverrideOpen(false)} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                Cancel
              </Button>
              <Button type="button" onClick={() => void submitGuidance("override")} disabled={!selectedJourneyId || !selectedModuleId || guidanceMutation.isPending} className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
                Send targeted retraining
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </>
        ) : null}
      </CardContent>
    </PremiumCard>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="glass-panel h-36 animate-pulse rounded-3xl border border-white/8 bg-white/6" />
      ))}
    </div>
  );
}

function Surface({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen text-[#1B303C]">
      <div className={`${wide ? "w-full" : "container"} py-6 sm:py-8 xl:py-10`}>
        <div className="mission-shell grid-noise p-2 sm:p-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function normalizeAssessmentInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const ASSESSMENT_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "for",
  "with",
  "in",
  "on",
  "at",
  "by",
  "is",
  "are",
  "be",
  "that",
  "this",
  "it",
  "your",
  "you",
  "their",
  "they",
  "them",
  "will",
  "can",
  "into",
  "from",
  "before",
  "after",
  "next",
  "one",
  "use",
  "show",
]);

function canonicalizeAssessmentToken(token: string) {
  const normalized = token
    .replace(/ing$|ed$|ly$|es$|s$/g, "")
    .replace(/^re/, "")
    .trim();

  const synonymMap: Record<string, string> = {
    concern: "issue",
    issue: "issue",
    problem: "issue",
    customer: "customer",
    patient: "customer",
    member: "customer",
    client: "customer",
    own: "ownership",
    owner: "ownership",
    ownership: "ownership",
    accountable: "ownership",
    reassure: "reassurance",
    reassurance: "reassurance",
    confident: "confidence",
    confidence: "confidence",
    calm: "stability",
    stable: "stability",
    stability: "stability",
    action: "action",
    step: "action",
    followup: "action",
    follow: "action",
    summary: "summarize",
    summarize: "summarize",
    restate: "summarize",
    clarify: "clarify",
    clear: "clarify",
    clarity: "clarify",
    verify: "verify",
    verified: "verify",
    verification: "verify",
    document: "document",
    documentation: "document",
    audit: "document",
  };

  return synonymMap[normalized] ?? normalized;
}

function tokenizeAssessmentPhrase(value: string) {
  return normalizeAssessmentInput(value)
    .split(" ")
    .map(canonicalizeAssessmentToken)
    .filter((token) => token.length > 2 && !ASSESSMENT_STOP_WORDS.has(token));
}

function shortAnswerMatchesCandidate(answer: string, candidate: string) {
  const normalizedAnswer = normalizeAssessmentInput(answer);
  const normalizedCandidate = normalizeAssessmentInput(candidate);

  if (!normalizedAnswer || !normalizedCandidate) {
    return false;
  }

  if (normalizedAnswer.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedAnswer)) {
    return true;
  }

  const answerTokens = Array.from(new Set(tokenizeAssessmentPhrase(answer)));
  const candidateTokens = Array.from(new Set(tokenizeAssessmentPhrase(candidate)));

  if (!answerTokens.length || !candidateTokens.length) {
    return false;
  }

  const overlapCount = candidateTokens.filter((token) => answerTokens.includes(token)).length;
  const overlapRatio = overlapCount / candidateTokens.length;

  return overlapCount >= Math.min(2, candidateTokens.length) && overlapRatio >= 0.6;
}

function hasAssessmentAnswer(question: any, answers: Record<string, string>) {
  return (answers[question.id] ?? "").trim().length > 0;
}

function isAssessmentQuestionCorrect(question: any, answer?: string) {
  if (!answer?.trim()) {
    return false;
  }

  if (question.type === "short_answer") {
    return (question.acceptedAnswers ?? []).some((candidate: string) => shortAnswerMatchesCandidate(answer, candidate));
  }

  return answer === question.correctOptionId;
}

// Post-submit review helpers (QUIZ2), exported + pure for testing.
// Only the questions the learner got wrong (drives the "Review your misses" recall deck).
export function selectMissedQuestions(questions: any[], answers: Record<string, string>): any[] {
  return (questions ?? []).filter((question) => !isAssessmentQuestionCorrect(question, answers[question.id]));
}

// Stable sort that floats missed questions to the top, keeping author order within each group.
export function orderQuestionsMissedFirst<T>(items: T[], answers: Record<string, string>, getQuestion: (item: T) => any = (item) => item): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aMissed = isAssessmentQuestionCorrect(getQuestion(a.item), answers[getQuestion(a.item).id]) ? 1 : 0;
      const bMissed = isAssessmentQuestionCorrect(getQuestion(b.item), answers[getQuestion(b.item).id]) ? 1 : 0;
      return aMissed - bMissed || a.index - b.index;
    })
    .map((entry) => entry.item);
}

export function getAssessmentResultStyles(passed: boolean) {
  return passed
    ? {
      containerClass: "border-emerald-300/35 bg-[linear-gradient(135deg,rgba(6,95,70,0.94),rgba(16,185,129,0.3))] shadow-[0_18px_48px_rgba(5,46,22,0.28)]",
      scoreClass: "text-emerald-50",
      bodyClass: "text-emerald-100",
    }
    : {
      containerClass: "border-rose-300/35 bg-[linear-gradient(135deg,rgba(127,29,29,0.94),rgba(244,63,94,0.3))] shadow-[0_18px_48px_rgba(76,5,25,0.28)]",
      scoreClass: "text-rose-50",
      bodyClass: "text-rose-100",
    };
}

const celebrationPalette = ["#f59e0b", "#10b981", "#38bdf8", "#f472b6", "#fde047", "#c084fc"] as const;

function playCorrectAnswerSuccessSound(audioContextRef: { current: AudioContext | null }) {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) {
    return;
  }

  const context = audioContextRef.current ?? new AudioContextConstructor();
  audioContextRef.current = context;

  if (context.state === "suspended") {
    void context.resume();
  }

  const sequence = [523.25, 659.25, 783.99] as const;
  const startTime = context.currentTime + 0.02;

  sequence.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const noteStart = startTime + index * 0.09;
    const noteDuration = 0.14;

    oscillator.type = index === sequence.length - 1 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gainNode.gain.setValueAtTime(0.0001, noteStart);
    gainNode.gain.exponentialRampToValueAtTime(index === sequence.length - 1 ? 0.035 : 0.025, noteStart + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + noteDuration + 0.02);
  });
}

function CorrectAnswerCelebration({
  active,
  compact = false,
}: {
  active: boolean;
  compact?: boolean;
}) {
  const [burstKey, setBurstKey] = useState(0);
  const wasActiveRef = useRef(false);
  const confettiPieces = useMemo(
    () => Array.from({ length: compact ? 14 : 20 }, (_, index) => ({
      id: `confetti-${index}`,
      left: 6 + ((index * 11) % 88),
      size: compact ? 6 + (index % 3) * 2 : 8 + (index % 4) * 2,
      color: celebrationPalette[index % celebrationPalette.length],
      delay: Number((index * 0.03).toFixed(2)),
      duration: Number((1.55 + (index % 4) * 0.14).toFixed(2)),
      spinDuration: Number((0.85 + (index % 3) * 0.18).toFixed(2)),
      rotation: (index % 2 === 0 ? 1 : -1) * (18 + index * 7),
    })),
    [compact],
  );
  const balloons = useMemo(
    () => Array.from({ length: compact ? 3 : 4 }, (_, index) => ({
      id: `balloon-${index}`,
      left: 14 + index * 20,
      color: celebrationPalette[(index + 1) % celebrationPalette.length],
      delay: Number((0.12 + index * 0.08).toFixed(2)),
      duration: Number((1.45 + index * 0.16).toFixed(2)),
    })),
    [compact],
  );

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      setBurstKey((current) => current + 1);
    }

    wasActiveRef.current = active;
  }, [active]);

  if (!active || burstKey === 0) {
    return null;
  }

  return (
    <div key={burstKey} className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
      <style>{`@keyframes enableos-confetti-fall { 0% { opacity: 0; transform: translate3d(-50%, -18%, 0) rotate(0deg) scale(0.7); } 12% { opacity: 1; } 100% { opacity: 0; transform: translate3d(-50%, 320%, 0) rotate(540deg) scale(1); } } @keyframes enableos-confetti-spin { 0% { filter: saturate(1); } 100% { filter: saturate(1.2); } } @keyframes enableos-balloon-float { 0% { opacity: 0; transform: translate3d(-50%, 18%, 0) scale(0.7); } 12% { opacity: 0.95; } 100% { opacity: 0; transform: translate3d(-50%, -240%, 0) scale(1.05); } }`}</style>
      <div className="absolute inset-0">
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            className="absolute top-[-8%] rounded-full shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
            style={{
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${Math.max(piece.size * 1.9, piece.size + 8)}px`,
              backgroundColor: piece.color,
              opacity: 0,
              animation: `enableos-confetti-fall ${piece.duration}s ${piece.delay}s cubic-bezier(0.18,0.72,0.22,1) forwards, enableos-confetti-spin ${piece.spinDuration}s ${piece.delay}s linear 2`,
              transform: `translate3d(-50%, -18%, 0) rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
        {balloons.map((balloon) => (
          <div
            key={balloon.id}
            className="absolute bottom-[-14%] flex flex-col items-center"
            style={{
              left: `${balloon.left}%`,
              opacity: 0,
              animation: `enableos-balloon-float ${balloon.duration}s ${balloon.delay}s ease-out forwards`,
            }}
          >
            <span
              className="block rounded-full shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
              style={{
                width: compact ? "18px" : "24px",
                height: compact ? "24px" : "32px",
                backgroundColor: balloon.color,
              }}
            />
            <span
              className="mt-1 block w-px rounded-full bg-white/45"
              style={{ height: compact ? "18px" : "24px" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function AssessmentPanel({
  eyebrow,
  assessment,
  answers,
  submitted,
  answeredCount,
  score,
  passed,
  onAnswer,
  onSubmit,
  onRetry,
  disabled,
  accent = "cyan",
  compact = false,
  reviewMode = false,
}: {
  eyebrow: string;
  assessment: any;
  answers: Record<string, string>;
  submitted: boolean;
  answeredCount: number;
  score: number;
  passed: boolean;
  onAnswer: (questionId: string, value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  disabled?: boolean;
  accent?: "cyan" | "emerald" | "amber";
  compact?: boolean;
  // Post-submit review (QUIZ2): order missed questions first, drop the intro + take-quiz
  // footer (the host supplies score/threshold + Retry). The correct-option highlight is on
  // whenever submitted, regardless of this flag.
  reviewMode?: boolean;
}) {
  if (!assessment) {
    return null;
  }

  const accentFrameClass = accent === "emerald"
    ? "border-emerald-400/20 bg-emerald-400/10"
    : accent === "amber"
      ? "border-amber-400/20 bg-amber-400/10"
      : "border-cyan-400/20 bg-cyan-400/10";
  const accentTextClass = accent === "emerald"
    ? "text-emerald-100/80"
    : accent === "amber"
      ? "text-amber-100/80"
      : "text-cyan-100/80";

  const resultStyles = getAssessmentResultStyles(passed);
  const showAssessmentCelebration = submitted && passed;

  // Review mode lists missed questions first; otherwise keep author order. Each entry
  // keeps its ORIGINAL question number for the label.
  const indexedReviewQuestions = (assessment.questions ?? []).map((question: any, questionIndex: number) => ({ question, questionIndex }));
  const orderedReviewQuestions = reviewMode && submitted
    ? orderQuestionsMissedFirst(indexedReviewQuestions, answers, (entry: any) => entry.question)
    : indexedReviewQuestions;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!reviewMode ? (
        <div className={`rounded-[1.6rem] border border-white/10 bg-white/5 ${compact ? "p-4" : "p-5"}`}>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
          <h4 className="mt-2 text-lg font-medium text-white">{assessment.title}</h4>
          <p className="mt-3 text-sm leading-6 text-slate-300">{assessment.objective}</p>
          <div className={`mt-4 rounded-2xl border p-4 ${accentFrameClass}`}>
            <p className="text-sm leading-6 text-slate-100">{assessment.instructions}</p>
            <p className={`mt-2 text-sm ${accentTextClass}`}>
              Passing score: {assessment.passingScore}/{assessment.questions.length}
              {assessment.passingPercent ? ` (${assessment.passingPercent}% required)` : ""}
            </p>
          </div>
        </div>
      ) : null}
      <div className="grid gap-4">
        {orderedReviewQuestions.map(({ question, questionIndex }: { question: any; questionIndex: number }) => {
          const answerValue = answers[question.id] ?? "";
          const questionCorrect = isAssessmentQuestionCorrect(question, answerValue);
          const questionOptions = question.options ?? [];

          return (
            <div key={question.id} className={`relative min-w-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/60 ${compact ? "p-4" : "p-5"}`}>
              <CorrectAnswerCelebration active={submitted && questionCorrect} compact={compact} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">
                  {assessment.style === "kahoot" ? `Quiz question ${questionIndex + 1}` : `Checkpoint question ${questionIndex + 1}`}
                </p>
                {submitted ? (
                  questionCorrect ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
                      <CircleAlert className="h-4 w-4" /> Retry needed
                    </span>
                  )
                ) : null}
              </div>
              <h4 className="mt-3 break-words text-lg font-medium text-white">{question.prompt}</h4>
              {question.type === "short_answer" ? (
                <div className="mt-4 space-y-3">
                  <Textarea
                    value={answerValue}
                    onChange={(event) => onAnswer(question.id, event.target.value)}
                    rows={compact ? 2 : 3}
                    className="w-full rounded-2xl border-white/10 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500"
                    placeholder={question.placeholder ?? "Enter your answer"}
                  />
                  {submitted ? (
                    <div className="space-y-1.5">
                      {/* Short-answer is the fuzzy case: show an accepted exemplar alongside the feedback. */}
                      {question.acceptedAnswers?.length ? (
                        <p className="text-sm leading-6 text-emerald-200/90"><span className="font-medium">Accepted example:</span> “{question.acceptedAnswers[0]}”</p>
                      ) : null}
                      <p className={`text-sm ${questionCorrect ? "text-emerald-300" : "text-rose-300"}`}>
                        {questionCorrect ? question.successFeedback : question.failureFeedback}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {questionOptions.map((option: any) => {
                    const selected = answerValue === option.id;
                    const isCorrect = option.id === question.correctOptionId;
                    // Post-submit: the learner's pick is green/rose, AND the correct option is
                    // highlighted green even when they didn't pick it (the one review gap).
                    const stateClass = submitted
                      ? selected
                        ? isCorrect
                          ? "border-emerald-400/45 bg-emerald-400/12"
                          : "border-rose-400/45 bg-rose-400/12"
                        : isCorrect
                          ? "border-emerald-400/40 bg-emerald-400/8 ring-1 ring-emerald-300/30"
                          : "border-white/10 bg-white/5 opacity-70"
                      : selected
                        ? "border-cyan-400/40 bg-cyan-400/10"
                        : "border-white/10 bg-white/5 hover:bg-white/8";

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onAnswer(question.id, option.id)}
                        className={`min-w-0 overflow-hidden rounded-[1.4rem] border p-4 text-left transition ${stateClass}`}
                      >
                        {submitted && (isCorrect || selected) ? (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {isCorrect ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100"><CheckCircle2 className="h-3 w-3" /> Correct answer</span> : null}
                            {selected ? <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${isCorrect ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100" : "border-rose-300/40 bg-rose-400/15 text-rose-100"}`}>Your pick</span> : null}
                          </div>
                        ) : null}
                        <p className="break-words text-sm font-medium text-white">{option.label}</p>
                        <p className="mt-2 break-words text-sm leading-6 text-slate-300">{option.rationale}</p>
                        {submitted && selected ? (
                          <p className={`mt-3 text-sm ${isCorrect ? "text-emerald-300" : "text-rose-300"}`}>
                            {isCorrect ? question.successFeedback : question.failureFeedback}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!reviewMode ? (
        <div className={`rounded-[1.6rem] border border-white/10 bg-white/5 ${compact ? "p-4" : "p-5"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Assessment status</p>
              <p className="mt-1 text-sm text-slate-300">{answeredCount}/{assessment.questions.length} questions answered.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onRetry}
                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
              >
                Retry
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={answeredCount !== assessment.questions.length || disabled}
                className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-400"
              >
                {assessment.style === "kahoot" ? "Grade quiz" : "Grade checkpoint"}
              </Button>
            </div>
          </div>
          {submitted ? (
            <div className={`relative mt-4 overflow-hidden rounded-2xl border p-4 ${resultStyles.containerClass}`}>
              <CorrectAnswerCelebration active={showAssessmentCelebration} compact={compact} />
              <p className={`text-sm font-medium ${resultStyles.scoreClass}`}>Score: {score}/{assessment.questions.length}</p>
              <p className={`mt-2 text-sm leading-6 ${resultStyles.bodyClass}`}>
                {passed ? assessment.passMessage : assessment.failMessage}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InlineAssessmentShell({
  moduleTitle,
  stageLabel,
  stagePages,
  trigger,
  assessment,
  answers,
  submitted,
  score,
  passed,
  activeQuestionIndex,
  disabled,
  onAnswer,
  onSubmit,
  onRetry,
  onReturn,
}: {
  moduleTitle: string;
  stageLabel: string;
  stagePages: Array<{ id: string; title: string }>;
  trigger: { id: string; label: string; assessmentKey: string } | null;
  assessment: any;
  answers: Record<string, string>;
  submitted: boolean;
  score: number;
  passed: boolean;
  activeQuestionIndex: number;
  disabled?: boolean;
  onAnswer: (questionId: string, value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onReturn: () => void;
}) {
  const questions = assessment?.questions ?? [];
  const boundedQuestionIndex = Math.max(0, Math.min(activeQuestionIndex, Math.max(questions.length - 1, 0)));
  const activeQuestion = questions[boundedQuestionIndex];
  const activeAnswerValue = activeQuestion ? answers[activeQuestion.id] ?? "" : "";
  const currentQuestionAnswered = activeQuestion ? hasAssessmentAnswer(activeQuestion, { [activeQuestion.id]: activeAnswerValue }) : false;
  const activeQuestionCorrect = submitted && activeQuestion ? isAssessmentQuestionCorrect(activeQuestion, activeAnswerValue) : false;
  const successFeedbackActive = activeQuestionCorrect || passed;
  const [successSoundMuted, setSuccessSoundMuted] = useState(false);
  const successAudioContextRef = useRef<AudioContext | null>(null);
  const previousSuccessFeedbackRef = useRef(false);
  const isFinalQuiz = trigger?.assessmentKey === "finalQuiz";
  const title = isFinalQuiz ? "Final Quiz" : assessment?.title ?? "Assessment";
  // Post-submit review (QUIZ2): the missed questions + a recall deck over only those.
  const missedQuestions = submitted ? selectMissedQuestions(questions, answers) : [];
  const missedRecallCards = buildPracticeRecallCards(missedQuestions, []);
  const [reviewingMisses, setReviewingMisses] = useState(false);
  // QUIZ3: the post-submit results + per-question review live in a focused pop box.
  const [resultsOpen, setResultsOpen] = useState(false);
  useEffect(() => {
    // Auto-open the results box on submit; reset both when the attempt resets (retry).
    if (submitted) {
      setResultsOpen(true);
    } else {
      setResultsOpen(false);
      setReviewingMisses(false);
    }
  }, [submitted]);

  useEffect(() => {
    if (successFeedbackActive && !previousSuccessFeedbackRef.current && !successSoundMuted) {
      playCorrectAnswerSuccessSound(successAudioContextRef);
    }

    previousSuccessFeedbackRef.current = successFeedbackActive;
  }, [successFeedbackActive, successSoundMuted]);

  useEffect(() => () => {
    if (successAudioContextRef.current && successAudioContextRef.current.state !== "closed") {
      void successAudioContextRef.current.close();
      successAudioContextRef.current = null;
    }
  }, []);

  if (!trigger || !assessment || !questions.length) {
    return null;
  }

  const outlineEntries = [
    ...stagePages.map((page, index) => ({
      id: page.id,
      label: page.title,
      meta: `${index + 1}`,
      active: false,
      complete: true,
    })),
    {
      id: `${trigger.id}-assessment`,
      label: title,
      meta: `${stagePages.length + 1}`,
      active: true,
      complete: submitted && passed,
    },
  ];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#c9d4af] bg-[#eef4df] shadow-[0_28px_70px_rgba(15,23,42,0.16)]">
      <div className="grid gap-0 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#c9d4af] bg-[#dfe8c5] px-5 py-6 xl:border-b-0 xl:border-r">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#667353]">{stageLabel}</p>
          <h3 className="mt-3 text-lg font-semibold text-[#243018]">{moduleTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[#586648]">The assessment now stays inside the course shell so the learner keeps the same navigation frame while answering each question.</p>
          <div className="mt-5 rounded-[1.4rem] border border-[#c3cfaa] bg-[#f6faec] p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#71805e]">Table of Contents</p>
            <div className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {outlineEntries.map((entry) => (
                <div
                  key={entry.id}
                  className={`rounded-[1.15rem] border px-3 py-2.5 text-sm transition ${entry.active ? "border-[#2b3750] bg-[#2b3750] text-white shadow-[0_12px_28px_rgba(43,55,80,0.24)]" : entry.complete ? "border-[#c5d0ae] bg-[#edf3dc] text-[#4f5e40]" : "border-[#d6dfc0] bg-[#f8fbf1] text-[#5c694d]"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${entry.active ? "border-white/30 bg-white/10 text-white" : entry.complete ? "border-[#9eac87] bg-[#dfe8c9] text-[#3f4d31]" : "border-[#c4d0ab] bg-white text-[#71805e]"}`}>
                      {entry.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : entry.meta}
                    </span>
                    <span className="min-w-0 break-words leading-5">{entry.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.2rem] border border-[#c3cfaa] bg-[#f6faec] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#71805e]">Passing score</p>
              <p className="mt-2 text-sm font-medium text-[#243018]">{assessment.passingScore}/{questions.length}{assessment.passingPercent ? ` (${assessment.passingPercent}% required)` : ""}</p>
            </div>
            <div className="rounded-[1.2rem] border border-[#c3cfaa] bg-[#f6faec] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#71805e]">Question status</p>
              <p className="mt-2 text-sm font-medium text-[#243018]">Question {boundedQuestionIndex + 1} of {questions.length}</p>
            </div>
          </div>
        </aside>
        <div className="bg-[#eef4df] px-6 py-8 lg:px-8 xl:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="space-y-4 text-center">
              <p className="text-center text-[11px] uppercase tracking-[0.3em] text-[#6b7857]">{isFinalQuiz ? "Knowledge validation" : "Knowledge check"}</p>
              <h3 className="text-center text-[2rem] font-semibold tracking-[-0.02em] text-[#243018] sm:text-[2.35rem]">{title}</h3>
              <p className="mx-auto max-w-2xl text-sm leading-6 text-[#586648]">{assessment.instructions}</p>
            </div>
            {!submitted ? (
            <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-[#c3cfaa] bg-[#f6faec] px-4 py-3 text-left">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#71805e]">Assessment type</p>
                <p className="mt-2 text-sm font-medium text-[#243018]">{isFinalQuiz ? "Final quiz" : "Inline checkpoint"}</p>
              </div>
              <div className="rounded-[1.2rem] border border-[#c3cfaa] bg-[#f6faec] px-4 py-3 text-left">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#71805e]">Question progress</p>
                <p className="mt-2 text-sm font-medium text-[#243018]">Question {boundedQuestionIndex + 1} of {questions.length}</p>
              </div>
              <div className="rounded-[1.2rem] border border-[#c3cfaa] bg-[#f6faec] px-4 py-3 text-left">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#71805e]">Passing score</p>
                <p className="mt-2 text-sm font-medium text-[#243018]">{assessment.passingScore}/{questions.length}{assessment.passingPercent ? ` (${assessment.passingPercent}% required)` : ""}</p>
              </div>
            </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {!submitted && !currentQuestionAnswered ? (
                  <div className="w-full rounded-[1.15rem] border border-[#d6debf] bg-white/80 px-4 py-3 text-left text-sm leading-6 text-[#586648] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    Select a response before submitting. Validation now stays inside the EnableOS assessment surface instead of relying on a generic browser prompt.
                  </div>
                ) : null}

              {questions.map((question: any, index: number) => {
                const answered = hasAssessmentAnswer(question, answers);
                const active = index === boundedQuestionIndex;
                return (
                  <span
                    key={question.id}
                    className={`h-2.5 w-2.5 rounded-full transition ${active ? "bg-[#2b3750]" : answered ? "bg-[#7b8b63]" : "bg-[#ccd6b6]"}`}
                  />
                );
              })}
            </div>
            <div className="mt-5 flex flex-col gap-3 rounded-[1.25rem] border border-[#c9d4af] bg-white/75 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#71805e]">Success sound</p>
                <p className="mt-1 text-sm leading-6 text-[#586648]">Play a subtle chime only when the learner clears the active question correctly.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSuccessSoundMuted((current) => !current)}
                className="rounded-full border-[#b9c6a0] bg-[#f6faec] px-4 text-[#243018] hover:bg-[#eef4df]"
              >
                {successSoundMuted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                {successSoundMuted ? "Success sound muted" : "Success sound on"}
              </Button>
            </div>
            </>
            ) : null}
            {!submitted ? (
              <div className="mt-8 rounded-[1.6rem] border border-[#1f2b45] bg-[#26324a] px-5 py-5 shadow-[0_16px_35px_rgba(24,35,57,0.2)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#c5d0ea]">Active prompt</p>
                <p className="mt-3 text-base font-medium leading-7 text-white">{activeQuestion.prompt}</p>
              </div>
            ) : null}
            <div className={`${submitted ? "mt-6 rounded-[1.6rem] border" : "rounded-b-[1.6rem] border-x border-b"} border-[#c9d4af] bg-[#f8fbf1] px-5 py-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:px-6`}>
              {!submitted ? (
                activeQuestion.type === "short_answer" ? (
                <div className="space-y-4">
                  <Textarea
                    value={activeAnswerValue}
                    onChange={(event) => onAnswer(activeQuestion.id, event.target.value)}
                    rows={4}
                    className="min-h-[150px] rounded-[1.2rem] border-[#c4d0ac] bg-white text-[#243018] placeholder:text-[#8a9577]"
                    placeholder={activeQuestion.placeholder ?? "Type your answer"}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {(activeQuestion.options ?? []).map((option: any) => {
                    const selected = activeAnswerValue === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onAnswer(activeQuestion.id, option.id)}
                        className={`w-full rounded-[1.15rem] border px-4 py-3 text-left transition ${selected ? "border-[#2b3750] bg-[#eff3e4] shadow-[0_10px_24px_rgba(43,55,80,0.12)]" : "border-[#d2dbbf] bg-white hover:border-[#b8c4a0] hover:bg-[#fbfcf7]"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-[#2b3750] bg-[#2b3750] text-white" : "border-[#9faf8a] bg-white text-transparent"}`}>
                            <CheckCircle2 className="h-3 w-3" />
                          </span>
                          <span className="break-words text-sm leading-6 text-[#243018]">{option.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
              ) : null}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[#5d694d]">{submitted ? (passed ? "Checkpoint cleared — your results are in the pop box." : "Checkpoint graded — open the results to review your misses.") : "Answer the active question, then submit to keep the learner moving through the lesson."}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {submitted ? (
                    <Button type="button" onClick={() => setResultsOpen(true)} className="rounded-full bg-[#2b3750] px-5 text-white hover:bg-[#222c40]">
                      View results
                    </Button>
                  ) : (
                    <Button type="button" onClick={onSubmit} disabled={!currentQuestionAnswered || disabled} className="rounded-full bg-[#2b3750] px-5 text-white hover:bg-[#222c40] disabled:bg-[#b9c4a3] disabled:text-[#f6faec]">
                      Submit response
                    </Button>
                  )}
                </div>
              </div>
              {/* QUIZ3: results + per-question review live in a focused, bounded pop box so the
                  page never grows. The misses recall swaps the body inside the same box. */}
              <Dialog open={resultsOpen} onOpenChange={(open) => { setResultsOpen(open); if (!open) setReviewingMisses(false); }}>
                <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden border-white/10 bg-slate-950 p-0 text-slate-100 sm:max-w-3xl">
                  <DialogHeader className="shrink-0 space-y-3 border-b border-white/10 bg-slate-950 p-5 text-left">
                    {reviewingMisses ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <DialogTitle className="text-white">Review your misses · {missedRecallCards.length} card{missedRecallCards.length === 1 ? "" : "s"}</DialogTitle>
                        <Button type="button" variant="outline" onClick={() => setReviewingMisses(false)} className="rounded-full border-white/20 bg-white/10 px-4 text-white hover:bg-white/16 hover:text-white">Back to results</Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <DialogTitle className="flex items-center gap-2 text-white">
                            {passed ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <CircleAlert className="h-5 w-5 text-rose-300" />}
                            {passed ? "Checkpoint cleared" : "Retry required"}
                          </DialogTitle>
                          <Badge className={`rounded-full ${passed ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" : "border-rose-400/40 bg-rose-500/15 text-rose-100"}`}>Score {score}/{questions.length} · {assessment.passingPercent ? `${assessment.passingPercent}% to pass` : `${assessment.passingScore} to pass`}</Badge>
                        </div>
                        <DialogDescription className={passed ? "text-emerald-100/90" : "text-rose-100/90"}>{passed ? assessment.passMessage : assessment.failMessage}</DialogDescription>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className={`mr-auto text-sm ${missedQuestions.length > 0 ? "text-slate-300" : "text-emerald-200"}`}>{missedQuestions.length > 0 ? `You missed ${missedQuestions.length} of ${questions.length}.` : `Clean sweep — all ${questions.length} correct.`}</p>
                          {passed ? (
                            <Button type="button" onClick={onReturn} className="rounded-full bg-emerald-500 text-white hover:bg-emerald-400">Continue lesson</Button>
                          ) : (
                            <Button type="button" onClick={onRetry} className="rounded-full border border-white/15 bg-white/8 text-white hover:bg-white/14 hover:text-white">Retry quiz</Button>
                          )}
                          {missedRecallCards.length > 0 ? (
                            <Button type="button" onClick={() => setReviewingMisses(true)} className="rounded-full bg-[#FCBC34] text-slate-950 hover:bg-[#ffd56d]">Review your misses</Button>
                          ) : null}
                        </div>
                      </>
                    )}
                  </DialogHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {reviewingMisses ? (
                      // Reuses the FLASH2 recall session over only the missed questions. Ungraded,
                      // client-side only — same coaching/leaderboard seam as FLASH2, not wired.
                      <PracticeRecallSession items={missedRecallCards} theme="dark" />
                    ) : (
                      <AssessmentPanel
                        reviewMode
                        eyebrow="Results review"
                        assessment={assessment}
                        answers={answers}
                        submitted
                        answeredCount={questions.length}
                        score={score}
                        passed={passed}
                        onAnswer={() => {}}
                        onSubmit={() => {}}
                        onRetry={onRetry}
                        accent={isFinalQuiz ? "amber" : "cyan"}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GuideView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const currentRole = access.data?.grant.role ?? "learner";
  const currentRoleLabel = currentRole === "platform_admin"
    ? "Platform admin"
    : currentRole === "client_admin"
      ? "Client admin"
      : currentRole === "executive"
        ? "Executive"
        : currentRole === "manager"
          ? "Manager"
          : currentRole === "coach"
            ? "Coach"
            : "Learner";
  const currentHomeHref = currentRole === "platform_admin"
    ? "/chcg-admin"
    : currentRole === "client_admin"
      ? "/admin"
      : currentRole === "executive"
        ? "/reporting"
        : currentRole === "manager"
          ? "/manager"
          : currentRole === "coach"
            ? "/coach"
            : "/learner";

  const quickStartSteps = [
    {
      title: "Start with your assigned workspace",
      description: "Open the home workspace tied to your role first, review the current queue or lesson, and only then branch into supporting tools.",
    },
    {
      title: "Use shared spaces with purpose",
      description: "Mission Hub, the Guide, Training Zone, and Training Library work best as shared support surfaces, not as substitutes for the role home base.",
    },
    {
      title: "Keep action before documentation",
      description: "Work the intervention, coaching, or learning step first, then capture the final record in Documentation once the action is complete.",
    },
    {
      title: "Hand off with context",
      description: "When a workflow moves to another role, pass along the current signal, next action, and expected follow-up so the next person is not starting cold.",
    },
  ];

  const workspaceMap = [
    {
      title: "Mission Hub",
      audience: "All roles",
      href: "/mission-hub",
      description: "Use the shared launch surface to orient new users, resume cross-role work, and jump into the next workspace without hunting.",
    },
    {
      title: "Reporting Hub",
      audience: "Executive visibility",
      href: "/reporting",
      description: "Review KPI movement, readiness signals, and coaching impact when you need the narrative behind performance change.",
    },
    {
      title: "Manager Ops",
      audience: "Managers and above",
      href: "/manager",
      description: "Work intervention queues, direct-report movement, and accountability follow-through from one action-focused desk.",
    },
    {
      title: "Coach Studio",
      audience: "Coaches and supervisors",
      href: "/coach",
      description: "Run the active coaching session, open the log workflow, and keep coaching evidence connected to the learner journey.",
    },
    {
      title: "Learner Journey",
      audience: "Every learner path",
      href: "/learner",
      description: "Resume assigned re-engagements, complete next-step enablement work, and keep the next required action obvious.",
    },
    {
      title: "Training Zone",
      audience: "Assigned learning",
      href: "/training",
      description: "Open guided lessons, checkpoints, and narrated practice when the user needs a focused learning experience.",
    },
    {
      title: "Training Library",
      audience: "Shared resource library",
      href: "/library",
      description: "Search, preview, and assign supporting content when a team needs the right asset fast.",
    },
    {
      title: "EnableOS Guide",
      audience: "All roles",
      href: "/guide",
      description: "Return here when onboarding new users, refreshing navigation expectations, or aligning cross-role best practices.",
    },
  ];

  const roleGuidance = currentRole === "platform_admin"
    ? "Use the Guide as the common playbook before you send teams into Client Control, CHCG Command, or role-specific workspaces."
    : currentRole === "client_admin"
      ? "Use the Guide to frame tenant setup and then move into Client Control for branding, governance, and access work."
      : currentRole === "executive"
        ? "Use the Guide to orient leaders quickly, then move into Reporting Hub when you need proof of movement and intervention impact."
        : currentRole === "manager"
          ? "Use the Guide to confirm the handoff model, then work Manager Ops for queues, assignments, and follow-through."
          : currentRole === "coach"
            ? "Use the Guide to reinforce how coaching, training, and documentation connect before you open Coach Studio."
            : "Use the Guide to understand where to begin, then return to Learner Journey and Training Zone for assigned work.";

  const bestPractices = [
    {
      title: "Keep the first click simple",
      description: "Every role should know its home workspace. Use the Guide and Mission Hub for orientation, but do the daily work from the role-owned space.",
    },
    {
      title: "Treat shared pages as bridges",
      description: "Guide, Training Zone, and Training Library should support the workflow by adding context, learning, or resources without replacing the operational queue.",
    },
    {
      title: "Capture evidence at the end of the move",
      description: "Documentation should reflect completed coaching, learning, or intervention outcomes rather than becoming the place where work starts.",
    },
    {
      title: "Use role handoffs intentionally",
      description: "Managers, coaches, and learners should pass along the current status, expected next step, and open risk so the next view starts with context.",
    },
  ];

  return (
    <Surface>
      <WorkspaceShell
        title="EnableOS Guide"
        subtitle="Where to start, what each workspace does, and how work should flow across roles."
        actions={(
          <>
            <Button asChild className="rounded-full bg-[#1B303C] px-5 text-white hover:bg-[#13242D]">
              <Link href={currentHomeHref}>Open my workspace</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-[#1B303C]/15 bg-white/80 text-[#1B303C] hover:bg-white">
              <Link href="/mission-hub">Open Mission Hub</Link>
            </Button>
          </>
        )}
      >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-5">
          <Tabs defaultValue="quick-start" className="space-y-4">
            <TabsList className="surface-dark grid w-full grid-cols-3 rounded-[1.2rem] border border-white/10 p-1.5">
              <TabsTrigger value="quick-start" className="rounded-[0.95rem] text-slate-300 hover:text-white data-[state=active]:bg-white/12 data-[state=active]:text-white">Quick start</TabsTrigger>
              <TabsTrigger value="navigation" className="rounded-[0.95rem] text-slate-300 hover:text-white data-[state=active]:bg-white/12 data-[state=active]:text-white">Navigation map</TabsTrigger>
              <TabsTrigger value="best-practices" className="rounded-[0.95rem] text-slate-300 hover:text-white data-[state=active]:bg-white/12 data-[state=active]:text-white">Best practices</TabsTrigger>
            </TabsList>
            <TabsContent value="quick-start" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {quickStartSteps.map((step, index) => (
                  <PremiumCard key={step.title}>
                    <CardHeader className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FCBC34] text-sm font-semibold text-slate-950">0{index + 1}</span>
                        <CardTitle className="text-lg text-white">{step.title}</CardTitle>
                      </div>
                      <CardDescription className="text-sm leading-6 text-slate-300">{step.description}</CardDescription>
                    </CardHeader>
                  </PremiumCard>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="navigation" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {workspaceMap.map((workspace) => (
                  <PremiumCard key={workspace.title}>
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <CardTitle className="text-lg text-white">{workspace.title}</CardTitle>
                          <CardDescription className="text-sm leading-6 text-slate-300">{workspace.description}</CardDescription>
                        </div>
                        <Badge variant="outline" className="rounded-full border-white/12 bg-white/8 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-300">
                          {workspace.audience}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-0 text-sm text-slate-400">
                      <span>{workspace.href}</span>
                      <ArrowRight className="h-4 w-4 text-slate-200" />
                    </CardContent>
                  </PremiumCard>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="best-practices" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {bestPractices.map((practice) => (
                  <PremiumCard key={practice.title}>
                    <CardHeader className="space-y-2.5">
                      <CardTitle className="text-lg text-white">{practice.title}</CardTitle>
                      <CardDescription className="text-sm leading-6 text-slate-300">{practice.description}</CardDescription>
                    </CardHeader>
                  </PremiumCard>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-5">
          <Card className="rounded-[1.5rem] border border-[#1B303C]/10 bg-[linear-gradient(180deg,rgba(27,48,60,0.98),rgba(17,29,37,0.96))] text-white shadow-[0_28px_70px_rgba(27,48,60,0.22)]">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit rounded-full border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/80">
                Current role focus
              </Badge>
              <CardTitle className="text-2xl">{currentRoleLabel}</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-300">{roleGuidance}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Recommended starting point</p>
                <p className="mt-2 text-base font-semibold text-white">Open your home workspace first, then use shared pages when you need orientation, training, or content support.</p>
              </div>
              <div className="space-y-3 rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                <div className="flex items-start gap-3">
                  <Target className="mt-0.5 h-4 w-4 text-white" />
                  <p>Lead with your role's daily work; reach for shared pages only when you need orientation or context.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Users2 className="mt-0.5 h-4 w-4 text-white" />
                  <p>Keep manager, coach, learner, and admin handoffs explicit so each workspace opens with context.</p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-white" />
                  <p>Open the workspace your role is granted for the task in front of you, not whichever page is already open.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Search className="mt-0.5 h-4 w-4 text-white" />
                  <p>Use Training Library and Training Zone when the next step requires assets or guided learning, not when the user needs to find their operational queue.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </WorkspaceShell>
    </Surface>
  );
}

export function LandingView() {
  const landing = trpc.demo.landing.useQuery();
  const viewer = trpc.auth.me.useQuery();
  const viewerAccess = trpc.demo.viewerAccess.useQuery(undefined, { enabled: Boolean(viewer.data) });
  const viewerHomeHref = viewerAccess.data?.grant.role === "platform_admin"
    ? "/chcg-admin"
    : viewerAccess.data?.grant.role === "client_admin"
      ? "/admin"
      : viewerAccess.data?.grant.role === "executive"
        ? "/reporting"
        : viewerAccess.data?.grant.role === "manager"
          ? "/manager"
          : viewerAccess.data?.grant.role === "coach"
            ? "/coach"
            : "/learner";
  const landingMetricHighlights = landing.data?.featuredMetrics ?? [
    { label: "Ready to launch", value: 12 },
    { label: "Due this week", value: 4 },
    { label: "Avg. progress", value: "61%" },
    { label: "In coaching", value: 9 },
  ];
  const workspaceEntryOptions = useMemo(
    () => [
      {
        role: "manager" as DemoRole,
        title: "Manager operations",
        route: "/manager",
        icon: ShieldCheck,
        eyebrow: "Manager",
        subtitle: "Launch intervention tracking, assignment follow-through, and quality movement work.",
      },
      {
        role: "coach" as DemoRole,
        title: "Coach studio",
        route: "/coach",
        icon: Users2,
        eyebrow: "Coach / Supervisor",
        subtitle: "Run coaching cycles, document weekly sessions, and connect evidence back to live performance.",
      },
      {
        role: "learner" as DemoRole,
        title: "Learner journey",
        route: "/learner",
        icon: BookOpen,
        eyebrow: "Learner",
        subtitle: "Continue assigned re-engagements, learning missions, and training completions.",
      },
      {
        role: "client_admin" as DemoRole,
        title: "Client control",
        route: "/admin",
        icon: Building2,
        eyebrow: "Client Admin",
        subtitle: "Manage brand settings, workspace access, and client-level configuration safely.",
      },
    ],
    [],
  );

  return (
    <Surface>
      <div className="workspace-stack">
        <div className="glass-panel overflow-hidden rounded-[2rem] border border-[#1B303C]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,248,250,0.94))] shadow-[0_24px_70px_rgba(27,48,60,0.08)]">
          <div className="grid gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:px-7 lg:py-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="outline" className="mission-chip rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.28em]">
                  EnableOS entry
                </Badge>
                <span className="command-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#4A6373]">Workspace-first login</span>
              </div>
              <div className="max-w-4xl space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4A6373]">Front door</p>
                <h1 className="max-w-[14ch] text-[2.05rem] font-semibold tracking-tight text-[#1B303C] md:text-[2.55rem] md:leading-[1.04] xl:text-[2.9rem]">
                  Choose your workspace.
                </h1>
                <p className="max-w-3xl text-[0.98rem] leading-6 text-[#4A6373]">
                  Start with a simple role choice. Select the workspace that matches your day and the entry flow will take you straight into sign-in before opening the right EnableOS experience.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {landingMetricHighlights.slice(0, 3).map((item: any) => (
                  <div key={item.label} className="rounded-[1.15rem] border border-[#1B303C]/10 bg-white px-4 py-3.5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#4A6373]">{item.label}</p>
                    <p className="mt-2 text-[1.4rem] font-semibold tracking-tight text-[#1B303C]">{String(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-[#1B303C]/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(248,250,252,0.92))] p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4A6373]">Entry status</p>
              {viewerAccess.data ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[#1B303C]">Signed in to {viewerAccess.data.tenant.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[#4A6373]">
                      This account will only open workspaces granted to {viewerAccess.data.permittedRoles.join(", ")}. Use the selector below to continue, or jump directly to your assigned home.
                    </p>
                  </div>
                  <Link href={viewerHomeHref}>
                    <Button className="h-11 w-full rounded-[1.05rem] bg-[#1B303C] px-5 text-white hover:bg-[#243f4d]">
                      Open my assigned workspace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[#1B303C]">Select a workspace, then sign in</p>
                    <p className="mt-2 text-sm leading-6 text-[#4A6373]">
                      Each workspace card below routes into login with the correct return path, so the user lands in the right role context immediately after authentication.
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-[#FCBC34]/24 bg-[linear-gradient(160deg,rgba(255,251,240,0.92),rgba(255,255,255,0.95))] px-4 py-3.5 text-sm leading-6 text-[#4A6373]">
                    After sign-in, access is still limited by tenant mapping and assigned role entitlements.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#1B303C]/8 px-5 py-6 lg:px-7 lg:py-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4A6373]">Workspace selector</p>
                <p className="mt-1 text-sm leading-6 text-[#4A6373]">Keep the front page focused on one decision: choose the workspace, then move into login.</p>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#4A6373]">Four role-based entry points</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {workspaceEntryOptions.map((item) => {
                const Icon = item.icon;
                const canOpenDirectly = viewerAccess.data ? viewerAccess.data.permittedRoles.includes(item.role) : false;

                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => {
                      if (viewer.data) {
                        window.location.href = canOpenDirectly ? item.route : viewerHomeHref;
                        return;
                      }

                      window.location.href = getLoginUrl(item.route);
                    }}
                    className="group flex h-full flex-col rounded-[1.35rem] border border-[#1B303C]/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(245,247,250,0.94))] px-4 py-4 text-left shadow-[0_0_0_rgba(15,23,42,0)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-[#FCBC34]/30 hover:bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(255,248,232,0.96))] hover:shadow-[0_8px_8px_rgba(15,23,42,0.12)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1B303C] text-white shadow-[0_16px_30px_rgba(27,48,60,0.16)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-[#1B303C]/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4A6373]">
                        {item.eyebrow}
                      </span>
                    </div>
                    <div className="mt-5 flex-1 space-y-2">
                      <p className="text-base font-semibold text-[#1B303C]">{item.title}</p>
                      <p className="text-sm leading-6 text-[#4A6373]">{item.subtitle}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#1B303C]/8 pt-4">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4A6373]">
                        {viewer.data ? (canOpenDirectly ? "Open workspace" : "Open assigned workspace") : "Select and sign in"}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#1B303C] transition-transform duration-200 ease-out group-hover:translate-x-[5px]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}


export function MissionHubView() {
  const viewerAccess = trpc.demo.viewerAccess.useQuery();
  const role = viewerAccess.data?.grant.role ?? "learner";
  const tenantName = viewerAccess.data?.tenant.name ?? "your program";
  const missionHubContentByRole: Record<string, {
    title: string;
    activeGoals: string[];
    keyMilestones: string[];
    progress: Array<{ label: string; value: string }>;
  }> = {
    platform_admin: {
      title: "Protect the operating system across every workspace.",
      activeGoals: [
        "Keep governance signals reviewed before client launches.",
        "Confirm tenant-level access and role routing remain correctly scoped.",
        "Surface any evidence gaps before they affect reporting or compliance.",
      ],
      keyMilestones: [
        "Audit the latest admin routing changes.",
        "Approve the next tenant enablement wave.",
        "Close the highest-risk governance exception.",
      ],
      progress: [
        { label: "Governance completion", value: "91%" },
        { label: "Role routing health", value: "Stable" },
        { label: "Urgent platform issues", value: "2" },
      ],
    },
    client_admin: {
      title: "Coordinate brand, access, and client-readiness work.",
      activeGoals: [
        "Confirm white-label configuration is current.",
        "Validate workspace entitlements before the next coaching cycle.",
        "Keep documentation packages ready for client stakeholders.",
      ],
      keyMilestones: [
        "Review client branding updates.",
        "Approve role access changes.",
        "Publish the next documentation package.",
      ],
      progress: [
        { label: "Configuration readiness", value: "88%" },
        { label: "Access review status", value: "In progress" },
        { label: "Pending approvals", value: "3" },
      ],
    },
    executive: {
      title: "Focus the program on lift, proof, and risk.",
      activeGoals: [
        "Close the readiness gap to target.",
        "Review QA movement before expanding intervention volume.",
        "Keep the proof package ready for executive review.",
      ],
      keyMilestones: [
        "Open the trend explorer for current movement.",
        "Review the highest-risk assessment signals.",
        "Approve the white-label documentation package.",
      ],
      progress: [
        { label: "Enterprise readiness", value: "82" },
        { label: "Decision queue", value: "4 pending" },
        { label: "Proof package status", value: "Ready" },
      ],
    },
    manager: {
      title: "Guide interventions, coaching, and follow-through from one desk.",
      activeGoals: [
        "Resolve the highest-severity open signal first.",
        "Move the next coaching follow-up into action.",
        "Confirm retraining completion for direct reports at risk.",
      ],
      keyMilestones: [
        "Open the signal severity feed.",
        "Launch the next coaching-log review.",
        "Confirm the retraining history export is current.",
      ],
      progress: [
        { label: "Open interventions", value: "6" },
        { label: "Coaching follow-ups", value: "4 active" },
        { label: "Direct-report readiness", value: "76" },
      ],
    },
    coach: {
      title: "Keep the learner, the log, and the next action together.",
      activeGoals: [
        "Document the next weekly coaching session.",
        "Confirm the learner's current training focus.",
        "Keep observation evidence aligned with follow-through steps.",
      ],
      keyMilestones: [
        "Open the coaching-log modal.",
        "Review learner transfer cues.",
        "Publish the next documentation handoff.",
      ],
      progress: [
        { label: "Weekly logs", value: "On track" },
        { label: "Learner focus", value: "Nina Patel" },
        { label: "Open coaching actions", value: "3" },
      ],
    },
    learner: {
      title: "Stay on the next mission and keep progress visible.",
      activeGoals: [
        "Complete the current training assignment.",
        "Keep progress moving inside the active journey.",
        "Review only the next mapped support resource when needed.",
      ],
      keyMilestones: [
        "Open the next training stage.",
        "Finish the current checkpoint.",
        "Return to the learner journey with a recorded completion.",
      ],
      progress: [
        { label: "Journey progress", value: "61%" },
        { label: "Current assignment", value: "Active" },
        { label: "Next milestone", value: "Apply stage" },
      ],
    },
  };
  const missionHubContent = missionHubContentByRole[role] ?? missionHubContentByRole.learner;

  return (
    <Surface>
      <WorkspaceShell
        title="Mission Hub"
        subtitle={missionHubContent.title}
        actions={
          <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
            {tenantName}
          </Badge>
        }
        stats={missionHubContent.progress.map((entry) => ({ label: entry.label, value: entry.value }))}
        statsGridClassName="grid flex-1 gap-1.5 sm:grid-cols-3"
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Active goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missionHubContent.activeGoals.map((goal) => (
                <div key={goal} className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-100">{goal}</div>
              ))}
            </CardContent>
          </PremiumCard>
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Key milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missionHubContent.keyMilestones.map((milestone) => (
                <div key={milestone} className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-100">{milestone}</div>
              ))}
            </CardContent>
          </PremiumCard>
        </div>
      </WorkspaceShell>
    </Surface>
  );
}

export function RoleWorkspace({ role }: { role: DemoRole }) {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const executiveQuery = trpc.demo.secureExecutive.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) && role === "executive" });
  const managerQuery = trpc.demo.secureManager.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) && role === "manager" });
  const coachQuery = trpc.demo.secureCoach.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) && role === "coach" });
  const learnerQuery = trpc.demo.secureLearner.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) && role === "learner" });
  const adminQuery = trpc.demo.secureAdmin.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) && role === "client_admin" });
  const activeQuery: any = role === "executive"
    ? executiveQuery
    : role === "manager"
      ? managerQuery
      : role === "coach"
        ? coachQuery
        : role === "learner"
          ? learnerQuery
          : adminQuery;
  const canAccessWorkspace = access.data ? access.data.permittedRoles.includes(role) : false;
  const refreshWorkspace = () => {
    void access.refetch();
    void activeQuery.refetch?.();
  };
  const roleDescriptor = roleMeta[role as keyof typeof roleMeta];

  return (
    <Surface>
      <SectionShell
        eyebrow={roleDescriptor?.eyebrow ?? "Workspace"}
        title={roleDescriptor?.title ?? "Workspace"}
        description={roleDescriptor?.subtitle ?? "Open a role-specific workspace with the correct tenant-scoped data."}
        hideHeader={role === "coach" || role === "learner" || role === "manager"}
        actions={
          access.data ? (
            <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
              {access.data.tenant.name}
            </Badge>
          ) : null
        }
      >
        {access.isLoading || activeQuery.isLoading ? <LoadingState /> : null}
        {!access.isLoading && !access.data ? (
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">No client access has been assigned yet.</CardTitle>
              <CardDescription className="text-slate-300">Sign in with a client-mapped account to load tenant-specific workspace data.</CardDescription>
            </CardHeader>
          </PremiumCard>
        ) : null}
        {!access.isLoading && access.data && !canAccessWorkspace ? (
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">This workspace is outside your current entitlement.</CardTitle>
              <CardDescription className="text-slate-300">Use an account mapped to the {roleDescriptor?.title?.toLowerCase() ?? "requested"} role to open this workspace for {access.data.tenant.name}.</CardDescription>
            </CardHeader>
          </PremiumCard>
        ) : null}
        {!activeQuery.isLoading && canAccessWorkspace && activeQuery.data ? (
          role === "executive" ? (
            <ExecutivePanel data={activeQuery.data} onUpdated={refreshWorkspace} />
          ) : role === "manager" ? (
            <ManagerPanel data={activeQuery.data} onUpdated={refreshWorkspace} />
          ) : role === "coach" ? (
            <CoachPanel data={activeQuery.data} onUpdated={refreshWorkspace} headerActions={access.data ? <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">{access.data.tenant.name}</Badge> : null} />
          ) : role === "learner" ? (
            <LearnerPanel data={activeQuery.data} onUpdated={refreshWorkspace} headerActions={access.data ? <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">{access.data.tenant.name}</Badge> : null} />
          ) : (
            <AdminPanel data={activeQuery.data} onUpdated={refreshWorkspace} />
          )
        ) : null}
      </SectionShell>
    </Surface>
  );
}

export function ReportingWorkspaceView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const query = trpc.demo.secureExecutive.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
  const canAccessReporting = access.data ? access.data.permittedRoles.includes("executive") : false;
  const refreshWorkspace = () => {
    void access.refetch();
    void query.refetch();
  };
  // Client-side exporters (REPORT2): PDF = print-optimized view + window.print();
  // XLSX = exceljs workbook download; email = formatted summary to the clipboard.
  const handleExportPdf = () => window.print();
  const handleExportXlsx = async () => {
    try {
      const blob = await buildReportingWorkbookBlob(query.data);
      downloadBlob(blob, "reporting-export.xlsx");
      toast.success("Reporting workbook downloaded");
    } catch {
      toast.error("Could not generate the workbook");
    }
  };
  const handleCopyEmail = async () => {
    try {
      await copyReportingEmailSummary(query.data);
      toast.success("Email summary copied to clipboard");
    } catch {
      toast.error("Could not copy the summary");
    }
  };

  return (
    <Surface>
      <WorkspaceShell
        title="Client reporting workspace"
        subtitle="Explore ROI movement, question risk, benchmark context, and error-rate trends."
        actions={
          access.data ? (
            <>
              {canAccessReporting && query.data ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-slate-100 hover:bg-white/12 hover:text-white">
                      <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-white/10 bg-slate-950 text-slate-100">
                    <DropdownMenuItem onClick={handleExportPdf} className="gap-2 focus:bg-white/10 focus:text-white"><Printer className="h-4 w-4" /> PDF exec summary</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportXlsx} className="gap-2 focus:bg-white/10 focus:text-white"><FileSpreadsheet className="h-4 w-4" /> XLSX spreadsheet</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyEmail} className="gap-2 focus:bg-white/10 focus:text-white"><Mail className="h-4 w-4" /> Email summary</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
                {access.data.tenant.name}
              </Badge>
            </>
          ) : null
        }
      >
        {access.isLoading || query.isLoading ? <LoadingState /> : null}
        {!access.isLoading && !access.data ? (
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">No client access has been assigned yet.</CardTitle>
              <CardDescription className="text-slate-300">Sign in with a client-mapped account to load tenant-specific reporting workspaces.</CardDescription>
            </CardHeader>
          </PremiumCard>
        ) : null}
        {!access.isLoading && access.data && !canAccessReporting ? (
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">This reporting workspace is outside your current entitlement.</CardTitle>
              <CardDescription className="text-slate-300">Use a client role with executive reporting access to open this workspace for {access.data.tenant.name}.</CardDescription>
            </CardHeader>
          </PremiumCard>
        ) : null}
        {!query.isLoading && canAccessReporting && query.data ? <ExecutivePanel data={query.data} onUpdated={refreshWorkspace} /> : null}
      </WorkspaceShell>
      {/* Hidden on screen; shown only when printing (PDF exec summary). */}
      {canAccessReporting && query.data ? <ReportingPrintLayout data={query.data} /> : null}
    </Surface>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// OWNERSHIP: The /training player below (TrainingExperienceView) is owned by
// Claude Code. This repo is the source of truth for the deployed /training view.
// Manus: do not edit this training view — own backend, coaching, manager, and
// other non-training areas instead, and pull origin/main before publishing.
// See CLAUDE.md → "Ownership & boundaries".
// ──────────────────────────────────────────────────────────────────────────────
export function TrainingExperienceView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const [location, setLocation] = useLocation();
  const queryParams = useMemo(() => {
    if (typeof window === "undefined") {
      return new URLSearchParams();
    }
    return new URLSearchParams(window.location.search);
  }, [location]);
  const requestedAssetId = queryParams.get("assetId");
  const requestedAssetTitle = queryParams.get("assetTitle");
  const requestedRoleFilter = queryParams.get("role") as DemoRole | null;
  const requestedJourneyId = queryParams.get("journeyId");
  const requestedModuleId = queryParams.get("moduleId");
  const requestedAssignmentId = queryParams.get("assignmentId");
  const completedAssignmentId = queryParams.get("completedAssignmentId");
  const requestedLearnerFocus = queryParams.get("focus");
  const requestedFreshStart = queryParams.get("freshStart") === "1";
  // Resume point: the catalog's "Continue learning" links carry ?slide=N (the deck index).
  const requestedSlideIndex = Number.parseInt(queryParams.get("slide") ?? "", 10);
  const learner = trpc.demo.secureTraining.useQuery(tenantId ? { tenantId, freshStart: requestedFreshStart } : { freshStart: requestedFreshStart }, { enabled: Boolean(tenantId) });
  const [moduleIndex, setModuleIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [lessonPageIndex, setLessonPageIndex] = useState(0);
  const [briefCheckpointAnswers, setBriefCheckpointAnswers] = useState<Record<string, string>>({});
  const [briefCheckpointSubmitted, setBriefCheckpointSubmitted] = useState(false);
  const [practiceChoice, setPracticeChoice] = useState<"coach_first" | "peer_shadow" | null>(null);
  const [practiceCheckpointAnswers, setPracticeCheckpointAnswers] = useState<Record<string, string>>({});
  const [practiceCheckpointSubmitted, setPracticeCheckpointSubmitted] = useState(false);
  const [reflection, setReflection] = useState("");
  const [applicationAnswers, setApplicationAnswers] = useState<Record<string, string>>({});
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [finalQuizAnswers, setFinalQuizAnswers] = useState<Record<string, string>>({});
  const [finalQuizSubmitted, setFinalQuizSubmitted] = useState(false);
  const [selectedDeckVisualIndex, setSelectedDeckVisualIndex] = useState(0);
  const resumeSlideAppliedRef = useRef(false);
  const [curriculumViewerOpen, setCurriculumViewerOpen] = useState(false);
  const [selectedCurriculumSlideIndex, setSelectedCurriculumSlideIndex] = useState(0);
  const [narrationRate, setNarrationRate] = useState("0.95");
  const [narrationStatus, setNarrationStatus] = useState<"idle" | "playing" | "ended" | "unsupported">("idle");
  const [trainingSearchQuery, setTrainingSearchQuery] = useState("");
  const [activeQuizTriggerId, setActiveQuizTriggerId] = useState<string | null>(null);
  const [activeQuizQuestionIndex, setActiveQuizQuestionIndex] = useState(0);
  const [dismissedQuizTriggerIds, setDismissedQuizTriggerIds] = useState<string[]>([]);
  const [completedQuizTriggerIds, setCompletedQuizTriggerIds] = useState<string[]>([]);
  const [recentUnlockMoment, setRecentUnlockMoment] = useState<{ title: string; detail: string } | null>(null);
  const [coachCheckpointOpen, setCoachCheckpointOpen] = useState(false);
  const [coachCheckpointNote, setCoachCheckpointNote] = useState("");
  const [coachCheckpointSubmitted, setCoachCheckpointSubmitted] = useState(false);
  const [slideInteractionAttempt, setSlideInteractionAttempt] = useState<Record<string, any>>({});
  const [slideInteractionSubmitted, setSlideInteractionSubmitted] = useState(false);
  const [slideInteractionResult, setSlideInteractionResult] = useState<any | null>(null);
  const [revealedCardIds, setRevealedCardIds] = useState<string[]>([]);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [knowledgeCheckSuccessSoundMuted, setKnowledgeCheckSuccessSoundMuted] = useState(false);
  const [knowledgeCheckCelebrationMotionReduced, setKnowledgeCheckCelebrationMotionReduced] = useState(false);

  const armTimedChallengeWindow = () => {
    if (currentSlideInteraction?.kind !== "timed_challenge") {
      return;
    }

    setTimerStartedAt((current) => current ?? Date.now());
  };
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [briefTransitionDirection, setBriefTransitionDirection] = useState<"forward" | "backward">("forward");
  const [lessonFlashCardFlipped, setLessonFlashCardFlipped] = useState(false);
  const [trainingWorkspacePage, setTrainingWorkspacePage] = useState<"brief" | "lesson" | "checkpoint" | "resources">("lesson");
  const [launchSetupOpen, setLaunchSetupOpen] = useState(false);
  const [courseContextOpen, setCourseContextOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [progressRailCollapsed, setProgressRailCollapsed] = useState(false);
  const [slideLightboxOpen, setSlideLightboxOpen] = useState(false);
  const [focusedMode, setFocusedMode] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  // Focused (full-screen) mode: lock body scroll and allow Escape to exit.
  // Any open dialog (lightbox, curriculum, assessment) owns Escape first — we
  // check the live DOM rather than a captured state value so the guard can
  // never go stale.
  useEffect(() => {
    if (!focusedMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="dialog"]')) return;
      setFocusedMode(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [focusedMode]);
  const [roleFilter, setRoleFilter] = useState<DemoRole | "all">(() => requestedRoleFilter ?? "all");
  const slideAutoAdvanceTimeoutRef = useRef<number | null>(null);
  const briefCardRef = useRef<HTMLDivElement | null>(null);
  const restoredTrainingProgressKeyRef = useRef<string | null>(null);
  const trainingProgressRestoreTimeoutRef = useRef<number | null>(null);
  const trainingProgressHydratedRef = useRef(false);
  const trainingRoleFilterHydratedRef = useRef(false);
  const pendingLearnerReturnPathRef = useRef<string | null>(null);
  const knowledgeCheckAudioContextRef = useRef<AudioContext | null>(null);
  const previousKnowledgeCheckCelebrationRef = useRef(false);

  useEffect(() => {
    setModuleIndex(0);
    setStageIndex(0);
    setLessonPageIndex(0);
    setBriefCheckpointAnswers({});
    setBriefCheckpointSubmitted(false);
    setPracticeChoice(null);
    setPracticeCheckpointAnswers({});
    setPracticeCheckpointSubmitted(false);
    setReflection("");
    setApplicationAnswers({});
    setApplicationSubmitted(false);
    setFinalQuizAnswers({});
    setFinalQuizSubmitted(false);
    setSelectedDeckVisualIndex(0);
    setCurriculumViewerOpen(false);
    setSelectedCurriculumSlideIndex(0);
    setTrainingWorkspacePage("lesson");
    setNarrationStatus("idle");
    setActiveQuizTriggerId(null);
    setDismissedQuizTriggerIds([]);
    setCompletedQuizTriggerIds([]);
    setRecentUnlockMoment(null);
    setCoachCheckpointOpen(false);
    setCoachCheckpointNote("");
    setCoachCheckpointSubmitted(false);
  }, [tenantId]);

  useEffect(() => {
    setStageIndex(0);
    setLessonPageIndex(0);
    setBriefCheckpointAnswers({});
    setBriefCheckpointSubmitted(false);
    setPracticeChoice(null);
    setPracticeCheckpointAnswers({});
    setPracticeCheckpointSubmitted(false);
    setReflection("");
    setApplicationAnswers({});
    setApplicationSubmitted(false);
    setFinalQuizAnswers({});
    setFinalQuizSubmitted(false);
    setSelectedDeckVisualIndex(0);
    setCurriculumViewerOpen(false);
    setSelectedCurriculumSlideIndex(0);
    setTrainingWorkspacePage("lesson");
    setNarrationStatus("idle");
    setActiveQuizTriggerId(null);
    setDismissedQuizTriggerIds([]);
    setCompletedQuizTriggerIds([]);
    setRecentUnlockMoment(null);
    setCoachCheckpointOpen(false);
    setCoachCheckpointNote("");
    setCoachCheckpointSubmitted(false);
  }, [moduleIndex]);

  const [previewScenarioId, setPreviewScenarioId] = useState("active");
  const requestedTrainingTarget = useMemo(() => resolveTrainingTargetByJourneyId(requestedJourneyId), [requestedJourneyId]);

  useEffect(() => {
    setModuleIndex(0);
    setStageIndex(0);
    setLessonPageIndex(0);
    setBriefCheckpointAnswers({});
    setBriefCheckpointSubmitted(false);
    setPracticeChoice(null);
    setPracticeCheckpointAnswers({});
    setPracticeCheckpointSubmitted(false);
    setReflection("");
    setApplicationAnswers({});
    setApplicationSubmitted(false);
    setFinalQuizAnswers({});
    setFinalQuizSubmitted(false);
    setSelectedDeckVisualIndex(0);
    setCurriculumViewerOpen(false);
    setSelectedCurriculumSlideIndex(0);
    setTrainingWorkspacePage("lesson");
    setNarrationStatus("idle");
    setActiveQuizTriggerId(null);
    setDismissedQuizTriggerIds([]);
    setCompletedQuizTriggerIds([]);
    setRecentUnlockMoment(null);
    setCoachCheckpointOpen(false);
    setCoachCheckpointNote("");
    setCoachCheckpointSubmitted(false);
  }, [previewScenarioId]);

  useEffect(() => {
    if (requestedRoleFilter) {
      setPreviewScenarioId(TRAINING_PREVIEW_BY_ROLE[requestedRoleFilter] ?? "active");
    }
  }, [requestedRoleFilter]);

  useEffect(() => {
    if (requestedRoleFilter) {
      trainingRoleFilterHydratedRef.current = true;
      setRoleFilter(requestedRoleFilter);
      return;
    }

    if (!trainingRoleFilterHydratedRef.current && access.data?.grant.role && access.data.grant.role !== "platform_admin") {
      trainingRoleFilterHydratedRef.current = true;
      setRoleFilter(access.data.grant.role as DemoRole);
    }
  }, [access.data?.grant.role, requestedRoleFilter]);

  const viewerGrantRole = access.data?.grant.role;
  const canBrowseAllTrainingFamilies = viewerGrantRole === "platform_admin" || viewerGrantRole === "client_admin";
  const pinnedTrainingRole = requestedRoleFilter ?? (!canBrowseAllTrainingFamilies && viewerGrantRole ? viewerGrantRole as DemoRole : null);
  const effectiveTrainingRoleFilter = pinnedTrainingRole ?? roleFilter;
  const availableTrainingRoleFilterOptions = pinnedTrainingRole
    ? TRAINING_ROLE_FILTER_OPTIONS.filter((option) => option.value === pinnedTrainingRole)
    : canBrowseAllTrainingFamilies
      ? TRAINING_ROLE_FILTER_OPTIONS
      : TRAINING_ROLE_FILTER_OPTIONS.filter((option) => option.value !== "all");

  const trainingProgressStorageKey = useMemo(() => buildTrainingProgressStorageKey({
    tenantId,
    requestedRoleFilter,
    requestedJourneyId,
    requestedModuleId,
    requestedAssignmentId,
    previewScenarioId,
    requestedFreshStart,
  }), [previewScenarioId, requestedAssignmentId, requestedFreshStart, requestedJourneyId, requestedModuleId, requestedRoleFilter, tenantId]);
  const learnerFeedbackPreferencesStorageKey = useMemo(() => buildLearnerFeedbackPreferencesStorageKey({
    tenantId,
    requestedRoleFilter,
  }), [requestedRoleFilter, tenantId]);

  useEffect(() => {
    setLessonPageIndex(0);
    setTrainingWorkspacePage("lesson");
    if (stages[stageIndex]?.id === "apply") {
      setApplicationAnswers({});
      setApplicationSubmitted(false);
    }
    setActiveQuizTriggerId(null);
  }, [stageIndex]);

  const liveJourney = learner.data?.activeJourney ?? null;
  const previewScenarios = useMemo(() => {
    const allPreviewScenarios = [
      {
        id: "active",
        label: "Live learner path",
        eyebrow: "Learner journey",
        description: "Use the current learner sequence with real completion rates and the native service-foundations flow.",
        journeyTitle: liveJourney?.title ?? "Enablement journey",
        competencyGap: liveJourney?.competencyGap ?? "Behavior consistency",
        modules: liveJourney?.modules ?? [],
        coachingTitle: learner.data?.nextCoachingSession.title ?? "your next coaching session",
      },
      {
        id: "workflow",
        label: "Quality Assurance Essentials",
        eyebrow: "Manager family preview",
        description: "Preview the QA and workflow family so the expanded coaching-ready visual mapping can be reviewed directly in the course player.",
        journeyTitle: "Quality Assurance Essentials",
        competencyGap: "Verification consistency and documentation accuracy",
        modules: [
          {
            id: "preview-workflow-module",
            title: "Turning QA findings into behavior coaching",
            format: "Microlearning",
            durationMinutes: 7,
            skillFocus: "Behavior-based coaching",
            completionRate: 89,
          },
        ],
        coachingTitle: "Manager calibration follow-up",
      },
      {
        id: "coach-supervision",
        label: "Real Time Coaching",
        eyebrow: "Coach family preview",
        description: "Inspect the weekly coaching and learner-transfer sequence from the dedicated coach or supervisor role before the learner returns to live work.",
        journeyTitle: "Real Time Coaching",
        competencyGap: "Consistent field coaching with observable follow-through",
        modules: [
          {
            id: "preview-coaching-module",
            title: "5 Coaching Pillars and field follow-through",
            format: "Microlearning",
            durationMinutes: 7,
            skillFocus: "Trust-building and self-discovery",
            completionRate: 87,
          },
        ],
        coachingTitle: "Coach checkpoint and transfer review",
      },
      {
        id: "leadership",
        label: "Unlocking the power of date",
        eyebrow: "Executive family preview",
        description: "Review the KPI-reading and workshop-style leadership visuals that now support executive decision-quality modules.",
        journeyTitle: "Unlocking the power of date",
        competencyGap: "Intervention-to-outcome visibility",
        modules: [
          {
            id: "preview-leadership-module",
            title: "Trend validation across teams and time periods",
            format: "Playbook",
            durationMinutes: 9,
            skillFocus: "Decision quality",
            completionRate: 74,
          },
        ],
        coachingTitle: "Executive signal review",
      },
      {
        id: "performance",
        label: "Maximizing performance through performance management",
        eyebrow: "Manager leadership preview",
        description: "Inspect the calibration, segmentation, and fairness visuals that now enrich performance-management training modules.",
        journeyTitle: "Maximizing performance through performance management",
        competencyGap: "Performance segmentation without bias",
        modules: [
          {
            id: "preview-performance-module",
            title: "High, emerging, and at-risk performance archetypes",
            format: "Playbook",
            durationMinutes: 9,
            skillFocus: "Pattern recognition",
            completionRate: 81,
          },
        ],
        coachingTitle: "Performance archetype review",
      },
      {
        id: "engagement",
        label: "Gamification & Work From Home",
        eyebrow: "Recognition family preview",
        description: "Validate the program-design and recognition-rhythm visuals now mapped into engagement-system lessons.",
        journeyTitle: "Gamification & Work From Home",
        competencyGap: "Recognition rhythm for hybrid teams",
        modules: [
          {
            id: "preview-engagement-module",
            title: "Points, badges, and meaningful recognition",
            format: "Playbook",
            durationMinutes: 9,
            skillFocus: "Recognition strategy",
            completionRate: 84,
          },
        ],
        coachingTitle: "Recognition design checkpoint",
      },
    ];

    const basePreviewScenarios = viewerGrantRole === "learner" && !requestedRoleFilter
      ? allPreviewScenarios.slice(0, 1)
      : allPreviewScenarios;

    return filterTrainingPreviewScenariosByRole(basePreviewScenarios, effectiveTrainingRoleFilter);
  }, [effectiveTrainingRoleFilter, liveJourney, learner.data?.nextCoachingSession.title, requestedRoleFilter, viewerGrantRole]);

  useEffect(() => {
    if (!requestedTrainingTarget || !previewScenarios.some((scenario) => scenario.id === requestedTrainingTarget.previewScenarioId)) {
      return;
    }

    setPreviewScenarioId((current) => current === requestedTrainingTarget.previewScenarioId ? current : requestedTrainingTarget.previewScenarioId);
  }, [previewScenarios, requestedTrainingTarget]);

  useEffect(() => {
    if (!previewScenarios.length) {
      return;
    }

    if (!previewScenarios.some((scenario) => scenario.id === previewScenarioId)) {
      setPreviewScenarioId(previewScenarios[0].id);
    }
  }, [previewScenarioId, previewScenarios]);

  const activePreview = previewScenarios.find((scenario) => scenario.id === previewScenarioId) ?? previewScenarios[0];
  const journeyResources = learner.data?.workflowLibraryMix.journeyResources ?? [];
  const launchedAsset = journeyResources.find((asset: any) => asset.id === requestedAssetId)
    ?? journeyResources.find((asset: any) => asset.title === requestedAssetTitle)
    ?? null;
  const targetedAssignment = learner.data?.retrainingAssignments?.find((assignment: any) => {
    if (requestedAssignmentId) {
      return assignment.id === requestedAssignmentId;
    }

    return assignment.journeyId === requestedJourneyId && assignment.moduleId === requestedModuleId;
  }) ?? null;
  const targetedJourney = requestedJourneyId
    ? learner.data?.retrainingAssignments?.find((assignment: any) => assignment.journeyId === requestedJourneyId)?.journeyTitle
    : null;
  const targetedModules = targetedAssignment
    ? [{
      id: targetedAssignment.moduleId,
      title: targetedAssignment.moduleTitle,
      format: targetedAssignment.moduleFormat,
      durationMinutes: 18,
      skillFocus: targetedAssignment.skillFocus,
      completionRate: 0,
    }]
    : requestedTrainingTarget && requestedModuleId
      ? [{
        id: requestedModuleId,
        title: requestedTrainingTarget.moduleTitle,
        format: requestedTrainingTarget.moduleFormat,
        durationMinutes: activePreview?.modules?.[0]?.durationMinutes ?? 18,
        skillFocus: requestedTrainingTarget.skillFocus,
        completionRate: 0,
      }]
      : activePreview?.modules ?? [];
  const modules = targetedModules;
  const filteredModuleEntries = useMemo(
    () => filterTrainingRecords(
      modules.map((module: any, index: number) => ({
        ...module,
        originalIndex: index,
        subtitle: `${module.skillFocus} ${module.format} ${activePreview?.journeyTitle ?? ""}`,
        keywords: [module.skillFocus, module.format, activePreview?.label ?? "", activePreview?.eyebrow ?? ""],
      })),
      trainingSearchQuery,
    ),
    [activePreview?.eyebrow, activePreview?.journeyTitle, activePreview?.label, modules, trainingSearchQuery],
  );
  const visibleModuleIndexes = filteredModuleEntries.map((module: any) => module.originalIndex);

  useEffect(() => {
    if (!visibleModuleIndexes.length) {
      return;
    }

    if (!visibleModuleIndexes.includes(moduleIndex)) {
      setModuleIndex(visibleModuleIndexes[0] ?? 0);
    }
  }, [moduleIndex, visibleModuleIndexes]);

  const selectedModule = modules[moduleIndex] ?? null;
  // LESSON4: the player consumes the server-resolved presentation for the current
  // module + tenant — seed slide + brief overrides applied PRE-expansion, then
  // AUTHOR3 checkpoint overrides on top. Non-catalog preview modules (switch-lane)
  // resolve to null and fall back to the local computation below.
  const resolvedPresentationQuery = trpc.demo.previewResolvedPresentation.useQuery(
    { moduleId: selectedModule?.id ?? "", tenantId: tenantId ?? undefined },
    { enabled: Boolean(tenantId && selectedModule?.id) },
  );
  const selectedModuleTitle = selectedModule?.title ?? requestedModuleId ?? "Training module";
  const selectedModuleFormatLabel = selectedModule?.format ?? "Guided lesson";
  const selectedModuleSkillFocus = selectedModule?.skillFocus ?? "behavior change";
  const effectiveJourneyTitle = targetedAssignment?.journeyTitle ?? requestedTrainingTarget?.journeyTitle ?? targetedJourney ?? activePreview?.journeyTitle ?? liveJourney?.title ?? "Enablement journey";
  const effectiveCompetencyGap = targetedAssignment?.skillFocus ?? requestedTrainingTarget?.skillFocus ?? activePreview?.competencyGap ?? liveJourney?.competencyGap ?? "Behavior consistency";
  const effectiveCoachingTitle = targetedAssignment ? `Targeted retraining for ${targetedAssignment.skillFocus}` : activePreview?.coachingTitle ?? learner.data?.nextCoachingSession.title ?? "your next coaching session";
  const moduleKeywords = `${selectedModule?.title ?? ""} ${selectedModule?.skillFocus ?? ""} ${effectiveCompetencyGap} ${launchedAsset?.title ?? ""} ${launchedAsset?.tags?.join(" ") ?? ""}`
    .toLowerCase()
    .split(/\s+/)
    .filter((keyword) => keyword.length > 4);
  const matchedResources = journeyResources.filter((asset: any) => {
    const haystack = `${asset.title} ${asset.summary} ${asset.tags.join(" ")}`.toLowerCase();
    return moduleKeywords.some((keyword) => haystack.includes(keyword));
  });
  const supportingAssets = [launchedAsset, ...(matchedResources.length > 0 ? matchedResources : journeyResources)]
    .filter((asset, index, collection): asset is NonNullable<typeof asset> => Boolean(asset) && collection.findIndex((candidate) => candidate?.id === asset?.id) === index)
    .slice(0, 3);
  // Prefer the server-resolved presentation (lesson/brief/checkpoint overrides all
  // applied). While it loads, or for non-catalog preview modules that resolve to
  // null, fall back to the identical local computation so nothing regresses.
  const presentation = (resolvedPresentationQuery.data as ReturnType<typeof getTrainingPresentation> | null | undefined)
    ?? (selectedModule ? getTrainingPresentation(selectedModule, effectiveJourneyTitle, effectiveCompetencyGap) : null);
  const guidedPlan = buildGuidedTrainingPlan({
    journeyTitle: effectiveJourneyTitle,
    moduleTitle: selectedModule?.title ?? "Guided module",
    skillFocus: selectedModule?.skillFocus ?? "Behavior change",
    presentation,
  });
  const trainingVisuals = useMemo(() => (presentation ? buildTrainingVisualGallery(presentation) : []), [presentation]);
  const curriculumDeck = useMemo<Array<{
    id: string;
    stageId: "brief" | "practice" | "apply";
    stageLabel: string;
    slideIndex: number;
    pageLabel: string;
    slide: any;
    visual: TrainingGalleryVisual | null;
  }>>(() => {
    if (!presentation) {
      return [];
    }

    return [
      { stageId: "brief" as const, stageLabel: "Learn", slides: presentation.slides },
      { stageId: "practice" as const, stageLabel: "Practice", slides: presentation.practiceSlides },
      { stageId: "apply" as const, stageLabel: "Apply in role", slides: presentation.applySlides },
    ].flatMap(({ stageId, stageLabel, slides }) => {
      const stageVisuals = trainingVisuals.filter((visual) => visual.stageId === stageId);

      return slides.map((slide, index) => ({
        id: `${stageId}-${slide.id}`,
        stageId,
        stageLabel,
        slideIndex: index,
        pageLabel: `${stageLabel} ${index + 1}`,
        slide,
        visual: stageVisuals[Math.min(index, Math.max(stageVisuals.length - 1, 0))] ?? null,
      }));
    });
  }, [presentation, trainingVisuals]);
  const insightCharts = presentation?.insightCharts ?? [];
  const slideCanvas = getSlideCanvasVisuals(trainingVisuals, selectedDeckVisualIndex);
  const featuredDeckVisual = slideCanvas.activeVisual;
  const moduleFamilyLabel = featuredDeckVisual?.sourceDeck ?? presentation?.evidenceLabel ?? selectedModule?.format ?? "CHCG learning module";
  const completedModuleCount = modules.filter((module: any) => module.completionRate >= 80).length;
  const nextRecommendedModule = modules[moduleIndex + 1] ?? null;
  const coachPromptPreview = presentation?.coachPrompts[Math.min(stageIndex, Math.max((presentation?.coachPrompts.length ?? 1) - 1, 0))]
    ?? `Prepare to review how ${selectedModule?.skillFocus?.toLowerCase() ?? "the current skill"} transfers into the next live workflow moment.`;
  const reflectionPromptPreview = presentation?.reflectionPrompts[Math.min(stageIndex, Math.max((presentation?.reflectionPrompts.length ?? 1) - 1, 0))]
    ?? `Capture the next observable behavior that should change after this lesson.`;
  const coachCheckpointWordCount = coachCheckpointNote.trim().length > 0
    ? coachCheckpointNote.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const coachCheckpointReady = coachCheckpointWordCount >= 6;
  const coachCheckpointEvaluation = evaluateCoachCheckpointResponse(coachCheckpointNote);
  const coachCheckpointPassed = coachCheckpointSubmitted && coachCheckpointEvaluation.passed;
  const narrationSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const stopNarration = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setNarrationStatus("idle");
  };

  const playNarrationPreview = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setNarrationStatus("unsupported");
      return;
    }

    const speakNarration = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(narrationScript);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ?? voices[0];
      utterance.rate = Number(narrationRate);
      utterance.pitch = 1;
      utterance.lang = preferredVoice?.lang ?? "en-US";
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.onstart = () => setNarrationStatus("playing");
      utterance.onend = () => setNarrationStatus("ended");
      utterance.onerror = () => setNarrationStatus("idle");
      window.speechSynthesis.speak(utterance);
    };

    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length > 0) {
      speakNarration();
      return;
    }

    const handleVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      speakNarration();
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      if (narrationStatus !== "playing") {
        speakNarration();
      }
    }, 250);
  };

  const stages = selectedModule
    ? [
        {
          id: "brief",
          label: "Learn",
          title: "Learn the core workflow behavior",
          body: `This ${selectedModuleFormatLabel.toLowerCase()} turns ${selectedModuleSkillFocus.toLowerCase()} into a focused lesson path inside ${effectiveJourneyTitle}.`,
        },
        {
          id: "practice",
          label: "Practice",
          title: "Choose how to rehearse the behavior",
          body: `Before the next coaching checkpoint, decide how you would practice ${selectedModuleSkillFocus.toLowerCase()} in a realistic workflow moment.`,
        },
        {
          id: "apply",
          label: "Apply",
          title: "Blend source content into live work",
          body: `The system pairs this module with CHCG methodology and tenant content so it can transfer directly into interventions, readiness reviews, and workflow reinforcement.`,
        },
        {
          id: "reflect",
          label: "Reflect",
          title: "Capture the behavior change",
          body: `Write the action you want to demonstrate before ${effectiveCoachingTitle}.`,
        },
      ]
    : [];
  const stageActivities: Record<string, string[]> = {
    brief: [
      "Review the guided explanation for the current workflow behavior.",
      "Study the lesson visuals and supporting cues attached to this module.",
      "Use the overview pages to understand what good performance looks like.",
    ],
    practice: [
      "Choose a rehearsal path before moving forward.",
      "Complete the inline guided experience and checkpoint prompts.",
      "Test the behavior in a realistic workflow scenario.",
    ],
    apply: [
      "Connect the lesson to live interventions and supporting resources.",
      "Translate the module into a real operational use case.",
      "Capture how the content should transfer into active work.",
    ],
    reflect: [
      "Write the behavior change commitment for the next coaching checkpoint.",
      "Confirm the final knowledge check and transfer plan.",
      "Document the milestone you will demonstrate next.",
    ],
  };

  const currentStage = stages[stageIndex] ?? null;
  const currentStagePages = currentStage?.id === "brief"
    ? (presentation?.slides ?? [])
    : currentStage?.id === "practice"
      ? (presentation?.practiceSlides ?? [])
      : currentStage?.id === "apply"
        ? (presentation?.applySlides ?? [])
        : [];
  const { currentPage: currentLessonPage, previousPage: previousLessonPage, nextPage: nextLessonPage } = getBriefBoxPages(currentStagePages, lessonPageIndex);
  const briefCompletionStatus = getBriefCompletionStatus(lessonPageIndex, currentStagePages.length);
  const stageVisuals = currentStage ? trainingVisuals.filter((visual) => visual.stageId === currentStage.id) : [];
  const contextualDeckVisual = stageVisuals[Math.min(lessonPageIndex, Math.max(stageVisuals.length - 1, 0))] ?? featuredDeckVisual;
  const currentSlideInteraction = buildSlideInteraction(currentLessonPage, selectedModule?.skillFocus ?? "", lessonPageIndex);
  const slideInteractionPassed = Boolean(slideInteractionResult?.passed);
  const slideInteractionCelebrationActive = slideInteractionSubmitted && slideInteractionPassed;
  const slideInteractionProgress = currentSlideInteraction?.kind === "click_to_reveal"
    ? Math.round((revealedCardIds.length / Math.max(currentSlideInteraction.revealCards?.length ?? 1, 1)) * 100)
    : (slideInteractionResult?.score ?? 0);
  const narrationScript = buildLessonNarrationScript(currentLessonPage, presentation);
  const miniAudioBarTitle = currentLessonPage?.title ?? currentStage?.title ?? selectedModule?.title ?? "Lesson narration";

  useEffect(() => {
    const fallbackReducedMotion = readMotionPreferenceFromMediaQuery();
    const preferences = loadLearnerFeedbackPreferences(learnerFeedbackPreferencesStorageKey, fallbackReducedMotion);
    setKnowledgeCheckSuccessSoundMuted(preferences.successSoundMuted);
    setKnowledgeCheckCelebrationMotionReduced(preferences.reducedMotion);
  }, [learnerFeedbackPreferencesStorageKey]);

  useEffect(() => {
    persistLearnerFeedbackPreferences(learnerFeedbackPreferencesStorageKey, {
      successSoundMuted: knowledgeCheckSuccessSoundMuted,
      reducedMotion: knowledgeCheckCelebrationMotionReduced,
    });
  }, [knowledgeCheckCelebrationMotionReduced, knowledgeCheckSuccessSoundMuted, learnerFeedbackPreferencesStorageKey]);

  useEffect(() => {
    if (slideInteractionCelebrationActive && !previousKnowledgeCheckCelebrationRef.current && !knowledgeCheckSuccessSoundMuted) {
      playCorrectAnswerSuccessSound(knowledgeCheckAudioContextRef);
    }

    previousKnowledgeCheckCelebrationRef.current = slideInteractionCelebrationActive;
  }, [knowledgeCheckSuccessSoundMuted, slideInteractionCelebrationActive]);

  useEffect(() => () => {
    if (knowledgeCheckAudioContextRef.current && knowledgeCheckAudioContextRef.current.state !== "closed") {
      void knowledgeCheckAudioContextRef.current.close();
      knowledgeCheckAudioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !trainingProgressStorageKey || !modules.length || !stages.length) {
      return;
    }

    if (restoredTrainingProgressKeyRef.current === trainingProgressStorageKey) {
      return;
    }

    restoredTrainingProgressKeyRef.current = trainingProgressStorageKey;
    trainingProgressHydratedRef.current = false;
    if (trainingProgressRestoreTimeoutRef.current !== null) {
      window.clearTimeout(trainingProgressRestoreTimeoutRef.current);
      trainingProgressRestoreTimeoutRef.current = null;
    }

    const savedProgress = window.localStorage.getItem(trainingProgressStorageKey);
    if (!savedProgress) {
      trainingProgressHydratedRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(savedProgress) as Partial<PersistedTrainingProgress>;
      const normalizedProgress = normalizePersistedTrainingProgress(parsed, modules.length - 1, stages.length - 1);
      setModuleIndex(normalizedProgress.moduleIndex);
      setStageIndex(normalizedProgress.stageIndex);
      trainingProgressRestoreTimeoutRef.current = window.setTimeout(() => {
        setLessonPageIndex(normalizedProgress.lessonPageIndex);
        setBriefCheckpointAnswers(normalizedProgress.briefCheckpointAnswers);
        setBriefCheckpointSubmitted(normalizedProgress.briefCheckpointSubmitted);
        setPracticeChoice(normalizedProgress.practiceChoice);
        setPracticeCheckpointAnswers(normalizedProgress.practiceCheckpointAnswers);
        setPracticeCheckpointSubmitted(normalizedProgress.practiceCheckpointSubmitted);
        setReflection(normalizedProgress.reflection);
        setApplicationAnswers(normalizedProgress.applicationAnswers);
        setApplicationSubmitted(normalizedProgress.applicationSubmitted);
        setFinalQuizAnswers(normalizedProgress.finalQuizAnswers);
        setFinalQuizSubmitted(normalizedProgress.finalQuizSubmitted);
        setSelectedDeckVisualIndex(normalizedProgress.selectedDeckVisualIndex);
        setNarrationRate(normalizedProgress.narrationRate);
        setDismissedQuizTriggerIds(normalizedProgress.dismissedQuizTriggerIds);
        setCompletedQuizTriggerIds(normalizedProgress.completedQuizTriggerIds);
        setCoachCheckpointNote(normalizedProgress.coachCheckpointNote);
        setCoachCheckpointSubmitted(normalizedProgress.coachCheckpointSubmitted);
        trainingProgressHydratedRef.current = true;
        trainingProgressRestoreTimeoutRef.current = null;
      }, 0);
    } catch {
      window.localStorage.removeItem(trainingProgressStorageKey);
      trainingProgressHydratedRef.current = true;
    }
  }, [modules.length, stages.length, trainingProgressStorageKey]);

  useEffect(() => {
    if (lessonPageIndex <= Math.max(currentStagePages.length - 1, 0)) {
      return;
    }

    setLessonPageIndex(Math.max(currentStagePages.length - 1, 0));
  }, [currentStagePages.length, lessonPageIndex]);

  useEffect(() => {
    setLessonFlashCardFlipped(false);
  }, [currentStage?.id, lessonPageIndex]);

  useEffect(() => {
    if (typeof window === "undefined" || !trainingProgressStorageKey || !modules.length || !selectedModule || !trainingProgressHydratedRef.current) {
      return;
    }

    const persistedProgress: PersistedTrainingProgress = {
      previewScenarioId,
      moduleIndex,
      stageIndex,
      lessonPageIndex,
      briefCheckpointAnswers,
      briefCheckpointSubmitted,
      practiceChoice,
      practiceCheckpointAnswers,
      practiceCheckpointSubmitted,
      reflection,
      applicationAnswers,
      applicationSubmitted,
      finalQuizAnswers,
      finalQuizSubmitted,
      selectedDeckVisualIndex,
      narrationRate,
      dismissedQuizTriggerIds,
      completedQuizTriggerIds,
      coachCheckpointNote,
      coachCheckpointSubmitted,
    };

    window.localStorage.setItem(trainingProgressStorageKey, JSON.stringify(persistedProgress));
  }, [
    applicationAnswers,
    applicationSubmitted,
    briefCheckpointAnswers,
    briefCheckpointSubmitted,
    coachCheckpointNote,
    coachCheckpointSubmitted,
    completedQuizTriggerIds,
    dismissedQuizTriggerIds,
    finalQuizAnswers,
    finalQuizSubmitted,
    lessonPageIndex,
    moduleIndex,
    modules.length,
    narrationRate,
    practiceCheckpointAnswers,
    practiceCheckpointSubmitted,
    practiceChoice,
    previewScenarioId,
    reflection,
    selectedDeckVisualIndex,
    selectedModule,
    stageIndex,
    trainingProgressStorageKey,
  ]);

  const buildInitialSlideInteractionAttempt = () => {
    if (currentSlideInteraction?.kind === "drag_and_drop" && currentSlideInteraction.orderedSteps?.length) {
      return { orderedSteps: [...currentSlideInteraction.orderedSteps].reverse() };
    }

    return {};
  };

  const clearPendingSlideAutoAdvance = () => {
    if (slideAutoAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(slideAutoAdvanceTimeoutRef.current);
      slideAutoAdvanceTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    clearPendingSlideAutoAdvance();
    setSlideInteractionAttempt(buildInitialSlideInteractionAttempt());
    setSlideInteractionSubmitted(false);
    setSlideInteractionResult(null);
    setRevealedCardIds([]);
    setDraggedStepIndex(null);
    setTimerStartedAt(null);
  }, [selectedModule?.id, stageIndex, lessonPageIndex, currentSlideInteraction?.id]);

  useEffect(() => () => {
    clearPendingSlideAutoAdvance();
    if (typeof window !== "undefined" && trainingProgressRestoreTimeoutRef.current !== null) {
      window.clearTimeout(trainingProgressRestoreTimeoutRef.current);
      trainingProgressRestoreTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setNarrationStatus("idle");
  }, [narrationScript]);

  useEffect(() => {
    const card = briefCardRef.current;
    if (!card || typeof card.animate !== "function") {
      return;
    }

    card.animate(
      [
        {
          opacity: 0,
          transform: `translateX(${briefTransitionDirection === "forward" ? "18px" : "-18px"}) scale(0.985)`,
        },
        {
          opacity: 1,
          transform: "translateX(0) scale(1)",
        },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
      },
    );
  }, [briefTransitionDirection, lessonPageIndex, currentStage?.id]);

  const activeChart = insightCharts[Math.min(lessonPageIndex, Math.max(insightCharts.length - 1, 0))] ?? insightCharts[0] ?? null;
  const lessonVisualSequence = currentLessonPage
    ? currentLessonPage.bullets.slice(0, 3).map((bullet, index) => ({
        id: `${currentLessonPage.id}-sequence-${index}`,
        stepLabel: `${currentLessonPage.visualTone} ${index + 1}`,
        title: bullet.split(" ").slice(0, 5).join(" "),
        detail: bullet,
      }))
    : [];
  const lessonSignalCards = (activeChart?.data ?? []).slice(0, 3);
  const lessonVisualGallery = stageVisuals
    .filter((visual, index, collection) => collection.findIndex((candidate) => candidate.id === visual.id) === index)
    .slice(0, 6);
  // Prefer the real uploaded deck slides (per-module manifest in trainingContent.ts,
  // served from /slides/). Fall back to the generated lesson visuals, then the
  // contextual deck visual, when a module has no converted slides yet.
  const deckGalleryVisuals = trainingVisuals.filter((visual) => visual.visualType === "deck" && Boolean(visual.imageUrl));
  const interactiveGalleryVisuals = deckGalleryVisuals.length
    ? deckGalleryVisuals
    : lessonVisualGallery.length
      ? lessonVisualGallery
      : contextualDeckVisual
        ? [contextualDeckVisual]
        : [];
  const activeInteractiveVisualIndex = interactiveGalleryVisuals.length
    ? Math.min(selectedDeckVisualIndex, interactiveGalleryVisuals.length - 1)
    : 0;
  const activeInteractiveVisual = interactiveGalleryVisuals[activeInteractiveVisualIndex] ?? null;
  // Resume to ?slide=N once the deck is ready (catalog "Continue learning" deep-links).
  // Runs after the mount resets settle, so it wins; applied a single time.
  useEffect(() => {
    if (resumeSlideAppliedRef.current) return;
    if (interactiveGalleryVisuals.length === 0) return;
    resumeSlideAppliedRef.current = true;
    if (Number.isInteger(requestedSlideIndex) && requestedSlideIndex > 0) {
      setSelectedDeckVisualIndex(Math.min(requestedSlideIndex, interactiveGalleryVisuals.length - 1));
    }
  }, [interactiveGalleryVisuals.length, requestedSlideIndex]);
  // Live per-client KPI scorecard (WFM & KPI training). Defaults to the deck's source
  // client; map a workspace to a client in shared/kpiScorecards.ts → tenantClientId.
  const kpiProfile = getKpiProfile();
  const activeScorecard = activeInteractiveVisual?.scorecardId
    ? getKpiScorecard(kpiProfile, activeInteractiveVisual.scorecardId)
    : null;
  const lessonPageProgress = currentStagePages.length > 0 ? Math.round(((lessonPageIndex + 1) / currentStagePages.length) * 100) : 100;
  const onLastLessonPage = currentStagePages.length === 0 || lessonPageIndex >= currentStagePages.length - 1;
  const stageDisplayLabel = currentStage?.id === "brief" ? "Lesson" : currentStage?.label ?? "Lesson";
  const currentStageItemLabel = `${stageDisplayLabel} ${currentStagePages.length > 0 ? lessonPageIndex + 1 : 0}`;
  const activeCurriculumSlide = curriculumDeck[Math.min(selectedCurriculumSlideIndex, Math.max(curriculumDeck.length - 1, 0))] ?? null;
  const activeCurriculumVisual = activeCurriculumSlide?.visual ?? featuredDeckVisual ?? null;

  const openCurriculumViewer = () => {
    if (!curriculumDeck.length) {
      return;
    }

    const activeStageId = currentStage?.id === "practice" || currentStage?.id === "apply" ? currentStage.id : "brief";
    const stageDeckEntries = curriculumDeck.filter((entry) => entry.stageId === activeStageId);
    const alignedStageEntry = stageDeckEntries[Math.min(lessonPageIndex, Math.max(stageDeckEntries.length - 1, 0))] ?? curriculumDeck[0];
    const alignedIndex = curriculumDeck.findIndex((entry) => entry.id === alignedStageEntry?.id);
    setSelectedCurriculumSlideIndex(alignedIndex >= 0 ? alignedIndex : 0);
    setCurriculumViewerOpen(true);
  };
  const currentStageItemCountLabel = currentStagePages.length > 0 ? `${lessonPageIndex + 1} of ${currentStagePages.length}` : "No pages loaded";
  const lessonBriefFlashCards: BriefFlashCardItem[] = currentStagePages.map((page: any, index) => ({
    id: page.id ?? `${currentStage?.id ?? "lesson"}-${index}`,
    eyebrow: page.eyebrow ?? `${stageDisplayLabel} flash card`,
    title: page.title ?? `${stageDisplayLabel} ${index + 1}`,
    frontSummary: page.narrative ?? "Flip this card to review the detailed brief guidance for this part of the lesson.",
    backNarrative: page.narrative ?? "Detailed guidance will appear here once the current lesson content is ready.",
    bullets: Array.isArray(page.bullets) ? page.bullets : [],
    accentLabel: currentStage?.label ?? stageDisplayLabel,
    supportLabel: index < currentStagePages.length - 1 ? "Next card" : "Checkpoint readiness",
    supportValue: index < currentStagePages.length - 1
      ? (currentStagePages[index + 1]?.title ?? `Continue to ${stageDisplayLabel.toLowerCase()} ${index + 2}`)
      : "Finish this card review, then move into the next training checkpoint.",
  }));
  const stageNavigatorLabel = getStageNavigatorLabel(currentStage?.id);
  const briefQuestions = presentation?.briefCheckpoint.questions ?? [];
  const briefAnsweredCount = briefQuestions.filter((question) => hasAssessmentAnswer(question, briefCheckpointAnswers)).length;
  const briefScore = briefQuestions.filter((question) => isAssessmentQuestionCorrect(question, briefCheckpointAnswers[question.id])).length;
  const briefPassed = briefCheckpointSubmitted && briefScore >= (presentation?.briefCheckpoint.passingScore ?? Number.MAX_SAFE_INTEGER);
  const practiceQuestions = presentation?.practiceCheckpoint.questions ?? [];
  const practiceAnsweredCount = practiceQuestions.filter((question) => hasAssessmentAnswer(question, practiceCheckpointAnswers)).length;
  const practiceScore = practiceQuestions.filter((question) => isAssessmentQuestionCorrect(question, practiceCheckpointAnswers[question.id])).length;
  const practicePassed = practiceCheckpointSubmitted && practiceScore >= (presentation?.practiceCheckpoint.passingScore ?? Number.MAX_SAFE_INTEGER);
  const applicationQuestions = presentation?.applicationActivity.questions ?? [];
  const applicationAnsweredCount = applicationQuestions.filter((question) => hasAssessmentAnswer(question, applicationAnswers)).length;
  const applicationScore = applicationQuestions.filter((question) => isAssessmentQuestionCorrect(question, applicationAnswers[question.id])).length;
  const applicationPassed = applicationSubmitted && applicationScore >= (presentation?.applicationActivity.passingScore ?? Number.MAX_SAFE_INTEGER);
  const finalQuizQuestions = presentation?.finalQuiz.questions ?? [];
  // Active-recall practice deck (FLASH2): drive from the practice-checkpoint + final-quiz
  // questions, falling back to practice-slide bullets when a module's Q&A is thin.
  const practiceRecallCards = buildPracticeRecallCards(
    [...practiceQuestions, ...finalQuizQuestions],
    presentation?.practiceSlides ?? [],
  );
  const finalQuizAnsweredCount = finalQuizQuestions.filter((question) => hasAssessmentAnswer(question, finalQuizAnswers)).length;
  const finalQuizScore = finalQuizQuestions.filter((question) => isAssessmentQuestionCorrect(question, finalQuizAnswers[question.id])).length;
  const finalQuizPassed = finalQuizSubmitted && finalQuizScore >= (presentation?.finalQuiz.passingScore ?? Number.MAX_SAFE_INTEGER);
  const activeQuizTrigger = guidedPlan.quizTriggers.find((trigger) => (
    trigger.stageId === currentStage?.id && trigger.pageIndex === lessonPageIndex
  )) ?? null;
  const quizTriggerDismissed = activeQuizTrigger ? dismissedQuizTriggerIds.includes(activeQuizTrigger.id) : false;
  const activeModalQuizTrigger = activeQuizTriggerId
    ? guidedPlan.quizTriggers.find((trigger) => trigger.id === activeQuizTriggerId) ?? null
    : null;
  const activeModalAssessment = activeModalQuizTrigger?.assessmentKey === "briefCheckpoint"
    ? presentation?.briefCheckpoint
    : activeModalQuizTrigger?.assessmentKey === "practiceCheckpoint"
      ? presentation?.practiceCheckpoint
      : activeModalQuizTrigger?.assessmentKey === "applicationActivity"
        ? presentation?.applicationActivity
        : activeModalQuizTrigger?.assessmentKey === "finalQuiz"
          ? presentation?.finalQuiz
          : null;
  const activeModalAnswers = activeModalQuizTrigger?.assessmentKey === "briefCheckpoint"
    ? briefCheckpointAnswers
    : activeModalQuizTrigger?.assessmentKey === "practiceCheckpoint"
      ? practiceCheckpointAnswers
      : activeModalQuizTrigger?.assessmentKey === "applicationActivity"
        ? applicationAnswers
        : activeModalQuizTrigger?.assessmentKey === "finalQuiz"
          ? finalQuizAnswers
          : {};
  const activeModalAnsweredCount = activeModalQuizTrigger?.assessmentKey === "briefCheckpoint"
    ? briefAnsweredCount
    : activeModalQuizTrigger?.assessmentKey === "practiceCheckpoint"
      ? practiceAnsweredCount
      : activeModalQuizTrigger?.assessmentKey === "applicationActivity"
        ? applicationAnsweredCount
        : activeModalQuizTrigger?.assessmentKey === "finalQuiz"
          ? finalQuizAnsweredCount
          : 0;
  const activeModalScore = activeModalQuizTrigger?.assessmentKey === "briefCheckpoint"
    ? briefScore
    : activeModalQuizTrigger?.assessmentKey === "practiceCheckpoint"
      ? practiceScore
      : activeModalQuizTrigger?.assessmentKey === "applicationActivity"
        ? applicationScore
        : activeModalQuizTrigger?.assessmentKey === "finalQuiz"
          ? finalQuizScore
          : 0;
  const activeModalPassed = activeModalQuizTrigger?.assessmentKey === "briefCheckpoint"
    ? briefPassed
    : activeModalQuizTrigger?.assessmentKey === "practiceCheckpoint"
      ? practicePassed
      : activeModalQuizTrigger?.assessmentKey === "applicationActivity"
        ? applicationPassed
        : activeModalQuizTrigger?.assessmentKey === "finalQuiz"
          ? finalQuizPassed
          : false;
  const activeModalCheckpointResetKey = getModalCheckpointResetKey(activeModalQuizTrigger);
  const currentStageQuizTriggers = guidedPlan.quizTriggers.filter((trigger) => trigger.stageId === currentStage?.id);
  const currentStageQuizGatePassed = currentStageQuizTriggers.every((trigger) => completedQuizTriggerIds.includes(trigger.id));
  const totalSteps = Math.max(modules.length * Math.max(stages.length, 1), 1);
  const overallProgress = selectedModule ? Math.round((((moduleIndex * stages.length) + stageIndex + 1) / totalSteps) * 100) : 0;
  const stageRuntimeLabel = guidedPlan.stageDurations.find((entry) => entry.stageId === currentStage?.id)?.durationLabel ?? "Runtime calibrating";
  const totalRuntimeMinutes = guidedPlan.stageDurations.reduce((sum, entry) => sum + entry.minutes, 0);
  const elapsedRuntimeMinutes = guidedPlan.stageDurations.slice(0, Math.max(stageIndex, 0)).reduce((sum, entry) => sum + entry.minutes, 0);
  const remainingRuntimeMinutes = Math.max(totalRuntimeMinutes - elapsedRuntimeMinutes, 0);
  const courseStatusLabel = finalQuizPassed
    ? "Ready to close"
    : activeModalQuizTrigger && !activeModalPassed
      ? "Checkpoint active"
      : overallProgress >= 100
        ? "Final review"
        : overallProgress >= 60
          ? "In progress"
          : overallProgress > 0
            ? "Getting underway"
            : "Not started";
  const courseStatusSupport = finalQuizPassed
    ? "Final quiz is complete and the learner can finish the transfer commitment."
    : activeModalQuizTrigger && !activeModalPassed
      ? `${activeModalQuizTrigger.label} must be cleared before the learner can continue.`
      : `Current stage runtime · ${stageRuntimeLabel}`;
  const utils = trpc.useUtils();
  const completeTrainingAssignment = trpc.demo.secureUpdateRetrainingAssignmentStatus.useMutation({
    onSuccess: async () => {
      if (!tenantId) {
        return;
      }

      const pendingLearnerReturnPath = pendingLearnerReturnPathRef.current;
      await Promise.all([
        utils.demo.secureTraining.invalidate({ tenantId }),
        utils.demo.secureLearner.invalidate({ tenantId }),
        utils.demo.secureCoach.invalidate({ tenantId }),
        utils.demo.secureManager.invalidate({ tenantId }),
      ]);

      if (pendingLearnerReturnPath) {
        pendingLearnerReturnPathRef.current = null;
        setLocation(pendingLearnerReturnPath);
      }
    },
  });
  const requestedRoleLabel = requestedRoleFilter ? getRoleLabel(requestedRoleFilter) : null;
  const effectiveTrainingRoleLabel = getRoleLabel(effectiveTrainingRoleFilter);
  const reflectionWordCount = reflection.trim().length > 0 ? reflection.trim().split(/\s+/).filter(Boolean).length : 0;
  const reflectionReady = reflection.trim().length >= 20;
  const requiresSlideInteraction = currentStage?.id === "brief" || currentStage?.id === "practice" || currentStage?.id === "apply";
  const canAdvance = currentStage?.id === "brief"
    ? currentStageQuizGatePassed && onLastLessonPage && (!requiresSlideInteraction || slideInteractionPassed)
    : currentStage?.id === "practice"
      ? practiceChoice !== null && currentStageQuizGatePassed && onLastLessonPage && (!requiresSlideInteraction || slideInteractionPassed)
      : currentStage?.id === "apply"
        ? currentStageQuizGatePassed && onLastLessonPage && (!requiresSlideInteraction || slideInteractionPassed)
        : currentStage?.id === "reflect"
          ? reflectionReady && currentStageQuizGatePassed
          : true;
  const atJourneyEnd = Boolean(selectedModule) && moduleIndex === modules.length - 1 && stageIndex === stages.length - 1;
  const shouldReturnToLearnerWorkspace = requestedRoleFilter === "learner" || Boolean(requestedAssignmentId);
  const isDirectModuleLaunch = Boolean(requestedJourneyId || requestedModuleId || requestedAssignmentId);

  useEffect(() => {
    if (location !== "/learner" || requestedLearnerFocus !== "priority-retraining") {
      return;
    }

    const timeout = window.setTimeout(() => revealWorkspaceSection("learner-priority-retraining"), 120);
    return () => window.clearTimeout(timeout);
  }, [location, requestedLearnerFocus, completedAssignmentId, learner.data?.retrainingAssignments?.length]);

  useEffect(() => {
    if (!recentUnlockMoment) {
      return;
    }

    const timeout = window.setTimeout(() => setRecentUnlockMoment(null), 4800);
    return () => window.clearTimeout(timeout);
  }, [recentUnlockMoment]);

  useEffect(() => {
    if (!activeQuizTrigger || quizTriggerDismissed || activeQuizTriggerId || completedQuizTriggerIds.includes(activeQuizTrigger.id)) {
      return;
    }

    setActiveQuizTriggerId(activeQuizTrigger.id);
  }, [activeQuizTrigger, activeQuizTriggerId, completedQuizTriggerIds, quizTriggerDismissed]);

  useEffect(() => {
    if (!activeModalQuizTrigger || completedQuizTriggerIds.includes(activeModalQuizTrigger.id)) {
      return;
    }

    setTrainingWorkspacePage("checkpoint");
    setActiveQuizQuestionIndex(0);

    if (activeModalQuizTrigger.assessmentKey === "briefCheckpoint") {
      setBriefCheckpointAnswers({});
      setBriefCheckpointSubmitted(false);
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "practiceCheckpoint") {
      setPracticeCheckpointAnswers({});
      setPracticeCheckpointSubmitted(false);
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "applicationActivity") {
      setApplicationAnswers({});
      setApplicationSubmitted(false);
      return;
    }

    setFinalQuizAnswers({});
    setFinalQuizSubmitted(false);
  }, [activeModalCheckpointResetKey, completedQuizTriggerIds]);

  const submitSlideInteraction = () => {
    if (!currentSlideInteraction) {
      return true;
    }

    const evaluation = evaluateSlideInteraction(currentSlideInteraction, {
      ...slideInteractionAttempt,
      revealedCardIds,
      elapsedSeconds: timerStartedAt ? Math.max(Math.round((Date.now() - timerStartedAt) / 1000), 0) : undefined,
    });

    setSlideInteractionSubmitted(true);
    setSlideInteractionResult(evaluation);

    if (evaluation.passed) {
      setRecentUnlockMoment({
        title: "Slide unlocked!",
        detail: `${evaluation.score}% interaction score. The next guided page is ready.`,
      });

      if (lessonPageIndex < currentStagePages.length - 1) {
        clearPendingSlideAutoAdvance();
        slideAutoAdvanceTimeoutRef.current = window.setTimeout(() => {
          setLessonPageIndex((value) => Math.min(value + 1, currentStagePages.length - 1));
          slideAutoAdvanceTimeoutRef.current = null;
        }, 900);
      }
    }

    return evaluation.passed;
  };

  const resetSlideInteractionForRetry = () => {
    clearPendingSlideAutoAdvance();
    setSlideInteractionSubmitted(false);
    setSlideInteractionResult(null);
    setSlideInteractionAttempt(buildInitialSlideInteractionAttempt());
    setRevealedCardIds([]);
    setDraggedStepIndex(null);
    setTimerStartedAt(null);
  };

  const goToLessonPage = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= currentStagePages.length || nextIndex === lessonPageIndex) {
      return;
    }

    clearPendingSlideAutoAdvance();
    setBriefTransitionDirection(nextIndex > lessonPageIndex ? "forward" : "backward");
    setLessonPageIndex(nextIndex);
  };

  const advanceLessonPage = () => {
    if (lessonPageIndex >= currentStagePages.length - 1) {
      return;
    }

    if (currentSlideInteraction && !slideInteractionPassed) {
      const passed = submitSlideInteraction();
      if (!passed) {
        return;
      }
      return;
    }

    goToLessonPage(Math.min(lessonPageIndex + 1, currentStagePages.length - 1));
  };

  const retreatLessonPage = () => {
    if (lessonPageIndex <= 0) {
      return;
    }

    goToLessonPage(Math.max(lessonPageIndex - 1, 0));
  };

  const reorderSlideSteps = (fromIndex: number, toIndex: number) => {
    setSlideInteractionAttempt((current) => {
      const currentOrder = [...((current.orderedSteps as string[] | undefined) ?? currentSlideInteraction?.orderedSteps ?? [])];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= currentOrder.length || toIndex >= currentOrder.length) {
        return current;
      }

      const [movedStep] = currentOrder.splice(fromIndex, 1);
      currentOrder.splice(toIndex, 0, movedStep);

      return {
        ...current,
        orderedSteps: currentOrder,
      };
    });
  };

  const advanceStage = () => {
    if (!selectedModule || !canAdvance) {
      return;
    }

    if (stageIndex < stages.length - 1) {
      setStageIndex((value) => value + 1);
      return;
    }

    if (moduleIndex < modules.length - 1) {
      setModuleIndex((value) => value + 1);
      return;
    }

    if (shouldReturnToLearnerWorkspace) {
        const learnerCompletionReturnPath = buildLearnerWorkspaceReturnPath({
          assignmentId: requestedAssignmentId ?? targetedAssignment?.id ?? null,
          moduleId: selectedModule?.id ?? requestedModuleId ?? null,
          focus: requestedAssignmentId ? "priority-retraining" : null,
          freshStart: requestedFreshStart,
        });


      if (tenantId && requestedAssignmentId && targetedAssignment?.status !== "completed") {
        pendingLearnerReturnPathRef.current = learnerCompletionReturnPath;
        completeTrainingAssignment.mutate({
          tenantId,
          assignmentId: requestedAssignmentId,
          status: "completed",
        });
        return;
      }

      pendingLearnerReturnPathRef.current = null;
      setLocation(learnerCompletionReturnPath);
    }
  };

  const retreatStage = () => {
    if (stageIndex > 0) {
      setStageIndex((value) => value - 1);
      return;
    }

    if (moduleIndex > 0) {
      setModuleIndex((value) => value - 1);
    }
  };

  const advanceFromCoachCheckpoint = () => {
    if (!selectedModule) {
      return;
    }

    if (stageIndex < stages.length - 1) {
      setStageIndex((value) => value + 1);
      return;
    }

    if (moduleIndex < modules.length - 1) {
      setModuleIndex((value) => value + 1);
    }
  };

  const submitCoachCheckpointForReview = () => {
    if (!coachCheckpointReady) {
      return;
    }

    const evaluation = evaluateCoachCheckpointResponse(coachCheckpointNote);
    setCoachCheckpointSubmitted(true);

    if (evaluation.passed) {
      setRecentUnlockMoment({
        title: "Checkpoint passed",
        detail: `${evaluation.score}% review score. Advancing to the next training section.`,
      });
      window.setTimeout(() => {
        advanceFromCoachCheckpoint();
      }, 900);
      return;
    }

    setRecentUnlockMoment({
      title: "Checkpoint revision required",
      detail: `${evaluation.score}% review score. Strengthen the response and resubmit before moving forward.`,
    });
  };

  const gradeBriefCheckpoint = () => {
    if (briefAnsweredCount !== briefQuestions.length) {
      return;
    }
    setBriefCheckpointSubmitted(true);
  };

  const retryBriefCheckpoint = () => {
    setBriefCheckpointSubmitted(false);
  };

  const gradePracticeCheckpoint = () => {
    if (practiceAnsweredCount !== practiceQuestions.length) {
      return;
    }
    setPracticeCheckpointSubmitted(true);
  };

  const retryPracticeCheckpoint = () => {
    setPracticeCheckpointSubmitted(false);
  };

  const gradeApplication = () => {
    if (applicationAnsweredCount !== applicationQuestions.length) {
      return;
    }
    setApplicationSubmitted(true);
  };

  const retryApplication = () => {
    setApplicationSubmitted(false);
  };

  const gradeFinalQuiz = () => {
    if (finalQuizAnsweredCount !== finalQuizQuestions.length) {
      return;
    }
    setFinalQuizSubmitted(true);
  };

  const retryFinalQuiz = () => {
    setFinalQuizSubmitted(false);
  };

  const handleModalAnswer = (questionId: string, value: string) => {
    if (!activeModalQuizTrigger) {
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "briefCheckpoint") {
      setBriefCheckpointSubmitted(false);
      setBriefCheckpointAnswers((current) => ({ ...current, [questionId]: value }));
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "practiceCheckpoint") {
      setPracticeCheckpointSubmitted(false);
      setPracticeCheckpointAnswers((current) => ({ ...current, [questionId]: value }));
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "applicationActivity") {
      setApplicationSubmitted(false);
      setApplicationAnswers((current) => ({ ...current, [questionId]: value }));
      return;
    }

    setFinalQuizSubmitted(false);
    setFinalQuizAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleModalSubmit = () => {
    if (!activeModalQuizTrigger) {
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "briefCheckpoint") {
      gradeBriefCheckpoint();
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "practiceCheckpoint") {
      gradePracticeCheckpoint();
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "applicationActivity") {
      gradeApplication();
      return;
    }

    gradeFinalQuiz();
  };

  const handleModalRetry = () => {
    if (!activeModalQuizTrigger) {
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "briefCheckpoint") {
      retryBriefCheckpoint();
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "practiceCheckpoint") {
      retryPracticeCheckpoint();
      return;
    }

    if (activeModalQuizTrigger.assessmentKey === "applicationActivity") {
      retryApplication();
      return;
    }

    retryFinalQuiz();
  };

  const handleInlineAssessmentSubmit = () => {
    if (!activeModalQuizTrigger || !activeModalAssessment) {
      return;
    }

    const questions = activeModalAssessment.questions ?? [];
    const boundedQuestionIndex = Math.max(0, Math.min(activeQuizQuestionIndex, Math.max(questions.length - 1, 0)));
    const currentQuestion = questions[boundedQuestionIndex];
    const currentAnswer = currentQuestion ? activeModalAnswers[currentQuestion.id] ?? "" : "";

    if (!currentQuestion || !hasAssessmentAnswer(currentQuestion, { [currentQuestion.id]: currentAnswer })) {
      return;
    }

    if (boundedQuestionIndex < questions.length - 1) {
      setActiveQuizQuestionIndex(boundedQuestionIndex + 1);
      return;
    }

    handleModalSubmit();
  };

  const handleInlineAssessmentRetry = () => {
    setActiveQuizQuestionIndex(0);
    handleModalRetry();
  };

  const dismissActiveQuizTrigger = () => {
    if (!activeModalQuizTrigger) {
      setActiveQuizTriggerId(null);
      return;
    }

    if (!activeModalPassed) {
      return;
    }

    setRecentUnlockMoment({
      title: `${activeModalQuizTrigger.label} cleared`,
      detail: activeModalQuizTrigger.assessmentKey === "finalQuiz"
        ? "The final quiz is complete, so the learner can close the module with a documented transfer commitment."
        : `The learner has cleared this inline knowledge check and can continue through the guided ${currentStage?.title?.toLowerCase() ?? "training"} flow.`,
    });
    setCompletedQuizTriggerIds((current) => current.includes(activeModalQuizTrigger.id) ? current : [...current, activeModalQuizTrigger.id]);
    setDismissedQuizTriggerIds((current) => current.includes(activeModalQuizTrigger.id) ? current : [...current, activeModalQuizTrigger.id]);
    setActiveQuizTriggerId(null);
  };

  const playerBody = (
    <div className="focus-stack">
        {access.isLoading || learner.isLoading ? <LoadingState /> : null}
        {!learner.isLoading && learner.data && selectedModule ? (
          <div className="space-y-4">
            <PremiumCard className="overflow-hidden">
              <CardContent className="flex h-14 items-center justify-between gap-4 px-4 py-0">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{selectedModuleTitle}</p>
                <div className="hidden shrink-0 items-center gap-2 text-xs font-medium text-slate-300 md:flex">
                  <span>Stage {stageIndex + 1} of {stages.length}</span>
                  <span className="text-slate-600">·</span>
                  <span>{currentStagePages.length > 0 ? `Slide ${lessonPageIndex + 1}/${currentStagePages.length}` : "Ready"}</span>
                  <span className="text-slate-600">·</span>
                  <span>{overallProgress}%</span>
                  <span className="text-slate-600">·</span>
                  <span>{remainingRuntimeMinutes} min left</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFocusedMode(true)}
                  aria-label="Enter focused full-screen mode"
                  className="hidden shrink-0 rounded-full border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20 hover:text-white sm:inline-flex"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Focus
                </Button>
                <Link href={buildLearnerWorkspaceReturnPath({ freshStart: requestedFreshStart })} className="shrink-0">
                  <Button variant="outline" size="sm" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                    Back to learner
                  </Button>
                </Link>
              </CardContent>
            </PremiumCard>
            <div className={`grid gap-4 xl:items-start ${railCollapsed ? (progressRailCollapsed ? "xl:grid-cols-[3.5rem_minmax(0,1fr)_3.5rem]" : "xl:grid-cols-[3.5rem_minmax(0,1fr)_18.75rem]") : (progressRailCollapsed ? "xl:grid-cols-[15rem_minmax(0,1fr)_3.5rem]" : "xl:grid-cols-[15rem_minmax(0,1fr)_18.75rem]")}`}>
              <aside className="xl:sticky xl:top-6">
                <PremiumCard className="h-fit">
                  <CardContent className="space-y-4 p-3">
                    <button
                      type="button"
                      onClick={() => setRailCollapsed((current) => !current)}
                      aria-expanded={!railCollapsed}
                      aria-label={railCollapsed ? "Expand navigation rail" : "Collapse navigation rail"}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-slate-300 transition hover:bg-white/5"
                    >
                      {!railCollapsed ? <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Navigation</span> : null}
                      <ChevronLeft className={`h-4 w-4 shrink-0 transition-transform ${railCollapsed ? "rotate-180" : ""}`} />
                    </button>
                    <div className="space-y-1.5">
                      {!railCollapsed ? <p className="px-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">Stages</p> : null}
                      {stages.map((stage, index) => {
                        const stagePlan = guidedPlan.stageDurations.find((entry) => entry.stageId === stage.id);
                        const isActiveStage = index === stageIndex;
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            title={stage.label}
                            onClick={() => {
                              setStageIndex(index);
                              setLessonPageIndex(0);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${isActiveStage ? "bg-white font-semibold text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.12)]" : "text-slate-200 hover:bg-white/10"}`}
                          >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${isActiveStage ? "bg-slate-950 text-white" : "bg-white/10 text-slate-300"}`}>{index + 1}</span>
                            {!railCollapsed ? (
                              <span className="flex min-w-0 flex-1 items-center justify-between gap-1">
                                <span className="truncate">{stage.label}</span>
                                {stagePlan ? <span className={`shrink-0 text-[10px] uppercase tracking-[0.14em] ${isActiveStage ? "text-slate-600" : "text-cyan-100/70"}`}>{stagePlan.durationLabel}</span> : null}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    {currentStagePages.length > 0 ? (
                      <div className="space-y-1.5 border-t border-white/10 pt-3">
                        {!railCollapsed ? <p className="px-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">Pages</p> : null}
                        {([
                          { key: "brief", label: "Overview" },
                          { key: "lesson", label: "Lesson" },
                          { key: "checkpoint", label: "Checkpoint" },
                          { key: "resources", label: "Resources" },
                        ] as const).map((page) => {
                          const isActivePage = trainingWorkspacePage === page.key;
                          return (
                            <button
                              key={page.key}
                              type="button"
                              title={page.label}
                              onClick={() => setTrainingWorkspacePage(page.key)}
                              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${isActivePage ? "bg-white font-semibold text-slate-950 shadow-[0_10px_24px_rgba(255,255,255,0.12)]" : "text-slate-200 hover:bg-white/10"}`}
                            >
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${isActivePage ? "bg-slate-950 text-white" : "bg-white/10 text-slate-300"}`}>{page.label[0]}</span>
                              {!railCollapsed ? <span className="truncate">{page.label}</span> : null}
                            </button>
                          );
                        })}
                        {curriculumDeck.length ? (
                          <button
                            type="button"
                            title="Curriculum"
                            onClick={openCurriculumViewer}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-300"><BookOpen className="h-3.5 w-3.5" /></span>
                            {!railCollapsed ? (
                              <span className="flex min-w-0 flex-1 items-center justify-between gap-1">
                                <span className="truncate">Curriculum</span>
                                <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-slate-500">{curriculumDeck.length}</span>
                              </span>
                            ) : null}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </PremiumCard>
              </aside>
              <div className="space-y-6">
                <PremiumCard>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-semibold text-white md:text-lg">Lesson canvas · {currentStage?.title}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2 max-w-3xl text-xs leading-5 text-slate-400 md:text-sm">{currentStage?.body}</CardDescription>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">{currentStage?.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {currentStagePages.length > 0 ? (
                      <div className="space-y-4">
                        <div className="command-band px-4 py-3 md:px-5">
                          <div className={trainingWorkspacePage === "brief" ? "mt-3 grid gap-3 xl:grid-cols-[minmax(220px,0.34fr)_minmax(0,1fr)] xl:items-start" : "mt-4 hidden"}>
                            <div className="space-y-3">
                              <div className="context-rail-card px-4 py-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full border-[#1B303C]/10 bg-white text-[#1B303C]">{currentStage?.label}</Badge>
                                  <Badge className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-700">{moduleFamilyLabel}</Badge>
                                </div>
                                <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#4A6373]">Section progress</p>
                                <p className="mt-2 text-sm font-medium text-[#1B303C]">Page {lessonPageIndex + 1} of {currentStagePages.length} in this course section.</p>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
                                  <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(14,165,233,0.95),rgba(16,185,129,0.88))]" style={{ width: `${lessonPageProgress}%` }} />
                                </div>
                                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#4A6373]">{lessonPageProgress}% section complete</p>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                <div className="context-rail-card px-4 py-4">
                                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#4A6373]">Review status</p>
                                  <p className="mt-2 text-sm font-medium text-[#1B303C]">{briefCompletionStatus.statusLabel}</p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#4A6373]">{Math.max(currentStagePages.length - (lessonPageIndex + 1), 0)} lesson steps remaining</p>
                                </div>
                                <div className="context-rail-card px-4 py-4">
                                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#4A6373]">Current runtime</p>
                                  <p className="mt-2 text-sm font-medium text-[#1B303C]">{guidedPlan.stageDurations.find((entry) => entry.stageId === currentStage?.id)?.durationLabel ?? "Stage runtime calibrating"}</p>
                                  <p className="mt-2 text-xs text-[#4A6373]">{activeQuizTrigger ? `Next checkpoint · ${activeQuizTrigger.label}` : "Advance through the card stack to reach the next checkpoint."}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="max-w-2xl">
                                  <p className="text-xs uppercase tracking-[0.22em] text-[#4A6373]">{stageNavigatorLabel}</p>
                                  <h4 className="mt-2 text-lg font-medium text-[#1B303C]">{currentLessonPage?.title ?? currentStageItemLabel}</h4>
                                  <p className="mt-2 text-sm leading-6 text-[#4A6373]">This stage now keeps progress, context, and flash-card review inside one tighter lesson surface so the learner sees the brief and the next move together.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full border-[#1B303C]/10 bg-white text-[#1B303C]">{stageNavigatorLabel}</Badge>
                                  {activeQuizTrigger ? <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700">Upcoming checkpoint · {activeQuizTrigger.label}</Badge> : null}
                                </div>
                              </div>
                              <div key={`${currentStage?.id ?? "stage"}-${lessonPageIndex}`} ref={briefCardRef}>
                                <BriefFlashCardDeck
                                  items={lessonBriefFlashCards}
                                  activeIndex={lessonPageIndex}
                                  isFlipped={lessonFlashCardFlipped}
                                  onFlip={() => setLessonFlashCardFlipped((current) => !current)}
                                  onPrevious={retreatLessonPage}
                                  onNext={advanceLessonPage}
                                  onJumpToIndex={(index) => {
                                    setLessonFlashCardFlipped(false);
                                    setLessonPageIndex(index);
                                  }}
                                  canGoPrevious={lessonPageIndex > 0}
                                  canGoNext={lessonPageIndex < currentStagePages.length - 1}
                                  progressLabel={currentStageItemCountLabel}
                                  statusLabel={currentStage?.id === "brief" ? "Inline lesson flash cards" : `Inline ${stageDisplayLabel.toLowerCase()} flash cards`}
                                  completionLabel={currentStage?.id === "brief" ? "All lesson flash cards reviewed. Move into the knowledge gate when ready." : `All ${stageDisplayLabel.toLowerCase()} flash cards reviewed. Continue when ready.`}
                                  emptyTitle="Lesson flash cards loading"
                                  emptyBody="The current lesson brief will populate as a flash-card sequence once the training content is ready."
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={trainingWorkspacePage === "lesson" && narrationStatus === "playing" ? "sticky bottom-3 z-20 mt-4 rounded-full border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(8,145,178,0.22),rgba(15,23,42,0.96))] px-4 py-2 shadow-[0_14px_35px_rgba(8,15,35,0.28)] backdrop-blur-xl" : "hidden"}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Narration live</Badge>
                              <span className="truncate text-sm text-white">{miniAudioBarTitle}</span>
                            </div>
                            <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white disabled:bg-white/5 disabled:text-slate-500" onClick={stopNarration} disabled={!narrationSupported || narrationStatus === "idle" || narrationStatus === "unsupported"}>
                              <PauseCircle className="mr-2 h-4 w-4" />
                              Stop
                            </Button>
                          </div>
                        </div>
                        {(trainingWorkspacePage === "lesson" || trainingWorkspacePage === "checkpoint" || trainingWorkspacePage === "resources") && currentLessonPage ? (
                          <div className="rounded-[2.1rem] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(15,23,42,0.94))] p-6 shadow-[0_32px_90px_rgba(8,15,35,0.26)] lg:p-8 2xl:p-9">
                            <div className="space-y-6">
                              {/* Slide-forward: the deck slide leads the lesson canvas; the headline, narrative and storyboard follow beneath it. */}
                              {/* On the Practice stage the recall deck stands alone as its own section — the slide
                                  image is suppressed both to cut scroll and so it can't give away the recall answer. */}
                              {activeInteractiveVisual && trainingWorkspacePage === "lesson" && currentStage?.id !== "practice" ? (
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="break-words text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">{activeInteractiveVisual.pageLabel} · {activeInteractiveVisual.sourceDeck}</p>
                                      <p className="mt-1 line-clamp-2 break-words text-sm font-medium leading-snug text-white">{activeInteractiveVisual.title}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <button type="button" onClick={() => setSelectedDeckVisualIndex((current) => Math.max(current - 1, 0))} disabled={activeInteractiveVisualIndex === 0} aria-label="Previous slide" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white transition hover:bg-white/12 disabled:opacity-40">
                                        <ChevronLeft className="h-4 w-4" />
                                      </button>
                                      <span className="text-xs font-medium tabular-nums text-slate-300">Visual {activeInteractiveVisualIndex + 1} of {interactiveGalleryVisuals.length}</span>
                                      <button type="button" onClick={() => setSelectedDeckVisualIndex((current) => Math.min(current + 1, Math.max(interactiveGalleryVisuals.length - 1, 0)))} disabled={activeInteractiveVisualIndex >= interactiveGalleryVisuals.length - 1} aria-label="Next slide" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white transition hover:bg-white/12 disabled:opacity-40">
                                        <ChevronRight className="h-4 w-4" />
                                      </button>
                                      <button type="button" onClick={() => setSlideLightboxOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-[#FCBC34]/30 bg-[#FCBC34]/10 px-3 py-1.5 text-sm font-medium text-[#FCBC34] transition hover:bg-[#FCBC34]/15 hover:text-white">
                                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge
                                      </button>
                                    </div>
                                  </div>
                                  <button type="button" onClick={() => setSlideLightboxOpen(true)} aria-label="Enlarge slide" className="block w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/85 shadow-[0_28px_80px_rgba(2,8,23,0.55)] transition hover:border-[#FCBC34]/40">
                                    <div className="flex aspect-video w-full items-center justify-center bg-black/40 p-2 sm:p-3">
                                      {activeScorecard ? (
                                        <KpiScorecard scorecard={activeScorecard} clientName={kpiProfile.clientName} note={kpiProfile.note} />
                                      ) : (
                                        <TrainingVisualFrame visual={activeInteractiveVisual} />
                                      )}
                                    </div>
                                  </button>
                                  <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3">
                                    <p className="text-sm leading-6 text-slate-300">{activeInteractiveVisual.caption}</p>
                                  </div>
                                  {interactiveGalleryVisuals.length > 1 ? (
                                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                      {interactiveGalleryVisuals.map((thumb, index) => (
                                        <button key={thumb.id} type="button" onClick={() => setSelectedDeckVisualIndex(index)} aria-label={`Go to slide ${index + 1}`} className={`flex aspect-video w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-slate-900 transition ${index === activeInteractiveVisualIndex ? "border-[#FCBC34] ring-1 ring-[#FCBC34]/50" : "border-white/10 opacity-70 hover:opacity-100"}`}>
                                          {thumb.imageUrl ? <img src={thumb.imageUrl} alt={thumb.title} className="h-full w-full object-cover" /> : <span className="text-[10px] text-slate-400">{index + 1}</span>}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              <div>
                                {trainingWorkspacePage === "lesson" ? (
                                currentStage?.id === "practice" ? (
                                  // Practice stage surfaces the active-recall session in place of the page
                                  // narrative; the deck is driven by the module's checkpoint + final-quiz Q&A.
                                  <PracticeRecallSession items={practiceRecallCards} theme="dark" />
                                ) : (
                                <>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentLessonPage.eyebrow}</Badge>
                                  <span className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">{currentLessonPage.visualTone}</span>
                                </div>
                                <h3 className="mt-4 break-words text-xl font-semibold text-white">{currentLessonPage.title}</h3>
                                <p className="mt-3 max-w-[54rem] break-words text-sm leading-7 text-slate-200 2xl:text-[15px]">{currentLessonPage.narrative}</p>
                                {lessonVisualSequence.length ? (
                                  <details className="group mt-6 rounded-[1.7rem] border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Visual storyboard</p>
                                        <p className="mt-2 text-sm text-slate-200">Keep the storyboard hidden until the learner wants supporting sequence detail.</p>
                                      </div>
                                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{lessonVisualSequence.length} step sequence</Badge>
                                    </summary>
                                    <div className="mt-4 grid gap-3 border-t border-cyan-300/15 pt-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                                      {lessonVisualSequence.map((item, index) => (
                                        <div key={item.id} className="rounded-[1.4rem] border border-white/10 bg-slate-950/65 p-4 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                          <div className="flex items-center justify-between gap-3">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/15 text-sm font-semibold text-cyan-100">{index + 1}</span>
                                            <span className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{item.stepLabel}</span>
                                          </div>
                                          <p className="mt-4 text-sm font-medium text-white">{item.title}</p>
                                          <p className="mt-3 text-sm leading-6 text-slate-300">{item.detail}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                ) : null}
                                  <div className="mt-6 grid gap-4 xl:grid-cols-2">

                                  {currentLessonPage.bullets.map((bullet) => (
                                    <div key={bullet} className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 text-sm leading-7 text-slate-200 shadow-[0_18px_45px_rgba(2,8,23,0.18)] xl:min-h-[9rem]">
                                      <div className="flex items-start gap-3">
                                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
                                        <span>{bullet}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                </>
                                )
                                ) : null}
                                {trainingWorkspacePage === "resources" ? (
                                  <div className="mt-6 space-y-4">
                                    <details className="group rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                        <div>
                                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Transcript</p>
                                          <p className="mt-1 text-sm text-white">Open narration controls and the page transcript only when needed.</p>
                                        </div>
                                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Reveal</Badge>
                                      </summary>
                                      <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-500" onClick={playNarrationPreview} disabled={!narrationSupported}>
                                            <PlayCircle className="mr-2 h-4 w-4" />
                                            Play lesson narration
                                          </Button>
                                          <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white disabled:bg-white/5 disabled:text-slate-500" onClick={stopNarration} disabled={!narrationSupported || narrationStatus === "idle" || narrationStatus === "unsupported"}>
                                            <PauseCircle className="mr-2 h-4 w-4" />
                                            Stop preview
                                          </Button>
                                          <Select value={narrationRate} onValueChange={setNarrationRate}>
                                            <SelectTrigger className="w-[170px] border-white/10 bg-slate-950/80 text-slate-100">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="0.85">Slow · 0.85x</SelectItem>
                                              <SelectItem value="0.95">Balanced · 0.95x</SelectItem>
                                              <SelectItem value="1">Standard · 1.0x</SelectItem>
                                              <SelectItem value="1.1">Energetic · 1.1x</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
                                          <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Lesson narration script</p>
                                          <div className="mt-3 max-h-[16rem] overflow-y-auto pr-2 text-sm leading-7 text-slate-100 break-words">{narrationScript}</div>
                                        </div>
                                        <p className="text-sm text-slate-400">{narrationStatus === "playing" ? "Reading the current lesson script aloud." : narrationStatus === "ended" ? "Finished reading the current lesson script." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "Ready to read the current lesson script as audio."}</p>
                                      </div>
                                    </details>
                                    {currentLessonPage.speakerNotes?.length ? (
                                      <details className="group rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-4">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                          <div>
                                            <p className="text-xs uppercase tracking-[0.22em] text-amber-100/90">Coach notes</p>
                                            <p className="mt-1 text-sm text-white">Speaker and facilitator notes stay out of the learner flow until opened.</p>
                                          </div>
                                          <Badge className="rounded-full border-amber-200/30 bg-white/10 text-amber-100">Reveal</Badge>
                                        </summary>
                                        <div className="mt-4 space-y-3 border-t border-amber-200/20 pt-4 text-sm leading-7 text-slate-100 break-words">
                                          {currentLessonPage.speakerNotes.map((note) => (
                                            <p key={note}>{note}</p>
                                          ))}
                                        </div>
                                      </details>
                                    ) : null}
                                    {curriculumDeck.length ? (
                                      <button type="button" onClick={openCurriculumViewer} className="flex w-full items-center justify-between gap-3 rounded-[1.5rem] border border-[#FCBC34]/25 bg-[#FCBC34]/10 px-5 py-4 text-left text-white transition hover:bg-[#FCBC34]/15">
                                        <span>
                                          <span className="text-xs uppercase tracking-[0.22em] text-[#FCBC34]">Curriculum</span>
                                          <span className="mt-1 block text-sm text-slate-200">Open the mapped slide deck for this module · {curriculumDeck.length} slides</span>
                                        </span>
                                        <BookOpen className="h-5 w-5 shrink-0 text-[#FCBC34]" />
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                                {currentSlideInteraction && trainingWorkspacePage === "checkpoint" ? (
                                  <div className="mt-6 rounded-[1.8rem] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,23,42,0.86))] p-5 shadow-[0_24px_60px_rgba(5,46,22,0.18)] sm:p-6">
                                    <div className="gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">Knowledge check</p>
                                          <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{currentSlideInteraction.kind.replaceAll("_", " ")}</Badge>
                                        </div>
                                        <h4 className="mt-3 text-lg font-medium text-white sm:text-[1.35rem]">{currentSlideInteraction.title}</h4>
                                        <div className="mt-3 max-w-3xl space-y-2">
                                          <p className="text-sm leading-6 text-slate-100">{currentSlideInteraction.prompt}</p>
                                          <p className="text-sm leading-6 text-slate-300">{currentSlideInteraction.instructions}</p>
                                        </div>
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                                        <div className="rounded-[1.15rem] border border-white/10 bg-slate-950/45 px-4 py-3">
                                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Passing threshold</p>
                                          <p className="mt-2 text-sm font-medium text-white">Pass at {currentSlideInteraction.passingPercent}%</p>
                                        </div>
                                        <div className="rounded-[1.15rem] border border-white/10 bg-slate-950/45 px-4 py-3">
                                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Progress</p>
                                          <p className="mt-2 text-sm font-medium text-white">{slideInteractionProgress}% complete</p>
                                        </div>
                                        <div className="rounded-[1.15rem] border border-white/10 bg-slate-950/45 px-4 py-3">
                                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Interaction style</p>
                                          <p className="mt-2 text-sm font-medium text-white">{currentSlideInteraction.kind.replaceAll("_", " ")}</p>
                                        </div>
                                      </div>
                                    </div>
                                    {currentSlideInteraction.kind === "click_to_reveal" ? (
                                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        {currentSlideInteraction.revealCards?.map((card) => {
                                          const isRevealed = revealedCardIds.includes(card.id);
                                          return (
                                            <button
                                              key={card.id}
                                              type="button"
                                              onClick={() => {
                                                setRevealedCardIds((current) => current.includes(card.id) ? current : [...current, card.id]);
                                                setSlideInteractionAttempt((current) => ({
                                                  ...current,
                                                  revealedCardIds: current.revealedCardIds?.includes(card.id)
                                                    ? current.revealedCardIds
                                                    : [...(current.revealedCardIds ?? []), card.id],
                                                }));
                                              }}
                                              className={`flex h-full min-h-[12rem] flex-col justify-between rounded-[1.4rem] border p-4 text-left transition ${isRevealed ? "border-emerald-400/30 bg-emerald-400/12" : "border-white/10 bg-slate-950/65 hover:bg-white/8"}`}
                                            >
                                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{card.title}</p>
                                              <p className="mt-3 break-words text-sm font-medium text-white">{isRevealed ? card.detail : "Tap to reveal this cue"}</p>
                                              <p className="mt-2 text-xs text-slate-400">{isRevealed ? "Unlocked" : "Hidden until you open it"}</p>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                    {["multiple_choice", "branching_scenario", "simulation", "timed_challenge"].includes(currentSlideInteraction.kind) ? (
                                      <div className="mt-4 grid gap-3">
                                        {currentSlideInteraction.choices?.map((choice) => {
                                          const isSelected = slideInteractionAttempt.selectedChoiceId === choice.id;
                                          return (
                                            <button
                                              key={choice.id}
                                              type="button"
                                              onClick={() => {
                                                armTimedChallengeWindow();
                                                setSlideInteractionAttempt((current) => ({ ...current, selectedChoiceId: choice.id }));
                                              }}
                                              className={`min-w-0 overflow-hidden rounded-[1.35rem] border p-4 text-left transition ${isSelected ? "border-cyan-400/40 bg-cyan-400/12" : "border-white/10 bg-slate-950/65 hover:bg-white/8"}`}
                                            >
                                              <p className="break-words text-sm font-medium text-white">{choice.label}</p>
                                              <p className="mt-2 break-words text-sm leading-6 text-slate-300">{choice.detail}</p>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                    {["short_answer", "role_play"].includes(currentSlideInteraction.kind) ? (
                                      <div className="mt-4 space-y-3">
                                        <Textarea
                                          value={currentSlideInteraction.kind === "role_play" ? (slideInteractionAttempt.rolePlayAnswer ?? "") : (slideInteractionAttempt.shortAnswer ?? "")}
                                          onChange={(event) => setSlideInteractionAttempt((current) => ({
                                            ...current,
                                            [currentSlideInteraction.kind === "role_play" ? "rolePlayAnswer" : "shortAnswer"]: event.target.value,
                                          }))}
                                          className="min-h-[140px] border-white/10 bg-slate-950/75 text-slate-100 placeholder:text-slate-500"
                                          placeholder={currentSlideInteraction.sampleAnswer ?? "Type your learner response here."}
                                        />
                                        {currentSlideInteraction.sampleAnswer ? <p className="text-xs leading-5 text-slate-400">Example pattern: {currentSlideInteraction.sampleAnswer}</p> : null}
                                      </div>
                                    ) : null}
                                    {currentSlideInteraction.kind === "match_the_term" ? (
                                      <div className="mt-5 space-y-4">
                                        <div className="rounded-[1.35rem] border border-cyan-400/20 bg-slate-950/45 p-4">
                                          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/75">Match bank</p>
                                          <p className="mt-2 text-sm leading-6 text-slate-300">Review the available training terms first, then assign the right explanation to each field below.</p>
                                          <div className="mt-3 grid gap-3 lg:grid-cols-3">
                                            {currentSlideInteraction.choices?.map((choice) => (
                                              <div key={choice.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
                                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{choice.label}</p>
                                                <p className="mt-2 text-sm leading-6 text-white">{choice.detail}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="grid gap-3 lg:grid-cols-3">
                                          {[
                                            { key: "cue", label: "Behavior cue" },
                                            { key: "proof", label: "Proof point" },
                                            { key: "timing", label: "Timing cue" },
                                          ].map((matchField) => (
                                            <div key={matchField.key} className="rounded-[1.35rem] border border-white/10 bg-slate-950/65 p-4">
                                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{matchField.label}</p>
                                              <Select
                                                value={slideInteractionAttempt.matchedPairs?.[matchField.key] ?? "unselected"}
                                                onValueChange={(value) => setSlideInteractionAttempt((current) => ({
                                                  ...current,
                                                  matchedPairs: {
                                                    ...(current.matchedPairs ?? {}),
                                                    [matchField.key]: value === "unselected" ? undefined : value,
                                                  },
                                                }))}
                                              >
                                                <SelectTrigger className="mt-3 min-h-[3rem] border-white/10 bg-slate-950/80 text-slate-100">
                                                  <SelectValue placeholder="Choose a matching card" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="unselected">Choose a matching card</SelectItem>
                                                  {currentSlideInteraction.choices?.map((choice) => (
                                                    <SelectItem key={choice.id} value={choice.id}>{choice.label} — {choice.detail}</SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                    {currentSlideInteraction.kind === "drag_and_drop" ? (
                                      <div className="mt-4 grid gap-3">
                                        {(slideInteractionAttempt.orderedSteps ?? currentSlideInteraction.orderedSteps ?? []).map((step: string, index: number) => (
                                          <div
                                            key={`${currentLessonPage.id}-${step}`}
                                            draggable
                                            onDragStart={() => setDraggedStepIndex(index)}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={() => {
                                              if (draggedStepIndex === null) {
                                                return;
                                              }
                                              reorderSlideSteps(draggedStepIndex, index);
                                              setDraggedStepIndex(null);
                                            }}
                                            className="rounded-[1.35rem] border border-white/10 bg-slate-950/65 p-4"
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                              <div>
                                                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Sequence step {index + 1}</p>
                                                <p className="mt-2 text-sm font-medium text-white">{step}</p>
                                              </div>
                                              <div className="flex gap-2">
                                                <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white" onClick={() => reorderSlideSteps(index, Math.max(index - 1, 0))}>Up</Button>
                                                <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white" onClick={() => reorderSlideSteps(index, Math.min(index + 1, (slideInteractionAttempt.orderedSteps ?? currentSlideInteraction.orderedSteps ?? []).length - 1))}>Down</Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                    <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <Button type="button" className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100" onClick={submitSlideInteraction}>
                                          {slideInteractionSubmitted ? (slideInteractionPassed ? "Passed" : "Check again") : "Check understanding"}
                                        </Button>

                                        <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 px-5 text-white hover:bg-white/12 hover:text-white" onClick={resetSlideInteractionForRetry}>
                                          Review lesson and retry
                                        </Button>

                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="rounded-full border-white/12 bg-white/6 px-5 text-white hover:bg-white/12 hover:text-white"
                                          onClick={() => setKnowledgeCheckSuccessSoundMuted((current) => !current)}
                                        >
                                          {knowledgeCheckSuccessSoundMuted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                                          {knowledgeCheckSuccessSoundMuted ? "Knowledge-check sound muted" : "Knowledge-check sound on"}
                                        </Button>

                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="rounded-full border-white/12 bg-white/6 px-5 text-white hover:bg-white/12 hover:text-white"
                                          onClick={() => setKnowledgeCheckCelebrationMotionReduced((current) => !current)}
                                        >
                                          {knowledgeCheckCelebrationMotionReduced ? <PauseCircle className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                          {getLearnerFeedbackMotionLabel(knowledgeCheckCelebrationMotionReduced)}
                                        </Button>
                                      </div>

                                      {currentSlideInteraction.kind === "timed_challenge" && currentSlideInteraction.timeLimitSeconds ? (
                                        <span className="text-sm leading-6 text-slate-300">Timer limit: {currentSlideInteraction.timeLimitSeconds} seconds after your first answer selection.</span>
                                      ) : null}
                                    </div>
                                    {slideInteractionSubmitted && slideInteractionResult ? (
                                      <div className={`relative mt-4 overflow-hidden rounded-[1.45rem] border p-4 ${slideInteractionPassed ? "border-emerald-400/25 bg-emerald-500/10" : "border-amber-400/25 bg-amber-500/10"}`}>
                                        <CorrectAnswerCelebration active={slideInteractionCelebrationActive && !knowledgeCheckCelebrationMotionReduced} compact />
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            <p className={`text-[11px] uppercase tracking-[0.22em] ${slideInteractionPassed ? "text-emerald-200/85" : "text-amber-200/85"}`}>Knowledge-check result</p>
                                            <p className={`mt-2 text-lg font-semibold ${slideInteractionPassed ? "text-emerald-50" : "text-amber-50"}`}>{slideInteractionResult.score}% · {slideInteractionPassed ? "Passed" : "Retry required"}</p>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge className={`rounded-full ${slideInteractionPassed ? "border-emerald-300/30 bg-emerald-300/18 text-emerald-50" : "border-amber-300/30 bg-amber-300/18 text-amber-50"}`}>{slideInteractionPassed ? currentSlideInteraction.successMessage : currentSlideInteraction.retryMessage}</Badge>
                                            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium ${knowledgeCheckSuccessSoundMuted ? "bg-slate-800/80 text-slate-200" : "bg-emerald-300/18 text-emerald-50"}`}>
                                              {knowledgeCheckSuccessSoundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                              {knowledgeCheckSuccessSoundMuted ? "Knowledge-check sound muted" : "Knowledge-check sound ready"}
                                            </div>
                                            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium ${getLearnerFeedbackStatusClass({
                                              soundMuted: false,
                                              reducedMotion: knowledgeCheckCelebrationMotionReduced,
                                              mutedClass: "bg-slate-800/80 text-slate-200",
                                              activeClass: "bg-emerald-300/18 text-emerald-50",
                                            })}`}>
                                              {knowledgeCheckCelebrationMotionReduced ? <PauseCircle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                                              {getLearnerFeedbackMotionStatus(knowledgeCheckCelebrationMotionReduced)}
                                            </div>
                                          </div>
                                          </div>
                                          <p className={`mt-3 text-xs leading-5 ${slideInteractionPassed ? "text-emerald-100/85" : "text-amber-100/85"}`}>
                                            {getLearnerFeedbackStatusLabel({
                                              soundMuted: knowledgeCheckSuccessSoundMuted,
                                              reducedMotion: knowledgeCheckCelebrationMotionReduced,
                                            })}. {getLearnerFeedbackDescription(knowledgeCheckCelebrationMotionReduced)}
                                          </p>
                                        {slideInteractionResult.strengths?.length ? (
                                          <div className="mt-3 space-y-2 text-sm leading-6 text-emerald-100">
                                            {slideInteractionResult.strengths.map((strength: string) => <p key={strength}>{strength}</p>)}
                                          </div>
                                        ) : null}
                                        {slideInteractionResult.hints?.length ? (
                                          <div className="mt-3 space-y-2 text-sm leading-6 text-amber-100">
                                            {slideInteractionResult.hints.map((hint: string) => <p key={hint}>Hint: {hint}</p>)}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-slate-300">
                                        Pass this knowledge check before the next lesson step unlocks. If you miss the threshold, use the hint, review the page content, and retry.
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                                {lessonSignalCards.length && trainingWorkspacePage === "checkpoint" ? (
                                  <div className="mt-6 grid grid-cols-3 gap-2">
                                    {lessonSignalCards.map((signal) => (
                                      <div key={`${currentLessonPage.id}-${signal.label}`} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2.5">
                                        <p className="text-base font-semibold leading-none text-white">{signal.value}</p>
                                        <p className="mt-1 line-clamp-1 text-[11px] leading-tight text-slate-300">{signal.label}</p>
                                        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-cyan-100/70">Benchmark {signal.benchmark ?? "—"}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>

                            </div>
                          </div>
                        ) : null}
                        {insightCharts.length && trainingWorkspacePage === "resources" ? (
                          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                            <button type="button" onClick={() => setEvidenceOpen((current) => !current)} aria-expanded={evidenceOpen} className="flex w-full cursor-pointer items-center justify-between gap-3 text-left">
                              <div className="max-w-2xl">
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Evidence graphics</p>
                                <p className="mt-2 text-base font-medium text-white">View evidence</p>
                                <p className="mt-1 text-sm leading-6 text-slate-300">Open the measurable-behavior and benchmark charts when you want the supporting detail.</p>
                              </div>
                              <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{insightCharts.length} charts</Badge>
                            </button>
                            {evidenceOpen ? (
                              <div className="mt-5 grid gap-5 2xl:grid-cols-2">
                              {insightCharts.map((chart) => {
                                const latestPoint = chart.data[chart.data.length - 1];
                                const chartType = chart.chartType ?? (chart.data.every((point: any) => !point.benchmark) ? "trend" : "comparison");
                                return (
                                  <div key={chart.id} className="rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.78))] p-5 shadow-[0_22px_60px_rgba(8,15,35,0.24)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="max-w-lg">
                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lesson graph</p>
                                        <h4 className="mt-2 text-lg font-medium text-white">{chart.title}</h4>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">{chart.description}</p>
                                      </div>
                                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{chart.metricLabel}</Badge>
                                    </div>
                                      <div className="mt-4 grid gap-3 sm:grid-cols-2">

                                      <div className="rounded-[1.15rem] border border-white/10 bg-slate-950/60 px-4 py-3">
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Latest mapped point</p>
                                        <p className="mt-2 text-lg font-semibold text-white">{latestPoint?.value ?? "—"}</p>
                                        <p className="mt-1 text-sm text-slate-400">{latestPoint?.label ?? "Current lesson cue"}</p>
                                      </div>
                                      <div className="rounded-[1.15rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Benchmark contrast</p>
                                        <p className="mt-2 text-lg font-semibold text-white">{latestPoint?.benchmark ?? "—"}</p>
                                        <p className="mt-1 text-sm text-cyan-100/80">Reference target in the same frame</p>
                                      </div>
                                    </div>
                                      <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-slate-950/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                        <ChartContainer
                                          className="h-60"
                                          config={{
                                            value: { label: chart.metricLabel, color: "#67e8f9" },
                                            benchmark: { label: "Benchmark", color: "#e2e8f0" },
                                          }}
                                        >
                                          {chartType === "comparison" ? (
                                            <BarChart data={chart.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                              <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.14)" />
                                              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
                                              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                              <ChartTooltip
                                                content={<ChartTooltipContent indicator="dashed" />}
                                                cursor={{ fill: "rgba(148,163,184,0.08)" }}
                                              />
                                              <ChartLegend content={<ChartLegendContent />} />
                                              <Bar dataKey="value" fill="var(--color-value)" radius={[10, 10, 0, 0]} />
                                              <Bar dataKey="benchmark" fill="var(--color-benchmark)" radius={[10, 10, 0, 0]} />
                                            </BarChart>
                                          ) : (
                                            <AreaChart data={chart.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                              <defs>
                                                <linearGradient id={`gradient-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.45} />
                                                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.03} />
                                                </linearGradient>
                                              </defs>
                                              <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.14)" />
                                              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                              <ChartTooltip
                                                content={<ChartTooltipContent indicator="dashed" />}
                                                cursor={{ stroke: "rgba(56,189,248,0.25)", strokeWidth: 1 }}
                                              />
                                              <ChartLegend content={<ChartLegendContent />} />
                                              <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill={`url(#gradient-${chart.id})`} strokeWidth={3} />
                                              <Line type="monotone" dataKey="benchmark" stroke="var(--color-benchmark)" strokeDasharray="4 4" dot={{ r: 3, fill: "var(--color-benchmark)" }} activeDot={{ r: 4 }} />
                                            </AreaChart>
                                          )}
                                        </ChartContainer>
                                      </div>
                                      {chart.insightNote ? (
                                        <div className="mt-4 rounded-[1.25rem] border border-cyan-400/15 bg-cyan-400/10 px-4 py-3 text-sm leading-6 text-cyan-50">
                                          {chart.insightNote}
                                        </div>
                                      ) : null}

                                  </div>
                                );
                              })}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {trainingWorkspacePage === "checkpoint" && !activeModalQuizTrigger && currentStage?.id === "brief" ? (
                      <div className="space-y-5">
                        <div className="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="max-w-2xl">
                              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Presentation overview</p>
                              <h3 className="mt-2 text-xl font-semibold text-white">{presentation?.heroTitle}</h3>
                              <p className="mt-3 text-sm leading-6 text-slate-200">{presentation?.heroSummary}</p>
                            </div>
                            <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                              <p className="font-medium text-white">Evidence label</p>
                              <p className="mt-1">{presentation?.evidenceLabel}</p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Checkpoint pacing</p>
                            <Badge className={`rounded-full ${briefPassed ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/8 text-slate-200"}`}>{briefPassed ? "Knowledge gate passed" : "Knowledge gate pending"}</Badge>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-100">Knowledge checks now appear in the lesson shell itself while the learner moves through the guided content. Continue through the narrated pages to trigger the next comprehension checkpoint.</p>
                          {!onLastLessonPage ? <p className="mt-3 text-sm text-amber-200">Continue through the remaining lesson pages to reach the next inline knowledge check.</p> : null}
                        </div>
                      </div>
                    ) : null}

                    {trainingWorkspacePage === "checkpoint" && !activeModalQuizTrigger && currentStage?.id === "practice" ? (
                      <div className="space-y-4">
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Practice scenario</p>
                          <h4 className="mt-2 text-lg font-medium text-white">{presentation?.practiceScenario.title}</h4>
                          <p className="mt-3 text-sm leading-6 text-slate-300">{presentation?.practiceScenario.situation}</p>
                          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                            <p className="text-sm font-medium text-white">Learner task</p>
                            <p className="mt-2 text-sm leading-6 text-slate-200">{presentation?.practiceScenario.learnerTask}</p>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            {presentation?.practiceScenario.successSignals.map((signal) => (
                              <div key={signal} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">{signal}</div>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {[
                            { id: "coach_first", title: "Manager-led rehearsal", body: "Practice the behavior with guided feedback before taking it into production work." },
                            { id: "peer_shadow", title: "Shadow and self-correct", body: "Observe a strong example, then mirror the behavior and capture one adjustment." },
                          ].map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setPracticeChoice(option.id as "coach_first" | "peer_shadow")}
                              className={`rounded-[1.6rem] border p-5 text-left transition ${practiceChoice === option.id ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}
                            >
                              <p className="text-lg font-medium text-white">{option.title}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-300">{option.body}</p>
                            </button>
                          ))}
                        </div>
                        <div className="rounded-[1.6rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/70">Practice gate</p>
                            <Badge className={`rounded-full ${practicePassed ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/8 text-slate-200"}`}>{practicePassed ? "Rehearsal gate passed" : "Rehearsal gate pending"}</Badge>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-100">The rehearsal checkpoint now appears inline inside the guided practice flow, keeping the learner focused on one question at a time before continuing.</p>
                          {!practiceChoice ? <p className="mt-3 text-sm text-amber-200">Choose a rehearsal mode before the next step can unlock.</p> : null}
                          {!onLastLessonPage ? <p className="mt-3 text-sm text-amber-200">Review each practice page to trigger the next inline knowledge check.</p> : null}
                        </div>
                      </div>
                    ) : null}

                    {trainingWorkspacePage === "checkpoint" && !activeModalQuizTrigger && currentStage?.id === "apply" ? (
                      <div className="space-y-4">
                        <div className="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Transfer gate</p>
                            <Badge className={`rounded-full ${applicationPassed ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/8 text-slate-200"}`}>{applicationPassed ? "Transfer gate passed" : "Transfer gate pending"}</Badge>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-100">Application checks now surface inline so the learner proves they can transfer the lesson into live work before the module advances.</p>
                          {!onLastLessonPage ? <p className="mt-3 text-sm text-amber-200">Finish the current guided page to unlock the application checkpoint.</p> : null}
                        </div>
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Live-work transfer</p>
                          <p className="mt-3 text-base leading-7 text-slate-200">Apply this module to <span className="font-medium text-white">{learner.data.assignedInterventions[0]?.title ?? "your active intervention plan"}</span>{launchedAsset ? <> while grounding the rehearsal in <span className="font-medium text-white">{launchedAsset.title}</span></> : null} and use the mapped resources below to reinforce the behavior in context.</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {supportingAssets.map((asset: any) => (
                            <div key={asset.id} className="rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-5">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`rounded-full ${asset.sourceKind === "client_upload" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-cyan-500/20 bg-cyan-500/10 text-cyan-200"}`}>{asset.sourceKind === "client_upload" ? "Client content" : "CHCG content"}</Badge>
                                <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{asset.format}</Badge>
                              </div>
                              <h4 className="mt-3 text-lg font-medium text-white">{asset.title}</h4>
                              <p className="mt-2 text-sm leading-6 text-slate-300">{asset.summary}</p>
                              <p className="mt-3 text-sm text-slate-400">Source: {asset.sourceLabel}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {trainingWorkspacePage === "checkpoint" && !activeModalQuizTrigger && currentStage?.id === "reflect" ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Coach prompts</p>
                            <div className="mt-4 space-y-3">
                              {presentation?.coachPrompts.map((prompt) => (
                                <div key={prompt} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                                  <span>{prompt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Reflection prompts</p>
                            <div className="mt-4 space-y-3">
                              {presentation?.reflectionPrompts.map((prompt) => (
                                <div key={prompt} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
                                  <span>{prompt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                          <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm leading-6 text-slate-300">Write the behavior you want your coach or manager to observe next.</p>
                              <Badge className={`rounded-full ${reflectionReady ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/8 text-slate-200"}`}>{reflectionReady ? "Transfer commitment ready" : "Commitment still forming"}</Badge>
                            </div>
                            <Textarea
                              value={reflection}
                              onChange={(event) => setReflection(event.target.value)}
                              rows={5}
                              className="w-full rounded-2xl border-white/10 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500"
                              placeholder="Example: I will shorten my verification phrasing, confirm the next action clearly, and document the outcome before ending the interaction."
                            />
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Commitment depth</p>
                                <p className="mt-2 text-lg font-semibold text-white">{reflectionWordCount}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-400">Words currently captured in the behavior pledge.</p>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Coach visibility</p>
                                <p className="mt-2 font-medium text-white">{reflectionReady ? "Observable next behavior is named." : "Add a visible behavior and proof point."}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-400">A strong reflection should describe what a coach can hear, see, or verify next.</p>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Module close state</p>
                                <p className="mt-2 font-medium text-white">{finalQuizPassed ? "Final quiz complete." : "Final quiz still pending."}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-400">Both the reflection pledge and the final quiz are required before the lesson closes.</p>
                              </div>
                            </div>
                            {!reflectionReady ? <p className="text-sm text-amber-300">Add a more concrete behavior commitment before the module can be completed.</p> : null}
                          </div>
                          <div className="space-y-4">
                            <div className="rounded-[1.6rem] border border-amber-400/20 bg-amber-400/10 p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs uppercase tracking-[0.22em] text-amber-100/70">Final quiz</p>
                                <Badge className={`rounded-full ${finalQuizPassed ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/8 text-slate-200"}`}>{finalQuizPassed ? "Final quiz passed" : "Final quiz pending"}</Badge>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-slate-100">The end-of-module quiz now appears as an inline final quiz, giving the module a cleaner finish and keeping the reflection space focused on commitment and transfer.</p>
                              <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-200">
                                {finalQuizPassed ? "The learner has cleared the final knowledge check and only needs a presentation-ready transfer commitment to close the module." : "Once the learner passes the final quiz, this reflection step becomes the proof that the lesson can transfer into coached behavior."}
                              </div>
                            </div>
                            <div className={`rounded-[1.6rem] border p-5 ${recentUnlockMoment ? "border-emerald-400/20 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
                              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Progression cue</p>
                              <p className="mt-3 text-sm font-medium text-white">{recentUnlockMoment?.title ?? "Clear the active inline quiz to surface the next achievement cue here."}</p>
                              <p className={`mt-3 text-sm leading-6 ${recentUnlockMoment ? "text-emerald-100" : "text-slate-300"}`}>{recentUnlockMoment?.detail ?? "This gives the reflection stage a visible sense of accomplishment instead of ending only with a static pass/fail state."}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className={trainingWorkspacePage === "checkpoint" ? "flex flex-wrap items-center justify-between gap-3" : "hidden"}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={retreatStage}
                        disabled={moduleIndex === 0 && stageIndex === 0}
                        className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                      >
                        Previous step
                      </Button>
                      <div className="flex items-center gap-3">
                        {activeQuizTrigger && !quizTriggerDismissed && !activeModalPassed ? <span className="text-sm text-amber-300">Assessment active: complete the inline quiz to continue.</span> : null}
                        {atJourneyEnd && canAdvance ? <span className="text-sm text-emerald-300">{shouldReturnToLearnerWorkspace ? "Training complete. Return to learner workspace." : "Training preview complete."}</span> : null}
                        <Button
                          type="button"
                          onClick={advanceStage}
                          disabled={!canAdvance || completeTrainingAssignment.isPending}
                          className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-400"
                        >
                          {completeTrainingAssignment.isPending
                            ? "Saving completion..."
                            : stageIndex === stages.length - 1 && moduleIndex < modules.length - 1
                              ? "Next module"
                              : atJourneyEnd
                                ? shouldReturnToLearnerWorkspace
                                  ? "Return to learner workspace"
                                  : "Preview complete"
                                : "Next step"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {trainingWorkspacePage === "checkpoint" && activeModalQuizTrigger ? (
                      <InlineAssessmentShell
                        moduleTitle={selectedModule?.title ?? currentStage?.title ?? "Training module"}
                        stageLabel={currentStage?.label ?? "Guided lesson"}
                        stagePages={currentStagePages.map((page: any) => ({ id: page.id, title: page.title }))}
                        trigger={activeModalQuizTrigger}
                        assessment={activeModalAssessment}
                        answers={activeModalAnswers}
                        submitted={activeModalQuizTrigger?.assessmentKey === "briefCheckpoint" ? briefCheckpointSubmitted : activeModalQuizTrigger?.assessmentKey === "practiceCheckpoint" ? practiceCheckpointSubmitted : activeModalQuizTrigger?.assessmentKey === "applicationActivity" ? applicationSubmitted : finalQuizSubmitted}
                        score={activeModalScore}
                        passed={activeModalPassed}
                        activeQuestionIndex={activeQuizQuestionIndex}
                        disabled={false}
                        onAnswer={handleModalAnswer}
                        onSubmit={handleInlineAssessmentSubmit}
                        onRetry={handleInlineAssessmentRetry}
                        onReturn={dismissActiveQuizTrigger}
                      />
                    ) : null}
                  </CardContent>
                </PremiumCard>

                <PremiumCard className={trainingWorkspacePage === "resources" ? "overflow-hidden" : "hidden overflow-hidden"}>
                  <CardHeader className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.32))]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="max-w-2xl">
                        <CardTitle className="text-white">Deep resources and transfer actions</CardTitle>
                        <CardDescription className="mt-2 text-slate-300">The training now carries more of the underlying presentation substance into visible resources, coaching moves, evidence labels, and role-ready follow-through actions.</CardDescription>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{presentation?.resourceActions.length ?? 0} transfer prompts embedded</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-sm font-medium text-white">CHCG structure</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">Core methodology sets the skill objective, instructional framing, and behavior expectations.</p>
                        </div>
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-sm font-medium text-white">Tenant context</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">Client-uploaded content provides scenario language, launch specifics, and operational cues that localize the lesson.</p>
                        </div>
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-sm font-medium text-white">Observable output</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">Every lesson ends with a behavior commitment that can roll into coaching logs, interventions, and review evidence.</p>
                        </div>
                      </div>
                      <div className="rounded-[1.7rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">Why this matters in-product</p>
                        <h4 className="mt-3 text-lg font-medium text-white">The course now closes with explicit transfer architecture</h4>
                        <p className="mt-3 text-sm leading-7 text-slate-100">Learners leave each module with observable actions, managers get coaching-ready prompts, and the platform preserves a visible bridge between source training material and operational follow-through.</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/45 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/75">Narration proof</p>
                            <p className="mt-2 text-sm text-white">Each guided page carries voice-ready script support rather than detached audio-only playback.</p>
                          </div>
                          <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/45 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/75">Checkpoint proof</p>
                            <p className="mt-2 text-sm text-white">Modal quiz gates confirm comprehension before learners move into the next stage.</p>
                          </div>
                          <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/45 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/75">Coaching proof</p>
                            <p className="mt-2 text-sm text-white">Reflection commitments and coach prompts stay visible for manager follow-through.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {presentation?.resourceActions.map((resource, index) => (
                        <div key={resource.id} className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.78),rgba(15,23,42,0.62))] p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Transfer action</p>
                            <div className="flex items-center gap-2">
                              <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Outcome pack</Badge>
                              <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{String(index + 1).padStart(2, "0")}</Badge>
                            </div>
                          </div>
                          <h4 className="mt-3 text-lg font-medium text-white">{resource.label}</h4>
                          <p className="mt-3 text-sm leading-6 text-slate-300">{resource.detail}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">Narration-ready handoff</Badge>
                            <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">Coach follow-through</Badge>
                            <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">Operational proof</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </PremiumCard>
              </div>

              <PremiumCard className="2xl:sticky 2xl:top-6 h-fit">
                {progressRailCollapsed ? (
                  <CardContent className="flex flex-col items-center gap-2 p-2">
                    <button type="button" onClick={() => setProgressRailCollapsed(false)} aria-label="Expand progress rail" title="Progress rail" className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{finalQuizSubmitted ? `${activeModalScore}%` : `${selectedModule?.completionRate ?? learner.data.activeJourney.progress}%`}</span>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-2">
                          <CardTitle className="text-white">Progress rail</CardTitle>
                          <CardDescription className="text-slate-400">Keep the next action, runtime, and current score visible while the lesson stays centered.</CardDescription>
                        </div>
                        <button type="button" onClick={() => setProgressRailCollapsed(true)} aria-label="Collapse progress rail" className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Next</p>
                        <p className="mt-2 text-sm font-medium text-white">{activeQuizTrigger ? activeQuizTrigger.label : nextRecommendedModule?.title ?? "Continue the current lesson"}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Time left</p>
                        <p className="mt-2 text-sm font-medium text-white">{guidedPlan.stageDurations.find((entry) => entry.stageId === currentStage?.id)?.durationLabel ?? "Calibrating"}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Score</p>
                        <p className="mt-2 text-sm font-medium text-white">{finalQuizSubmitted ? `${activeModalScore}%` : `${selectedModule?.completionRate ?? learner.data.activeJourney.progress}% complete`}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Reward</p>
                        <p className="mt-2 text-sm font-medium text-white">{currentStageItemCountLabel}</p>
                      </div>
                      <div className="space-y-2 pt-2">
                        <Button type="button" onClick={() => setTrainingWorkspacePage("lesson")} className="w-full rounded-[1rem] bg-white text-slate-950 hover:bg-slate-100">Continue</Button>
                        <Button type="button" variant="outline" onClick={() => setTrainingWorkspacePage(activeQuizTrigger ? "checkpoint" : "resources")} className="w-full rounded-[1rem] border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white">{activeQuizTrigger ? "Open checkpoint" : "Open transfer pack"}</Button>
                      </div>
                    </CardContent>
                  </>
                )}
              </PremiumCard>
            </div>
            <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setCourseContextOpen((current) => !current)}
                aria-expanded={courseContextOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="text-sm font-medium text-white">Course context</span>
                  <span className="ml-2 text-xs text-slate-400">Launch context, lane setup, and stage overview</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${courseContextOpen ? "rotate-180" : ""}`} />
              </button>
              {courseContextOpen ? (
                <div className="space-y-4 border-t border-white/10 px-4 py-4">
                  {launchedAsset ? (
                    <PremiumCard>
                      <CardContent className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Library launch context</p>
                          <h2 className="mt-2 text-2xl font-semibold text-white">Training launched from {launchedAsset.title}</h2>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">The simulator is prioritizing this library asset as live-work context so the learner can see how imported or CHCG content carries into the lesson, practice language, and reflection evidence.</p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm text-slate-300">
                          <p className="font-medium text-white">Source label</p>
                          <p className="mt-1">{launchedAsset.sourceLabel}</p>
                        </div>
                      </CardContent>
                    </PremiumCard>
                  ) : null}
                  {!isDirectModuleLaunch ? (
                    <PremiumCard className="overflow-hidden">
                      <CardContent className="px-5 py-4">
                        <div className="rounded-[1.25rem] border border-white/10 bg-white/6 px-3.5 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{activePreview?.eyebrow ?? "Training preview"}</Badge>
                              {requestedRoleLabel ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{requestedRoleLabel}</Badge> : null}
                              {recentUnlockMoment ? <Badge className="rounded-full border-emerald-400/20 bg-emerald-500/10 text-emerald-100">Unlock · {recentUnlockMoment.title}</Badge> : null}
                              <span className="text-sm font-medium text-white">Launch setup</span>
                              <span className="text-xs text-slate-300">{canBrowseAllTrainingFamilies ? "Switch lane only if needed." : `Scoped to ${effectiveTrainingRoleLabel.toLowerCase()}.`}</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full border-white/10 bg-slate-950/60 text-white hover:bg-white/10 hover:text-white"
                              onClick={() => setLaunchSetupOpen((current) => !current)}
                            >
                              {launchSetupOpen ? "Hide options" : "Switch lane"}
                            </Button>
                          </div>
                          {launchSetupOpen ? (
                            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                              <div className="flex flex-wrap gap-2">
                                {availableTrainingRoleFilterOptions.map((option) => (
                                  <Button
                                    key={`training-role-filter-${option.value}`}
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRoleFilter(option.value)}
                                    className={`rounded-full border-white/10 ${effectiveTrainingRoleFilter === option.value ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                                  >
                                    {option.label}
                                  </Button>
                                ))}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {previewScenarios.map((scenario) => (
                                  <button
                                    key={scenario.id}
                                    type="button"
                                    onClick={() => setPreviewScenarioId(scenario.id)}
                                    className={`rounded-full border px-3 py-2 text-left text-sm transition ${previewScenarioId === scenario.id ? "border-cyan-400/35 bg-cyan-400/12 text-white shadow-[0_10px_22px_rgba(34,211,238,0.12)]" : "border-white/10 bg-slate-950/55 text-slate-200 hover:bg-white/10"}`}
                                  >
                                    <span className="font-medium">{scenario.label}</span>
                                    <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">{scenario.eyebrow}</span>
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs leading-5 text-slate-400">The active preview only changes the lesson lane and supporting context. The learner still lands directly inside the player.</p>
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </PremiumCard>
                  ) : null}
                  {currentStage ? (
                    <div className="rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Stage overview</p>
                      <h4 className="mt-2 text-lg font-semibold text-white">{currentStage.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{currentStage.body}</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {(stageActivities[currentStage.id] ?? []).map((activity) => (
                          <div key={activity} className="rounded-[1rem] border border-white/10 bg-slate-950/45 px-3 py-3 text-sm leading-6 text-slate-100">
                            {activity}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <Dialog open={slideLightboxOpen} onOpenChange={setSlideLightboxOpen}>
          <DialogContent className="max-h-[96vh] border-white/10 bg-slate-950 p-3 text-slate-100 sm:max-w-[min(95vw,1400px)]">
            <DialogHeader>
              <DialogTitle className="text-white">{activeInteractiveVisual?.title ?? "Lesson slide"}</DialogTitle>
              <DialogDescription className="text-slate-400">{activeInteractiveVisual?.pageLabel ?? ""}{activeInteractiveVisual ? ` · ${activeInteractiveVisual.sourceDeck}` : ""} · Visual {activeInteractiveVisualIndex + 1} of {interactiveGalleryVisuals.length}</DialogDescription>
            </DialogHeader>
            <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
              {activeScorecard ? (
                <KpiScorecard scorecard={activeScorecard} clientName={kpiProfile.clientName} note={kpiProfile.note} />
              ) : activeInteractiveVisual ? (
                <TrainingVisualFrame visual={activeInteractiveVisual} />
              ) : null}
            </div>
            <DialogFooter className="sm:justify-between">
              <button type="button" onClick={() => setSelectedDeckVisualIndex((current) => Math.max(current - 1, 0))} disabled={activeInteractiveVisualIndex === 0} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/12 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button type="button" onClick={() => setSelectedDeckVisualIndex((current) => Math.min(current + 1, Math.max(interactiveGalleryVisuals.length - 1, 0)))} disabled={activeInteractiveVisualIndex >= interactiveGalleryVisuals.length - 1} className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/12 disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={curriculumViewerOpen} onOpenChange={setCurriculumViewerOpen}>
          <DialogContent className="max-h-[90vh] overflow-hidden border-white/10 bg-slate-950 text-slate-100 sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>{selectedModuleTitle} curriculum</DialogTitle>
              <DialogDescription className="text-slate-400">Review the mapped slide deck for this module without leaving the focused player. The viewer opens to the curriculum section closest to the active lesson step.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Curriculum slide</p>
                    <p className="mt-2 text-sm font-medium text-white">{activeCurriculumSlide?.pageLabel ?? "Mapped curriculum"} · {activeCurriculumSlide?.slide.title ?? selectedModuleTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{activeCurriculumSlide?.stageLabel ?? "Lesson curriculum"} · Slide {Math.min(selectedCurriculumSlideIndex + 1, Math.max(curriculumDeck.length, 1))} of {curriculumDeck.length || 1}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setSelectedCurriculumSlideIndex((current) => Math.max(current - 1, 0))} disabled={selectedCurriculumSlideIndex === 0} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">Previous</Button>
                    <Button type="button" variant="outline" onClick={() => setSelectedCurriculumSlideIndex((current) => Math.min(current + 1, Math.max(curriculumDeck.length - 1, 0)))} disabled={selectedCurriculumSlideIndex >= curriculumDeck.length - 1} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">Next</Button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-[1.7rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.1),rgba(2,6,23,0.94))] shadow-[0_24px_70px_rgba(8,15,35,0.28)]">
                  <div className="border-b border-white/8 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Module-aware curriculum</Badge>
                      {activeCurriculumVisual ? <Badge variant="outline" className="rounded-full border-white/10 bg-white/8 text-slate-100">{activeCurriculumVisual.sourceDeck}</Badge> : null}
                    </div>
                  </div>
                  <div className="bg-slate-950/90 p-4 sm:p-5">
                    <div className="flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/8 bg-slate-950/80 px-4 py-4 sm:min-h-[24rem]">
                      {activeCurriculumVisual ? <TrainingVisualFrame visual={activeCurriculumVisual} /> : <div className="max-w-xl text-center text-sm leading-6 text-slate-300">This module does not include a separate uploaded slide image for this step yet, so the curriculum viewer is showing the mapped lesson narrative and reference structure instead.</div>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{activeCurriculumSlide?.stageLabel ?? "Curriculum"}</Badge>
                    {activeCurriculumVisual ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{activeCurriculumVisual.pageLabel}</Badge> : null}
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">{activeCurriculumSlide?.slide.title ?? selectedModuleTitle}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{activeCurriculumSlide?.slide.narrative ?? presentation?.heroSummary ?? "Open the matching curriculum for this module and return to the lesson when ready."}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Slide takeaways</p>
                  <div className="mt-4 space-y-3">
                    {(activeCurriculumSlide?.slide.bullets ?? []).map((bullet: string) => (
                      <div key={bullet} className="rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-slate-200">{bullet}</div>
                    ))}
                    {!activeCurriculumSlide?.slide.bullets?.length ? <div className="rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-slate-300">This curriculum step is narrative-led, so the main coaching cue is in the module summary above.</div> : null}
                  </div>
                </div>
                <div className="rounded-[1.4rem] border border-[#FCBC34]/20 bg-[#FCBC34]/10 p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#FCBC34]">Return path</p>
                  <p className="mt-3 text-sm leading-6 text-slate-100">Use this viewer as a companion reference, then return directly to the lesson flow without losing your current place in the Training Zone.</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              {activeCurriculumVisual?.imageUrl ? <a href={activeCurriculumVisual.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#FCBC34]/30 bg-[#FCBC34]/10 px-4 py-2 text-sm font-medium text-[#FCBC34] transition hover:border-[#FCBC34]/50 hover:bg-[#FCBC34]/15 hover:text-white">Open full-size slide</a> : null}
              <Button type="button" onClick={() => setCurriculumViewerOpen(false)} className="rounded-full bg-white text-slate-950 hover:bg-slate-100">Return to lesson</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );

  if (focusedMode) {
    return createPortal(
      <div className="fixed inset-0 z-[45] overflow-y-auto bg-slate-950/95 p-2 text-[#1B303C] backdrop-blur-sm sm:p-3">
        <div className="mission-shell grid-noise relative min-h-full rounded-2xl p-2 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4A6373]">
              <Maximize2 className="h-3.5 w-3.5 text-[#0E7490]" /> Focused training
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFocusedMode(false)}
              aria-label="Exit focused full-screen mode"
              className="rounded-full border-[#1B303C]/15 bg-white text-[#1B303C] hover:border-[#FCBC34]/60 hover:bg-[#FFFBF0]"
            >
              <Minimize2 className="h-3.5 w-3.5" /> Exit focus
            </Button>
          </div>
          {playerBody}
        </div>
      </div>,
      document.body,
    );
  }

  return <Surface wide>{playerBody}</Surface>;
}

/** A catalog course card: real deck cover, title, slides·min, status badge + progress. */
function LibraryCourseCard({ course, onOpen }: { course: any; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.04] text-left transition hover:border-[#FCBC34]/45 hover:bg-white/[0.07]"
    >
      <div className="aspect-video w-full overflow-hidden bg-slate-900">
        {course.coverImage ? (
          <img src={course.coverImage} alt={course.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-600">No preview</div>
        )}
      </div>
      <div className="space-y-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-white">{course.title}</p>
          {course.status === "completed" ? (
            <Badge className="shrink-0 rounded-full border-emerald-400/30 bg-emerald-400/12 text-emerald-100">Completed</Badge>
          ) : course.status === "in_progress" ? (
            <Badge className="shrink-0 rounded-full border-cyan-400/30 bg-cyan-400/12 text-cyan-100">{course.percentComplete}%</Badge>
          ) : course.status === "recommended" ? (
            <Badge className="shrink-0 rounded-full border-[#FCBC34]/35 bg-[#FCBC34]/15 text-[#FCBC34]">Recommended</Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 rounded-full border-white/15 bg-white/6 text-slate-300">New</Badge>
          )}
        </div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{course.slideCount} slides · {course.durationMinutes} min</p>
        {course.status === "in_progress" ? <Progress value={course.percentComplete} className="h-1.5 bg-white/8" /> : null}
      </div>
    </button>
  );
}

// LIBRARY3: format → glyph for the text/badge-forward asset card (assets carry no
// cover art, so the format glyph + source badge do the visual lifting).
const ASSET_FORMAT_ICON: Record<string, typeof BookOpen> = {
  Deck: Layers3,
  Playbook: BookOpen,
  Checklist: CheckCircle2,
  Guide: FileText,
  Worksheet: FileSpreadsheet,
  Microlearning: Sparkles,
  Document: FileText,
};

function LibraryAssetCard({ asset, onOpen }: { asset: any; onOpen: () => void }) {
  const Icon = ASSET_FORMAT_ICON[asset.format] ?? BookOpen;
  const isCore = asset.sourceKind === "chcg";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-[#FCBC34]/45 hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-white/10 bg-white/6 text-slate-200"><Icon className="h-4 w-4" /></span>
          <Badge variant="outline" className="rounded-full border-white/15 bg-white/6 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300">{asset.format}</Badge>
        </div>
        <Badge className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] ${isCore ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100" : "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"}`}>{isCore ? "CHCG core" : "Client upload"}</Badge>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold leading-snug text-white">{asset.title}</p>
        <p className="line-clamp-2 text-xs leading-5 text-slate-400">{asset.summary}</p>
      </div>
      <div className="mt-auto space-y-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{asset.category}</p>
        {(asset.tags ?? []).length ? (
          <div className="flex flex-wrap gap-1.5">
            {(asset.tags ?? []).slice(0, 4).map((tag: string) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">{tag}</span>
            ))}
          </div>
        ) : null}
        <p className="text-[11px] text-slate-500">Roles: {(asset.linkedRoles ?? []).join(", ") || "—"}</p>
      </div>
    </button>
  );
}

export function ContentLibraryView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const [roleFilter, setRoleFilter] = useState<DemoRole | "all">("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [assetView, setAssetView] = useState<"all" | "chcg" | "imported">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_started" | "in_progress" | "completed" | "recommended">("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [libraryMode, setLibraryMode] = useState<"launcher" | "explore" | "ingest" | "resources">("explore");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("Client enablement");
  const [format, setFormat] = useState<"Deck" | "Playbook" | "Checklist" | "Guide" | "Worksheet" | "Microlearning" | "Document">("Deck");
  const [linkedRole, setLinkedRole] = useState<DemoRole | "all">("manager");
  const [tags, setTags] = useState("implementation, client import");
  const [sourceLabel, setSourceLabel] = useState("Client enablement team");
  const [ingestionSourceType, setIngestionSourceType] = useState<ContentLibraryIngestionSourceType>("Program rollout");
  const [curriculumStatus, setCurriculumStatus] = useState<ContentLibraryCurriculumStatus>("mapped_ready");
  const [maintenanceJourneyId, setMaintenanceJourneyId] = useState("journey-service-foundations");
  const [launchReadinessNote, setLaunchReadinessNote] = useState("Ready for client-admin review and direct launch once the receiving audience is aligned.");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedAssetRole, setSelectedAssetRole] = useState<DemoRole>("learner");
  const [launchBriefCardIndex, setLaunchBriefCardIndex] = useState(0);
  const [launchBriefCardFlipped, setLaunchBriefCardFlipped] = useState(false);
  const [libraryLaunchOpen, setLibraryLaunchOpen] = useState(false);
  const [libraryLaunchPath, setLibraryLaunchPath] = useState<string | null>(null);
  const [libraryLaunchTitle, setLibraryLaunchTitle] = useState("Focused training window");
  const [location, setLocation] = useLocation();

  const library = trpc.demo.secureLibrary.useQuery(tenantId ? { tenantId, role: roleFilter } : { role: roleFilter }, { enabled: Boolean(tenantId) });
  const uploadMutation = trpc.demo.secureUploadContent.useMutation({
    onSuccess: async (created) => {
      const createdPlannedTarget = resolveContentLibraryPlannedTrainingTarget(created);
      const createdStatusLabel = created.curriculumStatus === "pending_alignment"
        ? "pending curriculum alignment"
        : created.curriculumStatus === "review_only"
          ? "review only"
          : createdPlannedTarget
            ? `launch-ready for ${createdPlannedTarget.moduleTitle}`
            : "now visible in the tenant library";
      setUploadNotice(`${created.title} is now visible in the tenant library and marked ${createdStatusLabel}.`);
      setTitle("");
      setSummary("");
      setCategory("Client enablement");
      setFormat("Deck");
      setLinkedRole("manager");
      setTags("implementation, client import");
      setSourceLabel("Client enablement team");
      setIngestionSourceType("Program rollout");
      setCurriculumStatus("mapped_ready");
      setMaintenanceJourneyId("journey-service-foundations");
      setLaunchReadinessNote("Ready for client-admin review and direct launch once the receiving audience is aligned.");
      setSelectedFile(null);
      setLibraryMode("explore");
      await library.refetch();
    },
    onError: (error) => {
      setUploadNotice(error.message);
    },
  });

  const trackKeywords: Record<string, string[]> = {
    all: [],
    "track-service-foundations": ["service foundations", "soft skills", "customer service", "communication"],
    "track-workflow-precision": ["workflow", "qa", "documentation", "verification"],
    "track-data-leadership": ["data", "kpi", "analytics", "leadership intelligence"],
    "track-performance-leadership": ["performance", "coaching", "quarterly reviews", "annual reviews"],
    "track-engagement-recognition": ["engagement", "recognition", "gamification", "remote teams"],
  };

  const assets = useMemo(() => {
    const sourceAssets = assetView === "chcg"
      ? (library.data?.chcgAssets ?? [])
      : assetView === "imported"
        ? (library.data?.importedAssets ?? [])
        : [...(library.data?.importedAssets ?? []), ...(library.data?.chcgAssets ?? [])];

    const trackScoped = trackFilter === "all"
      ? sourceAssets
      : sourceAssets.filter((asset: any) => {
          const keywords = trackKeywords[trackFilter] ?? [];
          const haystack = `${asset.title} ${asset.summary} ${asset.category} ${asset.tags.join(" ")}`.toLowerCase();
          return keywords.some((keyword) => haystack.includes(keyword));
        });

    const normalizedSearch = searchQuery.trim().toLowerCase();
    if (!normalizedSearch) {
      return trackScoped;
    }

    return trackScoped.filter((asset: any) => {
      const haystack = `${asset.title} ${asset.summary} ${asset.category} ${asset.tags.join(" ")} ${asset.sourceLabel}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [assetView, library.data, searchQuery, trackFilter]);

  // LIBRARY3: the Resources shelf reads the already-resolved assets (core + tenant,
  // hidden tombstones removed), then layers the category + format filters on top of
  // the shared source/track/search filters baked into `assets`.
  const resourceAssets = useMemo(
    () =>
      assets.filter(
        (asset: any) =>
          (categoryFilter === "all" || asset.category === categoryFilter) &&
          (formatFilter === "all" || asset.format === formatFilter),
      ),
    [assets, categoryFilter, formatFilter],
  );
  const assetCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set([...(library.data?.chcgAssets ?? []), ...(library.data?.importedAssets ?? [])].map((asset: any) => asset.category)),
      ).sort(),
    [library.data],
  );
  const ASSET_FORMAT_OPTIONS = ["Deck", "Playbook", "Checklist", "Guide", "Worksheet", "Microlearning", "Document"];


  useEffect(() => {
    if (!assets.length) {
      return;
    }

    const queryParams = new URLSearchParams(location.split("?")[1] ?? "");
    const requestedAssetId = queryParams.get("assetId");
    const requestedAssetTitle = queryParams.get("assetTitle");
    const requestedRole = queryParams.get("role") as DemoRole | null;
    const matchedAsset = assets.find((asset: any) => asset.id === requestedAssetId)
      ?? assets.find((asset: any) => asset.title.toLowerCase() === (requestedAssetTitle ?? "").toLowerCase())
      ?? null;

    if (matchedAsset && matchedAsset.id !== selectedAssetId) {
      setSelectedAssetId(matchedAsset.id);
    }

    if (!matchedAsset && !selectedAssetId && assets[0]?.id) {
      setSelectedAssetId(assets[0].id);
    }

    if (matchedAsset && libraryMode !== "launcher") {
      setLibraryMode("launcher");
    }

    if (requestedRole && ["executive", "manager", "coach", "learner", "client_admin"].includes(requestedRole) && requestedRole !== selectedAssetRole) {
      setSelectedAssetRole(requestedRole);
    }
  }, [assets, libraryMode, location, selectedAssetId, selectedAssetRole]);

  const selectedAsset = useMemo(() => assets.find((asset: any) => asset.id === selectedAssetId) ?? assets[0] ?? null, [assets, selectedAssetId]);
  const selectedAssetPlannedTrainingTarget = useMemo(() => resolveContentLibraryPlannedTrainingTarget(selectedAsset), [selectedAsset]);
  const selectedAssetTrainingTarget = useMemo(() => resolveContentLibraryTrainingTarget(selectedAsset), [selectedAsset]);
  const selectedAssetRoleOptions = useMemo(() => selectedAsset ? resolveSelectedAssetWorkflowRoles(selectedAsset.linkedRoles) : [], [selectedAsset]);
  const selectedAssetWorkflowBrief = useMemo(() => getOperationalLaunchReadinessBrief(selectedAssetRole), [selectedAssetRole]);
  const selectedAssetBriefCards = useMemo<BriefFlashCardItem[]>(() => {
    if (!selectedAsset) {
      return [];
    }

    const roleLabel = getRoleLabel(selectedAssetRole);
    return [
      {
        id: `${selectedAsset.id}-${selectedAssetRole}-training-use`,
        eyebrow: "Launch brief card",
        title: `${selectedAssetWorkflowBrief.title} · training use`,
        frontSummary: "How should this asset be framed before the user enters the next workspace?",
        backNarrative: selectedAssetWorkflowBrief.trainingUse,
        bullets: [`Source label · ${selectedAsset.sourceLabel}`, `Receiving lane · ${roleLabel}`],
        accentLabel: roleLabel,
        supportLabel: "Next card",
        supportValue: "Workflow owner",
      },
      {
        id: `${selectedAsset.id}-${selectedAssetRole}-workflow-owner`,
        eyebrow: "Launch brief card",
        title: `${selectedAssetWorkflowBrief.title} · workflow owner`,
        frontSummary: "Who should own the handoff and use the asset first?",
        backNarrative: selectedAssetWorkflowBrief.workflowOwner,
        bullets: [`Current asset · ${selectedAsset.title}`, `Role lens · ${roleLabel}`],
        accentLabel: roleLabel,
        supportLabel: "Next card",
        supportValue: "Launch alignment",
      },
      {
        id: `${selectedAsset.id}-${selectedAssetRole}-launch-alignment`,
        eyebrow: "Launch brief card",
        title: `${selectedAssetWorkflowBrief.title} · launch alignment`,
        frontSummary: "What should the surrounding launch copy emphasize so the handoff feels intentional?",
        backNarrative: selectedAssetWorkflowBrief.launchAlignment,
        bullets: [`Mission label · ${selectedAsset.category}`, `Track focus · ${selectedAsset.summary}`],
        accentLabel: roleLabel,
        supportLabel: "Next card",
        supportValue: "Follow-through proof",
      },
      {
        id: `${selectedAsset.id}-${selectedAssetRole}-follow-through`,
        eyebrow: "Launch brief card",
        title: `${selectedAssetWorkflowBrief.title} · follow-through proof`,
        frontSummary: "What does success look like after this brief launches the learner or operator into the next flow?",
        backNarrative: selectedAssetWorkflowBrief.followThrough,
        bullets: [`Action button · ${selectedAssetWorkflowBrief.startLabel}`, `Selected lane · ${roleLabel}`],
        accentLabel: roleLabel,
        supportLabel: "Launch action",
        supportValue: selectedAssetWorkflowBrief.startLabel,
      },
    ];
  }, [selectedAsset, selectedAssetRole, selectedAssetWorkflowBrief]);

  const selectedAssetEstimatedMinutes = useMemo(() => {
    if (!selectedAsset) {
      return 0;
    }

    const runtimeByFormat: Record<string, number> = {
      Deck: 28,
      Playbook: 24,
      Checklist: 12,
      Guide: 20,
      Worksheet: 18,
      Microlearning: 10,
      Document: 16,
    };

    const baseMinutes = runtimeByFormat[selectedAsset.format] ?? 18;
    const tagAdjustment = Math.min(selectedAsset.tags.length * 2, 10);
    return baseMinutes + tagAdjustment;
  }, [selectedAsset]);
  const selectedAssetSectionCount = useMemo(() => {
    if (!selectedAsset) {
      return 0;
    }

    return Math.max(4, Math.min(8, selectedAsset.tags.length + 3));
  }, [selectedAsset]);
  const selectedAssetCheckpointCount = useMemo(() => {
    if (!selectedAssetEstimatedMinutes) {
      return 0;
    }

    return Math.max(2, Math.min(5, Math.ceil(selectedAssetEstimatedMinutes / 10)));
  }, [selectedAssetEstimatedMinutes]);
  const selectedAssetOutcomeLines = useMemo(() => {
    if (!selectedAsset) {
      return [] as string[];
    }

    return [
      `Clarify the ${selectedAsset.category.toLowerCase()} objective before launch.`,
      ...selectedAsset.tags.slice(0, 2).map((tag: string) => `Reinforce ${tag.replaceAll("-", " ")} during the guided lesson.`),
    ].slice(0, 3);
  }, [selectedAsset]);
  const selectedAssetCurriculumState = selectedAsset?.curriculumStatus as ContentLibraryCurriculumStatus | undefined;
  const selectedAssetStatusLabel = selectedAsset
    ? selectedAssetTrainingTarget
      ? selectedAsset.sourceKind === "chcg"
        ? "Mapped and ready for launch"
        : "Client-configured and mapped for launch"
      : selectedAssetCurriculumState === "pending_alignment"
        ? "Pending curriculum alignment"
        : selectedAssetCurriculumState === "review_only"
          ? "Shelf review configured"
          : selectedAsset.sourceKind === "chcg"
            ? "Ready for detail review"
            : selectedAssetPlannedTrainingTarget
              ? "Curriculum target staged"
              : "Client-configured and ready for review"
    : "Select an asset to begin";
  const selectedAssetCurriculumStatusLabel = selectedAssetTrainingTarget?.curriculumStatusLabel
    ?? (selectedAssetCurriculumState === "pending_alignment"
      ? "Curriculum alignment in progress"
      : selectedAssetCurriculumState === "review_only"
        ? "Shelf review only"
        : selectedAssetPlannedTrainingTarget
          ? "Curriculum target selected"
          : "Curriculum deck not mapped yet");
  const selectedAssetStatusSupport = selectedAsset
    ? selectedAssetTrainingTarget
      ? `${selectedAssetTrainingTarget.journeyTitle} · ${selectedAssetTrainingTarget.moduleTitle} · ${selectedAssetTrainingTarget.curriculumStatusLabel}`
      : selectedAssetPlannedTrainingTarget
        ? `${selectedAssetPlannedTrainingTarget.journeyTitle} · ${selectedAssetPlannedTrainingTarget.moduleTitle} · ${selectedAssetCurriculumStatusLabel}`
        : `Estimated runtime ${selectedAssetEstimatedMinutes} min · ${selectedAssetSectionCount} lesson sections · ${selectedAssetCheckpointCount} checkpoints`
    : "Choose a shelf item to activate the course detail view.";
  const selectedAssetWorkflowLabel = selectedAsset ? getRoleLabel(selectedAssetRole) : "Learner";
  const selectedAssetNextActionLabel = selectedAssetTrainingTarget?.nextActionLabel
    ?? (selectedAssetPlannedTrainingTarget
      ? selectedAssetCurriculumState === "pending_alignment"
        ? `Finish curriculum alignment for ${selectedAssetPlannedTrainingTarget.moduleTitle}`
        : `Keep ${selectedAssetPlannedTrainingTarget.moduleTitle} staged for later launch`
      : "Choose a mapped course to unlock a direct training launch.");
  const selectedAssetSourceTypeLabel = selectedAsset?.sourceType ?? (selectedAsset?.sourceKind === "client_upload" ? "Client upload" : "CHCG core asset");
  const selectedAssetLaunchReadinessNote = selectedAsset?.launchReadinessNote ?? (selectedAssetTrainingTarget
    ? `This asset can move directly into ${selectedAssetTrainingTarget.moduleTitle} once the receiving lane is confirmed.`
    : selectedAssetPlannedTrainingTarget
      ? `The planned handoff is staged for ${selectedAssetPlannedTrainingTarget.moduleTitle}, but the launch path still needs final curriculum readiness.`
      : "Use the assignment console to review the asset before launching or maintaining curriculum alignment.");
  const selectedIngestionTarget = useMemo(() => curriculumStatus === "review_only" ? null : resolveTrainingTargetByJourneyId(maintenanceJourneyId), [curriculumStatus, maintenanceJourneyId]);
  const selectedCurriculumStatusOption = useMemo(
    () => CONTENT_LIBRARY_CURRICULUM_STATUS_OPTIONS.find((option) => option.value === curriculumStatus) ?? CONTENT_LIBRARY_CURRICULUM_STATUS_OPTIONS[0],
    [curriculumStatus],
  );
  const canLaunchSelectedAsset = Boolean(selectedAssetTrainingTarget);
  const libraryProgressSteps = ["Browse library", "Review course detail", "Launch player"];
  const libraryProgressValue = selectedAsset ? (libraryMode === "launcher" ? 66 : 33) : 0;
  const selectedTrackTitle = trackFilter === "all" ? "All tracks" : library.data?.tracks.find((track: any) => track.id === trackFilter)?.title ?? "All tracks";

  useEffect(() => {
    if (!selectedAsset) {
      return;
    }

    setSelectedAssetRole((currentRole) => {
      if (selectedAssetRoleOptions.includes(currentRole)) {
        return currentRole;
      }

      const preferredRole = roleFilter !== "all" ? roleFilter : access.data?.grant.role;
      return resolveDefaultSelectedAssetRole(selectedAsset.linkedRoles, preferredRole);
    });
  }, [access.data?.grant.role, roleFilter, selectedAsset, selectedAssetRoleOptions]);

  useEffect(() => {
    setLaunchBriefCardIndex(0);
    setLaunchBriefCardFlipped(false);
  }, [selectedAsset?.id, selectedAssetRole]);

  function handleStartTraining(asset?: any, role?: DemoRole, journeyId?: string, moduleId?: string, assignmentId?: string) {
    const resolvedTrainingTarget = resolveContentLibraryTrainingTarget(asset ?? selectedAsset);
    const path = buildTrainingLaunchPath({
      asset,
      role,
      journeyId: journeyId ?? resolvedTrainingTarget?.journeyId,
      moduleId: moduleId ?? resolvedTrainingTarget?.moduleId,
      assignmentId,
    });
    setLibraryLaunchTitle(asset?.title ?? selectedAsset?.title ?? "Focused training window");
    setLibraryLaunchPath(path);
    setLibraryLaunchOpen(true);
  }

  function openTrainingInSeparateWindow(path = libraryLaunchPath) {
    if (!path) {
      return;
    }

    if (typeof window === "undefined") {
      setLocation(path);
      return;
    }

    const popup = window.open(path, "_blank", "popup=yes,width=1440,height=920,left=120,top=80");
    if (!popup) {
      setLocation(path);
      return;
    }

    popup.focus();
  }

  async function readFileAsBase64(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        resolve(result.includes(",") ? result.split(",")[1] ?? "" : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadNotice(null);

    const normalizedTags = tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);
    const normalizedMaintenanceJourneyId = curriculumStatus === "review_only" ? undefined : maintenanceJourneyId;
    const normalizedMaintenanceTarget = normalizedMaintenanceJourneyId ? resolveTrainingTargetByJourneyId(normalizedMaintenanceJourneyId) : null;

    const payload: any = {
      tenantId,
      title,
      summary,
      category,
      format,
      linkedRoles: [linkedRole],
      tags: normalizedTags,
      sourceLabel,
      sourceType: ingestionSourceType,
      curriculumStatus,
      maintenanceJourneyId: normalizedMaintenanceJourneyId,
      maintenanceModuleId: normalizedMaintenanceTarget?.moduleId,
      launchReadinessNote,
    };

    if (selectedFile) {
      payload.fileName = selectedFile.name;
      payload.mimeType = selectedFile.type || "application/octet-stream";
      payload.dataBase64 = await readFileAsBase64(selectedFile);
    }

    await uploadMutation.mutateAsync(payload);
  }

  const jumpToLibraryMode = (mode: "launcher" | "explore" | "ingest" | "resources", sectionId: string) => {
    setLibraryMode(mode);
    window.setTimeout(() => revealWorkspaceSection(sectionId), 20);
  };

  const libraryStats: WorkspaceStat[] = library.data ? [
    { label: "Library assets", value: library.data.stats.totalAssets, sub: "Visible in this workspace", icon: <BookOpen className="h-4 w-4" /> },
    { label: "CHCG core", value: library.data.stats.chcgAssets, sub: "Built-in tracks", icon: <Sparkles className="h-4 w-4" /> },
    { label: "Client imports", value: library.data.stats.importedAssets, sub: "Tenant-provided", icon: <Layers3 className="h-4 w-4" /> },
    { label: "Mapped journeys", value: library.data.stats.mappedJourneys, sub: "Linked to training", icon: <Target className="h-4 w-4" /> },
  ] : [];

  // CAT4/CAT5: curated rows + filtered shelves from the seeded CatalogCourse values.
  const catalogCourses: any[] = library.data?.courses ?? [];
  const filteredCatalogCourses = catalogCourses.filter((course) => {
    const haystack = `${course.title} ${(course.tags ?? []).join(" ")}`.toLowerCase();
    const matchesSearch = !searchQuery.trim() || haystack.includes(searchQuery.trim().toLowerCase());
    const matchesTrack = trackFilter === "all" || course.track === trackFilter;
    const matchesSource = assetView === "all" || (assetView === "chcg" ? course.source === "chcg" : course.source === "client_upload");
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    return matchesSearch && matchesTrack && matchesSource && matchesStatus;
  });
  const continueCourses = filteredCatalogCourses.filter((course) => course.status === "in_progress").sort((a, b) => b.percentComplete - a.percentComplete);
  const recommendedCourses = filteredCatalogCourses.filter((course) => course.recommended);
  const newCourses = filteredCatalogCourses.filter((course) => course.status === "not_started");
  const filtersActive = Boolean(searchQuery.trim()) || trackFilter !== "all" || assetView !== "all" || statusFilter !== "all";
  // CAT6: the course detail "course page" opened from a cover click.
  const selectedCourse = catalogCourses.find((course) => course.id === selectedCourseId) ?? null;

  // CAT5: one compact filter bar under the stat row — search · track · status · source.
  const libraryFilterBar = (
    <div className="command-band px-4 py-3.5 md:px-5" id="library-filter-bar">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block space-y-1.5 text-sm text-[#1B303C] xl:col-span-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4A6373]">Search courses</span>
          <div className="flex h-11 items-center gap-3 rounded-[1.15rem] border border-[#1B303C]/10 bg-white/88 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]">
            <Search className="h-4 w-4 text-[#4A6373]" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by title or topic..." className="w-full bg-transparent text-sm text-[#1B303C] outline-none placeholder:text-[#4A6373]" />
          </div>
        </label>
        <label className="block space-y-1.5 text-sm text-[#1B303C]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4A6373]">Track</span>
          <select value={trackFilter} onChange={(event) => setTrackFilter(event.target.value)} className="h-11 w-full rounded-[1.15rem] border border-[#1B303C]/10 bg-white/88 px-3 text-sm text-[#1B303C] outline-none">
            <option value="all">All tracks</option>
            {(library.data?.tracks ?? []).map((track: any) => <option key={track.id} value={track.id}>{track.title}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm text-[#1B303C]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4A6373]">Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-11 w-full rounded-[1.15rem] border border-[#1B303C]/10 bg-white/88 px-3 text-sm text-[#1B303C] outline-none">
            <option value="all">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="recommended">Recommended</option>
            <option value="not_started">Not started</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant={assetView === "all" ? "default" : "outline"} onClick={() => setAssetView("all")} className={assetView === "all" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/10 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>All sources</Button>
        <Button type="button" variant={assetView === "chcg" ? "default" : "outline"} onClick={() => setAssetView("chcg")} className={assetView === "chcg" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/10 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>CHCG core</Button>
        <Button type="button" variant={assetView === "imported" ? "default" : "outline"} onClick={() => setAssetView("imported")} className={assetView === "imported" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/10 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>Client imports</Button>
      </div>
    </div>
  );

  return library.isLoading || access.isLoading || !library.data ? (
    <Surface>
      <LoadingState />
    </Surface>
  ) : (
    <WorkspaceShell
      title="Training Library"
      subtitle="Browse the course catalog and launch focused training."
      actions={
        <>
          {access.data ? (
            <Badge variant="outline" className="rounded-full border-[#1B303C]/12 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#4A6373]">
              {access.data.tenant.name}
            </Badge>
          ) : null}
          <Link href="/">
            <Button variant="outline" className="rounded-full border-[#1B303C]/12 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10">Back to overview</Button>
          </Link>
        </>
      }
      stats={libraryStats}
      modesLabel="Library modes"
      activeTab={libraryMode}
      onTabChange={(value) => setLibraryMode(value as "launcher" | "explore" | "ingest" | "resources")}
      tabs={[
        { value: "explore", label: "Compact shelves" },
        { value: "launcher", label: "Course detail" },
        { value: "resources", label: "Resources" },
        { value: "ingest", label: "Ingest" },
      ]}
      betweenStatsAndTabs={libraryFilterBar}
    >
              <TabsContent value="explore" className="mt-0" id="library-explore-rows">
                <div className="space-y-5">
                  {!filtersActive ? (
                    <>
                      {continueCourses.length ? (
                        <section className="space-y-2.5">
                          <div>
                            <h3 className="text-base font-semibold text-white">Continue learning</h3>
                            <p className="mt-0.5 text-sm text-slate-400">Pick up where you left off — resumes to your last slide.</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {continueCourses.map((course: any) => (
                              <LibraryCourseCard key={`continue-${course.id}`} course={course} onOpen={() => setSelectedCourseId(course.id)} />
                            ))}
                          </div>
                        </section>
                      ) : null}
                      {recommendedCourses.length ? (
                        <section className="space-y-2.5">
                          <div>
                            <h3 className="text-base font-semibold text-white">Recommended for you</h3>
                            <p className="mt-0.5 text-sm text-slate-400">Aligned to your readiness and assigned focus.</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {recommendedCourses.map((course: any) => (
                              <LibraryCourseCard key={`recommended-${course.id}`} course={course} onOpen={() => setSelectedCourseId(course.id)} />
                            ))}
                          </div>
                        </section>
                      ) : null}
                      {newCourses.length ? (
                        <section className="space-y-2.5">
                          <div>
                            <h3 className="text-base font-semibold text-white">New</h3>
                            <p className="mt-0.5 text-sm text-slate-400">Courses you haven't started yet.</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {newCourses.map((course: any) => (
                              <LibraryCourseCard key={`new-${course.id}`} course={course} onOpen={() => setSelectedCourseId(course.id)} />
                            ))}
                          </div>
                        </section>
                      ) : null}
                    </>
                  ) : null}
                  <section className="space-y-2.5">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <h3 className="text-base font-semibold text-white">{filtersActive ? "Results" : "All courses"}</h3>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{filteredCatalogCourses.length} {filteredCatalogCourses.length === 1 ? "course" : "courses"}</Badge>
                    </div>
                    {filteredCatalogCourses.length === 0 ? (
                      <p className="text-sm text-slate-400">{filtersActive ? "No courses match the current filters." : "No courses available."}</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredCatalogCourses.map((course: any) => (
                          <LibraryCourseCard key={course.id} course={course} onOpen={() => setSelectedCourseId(course.id)} />
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="launcher" className="mt-0 space-y-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
                  <PremiumCard>
                    <CardHeader>
                      <CardTitle className="text-white">Course detail + launch brief</CardTitle>
                      <CardDescription className="text-slate-400">The detail panel stays compact while the briefing sequence prepares the receiving role for launch.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAsset ? (
                        <>
                          <div className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Selected course detail</p>
                            <h3 className="mt-2 text-[1.7rem] font-semibold text-white">{selectedAsset.title}</h3>
                            <p className="mt-2 text-sm leading-7 text-slate-100">{selectedAsset.summary}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetStatusLabel}</p></div>
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Lane</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetWorkflowLabel}</p></div>
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Next action</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetTrainingTarget?.moduleTitle ?? selectedAssetPlannedTrainingTarget?.moduleTitle ?? "Mapped module pending"}</p><p className="mt-1 text-xs leading-5 text-slate-400">{selectedAssetCurriculumStatusLabel}</p></div>
                          </div>
                          <div className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Launch next action</p>
                              {selectedAssetTrainingTarget ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Deck available</Badge> : null}
                            </div>
                            <p className="mt-3 text-sm font-medium text-white">{selectedAssetNextActionLabel}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-100">{selectedAssetTrainingTarget ? `${selectedAssetTrainingTarget.journeyTitle} will open on ${selectedAssetTrainingTarget.moduleTitle} so the Training Zone inherits the mapped curriculum context immediately.` : selectedAssetPlannedTrainingTarget ? `${selectedAssetPlannedTrainingTarget.journeyTitle} is staged on ${selectedAssetPlannedTrainingTarget.moduleTitle}, but this asset stays in curriculum-maintenance mode until mapping is launch-ready.` : "Open compact shelves to choose a course with a mapped training route."}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" disabled={!canLaunchSelectedAsset} onClick={() => handleStartTraining(selectedAsset, selectedAssetRole, selectedAssetTrainingTarget?.journeyId, selectedAssetTrainingTarget?.moduleId)} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100 disabled:bg-slate-300 disabled:text-slate-600">{canLaunchSelectedAsset ? "Launch training" : "Launch pending alignment"}</Button>
                            <Button type="button" variant="outline" onClick={() => jumpToLibraryMode("explore", "library-explore-mode")} className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white">Open compact shelves</Button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">Select an asset from the compact shelves first.</div>
                      )}
                    </CardContent>
                  </PremiumCard>
                  <PremiumCard>
                    <CardHeader>
                      <CardTitle className="text-white">Role-aligned launch briefing</CardTitle>
                      <CardDescription className="text-slate-400">Flash-card handoff stays inside the same screen so detail review and launch readiness remain connected.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAsset ? (
                        <>
                          <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Launch brief owner</p>
                            <p className="mt-2 text-sm font-medium text-white">{selectedAssetWorkflowBrief.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">Set the receiving role, review the compact briefing cards, and launch only when the next handoff is clear.</p>
                          </div>
                          <BriefFlashCardDeck
                            items={selectedAssetBriefCards}
                            activeIndex={launchBriefCardIndex}
                            isFlipped={launchBriefCardFlipped}
                            onFlip={() => setLaunchBriefCardFlipped((current) => !current)}
                            onPrevious={() => {
                              setLaunchBriefCardFlipped(false);
                              setLaunchBriefCardIndex((current) => Math.max(current - 1, 0));
                            }}
                            onNext={() => {
                              setLaunchBriefCardFlipped(false);
                              setLaunchBriefCardIndex((current) => Math.min(current + 1, Math.max(selectedAssetBriefCards.length - 1, 0)));
                            }}
                            onJumpToIndex={(index) => {
                              setLaunchBriefCardFlipped(false);
                              setLaunchBriefCardIndex(index);
                            }}
                            canGoPrevious={launchBriefCardIndex > 0}
                            canGoNext={launchBriefCardIndex < selectedAssetBriefCards.length - 1}
                            progressLabel={selectedAssetBriefCards.length > 0 ? `${launchBriefCardIndex + 1} of ${selectedAssetBriefCards.length}` : "No cards loaded"}
                            statusLabel={`Aligned to the ${getRoleLabel(selectedAssetRole)} lane`}
                            completionLabel={`Launch brief reviewed for the ${getRoleLabel(selectedAssetRole)} lane. Open the training window when you are ready to hand off.`}
                            emptyTitle="Launch brief flash cards loading"
                            emptyBody="Choose an asset and receiving role to populate the launch-readiness flash cards."
                            theme="dark"
                          />
                        </>
                      ) : (
                        <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">Select an asset from the shelf to populate the launch brief.</div>
                      )}
                    </CardContent>
                  </PremiumCard>
                </div>
              </TabsContent>

              <TabsContent value="resources" className="mt-0" id="library-resources-mode">
                <PremiumCard>
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <CardTitle className="text-white">Resource library</CardTitle>
                        <CardDescription className="text-slate-400">Browse the CHCG core and client-uploaded assets available to this workspace. Source, edits, and removals reflect live authoring.</CardDescription>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{resourceAssets.length} {resourceAssets.length === 1 ? "asset" : "assets"}</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:max-w-md">
                      <label className="block space-y-1.5 text-sm text-slate-200">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Category</span>
                        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 w-full rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-sm text-slate-100 outline-none">
                          <option value="all">All categories</option>
                          {assetCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                      </label>
                      <label className="block space-y-1.5 text-sm text-slate-200">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Format</span>
                        <select value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)} className="h-10 w-full rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-sm text-slate-100 outline-none">
                          <option value="all">All formats</option>
                          {ASSET_FORMAT_OPTIONS.map((format) => <option key={format} value={format}>{format}</option>)}
                        </select>
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {resourceAssets.length === 0 ? (
                      <p className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/4 px-4 py-6 text-sm text-slate-300">No resources match the current filters. Adjust the source, track, category, or format above.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {resourceAssets.map((asset: any) => (
                          <LibraryAssetCard
                            key={asset.id}
                            asset={asset}
                            onOpen={() => { setSelectedAssetId(asset.id); setLibraryMode("launcher"); }}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </PremiumCard>
              </TabsContent>

              <TabsContent value="ingest" className="mt-0" id="library-ingest-mode">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
                  <PremiumCard>
                    <CardHeader>
                      <CardTitle className="text-white">Structured ingestion lane</CardTitle>
                      <CardDescription className="text-slate-400">Capture curriculum-maintenance metadata before the asset reaches the shelf so launch readiness and review state stay visible from the start.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">CHCG core assets</p><p className="mt-2 text-sm font-medium text-white">{library.data.stats.chcgAssets}</p></div>
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Client imports</p><p className="mt-2 text-sm font-medium text-white">{library.data.stats.importedAssets}</p></div>
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Mapped journeys</p><p className="mt-2 text-sm font-medium text-white">{library.data.stats.mappedJourneys}</p></div>
                      </div>
                      <div className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Curriculum maintenance plan</p>
                          <Badge className="rounded-full border-cyan-300/20 bg-cyan-400/12 text-cyan-100">{selectedCurriculumStatusOption.label}</Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-100">{selectedCurriculumStatusOption.detail}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[1rem] border border-white/10 bg-slate-950/45 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Source type</p><p className="mt-2 text-sm font-medium text-white">{ingestionSourceType}</p></div>
                          <div className="rounded-[1rem] border border-white/10 bg-slate-950/45 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Receiving lane</p><p className="mt-2 text-sm font-medium text-white">{linkedRole === "all" ? "All roles" : getRoleLabel(linkedRole)}</p></div>
                          <div className="rounded-[1rem] border border-white/10 bg-slate-950/45 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Target journey</p><p className="mt-2 text-sm font-medium text-white">{selectedIngestionTarget?.journeyTitle ?? "Shelf review only"}</p></div>
                          <div className="rounded-[1rem] border border-white/10 bg-slate-950/45 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Target module</p><p className="mt-2 text-sm font-medium text-white">{selectedIngestionTarget?.moduleTitle ?? "No direct launch target yet"}</p></div>
                        </div>
                        <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-950/45 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Launch-readiness note</p>
                          <p className="mt-2 text-sm leading-6 text-slate-100">{launchReadinessNote}</p>
                        </div>
                      </div>
                      <div className="rounded-[1.2rem] border border-emerald-400/18 bg-emerald-400/10 px-4 py-4 text-sm leading-6 text-slate-100">
                        Uploaded assets still return to the same compact shelf model, but now they arrive with explicit curriculum-maintenance status, planned journey/module context, and clearer handoff expectations.
                      </div>
                    </CardContent>
                  </PremiumCard>
                  <PremiumCard>
                    <CardHeader>
                      <CardTitle className="text-white">Add tenant-specific content</CardTitle>
                      <CardDescription className="text-slate-400">This workflow keeps imported materials searchable, role-mapped, and staged for either direct launch or curriculum maintenance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUpload} className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="grid gap-2 text-sm text-slate-300">
                            <span>Title</span>
                            <input value={title} onChange={(event) => setTitle(event.target.value)} required className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none" />
                          </label>
                          <label className="grid gap-2 text-sm text-slate-300">
                            <span>Category</span>
                            <input value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none" />
                          </label>
                        </div>
                        <label className="grid gap-2 text-sm text-slate-300">
                          <span>Summary</span>
                          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} required rows={4} className="rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 py-3 text-white outline-none" />
                        </label>
                        <div className="grid gap-4 md:grid-cols-3">
                          <label className="grid gap-2 text-sm text-slate-300">
                            <span>Format</span>
                            <select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none">
                              {["Deck", "Playbook", "Checklist", "Guide", "Worksheet", "Microlearning", "Document"].map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-2 text-sm text-slate-300">
                            <span>Linked role</span>
                            <select value={linkedRole} onChange={(event) => setLinkedRole(event.target.value as DemoRole | "all")} className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none">
                              <option value="all">All roles</option>
                              {Object.entries(roleMeta).map(([key, item]) => <option key={key} value={key}>{item.title}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-2 text-sm text-slate-300">
                            <span>Source label</span>
                            <input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none" />
                          </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <label className="grid gap-2 text-sm text-slate-300 xl:col-span-1">
                            <span>Source type</span>
                            <select value={ingestionSourceType} onChange={(event) => setIngestionSourceType(event.target.value as ContentLibraryIngestionSourceType)} className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none">
                              {CONTENT_LIBRARY_INGEST_SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-2 text-sm text-slate-300 xl:col-span-1">
                            <span>Curriculum state</span>
                            <select value={curriculumStatus} onChange={(event) => setCurriculumStatus(event.target.value as ContentLibraryCurriculumStatus)} className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none">
                              {CONTENT_LIBRARY_CURRICULUM_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-2 text-sm text-slate-300 xl:col-span-1">
                            <span>Target journey</span>
                            <select value={maintenanceJourneyId} onChange={(event) => setMaintenanceJourneyId(event.target.value)} disabled={curriculumStatus === "review_only"} className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-55">
                              {CONTENT_LIBRARY_INGEST_JOURNEY_OPTIONS.map((option) => <option key={option.journeyId} value={option.journeyId}>{option.journeyTitle}</option>)}
                            </select>
                          </label>
                          <div className="grid gap-2 text-sm text-slate-300 xl:col-span-1">
                            <span>Target module</span>
                            <div className="flex min-h-11 items-center rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white">{selectedIngestionTarget?.moduleTitle ?? "No direct launch target"}</div>
                          </div>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-slate-200">
                          {selectedCurriculumStatusOption.detail}
                        </div>
                        <label className="grid gap-2 text-sm text-slate-300">
                          <span>Launch-readiness note</span>
                          <textarea value={launchReadinessNote} onChange={(event) => setLaunchReadinessNote(event.target.value)} required rows={3} className="rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 py-3 text-white outline-none" />
                        </label>
                        <label className="grid gap-2 text-sm text-slate-300">
                          <span>Tags</span>
                          <input value={tags} onChange={(event) => setTags(event.target.value)} className="h-11 rounded-[1rem] border border-white/10 bg-slate-950/55 px-3 text-white outline-none" />
                        </label>
                        <label className="grid gap-2 text-sm text-slate-300">
                          <span>Optional file</span>
                          <input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="rounded-[1rem] border border-dashed border-white/18 bg-slate-950/35 px-3 py-3 text-slate-300" />
                        </label>
                        {uploadNotice ? <div className="rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">{uploadNotice}</div> : null}
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" disabled={uploadMutation.isPending} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">{uploadMutation.isPending ? "Uploading..." : "Add structured asset"}</Button>
                          <Button type="button" variant="outline" onClick={() => jumpToLibraryMode("explore", "library-explore-mode")} className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white">Return to compact shelves</Button>
                        </div>
                      </form>
                    </CardContent>
                  </PremiumCard>
                </div>
              </TabsContent>
            {/* CAT6: focused course page opened from a cover click. */}
            <Dialog open={Boolean(selectedCourse)} onOpenChange={(open) => (!open ? setSelectedCourseId(null) : null)}>
              <DialogContent className="max-w-2xl overflow-hidden border-white/10 bg-slate-950 p-0 text-slate-100">
                {selectedCourse ? (
                  <>
                    <div className="aspect-video w-full overflow-hidden bg-slate-900">
                      {selectedCourse.coverImage ? <img src={selectedCourse.coverImage} alt={selectedCourse.title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="space-y-4 p-6">
                      <DialogHeader className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{(library.data?.tracks ?? []).find((track: any) => track.id === selectedCourse.track)?.title ?? "Course"}</Badge>
                          <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 text-slate-300">{selectedCourse.source === "chcg" ? "CHCG core" : "Client import"}</Badge>
                          {selectedCourse.status === "completed" ? <Badge className="rounded-full border-emerald-400/30 bg-emerald-400/12 text-emerald-100">Completed</Badge> : selectedCourse.status === "in_progress" ? <Badge className="rounded-full border-cyan-400/30 bg-cyan-400/12 text-cyan-100">{selectedCourse.percentComplete}% complete</Badge> : selectedCourse.recommended ? <Badge className="rounded-full border-[#FCBC34]/35 bg-[#FCBC34]/15 text-[#FCBC34]">Recommended</Badge> : null}
                        </div>
                        <DialogTitle className="text-xl text-white">{selectedCourse.title}</DialogTitle>
                        <DialogDescription className="text-sm leading-6 text-slate-300">{selectedCourse.description}</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2.5"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">What's inside</p><p className="mt-1 text-sm font-semibold text-white">{selectedCourse.slideCount} slides</p></div>
                        <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2.5"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Runtime</p><p className="mt-1 text-sm font-semibold text-white">{selectedCourse.durationMinutes} min</p></div>
                        <div className="rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2.5"><p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Status</p><p className="mt-1 text-sm font-semibold capitalize text-white">{selectedCourse.status.replace("_", " ")}</p></div>
                      </div>
                      {selectedCourse.tags?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCourse.tags.map((tag: string) => <Badge key={tag} variant="outline" className="rounded-full border-white/12 bg-white/5 text-[11px] text-slate-300">{tag}</Badge>)}
                        </div>
                      ) : null}
                      <DialogFooter className="sm:justify-start">
                        <Button type="button" onClick={() => { const path = selectedCourse.launchPath; setSelectedCourseId(null); setLocation(path); }} className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
                          {selectedCourse.status === "in_progress" ? "Resume course" : selectedCourse.status === "completed" ? "Review course" : "Launch course"}
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </DialogFooter>
                    </div>
                  </>
                ) : null}
              </DialogContent>
            </Dialog>
            <Dialog open={libraryLaunchOpen} onOpenChange={setLibraryLaunchOpen}>
          <DialogContent className="sm:max-w-[30rem]">
            <DialogHeader>
              <DialogTitle>{libraryLaunchTitle}</DialogTitle>
              <DialogDescription>The course detail review is complete. Open the focused player in a separate window or continue in this workspace.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="font-medium text-slate-900">Focused training player</p>
                <p className="mt-2 leading-6">This launch keeps the learner in a contained player with visible progress, focused controls, and fewer surrounding distractions.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => openTrainingInSeparateWindow()} className="rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]">Open training window</Button>
                <Button type="button" variant="outline" onClick={() => {
                  setLibraryLaunchOpen(false);
                  if (libraryLaunchPath) {
                    setLocation(libraryLaunchPath);
                  }
                }} className="rounded-full">Open here instead</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </WorkspaceShell>
  );
}


export function ChcgAdminView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const organizationAdminEnabled = access.data?.grant.role === "platform_admin";
  const dashboard = trpc.demo.secureChcgAdmin.useQuery(
    { tenantId: selectedTenantId },
    { enabled: organizationAdminEnabled },
  );
  const createTenant = trpc.demo.secureCreateChcgTenant.useMutation({
    onSuccess: async (created) => {
      setSelectedTenantId(created.id);
      await dashboard.refetch();
    },
  });
  const updateTrainingAccess = trpc.demo.secureUpdateTenantTrainingAccess.useMutation({
    onSuccess: async () => {
      await dashboard.refetch();
    },
  });
  const updatePlatformSettings = trpc.demo.secureUpdateChcgPlatformSettings.useMutation({
    onSuccess: async () => {
      await dashboard.refetch();
    },
  });

  const [clientName, setClientName] = useState("");
  const [industry, setIndustry] = useState("Contact center operations");
  const [accent, setAccent] = useState("#2563EB");
  const [logoMark, setLogoMark] = useState("CHC");
  const [description, setDescription] = useState("A CHCG-managed client workspace prepared for branded enablement, role-based governance, and training activation.");
  const [heroStatement, setHeroStatement] = useState("CHCG-managed enablement intelligence for teams that need controlled rollout, governed content access, and measurable readiness improvement.");
  const [licensedJourneyIds, setLicensedJourneyIds] = useState<string[]>([]);
  const [licensedAssetIds, setLicensedAssetIds] = useState<string[]>([]);
  const [provisioningMode, setProvisioningMode] = useState<"Guided" | "Self-serve review">("Guided");
  const [defaultLibraryPolicy, setDefaultLibraryPolicy] = useState<"CHCG core plus licensed tenant uploads" | "Tenant-curated with CHCG overlays">("CHCG core plus licensed tenant uploads");
  const [trainingUnlockPolicy, setTrainingUnlockPolicy] = useState<"Manual CHCG approval" | "Client-admin request with CHCG confirmation">("Manual CHCG approval");
  const [governanceNote, setGovernanceNote] = useState("CHCG governs tenant activation, training availability, and white-label standards from one organization-level control plane.");

  useEffect(() => {
    if (!selectedTenantId && access.data?.tenant.id) {
      setSelectedTenantId(access.data.tenant.id);
    }
  }, [access.data?.tenant.id, selectedTenantId]);

  useEffect(() => {
    if (!dashboard.data) {
      return;
    }

    setSelectedTenantId(dashboard.data.selectedTenant.tenant.id);
    setLicensedJourneyIds(dashboard.data.selectedTenant.entitlement.licensedJourneyIds);
    setLicensedAssetIds(dashboard.data.selectedTenant.entitlement.licensedAssetIds);
    setProvisioningMode(dashboard.data.platformSettings.provisioningMode);
    setDefaultLibraryPolicy(dashboard.data.platformSettings.defaultLibraryPolicy);
    setTrainingUnlockPolicy(dashboard.data.platformSettings.trainingUnlockPolicy);
    setGovernanceNote(dashboard.data.platformSettings.governanceNote);
  }, [dashboard.data]);

  function toggleSelection(id: string, values: string[], setValues: (next: string[]) => void) {
    setValues(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  }

  if (access.isLoading || (organizationAdminEnabled && dashboard.isLoading)) {
    return <LoadingState />;
  }

  if (!organizationAdminEnabled) {
    return (
      <Surface>
        <SectionShell
          eyebrow="CHCG Admin"
          title="Organization-level controls"
          description="This workspace is reserved for CHCG organization administrators who can govern clients, training access, and platform policy across the full demo environment."
        >
          <PremiumCard>
            <CardContent className="py-12 text-center text-slate-300">
              Your current access does not include CHCG organization administration. Sign in with an organization-admin account to manage clients and platform controls.
            </CardContent>
          </PremiumCard>
        </SectionShell>
      </Surface>
    );
  }

  if (!dashboard.data) {
    return <LoadingState />;
  }

  const selectedTenant = dashboard.data.selectedTenant;

  return (
    <Surface>
      <SectionShell
        eyebrow="CHCG Admin"
        title="Organization control plane"
        description="Create and govern client workspaces, unlock training journeys, and manage CHCG-wide operating policy from one admin surface."
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {dashboard.data.metrics.map((metric: any) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} supporting={metric.supporting} icon={<ShieldCheck className="h-4 w-4" />} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
            <div className="space-y-6">
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Create client workspace</CardTitle>
                  <CardDescription className="text-slate-400">Provision a new client under CHCG control with its own branding baseline and admin roster.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                      <span>Client name</span>
                      <input value={clientName} onChange={(event) => setClientName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      <span>Industry</span>
                      <input value={industry} onChange={(event) => setIndustry(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      <span>Accent</span>
                      <input value={accent} onChange={(event) => setAccent(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      <span>Logo mark</span>
                      <input value={logoMark} onChange={(event) => setLogoMark(event.target.value.slice(0, 3).toUpperCase())} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                      <span>Description</span>
                      <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                    </label>
                    <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                      <span>Hero statement</span>
                      <textarea value={heroStatement} onChange={(event) => setHeroStatement(event.target.value)} className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                      disabled={createTenant.isPending || clientName.trim().length < 3}
                      onClick={() => createTenant.mutate({ name: clientName, industry, accent, logoMark, description, heroStatement })}
                    >
                      {createTenant.isPending ? "Creating..." : "Add client workspace"}
                    </Button>
                    {createTenant.isSuccess ? <span className="text-sm text-emerald-300">Client workspace added and ready for licensing.</span> : null}
                  </div>
                </CardContent>
              </PremiumCard>

              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">CHCG platform policy</CardTitle>
                  <CardDescription className="text-slate-400">Control how provisioning, library governance, and training unlocks are managed across all clients.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-300">
                      <span>Provisioning mode</span>
                      <Select value={provisioningMode} onValueChange={(value) => setProvisioningMode(value as "Guided" | "Self-serve review")}>
                        <SelectTrigger className="h-12 border-white/10 bg-slate-950/80 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Guided">Guided</SelectItem>
                          <SelectItem value="Self-serve review">Self-serve review</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="space-y-2 text-sm text-slate-300">
                      <span>Training unlock policy</span>
                      <Select value={trainingUnlockPolicy} onValueChange={(value) => setTrainingUnlockPolicy(value as "Manual CHCG approval" | "Client-admin request with CHCG confirmation")}>
                        <SelectTrigger className="h-12 border-white/10 bg-slate-950/80 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Manual CHCG approval">Manual CHCG approval</SelectItem>
                          <SelectItem value="Client-admin request with CHCG confirmation">Client-admin request with CHCG confirmation</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                      <span>Default library policy</span>
                      <Select value={defaultLibraryPolicy} onValueChange={(value) => setDefaultLibraryPolicy(value as "CHCG core plus licensed tenant uploads" | "Tenant-curated with CHCG overlays")}>
                        <SelectTrigger className="h-12 border-white/10 bg-slate-950/80 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHCG core plus licensed tenant uploads">CHCG core plus licensed tenant uploads</SelectItem>
                          <SelectItem value="Tenant-curated with CHCG overlays">Tenant-curated with CHCG overlays</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                      <span>Governance note</span>
                      <textarea value={governanceNote} onChange={(event) => setGovernanceNote(event.target.value)} className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                      disabled={updatePlatformSettings.isPending}
                      onClick={() => updatePlatformSettings.mutate({ provisioningMode, defaultLibraryPolicy, trainingUnlockPolicy, governanceNote })}
                    >
                      {updatePlatformSettings.isPending ? "Saving..." : "Apply platform policy"}
                    </Button>
                    {updatePlatformSettings.isSuccess ? <span className="text-sm text-emerald-300">Platform policy updated.</span> : null}
                  </div>
                </CardContent>
              </PremiumCard>
            </div>

            <div className="space-y-6">
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Client portfolio control</CardTitle>
                  <CardDescription className="text-slate-400">Switch between tenants, review readiness for rollout, and decide which training resources are unlocked.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <TenantPicker tenants={dashboard.data.tenants} tenantId={selectedTenant.tenant.id} setTenantId={setSelectedTenantId} />
                    <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{selectedTenant.users.length} users provisioned</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    <MetricCard label="Selected client" value={selectedTenant.tenant.name} supporting={selectedTenant.tenant.industry} icon={<Building2 className="h-4 w-4" />} />
                    <MetricCard label="Licensed journeys" value={`${licensedJourneyIds.length}`} supporting="Journeys currently unlocked for this client." icon={<BookOpen className="h-4 w-4" />} />
                    <MetricCard label="Licensed assets" value={`${licensedAssetIds.length}`} supporting="Library assets available to this client." icon={<Layers3 className="h-4 w-4" />} />
                    <MetricCard label="Brand label" value={selectedTenant.branding.preferredLabel} supporting={selectedTenant.branding.accent} icon={<Sparkles className="h-4 w-4" />} />
                  </div>
                </CardContent>
              </PremiumCard>

              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Training journey unlocks</CardTitle>
                  <CardDescription className="text-slate-400">Enable or withhold journey-based learning experiences for the selected client workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {selectedTenant.availableJourneys.map((journey: any) => {
                      const enabled = licensedJourneyIds.includes(journey.id);
                      return (
                        <div key={journey.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-white">{journey.title}</p>
                              <p className="mt-2 text-sm text-slate-400 capitalize">Primary audience · {journey.role.replaceAll("_", " ")}</p>
                            </div>
                            <Button type="button" variant="outline" className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white" onClick={() => toggleSelection(journey.id, licensedJourneyIds, setLicensedJourneyIds)}>
                              {enabled ? "Unlocked" : "Locked"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </PremiumCard>

              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Library and training asset unlocks</CardTitle>
                  <CardDescription className="text-slate-400">Choose which CHCG or tenant-specific assets should be visible inside the selected client experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {selectedTenant.availableAssets.map((asset: any) => {
                      const enabled = licensedAssetIds.includes(asset.id);
                      return (
                        <div key={asset.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-white">{asset.title}</p>
                              <p className="mt-2 text-sm text-slate-400">{asset.category} · {asset.sourceKind === "chcg" ? "CHCG core" : "Client content"}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {asset.linkedRoles.map((linked: string) => (
                                  <Badge key={`${asset.id}-${linked}`} variant="outline" className="rounded-full border-white/10 bg-slate-950/60 text-slate-200">
                                    {linked === "all" ? "All roles" : linked.replaceAll("_", " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button type="button" variant="outline" className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white" onClick={() => toggleSelection(asset.id, licensedAssetIds, setLicensedAssetIds)}>
                              {enabled ? "Unlocked" : "Locked"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                      disabled={updateTrainingAccess.isPending}
                      onClick={() => updateTrainingAccess.mutate({ tenantId: selectedTenant.tenant.id, licensedJourneyIds, licensedAssetIds })}
                    >
                      {updateTrainingAccess.isPending ? "Saving access..." : "Apply client training access"}
                    </Button>
                    {updateTrainingAccess.isSuccess ? <span className="text-sm text-emerald-300">Training access updated for {selectedTenant.tenant.name}.</span> : null}
                  </div>
                </CardContent>
              </PremiumCard>
            </div>
          </div>
        </div>

        <PremiumCard>
          <CardHeader>
            <CardTitle className="text-white">Author CHCG core quiz content</CardTitle>
            <CardDescription className="text-slate-300">
              Edit, add, or hide the canonical apply-checkpoint questions every client inherits. Clients can still override these for their own tenant from Client Control.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentAuthoringPanel scope="core" />
          </CardContent>
        </PremiumCard>
      </SectionShell>
    </Surface>
  );
}

function ReviewLogComposer({
  tenantId,
  subjectUserId,
  authorRole,
  onCreated,
  title,
  description = "Capture one-on-ones, quarterly reviews, and annual summaries while the platform keeps learning evidence attached.",
  allowAttachments = false,
  resourceOptions = [],
  resourceButtonLabel = "Observation resources",
  saveLabel = "Save review log",
  successLabel = "Documentation entry saved.",
}: {
  tenantId: string;
  subjectUserId: string;
  authorRole: "manager" | "coach" | "executive" | "client_admin";
  onCreated?: () => void;
  title: string;
  description?: string;
  allowAttachments?: boolean;
  resourceOptions?: Array<{
    id: string;
    title: string;
    summary?: string;
    format: string;
    sourceKind: "client_upload" | "chcg_library";
    sourceLabel: string;
    tags?: string[];
  }>;
  resourceButtonLabel?: string;
  saveLabel?: string;
  successLabel?: string;
}) {
  const [reviewType, setReviewType] = useState<"one_on_one" | "quarterly_check_in" | "annual_review">("one_on_one");
  const [reviewTitle, setReviewTitle] = useState(title);
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const selectedResources = resourceOptions.filter((resource) => selectedResourceIds.includes(resource.id));
  const createReviewLog = trpc.demo.previewCreateReviewLog.useMutation({
    onSuccess: () => {
      setNotes("");
      setNextStep("");
      setSelectedAttachments([]);
      setAttachmentNotice(null);
      setAttachmentInputKey((current) => current + 1);
      setSelectedResourceIds([]);
      setResourceDialogOpen(false);
      onCreated?.();
    },
  });

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-[0_18px_50px_rgba(2,8,23,0.24)]">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-sm leading-6 text-slate-400">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Review type</span>
          <Select value={reviewType} onValueChange={(value) => setReviewType(value as "one_on_one" | "quarterly_check_in" | "annual_review")}>
            <SelectTrigger className="border-white/10 bg-slate-950/80 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [color-scheme:dark]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_on_one">One-on-one</SelectItem>
              <SelectItem value="quarterly_check_in">Quarterly check-in</SelectItem>
              <SelectItem value="annual_review">Annual review</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Title</span>
          <input value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} className={FORM_INPUT_SURFACE_CLASS} />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Documentation notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`} />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Next step</span>
          <input value={nextStep} onChange={(event) => setNextStep(event.target.value)} className={FORM_INPUT_SURFACE_CLASS} />
        </label>
      </div>
      {allowAttachments ? (
        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Follow-up attachments</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Attach screenshots, scorecards, recordings, or notes directly while you document the coaching follow-up.</p>
            </div>
            <label className="cursor-pointer rounded-full border border-white/12 bg-slate-950/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900">
              Add files
              <input
                key={attachmentInputKey}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  const incomingFiles = Array.from(event.target.files ?? []);
                  if (!incomingFiles.length) {
                    return;
                  }

                  const oversizedFiles = incomingFiles.filter((file) => file.size > WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);
                  const validFiles = incomingFiles.filter((file) => file.size <= WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);

                  setSelectedAttachments((current) => {
                    const deduped = validFiles.filter((file) => !current.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));
                    return [...current, ...deduped].slice(0, WEEKLY_COACHING_ATTACHMENT_LIMIT);
                  });

                  if (oversizedFiles.length) {
                    setAttachmentNotice(`${oversizedFiles[0]?.name ?? "A file"} exceeds the 15 MB attachment limit.`);
                  } else if ((selectedAttachments.length + validFiles.length) > WEEKLY_COACHING_ATTACHMENT_LIMIT) {
                    setAttachmentNotice(`Only the first ${WEEKLY_COACHING_ATTACHMENT_LIMIT} files will be attached.`);
                  } else {
                    setAttachmentNotice(null);
                  }

                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {selectedAttachments.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedAttachments.map((file) => {
                const fileKey = `${file.name}-${file.lastModified}-${file.size}`;
                return (
                  <button
                    key={fileKey}
                    type="button"
                    onClick={() => {
                      setSelectedAttachments((current) => current.filter((entry) => `${entry.name}-${entry.lastModified}-${entry.size}` !== fileKey));
                      setAttachmentNotice(null);
                    }}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-left text-xs text-cyan-100 transition hover:bg-cyan-400/16"
                  >
                    {file.name} · {formatWeeklyCoachingAttachmentSize(file.size)} · Remove
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-400">No follow-up attachment selected yet.</p>
          )}
          {attachmentNotice ? <p className="mt-3 text-sm text-amber-200">{attachmentNotice}</p> : null}
        </div>
      ) : null}
      {resourceOptions.length ? (
        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Observation resources</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Open the popup to attach methodology or tenant resources directly to this observation note.</p>
            </div>
            <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
              <Button type="button" variant="outline" onClick={() => setResourceDialogOpen(true)} className="rounded-full border-cyan-400/30 bg-cyan-400/12 text-cyan-50 hover:bg-cyan-400/18 hover:text-white">
                {resourceButtonLabel}
              </Button>
              <DialogContent className="max-h-[84vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Attach coaching observation resources</DialogTitle>
                  <DialogDescription className="text-slate-400">Choose the CHCG or tenant resources that should travel with this follow-up note.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  {resourceOptions.map((resource) => {
                    const selected = selectedResourceIds.includes(resource.id);
                    return (
                      <button
                        key={resource.id}
                        type="button"
                        onClick={() => setSelectedResourceIds((current) => current.includes(resource.id) ? current.filter((entry) => entry !== resource.id) : [...current, resource.id].slice(0, 6))}
                        className={`rounded-[1.45rem] border px-4 py-4 text-left transition ${selected ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_18px_40px_rgba(6,182,212,0.16)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`rounded-full ${resource.sourceKind === "client_upload" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-cyan-500/20 bg-cyan-500/10 text-cyan-200"}`}>
                            {resource.sourceKind === "client_upload" ? "Client upload" : "CHCG asset"}
                          </Badge>
                          <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{resource.format}</Badge>
                          {selected ? <Badge className="rounded-full border-cyan-300/30 bg-cyan-300/12 text-cyan-50">Attached</Badge> : null}
                        </div>
                        <h4 className="mt-3 text-base font-semibold text-white">{resource.title}</h4>
                        {resource.summary ? <p className="mt-2 text-sm leading-6 text-slate-300">{resource.summary}</p> : null}
                        <p className="mt-3 text-sm text-slate-400">Source: {resource.sourceLabel}</p>
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {selectedResources.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedResources.map((resource) => (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => setSelectedResourceIds((current) => current.filter((entry) => entry !== resource.id))}
                  className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-left text-xs text-violet-100 transition hover:bg-violet-400/16"
                >
                  {resource.title} · {resource.format} · Remove
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-400">No observation resources attached yet.</p>
          )}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <Button
          className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
          disabled={createReviewLog.isPending || notes.trim().length < 10 || nextStep.trim().length < 5 || reviewTitle.trim().length < 3}
          onClick={async () => {
            try {
              setAttachmentNotice(null);
              const attachments = allowAttachments ? await buildWeeklyCoachingAttachmentPayload(selectedAttachments) : [];
              await createReviewLog.mutateAsync({
                tenantId,
                subjectUserId,
                authorRole,
                reviewType,
                title: reviewTitle,
                notes,
                nextStep,
                attachments: attachments.length ? attachments : undefined,
                attachedResources: selectedResources.length ? selectedResources.map((resource) => ({
                  id: resource.id,
                  title: resource.title,
                  format: resource.format,
                  sourceKind: resource.sourceKind,
                  sourceLabel: resource.sourceLabel,
                })) : undefined,
              });
            } catch (error) {
              setAttachmentNotice(error instanceof Error ? error.message : "Unable to prepare the selected attachments.");
            }
          }}
        >
          {createReviewLog.isPending ? "Saving..." : saveLabel}
        </Button>
        <div className="space-y-1 text-sm">
          {createReviewLog.isError ? <p className="text-rose-300">{createReviewLog.error.message}</p> : null}
          {createReviewLog.isSuccess ? <span className="text-sm text-emerald-300">{successLabel}</span> : null}
        </div>
      </div>
    </div>
  );
}

const WEEKLY_COACHING_MINIMUMS = {
  attendance: 3,
  followUpFromPrevious: 5,
  coachingComments: 5,
  smartGoalCommitment: 5,
  additionalSupport: 3,
} as const;

function getWeeklyCoachingValidationMessages(input: {
  attendance: string;
  followUpFromPrevious: string;
  coachingComments: string;
  smartGoalCommitment: string;
  additionalSupport: string;
}) {
  const validationMessages: string[] = [];

  if (input.attendance.trim().length < WEEKLY_COACHING_MINIMUMS.attendance) {
    validationMessages.push("Attendance needs a short status note.");
  }
  if (input.followUpFromPrevious.trim().length < WEEKLY_COACHING_MINIMUMS.followUpFromPrevious) {
    validationMessages.push("Add a brief follow-up from the previous coaching.");
  }
  if (input.coachingComments.trim().length < WEEKLY_COACHING_MINIMUMS.coachingComments) {
    validationMessages.push("Add at least a short coaching comment.");
  }
  if (input.smartGoalCommitment.trim().length < WEEKLY_COACHING_MINIMUMS.smartGoalCommitment) {
    validationMessages.push("Add the coaching commitment or next step.");
  }
  if (input.additionalSupport.trim().length < WEEKLY_COACHING_MINIMUMS.additionalSupport) {
    validationMessages.push("Add the support plan before saving.");
  }

  return validationMessages;
}

type WeeklyCoachingUploadInput = {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  sizeBytes: number;
};

const WEEKLY_COACHING_ATTACHMENT_LIMIT = 5;
const WEEKLY_COACHING_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

async function readWeeklyCoachingFileAsBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.split(",")[1] ?? "" : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

async function buildWeeklyCoachingAttachmentPayload(files: File[]) {
  if (files.length > WEEKLY_COACHING_ATTACHMENT_LIMIT) {
    throw new Error(`Attach up to ${WEEKLY_COACHING_ATTACHMENT_LIMIT} files per coaching log.`);
  }

  return await Promise.all(files.map(async (file) => {
    if (file.size > WEEKLY_COACHING_ATTACHMENT_MAX_BYTES) {
      throw new Error(`${file.name} exceeds the 15 MB attachment limit.`);
    }

    return {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      dataBase64: await readWeeklyCoachingFileAsBase64(file),
      sizeBytes: file.size,
    } satisfies WeeklyCoachingUploadInput;
  }));
}

function formatWeeklyCoachingAttachmentSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

function CoachingAttachmentList({
  attachments,
  emptyLabel = "No attachments added to this coaching log yet.",
}: {
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileUrl: string;
    sizeBytes: number;
    uploadedAt: string;
    uploadedByRole?: string;
  }>;
  emptyLabel?: string;
}) {
  if (!attachments?.length) {
    return <p className="text-sm leading-6 text-slate-300">{emptyLabel}</p>;
  }

  return (
    <div className="grid gap-3">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-slate-950/80 px-4 py-3 transition hover:border-cyan-300/50 hover:bg-slate-950"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{attachment.fileName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              {attachment.mimeType || "application/octet-stream"} · {formatWeeklyCoachingAttachmentSize(attachment.sizeBytes)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()} by {String(attachment.uploadedByRole ?? "coach").replaceAll("_", " ")}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 transition group-hover:text-cyan-100">Open file</span>
        </a>
      ))}
    </div>
  );
}

type WeeklyCoachingLogComposerProps = {
  tenantId: string;
  subjectUserId: string;
  coachRole: "manager" | "coach" | "executive" | "client_admin";
  title: string;
  employeeName: string;
  employeeEmail: string;
  coachName: string;
  coachEmail: string;
  supervisorName: string;
  supervisorEmail: string;
  managerOfSupervisorEmail?: string;
  onCreated?: () => void;
};

function WeeklyCoachingLogComposer({
  tenantId,
  subjectUserId,
  coachRole,
  title,
  employeeName,
  employeeEmail,
  coachName,
  coachEmail,
  supervisorName,
  supervisorEmail,
  managerOfSupervisorEmail,
  onCreated,
}: WeeklyCoachingLogComposerProps) {
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState("");
  const [followUpFromPrevious, setFollowUpFromPrevious] = useState("");
  const [coachingComments, setCoachingComments] = useState("");
  const [smartGoalCommitment, setSmartGoalCommitment] = useState("");
  const [additionalSupport, setAdditionalSupport] = useState("");
  const [agentTakeaways, setAgentTakeaways] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const trimmedAttendance = attendance.trim();
  const trimmedFollowUpFromPrevious = followUpFromPrevious.trim();
  const trimmedCoachingComments = coachingComments.trim();
  const trimmedSmartGoalCommitment = smartGoalCommitment.trim();
  const trimmedAdditionalSupport = additionalSupport.trim();
  const trimmedAgentTakeaways = agentTakeaways.trim();
  const coachingValidationMessages = getWeeklyCoachingValidationMessages({
    attendance: trimmedAttendance,
    followUpFromPrevious: trimmedFollowUpFromPrevious,
    coachingComments: trimmedCoachingComments,
    smartGoalCommitment: trimmedSmartGoalCommitment,
    additionalSupport: trimmedAdditionalSupport,
  });
  const canSaveWeeklyCoachingLog = coachingValidationMessages.length === 0;
  const createWeeklyCoachingLog = trpc.demo.secureCreateWeeklyCoachingLog.useMutation({
    onSuccess: () => {
      setAttendance("");
      setFollowUpFromPrevious("");
      setCoachingComments("");
      setSmartGoalCommitment("");
      setAdditionalSupport("");
      setAgentTakeaways("");
      setSelectedAttachments([]);
      setAttachmentNotice(null);
      setAttachmentInputKey((current) => current + 1);
      setVisibility("public");
      onCreated?.();
    },
  });

  const visibilityPresentation = getWeeklyCoachingVisibilityPresentation(visibility);
  const shareTargets = buildWeeklyCoachingShareRecipients({
    id: subjectUserId,
    employeeEmail,
    coachEmail,
    supervisorEmail,
    managerOfSupervisorEmail,
    visibility,
  }).map((recipient) => ({ key: recipient.key, label: recipient.label.replace("copy", "delivery") }));

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-[0_18px_50px_rgba(2,8,23,0.24)]">
      <div className="mb-4 space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Weekly coaching log</p>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm leading-6 text-slate-400">Capture the exact weekly coaching fields, show who receives the simulated copy, and preserve the learner's own take-aways in the same record.</p>
      </div>
      <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Public / Private visibility</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Choose whether this coaching log is routed to the learner or stays leadership-only on file.</p>
          </div>
          <Badge className={`rounded-full border ${visibilityPresentation.badgeClassName}`}>{visibilityPresentation.label}</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setVisibility("public")}
            className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${visibility === "public" ? "border-emerald-300 bg-emerald-400/12 shadow-[0_18px_40px_rgba(16,185,129,0.16)]" : "border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-white/8"}`}
          >
            <p className="text-sm font-semibold text-white">Public coaching log</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Learner, coach, and supervisor receive the same coaching record and linked follow-through.</p>
          </button>
          <button
            type="button"
            onClick={() => setVisibility("private")}
            className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${visibility === "private" ? "border-violet-300 bg-violet-400/12 shadow-[0_18px_40px_rgba(139,92,246,0.16)]" : "border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-white/8"}`}
          >
            <p className="text-sm font-semibold text-white">Private coaching note</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Private stays on file for leadership only and does not notify the learner.</p>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {shareTargets.map((target) => (
            <Badge key={target.key} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target.label}</Badge>
          ))}
        </div>
      </div>
      <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Attachments</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Attach any file type to the coaching log for scorecards, screenshots, recordings, or supporting notes. Upload up to five files, 15 MB each.</p>
          </div>
          <label className="cursor-pointer rounded-full border border-white/12 bg-slate-950/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900">
            Add supporting files
            <input
              key={attachmentInputKey}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const incomingFiles = Array.from(event.target.files ?? []);
                if (!incomingFiles.length) {
                  return;
                }

                const oversizedFiles = incomingFiles.filter((file) => file.size > WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);
                const validFiles = incomingFiles.filter((file) => file.size <= WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);

                setSelectedAttachments((current) => {
                  const deduped = validFiles.filter((file) => !current.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));
                  return [...current, ...deduped].slice(0, WEEKLY_COACHING_ATTACHMENT_LIMIT);
                });

                if (oversizedFiles.length) {
                  setAttachmentNotice(`${oversizedFiles[0]?.name ?? "A file"} exceeds the 15 MB attachment limit.`);
                } else if ((selectedAttachments.length + validFiles.length) > WEEKLY_COACHING_ATTACHMENT_LIMIT) {
                  setAttachmentNotice(`Only the first ${WEEKLY_COACHING_ATTACHMENT_LIMIT} files will be attached.`);
                } else {
                  setAttachmentNotice(null);
                }

                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        {selectedAttachments.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedAttachments.map((file) => {
              const fileKey = `${file.name}-${file.lastModified}-${file.size}`;
              return (
                <button
                  key={fileKey}
                  type="button"
                  onClick={() => {
                    setSelectedAttachments((current) => current.filter((entry) => `${entry.name}-${entry.lastModified}-${entry.size}` !== fileKey));
                    setAttachmentNotice(null);
                  }}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-left text-xs text-cyan-100 transition hover:bg-cyan-400/16"
                >
                  {file.name} · {formatWeeklyCoachingAttachmentSize(file.size)} · Remove
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-400">No attachment selected yet.</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Date</span>
          <input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className={FORM_INPUT_SURFACE_CLASS} />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Coach</span>
          <input value={`${coachName} (${coachRole.replaceAll("_", " ")})`} readOnly className={READONLY_FORM_INPUT_SURFACE_CLASS} />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Employee</span>
          <input value={employeeName} readOnly className={READONLY_FORM_INPUT_SURFACE_CLASS} />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Attendance</span>
          <input value={attendance} onChange={(event) => setAttendance(event.target.value)} placeholder="Document where the agent stands for attendance." className={FORM_INPUT_SURFACE_CLASS} />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Follow-up from previous coaching</span>
          <textarea value={followUpFromPrevious} onChange={(event) => setFollowUpFromPrevious(event.target.value)} rows={4} placeholder="Progress on the prior SMART goal — did the agent meet it, and how or how not?" className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`} />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Coaching comments</span>
          <textarea value={coachingComments} onChange={(event) => setCoachingComments(event.target.value)} rows={4} placeholder="Behavior discussed and actions the agent will take." className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`} />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>SMART Goal Coaching Commitment</span>
          <textarea value={smartGoalCommitment} onChange={(event) => setSmartGoalCommitment(event.target.value)} rows={4} placeholder="How behavior will change, metric impact, timeline, and follow-up date." className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`} />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Additional support</span>
          <textarea value={additionalSupport} onChange={(event) => setAdditionalSupport(event.target.value)} rows={3} placeholder="What the leader can do to remove barriers." className={`min-h-[96px] ${FORM_INPUT_SURFACE_CLASS}`} />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Agent take-aways</span>
          <textarea value={agentTakeaways} onChange={(event) => setAgentTakeaways(event.target.value)} rows={3} placeholder="The agent's own response or take-aways can be entered now or added later from the learner view." className={`min-h-[96px] ${FORM_INPUT_SURFACE_CLASS}`} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <Button
          type="button"
          className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
          disabled={createWeeklyCoachingLog.isPending || !canSaveWeeklyCoachingLog}
          onClick={async () => {
            try {
              setAttachmentNotice(null);
              const attachments = await buildWeeklyCoachingAttachmentPayload(selectedAttachments);
              await createWeeklyCoachingLog.mutateAsync({
                tenantId,
                subjectUserId,
                coachRole,
                sessionDate,
                attendance: trimmedAttendance,
                followUpFromPrevious: trimmedFollowUpFromPrevious,
                coachingComments: trimmedCoachingComments,
                smartGoalCommitment: trimmedSmartGoalCommitment,
                additionalSupport: trimmedAdditionalSupport,
                managerOfSupervisorEmail,
                agentTakeaways: trimmedAgentTakeaways || undefined,
                visibility,
                attachments: attachments.length ? attachments : undefined,
              });
            } catch (error) {
              setAttachmentNotice(error instanceof Error ? error.message : "Unable to prepare the selected attachments.");
            }
          }}
        >
          {createWeeklyCoachingLog.isPending ? "Saving..." : "Save weekly coaching log"}
        </Button>
        <div className="space-y-1 text-sm">
          {!canSaveWeeklyCoachingLog ? <p className="text-amber-200">Complete the remaining required coaching fields before saving: {coachingValidationMessages.join(" ")}</p> : null}
          {attachmentNotice ? <p className="text-amber-200">{attachmentNotice}</p> : null}
          {createWeeklyCoachingLog.isError ? <p className="text-rose-300">{createWeeklyCoachingLog.error.message}</p> : null}
          {createWeeklyCoachingLog.isSuccess ? <p className="text-emerald-300">Weekly coaching log saved with visibility, routing, and attachment details.</p> : null}
        </div>
      </div>
    </div>
  );
}

function WeeklyCoachingLogPopupBox({
  buttonLabel = "Launch weekly one-on-one",
  dialogTitle = "Weekly one-on-one",
  dialogDescription = "Complete the full weekly one-on-one, capture agent take-aways, and set the SMART goal before returning to the coaching lane.",
  buttonClassName = "rounded-full border-cyan-400/30 bg-cyan-400/12 text-cyan-50 hover:bg-cyan-400/18 hover:text-white",
  composerProps,
  onCreated,
}: {
  buttonLabel?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  buttonClassName?: string;
  composerProps: WeeklyCoachingLogComposerProps;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className={buttonClassName}>
        {buttonLabel}
      </Button>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="text-slate-300">{dialogDescription}</DialogDescription>
        </DialogHeader>
        {open ? (
          <WeeklyCoachingLogComposer
            key={`${composerProps.subjectUserId}-${composerProps.employeeName}-${open ? "open" : "closed"}`}
            {...composerProps}
            onCreated={() => {
              setOpen(false);
              onCreated?.();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CoachLaneActionCard({
  eyebrow,
  title,
  description,
  action,
  accent = "default",
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: ReactNode;
  accent?: "default" | "emerald" | "gold";
}) {
  const paletteClassName = accent === "emerald"
    ? "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.92))]"
    : accent === "gold"
      ? "border-[#E6BE5A]/70 bg-[linear-gradient(180deg,rgba(255,247,216,0.98),rgba(252,228,150,0.94))] text-slate-950"
      : "border-slate-700/80 bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.92))] text-slate-50";

  return (
    <div className={`rounded-[1.25rem] border px-3 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.12)] ${paletteClassName}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${accent === "emerald" ? "text-emerald-700" : accent === "gold" ? "text-[#7A5200]" : "text-slate-200"}`}>{eyebrow}</p>
      <h3 className={`mt-1.5 text-[15px] font-semibold leading-5 ${accent === "emerald" || accent === "gold" ? "text-slate-950" : "text-white"}`}>{title}</h3>
      <p className={`mt-1 text-[13px] leading-5 ${accent === "emerald" ? "text-emerald-900/80" : accent === "gold" ? "text-slate-700" : "text-slate-200"}`}>{description}</p>
      <div className="mt-2.5">{action}</div>
    </div>
  );
}

function PushCoachTrainingCard({ coaches, catalog }: { coaches: any[]; catalog: any[] }) {
  const assetOptions = catalog.flatMap((journey: any) =>
    (journey.modules ?? []).map((module: any) => ({ id: module.id, label: `${journey.title} · ${module.title}` })),
  );
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const [assetId, setAssetId] = useState(assetOptions[0]?.id ?? "");
  const [pushed, setPushed] = useState<{ coach: string; asset: string } | null>(null);
  const selectedCoach = coaches.find((coach: any) => coach.id === coachId) ?? coaches[0] ?? null;
  const selectedAsset = assetOptions.find((asset) => asset.id === assetId) ?? assetOptions[0] ?? null;

  return (
    <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-200">Coach</p>
          <Select value={coachId} onValueChange={(value) => { setCoachId(value); setPushed(null); }}>
            <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
              <SelectValue placeholder="Select a coach" />
            </SelectTrigger>
            <SelectContent>
              {coaches.map((coach: any) => (
                <SelectItem key={coach.id} value={coach.id}>{coach.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-200">Training or development asset</p>
          <Select value={assetId} onValueChange={(value) => { setAssetId(value); setPushed(null); }}>
            <SelectTrigger className="border-white/10 bg-white/5 text-slate-100">
              <SelectValue placeholder="Select an asset" />
            </SelectTrigger>
            <SelectContent>
              {assetOptions.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>{asset.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {pushed ? (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-50">
          Pushed <span className="font-medium text-white">{pushed.asset}</span> to <span className="font-medium text-white">{pushed.coach}</span> as a coach development assignment.
        </div>
      ) : (
        <p className="text-sm leading-7 text-slate-300">{selectedAsset ? `${selectedAsset.label} will be assigned to ${selectedCoach?.name ?? "the selected coach"} as a coach development track.` : "Select a development asset to assign to a coach."}</p>
      )}
      <Button type="button" disabled={!selectedCoach || !selectedAsset} onClick={() => setPushed({ coach: selectedCoach?.name ?? "", asset: selectedAsset?.label ?? "" })} className="rounded-full bg-[#FCBC34] text-slate-950 hover:bg-[#ffd56d]">
        Push training to coach
      </Button>
    </div>
  );
}

function CoachLaneDialogAction({
  buttonLabel,
  dialogTitle,
  dialogDescription,
  renderContent,
  buttonClassName = "w-full justify-between rounded-full border-cyan-200/55 bg-cyan-300/18 text-white shadow-[0_12px_30px_rgba(34,211,238,0.14)] hover:bg-cyan-300/26 hover:text-white",
  dialogClassName = "max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-4xl",
}: {
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  renderContent: (close: () => void) => ReactNode;
  buttonClassName?: string;
  dialogClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className={buttonClassName}>
        {buttonLabel}
      </Button>
      <DialogContent className={dialogClassName}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="text-slate-300">{dialogDescription}</DialogDescription>
        </DialogHeader>
        {renderContent(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

function WeeklyCoachingLogTimeline({
  title,
  description,
  tenantId,
  logs,
  allowTakeawayEditing = false,
  allowLogEditing = false,
  onUpdated,
}: {
  title: string;
  description: string;
  tenantId: string;
  logs: any[];
  allowTakeawayEditing?: boolean;
  allowLogEditing?: boolean;
  onUpdated?: () => void;
}) {
  const buildStructuredLogDrafts = (entries: any[]) => Object.fromEntries(entries.map((log: any) => [log.id, {
    sessionDate: log.sessionDate,
    attendance: log.attendance,
    followUpFromPrevious: log.followUpFromPrevious,
    coachingComments: log.coachingComments,
    smartGoalCommitment: log.smartGoalCommitment,
    additionalSupport: log.additionalSupport,
    agentTakeaways: log.agentTakeaways ?? "",
  }]));

  const [takeawayDrafts, setTakeawayDrafts] = useState<Record<string, string>>(() => Object.fromEntries(logs.map((log: any) => [log.id, log.agentTakeaways ?? ""])));
  const [structuredLogDrafts, setStructuredLogDrafts] = useState<Record<string, {
    sessionDate: string;
    attendance: string;
    followUpFromPrevious: string;
    coachingComments: string;
    smartGoalCommitment: string;
    additionalSupport: string;
    agentTakeaways: string;
  }>>(() => buildStructuredLogDrafts(logs));
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<Record<string, File[]>>({});
  const [attachmentNoticeByLog, setAttachmentNoticeByLog] = useState<Record<string, string | null>>({});
  const [attachmentInputKeys, setAttachmentInputKeys] = useState<Record<string, number>>({});
  const updateTakeaways = trpc.demo.secureUpdateWeeklyCoachingTakeaways.useMutation({
    onSuccess: () => {
      onUpdated?.();
    },
  });
  const updateStructuredLog = trpc.demo.secureUpdateWeeklyCoachingLog.useMutation({
    onSuccess: () => {
      setEditingLogId(null);
      onUpdated?.();
    },
  });
  const addWeeklyCoachingAttachments = trpc.demo.secureAddWeeklyCoachingLogAttachments.useMutation({
    onSuccess: (_, variables) => {
      setPendingAttachmentFiles((current) => ({ ...current, [variables.weeklyCoachingLogId]: [] }));
      setAttachmentNoticeByLog((current) => ({ ...current, [variables.weeklyCoachingLogId]: null }));
      setAttachmentInputKeys((current) => ({ ...current, [variables.weeklyCoachingLogId]: (current[variables.weeklyCoachingLogId] ?? 0) + 1 }));
      onUpdated?.();
    },
  });

  useEffect(() => {
    setTakeawayDrafts(Object.fromEntries(logs.map((log: any) => [log.id, log.agentTakeaways ?? ""])));
    setStructuredLogDrafts(buildStructuredLogDrafts(logs));
    setPendingAttachmentFiles((current) => Object.fromEntries(logs.map((log: any) => [log.id, current[log.id] ?? []])));
    setAttachmentNoticeByLog((current) => Object.fromEntries(logs.map((log: any) => [log.id, current[log.id] ?? null])));
    setAttachmentInputKeys((current) => Object.fromEntries(logs.map((log: any) => [log.id, current[log.id] ?? 0])));
  }, [logs]);

  return (
    <PremiumCard>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-200/82">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/12 bg-slate-950/72 p-4 text-sm leading-6 text-slate-200">No weekly coaching logs have been captured for this learner yet.</div>
        ) : null}
        {logs.map((log: any) => {
          const isEditing = allowLogEditing && editingLogId === log.id;
          const structuredDraft = structuredLogDrafts[log.id] ?? {
            sessionDate: log.sessionDate,
            attendance: log.attendance,
            followUpFromPrevious: log.followUpFromPrevious,
            coachingComments: log.coachingComments,
            smartGoalCommitment: log.smartGoalCommitment,
            additionalSupport: log.additionalSupport,
            agentTakeaways: log.agentTakeaways ?? "",
          };
          const structuredValidationMessages = getWeeklyCoachingValidationMessages(structuredDraft);
          const canSaveStructuredLog = structuredValidationMessages.length === 0;

          return (
            <div key={log.id} className="rounded-[1.7rem] border border-white/12 bg-slate-950/82 p-5 shadow-[0_22px_55px_rgba(2,8,23,0.28)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{new Date(log.sessionDate).toLocaleDateString()}</p>
                  <h4 className="mt-2 text-lg font-medium text-white">{log.employeeName} · coached by {log.coachName}</h4>
                  <p className="mt-2 text-sm text-slate-200">Coach role: {log.coachRole.replaceAll("_", " ")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {log.updatedAt !== log.createdAt ? <Badge className="rounded-full border-white/12 bg-white/8 text-slate-100">Updated {new Date(log.updatedAt).toLocaleDateString()}</Badge> : null}
                  <Badge className={`rounded-full border ${getWeeklyCoachingVisibilityPresentation(log.visibility).badgeClassName}`}>{getWeeklyCoachingVisibilityPresentation(log.visibility).label}</Badge>
                  <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Linked review: {log.linkedReviewLogId ?? "Pending"}</Badge>
                  {allowLogEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                      onClick={() => {
                        setStructuredLogDrafts((current) => ({
                          ...current,
                          [log.id]: {
                            sessionDate: log.sessionDate,
                            attendance: log.attendance,
                            followUpFromPrevious: log.followUpFromPrevious,
                            coachingComments: log.coachingComments,
                            smartGoalCommitment: log.smartGoalCommitment,
                            additionalSupport: log.additionalSupport,
                            agentTakeaways: log.agentTakeaways ?? "",
                          },
                        }));
                        setEditingLogId((current) => current === log.id ? null : log.id);
                      }}
                    >
                      {isEditing ? "Cancel edit" : "Edit structured log"}
                    </Button>
                  ) : null}
                </div>
              </div>
              {isEditing ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Date</span>
                    <input
                      type="date"
                      value={structuredDraft.sessionDate}
                      onChange={(event) => setStructuredLogDrafts((current) => ({ ...current, [log.id]: { ...structuredDraft, sessionDate: event.target.value } }))}
                      className={FORM_INPUT_SURFACE_CLASS}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Attendance</span>
                    <input
                      value={structuredDraft.attendance}
                      onChange={(event) => setStructuredLogDrafts((current) => ({ ...current, [log.id]: { ...structuredDraft, attendance: event.target.value } }))}
                      className={FORM_INPUT_SURFACE_CLASS}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
                    <span>Follow-up from previous coaching</span>
                    <textarea
                      value={structuredDraft.followUpFromPrevious}
                      onChange={(event) => setStructuredLogDrafts((current) => ({ ...current, [log.id]: { ...structuredDraft, followUpFromPrevious: event.target.value } }))}
                      rows={4}
                      className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
                    <span>Coaching comments</span>
                    <textarea
                      value={structuredDraft.coachingComments}
                      onChange={(event) => setStructuredLogDrafts((current) => ({ ...current, [log.id]: { ...structuredDraft, coachingComments: event.target.value } }))}
                      rows={4}
                      className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
                    <span>SMART Goal Coaching Commitment</span>
                    <textarea
                      value={structuredDraft.smartGoalCommitment}
                      onChange={(event) => setStructuredLogDrafts((current) => ({ ...current, [log.id]: { ...structuredDraft, smartGoalCommitment: event.target.value } }))}
                      rows={4}
                      className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
                    <span>Additional support</span>
                    <textarea
                      value={structuredDraft.additionalSupport}
                      onChange={(event) => setStructuredLogDrafts((current) => ({ ...current, [log.id]: { ...structuredDraft, additionalSupport: event.target.value } }))}
                      rows={3}
                      className={`min-h-[96px] ${FORM_INPUT_SURFACE_CLASS}`}
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
                    <span>Agent take-aways</span>
                    <textarea
                      value={structuredDraft.agentTakeaways}
                      onChange={(event) => setStructuredLogDrafts((current) => ({ ...current, [log.id]: { ...structuredDraft, agentTakeaways: event.target.value } }))}
                      rows={3}
                      className={`min-h-[96px] ${FORM_INPUT_SURFACE_CLASS}`}
                    />
                  </label>
                  <div className="md:col-span-2 flex flex-wrap items-start gap-3">
                    <Button
                      type="button"
                      className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                      disabled={updateStructuredLog.isPending || !canSaveStructuredLog}
                      onClick={() => updateStructuredLog.mutate({
                        tenantId,
                        weeklyCoachingLogId: log.id,
                        sessionDate: structuredDraft.sessionDate,
                        attendance: structuredDraft.attendance.trim(),
                        followUpFromPrevious: structuredDraft.followUpFromPrevious.trim(),
                        coachingComments: structuredDraft.coachingComments.trim(),
                        smartGoalCommitment: structuredDraft.smartGoalCommitment.trim(),
                        additionalSupport: structuredDraft.additionalSupport.trim(),
                        agentTakeaways: structuredDraft.agentTakeaways.trim() || undefined,
                      })}
                    >
                      {updateStructuredLog.isPending ? "Saving..." : "Save updated coaching log"}
                    </Button>
                    <div className="space-y-1 text-sm">
                      {!canSaveStructuredLog ? <p className="text-amber-200">Complete the remaining required coaching fields before saving: {structuredValidationMessages.join(" ")}</p> : null}
                      {updateStructuredLog.isError ? <p className="text-rose-300">{updateStructuredLog.error.message}</p> : null}
                      <p className="text-slate-300">Updates refresh the same coaching record, linked review, and downstream documentation summary.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Attendance</p>
                      <p className="mt-2 text-sm leading-6 text-slate-100">{log.attendance}</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Additional support</p>
                      <p className="mt-2 text-sm leading-6 text-slate-100">{log.additionalSupport}</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Follow-up from previous coaching</p>
                      <p className="mt-2 text-sm leading-6 text-slate-100">{log.followUpFromPrevious}</p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-slate-900/88 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Coaching comments</p>
                      <p className="mt-2 text-sm leading-6 text-slate-100">{log.coachingComments}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">SMART Goal Coaching Commitment</p>
                      <p className="mt-2 text-sm leading-6 text-white">{log.smartGoalCommitment}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Visibility and routing</p>
                    <p className="text-sm leading-6 text-slate-300">{getWeeklyCoachingVisibilityPresentation(log.visibility).summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {buildWeeklyCoachingShareRecipients(log).map((recipient) => (
                        <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-900/90 text-slate-100">{recipient.label}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/12 bg-slate-900/88 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Attachments</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">Add any file type to keep screenshots, QA exports, or supporting evidence attached to the same coaching record.</p>
                      </div>
                      {allowLogEditing ? (
                        <label className="cursor-pointer rounded-full border border-white/12 bg-slate-950/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-950">
                          Add attachments
                          <input
                            key={attachmentInputKeys[log.id] ?? 0}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              const incomingFiles = Array.from(event.target.files ?? []);
                              if (!incomingFiles.length) {
                                return;
                              }

                              const oversizedFiles = incomingFiles.filter((file) => file.size > WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);
                              const validFiles = incomingFiles.filter((file) => file.size <= WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);

                              setPendingAttachmentFiles((current) => {
                                const currentFiles = current[log.id] ?? [];
                                const deduped = validFiles.filter((file) => !currentFiles.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));
                                return {
                                  ...current,
                                  [log.id]: [...currentFiles, ...deduped].slice(0, WEEKLY_COACHING_ATTACHMENT_LIMIT),
                                };
                              });

                              if (oversizedFiles.length) {
                                setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: `${oversizedFiles[0]?.name ?? "A file"} exceeds the 15 MB attachment limit.` }));
                              } else if (((pendingAttachmentFiles[log.id] ?? []).length + validFiles.length) > WEEKLY_COACHING_ATTACHMENT_LIMIT) {
                                setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: `Only the first ${WEEKLY_COACHING_ATTACHMENT_LIMIT} files will be attached.` }));
                              } else {
                                setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: null }));
                              }

                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                    <div className="mt-4">
                      <CoachingAttachmentList attachments={log.attachments} />
                    </div>
                    {allowLogEditing ? (
                      <div className="mt-4 space-y-3">
                        {(pendingAttachmentFiles[log.id] ?? []).length ? (
                          <div className="flex flex-wrap gap-2">
                            {(pendingAttachmentFiles[log.id] ?? []).map((file) => {
                              const fileKey = `${file.name}-${file.lastModified}-${file.size}`;
                              return (
                                <button
                                  key={fileKey}
                                  type="button"
                                  onClick={() => {
                                    setPendingAttachmentFiles((current) => ({
                                      ...current,
                                      [log.id]: (current[log.id] ?? []).filter((entry) => `${entry.name}-${entry.lastModified}-${entry.size}` !== fileKey),
                                    }));
                                    setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: null }));
                                  }}
                                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-left text-xs text-cyan-100 transition hover:bg-cyan-400/16"
                                >
                                  {file.name} · {formatWeeklyCoachingAttachmentSize(file.size)} · Remove
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm leading-6 text-slate-400">No new attachments selected for this record.</p>
                        )}
                        <div className="flex flex-wrap items-start gap-3">
                          <Button
                            type="button"
                            className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                            disabled={addWeeklyCoachingAttachments.isPending || !(pendingAttachmentFiles[log.id] ?? []).length}
                            onClick={async () => {
                              try {
                                setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: null }));
                                const attachments = await buildWeeklyCoachingAttachmentPayload(pendingAttachmentFiles[log.id] ?? []);
                                await addWeeklyCoachingAttachments.mutateAsync({
                                  tenantId,
                                  weeklyCoachingLogId: log.id,
                                  attachments,
                                });
                              } catch (error) {
                                setAttachmentNoticeByLog((current) => ({
                                  ...current,
                                  [log.id]: error instanceof Error ? error.message : "Unable to prepare the selected attachments.",
                                }));
                              }
                            }}
                          >
                            {addWeeklyCoachingAttachments.isPending ? "Uploading..." : "Attach files to this log"}
                          </Button>
                          <div className="space-y-1 text-sm">
                            {attachmentNoticeByLog[log.id] ? <p className="text-amber-200">{attachmentNoticeByLog[log.id]}</p> : null}
                            <p className="text-slate-300">Existing attachments stay connected to the coaching record and documentation drill-down.</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/12 bg-slate-900/88 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Agent take-aways</p>
                    {allowTakeawayEditing ? (
                      <div className="mt-3 space-y-3">
                        <textarea
                          value={takeawayDrafts[log.id] ?? ""}
                          onChange={(event) => setTakeawayDrafts((current) => ({ ...current, [log.id]: event.target.value }))}
                          rows={4}
                          className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`}
                          placeholder="Add the learner's own take-aways from the coaching conversation."
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                            disabled={updateTakeaways.isPending || (takeawayDrafts[log.id] ?? "").trim().length < 3}
                            onClick={() => updateTakeaways.mutate({ tenantId, weeklyCoachingLogId: log.id, agentTakeaways: (takeawayDrafts[log.id] ?? "").trim() })}
                          >
                            {updateTakeaways.isPending ? "Saving..." : "Save agent take-aways"}
                          </Button>
                          <span className="text-sm text-slate-200">Your response is written back into the same coaching record.</span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-slate-100">{log.agentTakeaways || "The learner has not added take-aways yet."}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </PremiumCard>
  );
}

function WorkflowLibraryPanel({
  title,
  description,
  resources,
}: {
  title: string;
  description: string;
  resources: any[];
}) {
  return (
    <PremiumCard>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-300/76">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {resources.map((asset: any) => (
          <div key={asset.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`rounded-full ${asset.sourceKind === "client_upload" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-cyan-500/20 bg-cyan-500/10 text-cyan-200"}`}>
                {asset.sourceKind === "client_upload" ? "Client upload" : "CHCG asset"}
              </Badge>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{asset.format}</Badge>
            </div>
            <h4 className="mt-3 text-lg font-medium text-white">{asset.title}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-300">{asset.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
              {asset.tags.slice(0, 4).map((tag: string) => (
                <span key={`${asset.id}-${tag}`} className="rounded-full border border-white/10 bg-white/6 px-3 py-1">#{tag}</span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-400">Source: {asset.sourceLabel}</p>
          </div>
        ))}
        {resources.length === 0 ? <p className="text-sm text-slate-400">No blended library assets are mapped yet for this workflow context.</p> : null}
      </CardContent>
    </PremiumCard>
  );
}

function ExecutivePanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  const [selectedRoiTrendMetric, setSelectedRoiTrendMetric] = useState<"readiness" | "qaScore" | "csat">("readiness");
  const [selectedErrorTrendMetric, setSelectedErrorTrendMetric] = useState<"total" | "critical" | "moderate" | "minor">("total");
  const [activeExecutiveMode, setActiveExecutiveMode] = useState<"overview" | "trends" | "risk" | "evidence" | "documentation">("overview");
  const [executiveHeroView, setExecutiveHeroView] = useState<"reporting" | "decisionQueue">("reporting");
  const roiTrendConfig = {
    readiness: { label: "Readiness", valueKey: "readiness", benchmarkKey: "benchmarkReadiness", benchmarkLabel: "Peer readiness", color: "#7DD3FC" },
    qaScore: { label: "QA score", valueKey: "qaScore", benchmarkKey: "benchmarkQa", benchmarkLabel: "Peer QA", color: "#34D399" },
    csat: { label: "CSAT", valueKey: "csat", benchmarkKey: "benchmarkCsat", benchmarkLabel: "Peer CSAT", color: "#C084FC" },
  } as const;
  const errorTrendConfig = {
    total: { label: "Total error rate", color: "#F97316" },
    critical: { label: "Critical errors", color: "#FB7185" },
    moderate: { label: "Moderate errors", color: "#F59E0B" },
    minor: { label: "Minor errors", color: "#38BDF8" },
  } as const;
  const selectedRoiTrendConfig = roiTrendConfig[selectedRoiTrendMetric];
  const selectedErrorTrendConfig = errorTrendConfig[selectedErrorTrendMetric];
  const coachingSubject = data.weeklyCoachingLogs[0] ?? {
    subjectUserId: data.reviewLogs[0]?.subjectUserId ?? data.executive.id,
    employeeName: data.executive.name,
    employeeEmail: data.executive.email,
    supervisorName: data.executive.name,
    supervisorEmail: data.executive.email,
    managerOfSupervisorEmail: data.executive.email,
  };
  const buildExecutiveTrainingTargetPath = (entry: { assetId?: string; assetTitle?: string; journeyId?: string; moduleId?: string }) => buildTrainingLaunchPath({
    asset: entry.assetId || entry.assetTitle ? { id: entry.assetId, title: entry.assetTitle } : undefined,
    role: "executive",
    journeyId: entry.journeyId,
    moduleId: entry.moduleId,
  });
  const buildExecutiveLibraryTargetPath = (entry: { assetId?: string; assetTitle?: string; journeyId?: string; moduleId?: string }) => buildLibraryDetailPath({
    assetId: entry.assetId,
    assetTitle: entry.assetTitle,
    role: "executive",
    journeyId: entry.journeyId,
    moduleId: entry.moduleId,
  });
  const pendingDecisions = [
    {
      id: "decision-readiness",
      title: "Approve readiness recovery plan",
      description: `Enterprise readiness is ${data.readiness.score} against a target of ${data.readiness.target}. Confirm whether the next intervention wave should expand this week.`,
      urgency: "High" as const,
      action: () => {
        setExecutiveHeroView("reporting");
        setSelectedRoiTrendMetric("readiness");
        setActiveExecutiveMode("trends");
        window.requestAnimationFrame(() => {
          document.getElementById("executive-trends-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
    },
    {
      id: "decision-qa",
      title: "Review QA score movement by team",
      description: "Team readiness now needs a quality-specific read. Open the trend explorer with QA score selected before approving more coaching hours.",
      urgency: "Medium" as const,
      action: () => {
        setExecutiveHeroView("reporting");
        setSelectedRoiTrendMetric("qaScore");
        setActiveExecutiveMode("trends");
        window.requestAnimationFrame(() => {
          document.getElementById("executive-trends-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
    },
    {
      id: "decision-risk",
      title: "Escalate assessment risk cluster",
      description: "Intervention confidence stays positive overall, but the question-level risk queue still needs an executive decision on where to focus remediation first.",
      urgency: "High" as const,
      action: () => {
        setExecutiveHeroView("reporting");
        setActiveExecutiveMode("risk");
        window.requestAnimationFrame(() => {
          document.getElementById("executive-risk-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
    },
    {
      id: "decision-docs",
      title: "Finalize white-label documentation package",
      description: `Documentation for ${data.tenant.name} is ready for review. Confirm the tenant-facing proof package before distribution.`,
      urgency: "Medium" as const,
      action: () => {
        setExecutiveHeroView("reporting");
        setActiveExecutiveMode("documentation");
        window.requestAnimationFrame(() => {
          document.getElementById("executive-documentation-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      },
    },
  ];
  const openExecutiveMode = (mode: "trends" | "risk" | "documentation", options?: { metric?: "readiness" | "qaScore" | "csat"; targetId?: string }) => {
    if (options?.metric) {
      setSelectedRoiTrendMetric(options.metric);
    }
    setExecutiveHeroView("reporting");
    setActiveExecutiveMode(mode);
    window.requestAnimationFrame(() => {
      document.getElementById(options?.targetId ?? `executive-${mode}-panel`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Enterprise readiness" value={`${data.readiness.score}`} supporting={`Target ${data.readiness.target} · uplift ${data.readiness.uplift} pts`} icon={<Target className="h-4 w-4" />} onClick={() => openExecutiveMode("trends", { metric: "readiness", targetId: "executive-trends-panel" })} actionLabel="Open readiness trends" />
        <MetricCard label="Team readiness" value={`${data.readiness.teamScore}`} supporting="Role- and intervention-weighted readiness score" icon={<Layers3 className="h-4 w-4" />} onClick={() => openExecutiveMode("trends", { metric: "qaScore", targetId: "executive-trends-panel" })} actionLabel="Open QA score trends" />
        <MetricCard label="Intervention confidence" value={data.interventionConfidence.value} supporting={data.interventionConfidence.supporting} icon={<BrainCircuit className="h-4 w-4" />} onClick={() => openExecutiveMode("risk", { targetId: "executive-risk-panel" })} actionLabel="Open risk queue" />
        <MetricCard label="White-label tenant" value={data.tenant.name} supporting={data.tenant.industry} icon={<Building2 className="h-4 w-4" />} onClick={() => openExecutiveMode("documentation", { targetId: "executive-documentation-panel" })} actionLabel="Open documentation" />
      </div>

      <div className="mission-hero-card overflow-hidden rounded-[1.8rem] border border-cyan-500/14 bg-[linear-gradient(180deg,rgba(8,15,30,0.98),rgba(15,23,42,0.96))] px-5 py-5 shadow-[0_22px_60px_rgba(8,15,35,0.18)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => setExecutiveHeroView("reporting")} className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${executiveHeroView === "reporting" ? "border border-cyan-300/20 bg-cyan-300/12 text-cyan-50" : "border border-white/10 bg-white/6 text-cyan-50/80 hover:bg-white/10"}`}>
                Executive reporting
              </button>
              <button type="button" onClick={() => setExecutiveHeroView("decisionQueue")} className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${executiveHeroView === "decisionQueue" ? "border border-cyan-300/20 bg-cyan-300/12 text-cyan-50" : "border border-white/10 bg-white/6 text-cyan-50/80 hover:bg-white/10"}`}>
                Decision queue
              </button>
            </div>
            {executiveHeroView === "reporting" ? (
              <>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Reporting overview</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {data.reportingOverview.summaryCards.map((entry: any) => (
                    <div key={entry.label} className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm transition hover:bg-white/10">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{entry.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{entry.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{entry.detail}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {pendingDecisions.map((decision) => (
                  <div key={decision.id} className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Pending decision</p>
                        <h3 className="mt-2 text-base font-semibold text-white">{decision.title}</h3>
                      </div>
                      <Badge className={`rounded-full ${decision.urgency === "High" ? "border-rose-400/30 bg-rose-500/14 text-rose-100" : "border-amber-400/30 bg-amber-500/14 text-amber-100"}`}>{decision.urgency}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-200">{decision.description}</p>
                    <Button type="button" variant="outline" onClick={decision.action} className="mt-4 rounded-full border-white/10 bg-white/8 text-white hover:bg-white/14 hover:text-white">
                      Take action
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3">
            {executiveHeroView === "reporting" ? (
              <>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Current headline</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{data.reportingOverview.headline}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{data.reportingOverview.summary}</p>
                </div>
                <div className="rounded-[1.2rem] border border-emerald-400/20 bg-white/6 px-4 py-4 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Proof cue</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-200">{data.proofOfImpact.headline}</p>
                </div>
              </>
            ) : (
              <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Decision queue</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Four executive approvals are waiting.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">Review the pending decisions, confirm urgency, and use each action button to jump directly into the correct reporting surface.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeExecutiveMode} onValueChange={(value) => setActiveExecutiveMode(value as "overview" | "trends" | "risk" | "evidence" | "documentation")} className="space-y-4">
        <div className="command-band px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Reporting modes</p>
            </div>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.3rem] border border-white/10 bg-white/6 p-2 xl:w-auto">
              <TabsTrigger value="overview" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Overview</TabsTrigger>
              <TabsTrigger value="trends" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Trends</TabsTrigger>
              <TabsTrigger value="risk" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Risk</TabsTrigger>
              <TabsTrigger value="evidence" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Evidence</TabsTrigger>
              <TabsTrigger value="documentation" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Documentation</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <ChartFrame title="Intervention correlation" description="Readiness movement compared with intervention volume over four weeks.">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.correlationSeries}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="week" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <YAxis yAxisId="left" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} labelStyle={{ color: "#cbd5e1" }} />
                  <Bar yAxisId="left" dataKey="interventions" fill="#2F6FED" radius={[10, 10, 0, 0]} />
                  <Line yAxisId="right" dataKey="readiness" stroke="#7DD3FC" strokeWidth={3} dot={{ r: 4, fill: "#7DD3FC" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Before / after ROI movement</CardTitle>
                <CardDescription className="text-slate-400">A compact executive story of intervention impact.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.roiMetrics.map((metric: any) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-400">{metric.label}</p>
                        <p className="text-xl font-semibold text-white">{metric.after}</p>
                      </div>
                      <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/12 text-emerald-300">{metric.delta}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">Before: {metric.before}</p>
                  </div>
                ))}
              </CardContent>
            </PremiumCard>
          </div>
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Team readiness distribution</CardTitle>
                <CardDescription className="text-slate-400">Where leaders should focus next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.teamReadiness.map((team: any) => (
                  <div key={team.team} className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{team.team}</span>
                      <span>{team.score}</span>
                    </div>
                    <Progress value={team.score} className="h-2 bg-white/8" />
                  </div>
                ))}
              </CardContent>
            </PremiumCard>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {data.peerBenchmarking.map((entry: any) => (
                <div key={entry.id} className="trophy-card h-full p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{entry.cohort}</p>
                  <h3 className="mt-2 text-base font-medium text-white">{entry.metric}</h3>
                  <p className="mt-3 text-3xl font-semibold text-white">{entry.score}</p>
                  <p className="mt-3 text-sm font-medium text-cyan-100">{entry.comparison}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{entry.insight}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends" id="executive-trends-panel" className="mt-0 space-y-6 scroll-mt-24">
          <div className="grid gap-6 xl:grid-cols-2">
            <PremiumCard>
              <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-white">Interactive ROI trend explorer</CardTitle>
                  <CardDescription className="text-slate-400">Inspect how core proof metrics move over time against the peer line without leaving the reporting workspace.</CardDescription>
                </div>
                <div className="w-full max-w-[220px]">
                  <Select value={selectedRoiTrendMetric} onValueChange={(value) => setSelectedRoiTrendMetric(value as "readiness" | "qaScore" | "csat")}>
                    <SelectTrigger className="border-white/10 bg-slate-950/70 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="readiness">Readiness</SelectItem>
                      <SelectItem value="qaScore">QA score</SelectItem>
                      <SelectItem value="csat">CSAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Selected ROI proof metric</p>
                  <p className="mt-2 text-xl font-semibold text-white">{selectedRoiTrendConfig.label}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Use the selector to compare movement in readiness, QA score, or CSAT against the peer benchmark across the current reporting window.</p>
                </div>
                <ChartFrame title="ROI trend over time" description={`Current series: ${selectedRoiTrendConfig.label} against ${selectedRoiTrendConfig.benchmarkLabel}.`}>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.roiTrendSeries}>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="period" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                        <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} labelStyle={{ color: "#cbd5e1" }} />
                        <Line type="monotone" dataKey={selectedRoiTrendConfig.valueKey} name={selectedRoiTrendConfig.label} stroke={selectedRoiTrendConfig.color} strokeWidth={3} dot={{ r: 4, fill: selectedRoiTrendConfig.color }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey={selectedRoiTrendConfig.benchmarkKey} name={selectedRoiTrendConfig.benchmarkLabel} stroke="#F8FAFC" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartFrame>
              </CardContent>
            </PremiumCard>
            <PremiumCard>
              <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-white">Interactive error-rate trend explorer</CardTitle>
                  <CardDescription className="text-slate-400">Switch between total and severity-specific error movement to see where operational risk is actually improving.</CardDescription>
                </div>
                <div className="w-full max-w-[220px]">
                  <Select value={selectedErrorTrendMetric} onValueChange={(value) => setSelectedErrorTrendMetric(value as "total" | "critical" | "moderate" | "minor")}>
                    <SelectTrigger className="border-white/10 bg-slate-950/70 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Total error rate</SelectItem>
                      <SelectItem value="critical">Critical errors</SelectItem>
                      <SelectItem value="moderate">Moderate errors</SelectItem>
                      <SelectItem value="minor">Minor errors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Selected error signal</p>
                  <p className="mt-2 text-xl font-semibold text-white">{selectedErrorTrendConfig.label}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Compare the current slope of {selectedErrorTrendConfig.label.toLowerCase()} across the reporting window so leaders can decide whether coaching, process fixes, or retraining should intensify next.</p>
                </div>
                <ChartFrame title="Error-rate movement over time" description={`Current series: ${selectedErrorTrendConfig.label}.`}>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.errorRateReporting.trendSeries}>
                        <defs>
                          <linearGradient id="reporting-error-trend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={selectedErrorTrendConfig.color} stopOpacity={0.45} />
                            <stop offset="95%" stopColor={selectedErrorTrendConfig.color} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                        <XAxis dataKey="period" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                        <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} labelStyle={{ color: "#cbd5e1" }} />
                        <Area type="monotone" dataKey={selectedErrorTrendMetric} name={selectedErrorTrendConfig.label} stroke={selectedErrorTrendConfig.color} fill="url(#reporting-error-trend)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartFrame>
              </CardContent>
            </PremiumCard>
          </div>
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Tenure-aware lifecycle reporting</CardTitle>
              <CardDescription className="text-slate-400">Compare readiness, quality, intervention close rate, peer position, and error pressure across the employee lifecycle.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-3">
              {data.lifecycleReporting.map((entry: any) => (
                <div key={entry.id} className="guide-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{entry.tenureRange}</p>
                      <h3 className="mt-2 text-base font-medium text-white">{entry.stage}</h3>
                    </div>
                    <Badge className="rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-100">{entry.population} specialists</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Readiness</p><p className="mt-2 text-lg font-semibold text-white">{entry.readiness}</p></div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">QA score</p><p className="mt-2 text-lg font-semibold text-white">{entry.qaScore}</p></div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Close rate</p><p className="mt-2 text-lg font-semibold text-white">{entry.interventionCloseRate}%</p></div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Peer percentile</p><p className="mt-2 text-lg font-semibold text-white">{entry.peerPercentile}th</p></div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">{entry.trend}</p>
                </div>
              ))}
            </CardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="risk" id="executive-risk-panel" className="mt-0 space-y-6 scroll-mt-24">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Assessment question reporting</CardTitle>
                <CardDescription className="text-slate-400">High-risk questions stay visible without forcing the entire detailed table to sit permanently on the page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.questionReporting.map((entry: any) => {
                  const alertStyles = entry.alert === "high"
                    ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
                    : entry.alert === "medium"
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
                      : "border-cyan-500/25 bg-cyan-500/10 text-cyan-100";
                  const alertLabel = entry.alert === "high" ? "High alert" : entry.alert === "medium" ? "Watch closely" : "Monitor";
                  return (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{entry.module}</p>
                          <h3 className="mt-2 text-base font-medium text-white">{entry.question}</h3>
                          <p className="mt-2 text-sm text-slate-300">Skill domain: <span className="font-medium text-white">{entry.skillDomain}</span></p>
                        </div>
                        <Badge className={`rounded-full border ${alertStyles}`}>{alertLabel}</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Miss rate</p><p className="mt-2 text-lg font-semibold text-white">{entry.missRate}%</p></div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Peer percentile</p><p className="mt-2 text-lg font-semibold text-white">{entry.peerPercentile}th</p></div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Retry dependency</p><p className="mt-2 text-lg font-semibold text-white">{entry.retryDependency}%</p></div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-300">{entry.trend}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300"><span className="font-medium text-white">Recommended coaching action:</span> {entry.coachingAction}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={buildExecutiveTrainingTargetPath(entry)}>
                          <Button variant="outline" className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/12 hover:text-white">Open exact module</Button>
                        </Link>
                        <Link href={buildExecutiveLibraryTargetPath(entry)}>
                          <Button variant="outline" className="w-full rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/18 hover:text-cyan-50 sm:w-auto">Review source detail</Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </PremiumCard>
            <div className="space-y-6">
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Repeat-module escalation watch</CardTitle>
                  <CardDescription className="text-slate-400">See when another module resend is no longer the right move.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.repeatAssignmentReporting.map((entry: any) => (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{entry.learner}</p>
                          <h3 className="mt-2 text-base font-medium text-white">{entry.module}</h3>
                        </div>
                        <Badge className="rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-100">Sent {entry.assignmentCount} times</Badge>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-300"><span className="font-medium text-white">Observed change:</span> {entry.behaviorChange}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300"><span className="font-medium text-white">Escalation path:</span> {entry.recommendedEscalation}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <span>Completion rate {entry.completionRate}</span>
                        <span>·</span>
                        <span>Exact-target tracking enabled</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={buildExecutiveTrainingTargetPath(entry)}>
                          <Button variant="outline" className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/12 hover:text-white">Open exact module</Button>
                        </Link>
                        <Link href={buildExecutiveLibraryTargetPath(entry)}>
                          <Button variant="outline" className="w-full rounded-full border-amber-400/20 bg-amber-400/10 text-amber-50 hover:bg-amber-400/18 hover:text-amber-50 sm:w-auto">Review source detail</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </PremiumCard>
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Error-rate reporting</CardTitle>
                  <CardDescription className="text-slate-400">Keep operational risk visible as a standalone signal and part of the ROI story.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current</p><p className="mt-2 text-3xl font-semibold text-white">{data.errorRateReporting.currentErrorRate}</p></div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Baseline</p><p className="mt-2 text-3xl font-semibold text-white">{data.errorRateReporting.baselineErrorRate}</p></div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Movement</p><p className="mt-2 text-3xl font-semibold text-emerald-300">{data.errorRateReporting.delta}</p></div>
                  </div>
                  <div className="space-y-3">
                    {data.errorRateReporting.severityMix.map((entry: any) => (
                      <div key={entry.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-medium text-white">{entry.label}</h3>
                          <Badge className="rounded-full border border-white/10 bg-slate-950/45 text-slate-100">{entry.value}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{entry.detail}</p>
                      </div>
                    ))}
                  </div>
                  <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">{data.errorRateReporting.movementSummary}</p>
                </CardContent>
              </PremiumCard>
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Coaching consistency reporting</CardTitle>
                <CardDescription className="text-slate-400">Tie cadence, follow-through, and documentation quality to downstream readiness movement.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Cadence adherence</p><p className="mt-2 text-3xl font-semibold text-white">{data.coachingConsistency.cadenceAdherence}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Missed intervals</p><p className="mt-2 text-3xl font-semibold text-white">{data.coachingConsistency.missedIntervals}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Follow-up completion</p><p className="mt-2 text-3xl font-semibold text-white">{data.coachingConsistency.followUpCompletion}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Documentation completeness</p><p className="mt-2 text-3xl font-semibold text-white">{data.coachingConsistency.documentationCompleteness}</p></div>
                </div>
                <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">{data.coachingConsistency.outcomeAlignment}</p>
                <div className="space-y-3">
                  {data.coachingConsistency.managerRollup.map((entry: any) => (
                    <div key={entry.manager} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-base font-medium text-white">{entry.manager}</h3>
                        <Badge className="rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-100">{entry.cadenceAdherence}% cadence hit</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Missed intervals</p><p className="mt-2 text-lg font-semibold text-white">{entry.missedIntervals}</p></div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Follow-up completion</p><p className="mt-2 text-lg font-semibold text-white">{entry.followUpCompletion}%</p></div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Documentation completeness</p><p className="mt-2 text-lg font-semibold text-white">{entry.documentationCompleteness}%</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </PremiumCard>
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Behavior analysis</CardTitle>
                <CardDescription className="text-slate-400">Behavior domains connect QA findings, assessment misses, and coaching observations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.behaviorAnalysis.map((entry: any) => (
                  <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="text-base font-medium text-white">{entry.behavior}</h3>
                      <Badge className="rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-100">{entry.signalShare}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300"><span className="font-medium text-white">Trend:</span> {entry.trend}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300"><span className="font-medium text-white">Recommended action:</span> {entry.recommendedAction}</p>
                  </div>
                ))}
              </CardContent>
            </PremiumCard>
          </div>
        </TabsContent>

        <TabsContent value="evidence" className="mt-0 space-y-6">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Executive proof of impact</CardTitle>
              <CardDescription className="text-slate-400">Before/after movement, intervention correlation, sustained-readiness checks, and error-rate improvement provide directional evidence without overstating causation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="rounded-3xl border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(236,254,255,0.98),rgba(224,242,254,0.96))] p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-sky-800/75">Directional evidence summary</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#10212B]">{data.proofOfImpact.headline}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#334E5E]">{data.proofOfImpact.summary}</p>
                </div>

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  {data.proofOfImpact.beforeAfter.map((entry: any) => (
                    <div key={entry.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-medium text-white">{entry.label}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{entry.evidence}</p>
                        </div>
                        <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/12 text-emerald-300">{entry.delta}</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Before</p><p className="mt-2 text-lg font-semibold text-white">{entry.before}</p></div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">After</p><p className="mt-2 text-lg font-semibold text-white">{entry.after}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Intervention correlation</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{data.proofOfImpact.interventionCorrelation.value}</p>
                    <p className="mt-2 text-sm font-medium text-white">{data.proofOfImpact.interventionCorrelation.label}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{data.proofOfImpact.interventionCorrelation.detail}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Sustained readiness evidence</p>
                    <div className="mt-3 space-y-3">
                      {data.proofOfImpact.sustainedReadiness.map((entry: any) => (
                        <div key={entry.label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white">{entry.label}</p>
                            <Badge className="rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-100">{entry.value}</Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{entry.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                    <span className="font-medium text-white">Evidence note:</span> {data.proofOfImpact.evidenceNote}
                  </div>
                </div>
              </div>
            </CardContent>
          </PremiumCard>
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Executive methodology references</CardTitle>
              <CardDescription className="text-slate-400">CHCG governance assets from data-led leadership, performance leadership, and engagement-system design surfaced directly in the experience.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {data.methodologyAssets.map((asset: any) => (
                <div key={asset.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{asset.category}</p>
                  <h3 className="mt-2 text-lg font-medium text-white">{asset.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{asset.summary}</p>
                </div>
              ))}
            </CardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="documentation" id="executive-documentation-panel" className="mt-0 space-y-6 scroll-mt-24">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Documentation generated from learning and interventions</CardTitle>
                  <CardDescription className="text-slate-400">Executives can review evidence trails produced automatically from enablement activity across service, workflow, leadership, and coaching programs.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentationFeed entries={data.documentationEntries} weeklyCoachingLogs={data.weeklyCoachingLogs} />
                </CardContent>
              </PremiumCard>
              <WorkflowLibraryPanel
                title="Executive content blend"
                description="Tenant-uploaded materials can now sit beside CHCG governance assets inside executive readiness and documentation review workflows."
                resources={data.workflowLibraryMix.documentationResources}
              />
            </div>
            <div className="space-y-6">
              <WeeklyCoachingLogComposer
                tenantId={data.tenant.id}
                subjectUserId={coachingSubject.subjectUserId}
                coachRole="executive"
                title="Capture a weekly coaching log from the executive view"
                employeeName={coachingSubject.employeeName}
                employeeEmail={coachingSubject.employeeEmail}
                coachName={data.executive.name}
                coachEmail={data.executive.email}
                supervisorName={coachingSubject.supervisorName}
                supervisorEmail={coachingSubject.supervisorEmail}
                managerOfSupervisorEmail={coachingSubject.managerOfSupervisorEmail}
                onCreated={onUpdated}
              />
              <WeeklyCoachingLogTimeline
                title="Weekly coaching logs in the readiness record"
                description="Executives can review the exact attendance, SMART-goal follow-up, coaching comments, support requests, and learner take-aways tied to each coaching cycle."
                tenantId={data.tenant.id}
                logs={data.weeklyCoachingLogs}
                allowLogEditing
                onUpdated={onUpdated}
              />
              <ReviewLogComposer
                tenantId={data.tenant.id}
                subjectUserId={data.reviewLogs[0]?.subjectUserId ?? data.executive.id}
                authorRole="executive"
                title="Add quarterly or annual executive review"
                onCreated={onUpdated}
              />
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Recent executive review logs</CardTitle>
                  <CardDescription className="text-slate-400">Documented one-on-ones, quarterly check-ins, and annual reviews connected to readiness movement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.reviewLogs.map((entry: any) => (
                    <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-medium text-white">{entry.title}</h4>
                          <p className="mt-2 text-sm text-slate-300">{entry.notes}</p>
                        </div>
                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200 capitalize">{entry.reviewType.replaceAll("_", " ")}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">Next step: {entry.nextStep}</p>
                    </div>
                  ))}
                </CardContent>
              </PremiumCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Shared reminder chrome (NOTIF1) — the Coach + Manager Alerts modes both render
// reminders from buildReminders() through these, keeping the dark list→detail look.
const REMINDER_TYPE_LABEL: Record<ReminderType, string> = {
  training_due: "Training due",
  coaching_follow_up: "Coaching follow-up",
  one_on_one_scheduled: "One-on-one",
  knowledge_check_failed: "Knowledge check",
  coaching_cadence_gap: "Cadence gap",
  announcement: "Announcement",
};

// Only these reminder types carry a real deadline → show "Due"/"Overdue". The
// snapshot types (knowledge_check_failed), cadence gaps, and announcements get a
// non-deadline label instead of a misleading "Due …".
const DEADLINE_REMINDER_TYPES = new Set<ReminderType>(["training_due", "coaching_follow_up", "one_on_one_scheduled"]);

function reminderDateBadge(reminder: Reminder): { text: string; overdue: boolean } {
  if (DEADLINE_REMINDER_TYPES.has(reminder.type) && reminder.dueAt) {
    const date = new Date(reminder.dueAt).toLocaleDateString();
    return reminder.overdue ? { text: `Overdue ${date}`, overdue: true } : { text: `Due ${date}`, overdue: false };
  }
  return { text: "Flagged", overdue: false };
}

// Client-side reminder read-state (NOTIF2). TODO: persist server-side per user;
// localStorage is a per-browser stopgap so the unread badge survives reloads.
const REMINDER_READ_PREFIX = "chcg-reminders-read";
function loadReadReminderIds(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function saveReadReminderIds(key: string, ids: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    /* storage unavailable — read-state just won't persist */
  }
}

/**
 * Tracks unread reminders for one workspace, publishes the count to the sidebar
 * badge (keyed by route), and exposes markAllRead (called when the Alerts mode
 * opens). Reminders are rebuilt each render, so unread/markAllRead read the
 * current list from the caller.
 */
function useReminderInbox(route: string, storageScope: string, reminders: Reminder[]) {
  const key = `${REMINDER_READ_PREFIX}:${storageScope}`;
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadReminderIds(key));
  const unread = reminders.filter((reminder) => !readIds.has(reminder.id)).length;
  const { publishUnread } = useReminderBadge();
  useEffect(() => {
    publishUnread(route, unread);
    return () => publishUnread(route, 0);
  }, [route, unread, publishUnread]);
  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const reminder of reminders) next.add(reminder.id);
      saveReadReminderIds(key, next);
      return next;
    });
  }, [key, reminders]);
  return { unread, markAllRead };
}

function ReminderRow({ reminder, selected, onSelect }: { reminder: Reminder; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`w-full rounded-[1.15rem] border p-3 text-left transition ${selected ? "border-rose-400/40 bg-rose-400/10 shadow-[0_14px_28px_rgba(244,63,94,0.12)]" : "border-white/12 bg-white/[0.07] hover:border-white/20 hover:bg-white/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-dark">{REMINDER_TYPE_LABEL[reminder.type]}{DEADLINE_REMINDER_TYPES.has(reminder.type) && reminder.overdue ? " · Overdue" : ""}</p>
          <h3 className="mt-1 truncate text-sm font-semibold text-white">{reminder.subject}</h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-300">{reminder.reason}</p>
        </div>
        <StatusBadge value={reminder.severity} />
      </div>
    </button>
  );
}

function ReminderDetail({ reminder, onOpen }: { reminder: Reminder | null; onOpen: (reminder: Reminder) => void }) {
  if (!reminder) {
    return <p className="text-sm leading-7 text-slate-300">Select a reminder to see the recommendation and where to act.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={reminder.severity} />
        <Badge className="rounded-full border-white/12 bg-white/10 text-slate-200">{REMINDER_TYPE_LABEL[reminder.type]}</Badge>
        {(() => {
          const badge = reminderDateBadge(reminder);
          return <Badge className={`rounded-full ${badge.overdue ? "border-rose-400/30 bg-rose-500/15 text-rose-100" : "border-white/12 bg-white/8 text-slate-200"}`}>{badge.text}</Badge>;
        })()}
      </div>
      <div className="surface-dark rounded-[1.3rem] border border-white/12 p-4 text-sm leading-7 text-slate-200">{reminder.reason}</div>
      {reminder.deepLink ? (
        <Button type="button" onClick={() => onOpen(reminder)} className="rounded-full bg-[#FCBC34] text-slate-950 hover:bg-[#ffd56d]">
          Open {reminder.deepLink.tab ? REMINDER_DEEPLINK_LABEL[reminder.deepLink.tab] ?? "workspace" : "workspace"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

const REMINDER_DEEPLINK_LABEL: Record<string, string> = {
  coaching: "coaching lane",
  interventions: "interventions",
  "kpi-board": "KPI board",
  reengagements: "re-engagements",
  journey: "journey",
};

function CoachPanel({ data, onUpdated, headerActions }: { data: any; onUpdated?: () => void; headerActions?: ReactNode }) {
  const teamLearners = data.teamLearners?.length ? data.teamLearners : [data.directLearner];
  const teamCoachingSessions = data.teamCoachingSessions?.length ? data.teamCoachingSessions : data.coachingSessions;
  const teamWeeklyCoachingLogs = data.teamWeeklyCoachingLogs?.length ? data.teamWeeklyCoachingLogs : data.weeklyCoachingLogs;
  const teamDocumentationEntries = data.teamDocumentationEntries?.length ? data.teamDocumentationEntries : data.documentationEntries;
  const teamAiSuggestions = data.teamAiSuggestions?.length ? data.teamAiSuggestions : [data.aiSuggestion].filter(Boolean);
  const teamRetrainingAssignments = data.teamRetrainingAssignments?.length ? data.teamRetrainingAssignments : data.retrainingAssignments;
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>(data.directLearner.id);
  const [activeTab, setActiveTab] = useState<"coaching" | "transfer" | "documentation" | "alerts">("coaching");
  const [selectedCoachingSessionId, setSelectedCoachingSessionId] = useState<string>(data.coachingSessions[0]?.id ?? "");
  const [selectedAlertId, setSelectedAlertId] = useState<string>(data.notifications[0]?.id ?? "");
  const [selectedCoachNeedEntryId, setSelectedCoachNeedEntryId] = useState<string | null>(null);

  const selectedLearner = teamLearners.find((learner: any) => learner.id === selectedLearnerId) ?? data.directLearner;
  const selectedCoachingSessions = teamCoachingSessions.filter((session: any) => session.learnerUserId === selectedLearner.id);
  const selectedWeeklyCoachingLogs = teamWeeklyCoachingLogs.filter((log: any) => log.subjectUserId === selectedLearner.id);
  const selectedDocumentationEntries = teamDocumentationEntries.filter((entry: any) => entry.subjectUserId === selectedLearner.id);
  const selectedAiSuggestion = teamAiSuggestions.find((suggestion: any) => suggestion?.learnerUserId === selectedLearner.id) ?? data.aiSuggestion;
  const selectedRetrainingAssignments = teamRetrainingAssignments
    .filter((assignment: any) => assignment.learnerUserId === selectedLearner.id)
    .sort((left: any, right: any) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const selectedCurrentRetrainingAssignment = selectedRetrainingAssignments.find((assignment: any) => assignment.status !== "completed") ?? null;
  const selectedRetrainingHistory = selectedRetrainingAssignments.filter((assignment: any) => assignment.status === "completed");
  const transferRoster = teamRetrainingAssignments
    .map((assignment: any) => ({
      ...assignment,
      learner: teamLearners.find((learner: any) => learner.id === assignment.learnerUserId) ?? data.directLearner,
    }))
    .sort((left: any, right: any) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  const openCoachView = (tab: "coaching" | "transfer" | "documentation" | "alerts", sectionId: string) => {
    setActiveTab(tab);
    window.setTimeout(() => revealWorkspaceSection(sectionId), 20);
  };

  const coachWeeklyCoachingLogProps = {
    tenantId: data.tenant.id,
    subjectUserId: selectedLearner.id,
    coachRole: "coach" as const,
    title: "Complete the weekly one-on-one",
    employeeName: selectedLearner.name,
    employeeEmail: selectedLearner.email,
    coachName: data.coach.name,
    coachEmail: data.coach.email,
    supervisorName: data.escalationPartner.name,
    supervisorEmail: data.escalationPartner.email,
    managerOfSupervisorEmail: selectedWeeklyCoachingLogs[0]?.managerOfSupervisorEmail ?? data.weeklyCoachingLogs[0]?.managerOfSupervisorEmail,
  };

  const selectedCoachingSession = selectedCoachingSessions.find((session: any) => session.id === selectedCoachingSessionId) ?? selectedCoachingSessions[0] ?? null;
  const coachReminders = buildReminders("coach", {
    now: demoNow(),
    coachingSessions: data.teamCoachingSessions,
    weeklyCoachingLogs: data.teamWeeklyCoachingLogs,
    learners: data.teamLearners,
    notifications: data.notifications,
  });
  const { unread: coachUnread, markAllRead: markCoachRemindersRead } = useReminderInbox("/coach", `coach:${data.tenant.id}`, coachReminders);
  const selectedAlert = coachReminders.find((item) => item.id === selectedAlertId) ?? coachReminders[0] ?? null;
  const openReminderTarget = (reminder: Reminder) => {
    if (reminder.deepLink?.tab) {
      setActiveTab(reminder.deepLink.tab as "coaching" | "transfer" | "documentation" | "alerts");
      if (reminder.deepLink.sectionId) window.setTimeout(() => revealWorkspaceSection(reminder.deepLink!.sectionId!), 20);
    }
  };
  const coachNeedEntries = selectedDocumentationEntries.slice(0, 3);
  const selectedCoachNeedEntry = selectedCoachNeedEntryId
    ? selectedDocumentationEntries.find((entry: any) => entry.id === selectedCoachNeedEntryId) ?? null
    : null;
  const selectedCoachNeedWeeklyCoachingLog = selectedCoachNeedEntry?.weeklyCoachingLogId
    ? selectedWeeklyCoachingLogs.find((log: any) => log.id === selectedCoachNeedEntry.weeklyCoachingLogId) ?? null
    : null;
  const selectedCoachNeedUsesCoachingPopup = selectedCoachNeedEntry?.sourceType === "coaching_summary" && selectedCoachNeedWeeklyCoachingLog;



  const openCoachNeed = (entryId: string) => {
    setSelectedCoachNeedEntryId(entryId);
  };

  useEffect(() => {
    if (!teamLearners.some((entry: any) => entry.id === selectedLearnerId)) {
      setSelectedLearnerId(data.directLearner.id);
    }
  }, [data.directLearner.id, selectedLearnerId, teamLearners]);

  useEffect(() => {
    if (!selectedAlertId && data.notifications[0]?.id) {
      setSelectedAlertId(data.notifications[0].id);
    }
  }, [data.notifications, selectedAlertId]);

  useEffect(() => {
    if (!selectedCoachingSessionId && selectedCoachingSessions[0]?.id) {
      setSelectedCoachingSessionId(selectedCoachingSessions[0].id);
    }
  }, [selectedCoachingSessionId, selectedCoachingSessions]);

  useEffect(() => {
    if (selectedCoachNeedEntryId && !selectedDocumentationEntries.some((entry: any) => entry.id === selectedCoachNeedEntryId)) {
      setSelectedCoachNeedEntryId(null);
    }
  }, [selectedCoachNeedEntryId, selectedDocumentationEntries]);

  useEffect(() => {
    if (selectedAlertId && !data.notifications.some((entry: any) => entry.id === selectedAlertId)) {
      setSelectedAlertId(data.notifications[0]?.id ?? "");
    }
  }, [data.notifications, selectedAlertId]);

  useEffect(() => {
    if (selectedCoachingSessionId && !selectedCoachingSessions.some((entry: any) => entry.id === selectedCoachingSessionId)) {
      setSelectedCoachingSessionId(selectedCoachingSessions[0]?.id ?? "");
    }
  }, [selectedCoachingSessionId, selectedCoachingSessions]);

  const coachWorkspaceStats: WorkspaceStat[] = [
    { label: "Coach readiness", value: data.coach.readinessScore, sub: data.coach.name, icon: <ShieldCheck className="h-4 w-4" />, onClick: () => openCoachView("coaching", "coach-overview") },
    { label: "Active threads", value: selectedCoachingSessions.length, sub: "Open coaching work for this learner", icon: <Users2 className="h-4 w-4" />, onClick: () => openCoachView("coaching", "coach-coaching-lane") },
    { label: "Weekly logs", value: selectedWeeklyCoachingLogs.length, sub: "Structured coaching cycles recorded", icon: <BookOpen className="h-4 w-4" />, onClick: () => openCoachView("coaching", "coach-weekly-logs") },
    { label: "Journey progress", value: `${data.activeJourney.progress}%`, sub: "Learning journey complete", icon: <Gauge className="h-4 w-4" />, onClick: () => openCoachView("transfer", "coach-transfer-lane") },
  ];

  return (
    <WorkspaceShell
      title="Coach Studio"
      subtitle="Select a learner, review status, and open the next coaching task."
      actions={headerActions}
      modesLabel="Coach modes"
      modesSubtitle="Choose a tab to coach, review transfer, document evidence, or respond to alerts."
      activeTab={activeTab}
      onTabChange={(value) => { if (value === "alerts") markCoachRemindersRead(); setActiveTab(value as "coaching" | "transfer" | "documentation" | "alerts"); }}
      stats={coachWorkspaceStats}
      tabs={[
        { value: "coaching", label: "Coaching lane" },
        { value: "transfer", label: "Training transfer" },
        { value: "documentation", label: "Documentation" },
        { value: "alerts", label: "Alerts", badge: coachUnread },
      ]}
      statsLead={
        <div className="rounded-[1rem] border border-white/12 bg-white/6 px-3 py-2 xl:min-w-[16rem]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Current learner</p>
            <Badge className="rounded-full border-cyan-400/30 bg-cyan-400/12 text-cyan-100">{selectedLearner.readinessScore} readiness</Badge>
          </div>
          {teamLearners.length > 1 ? (
            <Select value={selectedLearnerId} onValueChange={setSelectedLearnerId}>
              <SelectTrigger className="mt-2 h-9 border-white/12 bg-slate-950/55 text-sm text-slate-50 shadow-none [color-scheme:dark]">
                <SelectValue placeholder="Select learner" />
              </SelectTrigger>
              <SelectContent>
                {teamLearners.map((learner: any) => (
                  <SelectItem key={learner.id} value={learner.id}>
                    {learner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-2 text-sm font-semibold text-white">{selectedLearner.name}</p>
          )}
          <p className="mt-1 text-xs leading-4 text-slate-300">{selectedLearner.title ?? selectedLearner.roleTitle}{selectedLearner.team ? ` · ${selectedLearner.team}` : ""}</p>
        </div>
      }
      betweenStatsAndTabs={
        <>
          <div id="coach-overview" className="scroll-mt-24" />
          <WeeklyCoachingLogDetailDialog
            entry={selectedCoachNeedEntry}
            log={selectedCoachNeedWeeklyCoachingLog}
            open={Boolean(selectedCoachNeedUsesCoachingPopup)}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedCoachNeedEntryId(null);
              }
            }}
          />
          <DocumentationEntryDetailDialog
            entry={selectedCoachNeedUsesCoachingPopup ? null : selectedCoachNeedEntry}
            open={Boolean(selectedCoachNeedEntry && !selectedCoachNeedUsesCoachingPopup)}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedCoachNeedEntryId(null);
              }
            }}
          />
        </>
      }
    >

        {activeTab === "coaching" ? (
          <TabsContent value="coaching" id="coach-coaching-lane" className="mt-0 space-y-3 scroll-mt-24">
          <div id="coach-weekly-logs" className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4 scroll-mt-24">
            <CoachLaneActionCard
              eyebrow="Weekly coaching"
              title="Complete the weekly one-on-one"
              description="Capture the full one-on-one, record agent take-aways, and lock the SMART goal into the coaching record."
              accent="gold"
              action={<WeeklyCoachingLogPopupBox buttonLabel="Open weekly one-on-one" dialogTitle="Weekly one-on-one" dialogDescription="Complete the full weekly one-on-one, including follow-up, coaching comments, SMART goal, support, and agent take-aways." buttonClassName="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950" composerProps={coachWeeklyCoachingLogProps} onCreated={onUpdated} />}
            />
            <CoachLaneActionCard
              eyebrow="Coach follow-up"
              title="Write the next observation"
              description="Document the follow-up note, attach files, and choose observation resources."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open coach follow-up"
                  dialogTitle="Coach follow-up and observation"
                  dialogDescription="Write the follow-up note, attach files, and choose observation resources."
                  renderContent={(close) => (
                    <ReviewLogComposer
                      tenantId={data.tenant.id}
                      subjectUserId={selectedLearner.id}
                      authorRole="coach"
                      title="Write a coach follow-up or observation"
                      description="Keep the coaching note in the same lane as the live session, attach files while you write, and open a popup to add the exact observation resources that should travel with the follow-up."
                      allowAttachments
                      resourceOptions={data.workflowLibraryMix.interventionResources}
                      resourceButtonLabel="Coaching observation resources"
                      saveLabel="Save coach follow-up"
                      successLabel="Coach follow-up saved to Documentation."
                      onCreated={() => {
                        close();
                        onUpdated?.();
                      }}
                    />
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Weekly history"
              title="Review saved coaching records"
              description="Review saved coaching records and confirm prior follow-through."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open coaching history"
                  dialogTitle="Coach-visible weekly coaching history"
                  dialogDescription="Review the exact structured fields, confirm sharing targets, and keep learner take-aways tied to each recorded coaching cycle."
                  renderContent={() => (
                    <WeeklyCoachingLogTimeline title="Coach-visible weekly coaching history" description="Coaches can review the exact structured fields, confirm sharing targets, and keep learner take-aways connected to the same record." tenantId={data.tenant.id} logs={selectedWeeklyCoachingLogs} allowLogEditing onUpdated={onUpdated} />
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Retraining history"
              title="Check follow-through completion"
              description="Confirm whether the learner finished the assigned next steps."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open retraining history"
                  dialogTitle="Retraining completion history"
                  dialogDescription="Keep past retraining outcomes attached to the coaching lane without leaving the live session surface crowded."
                  renderContent={() => (
                    <RetrainingHistorySection title="Retraining completion history" description="Coach-visible history keeps past retraining outcomes attached to the coaching lane so follow-through remains easy to confirm over time." assignments={selectedRetrainingHistory ?? []} emptyLabel="Past retraining completions will appear here after the learner finishes assigned modules." launchRole="coach" />
                  )}
                />
              }
            />
          </div>
          <div className="grid gap-3 xl:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-2.5">
              <div className="rounded-[1.1rem] border border-slate-200 bg-white/88 p-2.5 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Coaching threads</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">Select a thread, review the next action, and open the full thread here when you need detail.</p>
              </div>
              {selectedCoachingSessions.map((session: any) => (
                <button key={session.id} type="button" onClick={() => setSelectedCoachingSessionId(session.id)} className={`w-full rounded-[1.15rem] border p-3 text-left transition ${selectedCoachingSession?.id === session.id ? "border-cyan-300/80 bg-[linear-gradient(180deg,rgba(236,254,255,0.98),rgba(224,242,254,0.94))] shadow-[0_14px_28px_rgba(8,145,178,0.11)]" : "border-slate-200 bg-white/88 shadow-[0_10px_22px_rgba(15,23,42,0.05)] hover:border-slate-300 hover:bg-white"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-xs uppercase tracking-[0.22em] ${selectedCoachingSession?.id === session.id ? "text-cyan-700" : "text-slate-500"}`}>Coaching thread</p>
                      <h3 className={`mt-1.5 text-base font-medium ${selectedCoachingSession?.id === session.id ? "text-slate-950" : "text-slate-900"}`}>{session.title}</h3>
                      <p className={`mt-1 text-sm leading-5 ${selectedCoachingSession?.id === session.id ? "text-slate-700" : "text-slate-600"}`}>{selectedCoachingSession?.id === session.id ? "Selected thread" : "Select this thread to review the note and next action."}</p>
                    </div>
                    <StatusBadge value={session.status} surface="light" />
                  </div>
                </button>
              ))}
              {!selectedCoachingSessions.length ? (
                <div className="rounded-[1.45rem] border border-dashed border-slate-200 bg-white/80 px-4 py-5 text-sm leading-6 text-slate-600 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">This learner does not have an active coaching thread yet. Use the coaching log action to start the next documented touchpoint.</div>
              ) : null}
            </div>
              <PremiumCard>
                <CardHeader className="space-y-0 p-4 pb-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">Selected coaching thread</CardTitle>
                      <CardDescription className="mt-1 text-sm leading-5 text-slate-300">{selectedCoachingSession ? "Review the note, confirm the next action, and open the full thread from here." : "Select a coaching thread to review the note and next action."}</CardDescription>
                    </div>
                    {selectedCoachingSession ? <StatusBadge value={selectedCoachingSession.status} /> : <Badge className="rounded-full border-white/12 bg-white/10 text-slate-200">Waiting for selection</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 p-4 pt-0">

                {selectedCoachingSession ? (
                  <>
                    <div className="rounded-[1.05rem] border border-white/14 bg-white/7 px-3.5 py-3 text-sm leading-5 text-slate-200">
                      <span className="font-medium text-white">Selected note:</span> {selectedCoachingSession.notes}
                    </div>
                    {selectedCoachingSession.actionPlan?.length ? (
                      <div className="rounded-[1.05rem] border border-white/14 bg-white/7 px-3.5 py-3 text-sm leading-5 text-slate-200">
                        <span className="font-medium text-white">Next action:</span> {selectedCoachingSession.actionPlan[0]}
                      </div>
                    ) : null}
                    <CoachLaneDialogAction
                      buttonLabel="Open coaching thread"
                      dialogTitle={`${selectedCoachingSession.title} · coaching thread`}
                      dialogDescription="Review the full thread details, confirm status, and check the action plan."
                      buttonClassName="w-full justify-between rounded-full border-cyan-200/55 bg-cyan-300/18 text-white shadow-[0_12px_30px_rgba(34,211,238,0.14)] hover:bg-cyan-300/26 hover:text-white"
                      renderContent={() => (
                        <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge value={selectedCoachingSession.status} />
                            <Badge className="rounded-full border-white/12 bg-white/10 text-slate-200">{selectedLearner.name}</Badge>
                          </div>
                          <p className="text-sm leading-6 text-slate-200">{selectedCoachingSession.notes}</p>
                          <div className="grid gap-3 md:grid-cols-2">
                            {selectedCoachingSession.actionPlan.map((step: any) => (
                              <div key={step} className="rounded-2xl border border-white/14 bg-slate-950 p-3 text-sm text-slate-100"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /><span>{step}</span></div></div>
                            ))}
                          </div>
                        </div>
                      )}
                    />
                  </>
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-white/18 bg-slate-900/72 px-4 py-4 text-sm leading-5 text-slate-200">Choose a coaching thread to load its note and next action.</div>
                )}
              </CardContent>
            </PremiumCard>
          </div>
          </TabsContent>
        ) : null}

        {activeTab === "transfer" ? (
          <TabsContent value="transfer" id="coach-transfer-lane" className="mt-0 space-y-4 scroll-mt-24">
          <PremiumCard>
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle className="text-white">Training transfer tasks</CardTitle>
                  <CardDescription className="mt-2 text-slate-300">Review assignments, confirm guidance, and support transfer follow-through.</CardDescription>
                </div>
                <Badge className="rounded-full border-cyan-400/30 bg-cyan-400/12 text-cyan-100">{transferRoster.length} active transfers</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.3rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Journey modules</p>
                <p className="mt-2 text-lg font-semibold text-white">{data.activeJourney.modules.length}</p>
                <p className="mt-1 text-sm text-slate-300">Modules available for transfer follow-through</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">AI guidance</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedAiSuggestion ? "Ready" : "Waiting"}</p>
                <p className="mt-1 text-sm text-slate-300">Review the next transfer recommendation.</p>
              </div>
            </CardContent>
          </PremiumCard>
          <div className="grid gap-3 xl:grid-cols-2">
            <CoachLaneActionCard
              eyebrow="Transfer roster"
              title="Review learner handoffs"
              description="Confirm who received the transfer, how it was assigned, and when follow-through is due."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open transfer roster"
                  dialogTitle="Transfer attribution across the team"
                  dialogDescription="Review which learners received transfers, whether AI drove the recommendation, and what status each assignment is in."
                  dialogClassName="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-5xl"
                  renderContent={() => (
                    <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                      {transferRoster.length ? transferRoster.map((assignment: any) => (
                        <div key={assignment.id} className={`rounded-[1.45rem] border p-4 ${assignment.learnerUserId === selectedLearner.id ? "border-cyan-400/25 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">{assignment.deliveryMode === "ai_approved" ? "AI-driven transfer" : "Coach-directed transfer"}</p>
                              <h3 className="mt-2 text-base font-semibold text-white">{assignment.learner.name} · {assignment.moduleTitle}</h3>
                              <p className="mt-2 text-sm leading-6 text-slate-200">{assignment.guidanceNote}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <StatusBadge value={assignment.status} />
                              <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{assignment.requestedByRole.replace("_", " ")}</Badge>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                            <span>Assigned {new Date(assignment.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Due {new Date(assignment.dueAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{assignment.skillFocus}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-[1.45rem] border border-dashed border-white/18 bg-slate-900/72 px-4 py-5 text-sm leading-6 text-slate-200">Transfer assignments will appear here once the coach or AI creates the next training handoff.</div>
                      )}
                    </div>
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="AI guidance"
              title="Review the transfer recommendation"
              description="Inspect the current AI-guided transfer suggestion and choose the next coaching move."
              accent="emerald"
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open AI guidance"
                  dialogTitle="Training-transfer guidance"
                    dialogDescription="Review the transfer recommendation, related assignments, and next coaching move."

                  dialogClassName="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-6xl"
                  renderContent={() => selectedAiSuggestion ? (
                    <GuidanceActionPanel tenantId={data.tenant.id} suggestion={selectedAiSuggestion} catalog={data.retrainingCatalog} assignments={selectedCurrentRetrainingAssignment ? [selectedCurrentRetrainingAssignment] : []} actorRole="coach" learnerName={selectedLearner.name} onUpdated={onUpdated} />
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-white/18 bg-slate-900/72 px-4 py-5 text-sm leading-6 text-slate-200">AI guidance will appear here when the next transfer recommendation is ready for review.</div>
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Journey modules"
              title="Review active training modules"
              description="Confirm the lesson, skill focus, and completion posture behind the transfer."
              accent="gold"
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open module transfer view"
                  dialogTitle="Training-transfer focus"
                  dialogDescription="Bridge course completion to observed behavior without keeping the full module list expanded in the lane."
                  renderContent={() => (
                    <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                      {data.activeJourney.modules.map((module: any) => (
                        <div key={module.id} className="rounded-[1.5rem] border border-white/12 bg-white/7 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-lg font-medium text-white">{module.title}</p>
                              <p className="mt-1 text-sm text-slate-200">{module.skillFocus} · {module.durationMinutes} min · {module.format}</p>
                            </div>
                            <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{module.completionRate}% complete</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Coach-ready assets"
              title="Review the support content mix"
              description="Review methodology and tenant-authored resources for the next coaching step."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open coach-ready assets"
                  dialogTitle="Coach-ready content mix"
                  dialogDescription="Supervisors can pull both CHCG methodology and tenant resources into coaching prep, floor walks, and next-session planning."
                  dialogClassName="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-6xl"
                  renderContent={() => (
                    <WorkflowLibraryPanel title="Coach-ready content mix" description="Supervisors can pull both CHCG methodology and tenant resources into coaching prep, floor walks, and next-session planning." resources={data.workflowLibraryMix.documentationResources} />
                  )}
                />
              }
            />
          </div>
          </TabsContent>
        ) : null}

        {activeTab === "documentation" ? (
          <TabsContent value="documentation" id="coach-documentation-feed" className="mt-0 space-y-4 scroll-mt-24">
          <PremiumCard>
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle className="text-white">Documentation tasks</CardTitle>
                  <CardDescription className="mt-2 text-slate-300">Review the queue, confirm saved entries, and open the coaching handoff.</CardDescription>
                </div>
                <Badge className="rounded-full border-cyan-400/30 bg-cyan-400/12 text-cyan-100">{selectedDocumentationEntries.length} documentation items</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.3rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Coach needs queue</p>
                <p className="mt-2 text-lg font-semibold text-white">{coachNeedEntries.length}</p>
                <p className="mt-1 text-sm text-slate-300">Priority documentation handoffs for the selected learner</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Linked coaching logs</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedDocumentationEntries.filter((entry: any) => entry.weeklyCoachingLogId).length}</p>
                <p className="mt-1 text-sm text-slate-300">Entries tied directly to saved coaching evidence</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Action handoff</p>
                <p className="mt-2 text-lg font-semibold text-white">Coaching lane</p>
                <p className="mt-1 text-sm text-slate-300">Write the next follow-up or observation there.</p>
              </div>
            </CardContent>
          </PremiumCard>
          <div className="grid gap-3 xl:grid-cols-2">
            <CoachLaneActionCard
              eyebrow="Coach needs"
              title="Review the documentation queue"
              description="Review the next record, summary, or linked coaching evidence."
              accent="emerald"
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open documentation queue"
                  dialogTitle="Coach needs inside Documentation mode"
                  dialogDescription="Review the next documentation handoff, inspect the selected record, and keep the main lane focused on summary status until detail is needed."
                  dialogClassName="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-6xl"
                  renderContent={() => {
                    const activeEntry = selectedCoachNeedEntry ?? coachNeedEntries[0] ?? null;
                    const activeLinkedWeeklyCoachingLog = activeEntry?.weeklyCoachingLogId
                      ? selectedWeeklyCoachingLogs.find((log: any) => log.id === activeEntry.weeklyCoachingLogId) ?? null
                      : null;
                    const activeUsesLinkedLog = activeEntry?.sourceType === "coaching_summary" && activeLinkedWeeklyCoachingLog;

                    return (
                      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                        <div className="space-y-3 rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                          {coachNeedEntries.length ? coachNeedEntries.map((entry: any, index: number) => {
                            const linkedWeeklyCoachingLog = entry.weeklyCoachingLogId
                              ? selectedWeeklyCoachingLogs.find((log: any) => log.id === entry.weeklyCoachingLogId) ?? null
                              : null;
                            const supportsCoachingPopup = entry.sourceType === "coaching_summary" && linkedWeeklyCoachingLog;

                            return (
                              <button
                                key={entry.id ?? `${entry.title ?? "coach-need"}-${index}`}
                                type="button"
                                onClick={() => openCoachNeed(entry.id)}
                                className={`w-full rounded-[1.45rem] border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${activeEntry?.id === entry.id ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-white">{entry.title ?? entry.label ?? `Documentation item ${index + 1}`}</p>
                                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{entry.owner ?? entry.status ?? "Documentation stream"}</p>
                                  </div>
                                  <Badge className={`rounded-full ${supportsCoachingPopup ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100" : "border-white/12 bg-white/8 text-slate-100"}`}>
                                    {supportsCoachingPopup ? "Linked coaching log" : "Documentation detail"}
                                  </Badge>
                                </div>
                                {entry.summary ? <p className="mt-3 text-sm leading-6 text-slate-200">{entry.summary}</p> : null}
                              </button>
                            );
                          }) : (
                            <div className="rounded-[1.45rem] border border-dashed border-white/18 bg-slate-900/72 px-4 py-5 text-sm leading-6 text-slate-200">Documentation items will surface here as soon as new coaching notes, follow-ups, or linked reviews are available.</div>
                          )}
                        </div>
                        <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                          {activeEntry ? (
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <Badge className="rounded-full border-white/12 bg-white/10 text-slate-100">{activeEntry.owner ?? activeEntry.status ?? "Documentation stream"}</Badge>
                                {activeUsesLinkedLog ? <Badge className="rounded-full border-cyan-400/30 bg-cyan-400/12 text-cyan-100">Linked coaching evidence</Badge> : null}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white">{activeEntry.title ?? activeEntry.label ?? "Documentation detail"}</h3>
                                <p className="mt-3 text-sm leading-6 text-slate-200">{activeEntry.summary ?? "No summary was captured for this documentation record yet."}</p>
                              </div>
                              <div className="rounded-[1.45rem] border border-white/12 bg-slate-950/80 p-4 text-sm leading-6 text-slate-200">
                                {activeUsesLinkedLog && activeLinkedWeeklyCoachingLog ? (
                                  <>
                                    <span className="font-medium text-white">Linked coaching log:</span> {activeLinkedWeeklyCoachingLog.employeeName} · {activeLinkedWeeklyCoachingLog.topic} · {activeLinkedWeeklyCoachingLog.overallOutcome}
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium text-white">Review posture:</span> This record stands alone as documentation detail and does not require opening the full coaching lane to understand the evidence summary.
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[1.45rem] border border-dashed border-white/18 bg-slate-900/72 px-4 py-5 text-sm leading-6 text-slate-200">Choose a documentation queue item to review its summary and linked evidence.</div>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Documentation feed"
              title="Review the evidence stream"
              description="Review saved records and open the entry you need."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open documentation feed"
                  dialogTitle="Coach documentation feed"
                  dialogDescription="Observed behavior, weekly coaching records, and review notes remain connected so the coach does not lose context between sessions."
                  dialogClassName="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-6xl"
                  renderContent={() => (
                    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                      <DocumentationFeed entries={selectedDocumentationEntries} weeklyCoachingLogs={selectedWeeklyCoachingLogs} />
                    </div>
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Coaching handoff"
              title="Return to the coaching lane"
              description="Write the next follow-up, attach files, or capture a new observation."
              accent="gold"
              action={<Button type="button" onClick={() => setActiveTab("coaching")} className="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950">Open coaching lane <ArrowRight className="h-4 w-4" /></Button>}
            />
          </div>
          </TabsContent>
        ) : null}

        {activeTab === "alerts" ? (
          <TabsContent value="alerts" id="coach-alerts-feed" className="mt-0 space-y-4 scroll-mt-24">
          <PremiumCard>
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle className="text-white">Alerts</CardTitle>
                  <CardDescription className="mt-2 text-slate-300">Review the queue, inspect the selected alert, and take the next action.</CardDescription>
                </div>
                <Badge className="rounded-full border-rose-300/35 bg-rose-300/12 text-rose-100">{coachReminders.length} open reminders</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.3rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Selected alert</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedAlert?.subject ?? "Waiting for selection"}</p>
                <p className="mt-1 text-sm text-slate-300">{selectedAlert ? REMINDER_TYPE_LABEL[selectedAlert.type] : "not set"}</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Queue posture</p>
                <p className="mt-2 text-lg font-semibold text-white">Queue ready</p>
                <p className="mt-1 text-sm text-slate-300">Review the full alert chronology.</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/12 bg-white/6 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Next action</p>
                <p className="mt-2 text-lg font-semibold text-white">Coaching lane</p>
                <p className="mt-1 text-sm text-slate-300">Use alerts as signals, then step back into live coaching to respond.</p>
              </div>
            </CardContent>
          </PremiumCard>
          <div className="grid gap-3 xl:grid-cols-2">
            <CoachLaneActionCard
              eyebrow="Alert queue"
              title="Review coach notifications"
              description="Review the full list of coach-facing alerts, timing context, and priority cues for the selected learner."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open alert queue"
                  dialogTitle="Coach alert queue"
                    dialogDescription="Review the alert queue and choose the next notification to handle."

                  dialogClassName="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-5xl"
                  buttonClassName="w-full justify-between rounded-full border-rose-300/55 bg-rose-300/16 text-white shadow-[0_12px_30px_rgba(244,114,182,0.16)] hover:bg-rose-300/24 hover:text-white"
                  renderContent={() => (
                    <div className="space-y-2.5 rounded-[1.8rem] border border-white/10 bg-slate-950/60 p-5">
                      {coachReminders.map((item) => (
                        <ReminderRow key={item.id} reminder={item} selected={selectedAlert?.id === item.id} onSelect={() => setSelectedAlertId(item.id)} />
                      ))}
                    </div>
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Selected alert"
              title="Review the alert detail"
              description="Review the recommendation, timing context, and coach-facing explanation."
              accent="emerald"
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open alert detail"
                  dialogTitle={selectedAlert?.subject ?? "Reminder detail"}
                    dialogDescription="Review the selected alert and decide the next step."

                  buttonClassName="w-full justify-between rounded-full border-rose-300/55 bg-rose-300/16 text-white shadow-[0_12px_30px_rgba(244,114,182,0.16)] hover:bg-rose-300/24 hover:text-white"
                  renderContent={() => (
                    <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-slate-950/60 p-5">
                      <ReminderDetail reminder={selectedAlert} onOpen={openReminderTarget} />
                    </div>
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Coach next step"
              title="Return to live coaching"
              description="Document the response, review the thread, or open the weekly coaching log."
              accent="gold"
              action={<Button type="button" onClick={() => setActiveTab("coaching")} className="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950">Open coaching lane <ArrowRight className="h-4 w-4" /></Button>}
            />
          </div>
          </TabsContent>
        ) : null}
    </WorkspaceShell>
  );
}

function ManagerPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  const [activeTab, setActiveTab] = useState<"kpi-board" | "leaderboard" | "interventions" | "coaching" | "documentation" | "notifications">("interventions");
  const [historyWindow, setHistoryWindow] = useState<RetrainingHistoryWindow>("month");
  const [selectedInterventionId, setSelectedInterventionId] = useState<string>(data.interventions[0]?.id ?? "");
  const [selectedCoachingSessionId, setSelectedCoachingSessionId] = useState<string>(data.coachingSessions[0]?.id ?? "");
  const [selectedNotificationId, setSelectedNotificationId] = useState<string>(data.notifications[0]?.id ?? "");
  const managerWeeklyCoachingLogProps = {
    tenantId: data.tenant.id,
    subjectUserId: data.directReport.id,
    coachRole: "manager" as const,
    title: "Capture this week's coaching log",
    employeeName: data.directReport.name,
    employeeEmail: data.directReport.email,
    coachName: data.manager.name,
    coachEmail: data.manager.email,
    supervisorName: data.manager.name,
    supervisorEmail: data.manager.email,
    managerOfSupervisorEmail: data.weeklyCoachingLogs[0]?.managerOfSupervisorEmail,
  };

  const openManagerView = (tab: "interventions" | "coaching" | "documentation" | "notifications", sectionId: string) => {
    setActiveTab(tab);
    window.setTimeout(() => revealWorkspaceSection(sectionId), 20);
  };

  const exportRetrainingHistory = (learnerName: string, assignments: any[]) => {
    const csv = buildRetrainingHistoryCsv(assignments);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeLearnerName = learnerName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner";
    anchor.href = url;
    anchor.download = `${safeLearnerName}-retraining-history-${historyWindow}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      anchor.remove();
    }, 0);
  };

  const selectedIntervention = data.interventions.find((item: any) => item.id === selectedInterventionId) ?? data.interventions[0] ?? null;
  const selectedCoachingSession = data.coachingSessions.find((session: any) => session.id === selectedCoachingSessionId) ?? data.coachingSessions[0] ?? null;
  const managerReminders = buildReminders("manager", {
    now: demoNow(),
    retrainingAssignments: data.retrainingAssignments,
    weeklyCoachingLogs: data.weeklyCoachingLogs,
    learners: [data.directReport],
    notifications: data.notifications,
  });
  const { unread: managerUnread, markAllRead: markManagerRemindersRead } = useReminderInbox("/manager", `manager:${data.tenant.id}`, managerReminders);
  const selectedNotification = managerReminders.find((item) => item.id === selectedNotificationId) ?? managerReminders[0] ?? null;
  const openManagerReminder = (reminder: Reminder) => {
    if (reminder.deepLink?.tab) {
      setActiveTab(reminder.deepLink.tab as "kpi-board" | "leaderboard" | "interventions" | "coaching" | "documentation" | "notifications");
      if (reminder.deepLink.sectionId) window.setTimeout(() => revealWorkspaceSection(reminder.deepLink!.sectionId!), 20);
    }
  };

  const managerWorkspaceStats: WorkspaceStat[] = [
    { label: "Active signals", value: data.openSignals.length, sub: "Live KPI and QA feed requiring attention", icon: <CircleAlert className="h-4 w-4" />, onClick: () => openManagerView("interventions", "manager-signal-trend") },
    { label: "Open interventions", value: data.interventions.length, sub: "Workflow actions from rule triggers", icon: <Target className="h-4 w-4" />, onClick: () => openManagerView("interventions", "manager-interventions-lane") },
    { label: "Coaching follow-ups", value: data.coachingSessions.length, sub: "Structured sessions with action plans", icon: <Users2 className="h-4 w-4" />, onClick: () => openManagerView("coaching", "manager-coaching-lane") },
    { label: "Direct report readiness", value: data.directReport.readinessScore, sub: data.directReport.name, icon: <ShieldCheck className="h-4 w-4" />, onClick: () => openManagerView("coaching", "manager-coach-oversight") },
  ];

  // Team KPI board (WFM & KPI). Tenant resolution stays as-is (always Aspirus);
  // real multi-tenant mapping is a human-engineer item — see shared/kpiScorecards.ts.
  const kpiBoardProfile = getKpiProfile();
  const kpiRollup = rollupKpiProfile(kpiBoardProfile);

  return (
    <WorkspaceShell
      title="Manager Ops"
      subtitle="Work signals, interventions, coaching, and alerts from one queue."
      modesLabel="Manager modes"
      modesSubtitle="Choose a tab to work interventions, coaching, documentation, or alerts."
      activeTab={activeTab}
      onTabChange={(value) => { if (value === "notifications") markManagerRemindersRead(); setActiveTab(value as "kpi-board" | "leaderboard" | "interventions" | "coaching" | "documentation" | "notifications"); }}
      stats={managerWorkspaceStats}
      tabs={[
        { value: "kpi-board", label: "KPI board" },
        { value: "leaderboard", label: "Leaderboard" },
        { value: "interventions", label: "Interventions" },
        { value: "coaching", label: "Coaching" },
        { value: "documentation", label: "Documentation" },
        { value: "notifications", label: "Alerts", badge: managerUnread },
      ]}
    >
        <TabsContent value="kpi-board" id="manager-kpi-board" className="mt-0 space-y-4 scroll-mt-24">
          <div className="surface-dark rounded-[1.45rem] border border-white/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-dark">Team KPI health · {kpiBoardProfile.clientName}</p>
                <h3 className="mt-1 text-lg font-medium text-white">Overall RAG rollup</h3>
                <p className="mt-1 text-sm text-slate-400">{kpiRollup.total} tracked KPIs across Patient Service, Efficiency, and WFM.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <KpiStatusPill status={kpiRollup.overall} label={`Team ${kpiStatusLabel(kpiRollup.overall)}`} />
                <span className="rounded-full border border-emerald-300/30 bg-emerald-400/12 px-2.5 py-1 text-[11px] font-medium text-emerald-100">{kpiRollup.green} on target</span>
                <span className="rounded-full border border-amber-300/30 bg-amber-400/12 px-2.5 py-1 text-[11px] font-medium text-amber-100">{kpiRollup.yellow} watch</span>
                <span className="rounded-full border border-rose-400/30 bg-rose-500/12 px-2.5 py-1 text-[11px] font-medium text-rose-100">{kpiRollup.red} off target</span>
              </div>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {kpiBoardProfile.scorecards.map((card) => (
              <KpiScorecard key={card.id} scorecard={card} clientName={kpiBoardProfile.clientName} note={kpiBoardProfile.note} showStatus />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" id="manager-leaderboard" className="mt-0 scroll-mt-24">
          <LearnerLeaderboard leaderboard={data.leaderboard} variant="manager" />
        </TabsContent>

        <TabsContent value="interventions" id="manager-interventions-lane" className="mt-0 grid gap-6 xl:grid-cols-[0.72fr_1.28fr] scroll-mt-24">
          <div id="manager-signal-trend" className="col-span-full scroll-mt-24">
            <ChartFrame title="Signal severity feed" description="Simulated KPI and QA signals tied to workflow precision, service foundations, and manager-led intervention logic.">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.openSignals.map((signal: any) => ({ label: signal.label, value: signal.value, target: signal.target }))}>
                  <defs>
                    <linearGradient id="signalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2F6FED" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#2F6FED" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} labelStyle={{ color: "#cbd5e1" }} />
                  <Area type="monotone" dataKey="value" stroke="#60A5FA" fill="url(#signalFill)" strokeWidth={3} />
                  <Line type="monotone" dataKey="target" stroke="#F8FAFC" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
          <div className="surface-dark space-y-4 rounded-[1.6rem] border border-white/10 p-3">
            {data.interventions.map((item: any) => (
              <button key={item.id} type="button" onClick={() => setSelectedInterventionId(item.id)} className={`w-full rounded-[1.45rem] border p-4 text-left transition ${selectedIntervention?.id === item.id ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-dark">{item.gap}</p>
                    <h3 className="mt-2 text-base font-medium text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">Due {new Date(item.dueDate).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-6">
            {selectedIntervention ? (
              <PremiumCard>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">{selectedIntervention.title}</CardTitle>
                      <CardDescription className="mt-2 text-slate-400">Gap: {selectedIntervention.gap}</CardDescription>
                    </div>
                    <StatusBadge value={selectedIntervention.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedIntervention.assignedActions.map((action: any) => (
                      <div key={action} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                        <div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-cyan-300" /><span>{action}</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-400"><span>Owner: {data.manager.name}</span><span>Due {new Date(selectedIntervention.dueDate).toLocaleDateString()}</span></div>
                </CardContent>
              </PremiumCard>
            ) : null}
            <WorkflowLibraryPanel
              title="Intervention content mix"
              description="Managers can pull both CHCG methodology assets and tenant uploads directly into intervention execution."
              resources={data.workflowLibraryMix.interventionResources}
            />
          </div>
        </TabsContent>

        <TabsContent value="coaching" id="manager-coaching-lane" className="mt-0 space-y-3 scroll-mt-24">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4 scroll-mt-24">
            <CoachLaneActionCard
              eyebrow="AI guidance"
              title="Review the AI coaching suggestion"
              description="Inspect the current AI-guided retraining suggestion and the live assignment as read-only context."
              accent="emerald"
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open AI guidance"
                  dialogTitle="AI coaching suggestion"
                  dialogDescription="Review the explainable rationale and the live retraining assignment for the direct report."
                  dialogClassName="max-h-[88vh] overflow-y-auto border-white/10 bg-slate-950 text-slate-100 sm:max-w-6xl"
                  renderContent={() => (
                    <GuidanceActionPanel tenantId={data.tenant.id} suggestion={data.aiSuggestion} catalog={data.retrainingCatalog} assignments={data.activeRetrainingAssignments} actorRole="manager" learnerName={data.directReport.name} onUpdated={onUpdated} />
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Manager coaching"
              title="Complete the weekly one-on-one"
              description="Launch a focused writing surface and lock the coaching log into the learner record without leaving the lane."
              accent="gold"
              action={<WeeklyCoachingLogPopupBox buttonLabel="Open weekly one-on-one" dialogTitle="Weekly one-on-one" dialogDescription="Complete the full weekly one-on-one, including follow-up, coaching comments, SMART goal, support, and agent take-aways." buttonClassName="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950" composerProps={managerWeeklyCoachingLogProps} onCreated={onUpdated} />}
            />
            <CoachLaneActionCard
              eyebrow="Weekly history"
              title="Review coaching history"
              description="Review every structured coaching field and confirm how the learner responds over time."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open coaching history"
                  dialogTitle="Weekly coaching log history"
                  dialogDescription="Review every structured coaching field, confirm the simulated email-copy list, and track how the learner responds over time."
                  renderContent={() => (
                    <WeeklyCoachingLogTimeline title="Weekly coaching log history" description="Managers can review every structured coaching field, confirm the simulated email-copy list, and track how the learner responds over time." tenantId={data.tenant.id} logs={data.weeklyCoachingLogs} allowLogEditing onUpdated={onUpdated} />
                  )}
                />
              }
            />
            <div id="manager-coach-oversight" className="scroll-mt-24">
              <CoachLaneActionCard
                eyebrow="Coach oversight"
                title="Coach direct-report oversight"
                description="Review the same direct-report coaching history and retraining the coach sees, by week or month."
                action={
                  <CoachLaneDialogAction
                    buttonLabel="Open coach oversight"
                    dialogTitle="Coach direct-report oversight"
                    dialogDescription="Review the same direct-report coaching history the coach sees without leaving the manager workspace."
                    renderContent={() => (
                      <div className="space-y-4">
                        {data.coachCoverage.map((coverage: any) => {
                          const filteredHistory = filterRetrainingHistoryByWindow(coverage.retrainingHistory ?? [], historyWindow);
                          return (
                            <div key={coverage.coach.id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Coach lane partner</p>
                                  <h4 className="mt-2 text-lg font-medium text-white">{coverage.coach.name} · {coverage.directReport.name}</h4>
                                  <p className="mt-2 text-sm leading-6 text-slate-300">{coverage.directReport.title} · {coverage.weeklyCoachingLogs.length} shared coaching logs · {coverage.coachingSessions.length} active follow-ups</p>
                                </div>
                                <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Remote review ready</Badge>
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coach escalation path</p><p className="mt-2 text-sm text-white">{coverage.coach.name} · {coverage.coach.email}</p><p className="mt-1 text-sm text-slate-300">Escalates into {data.manager.name}'s manager review lane for remote follow-through.</p></div>
                                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Most recent direct-report log</p><p className="mt-2 text-sm text-white">{coverage.latestLog ? new Date(coverage.latestLog.sessionDate).toLocaleDateString() : "No coach-authored log yet"}</p><p className="mt-1 text-sm text-slate-300">{coverage.latestLog ? coverage.latestLog.coachingComments : "The manager lane will surface direct-report coaching history here as soon as a weekly log is recorded."}</p></div>
                              </div>
                              <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">History window</p>
                                      <p className="mt-2 text-sm text-slate-300">Showing completions from the last {historyWindow === "week" ? "7 days" : "31 days"} so managers can review recent retraining by week or month.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Button type="button" variant={historyWindow === "week" ? "default" : "outline"} className={historyWindow === "week" ? "rounded-full bg-white text-slate-950 hover:bg-slate-100" : "rounded-full border-white/10 bg-white/6 text-slate-200 hover:bg-white/12 hover:text-white"} onClick={() => setHistoryWindow("week")}>Week</Button>
                                      <Button type="button" variant={historyWindow === "month" ? "default" : "outline"} className={historyWindow === "month" ? "rounded-full bg-white text-slate-950 hover:bg-slate-100" : "rounded-full border-white/10 bg-white/6 text-slate-200 hover:bg-white/12 hover:text-white"} onClick={() => setHistoryWindow("month")}>Month</Button>
                                      <Button type="button" variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200 hover:bg-white/12 hover:text-white" onClick={() => exportRetrainingHistory(coverage.directReport.name, filteredHistory)} disabled={!filteredHistory.length}>Export CSV</Button>
                                    </div>
                                  </div>
                                </div>
                                <RetrainingHistorySection title="Targeted retraining history" description="Managers can review the current retraining outcome, then export the filtered completion history with completion dates and assigning roles without leaving the coach-oversight lane." assignments={filteredHistory} emptyLabel={`No retraining completions fall inside the selected ${historyWindow} window yet.`} launchRole="manager" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  />
                }
              />
            </div>
            <CoachLaneActionCard
              eyebrow="Coach development"
              title="Push coach training"
              description="Assign a training or development asset from the library to one of your coaches."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open push coach training"
                  dialogTitle="Push coach training"
                  dialogDescription="Select a coach and a training or development asset from the library to assign as a coach development track."
                  renderContent={() => (
                    <PushCoachTrainingCard coaches={data.coachCoverage.map((coverage: any) => coverage.coach)} catalog={data.retrainingCatalog} />
                  )}
                />
              }
            />
          </div>
          <div className="grid gap-3 xl:grid-cols-[0.72fr_1.28fr]">
            <div className="surface-dark space-y-2.5 rounded-[1.6rem] border border-white/10 p-3">
              {data.coachingSessions.map((session: any) => (
                <button key={session.id} type="button" onClick={() => setSelectedCoachingSessionId(session.id)} className={`w-full rounded-[1.45rem] border p-4 text-left transition ${selectedCoachingSession?.id === session.id ? "border-emerald-400/30 bg-emerald-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-dark">Coaching session</p>
                      <h3 className="mt-2 text-base font-medium text-white">{session.title}</h3>
                      <p className="mt-2 text-sm text-slate-300">{session.notes}</p>
                    </div>
                    <StatusBadge value={session.status} />
                  </div>
                </button>
              ))}
            </div>
            <div className="space-y-6">
              {selectedCoachingSession ? (
                <PremiumCard>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-white">{selectedCoachingSession.title}</CardTitle>
                        <CardDescription className="mt-2 text-slate-400">{selectedCoachingSession.notes}</CardDescription>
                      </div>
                      <StatusBadge value={selectedCoachingSession.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Action plan</p>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        {selectedCoachingSession.actionPlan.map((step: any) => (
                          <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /><span>{step}</span></div></div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Audit trail</p>
                      <div className="mt-2 space-y-2">
                        {selectedCoachingSession.auditTrail.map((entry: any) => (
                          <div key={entry.at + entry.detail} className="rounded-2xl border border-white/8 bg-white/5 p-3 text-sm text-slate-300">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{new Date(entry.at).toLocaleString()}</p>
                            <p className="mt-1">{entry.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </PremiumCard>
              ) : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documentation" id="manager-documentation-lane" className="mt-0 space-y-6 scroll-mt-24">
          <div className="grid gap-2.5 md:grid-cols-2">
            <CoachLaneActionCard
              eyebrow="Manager documentation"
              title="Write a coaching log"
              description="Open a focused writing surface to record a one-on-one, quarterly, or annual coaching log on the direct-report record."
              accent="gold"
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open coaching log composer"
                  dialogTitle="Write a one-on-one, quarterly, or annual coaching log"
                  dialogDescription="Record the structured coaching log on the direct-report record without leaving the documentation lane."
                  buttonClassName="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950"
                  renderContent={(close) => (
                    <ReviewLogComposer tenantId={data.tenant.id} subjectUserId={data.directReport.id} authorRole="manager" title="Write a one-on-one, quarterly, or annual coaching log" onCreated={() => { close(); onUpdated?.(); }} />
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Review history"
              title="Review log history"
              description="Open manager-authored logs and leadership checkpoints tied to the learner record and CHCG performance cadence."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open review history"
                  dialogTitle="Structured review history"
                  dialogDescription="Manager-authored logs and leadership checkpoints tied to the learner record and CHCG performance cadence."
                  renderContent={() => (
                    <div className="space-y-3">
                      {data.reviewLogs.map((entry: any) => (
                        <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-medium text-white">{entry.title}</h4>
                              <p className="mt-2 text-sm text-slate-300">{entry.notes}</p>
                            </div>
                            <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200 capitalize">{entry.reviewType.replaceAll("_", " ")}</Badge>
                          </div>
                          <p className="mt-3 text-sm text-slate-400">Next step: {entry.nextStep}</p>
                        </div>
                      ))}
                    </div>
                  )}
                />
              }
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Auto-generated learning documentation</CardTitle>
                <CardDescription className="text-slate-400">Completion evidence from service foundations, workflow precision, and intervention activity is automatically assembled for coaching use.</CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentationFeed entries={data.documentationEntries} weeklyCoachingLogs={data.weeklyCoachingLogs} />
              </CardContent>
            </PremiumCard>
            <WorkflowLibraryPanel
              title="Documentation-ready asset mix"
              description="Review packets and coaching evidence can now blend tenant imports with CHCG governance references."
              resources={data.workflowLibraryMix.documentationResources}
            />
          </div>
        </TabsContent>

        <TabsContent value="notifications" id="manager-alerts-lane" className="mt-0 grid gap-6 xl:grid-cols-[0.72fr_1.28fr] scroll-mt-24">
          <div className="surface-dark space-y-2.5 rounded-[1.6rem] border border-white/10 p-3">
            {managerReminders.map((item) => (
              <ReminderRow key={item.id} reminder={item} selected={selectedNotification?.id === item.id} onSelect={() => setSelectedNotificationId(item.id)} />
            ))}
            {!managerReminders.length ? <div className="rounded-[1.45rem] border border-dashed border-white/12 bg-white/5 px-4 py-5 text-sm leading-6 text-slate-300">No active reminders right now.</div> : null}
          </div>
          <PremiumCard>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-white">{selectedNotification?.subject ?? "Reminder details"}</CardTitle>
                {selectedNotification ? <StatusBadge value={selectedNotification.severity} /> : null}
              </div>
            </CardHeader>
            <CardContent>
              <ReminderDetail reminder={selectedNotification} onOpen={openManagerReminder} />
            </CardContent>
          </PremiumCard>
        </TabsContent>
    </WorkspaceShell>
  );
}

// Identity rule: the current learner sees their own full name; everyone else is
// shown as first name + last initial ("Nina P.") for a lightly anonymized board.
function leaderboardIdentity(name: string, isCurrent: boolean): string {
  if (isCurrent) return name;
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? name;
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${first} ${last[0]}.` : first;
}

// Top-3 treatment from the semantic palette — icon + text label, never color alone.
const LEADERBOARD_TOP3: Record<number, { cls: string; Icon: typeof Trophy; label: string }> = {
  1: { cls: "border-amber-300/40 bg-amber-400/15 text-amber-100", Icon: Trophy, label: "1st" },
  2: { cls: "border-slate-300/40 bg-slate-300/15 text-slate-100", Icon: Medal, label: "2nd" },
  3: { cls: "border-orange-300/40 bg-orange-400/15 text-orange-100", Icon: Award, label: "3rd" },
};

const LEADERBOARD_SIGNALS: { key: "completions" | "quiz" | "readiness" | "streaks"; label: string }[] = [
  { key: "completions", label: "Completions" },
  { key: "quiz", label: "Quiz" },
  { key: "readiness", label: "Readiness" },
  { key: "streaks", label: "Streak" },
];

function LeaderboardRow({ entry, isCurrent, mask = true }: { entry: LeaderboardEntry; isCurrent: boolean; mask?: boolean }) {
  const top3 = LEADERBOARD_TOP3[entry.rank];
  // Learner board masks others ("Nina P."); the manager board shows full names.
  const displayName = mask ? leaderboardIdentity(entry.name, isCurrent) : entry.name;
  return (
    <div className={`flex items-center gap-3 rounded-[1.2rem] border px-3 py-2.5 ${isCurrent ? "border-[#FCBC34]/60 bg-[#FCBC34]/10 shadow-[0_10px_28px_rgba(252,188,52,0.16)]" : "border-white/10 bg-white/5"}`}>
      <div className="flex w-9 shrink-0 items-center justify-center">
        {top3 ? (
          <span className={`inline-flex items-center justify-center rounded-full border px-1.5 py-1.5 ${top3.cls}`} title={`${top3.label} place`}>
            <top3.Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <span className="text-sm font-semibold tabular-nums text-slate-400">{entry.rank}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-semibold ${isCurrent ? "text-white" : "text-slate-200"}`}>{displayName}</p>
          {isCurrent ? <span className="shrink-0 rounded-full border border-[#FCBC34]/50 bg-[#FCBC34]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FCBC34]">You</span> : null}
          {top3 ? <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">{top3.label}</span> : null}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {LEADERBOARD_SIGNALS.map((signal) => (
            <span key={signal.key} className="text-[11px] text-slate-300">
              <span className="text-slate-400">{signal.label}</span>{" "}
              <span className="font-semibold tabular-nums text-white">{Math.round(entry.breakdown[signal.key])}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-base font-semibold tabular-nums text-white">{entry.points}</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-dark">pts</p>
      </div>
    </div>
  );
}

// Org-configured "this period's reward" callout (LEAD3). Display only — no prize
// logic or fulfillment. Text comes from the leaderboard config; admins
// (client_admin / platform_admin) can edit it, everyone else sees it read-only.
function LeaderboardRewardCallout() {
  const access = trpc.demo.viewerAccess.useQuery();
  const grantRole = access.data?.grant.role;
  const canEdit = grantRole === "client_admin" || grantRole === "platform_admin";
  const [text, setText] = useState(leaderboardReward.text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (!leaderboardReward.enabled) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[1.35rem] border border-[#FCBC34]/35 bg-[linear-gradient(135deg,rgba(9,18,28,0.96),rgba(20,32,44,0.92))] px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.13)]">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FCBC34]/40 bg-[#FCBC34]/15 text-[#FCBC34]">
        <Gift className="h-4 w-4" aria-hidden="true" />
      </span>
      {editing ? (
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Reward text"
            className="min-w-[16rem] flex-1 rounded-full border border-[#FCBC34]/40 bg-slate-950/40 px-3 py-1.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#FCBC34]/40"
          />
          {/* In-session edit; production persists the org's reward text via a backend mutation. */}
          <button type="button" onClick={() => { setText(draft.trim() || text); setEditing(false); }} className="rounded-full bg-[#FCBC34] px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-[#ffd56d]">Save</button>
          <button type="button" onClick={() => { setDraft(text); setEditing(false); }} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10">Cancel</button>
        </div>
      ) : (
        <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FCBC34]/80">This period's reward</p>
            <p className="text-sm font-medium text-white">{text}</p>
          </div>
          {canEdit ? (
            <button type="button" onClick={() => { setDraft(text); setEditing(true); }} className="inline-flex items-center gap-1.5 rounded-full border border-[#FCBC34]/40 bg-[#FCBC34]/10 px-3 py-1.5 text-xs font-semibold text-[#FCBC34] hover:bg-[#FCBC34]/20">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function LearnerLeaderboard({ leaderboard, variant = "learner" }: { leaderboard: any; variant?: "learner" | "manager" }) {
  const [scope, setScope] = useState<"team" | "org">("team");
  const [managerLevel, setManagerLevel] = useState<"org" | "team" | "learner">("org");
  const [managerTeam, setManagerTeam] = useState<string>("");
  const [managerLearnerId, setManagerLearnerId] = useState<string>("");

  // ── Manager board: a three-level scope filter (Org → Coach Team → Learner),
  // full names throughout (the manager's reports), no personal pin/"you" highlight.
  // Reuses the same rows, breakdown, and reward callout as the learner board.
  if (variant === "manager") {
    const orgRoster = leaderboard?.orgRoster ?? [];
    const teams: string[] = Array.from(new Set(orgRoster.map((entry: any) => entry.team)));
    const effectiveTeam = managerTeam && teams.includes(managerTeam) ? managerTeam : (teams[0] ?? "");
    const teamRanked = rankLeaderboard(orgRoster.filter((entry: any) => entry.team === effectiveTeam));
    // Default the Learner scope to the manager's direct report when they're on the
    // selected team, otherwise fall back to that team's #1.
    const directReportId: string = leaderboard?.directReportId ?? "";
    const defaultLearnerId = teamRanked.some((entry) => entry.id === directReportId) ? directReportId : (teamRanked[0]?.id ?? "");
    const effectiveLearnerId = teamRanked.some((entry) => entry.id === managerLearnerId) ? managerLearnerId : defaultLearnerId;
    const standings =
      managerLevel === "org"
        ? rankLeaderboard(orgRoster)
        : managerLevel === "team"
          ? teamRanked
          : teamRanked.filter((entry) => entry.id === effectiveLearnerId);
    const focusLearner = teamRanked.find((entry) => entry.id === effectiveLearnerId) ?? null;
    const contextLabel =
      managerLevel === "org"
        ? `Org-wide · ${orgRoster.length} learners`
        : managerLevel === "team"
          ? `${effectiveTeam} · ${teamRanked.length} learners`
          : focusLearner
            ? `${focusLearner.name} · #${focusLearner.rank} of ${teamRanked.length} in ${effectiveTeam}`
            : effectiveTeam;

    return (
      <div className="space-y-4">
        <LeaderboardRewardCallout />
        <PremiumCard>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-dark">Team leaderboard</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{contextLabel}</h3>
                <p className="mt-1 text-sm text-slate-300">Ranked on training performance — completions, quiz, readiness, and streak.</p>
              </div>
              <select disabled aria-label="Leaderboard period" className="cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 opacity-70">
                <option>This program · all time</option>
              </select>
            </div>
          </CardContent>
        </PremiumCard>

        <div className="surface-dark space-y-3 rounded-[1.6rem] border border-white/10 p-3 sm:p-3.5">
        {/* Three-level scope filter: Org (everyone) → Coach Team → one Learner. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            {([["org", "Org"], ["team", "Coach team"], ["learner", "Learner"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setManagerLevel(value)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${managerLevel === value ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"}`}>{label}</button>
            ))}
          </div>
          {managerLevel !== "org" ? (
            <select value={effectiveTeam} onChange={(event) => { setManagerTeam(event.target.value); setManagerLearnerId(""); }} aria-label="Coach team" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
              {teams.map((team) => <option key={team} value={team} className="text-slate-900">{team}</option>)}
            </select>
          ) : null}
          {managerLevel === "learner" ? (
            <select value={effectiveLearnerId} onChange={(event) => setManagerLearnerId(event.target.value)} aria-label="Learner" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
              {teamRanked.map((entry) => <option key={entry.id} value={entry.id} className="text-slate-900">{entry.name}</option>)}
            </select>
          ) : null}
        </div>

        <div className="space-y-2">
          {standings.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} isCurrent={false} mask={false} />
          ))}
        </div>
        </div>
      </div>
    );
  }

  const currentLearnerId: string = leaderboard?.currentLearnerId ?? "";
  const roster = (scope === "team" ? leaderboard?.teamRoster : leaderboard?.orgRoster) ?? [];
  const standings = rankLeaderboard(roster);
  const me = standings.find((entry) => entry.id === currentLearnerId) ?? null;
  const total = standings.length;
  const nextUp = me ? (standings.find((entry) => entry.rank === me.rank - 1) ?? null) : null;
  const gapToNext = me && nextUp ? nextUp.points - me.points : 0;

  return (
    <div className="space-y-4">
      <LeaderboardRewardCallout />
      <PremiumCard>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-dark">Your standing · {scope === "team" ? "your team" : "org-wide"}</p>
              {me ? (
                <>
                  <h3 className="mt-1 text-xl font-semibold text-white">You're #{me.rank} of {total} on {scope === "team" ? "your team" : "the org"}</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {me.points} pts · {nextUp ? `${gapToNext} pts to #${nextUp.rank} (${leaderboardIdentity(nextUp.name, false)})` : "you're at the top — hold the lead"}
                  </p>
                </>
              ) : (
                <h3 className="mt-1 text-lg font-medium text-slate-300">No standing yet for this scope.</h3>
              )}
            </div>
            {/* TODO(LEAD): no period data is seeded yet. The selector is intentionally inert
                with a single all-time period; wire it to real time-bucketed standings once the
                backend serves per-period signals. Do not fake interim periods. */}
            <select disabled aria-label="Leaderboard period" className="cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 opacity-70">
              <option>This program · all time</option>
            </select>
          </div>
        </CardContent>
      </PremiumCard>

      <div className="surface-dark space-y-3 rounded-[1.6rem] border border-white/10 p-3 sm:p-3.5">
      <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
        {([["team", "My team"], ["org", "Org-wide"]] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setScope(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${scope === value ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {standings.map((entry) => (
          <LeaderboardRow key={entry.id} entry={entry} isCurrent={entry.id === currentLearnerId} />
        ))}
      </div>
      </div>

      {/* Current learner pinned to the bottom so their rank stays visible below the fold. */}
      {me ? (
        <div className="sticky bottom-2 z-10">
          <div className="surface-dark rounded-[1.35rem] border border-[#FCBC34]/40 p-1.5 shadow-[0_18px_40px_rgba(2,8,23,0.5)] backdrop-blur">
            <LeaderboardRow entry={me} isCurrent />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LearnerPanel({ data, onUpdated, freshStart = false, headerActions }: { data: any; onUpdated?: () => void; freshStart?: boolean; headerActions?: ReactNode }) {
  const learnerModules = data.activeJourney.modules;
  const primaryLearnerModule = learnerModules[0] ?? null;
  const activeRetrainingAssignment = data.currentRetrainingAssignment ?? data.retrainingAssignments?.[0] ?? null;
  const retrainingHistory = data.retrainingHistory ?? [];
  const nextLearnerModule = learnerModules.find((module: any) => module.completionRate < 80) ?? learnerModules[0] ?? null;
  const completedLearnerModules = learnerModules.filter((module: any) => module.completionRate >= 80).length;
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLearnerAlertId, setSelectedLearnerAlertId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"journey" | "leaderboard" | "alerts" | "reengagements" | "coaching" | "evidence">("journey");
  const utils = trpc.useUtils();
  const updateRetrainingStatus = trpc.demo.secureUpdateRetrainingAssignmentStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.demo.secureLearner.invalidate({ tenantId: data.tenant.id, freshStart }),
        utils.demo.secureCoach.invalidate({ tenantId: data.tenant.id }),
        utils.demo.secureManager.invalidate({ tenantId: data.tenant.id }),
      ]);
      onUpdated?.();
    },
  });
  const primaryTrainingPath = activeRetrainingAssignment
    ? buildTrainingLaunchPath({
      journeyId: activeRetrainingAssignment.journeyId,
      moduleId: activeRetrainingAssignment.moduleId,
      assignmentId: activeRetrainingAssignment.id,
      freshStart,
    })
    : buildTrainingLaunchPath({ freshStart });
  const updateActiveAssignmentStatus = (status: "assigned" | "in_progress" | "completed") => {
    if (!activeRetrainingAssignment) {
      return;
    }

    updateRetrainingStatus.mutate({
      tenantId: data.tenant.id,
      assignmentId: activeRetrainingAssignment.id,
      status,
    });
  };
  const launchTrainingPath = (module: any) => buildLearnerJourneyModulePath({
    activeJourneyId: data.activeJourney.id,
    moduleId: module.id,
    activeRetrainingAssignment,
    primaryTrainingPath,
    freshStart,
  });
  const interventionTrainingOptions = buildLearnerInterventionTrainingOptions({
    activeJourneyId: data.activeJourney.id,
    learnerModules,
    activeRetrainingAssignment,
    primaryTrainingPath,
    freshStart,
  });
  const activeIntervention = data.assignedInterventions.find((item: any) => item.id === selectedInterventionId) ?? null;
  // Re-engagements: detail defaults to the first assigned re-engagement until one is picked.
  const priorityIntervention = data.assignedInterventions[0] ?? null;
  const effectiveIntervention = activeIntervention ?? priorityIntervention;
  const priorityInterventionPath = interventionTrainingOptions[0]?.path ?? primaryTrainingPath;
  // Evidence: review logs sorted most-recent-first; detail defaults to the latest.
  const sortedReviewLogs = [...(data.reviewLogs ?? [])].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latestReviewLog = sortedReviewLogs[0] ?? null;
  const effectiveReviewLog = sortedReviewLogs.find((entry: any) => entry.id === selectedReviewId) ?? latestReviewLog;
  // Journey: the path detail defaults to the assigned module (if any), else the recommended (first).
  const assignmentDue = Boolean(activeRetrainingAssignment) && activeRetrainingAssignment.status !== "completed";
  const journeyDefaultModule = (activeRetrainingAssignment?.moduleId && learnerModules.find((module: any) => module.id === activeRetrainingAssignment.moduleId)) || primaryLearnerModule;
  const effectiveModule = learnerModules.find((module: any) => module.id === selectedModuleId) ?? journeyDefaultModule;
  const learnerCelebrationCopy = completedLearnerModules >= Math.max(1, Math.ceil(learnerModules.length / 2))
    ? "You have already crossed the halfway mark in your guided journey."
    : "Each completed module unlocks the next coaching and readiness milestone.";

  // Learner Alerts (NOTIF2) — the learner's own training due dates, scheduled 1:1 /
  // follow-up, and failed knowledge checks, plus folded announcements.
  const learnerReminders = buildReminders("learner", {
    now: demoNow(),
    retrainingAssignments: data.retrainingAssignments,
    coachingSessions: data.nextCoachingSession ? [data.nextCoachingSession] : [],
    learners: [data.learner],
    notifications: data.notifications,
  });
  const { unread: learnerUnread, markAllRead: markLearnerRemindersRead } = useReminderInbox("/learner", `learner:${data.tenant.id}`, learnerReminders);
  const selectedLearnerAlert = learnerReminders.find((item) => item.id === selectedLearnerAlertId) ?? learnerReminders[0] ?? null;
  const openLearnerReminder = (reminder: Reminder) => {
    if (reminder.deepLink?.tab) setActiveTab(reminder.deepLink.tab as "journey" | "leaderboard" | "alerts" | "reengagements" | "coaching" | "evidence");
  };

  const learnerStats: WorkspaceStat[] = [
    { label: "Readiness score", value: data.learner.readinessScore, sub: data.learner.title, icon: <Gauge className="h-4 w-4" /> },
    { label: "Journey progress", value: `${data.activeJourney.progress}%`, sub: data.activeJourney.title, icon: <BookOpen className="h-4 w-4" /> },
    { label: "Modules complete", value: `${completedLearnerModules}/${learnerModules.length}`, sub: "Over 80% complete", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: learnerWorkspaceCopy.assignedReengagementsMetricLabel, value: data.assignedInterventions.length, sub: learnerWorkspaceCopy.assignedReengagementsMetricSupporting, icon: <Target className="h-4 w-4" />, onClick: () => setActiveTab("reengagements") },
    { label: "Next coaching", value: new Date(data.nextCoachingSession.dueDate).toLocaleDateString(), sub: data.nextCoachingSession.title, icon: <Bell className="h-4 w-4" />, onClick: () => setActiveTab("coaching") },
  ];

  return (
    <WorkspaceShell
      title="Learner Journey"
      subtitle="Complete assignments tied to skill opportunities, coaching actions, and readiness progress."
      actions={headerActions}
      modesLabel="Learner modes"
      activeTab={activeTab}
      onTabChange={(value) => { if (value === "alerts") markLearnerRemindersRead(); setActiveTab(value as "journey" | "leaderboard" | "alerts" | "reengagements" | "coaching" | "evidence"); }}
      stats={learnerStats}
      statsGridClassName="grid flex-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      subTruncate
      tabs={[
        { value: "journey", label: "Journey" },
        { value: "leaderboard", label: "Leaderboard" },
        { value: "alerts", label: "Alerts", badge: learnerUnread },
        { value: "reengagements", label: "Re-engagements" },
        { value: "coaching", label: "Coaching" },
        { value: "evidence", label: "Evidence" },
      ]}
      betweenStatsAndTabs={
        <>
          {/* Priority next-step — the learner's single most important action (assigned retraining, or the
              next recommended module). The assignment title is shown here and nowhere else. */}
          <div id="learner-priority-strip" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-amber-300/25 bg-[linear-gradient(135deg,rgba(69,26,3,0.55),rgba(15,23,42,0.94))] px-4 py-3 shadow-[0_16px_44px_rgba(8,15,35,0.22)]">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <Badge className="rounded-full border-amber-200/25 bg-amber-300/16 text-amber-50">{activeRetrainingAssignment ? "Priority retraining" : "Next step"}</Badge>
              <span className="truncate text-sm font-semibold text-white">{activeRetrainingAssignment?.moduleTitle ?? nextLearnerModule?.title ?? data.activeJourney.title}</span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-300">{activeRetrainingAssignment?.journeyTitle ?? data.activeJourney.title}</span>
              {activeRetrainingAssignment ? (
                <>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs font-medium text-amber-100">{activeRetrainingAssignment.status === "completed" && activeRetrainingAssignment.completedAt ? `Completed ${new Date(activeRetrainingAssignment.completedAt).toLocaleDateString()}` : formatDueWindow(activeRetrainingAssignment.dueAt)}</span>
                </>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link href={primaryTrainingPath}>
                <Button size="sm" className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={() => {
                  if (activeRetrainingAssignment?.status === "assigned") {
                    updateActiveAssignmentStatus("in_progress");
                  }
                }}>
                  {activeRetrainingAssignment ? (activeRetrainingAssignment.status === "completed" ? "Review retraining" : "Start retraining") : "Resume training"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              {activeRetrainingAssignment && activeRetrainingAssignment.status !== "completed" ? (
                <Button type="button" size="sm" variant="outline" onClick={() => updateActiveAssignmentStatus("completed")} disabled={updateRetrainingStatus.isPending} className="rounded-full border-white/16 bg-slate-950/35 text-white hover:bg-slate-900/55 hover:text-white">
                  {updateRetrainingStatus.isPending ? "Saving..." : "Mark complete"}
                </Button>
              ) : null}
            </div>
          </div>
        </>
      }
    >

        <TabsContent value="journey" className="mt-0 space-y-4">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            <CoachLaneActionCard
              eyebrow={assignmentDue ? "Assigned retraining" : "Recommended path"}
              title={assignmentDue ? "Open assigned retraining" : "Resume the recommended path"}
              description={assignmentDue ? `Finish ${activeRetrainingAssignment.moduleTitle ?? "your assigned retraining"} before resuming the recommended path.` : (primaryLearnerModule ? `Resume ${primaryLearnerModule.title} to keep building ${primaryLearnerModule.skillFocus.toLowerCase()}.` : `Continue your active journey in ${data.activeJourney.title}.`)}
              accent="gold"
              action={
                <Link href={assignmentDue ? primaryTrainingPath : (primaryLearnerModule ? launchTrainingPath(primaryLearnerModule) : primaryTrainingPath)}>
                  <Button type="button" onClick={() => { if (assignmentDue && activeRetrainingAssignment.status === "assigned") updateActiveAssignmentStatus("in_progress"); }} className="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950">
                    {assignmentDue ? "Open assigned retraining" : "Resume path"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
            <CoachLaneActionCard
              eyebrow="Learning path"
              title="Browse the learning path"
              description="See every module in this journey with its progress, then jump into any one."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open the learning path"
                  dialogTitle={`${data.activeJourney.title} · learning path`}
                  dialogDescription="Every module in your active journey, with progress and skill focus."
                  buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                  renderContent={() => (
                    <div className="space-y-2.5">
                      {data.activeJourney.modules.map((module: any) => (
                        <div key={module.id} className="rounded-[1.4rem] border border-white/12 bg-white/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-dark">{module.format}</p>
                              <h4 className="mt-1 text-base font-semibold text-white">{module.title}</h4>
                              <p className="mt-1 text-sm text-slate-300">Skill focus: {module.skillFocus}</p>
                            </div>
                            <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{module.durationMinutes} min</Badge>
                          </div>
                          <div className="mt-3"><div className="mb-1.5 flex items-center justify-between text-sm text-slate-400"><span>Completion</span><span>{module.completionRate}%</span></div><Progress value={module.completionRate} className="h-2 bg-white/8" /></div>
                          <Link href={launchTrainingPath(module)}><Button type="button" variant="outline" className="mt-3 rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">Open this module</Button></Link>
                        </div>
                      ))}
                    </div>
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Resources"
              title="Open resources"
              description="CHCG core modules and tenant-provided launch or compliance materials for this journey."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open resources"
                  dialogTitle="Journey resources"
                  dialogDescription="CHCG core modules and tenant-provided launch or compliance materials for this journey."
                  buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                  renderContent={() => (
                    <WorkflowLibraryPanel title="Resources" description="CHCG core modules and tenant-provided launch or compliance materials for this journey." resources={data.workflowLibraryMix.journeyResources} />
                  )}
                />
              }
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="surface-dark space-y-2.5 rounded-[1.6rem] border border-white/10 p-3">
              {data.activeJourney.modules.map((module: any, index: number) => {
                const selected = effectiveModule?.id === module.id;
                const assigned = activeRetrainingAssignment?.moduleId === module.id;
                return (
                  <button key={module.id} type="button" onClick={() => setSelectedModuleId(module.id)} className={`w-full rounded-[1.15rem] border p-3 text-left transition ${selected ? "border-cyan-300/40 bg-cyan-400/10 shadow-[0_14px_28px_rgba(8,145,178,0.14)]" : "border-white/12 bg-white/[0.07] hover:border-white/20 hover:bg-white/10"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${selected ? "text-cyan-200" : "text-muted-dark"}`}>{module.format}</p>
                          {index === 0 ? <Badge className="rounded-full border-cyan-200/20 bg-cyan-300/12 text-cyan-100">Recommended</Badge> : null}
                          {index === 1 ? <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Up next</Badge> : null}
                          {assigned ? <Badge className="rounded-full border-amber-400/20 bg-amber-400/12 text-amber-100">Assigned</Badge> : null}
                          {module.completionRate >= 80 ? <Badge className="rounded-full border-emerald-400/20 bg-emerald-400/10 text-emerald-100">Strong progress</Badge> : null}
                        </div>
                        <h3 className="mt-1.5 text-base font-medium text-white">{module.title}</h3>
                        <p className="mt-1 text-sm leading-5 text-slate-300">Skill focus: {module.skillFocus}</p>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{module.durationMinutes} min</Badge>
                    </div>
                    <div className="mt-2.5"><div className="mb-1.5 flex items-center justify-between text-sm text-slate-400"><span>{index === 0 ? "Recommended path" : "Completion"}</span><span>{module.completionRate}%</span></div><Progress value={module.completionRate} className="h-2 bg-white/8" /></div>
                  </button>
                );
              })}
            </div>
            <PremiumCard>
              <CardHeader className="space-y-0 p-4 pb-2.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Selected module</CardTitle>
                    <CardDescription className="mt-1 text-sm leading-5 text-slate-300">{effectiveModule ? "Review the skill focus and progress, then open the module from here." : "Select a module to see its detail."}</CardDescription>
                  </div>
                  {effectiveModule ? <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{effectiveModule.durationMinutes} min</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 p-4 pt-0">
                {effectiveModule ? (
                  <>
                    <div className="rounded-[1.05rem] border border-white/14 bg-white/7 px-3.5 py-3 text-sm leading-5 text-slate-200"><span className="font-medium text-white">Skill focus:</span> {effectiveModule.skillFocus}</div>
                    <div className="rounded-[1.05rem] border border-white/14 bg-white/7 px-3.5 py-3"><div className="mb-1.5 flex items-center justify-between text-sm text-slate-300"><span>{activeRetrainingAssignment?.moduleId === effectiveModule.id ? "Assigned retraining" : "Path progress"}</span><span className="font-semibold text-white">{effectiveModule.completionRate}%</span></div><Progress value={effectiveModule.completionRate} className="h-2 bg-white/8" /></div>
                    <Link href={launchTrainingPath(effectiveModule)}>
                      <Button type="button" onClick={() => { if (activeRetrainingAssignment?.moduleId === effectiveModule.id && activeRetrainingAssignment.status === "assigned") updateActiveAssignmentStatus("in_progress"); }} className="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950">
                        {activeRetrainingAssignment?.moduleId === effectiveModule.id ? (activeRetrainingAssignment.status === "completed" ? "Review assigned module" : "Resume assigned module") : "Open this module"} <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <CoachLaneDialogAction
                      buttonLabel="Open module detail"
                      dialogTitle={`${effectiveModule.title} · module detail`}
                      dialogDescription="Review the skill focus, format, and progress for this module."
                      buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                      renderContent={() => (
                        <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full border-white/12 bg-white/10 text-slate-200">{effectiveModule.format}</Badge>
                            <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{effectiveModule.durationMinutes} min</Badge>
                            {activeRetrainingAssignment?.moduleId === effectiveModule.id ? <Badge className="rounded-full border-amber-400/20 bg-amber-400/12 text-amber-100">Assigned</Badge> : null}
                          </div>
                          <p className="text-sm leading-6 text-slate-200">Skill focus: {effectiveModule.skillFocus}</p>
                          <div><div className="mb-1.5 flex items-center justify-between text-sm text-slate-300"><span>Completion</span><span className="font-semibold text-white">{effectiveModule.completionRate}%</span></div><Progress value={effectiveModule.completionRate} className="h-2 bg-white/8" /></div>
                        </div>
                      )}
                    />
                  </>
                ) : (
                  <div className="rounded-[1.45rem] border border-dashed border-white/12 bg-white/5 px-4 py-5 text-sm leading-6 text-slate-300">Select a module from the path to see its detail and open it.</div>
                )}
              </CardContent>
            </PremiumCard>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-0">
          <LearnerLeaderboard leaderboard={data.leaderboard} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-0 grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="surface-dark space-y-2.5 rounded-[1.6rem] border border-white/10 p-3">
            {learnerReminders.map((item) => (
              <ReminderRow key={item.id} reminder={item} selected={selectedLearnerAlert?.id === item.id} onSelect={() => setSelectedLearnerAlertId(item.id)} />
            ))}
            {!learnerReminders.length ? <div className="rounded-[1.45rem] border border-dashed border-white/12 bg-white/5 px-4 py-5 text-sm leading-6 text-slate-300">You're all caught up — no reminders right now.</div> : null}
          </div>
          <PremiumCard>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-white">{selectedLearnerAlert?.subject ?? "Reminder details"}</CardTitle>
                {selectedLearnerAlert ? <StatusBadge value={selectedLearnerAlert.severity} /> : null}
              </div>
            </CardHeader>
            <CardContent>
              <ReminderDetail reminder={selectedLearnerAlert} onOpen={openLearnerReminder} />
            </CardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="reengagements" className="mt-0 space-y-4">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            <CoachLaneActionCard
              eyebrow="Priority re-engagement"
              title="Start the priority re-engagement"
              description={priorityIntervention ? `Jump into ${priorityIntervention.title} and begin the assigned re-engagement now.` : "Begin your highest-priority assigned re-engagement."}
              accent="gold"
              action={
                <Link href={priorityInterventionPath}>
                  <Button type="button" onClick={() => { if (activeRetrainingAssignment?.status === "assigned") updateActiveAssignmentStatus("in_progress"); }} className="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950">
                    Start re-engagement <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
            <CoachLaneActionCard
              eyebrow="Training path"
              title="Choose training path"
              description="Pick the best module to continue an assigned re-engagement."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open training options"
                  dialogTitle="Choose the training to continue this re-engagement"
                  dialogDescription="Route into the right module so you land exactly where the assigned re-engagement should continue."
                  buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                  renderContent={(close) => (
                    <div className="space-y-3">
                      {interventionTrainingOptions.map((option) => (
                        <Link key={option.id} href={option.path}>
                          <button type="button" onClick={() => { if (option.isAssigned && activeRetrainingAssignment?.status === "assigned") updateActiveAssignmentStatus("in_progress"); close(); }} className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h4 className="text-base font-semibold text-white">{option.title}</h4>
                                <p className="mt-1 text-sm text-slate-300">{option.subtitle}</p>
                                <p className="mt-2 text-sm text-cyan-100/85">{option.detail}</p>
                              </div>
                              <Badge className={`rounded-full ${option.isAssigned ? "border-amber-400/20 bg-amber-400/12 text-amber-100" : "border-white/10 bg-white/8 text-slate-200"}`}>{option.isAssigned ? "Assigned now" : "Available module"}</Badge>
                            </div>
                          </button>
                        </Link>
                      ))}
                    </div>
                  )}
                />
              }
            />
            {activeRetrainingAssignment ? (
              <CoachLaneActionCard
                eyebrow="Assigned retraining"
                title="Open assigned module"
                description={`Resume ${activeRetrainingAssignment.moduleTitle ?? "your assigned retraining"} from the priority bar.`}
                action={
                  <Link href={primaryTrainingPath}>
                    <Button type="button" onClick={() => { if (activeRetrainingAssignment.status === "assigned") updateActiveAssignmentStatus("in_progress"); }} className="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                      {activeRetrainingAssignment.status === "completed" ? "Review assigned module" : "Resume assigned module"} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                }
              />
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="surface-dark space-y-2.5 rounded-[1.6rem] border border-white/10 p-3">
              {data.assignedInterventions.map((item: any) => (
                <button key={item.id} type="button" onClick={() => setSelectedInterventionId(item.id)} className={`w-full rounded-[1.15rem] border p-3 text-left transition ${effectiveIntervention?.id === item.id ? "border-cyan-300/40 bg-cyan-400/10 shadow-[0_14px_28px_rgba(8,145,178,0.14)]" : "border-white/12 bg-white/[0.07] hover:border-white/20 hover:bg-white/10"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-xs uppercase tracking-[0.22em] ${effectiveIntervention?.id === item.id ? "text-cyan-200" : "text-muted-dark"}`}>Re-engagement</p>
                      <h3 className="mt-1.5 text-base font-medium text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-slate-300">{item.gap}</p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                </button>
              ))}
              {!data.assignedInterventions.length ? (
                <div className="rounded-[1.45rem] border border-dashed border-white/12 bg-white/5 px-4 py-5 text-sm leading-6 text-slate-300">No assigned re-engagements right now. New auto-assignments will appear here.</div>
              ) : null}
            </div>
            <PremiumCard>
              <CardHeader className="space-y-0 p-4 pb-2.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Selected re-engagement</CardTitle>
                    <CardDescription className="mt-1 text-sm leading-5 text-slate-300">{effectiveIntervention ? "Review the gap and assigned actions, then open the full plan." : "Select a re-engagement to review its plan."}</CardDescription>
                  </div>
                  {effectiveIntervention ? <StatusBadge value={effectiveIntervention.status} /> : <Badge className="rounded-full border-white/12 bg-white/10 text-slate-200">Waiting for selection</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 p-4 pt-0">
                {effectiveIntervention ? (
                  <>
                    <div className="rounded-[1.05rem] border border-white/14 bg-white/7 px-3.5 py-3 text-sm leading-5 text-slate-200"><span className="font-medium text-white">Gap:</span> {effectiveIntervention.gap}</div>
                    <div className="space-y-2">
                      {effectiveIntervention.assignedActions.map((action: string) => (
                        <div key={action} className="flex items-start gap-2 rounded-[1.05rem] border border-white/14 bg-white/7 px-3.5 py-3 text-sm leading-5 text-slate-200"><ChevronRight className="mt-0.5 h-4 w-4 text-cyan-200" /><span>{action}</span></div>
                      ))}
                    </div>
                    <CoachLaneDialogAction
                      buttonLabel="Open re-engagement plan"
                      dialogTitle={`${effectiveIntervention.title} · re-engagement plan`}
                      dialogDescription="Review the full gap and assigned actions, then choose the training to continue."
                      buttonClassName="w-full justify-between rounded-full border-cyan-200/55 bg-cyan-300/18 text-white shadow-[0_12px_30px_rgba(34,211,238,0.14)] hover:bg-cyan-300/26 hover:text-white"
                      renderContent={(close) => (
                        <div className="space-y-4 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge value={effectiveIntervention.status} />
                            <Badge className="rounded-full border-white/12 bg-white/10 text-slate-200">{effectiveIntervention.gap}</Badge>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {effectiveIntervention.assignedActions.map((action: string) => (
                              <div key={action} className="rounded-2xl border border-white/14 bg-slate-950 p-3 text-sm text-slate-100"><div className="flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4 text-cyan-300" /><span>{action}</span></div></div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Continue with training</p>
                            {interventionTrainingOptions.map((option) => (
                              <Link key={option.id} href={option.path}>
                                <button type="button" onClick={() => { if (option.isAssigned && activeRetrainingAssignment?.status === "assigned") updateActiveAssignmentStatus("in_progress"); close(); }} className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <h4 className="text-base font-semibold text-white">{option.title}</h4>
                                      <p className="mt-1 text-sm text-slate-300">{option.subtitle}</p>
                                    </div>
                                    <Badge className={`rounded-full ${option.isAssigned ? "border-amber-400/20 bg-amber-400/12 text-amber-100" : "border-white/10 bg-white/8 text-slate-200"}`}>{option.isAssigned ? "Assigned now" : "Available module"}</Badge>
                                  </div>
                                </button>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    />
                  </>
                ) : null}
              </CardContent>
            </PremiumCard>
          </div>
        </TabsContent>

        <TabsContent value="coaching" className="mt-0 space-y-4">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <CoachLaneActionCard
              eyebrow="Weekly take-aways"
              title="Add your weekly take-aways"
              description="Respond to your leaders' coaching notes and lock in your own take-aways in the timeline below."
              accent="gold"
              action={
                <Button type="button" onClick={() => document.getElementById("learner-coaching-timeline")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950">
                  Add take-aways <ArrowRight className="h-4 w-4" />
                </Button>
              }
            />
            <CoachLaneActionCard
              eyebrow="Coaching history"
              title="Review coaching history"
              description="Read the full set of recorded coaching notes and email-copy recipients in one focused view."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open coaching history"
                  dialogTitle="Weekly coaching log history"
                  dialogDescription="Review every recorded coaching note and the simulated email-copy recipients."
                  buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                  renderContent={() => (
                    <WeeklyCoachingLogTimeline title="Weekly coaching log history" description="Review the structured coaching notes your leaders recorded and the simulated email-copy recipients." tenantId={data.tenant.id} logs={data.weeklyCoachingLogs} onUpdated={onUpdated} />
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Next milestone"
              title="Next coaching milestone"
              description="See when your next coaching checkpoint is due and what to prepare."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open milestone"
                  dialogTitle="Next coaching milestone"
                  dialogDescription="Your upcoming coaching checkpoint."
                  buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                  dialogClassName="border-white/10 bg-slate-950 text-slate-100 sm:max-w-lg"
                  renderContent={() => (
                    <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-dark">Scheduled checkpoint</p>
                      <h3 className="text-xl font-semibold text-white">{data.nextCoachingSession.title}</h3>
                      <p className="text-sm text-slate-300">Due {new Date(data.nextCoachingSession.dueDate).toLocaleDateString()}</p>
                    </div>
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Support assets"
              title="Coaching support assets"
              description="Open the mapped resources to prepare for your next coaching step."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open support assets"
                  dialogTitle="Coaching support assets"
                  dialogDescription="CHCG governance assets and tenant-authored resources for your next coaching step."
                  buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                  renderContent={() => (
                    <WorkflowLibraryPanel title="Coaching support assets" description="Use mapped resources to prepare for your next coaching step and reinforce the right behaviors before the next review." resources={data.workflowLibraryMix.documentationResources} />
                  )}
                />
              }
            />
          </div>
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Coaching timeline</CardTitle>
              <CardDescription className="text-slate-400">Review your structured take-aways and respond inline without leaving the learner workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div id="learner-coaching-timeline" className="scroll-mt-24">
                <WeeklyCoachingLogTimeline title="Weekly coaching log and your take-aways" description="Review the structured coaching notes your leaders recorded, see which email recipients would receive copies, and add your own response back into the same log." tenantId={data.tenant.id} logs={data.weeklyCoachingLogs} allowTakeawayEditing onUpdated={onUpdated} />
              </div>
            </CardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="evidence" className="mt-0 space-y-4">
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <CoachLaneActionCard
              eyebrow="Latest review"
              title="Open your latest review"
              description={latestReviewLog ? `Read ${latestReviewLog.title} and your next step.` : "Your most recent leadership review will appear here."}
              accent="gold"
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open latest review"
                  dialogTitle={latestReviewLog ? `${latestReviewLog.title} · review` : "Latest review"}
                  dialogDescription="Review the leadership note, the review type, and your next step."
                  buttonClassName="w-full justify-between rounded-full border-[#F6C453]/60 bg-[#FCBC34] text-slate-950 shadow-[0_12px_32px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950"
                  renderContent={() => (
                    latestReviewLog ? (
                      <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200 capitalize">{latestReviewLog.reviewType.replaceAll("_", " ")}</Badge>
                        <p className="text-sm leading-6 text-slate-200">{latestReviewLog.notes}</p>
                        <div className="rounded-2xl border border-white/14 bg-slate-950 p-3 text-sm text-slate-100"><span className="font-medium text-white">Next step:</span> {latestReviewLog.nextStep}</div>
                      </div>
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-white/18 bg-slate-900/72 px-4 py-5 text-sm leading-6 text-slate-200">No leadership reviews recorded yet.</div>
                    )
                  )}
                />
              }
            />
            <CoachLaneActionCard
              eyebrow="Documentation"
              title="Browse documentation"
              description="See auto-generated completion evidence from your training and coaching."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open documentation"
                  dialogTitle="Documentation hub"
                  dialogDescription="Auto-generated evidence connected to your Service Foundations, Workflow Precision, and coaching history."
                  buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                  renderContent={() => (
                    <DocumentationFeed entries={data.documentationEntries} weeklyCoachingLogs={data.weeklyCoachingLogs} />
                  )}
                />
              }
            />
            {retrainingHistory.length ? (
              <CoachLaneActionCard
                eyebrow="Retraining"
                title="Past retraining history"
                description="Completed retraining and the evidence already recorded."
                action={
                  <CoachLaneDialogAction
                    buttonLabel="Open retraining history"
                    dialogTitle="Past retraining history"
                    dialogDescription="Completed retraining and the evidence already recorded."
                    buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                    renderContent={() => (
                      <RetrainingHistorySection title="Past retraining history" description="Completed retraining and the evidence already recorded." assignments={retrainingHistory} launchRole="learner" />
                    )}
                  />
                }
              />
            ) : null}
            <CoachLaneActionCard
              eyebrow="Support assets"
              title="Documentation assets"
              description="CHCG governance assets and tenant-authored documents that support your evidence."
              action={
                <CoachLaneDialogAction
                  buttonLabel="Open assets"
                  dialogTitle="Documentation support assets"
                  dialogDescription="Review evidence can be supported with both CHCG governance assets and tenant-authored documents."
                  buttonClassName="w-full justify-between rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                  renderContent={() => (
                    <WorkflowLibraryPanel title="Documentation support assets" description="Review evidence can be supported with both CHCG governance assets and tenant-authored documents." resources={data.workflowLibraryMix.documentationResources} />
                  )}
                />
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
            <div className="surface-dark space-y-2.5 rounded-[1.6rem] border border-white/10 p-3">
              {sortedReviewLogs.map((entry: any) => (
                <button key={entry.id} type="button" onClick={() => setSelectedReviewId(entry.id)} className={`w-full rounded-[1.15rem] border p-3 text-left transition ${effectiveReviewLog?.id === entry.id ? "border-cyan-300/40 bg-cyan-400/10 shadow-[0_14px_28px_rgba(8,145,178,0.14)]" : "border-white/12 bg-white/[0.07] hover:border-white/20 hover:bg-white/10"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-xs uppercase tracking-[0.22em] ${effectiveReviewLog?.id === entry.id ? "text-cyan-200" : "text-muted-dark"}`}>Review</p>
                      <h3 className="mt-1.5 text-base font-medium text-white">{entry.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-300">{entry.notes}</p>
                    </div>
                    <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200 capitalize">{entry.reviewType.replaceAll("_", " ")}</Badge>
                  </div>
                </button>
              ))}
              {!sortedReviewLogs.length ? (
                <div className="rounded-[1.45rem] border border-dashed border-white/12 bg-white/5 px-4 py-5 text-sm leading-6 text-slate-300">No leadership reviews recorded yet.</div>
              ) : null}
            </div>
            <PremiumCard>
              <CardHeader className="space-y-0 p-4 pb-2.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">Selected review</CardTitle>
                    <CardDescription className="mt-1 text-sm leading-5 text-slate-300">{effectiveReviewLog ? "Review the note and your next step, then open the full review." : "Select a review to read the note and next step."}</CardDescription>
                  </div>
                  {effectiveReviewLog ? <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200 capitalize">{effectiveReviewLog.reviewType.replaceAll("_", " ")}</Badge> : <Badge className="rounded-full border-white/12 bg-white/10 text-slate-200">Waiting for selection</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 p-4 pt-0">
                {effectiveReviewLog ? (
                  <>
                    <div className="rounded-[1.05rem] border border-white/14 bg-white/7 px-3.5 py-3 text-sm leading-5 text-slate-200"><span className="font-medium text-white">{effectiveReviewLog.title}:</span> {effectiveReviewLog.notes}</div>
                    <div className="rounded-[1.05rem] border border-white/14 bg-white/7 px-3.5 py-3 text-sm leading-5 text-slate-200"><span className="font-medium text-white">Next step:</span> {effectiveReviewLog.nextStep}</div>
                    <CoachLaneDialogAction
                      buttonLabel="Open review"
                      dialogTitle={`${effectiveReviewLog.title} · review`}
                      dialogDescription="Review the leadership note, the review type, and your next step."
                      buttonClassName="w-full justify-between rounded-full border-cyan-200/55 bg-cyan-300/18 text-white shadow-[0_12px_30px_rgba(34,211,238,0.14)] hover:bg-cyan-300/26 hover:text-white"
                      renderContent={() => (
                        <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                          <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200 capitalize">{effectiveReviewLog.reviewType.replaceAll("_", " ")}</Badge>
                          <p className="text-sm leading-6 text-slate-200">{effectiveReviewLog.notes}</p>
                          <div className="rounded-2xl border border-white/14 bg-slate-950 p-3 text-sm text-slate-100"><span className="font-medium text-white">Next step:</span> {effectiveReviewLog.nextStep}</div>
                        </div>
                      )}
                    />
                  </>
                ) : null}
              </CardContent>
            </PremiumCard>
          </div>
        </TabsContent>
    </WorkspaceShell>
  );
}

function AdminPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  const [preferredLabel, setPreferredLabel] = useState(data.branding.preferredLabel);
  const learnerUser = data.tenantUsers.find((user: any) => user.role === "learner") ?? data.admin;
  const managerUser = data.tenantUsers.find((user: any) => user.role === "manager") ?? data.admin;
  const executiveUser = data.tenantUsers.find((user: any) => user.role === "executive") ?? data.admin;
  const [accent, setAccent] = useState(data.branding.accent);
  const [logoMark, setLogoMark] = useState(data.branding.logoMark);
  const [heroStatement, setHeroStatement] = useState(data.branding.heroStatement);
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleDescription, setCustomRoleDescription] = useState("");
  const [customRoleBase, setCustomRoleBase] = useState<DemoRole>("manager");
  const [activeAdminMode, setActiveAdminMode] = useState<"overview" | "branding" | "roles" | "authoring" | "governance">("overview");
  const [selectedTenantUserId, setSelectedTenantUserId] = useState<string>(data.tenantUsers[0]?.id ?? data.admin.id);
  const updateBranding = trpc.demo.previewUpdateBranding.useMutation({
    onSuccess: () => {
      onUpdated?.();
    },
  });
  const createCustomRole = trpc.demo.secureCreateTenantCustomRole.useMutation({
    onSuccess: () => {
      setCustomRoleName("");
      setCustomRoleDescription("");
      setCustomRoleBase("manager");
      onUpdated?.();
    },
  });

  useEffect(() => {
    setPreferredLabel(data.branding.preferredLabel);
    setAccent(data.branding.accent);
    setLogoMark(data.branding.logoMark);
    setHeroStatement(data.branding.heroStatement);
  }, [data.branding.accent, data.branding.heroStatement, data.branding.logoMark, data.branding.preferredLabel]);

  const selectedTenantUser = data.tenantUsers.find((user: any) => user.id === selectedTenantUserId) ?? data.tenantUsers[0] ?? data.admin;
  const blendedGovernanceAssets = [
    ...data.workflowLibraryMix.journeyResources,
    ...data.workflowLibraryMix.interventionResources,
    ...data.workflowLibraryMix.documentationResources,
  ].filter((asset: any, index: number, collection: any[]) => collection.findIndex((candidate: any) => candidate.id === asset.id) === index).slice(0, 4);

  const openAdminMode = (mode: "overview" | "branding" | "roles" | "governance", sectionId: string) => {
    setActiveAdminMode(mode);
    window.setTimeout(() => revealWorkspaceSection(sectionId), 20);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(310px,0.92fr)]">
        <PremiumCard className="overflow-hidden">
          <CardContent className="space-y-4 p-5">
            <div className="rounded-[1.6rem] border border-white/12 bg-white/6 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-cyan-200/25 bg-cyan-300/16 text-cyan-50">Client control</Badge>
                <Badge variant="outline" className="rounded-full border-white/14 bg-slate-950/30 text-slate-50">{data.tenant.industry}</Badge>
                <Badge variant="outline" className="rounded-full border-white/14 bg-slate-950/30 text-slate-50">{data.branding.dataIsolation}</Badge>
              </div>
              <div className="mt-4 max-w-4xl space-y-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Tenant operating queue</p>
                <h3 className="text-[1.9rem] font-semibold tracking-tight text-white">{data.branding.preferredLabel}</h3>
                <p className="text-sm leading-7 text-slate-100">Use one control plane for branding, role setup, governance review, and documentation follow-up so the admin team can finish setup without jumping between showcase panels.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-white/12 bg-slate-950/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Tenant roster</p>
                <p className="mt-2 text-xl font-semibold text-white">{data.tenantUsers.length}</p>
                <p className="mt-1 text-xs text-slate-300">Role-scoped identities in the active tenant</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/12 bg-slate-950/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Custom roles</p>
                <p className="mt-2 text-xl font-semibold text-white">{(data.customRoles ?? []).length}</p>
                <p className="mt-1 text-xs text-slate-300">Tenant-specific permission overlays</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/12 bg-slate-950/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Governance signals</p>
                <p className="mt-2 text-xl font-semibold text-white">{data.documentationEntries.length}</p>
                <p className="mt-1 text-xs text-slate-300">Documentation events ready for audit</p>
              </div>
            </div>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-[1.45rem] border border-white/12 bg-white/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Admin priority</p>
                <h4 className="mt-2 text-lg font-semibold text-white">Keep tenant branding, permissions, and governance aligned.</h4>
                <p className="mt-2 text-sm leading-6 text-slate-200">The highest-value work is setup clarity: confirm the tenant label, role architecture, and audit evidence before expanding into longer history views.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <button type="button" onClick={() => openAdminMode("branding", "admin-branding-section")} className="guide-card min-w-0 p-4 text-left transition hover:-translate-y-0.5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recommended next</p>
                  <p className="mt-2 text-base font-semibold text-white">Refresh white-label controls</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Adjust the tenant label, accent, logo mark, and entry statement without leaving this control plane.</p>
                </button>
                <button type="button" onClick={() => openAdminMode("governance", "admin-governance-section")} className="guide-card min-w-0 p-4 text-left transition hover:-translate-y-0.5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Audit lane</p>
                  <p className="mt-2 text-base font-semibold text-white">Review coaching and documentation evidence</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Open the proof trail and weekly governance artifacts before you drill into the full timeline.</p>
                </button>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <div className="command-band px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4A6373]">Control cues</p>
              <p className="mt-2 text-sm leading-6 text-[#4A6373]">Use one mode at a time so tenant admins never have to scroll through branding, permissions, coaching, and evidence all at once.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.configuration.slice(0, 4).map((item: any) => (
                <div key={item.key} className="rounded-[1.35rem] border border-[#1B303C]/10 bg-white/70 px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#4A6373]">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-[#1B303C]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Tenant" value={data.tenant.name} supporting={data.tenant.industry} icon={<Building2 className="h-4 w-4" />} />
        <MetricCard label="Role users" value={`${data.tenantUsers.length}`} supporting="Strictly tenant-scoped account inventory" icon={<Users2 className="h-4 w-4" />} />
        <MetricCard label="Brand accent" value={data.branding.accent} supporting={data.branding.preferredLabel} icon={<Sparkles className="h-4 w-4" />} />
        <MetricCard label="Isolation mode" value="Strict" supporting={data.branding.dataIsolation} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <Tabs value={activeAdminMode} onValueChange={(value) => setActiveAdminMode(value as "overview" | "branding" | "roles" | "authoring" | "governance")} className="space-y-4">
        <div className="command-band px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4A6373]">Client control modes</p>
              <p className="mt-2 text-sm leading-6 text-[#4A6373]">Switch between overview, branding, role architecture, and governance instead of scrolling through every admin surface sequentially.</p>
            </div>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.4rem] border border-[#1B303C]/10 bg-white/70 p-2 xl:w-auto">
              <TabsTrigger value="overview" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Overview</TabsTrigger>
              <TabsTrigger value="branding" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Branding</TabsTrigger>
              <TabsTrigger value="roles" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Roles</TabsTrigger>
              <TabsTrigger value="authoring" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Authoring</TabsTrigger>
              <TabsTrigger value="governance" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Governance</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="mt-0 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PremiumCard id="admin-overview-section">
            <CardHeader>
              <CardTitle className="text-white">Tenant operating snapshot</CardTitle>
              <CardDescription className="text-slate-400">Force-fed information for the three admin decisions that matter most right now.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="guide-card p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Identity status</p>
                <p className="mt-2 text-lg font-semibold text-white">{data.branding.preferredLabel}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Accent {data.branding.accent} and logo mark {data.branding.logoMark} are active across the tenant preview.</p>
              </div>
              <div className="guide-card p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Role architecture</p>
                <p className="mt-2 text-lg font-semibold text-white">{(data.customRoles ?? []).length > 0 ? `${(data.customRoles ?? []).length} custom lane${(data.customRoles ?? []).length === 1 ? "" : "s"}` : "Core permission lanes only"}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Every tenant role still maps to a predictable CHCG permission lane.</p>
              </div>
              <div className="guide-card p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Governance proof</p>
                <p className="mt-2 text-lg font-semibold text-white">{data.weeklyCoachingLogs.length} coaching records</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Tenant admins can audit learner take-aways, recipient routing, and follow-up completeness from one mode.</p>
              </div>
              <div className="guide-card p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Library blend</p>
                <p className="mt-2 text-lg font-semibold text-white">{blendedGovernanceAssets.length} curated governance assets</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">CHCG assets and tenant uploads stay visibly distinct while feeding the same workflows.</p>
              </div>
            </CardContent>
          </PremiumCard>
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Action launcher</CardTitle>
              <CardDescription className="text-slate-400">Jump directly into the next admin flow without navigating a long page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: "Update white-label identity", description: "Refine brand tone, logo mark, and accent colors.", mode: "branding", sectionId: "admin-branding-section" },
                { title: "Add or review custom roles", description: "Keep permission lanes clear while supporting tenant-specific job families.", mode: "roles", sectionId: "admin-roles-section" },
                { title: "Audit governance evidence", description: "Review coaching logs, review records, and documentation feed side by side.", mode: "governance", sectionId: "admin-governance-section" },
              ].map((item) => (
                <button key={item.title} type="button" onClick={() => openAdminMode(item.mode as any, item.sectionId)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10">
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </CardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="branding" className="mt-0 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]" id="admin-branding-section">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">White-label tenant identity</CardTitle>
              <CardDescription className="text-slate-400">Client-specific identity and enterprise presentation controls in one compact editor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 text-lg font-semibold text-white" style={{ backgroundColor: `${accent}22` }}>
                    {logoMark}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live preview</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">{preferredLabel}</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{heroStatement}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Preferred label</span>
                  <input value={preferredLabel} onChange={(event) => setPreferredLabel(event.target.value)} className={FORM_INPUT_SURFACE_CLASS} />
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Accent</span>
                  <input value={accent} onChange={(event) => setAccent(event.target.value)} className={FORM_INPUT_SURFACE_CLASS} />
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Logo mark</span>
                  <input value={logoMark} onChange={(event) => setLogoMark(event.target.value.slice(0, 3).toUpperCase())} className={FORM_INPUT_SURFACE_CLASS} />
                </label>
                <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                  <span>Hero statement</span>
                  <textarea value={heroStatement} onChange={(event) => setHeroStatement(event.target.value)} className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={() => updateBranding.mutate({ tenantId: data.tenant.id, preferredLabel, accent, logoMark, heroStatement })} disabled={updateBranding.isPending}>
                  {updateBranding.isPending ? "Applying..." : "Apply branding"}
                </Button>
                {updateBranding.isSuccess ? <span className="text-sm text-emerald-300">Branding updated for this tenant.</span> : null}
              </div>
            </CardContent>
          </PremiumCard>
          <div className="space-y-6">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Identity guardrails</CardTitle>
                <CardDescription className="text-slate-400">Keep the tenant presentation polished without diluting the underlying CHCG method.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.configuration.map((item: any) => (
                  <div key={item.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    <span className="text-slate-300">{item.label}</span>
                    <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-300">{item.value}</Badge>
                  </div>
                ))}
              </CardContent>
            </PremiumCard>
            <WorkflowLibraryPanel title="Blended workflow library governance" description="Client admins can see how tenant-uploaded materials are mixed with CHCG assets across journeys, interventions, and documentation support." resources={blendedGovernanceAssets} />
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-0 grid gap-6 xl:grid-cols-[0.94fr_1.06fr]" id="admin-roles-section">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Tenant user roster</CardTitle>
              <CardDescription className="text-slate-400">Select one user to inspect role context instead of scanning a full stacked roster.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {data.tenantUsers.map((user: any) => (
                  <button key={user.id} type="button" onClick={() => setSelectedTenantUserId(user.id)} className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${selectedTenantUser.id === user.id ? "border-cyan-400/30 bg-cyan-400/12" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    <div>
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-sm text-slate-400">{user.title} · {user.team}</p>
                    </div>
                    <Badge className="rounded-full border-white/10 bg-white/8 capitalize text-slate-200">{user.role.replace("_", " ")}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </PremiumCard>
          <div className="space-y-6">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Selected role context</CardTitle>
                <CardDescription className="text-slate-400">Show the user’s current lane, team context, and the next governance action at a glance.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="guide-card p-4 md:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Selected user</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedTenantUser.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{selectedTenantUser.title} on {selectedTenantUser.team}</p>
                </div>
                <div className="guide-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Permission lane</p>
                  <p className="mt-2 text-lg font-semibold text-white">{getRoleLabel(selectedTenantUser.role)}</p>
                </div>
                <div className="guide-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Admin cue</p>
                  <p className="mt-2 text-lg font-semibold text-white">Verify role fit before routing new content or governance actions.</p>
                </div>
              </CardContent>
            </PremiumCard>
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Custom role definitions</CardTitle>
                <CardDescription className="text-slate-300/80">Add tenant-specific job families while still mapping each role to one of the core CHCG permission lanes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Role name</span>
                    <input value={customRoleName} onChange={(event) => setCustomRoleName(event.target.value)} placeholder="Example: Workflow Quality Lead" className={FORM_INPUT_SURFACE_CLASS} />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200">
                    <span>Base permission lane</span>
                    <Select value={customRoleBase} onValueChange={(value) => setCustomRoleBase(value as DemoRole)}>
                      <SelectTrigger className="border-white/12 bg-slate-950 text-slate-50 [color-scheme:dark]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="executive">Executive</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="learner">Learner</SelectItem>
                        <SelectItem value="client_admin">Client admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-200 md:col-span-2">
                    <span>Role description</span>
                    <textarea value={customRoleDescription} onChange={(event) => setCustomRoleDescription(event.target.value)} rows={4} placeholder="Describe the tenant-specific responsibilities this custom role should cover." className={`min-h-[110px] ${FORM_INPUT_SURFACE_CLASS}`} />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100" disabled={createCustomRole.isPending || customRoleName.trim().length < 3 || customRoleDescription.trim().length < 12} onClick={() => createCustomRole.mutate({ tenantId: data.tenant.id, name: customRoleName.trim(), description: customRoleDescription.trim(), inheritsFrom: customRoleBase })}>
                    {createCustomRole.isPending ? "Saving..." : "Add custom role"}
                  </Button>
                  <span className="text-sm text-slate-300">Every custom role stays anchored to a core permission lane so role-scoped views and governance rules remain predictable.</span>
                </div>
                <div className="space-y-3">
                  {(data.customRoles ?? []).map((role: any) => (
                    <div key={role.id} className="rounded-2xl border border-white/12 bg-slate-950/78 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{role.name}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-200">{role.description}</p>
                        </div>
                        <Badge className="rounded-full border-white/12 bg-white/8 text-slate-100">Mapped to {getRoleLabel(role.inheritsFrom)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </PremiumCard>
          </div>
        </TabsContent>

        <TabsContent value="authoring" className="mt-0 space-y-6" id="admin-authoring-section">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Customize quiz checkpoints for {data.tenant.name}</CardTitle>
              <CardDescription className="text-slate-300">
                Edit, add, or hide apply-checkpoint questions for this client only. CHCG core content stays untouched, and your changes surface live in the training player.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentAuthoringPanel scope="tenant" tenantId={data.tenant.id} />
            </CardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="governance" className="mt-0 space-y-6" id="admin-governance-section">
          <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
            <div className="space-y-6">
              <WeeklyCoachingLogComposer
                tenantId={data.tenant.id}
                subjectUserId={learnerUser.id}
                coachRole="client_admin"
                title="Write a structured weekly coaching log as client admin"
                employeeName={learnerUser.name}
                employeeEmail={learnerUser.email}
                coachName={data.admin.name}
                coachEmail={data.admin.email}
                supervisorName={managerUser.name}
                supervisorEmail={managerUser.email}
                managerOfSupervisorEmail={executiveUser.email}
                onCreated={onUpdated}
              />
              <ReviewLogComposer
                tenantId={data.tenant.id}
                subjectUserId={data.tenantUsers.find((user: any) => user.role === "learner")?.id ?? data.admin.id}
                authorRole="client_admin"
                title="Write coach or calibration documentation"
                onCreated={onUpdated}
              />
            </div>
            <div className="space-y-6">
              <WeeklyCoachingLogTimeline
                title="Tenant weekly coaching governance"
                description="Client admins can audit who was coached, who would receive the simulated copies, and whether learner take-aways have been written back into each record."
                tenantId={data.tenant.id}
                logs={data.weeklyCoachingLogs}
                allowLogEditing
                onUpdated={onUpdated}
              />
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Documentation governance</CardTitle>
                  <CardDescription className="text-slate-400">Review the generated evidence trail and authored coaching documentation across Service Foundations, Workflow Precision, Data-Led Leadership, and Performance Leadership activity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DocumentationFeed entries={data.documentationEntries} weeklyCoachingLogs={data.weeklyCoachingLogs} />
                  <div className="space-y-3">
                    {data.reviewLogs.map((entry: any) => (
                      <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-medium text-white">{entry.title}</h4>
                            <p className="mt-2 text-sm text-slate-300">{entry.notes}</p>
                          </div>
                          <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200 capitalize">{entry.reviewType.replaceAll("_", " ")}</Badge>
                        </div>
                        <p className="mt-3 text-sm text-slate-400">Next step: {entry.nextStep}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </PremiumCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

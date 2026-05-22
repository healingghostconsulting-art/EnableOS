import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
  ChevronRight,
  CircleAlert,
  Clock3,
  Gauge,
  Layers3,
  Mic,
  PauseCircle,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Volume2,
  Users2,
} from "lucide-react";
import type { DemoRole } from "../../../server/demoPlatform";
import { getTrainingPresentation } from "../../../shared/trainingContent";
import { groupAssetsByTargetDemographic } from "../../../shared/libraryOrganization";
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

const TRAINING_PROGRESS_STORAGE_PREFIX = "chcg-enableos-training-progress";

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
    title: "Executive command view",
    route: "/executive",
    eyebrow: "Executive",
    subtitle: "Measure ROI, team readiness, and intervention impact across the tenant.",
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
}) {
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
  Reporting: {
    focus: "Trend analysis",
    next: "Move from the headline chart to the outlier, then open the detailed proof surface on demand.",
    reward: "Evidence ready",
    guide: "This workspace should feel like an analytics studio with a clear narrative, not a long static report.",
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
    next: "Show the next step, recent win, and current streak before revealing optional history or side content.",
    reward: "Progress celebrated",
    guide: "Learners should feel guided and rewarded, with one clear mission and visible progress cues.",
  },
  Training: {
    focus: "Checkpoint flow",
    next: "Keep the current lesson stage dominant and move supporting materials into secondary reveal patterns.",
    reward: "Milestones unlocked",
    guide: "Training should feel cinematic and progressive, with clean stage changes and meaningful completion moments.",
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
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const narrative = resolveSectionMissionNarrative(eyebrow, title);

  if (compact) {
      return (
      <div className="workspace-stack">
        <div className="rounded-[1.75rem] border border-[#1B303C]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,248,250,0.92))] px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="outline" className="mission-chip rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]">
                  {eyebrow}
                </Badge>
                <span className="command-pill px-3 py-1 text-[11px] font-medium text-[#4A6373]">{narrative.focus}</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7E8A]">{title}</p>
                <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-[#1B303C] sm:text-[1.55rem]">{description}</h1>
                <p className="max-w-3xl text-sm leading-6 text-[#4A6373]">{narrative.next}</p>
              </div>
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Guide cue</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[#8AA4B4]">Mascot moment</p>
                </div>
              </div>
              <p className="mt-3 text-[15px] font-semibold leading-6 text-[#1B303C]">{narrative.guide}</p>
              <p className="mt-3 text-sm leading-6 text-[#4A6373]">Reward state: {narrative.reward}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="trophy-card px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B7E8A]">Focus</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#1B303C]">{narrative.focus}</p>
              </div>
              <div className="trophy-card px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B7E8A]">Next action</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#1B303C]">{narrative.next}</p>
              </div>
              <div className="trophy-card px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B7E8A]">Reward</p>
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

function DocumentationFeed({ entries }: { entries: any[] }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm text-slate-300">
        No documentation feed entries are available for this view yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry: any, index: number) => (
        <div key={entry.id ?? `${entry.title ?? "documentation"}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{entry.title ?? entry.label ?? `Documentation item ${index + 1}`}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{entry.owner ?? entry.status ?? "Documentation stream"}</p>
            </div>
            {entry.updatedAt ? <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{String(entry.updatedAt)}</Badge> : null}
          </div>
          {entry.summary ? <p className="mt-3 text-sm leading-6 text-slate-300">{entry.summary}</p> : null}
        </div>
      ))}
    </div>
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
      title: activeRetrainingAssignment.moduleTitle,
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
    <PremiumCard className="h-full">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-300/76">{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">{children}</CardContent>
    </PremiumCard>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = value === "completed"
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
}: {
  title: string;
  description: string;
  assignments: any[];
  emptyLabel?: string;
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
          <Badge className="rounded-full border-white/10 bg-white/8 px-3 py-1 text-slate-200">Override enabled</Badge>
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

function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-[#1B303C]">
      <div className="container py-6 sm:py-8 xl:py-10">
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

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
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
      <div className="grid gap-4">
        {assessment.questions.map((question: any, questionIndex: number) => {
          const answerValue = answers[question.id] ?? "";
          const questionCorrect = isAssessmentQuestionCorrect(question, answerValue);
          const questionOptions = question.options ?? [];

          return (
            <div key={question.id} className={`min-w-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/60 ${compact ? "p-4" : "p-5"}`}>
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
                    <p className={`text-sm ${questionCorrect ? "text-emerald-300" : "text-rose-300"}`}>
                      {questionCorrect ? question.successFeedback : question.failureFeedback}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {questionOptions.map((option: any) => {
                    const selected = answerValue === option.id;
                    const isCorrect = option.id === question.correctOptionId;
                    const stateClass = submitted && selected
                      ? isCorrect
                        ? "border-emerald-400/40 bg-emerald-400/10"
                        : "border-rose-400/40 bg-rose-400/10"
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
          <div className={`mt-4 rounded-2xl border p-4 ${resultStyles.containerClass}`}>
            <p className={`text-sm font-medium ${resultStyles.scoreClass}`}>Score: {score}/{assessment.questions.length}</p>
            <p className={`mt-2 text-sm leading-6 ${resultStyles.bodyClass}`}>
              {passed ? assessment.passMessage : assessment.failMessage}
            </p>
          </div>
        ) : null}
      </div>
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
  if (!trigger || !assessment) {
    return null;
  }

  const questions = assessment.questions ?? [];
  if (!questions.length) {
    return null;
  }

  const boundedQuestionIndex = Math.max(0, Math.min(activeQuestionIndex, Math.max(questions.length - 1, 0)));
  const activeQuestion = questions[boundedQuestionIndex];
  const activeAnswerValue = activeQuestion ? answers[activeQuestion.id] ?? "" : "";
  const currentQuestionAnswered = activeQuestion ? hasAssessmentAnswer(activeQuestion, { [activeQuestion.id]: activeAnswerValue }) : false;
  const isFinalQuiz = trigger.assessmentKey === "finalQuiz";
  const title = isFinalQuiz ? "Final Quiz" : assessment.title;
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
            <div className="mt-8 rounded-[1.6rem] border border-[#1f2b45] bg-[#26324a] px-5 py-5 shadow-[0_16px_35px_rgba(24,35,57,0.2)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#c5d0ea]">Active prompt</p>
              <p className="mt-3 text-base font-medium leading-7 text-white">{activeQuestion.prompt}</p>
            </div>
            <div className="rounded-b-[1.6rem] border-x border-b border-[#c9d4af] bg-[#f8fbf1] px-5 py-6 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:px-6">
              {activeQuestion.type === "short_answer" ? (
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
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-[#5d694d]">{submitted ? (passed ? "This assessment is complete. Return to the lesson when you are ready to continue." : "Review the feedback below, then retry the quiz to clear this checkpoint.") : "Answer the active question, then submit to keep the learner moving through the lesson."}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {submitted ? (
                    passed ? (
                      <Button type="button" onClick={onReturn} className="rounded-full bg-[#2b3750] px-5 text-white hover:bg-[#222c40]">
                        Continue lesson
                      </Button>
                    ) : (
                      <Button type="button" onClick={onRetry} className="rounded-full bg-[#2b3750] px-5 text-white hover:bg-[#222c40]">
                        Retry quiz
                      </Button>
                    )
                  ) : (
                    <Button type="button" onClick={onSubmit} disabled={!currentQuestionAnswered || disabled} className="rounded-full bg-[#2b3750] px-5 text-white hover:bg-[#222c40] disabled:bg-[#b9c4a3] disabled:text-[#f6faec]">
                      Submit response
                    </Button>
                  )}
                </div>
              </div>
              {submitted ? (
                <div className={`mt-6 rounded-[1.25rem] border px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] ${passed ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-rose-600" />}
                      <span className={passed ? "text-emerald-700" : "text-rose-700"}>{passed ? "Checkpoint cleared" : "Retry required"}</span>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>Score {score}/{questions.length}</div>
                  </div>
                  <p className={`mt-3 text-sm leading-6 ${passed ? "text-emerald-700" : "text-rose-700"}`}>{passed ? assessment.passMessage : assessment.failMessage}</p>
                  <div className={`mt-4 rounded-[1rem] px-4 py-3 text-sm leading-6 ${passed ? "bg-white/70 text-emerald-800" : "bg-white/70 text-rose-800"}`}>
                    {passed ? "The learner can now return to the lesson with this result recorded as part of the guided course flow." : "Review the feedback, update the answer, and retry inside the same assessment surface without leaving the lesson context."}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingView() {
  const landing = trpc.demo.landing.useQuery();
  const viewer = trpc.auth.me.useQuery();
  const viewerAccess = trpc.demo.viewerAccess.useQuery(undefined, { enabled: Boolean(viewer.data) });
  const featuredTenants = landing.data?.tenants ?? [];
  const [landingSearchQuery, setLandingSearchQuery] = useState("");
  const [missionHubMode, setMissionHubMode] = useState<"overview" | "workspaces" | "tracks">("overview");
  const viewerHomeHref = viewerAccess.data?.grant.role === "platform_admin"
    ? "/chcg-admin"
    : viewerAccess.data?.grant.role === "client_admin"
      ? "/admin"
      : viewerAccess.data?.grant.role === "executive"
        ? "/executive"
        : viewerAccess.data?.grant.role === "manager"
          ? "/manager"
          : viewerAccess.data?.grant.role === "coach"
            ? "/coach"
            : "/learner";
  const landingTrainingRecords = useMemo(
    () => [
      {
        title: "Soft Skills & Customer/Patient Service Foundation",
        subtitle: "Customer service, active listening, empathy, de-escalation, and professionalism.",
        keywords: ["learner", "service foundations", "soft skills", "communication"],
        href: "/library?assetId=library-service-foundations-core&assetTitle=Soft%20Skills%20%26%20Customer%2FPatient%20Service%20Foundation&role=learner",
        cta: "Review module detail",
      },
      {
        title: "Quality Assurance Essentials",
        subtitle: "Verification, QA discipline, documentation accuracy, and workflow execution.",
        keywords: ["manager", "workflow precision", "qa", "documentation"],
        href: "/library?assetId=library-workflow-precision-kit&assetTitle=Quality%20Assurance%20Essentials&role=manager",
        cta: "Open QA detail",
      },
      {
        title: "Unlocking the Power of Data",
        subtitle: "KPI interpretation, trend review, and decision-quality leadership.",
        keywords: ["executive", "leadership", "data", "kpi"],
        href: "/library?assetTitle=Unlocking%20the%20Power%20of%20Data&role=executive",
        cta: "Open leadership detail",
      },
      {
        title: "Real-time Coaching",
        subtitle: "In-the-moment coaching responses, reinforcement, and follow-through cues.",
        keywords: ["coach", "coaching", "feedback", "leadership"],
        href: buildTrainingLaunchPath({ role: "coach", journeyId: "journey-coach-practice-atlas", moduleId: "mod-rtc-1" }),
        cta: "Open coaching player",
      },
      {
        title: "Utilizing Performance Management to Maximize Results",
        subtitle: "Calibration, improvement planning, and performance accountability rhythms.",
        keywords: ["manager", "performance", "calibration", "reviews"],
        href: "/library?assetId=library-performance-governance&assetTitle=Utilizing%20Performance%20Management%20to%20Maximize%20Results&role=manager",
        cta: "Open performance detail",
      },
      {
        title: "Gamification for Remote Teams: Engaging and Empowering Leaders",
        subtitle: "Recognition rhythms, gamification, and hybrid-team motivation design.",
        keywords: ["manager", "engagement", "recognition", "remote teams"],
        href: "/library?assetId=library-gamified-engagement&assetTitle=Gamification%20for%20Remote%20Teams%3A%20Engaging%20and%20Empowering%20Leaders&role=manager",
        cta: "Open engagement detail",
      },
      ...Object.values(roleMeta).map((item) => ({
        title: item.title,
        subtitle: item.subtitle,
        keywords: [item.eyebrow, item.title],
        href: item.route,
        cta: `Open ${item.eyebrow} workspace`,
      })),
    ],
    [],
  );
  const landingSearchResults = useMemo(
    () => filterTrainingRecords(landingTrainingRecords, landingSearchQuery).slice(0, 6),
    [landingSearchQuery, landingTrainingRecords],
  );
  const landingMetricHighlights = landing.data?.featuredMetrics ?? [
    { label: "Ready to launch", value: 12 },
    { label: "Due this week", value: 4 },
    { label: "Avg. progress", value: "61%" },
    { label: "In coaching", value: 9 },
  ];
  const compactMissionQueue = landingSearchQuery.trim() ? landingSearchResults : landingTrainingRecords.slice(0, 6);
  const compactWorkspaceCards = featuredTenants.slice(0, 4).map((tenant: any, index) => ({
    ...tenant,
    href: viewer.data
      ? viewerHomeHref
      : index === 0
        ? "/executive"
        : index === 1
          ? "/manager"
          : index === 2
            ? "/coach"
            : "/admin",
  }));

  return (
    <Surface>
      <div className="workspace-stack">
        <div className="glass-panel overflow-hidden rounded-[2rem] border border-[#1B303C]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,248,250,0.94))] shadow-[0_24px_70px_rgba(27,48,60,0.08)]">
          <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:px-6 lg:py-6 xl:px-7 xl:py-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="outline" className="mission-chip rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.28em]">
                  EnableOS mission hub
                </Badge>
                <span className="command-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#4A6373]">Primary queue</span>
                <span className="command-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#4A6373]">Workspace launch</span>
              </div>
              <div className="max-w-4xl space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Operations home</p>
                <h1 className="max-w-[16ch] text-[2rem] font-semibold tracking-tight text-[#1B303C] md:text-[2.45rem] md:leading-[1.04] xl:text-[2.8rem]">
                  Start with the next assigned action.
                </h1>
                <p className="max-w-3xl text-[0.95rem] leading-6 text-[#4A6373]">
                  Search, resume, and launch from one operational console so users can move into training, coaching, and workspace tasks without crossing showcase-style hero content first.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                <label className="block min-w-0 space-y-2 text-sm text-[#1B303C]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Search mission hub</span>
                  <div className="flex items-center gap-3 rounded-[1.15rem] border border-[#1B303C]/10 bg-white px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                    <Search className="h-4 w-4 text-[#4A6373]" />
                    <input
                      value={landingSearchQuery}
                      onChange={(event) => setLandingSearchQuery(event.target.value)}
                      placeholder="Search data, coaching, QA, learner, manager..."
                      className="w-full bg-transparent text-sm text-[#1B303C] outline-none placeholder:text-[#6B7E8A]"
                    />
                  </div>
                </label>
                <Link href={viewer.data ? viewerHomeHref : buildTrainingLaunchPath({ role: "learner", journeyId: "journey-service-foundations", moduleId: "mod-sf-1", freshStart: true })}>
                  <Button className="h-11 rounded-[1.05rem] bg-[#1B303C] px-5 text-white hover:bg-[#243f4d]">
                    {viewer.data ? "Resume my mission" : "Launch next"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href={buildTrainingLaunchPath({ role: "learner", journeyId: "journey-service-foundations", moduleId: "mod-sf-1" })}>
                  <Button variant="outline" className="h-11 rounded-[1.05rem] border-[#1B303C]/12 bg-white px-5 text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]">
                    Preview player
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {landingMetricHighlights.map((item: any) => (
                <div key={item.label} className="rounded-[1.15rem] border border-[#1B303C]/10 bg-white px-4 py-3.5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B7E8A]">{item.label}</p>
                  <p className="mt-2 text-[1.45rem] font-semibold tracking-tight text-[#1B303C]">{String(item.value)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 border-t border-[#1B303C]/8 px-5 py-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] lg:px-6 lg:py-6 xl:px-7 xl:py-7">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Training queue</p>
                  <p className="mt-1 text-sm text-[#4A6373]">Dense rows keep titles, status, runtime, and next action in the same frame.</p>
                </div>
                <Badge className="rounded-full border-[#1B303C]/10 bg-white text-[#1B303C]">{compactMissionQueue.length} visible</Badge>
              </div>
              <div className="space-y-2.5">
                {compactMissionQueue.length > 0 ? compactMissionQueue.map((record, index) => (
                  <Link key={`${record.href}-${record.title}`} href={record.href}>
                    <button type="button" className="flex w-full items-center justify-between gap-4 rounded-[1.2rem] border border-[#1B303C]/10 bg-white/85 px-4 py-3 text-left shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#FCBC34]/32 hover:bg-white">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">{index + 1}</span>
                          <Badge variant="outline" className="rounded-full border-[#1B303C]/10 bg-[#F7F8FA] text-[#4A6373]">{record.keywords[0]}</Badge>
                        </div>
                        <p className="mt-2 line-clamp-1 text-sm font-semibold text-[#1B303C]">{record.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#4A6373]">{record.subtitle}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[#1B303C]">{index % 3 === 0 ? "61% complete" : index % 3 === 1 ? "Start now" : "Review"}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#6B7E8A]">{record.cta}</p>
                      </div>
                    </button>
                  </Link>
                )) : (
                  <div className="rounded-[1.2rem] border border-dashed border-[#1B303C]/14 bg-white/70 px-4 py-5 text-sm text-[#4A6373]">
                    No matching mission yet. Try a broader keyword to repopulate the queue.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Workspace launchers</p>
                <p className="mt-1 text-sm text-[#4A6373]">Keep tenant context and the primary action in short cards instead of long previews.</p>
              </div>
              <div className="grid gap-2.5">
                {compactWorkspaceCards.length > 0 ? compactWorkspaceCards.map((tenant: any) => (
                  <Link key={tenant.id} href={tenant.href}>
                    <button type="button" className="w-full rounded-[1.2rem] border border-[#1B303C]/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.9),rgba(245,247,250,0.94))] px-4 py-3 text-left shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#FCBC34]/32">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-semibold text-[#1B303C]">{tenant.name}</p>
                          <p className="mt-1 line-clamp-1 text-xs uppercase tracking-[0.18em] text-[#6B7E8A]">{tenant.industry}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#1B303C]" />
                      </div>
                    </button>
                  </Link>
                )) : (
                  <div className="rounded-[1.2rem] border border-dashed border-[#1B303C]/14 bg-white/70 px-4 py-5 text-sm text-[#4A6373]">
                    Tenant launchers will appear here once landing data is available.
                  </div>
                )}
              </div>
              <div className="rounded-[1.3rem] border border-[#FCBC34]/22 bg-[linear-gradient(160deg,rgba(255,251,240,0.92),rgba(255,255,255,0.95))] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Access model</p>
                <p className="mt-2 text-sm leading-6 text-[#4A6373]">
                  {viewerAccess.data
                    ? `Signed in to ${viewerAccess.data.tenant.name}. This account only sees the workspaces and training lanes granted to ${viewerAccess.data.permittedRoles.join(", ")}.`
                    : "After sign-in, users land directly in their assigned client context instead of seeing a cross-client training picker."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={missionHubMode} onValueChange={(value) => setMissionHubMode(value as "overview" | "workspaces" | "tracks")} className="space-y-4">
          <div className="command-band px-4 py-3.5 md:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Compact mission navigation</p>
                <p className="mt-1 text-sm text-[#4A6373]">Each mode is denser and shorter so users can compare, choose, and move without losing context.</p>
              </div>
              <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1.25rem] border border-[#1B303C]/10 bg-white/75 p-1.5">
                <TabsTrigger value="overview" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Command</TabsTrigger>
                <TabsTrigger value="workspaces" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Workspaces</TabsTrigger>
                <TabsTrigger value="tracks" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Tracks</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(320px,0.94fr)]">
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Live queue" value="6 visible" supporting="Compressed browse rows show status, runtime, and next action in one scan path." icon={<Layers3 className="h-5 w-5 text-cyan-300" />} />
                <MetricCard label="Mission pace" value="1-screen launch" supporting="Search and launch controls stay inside the first shell rather than below long narrative sections." icon={<Gauge className="h-5 w-5 text-cyan-300" />} />
                <MetricCard label="Training entry" value="Focused player" supporting="Course detail and player launch now behave as a contained step instead of a long page continuation." icon={<BookOpen className="h-5 w-5 text-cyan-300" />} />
              </div>
              <div className="guide-card px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Why this is faster</p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-[#4A6373]">
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#1B303C]" /><span>Actionable modules appear immediately instead of after stacked hero content.</span></div>
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#1B303C]" /><span>Search, browse, and resume controls live in the same compact frame.</span></div>
                  <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#1B303C]" /><span>Training and workspace entry points are visible without forcing another full-screen detour.</span></div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="workspaces" className="mt-0">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Object.values(roleMeta).map((item) => (
                <Link key={item.route} href={item.route}>
                  <button type="button" className="w-full rounded-[1.35rem] border border-[#1B303C]/10 bg-white/85 px-4 py-4 text-left shadow-[0_16px_38px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#FCBC34]/30">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">{item.eyebrow}</p>
                    <p className="mt-2 text-base font-semibold text-[#1B303C]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#4A6373]">{item.subtitle}</p>
                  </button>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tracks" className="mt-0">
            <div className="grid gap-3">
              {landingTrainingRecords.slice(0, 6).map((record) => (
                <Link key={`track-${record.href}-${record.title}`} href={record.href}>
                  <button type="button" className="flex w-full items-center justify-between gap-4 rounded-[1.25rem] border border-[#1B303C]/10 bg-white/88 px-4 py-3.5 text-left shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#FCBC34]/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {record.keywords.slice(0, 2).map((keyword) => (
                          <Badge key={`${record.title}-${keyword}`} variant="outline" className="rounded-full border-[#1B303C]/10 bg-[#F7F8FA] text-[#4A6373]">{keyword}</Badge>
                        ))}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[#1B303C]">{record.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#4A6373]">{record.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B7E8A]">{record.cta}</span>
                  </button>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
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
            <CoachPanel data={activeQuery.data} onUpdated={refreshWorkspace} />
          ) : role === "learner" ? (
            <LearnerPanel data={activeQuery.data} onUpdated={refreshWorkspace} />
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

  return (
    <Surface>
      <SectionShell
        eyebrow="Reporting"
        title="Client reporting workspace"
        description="Explore ROI movement, question risk, benchmark context, and error-rate trends in a dedicated reporting section."
        actions={
          access.data ? (
            <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
              {access.data.tenant.name}
            </Badge>
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
      </SectionShell>
    </Surface>
  );
}

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
  const [roleFilter, setRoleFilter] = useState<DemoRole | "all">(() => requestedRoleFilter ?? "all");
  const slideAutoAdvanceTimeoutRef = useRef<number | null>(null);
  const briefCardRef = useRef<HTMLDivElement | null>(null);
  const restoredTrainingProgressKeyRef = useRef<string | null>(null);
  const trainingProgressRestoreTimeoutRef = useRef<number | null>(null);
  const trainingProgressHydratedRef = useRef(false);
  const trainingRoleFilterHydratedRef = useRef(false);
  const pendingLearnerReturnPathRef = useRef<string | null>(null);

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
            id: "preview-workflow-module",
            title: "Turning QA findings into behavior coaching",
            format: "Microlearning",
            durationMinutes: 7,
            skillFocus: "Behavior-based coaching",
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
    if (!previewScenarios.length) {
      return;
    }

    if (!previewScenarios.some((scenario) => scenario.id === previewScenarioId)) {
      setPreviewScenarioId(previewScenarios[0].id);
    }
  }, [previewScenarioId, previewScenarios]);

  const activePreview = previewScenarios.find((scenario) => scenario.id === previewScenarioId) ?? previewScenarios[0];
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
  const effectiveJourneyTitle = targetedAssignment?.journeyTitle ?? targetedJourney ?? activePreview?.journeyTitle ?? liveJourney?.title ?? "Enablement journey";
  const effectiveCompetencyGap = targetedAssignment?.skillFocus ?? activePreview?.competencyGap ?? liveJourney?.competencyGap ?? "Behavior consistency";
  const effectiveCoachingTitle = targetedAssignment ? `Targeted retraining for ${targetedAssignment.skillFocus}` : activePreview?.coachingTitle ?? learner.data?.nextCoachingSession.title ?? "your next coaching session";
  const journeyResources = learner.data?.workflowLibraryMix.journeyResources ?? [];
  const launchedAsset = journeyResources.find((asset: any) => asset.id === requestedAssetId)
    ?? journeyResources.find((asset: any) => asset.title === requestedAssetTitle)
    ?? null;
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
  const presentation = selectedModule
    ? getTrainingPresentation(selectedModule, effectiveJourneyTitle, effectiveCompetencyGap)
    : null;
  const guidedPlan = buildGuidedTrainingPlan({
    journeyTitle: effectiveJourneyTitle,
    moduleTitle: selectedModule?.title ?? "Guided module",
    skillFocus: selectedModule?.skillFocus ?? "Behavior change",
    presentation,
  });
  const trainingVisuals = useMemo(() => (presentation ? buildTrainingVisualGallery(presentation) : []), [presentation]);
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
          body: `This ${selectedModule.format.toLowerCase()} turns ${selectedModule.skillFocus.toLowerCase()} into a focused lesson path inside ${effectiveJourneyTitle}.`,
        },
        {
          id: "practice",
          label: "Practice",
          title: "Choose how to rehearse the behavior",
          body: `Before the next coaching checkpoint, decide how you would practice ${selectedModule.skillFocus.toLowerCase()} in a realistic workflow moment.`,
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
  const slideInteractionProgress = currentSlideInteraction?.kind === "click_to_reveal"
    ? Math.round((revealedCardIds.length / Math.max(currentSlideInteraction.revealCards?.length ?? 1, 1)) * 100)
    : (slideInteractionResult?.score ?? 0);
  const narrationScript = buildLessonNarrationScript(currentLessonPage, presentation);
  const miniAudioBarTitle = currentLessonPage?.title ?? currentStage?.title ?? selectedModule?.title ?? "Lesson narration";

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
  const interactiveGalleryVisuals = lessonVisualGallery.length
    ? lessonVisualGallery
    : contextualDeckVisual
      ? [contextualDeckVisual]
      : [];
  const activeInteractiveVisualIndex = interactiveGalleryVisuals.length
    ? Math.min(selectedDeckVisualIndex, interactiveGalleryVisuals.length - 1)
    : 0;
  const activeInteractiveVisual = interactiveGalleryVisuals[activeInteractiveVisualIndex] ?? null;
  const lessonPageProgress = currentStagePages.length > 0 ? Math.round(((lessonPageIndex + 1) / currentStagePages.length) * 100) : 100;
  const onLastLessonPage = currentStagePages.length === 0 || lessonPageIndex >= currentStagePages.length - 1;
  const stageDisplayLabel = currentStage?.id === "brief" ? "Lesson" : currentStage?.label ?? "Lesson";
  const currentStageItemLabel = `${stageDisplayLabel} ${currentStagePages.length > 0 ? lessonPageIndex + 1 : 0}`;
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

  return (
    <Surface>
      <SectionShell
        eyebrow={isDirectModuleLaunch ? "Course Player" : "Interactive Training"}
        title={selectedModule?.title ?? "Training player"}
        description={isDirectModuleLaunch ? "Opens directly on the active lesson." : "Lesson first."}
        compact
        actions={
          <>
            {access.data ? (
              <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
                {access.data.tenant.name}
              </Badge>
            ) : null}
            <Link href={buildLearnerWorkspaceReturnPath({ freshStart: requestedFreshStart })}>
              <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                Back to learner
              </Button>
            </Link>
          </>
        }
      >
        {access.isLoading || learner.isLoading ? <LoadingState /> : null}
        {!learner.isLoading && learner.data && selectedModule ? (
          <div className="space-y-4">
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
            <PremiumCard className="overflow-hidden">
              <CardContent className="px-4 py-4">
                <div className="rounded-[1.55rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(15,23,42,0.92))] px-4 py-4 shadow-[0_18px_45px_rgba(8,15,35,0.2)]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Focused player</Badge>
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedModule.format}</Badge>
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">Stage {stageIndex + 1} of {stages.length}</Badge>
                        {featuredDeckVisual ? <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{featuredDeckVisual.pageLabel}</Badge> : null}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">{selectedModule.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-200">Lesson first, with compact progress and support controls.</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white">{courseStatusLabel}</div>
                      <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white">{currentStagePages.length > 0 ? `${lessonPageIndex + 1}/${currentStagePages.length}` : "Ready"}</div>
                      <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white">{remainingRuntimeMinutes} min left</div>
                      <div className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white">{overallProgress}% complete</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Progress value={overallProgress} className="h-2 bg-white/8" />
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <div className="grid gap-4">
              <div className="space-y-6">
                <PremiumCard>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-white">Lesson canvas · {currentStage?.title}</CardTitle>
                        <CardDescription className="text-slate-400">{currentStage?.body}</CardDescription>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{currentStage?.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {stages.map((stage, index) => {
                        const stagePlan = guidedPlan.stageDurations.find((entry) => entry.stageId === stage.id);
                        return (
                          <div key={stage.id} className={`rounded-full border px-3 py-2 text-sm ${index === stageIndex ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-white/10 bg-white/5 text-slate-300"}`}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{stage.label}</span>
                              <span className="text-xs text-slate-400">Step {index + 1}</span>
                              {stagePlan ? <span className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/80">{stagePlan.durationLabel}</span> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {currentStagePages.length > 0 ? (
                      <div className="space-y-4">
                        <div className="command-band px-4 py-4 md:px-5">
                          <div className="flex flex-col gap-4 border-b border-[#1B303C]/10 pb-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="max-w-2xl">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6B7E8A]">Training pages</p>
                              <p className="mt-2 text-sm leading-6 text-[#4A6373]">The lesson stays dominant by default. Open overview, checkpoint, or resources only when you need them.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant={trainingWorkspacePage === "brief" ? "default" : "outline"} onClick={() => setTrainingWorkspacePage("brief")} className={trainingWorkspacePage === "brief" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/12 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>Overview</Button>
                              <Button type="button" variant={trainingWorkspacePage === "lesson" ? "default" : "outline"} onClick={() => setTrainingWorkspacePage("lesson")} className={trainingWorkspacePage === "lesson" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/12 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>Lesson page</Button>
                              <Button type="button" variant={trainingWorkspacePage === "checkpoint" ? "default" : "outline"} onClick={() => setTrainingWorkspacePage("checkpoint")} className={trainingWorkspacePage === "checkpoint" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/12 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>Checkpoint</Button>
                              <Button type="button" variant={trainingWorkspacePage === "resources" ? "default" : "outline"} onClick={() => setTrainingWorkspacePage("resources")} className={trainingWorkspacePage === "resources" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/12 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>Resources</Button>
                            </div>
                          </div>
                          <div className={trainingWorkspacePage === "brief" ? "mt-3 grid gap-3 xl:grid-cols-[minmax(220px,0.34fr)_minmax(0,1fr)] xl:items-start" : "mt-4 hidden"}>
                            <div className="space-y-3">
                              <div className="context-rail-card px-4 py-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full border-[#1B303C]/10 bg-white text-[#1B303C]">{currentStage?.label}</Badge>
                                  <Badge className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-700">{moduleFamilyLabel}</Badge>
                                </div>
                                <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">Section progress</p>
                                <p className="mt-2 text-sm font-medium text-[#1B303C]">Page {lessonPageIndex + 1} of {currentStagePages.length} in this course section.</p>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
                                  <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(14,165,233,0.95),rgba(16,185,129,0.88))]" style={{ width: `${lessonPageProgress}%` }} />
                                </div>
                                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#4A6373]">{lessonPageProgress}% section complete</p>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                <div className="context-rail-card px-4 py-4">
                                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">Review status</p>
                                  <p className="mt-2 text-sm font-medium text-[#1B303C]">{briefCompletionStatus.statusLabel}</p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#6B7E8A]">{Math.max(currentStagePages.length - (lessonPageIndex + 1), 0)} lesson steps remaining</p>
                                </div>
                                <div className="context-rail-card px-4 py-4">
                                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">Current runtime</p>
                                  <p className="mt-2 text-sm font-medium text-[#1B303C]">{guidedPlan.stageDurations.find((entry) => entry.stageId === currentStage?.id)?.durationLabel ?? "Stage runtime calibrating"}</p>
                                  <p className="mt-2 text-xs text-[#4A6373]">{activeQuizTrigger ? `Next checkpoint · ${activeQuizTrigger.label}` : "Advance through the card stack to reach the next checkpoint."}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="max-w-2xl">
                                  <p className="text-xs uppercase tracking-[0.22em] text-[#6B7E8A]">{stageNavigatorLabel}</p>
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
                        {trainingWorkspacePage === "lesson" && currentLessonPage ? (
                          <div className="rounded-[2.1rem] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(15,23,42,0.94))] p-6 shadow-[0_32px_90px_rgba(8,15,35,0.26)] lg:p-8 2xl:p-9">
                            <div className="space-y-6">
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentLessonPage.eyebrow}</Badge>
                                  <span className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">{currentLessonPage.visualTone}</span>
                                </div>
                                <h3 className="mt-4 break-words text-2xl font-semibold text-white">{currentLessonPage.title}</h3>
                                <p className="mt-3 max-w-none break-words text-sm leading-7 text-slate-200 2xl:text-[15px]">{currentLessonPage.narrative}</p>
                                <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                                  {featuredDeckVisual ? (
                                    <div className="overflow-hidden rounded-[1.7rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),rgba(2,6,23,0.94))] shadow-[0_24px_70px_rgba(8,15,35,0.28)]">
                                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
                                        <div>
                                          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/75">Primary lesson visual</p>
                                          <p className="mt-1 text-sm text-slate-300">{featuredDeckVisual.pageLabel} · {featuredDeckVisual.sourceDeck}</p>
                                        </div>
                                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/8 text-slate-100">Canvas media</Badge>
                                      </div>
                                      <div className="bg-slate-950/90 p-4 sm:p-5">
                                        <div className="flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/8 bg-slate-950/80 px-4 py-4 sm:min-h-[22rem] lg:min-h-[24rem]">
                                          <TrainingVisualFrame visual={featuredDeckVisual} />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lesson canvas</p>
                                      <h4 className="mt-2 text-lg font-medium text-white">The active page is guiding the learner without a secondary visual wall.</h4>
                                      <p className="mt-3 text-sm leading-6 text-slate-300">When a mapped deck visual is available, it appears here as the dominant lesson media above the fold.</p>
                                    </div>
                                  )}
                                  <div className="space-y-4">
                                    <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{currentStage?.label ?? "Lesson"}</Badge>
                                        {featuredDeckVisual ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{featuredDeckVisual.title}</Badge> : null}
                                      </div>
                                      <p className="mt-4 text-sm leading-6 text-slate-300">{featuredDeckVisual?.caption ?? "The player keeps the lesson frame dominant and leaves supporting material closed until the learner asks for it."}</p>
                                    </div>
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
                                  </div>
                                </div>
                                {lessonVisualSequence.length ? (
                                  <details className="group mt-6 rounded-[1.7rem] border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Visual storyboard</p>
                                        <p className="mt-2 text-sm text-slate-200">Keep the storyboard hidden until the learner wants supporting sequence detail.</p>
                                      </div>
                                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{lessonVisualSequence.length} step sequence</Badge>
                                    </summary>
                                    <div className="mt-4 grid gap-3 border-t border-cyan-300/15 pt-4 lg:grid-cols-3">
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
                                {currentSlideInteraction ? (
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
                                      </div>

                                      {currentSlideInteraction.kind === "timed_challenge" && currentSlideInteraction.timeLimitSeconds ? (
                                        <span className="text-sm leading-6 text-slate-300">Timer limit: {currentSlideInteraction.timeLimitSeconds} seconds after your first answer selection.</span>
                                      ) : null}
                                    </div>
                                    {slideInteractionSubmitted && slideInteractionResult ? (
                                      <div className={`mt-4 rounded-[1.45rem] border p-4 ${slideInteractionPassed ? "border-emerald-400/25 bg-emerald-500/10" : "border-amber-400/25 bg-amber-500/10"}`}>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            <p className={`text-[11px] uppercase tracking-[0.22em] ${slideInteractionPassed ? "text-emerald-200/85" : "text-amber-200/85"}`}>Knowledge-check result</p>
                                            <p className={`mt-2 text-lg font-semibold ${slideInteractionPassed ? "text-emerald-50" : "text-amber-50"}`}>{slideInteractionResult.score}% · {slideInteractionPassed ? "Passed" : "Retry required"}</p>
                                          </div>
                                          <Badge className={`rounded-full ${slideInteractionPassed ? "border-emerald-300/30 bg-emerald-300/18 text-emerald-50" : "border-amber-300/30 bg-amber-300/18 text-amber-50"}`}>{slideInteractionPassed ? currentSlideInteraction.successMessage : currentSlideInteraction.retryMessage}</Badge>
                                        </div>
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
                                {lessonSignalCards.length ? (
                                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                                    {lessonSignalCards.map((signal) => (
                                      <div key={`${currentLessonPage.id}-${signal.label}`} className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4">
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Signal marker</p>
                                        <p className="mt-2 text-lg font-semibold text-white">{signal.value}</p>
                                        <p className="mt-1 text-sm text-slate-300">{signal.label}</p>
                                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-100/75">Benchmark {signal.benchmark ?? "—"}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              {activeInteractiveVisual ? (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Interactive slide canvas</p>
                                      <p className="mt-2 text-sm text-slate-300">Use the active lesson surface or the previous and next controls to keep the canvas aligned to the current learning moment. The duplicate slide-tile list has been removed so the learner stays in one guided flow.</p>
                                    </div>
                                    <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{interactiveGalleryVisuals.length || 1} guided visuals</Badge>
                                  </div>
                                  <div className="rounded-[1.85rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),rgba(2,6,23,0.88))] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.42)] sm:p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3">
                                      <div>
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Selected slide</p>
                                        <p className="mt-2 text-sm font-medium text-white">{activeInteractiveVisual.pageLabel} · {activeInteractiveVisual.title}</p>
                                        <p className="mt-1 text-xs leading-5 text-slate-400">{activeInteractiveVisual.sourceDeck}</p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => setSelectedDeckVisualIndex((current) => Math.max(current - 1, 0))}
                                          disabled={activeInteractiveVisualIndex === 0}
                                          className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                                        >
                                          Previous slide
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => setSelectedDeckVisualIndex((current) => Math.min(current + 1, Math.max(interactiveGalleryVisuals.length - 1, 0)))}
                                          disabled={activeInteractiveVisualIndex >= interactiveGalleryVisuals.length - 1}
                                          className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                                        >
                                          Next slide
                                        </Button>
                                        {activeInteractiveVisual.imageUrl ? (
                                          <a href={activeInteractiveVisual.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#FCBC34]/30 bg-[#FCBC34]/10 px-4 py-2 text-sm font-medium text-[#FCBC34] transition hover:border-[#FCBC34]/50 hover:bg-[#FCBC34]/15 hover:text-white">
                                            Open full-size slide
                                          </a>
                                        ) : (
                                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-300">
                                            Generated lesson visual
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (activeInteractiveVisual.imageUrl) {
                                          window.open(activeInteractiveVisual.imageUrl, "_blank", "noopener,noreferrer");
                                        }
                                      }}
                                      className="mt-4 block w-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/80 text-left transition hover:border-[#FCBC34]/30"
                                    >
                                      <div className="overflow-x-auto overflow-y-hidden rounded-[1.35rem] border border-white/6 bg-black/30">
                                        <div className="flex min-h-[18rem] min-w-full items-center justify-center px-4 py-4 sm:min-h-[24rem] sm:px-6 sm:py-6 lg:min-h-[30rem]">
                                          <div className="flex h-full min-h-[16rem] w-full min-w-[980px] items-center justify-center rounded-[1rem] shadow-[0_16px_50px_rgba(2,8,23,0.35)] lg:min-w-[1120px]">
                                            <TrainingVisualFrame visual={activeInteractiveVisual} />
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                    <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                                      <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3">
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Slide reference</p>
                                        <p className="mt-2 text-sm font-medium text-white">{activeInteractiveVisual.pageLabel}</p>
                                        <p className="mt-1 text-xs leading-5 text-slate-400">{activeInteractiveVisual.sourceDeck}</p>
                                      </div>
                                      <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3">
                                        <p className="text-sm font-medium text-white">{activeInteractiveVisual.title}</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">{activeInteractiveVisual.caption}</p>
                                        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-cyan-100/75">Use the active lesson surface and the previous or next controls above to move the active visual. Open the full-size slide when you want a separate reading view.</p>
                                      </div>
                                    </div>
                                  </div>
                                  {interactiveGalleryVisuals.length ? (
                                    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="max-w-2xl">
                                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Visual focus lock</p>
                                          <p className="mt-2 text-sm leading-6 text-slate-300">This area no longer repeats the full learn and practice list as slide tiles. The active lesson surface is the main navigator, while this companion card simply confirms where the learner is in the visual sequence.</p>
                                        </div>
                                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Visual {activeInteractiveVisualIndex + 1} of {interactiveGalleryVisuals.length}</Badge>
                                      </div>
                                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                                        <div className="rounded-[1.15rem] border border-white/10 bg-slate-950/60 px-4 py-4">
                                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Previous context</p>
                                          <p className="mt-2 text-sm font-medium text-white">{activeInteractiveVisualIndex > 0 ? interactiveGalleryVisuals[activeInteractiveVisualIndex - 1]?.pageLabel : "Start of sequence"}</p>
                                          <p className="mt-2 text-sm leading-6 text-slate-300">{activeInteractiveVisualIndex > 0 ? interactiveGalleryVisuals[activeInteractiveVisualIndex - 1]?.title : "The learner is on the first guided visual in this section."}</p>
                                        </div>
                                        <div className="rounded-[1.15rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4">
                                          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/75">Current visual focus</p>
                                          <p className="mt-2 text-sm font-medium text-white">{activeInteractiveVisual.pageLabel}</p>
                                          <p className="mt-2 text-sm leading-6 text-slate-100">{activeInteractiveVisual.title}</p>
                                        </div>
                                        <div className="rounded-[1.15rem] border border-white/10 bg-slate-950/60 px-4 py-4">
                                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Next context</p>
                                          <p className="mt-2 text-sm font-medium text-white">{activeInteractiveVisualIndex < interactiveGalleryVisuals.length - 1 ? interactiveGalleryVisuals[activeInteractiveVisualIndex + 1]?.pageLabel : "End of sequence"}</p>
                                          <p className="mt-2 text-sm leading-6 text-slate-300">{activeInteractiveVisualIndex < interactiveGalleryVisuals.length - 1 ? interactiveGalleryVisuals[activeInteractiveVisualIndex + 1]?.title : "Advance the brief flow to move into the next learning section."}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                            </div>
                          </div>
                        ) : null}
                        {insightCharts.length ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-white/10 bg-white/5 px-5 py-4">
                              <div className="max-w-2xl">
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Evidence graphics</p>
                                <h4 className="mt-2 text-lg font-medium text-white">Charts are embedded as part of the lesson storyline</h4>
                                <p className="mt-2 text-sm leading-6 text-slate-300">Each graph now sits directly underneath the instructional page so the learner can connect the deck message to measurable behavior, benchmark contrast, and coaching relevance without leaving the course sequence.</p>
                              </div>
                              <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{insightCharts.length} in-platform evidence views</Badge>
                            </div>
                            <div className="grid gap-5 2xl:grid-cols-2">
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
                <CardHeader>
                  <div className="space-y-2">
                    <CardTitle className="text-white">Progress rail</CardTitle>
                    <CardDescription className="text-slate-400">Keep the next action, runtime, and current score visible while the lesson stays centered.</CardDescription>
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
              </PremiumCard>
            </div>
          </div>
        ) : null}
      </SectionShell>
    </Surface>
  );
}

export function ContentLibraryView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const [roleFilter, setRoleFilter] = useState<DemoRole | "all">("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [assetView, setAssetView] = useState<"all" | "chcg" | "imported">("all");
  const [libraryMode, setLibraryMode] = useState<"launcher" | "explore" | "ingest">("launcher");
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("Client enablement");
  const [format, setFormat] = useState<"Deck" | "Playbook" | "Checklist" | "Guide" | "Worksheet" | "Microlearning" | "Document">("Deck");
  const [linkedRole, setLinkedRole] = useState<DemoRole | "all">("manager");
  const [tags, setTags] = useState("implementation, client import");
  const [sourceLabel, setSourceLabel] = useState("Client enablement team");
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
      setUploadNotice(`${created.title} is now visible in the tenant library.`);
      setTitle("");
      setSummary("");
      setCategory("Client enablement");
      setFormat("Deck");
      setLinkedRole("manager");
      setTags("implementation, client import");
      setSourceLabel("Client enablement team");
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

  const groupedAssets = useMemo(() => groupAssetsByTargetDemographic(assets), [assets]);

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
  const selectedAssetStatusLabel = selectedAsset
    ? selectedAsset.sourceKind === "chcg"
      ? "Ready for detail review"
      : "Client-configured and ready for launch"
    : "Select an asset to begin";
  const selectedAssetStatusSupport = selectedAsset
    ? `Estimated runtime ${selectedAssetEstimatedMinutes} min · ${selectedAssetSectionCount} lesson sections · ${selectedAssetCheckpointCount} checkpoints`
    : "Choose a shelf item to activate the course detail view.";
  const selectedAssetWorkflowLabel = selectedAsset ? getRoleLabel(selectedAssetRole) : "Learner";
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
    const path = buildTrainingLaunchPath({ asset, role, journeyId, moduleId, assignmentId });
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

    const payload: any = {
      tenantId,
      title,
      summary,
      category,
      format,
      linkedRoles: [linkedRole],
      tags: normalizedTags,
      sourceLabel,
    };

    if (selectedFile) {
      payload.fileName = selectedFile.name;
      payload.mimeType = selectedFile.type || "application/octet-stream";
      payload.dataBase64 = await readFileAsBase64(selectedFile);
    }

    await uploadMutation.mutateAsync(payload);
  }

  const jumpToLibraryMode = (mode: "launcher" | "explore" | "ingest", sectionId: string) => {
    setLibraryMode(mode);
    window.setTimeout(() => revealWorkspaceSection(sectionId), 20);
  };

  return (
    <Surface>
      <SectionShell
        eyebrow="Content Missions Library"
        title="Compact shelves with in-panel course detail"
        description="The library now keeps more titles, status, and launch cues in one screen. Browse dense shelf rows on the left, keep the selected course detail on the right, and only then enter the focused training player."
        compact
        actions={
          <>
            {access.data ? (
              <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
                {access.data.tenant.name}
              </Badge>
            ) : null}
            <Button type="button" onClick={() => jumpToLibraryMode("launcher", "library-launcher-mode")} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">
              Review course detail
            </Button>
            <Link href="/">
              <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                Back to overview
              </Button>
            </Link>
          </>
        }
      >
        {access.isLoading || library.isLoading ? <LoadingState /> : null}
        {!library.isLoading && library.data ? (
          <div className="space-y-5">
            <div className="command-band px-4 py-4 md:px-5 md:py-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-end">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border-[#1B303C]/12 bg-[#1B303C] text-white">Search-first library</Badge>
                    <Badge variant="outline" className="rounded-full border-[#1B303C]/10 bg-white/70 text-[#1B303C]">Compact rows</Badge>
                    <Badge variant="outline" className="rounded-full border-[#1B303C]/10 bg-white/70 text-[#1B303C]">Detail stays visible</Badge>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Mission library control</p>
                    <h3 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-[#1B303C] md:text-[2.15rem]">Scan many modules, inspect one detail panel, and launch with less scroll.</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-[#4A6373]">The left shelf is intentionally denser. The right panel keeps runtime, sections, checkpoints, and role-aligned launch context visible so users do not bounce between separate long surfaces.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-[1.2rem] border border-[#1B303C]/10 bg-white/82 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#6B7E8A]">Visible assets</p>
                    <p className="mt-1 text-lg font-semibold text-[#1B303C]">{assets.length}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-[#1B303C]/10 bg-white/82 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#6B7E8A]">Focus track</p>
                    <p className="mt-1 text-sm font-semibold text-[#1B303C]">{selectedTrackTitle}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-[#1B303C]/10 bg-white/82 px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#6B7E8A]">Selected lane</p>
                    <p className="mt-1 text-sm font-semibold text-[#1B303C]">{selectedAssetWorkflowLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            <Tabs value={libraryMode} onValueChange={(value) => setLibraryMode(value as "launcher" | "explore" | "ingest")} className="space-y-4">
              <div className="command-band px-4 py-4 md:px-5" id="library-explore-mode">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="block space-y-1.5 text-sm text-[#1B303C] xl:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Search assets</span>
                      <div className="flex h-11 items-center gap-3 rounded-[1.15rem] border border-[#1B303C]/10 bg-white/88 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]">
                        <Search className="h-4 w-4 text-[#6B7E8A]" />
                        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search data, coaching, QA, engagement..." className="w-full bg-transparent text-sm text-[#1B303C] outline-none placeholder:text-[#6B7E8A]" />
                      </div>
                    </label>
                    <label className="block space-y-1.5 text-sm text-[#1B303C]">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Role lens</span>
                      <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as DemoRole | "all")} className="h-11 w-full rounded-[1.15rem] border border-[#1B303C]/10 bg-white/88 px-3 text-sm text-[#1B303C] outline-none">
                        <option value="all">All roles</option>
                        {Object.entries(roleMeta).map(([key, item]) => <option key={key} value={key}>{item.title}</option>)}
                      </select>
                    </label>
                    <label className="block space-y-1.5 text-sm text-[#1B303C]">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Track</span>
                      <select value={trackFilter} onChange={(event) => setTrackFilter(event.target.value)} className="h-11 w-full rounded-[1.15rem] border border-[#1B303C]/10 bg-white/88 px-3 text-sm text-[#1B303C] outline-none">
                        <option value="all">All tracks</option>
                        {library.data.tracks.map((track: any) => <option key={track.id} value={track.id}>{track.title}</option>)}
                      </select>
                    </label>
                  </div>
                  <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-[1.2rem] border border-[#1B303C]/10 bg-white/75 p-1.5">
                    <TabsTrigger value="explore" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Compact shelves</TabsTrigger>
                    <TabsTrigger value="launcher" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Course detail</TabsTrigger>
                    <TabsTrigger value="ingest" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Ingest</TabsTrigger>
                  </TabsList>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant={assetView === "all" ? "default" : "outline"} onClick={() => setAssetView("all")} className={assetView === "all" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/10 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>Blended view</Button>
                  <Button type="button" variant={assetView === "chcg" ? "default" : "outline"} onClick={() => setAssetView("chcg")} className={assetView === "chcg" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/10 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>CHCG core</Button>
                  <Button type="button" variant={assetView === "imported" ? "default" : "outline"} onClick={() => setAssetView("imported")} className={assetView === "imported" ? "rounded-full bg-[#1B303C] text-white hover:bg-[#243f4d]" : "rounded-full border-[#1B303C]/10 bg-white text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]"}>Client imports</Button>
                </div>
              </div>

              <TabsContent value="explore" className="mt-0" id="library-explore-rows">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                  <PremiumCard>
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-white">Training queue</CardTitle>
                          <CardDescription className="text-slate-400">Compact rows keep more content above the fold and update the selected detail panel instantly.</CardDescription>
                        </div>
                        <Badge className="rounded-full border-white/10 bg-white/10 text-slate-100">{assets.length} results</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {groupedAssets.length > 0 ? groupedAssets.map((group) => (
                        <div key={group.id} className="space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{group.title}</p>
                              <p className="mt-1 text-xs text-slate-400">{group.description}</p>
                            </div>
                            <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{group.assets.length} titles</Badge>
                          </div>
                          <div className="space-y-2">
                            {group.assets.map((asset: any) => {
                              const active = selectedAsset?.id === asset.id;
                              const assetMinutes = (() => {
                                const runtimeByFormat: Record<string, number> = { Deck: 28, Playbook: 24, Checklist: 12, Guide: 20, Worksheet: 18, Microlearning: 10, Document: 16 };
                                return (runtimeByFormat[asset.format] ?? 18) + Math.min(asset.tags.length * 2, 10);
                              })();
                              return (
                                <button
                                  key={asset.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAssetId(asset.id);
                                    setLibraryMode("launcher");
                                  }}
                                  className={`w-full rounded-[1.25rem] border px-4 py-3 text-left transition ${active ? "border-cyan-400/38 bg-cyan-400/12 shadow-[0_18px_46px_rgba(6,182,212,0.12)]" : "border-white/10 bg-white/6 hover:bg-white/10"}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{asset.format}</p>
                                        <Badge className={`rounded-full ${asset.sourceKind === "chcg" ? "border-cyan-400/22 bg-cyan-400/12 text-cyan-100" : "border-emerald-400/22 bg-emerald-400/12 text-emerald-100"}`}>{asset.sourceKind === "chcg" ? "Core" : "Imported"}</Badge>
                                      </div>
                                      <p className="mt-2 line-clamp-1 text-sm font-semibold text-white">{asset.title}</p>
                                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{asset.summary}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="text-sm font-semibold text-white">{assetMinutes} min</p>
                                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">Detail</p>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-[1.25rem] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">No library assets match the current search and filter combination.</div>
                      )}
                    </CardContent>
                  </PremiumCard>

                  <PremiumCard>
                    <CardHeader className="space-y-3" id="library-launcher-mode">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-white">Selected module detail</CardTitle>
                          <CardDescription className="text-slate-400">Keep objectives, launch fit, and the next action in the same panel instead of routing through another long page.</CardDescription>
                        </div>
                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{libraryProgressValue}% staged</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAsset ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`rounded-full ${selectedAsset.sourceKind === "chcg" ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-200" : "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"}`}>{selectedAsset.sourceKind === "chcg" ? "CHCG asset" : "Client upload"}</Badge>
                            <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedAsset.format}</Badge>
                            <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedAsset.category}</Badge>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Course detail staging</p>
                            <h3 className="mt-2 text-[1.9rem] font-semibold leading-tight text-white">{selectedAsset.title}</h3>
                            <p className="mt-3 text-sm leading-7 text-slate-300">{selectedAsset.summary}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetStatusLabel}</p></div>
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Runtime</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetEstimatedMinutes} min</p></div>
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Sections</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetSectionCount}</p></div>
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Knowledge gates</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetCheckpointCount} checkpoints</p></div>
                          </div>
                          <div className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Launch sequence</p>
                              <p className="text-xs text-cyan-100">{libraryProgressSteps.join(" · ")}</p>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(16,185,129,0.9))]" style={{ width: `${libraryProgressValue}%` }} /></div>
                            <p className="mt-3 text-sm leading-6 text-slate-100">{selectedAssetStatusSupport}</p>
                          </div>
                          <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Inside this module</p>
                            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                              {selectedAssetOutcomeLines.map((line) => (
                                <div key={line} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /><span>{line}</span></div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Receiving lane</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedAssetRoleOptions.map((linkedRole) => (
                                <Button key={`selected-role-${selectedAsset.id}-${linkedRole}`} type="button" variant="outline" onClick={() => setSelectedAssetRole(linkedRole)} className={`rounded-full px-4 py-2 text-sm ${selectedAssetRole === linkedRole ? "border-white bg-white text-slate-950 hover:bg-slate-100" : "border-white/10 bg-slate-950/55 text-slate-200 hover:bg-white/10 hover:text-white"}`}>
                                  {getRoleLabel(linkedRole)}
                                </Button>
                              ))}
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-300">{selectedAssetWorkflowBrief.title} keeps the launch handoff aligned to the active audience lens.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedAsset.tags.map((tag: string) => (
                              <span key={`selected-${selectedAsset.id}-${tag}`} className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-300">#{tag}</span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={() => handleStartTraining(selectedAsset, selectedAssetRole)} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">Launch focused player</Button>
                            <Button type="button" variant="outline" onClick={() => jumpToLibraryMode("explore", "library-explore-mode")} className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white">Back to shelves</Button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">Select a shelf row to activate the module detail panel.</div>
                      )}
                    </CardContent>
                  </PremiumCard>
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
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Status</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetStatusLabel}</p></div>
                            <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Lane</p><p className="mt-2 text-sm font-medium text-white">{selectedAssetWorkflowLabel}</p></div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={() => handleStartTraining(selectedAsset, selectedAssetRole)} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">Launch focused player</Button>
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

              <TabsContent value="ingest" className="mt-0" id="library-ingest-mode">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                  <PremiumCard>
                    <CardHeader>
                      <CardTitle className="text-white">Upload lane</CardTitle>
                      <CardDescription className="text-slate-400">Bring in tenant-specific material without breaking the compact browse and detail flow.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">CHCG core assets</p><p className="mt-2 text-sm font-medium text-white">{library.data.stats.chcgAssets}</p></div>
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Client imports</p><p className="mt-2 text-sm font-medium text-white">{library.data.stats.importedAssets}</p></div>
                      </div>
                      <div className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm leading-6 text-slate-100">
                        Uploaded assets return to the same compact shelf model, inherit role filters, and open in the same module-detail panel instead of creating a separate browsing branch.
                      </div>
                    </CardContent>
                  </PremiumCard>
                  <PremiumCard>
                    <CardHeader>
                      <CardTitle className="text-white">Add tenant-specific content</CardTitle>
                      <CardDescription className="text-slate-400">This keeps imported materials searchable, role-mapped, and ready for the compact detail-and-launch flow.</CardDescription>
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
                          <Button type="submit" disabled={uploadMutation.isPending} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">{uploadMutation.isPending ? "Uploading..." : "Add asset to library"}</Button>
                          <Button type="button" variant="outline" onClick={() => jumpToLibraryMode("explore", "library-explore-mode")} className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white">Return to compact shelves</Button>
                        </div>
                      </form>
                    </CardContent>
                  </PremiumCard>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

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
      </SectionShell>
    </Surface>
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
}: {
  tenantId: string;
  subjectUserId: string;
  authorRole: "manager" | "coach" | "executive" | "client_admin";
  onCreated?: () => void;
  title: string;
}) {
  const [reviewType, setReviewType] = useState<"one_on_one" | "quarterly_check_in" | "annual_review">("one_on_one");
  const [reviewTitle, setReviewTitle] = useState(title);
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const createReviewLog = trpc.demo.previewCreateReviewLog.useMutation({
    onSuccess: () => {
      setNotes("");
      setNextStep("");
      onCreated?.();
    },
  });

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-[0_18px_50px_rgba(2,8,23,0.24)]">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-sm leading-6 text-slate-400">Capture one-on-ones, quarterly reviews, and annual summaries while the platform keeps learning evidence attached.</p>
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
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
          disabled={createReviewLog.isPending || notes.trim().length < 10 || nextStep.trim().length < 5 || reviewTitle.trim().length < 3}
          onClick={() => createReviewLog.mutate({ tenantId, subjectUserId, authorRole, reviewType, title: reviewTitle, notes, nextStep })}
        >
          {createReviewLog.isPending ? "Saving..." : "Save review log"}
        </Button>
        {createReviewLog.isSuccess ? <span className="text-sm text-emerald-300">Documentation entry saved.</span> : null}
      </div>
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
  const createWeeklyCoachingLog = trpc.demo.previewCreateWeeklyCoachingLog.useMutation({
    onSuccess: () => {
      setAttendance("");
      setFollowUpFromPrevious("");
      setCoachingComments("");
      setSmartGoalCommitment("");
      setAdditionalSupport("");
      setAgentTakeaways("");
      onCreated?.();
    },
  });

  const shareTargets = [
    { key: `employee-${subjectUserId}`, label: `${employeeName} · ${employeeEmail}` },
    { key: `coach-${coachRole}-${coachEmail}`, label: `${coachName} · ${coachEmail}` },
    { key: `supervisor-${supervisorEmail}`, label: `${supervisorName} · ${supervisorEmail}` },
    managerOfSupervisorEmail
      ? { key: `leadership-${managerOfSupervisorEmail}`, label: `Optional leadership copy · ${managerOfSupervisorEmail}` }
      : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-[0_18px_50px_rgba(2,8,23,0.24)]">
      <div className="mb-4 space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Weekly coaching log</p>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm leading-6 text-slate-400">Capture the exact weekly coaching fields, show who receives the simulated copy, and preserve the learner's own take-aways in the same record.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {shareTargets.map((target) => (
          <Badge key={target.key} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target.label}</Badge>
        ))}
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
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
          disabled={createWeeklyCoachingLog.isPending || attendance.trim().length < 5 || followUpFromPrevious.trim().length < 10 || coachingComments.trim().length < 10 || smartGoalCommitment.trim().length < 10 || additionalSupport.trim().length < 5}
          onClick={() => createWeeklyCoachingLog.mutate({ tenantId, subjectUserId, coachRole, sessionDate, attendance, followUpFromPrevious, coachingComments, smartGoalCommitment, additionalSupport, managerOfSupervisorEmail, agentTakeaways: agentTakeaways.trim() || undefined })}
        >
          {createWeeklyCoachingLog.isPending ? "Saving..." : "Save weekly coaching log"}
        </Button>
        {createWeeklyCoachingLog.isSuccess ? <span className="text-sm text-emerald-300">Weekly coaching log saved with learner and supervisor copy details.</span> : null}
      </div>
    </div>
  );
}

function WeeklyCoachingLogPopupBox({
  buttonLabel = "Launch coaching log pop-up",
  dialogTitle = "Weekly coaching log pop-up",
  dialogDescription = "Use the same structured weekly coaching workflow in a focused dialog, then return to the coaching lane with the history refreshed.",
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
          <DialogDescription className="text-slate-400">{dialogDescription}</DialogDescription>
        </DialogHeader>
        <WeeklyCoachingLogComposer
          {...composerProps}
          onCreated={() => {
            setOpen(false);
            onCreated?.();
          }}
        />
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
  const updateTakeaways = trpc.demo.previewUpdateWeeklyCoachingTakeaways.useMutation({
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

  useEffect(() => {
    setTakeawayDrafts(Object.fromEntries(logs.map((log: any) => [log.id, log.agentTakeaways ?? ""])));
    setStructuredLogDrafts(buildStructuredLogDrafts(logs));
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
          const canSaveStructuredLog = structuredDraft.attendance.trim().length >= 5
            && structuredDraft.followUpFromPrevious.trim().length >= 10
            && structuredDraft.coachingComments.trim().length >= 10
            && structuredDraft.smartGoalCommitment.trim().length >= 10
            && structuredDraft.additionalSupport.trim().length >= 5;

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
                  <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                    <Button
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
                    <span className="text-sm text-slate-300">Updates refresh the same coaching record, linked review, and downstream documentation summary.</span>
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
                  <div className="mt-4 flex flex-wrap gap-2">
                    {([
                      { key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` },
                      { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },
                      { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },
                      log.managerOfSupervisorEmail
                        ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }
                        : null,
                    ].filter(Boolean) as { key: string; label: string }[]).map((recipient) => (
                      <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-900/90 text-slate-100">{recipient.label}</Badge>
                    ))}
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Enterprise readiness" value={`${data.readiness.score}`} supporting={`Target ${data.readiness.target} · uplift ${data.readiness.uplift} pts`} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Team readiness" value={`${data.readiness.teamScore}`} supporting="Role- and intervention-weighted readiness score" icon={<Layers3 className="h-4 w-4" />} />
        <MetricCard label="Intervention confidence" value="High" supporting="Correlation between action volume and readiness movement is positive" icon={<BrainCircuit className="h-4 w-4" />} />
        <MetricCard label="White-label tenant" value={data.tenant.name} supporting={data.tenant.industry} icon={<Building2 className="h-4 w-4" />} />
      </div>

      <div className="mission-hero-card overflow-hidden rounded-[1.8rem] border border-cyan-500/14 bg-[linear-gradient(180deg,rgba(8,15,30,0.98),rgba(15,23,42,0.96))] px-5 py-5 shadow-[0_22px_60px_rgba(8,15,35,0.18)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge className="mission-chip rounded-full border-cyan-300/20 bg-cyan-300/12 text-cyan-50">Executive reporting</Badge>
              <span className="command-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-50/80">Decision queue</span>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Reporting overview</p>
              <h2 className="text-[1.65rem] font-semibold tracking-tight text-white xl:text-[1.9rem]">Review the core lift, risk, and proof signals first.</h2>
              <p className="max-w-4xl text-sm leading-6 text-slate-200">This workspace now opens like a reporting console: start with the summary cards, then switch into trends, risk, evidence, or documentation only when a deeper decision is required.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.reportingOverview.summaryCards.map((entry: any) => (
                <div key={entry.label} className="rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{entry.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{entry.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{entry.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="guide-card border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Current headline</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{data.reportingOverview.headline}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200">{data.reportingOverview.summary}</p>
            </div>
            <div className="rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-emerald-50">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/80">Proof cue</p>
              <p className="mt-2 text-sm leading-6">{data.proofOfImpact.headline}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeExecutiveMode} onValueChange={(value) => setActiveExecutiveMode(value as "overview" | "trends" | "risk" | "evidence" | "documentation")} className="space-y-4">
        <div className="command-band px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Reporting modes</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Switch the workspace focus instead of forcing every reporting stream into one continuous scroll.</p>
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
                  <XAxis dataKey="week" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} />
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

        <TabsContent value="trends" className="mt-0 space-y-6">
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
                        <XAxis dataKey="period" stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} />
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
                        <XAxis dataKey="period" stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} />
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

        <TabsContent value="risk" className="mt-0 space-y-6">
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
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/75">Directional evidence summary</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{data.proofOfImpact.headline}</h3>
                <p className="mt-3 text-sm leading-6 text-cyan-50/85">{data.proofOfImpact.summary}</p>
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

        <TabsContent value="documentation" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Documentation generated from learning and interventions</CardTitle>
                  <CardDescription className="text-slate-400">Executives can review evidence trails produced automatically from enablement activity across service, workflow, leadership, and coaching programs.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentationFeed entries={data.documentationEntries} />
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

function CoachPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  const leadModule = data.activeJourney?.modules?.[0] ?? null;
  const [activeTab, setActiveTab] = useState<"coaching" | "transfer" | "documentation" | "alerts">("coaching");
  const [selectedCoachingSessionId, setSelectedCoachingSessionId] = useState<string>(data.coachingSessions[0]?.id ?? "");
  const [selectedAlertId, setSelectedAlertId] = useState<string>(data.notifications[0]?.id ?? "");

  const openCoachView = (tab: "coaching" | "transfer" | "documentation" | "alerts", sectionId: string) => {
    setActiveTab(tab);
    window.setTimeout(() => revealWorkspaceSection(sectionId), 20);
  };

  const coachWeeklyCoachingLogProps = {
    tenantId: data.tenant.id,
    subjectUserId: data.directLearner.id,
    coachRole: "coach" as const,
    title: "Capture a weekly coaching log from the coach workspace",
    employeeName: data.directLearner.name,
    employeeEmail: data.directLearner.email,
    coachName: data.coach.name,
    coachEmail: data.coach.email,
    supervisorName: data.escalationPartner.name,
    supervisorEmail: data.escalationPartner.email,
    managerOfSupervisorEmail: data.weeklyCoachingLogs[0]?.managerOfSupervisorEmail,
  };

  const selectedCoachingSession = data.coachingSessions.find((session: any) => session.id === selectedCoachingSessionId) ?? data.coachingSessions[0] ?? null;
  const selectedAlert = data.notifications.find((item: any) => item.id === selectedAlertId) ?? data.notifications[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Coach readiness" value={`${data.coach.readinessScore}`} supporting={data.coach.name} icon={<ShieldCheck className="h-4 w-4" />} onClick={() => openCoachView("coaching", "coach-signal-trend")} actionLabel="Open signal trend" />
        <MetricCard label="Learner focus" value={data.directLearner.name} supporting={data.directLearner.title} icon={<Users2 className="h-4 w-4" />} onClick={() => openCoachView("coaching", "coach-supervision-lane")} actionLabel="Open supervision lane" />
        <MetricCard label="Weekly logs" value={`${data.weeklyCoachingLogs.length}`} supporting="Structured coaching cycles recorded" icon={<BookOpen className="h-4 w-4" />} onClick={() => openCoachView("coaching", "coach-weekly-logs")} actionLabel="Review coaching logs" />
        <MetricCard label="Journey progress" value={`${data.activeJourney.progress}%`} supporting={data.activeJourney.title} icon={<Gauge className="h-4 w-4" />} onClick={() => openCoachView("transfer", "coach-transfer-lane")} actionLabel="Open training transfer" />
      </div>

      <div className="mission-hero-card overflow-hidden rounded-[2rem] border border-cyan-400/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_30%),linear-gradient(135deg,rgba(7,13,28,0.98),rgba(15,23,42,0.96))] px-6 py-6 shadow-[0_26px_80px_rgba(8,15,35,0.24)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="mission-chip rounded-full border-cyan-300/20 bg-cyan-300/12 text-cyan-50">Coach studio mission</Badge>
                <span className="command-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-50/80">Coach the behavior, not just the completion</span>
              </div>
              <WeeklyCoachingLogPopupBox
                buttonLabel="Log a coaching"
                dialogTitle={`Weekly coaching log · ${data.directLearner.name}`}
                dialogDescription="Capture the weekly coaching record in a focused pop-up, save it, and return to the coach lane with history refreshed."
                buttonClassName="rounded-full bg-[#FCBC34] px-5 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(252,188,52,0.28)] hover:bg-[#ffd56d] hover:text-slate-950"
                composerProps={coachWeeklyCoachingLogProps}
                onCreated={onUpdated}
              />
            </div>
            <div>
              <h2 className="text-[1.8rem] font-semibold tracking-tight text-white xl:text-[2.1rem]">A focused coach desk keeps guidance, evidence, and follow-up in one place.</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">Instead of one long coaching page, the coach workspace now moves through a clear sequence: see the signal, choose the coaching lane, capture the log, and document the next observation.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="guide-card border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Current learner focus</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{data.directLearner.name}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">{data.directLearner.title} · {data.activeJourney.title}</p>
            </div>
            <div className="trophy-card border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-emerald-50">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/80">Coach momentum</p>
              <p className="mt-2 text-sm leading-6">{data.weeklyCoachingLogs.length} structured logs and {data.coachingSessions.length} active coaching threads are ready to review or extend.</p>
            </div>
            <div className="rounded-[1.45rem] border border-cyan-400/25 bg-cyan-400/10 p-4 shadow-[0_18px_40px_rgba(8,15,35,0.18)]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/80">Ribbon action</p>
              <p className="mt-2 text-sm leading-6 text-slate-100">The primary coaching-log button now lives directly in the top coach ribbon. This support card keeps the handoff instruction visible for anyone entering the lane later.</p>
              <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-slate-200">
                Use the gold <span className="font-semibold text-[#FCBC34]">Log a coaching</span> action in the ribbon to force the structured log to open in a focused pop-up window.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="coach-signal-trend" className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] scroll-mt-24">
        <ChartFrame title="Coach-visible signal trend" description="Frontline coaching should connect active performance signals to the next observed behavior, not just course completion.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.openSignals.map((signal: any) => ({ label: signal.label, value: signal.value, target: signal.target }))}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} />
              <Line type="monotone" dataKey="value" stroke="#67e8f9" strokeWidth={3} dot={{ r: 4, fill: "#67e8f9" }} />
              <Line type="monotone" dataKey="target" stroke="#F8FAFC" strokeDasharray="4 4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
        <PremiumCard className="scroll-mt-24" id="coach-supervision-lane">
          <CardHeader>
            <CardTitle className="text-white">Coach supervision lane</CardTitle>
            <CardDescription className="text-slate-400">The coach workspace sits between learner delivery and manager governance so weekly coaching, observed behaviors, and escalation context stay visible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Current coach pathway</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{data.activeJourney.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-100">{data.activeJourney.competencyGap}</p>
            </div>
            {leadModule ? (
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Next coach-focused module</p>
                <p className="mt-2 text-lg font-medium text-white">{leadModule.title}</p>
                <p className="mt-2 text-sm text-slate-300">{leadModule.skillFocus} · {leadModule.durationMinutes} min · {leadModule.completionRate}% completion</p>
              </div>
            ) : null}
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Escalation partner</p>
              <p className="mt-2 text-lg font-medium text-white">{data.escalationPartner.name}</p>
              <p className="mt-1 text-sm text-slate-300">{data.escalationPartner.title}</p>
            </div>
            <RetrainingHistorySection title="Retraining completion history" description="Coach-visible history keeps past retraining outcomes attached to the supervision lane so follow-through remains easy to confirm over time." assignments={data.retrainingHistory ?? []} emptyLabel="Past retraining completions will appear here after the learner finishes assigned modules." />
            <GuidanceActionPanel tenantId={data.tenant.id} suggestion={data.aiSuggestion} catalog={data.retrainingCatalog} assignments={data.activeRetrainingAssignments} actorRole="coach" learnerName={data.directLearner.name} onUpdated={onUpdated} />
          </CardContent>
        </PremiumCard>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "coaching" | "transfer" | "documentation" | "alerts")} className="space-y-4">
        <div className="command-band px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Coach modes</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Switch between live coaching, transfer evidence, documentation, and alerts without leaving one endless page.</p>
            </div>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.3rem] border border-white/10 bg-white/6 p-2 xl:w-auto">
              <TabsTrigger value="coaching" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Coaching lane</TabsTrigger>
              <TabsTrigger value="transfer" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Training transfer</TabsTrigger>
              <TabsTrigger value="documentation" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Documentation</TabsTrigger>
              <TabsTrigger value="alerts" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Alerts</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="coaching" id="coach-coaching-lane" className="mt-0 grid gap-6 xl:grid-cols-[0.72fr_1.28fr] scroll-mt-24">
          <div className="space-y-4">
            {data.coachingSessions.map((session: any) => (
              <button key={session.id} type="button" onClick={() => setSelectedCoachingSessionId(session.id)} className={`w-full rounded-[1.45rem] border p-4 text-left transition ${selectedCoachingSession?.id === session.id ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Coaching thread</p>
                    <h3 className="mt-2 text-base font-medium text-white">{session.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{session.notes}</p>
                  </div>
                  <StatusBadge value={session.status} />
                </div>
              </button>
            ))}
          </div>
          <div id="coach-weekly-logs" className="space-y-6 scroll-mt-24">
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
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedCoachingSession.actionPlan.map((step: any) => (
                      <div key={step} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /><span>{step}</span></div></div>
                    ))}
                  </div>
                </CardContent>
              </PremiumCard>
            ) : null}
            <PremiumCard>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <CardTitle className="text-white">Focused coaching log capture</CardTitle>
                    <CardDescription className="mt-2 text-slate-400">Use the ribbon action or this button to open the structured coaching log in a pop-up instead of expanding an inline form in the coaching lane.</CardDescription>
                  </div>
                  <WeeklyCoachingLogPopupBox
                    buttonLabel="Open coaching log pop-up"
                    dialogTitle={`Weekly coaching log · ${data.directLearner.name}`}
                    dialogDescription="Capture the full weekly coaching record in a focused pop-up, then return to the coach lane with the history refreshed."
                    composerProps={coachWeeklyCoachingLogProps}
                    onCreated={onUpdated}
                  />
                </div>
              </CardHeader>
            </PremiumCard>
            <WeeklyCoachingLogTimeline title="Coach-visible weekly coaching history" description="Coaches can review the exact structured fields, confirm sharing targets, and keep learner take-aways connected to the same record." tenantId={data.tenant.id} logs={data.weeklyCoachingLogs} allowLogEditing onUpdated={onUpdated} />
          </div>
        </TabsContent>

        <TabsContent value="transfer" id="coach-transfer-lane" className="mt-0 grid gap-6 xl:grid-cols-[0.82fr_1.18fr] scroll-mt-24">
          <WorkflowLibraryPanel title="Coach-ready content mix" description="Supervisors can pull both CHCG methodology and tenant resources into coaching prep, floor walks, and next-session planning." resources={data.workflowLibraryMix.documentationResources} />
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Training-transfer focus</CardTitle>
              <CardDescription className="text-slate-400">The coach lane bridges course completion to observed behavior, so lessons, QA signals, and next coaching moves stay in one working view.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.activeJourney.modules.map((module: any) => (
                <div key={module.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-medium text-white">{module.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{module.skillFocus} · {module.durationMinutes} min · {module.format}</p>
                    </div>
                    <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{module.completionRate}% complete</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="documentation" id="coach-documentation-feed" className="mt-0 grid gap-6 xl:grid-cols-[0.95fr_1.05fr] scroll-mt-24">
          <div className="space-y-6">
            <ReviewLogComposer tenantId={data.tenant.id} subjectUserId={data.directLearner.id} authorRole="coach" title="Write a coach follow-up or observational review" onCreated={onUpdated} />
            <WorkflowLibraryPanel title="Coach observation resources" description="Use methodology references and tenant materials to keep observation notes aligned with the lesson evidence and coaching standard." resources={data.workflowLibraryMix.interventionResources} />
          </div>
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Coach documentation feed</CardTitle>
              <CardDescription className="text-slate-400">Observed behavior, weekly coaching records, and review notes remain connected so the coach does not lose context between sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentationFeed entries={data.documentationEntries} />
            </CardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="alerts" id="coach-alerts-feed" className="mt-0 grid gap-6 xl:grid-cols-[0.72fr_1.28fr] scroll-mt-24">
          <div className="space-y-4">
            {data.notifications.map((item: any) => (
              <button key={item.id} type="button" onClick={() => setSelectedAlertId(item.id)} className={`w-full rounded-[1.45rem] border p-4 text-left transition ${selectedAlert?.id === item.id ? "border-rose-400/30 bg-rose-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Alert</p>
                    <h3 className="mt-2 text-base font-medium text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <StatusBadge value={item.priority} />
                </div>
              </button>
            ))}
          </div>
          <PremiumCard>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-white">{selectedAlert?.title ?? "Alert detail"}</CardTitle>
                  {selectedAlert ? <CardDescription className="mt-2 text-slate-400">{new Date(selectedAlert.createdAt).toLocaleString()}</CardDescription> : null}
                </div>
                {selectedAlert ? <StatusBadge value={selectedAlert.priority} /> : null}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-300">{selectedAlert?.detail ?? "Select an alert to inspect the coach-facing recommendation and timing context."}</p>
            </CardContent>
          </PremiumCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManagerPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  const [activeTab, setActiveTab] = useState<"interventions" | "coaching" | "documentation" | "notifications">("interventions");
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
  const selectedNotification = data.notifications.find((item: any) => item.id === selectedNotificationId) ?? data.notifications[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Active signals" value={`${data.openSignals.length}`} supporting="Live KPI and QA feed requiring attention" icon={<CircleAlert className="h-4 w-4" />} onClick={() => openManagerView("interventions", "manager-signal-trend")} actionLabel="Open signal feed" />
        <MetricCard label="Open interventions" value={`${data.interventions.length}`} supporting="Workflow actions assigned from rule triggers" icon={<Target className="h-4 w-4" />} onClick={() => openManagerView("interventions", "manager-interventions-lane")} actionLabel="Open interventions" />
        <MetricCard label="Coaching follow-ups" value={`${data.coachingSessions.length}`} supporting="Structured sessions with action plans and reminders" icon={<Users2 className="h-4 w-4" />} onClick={() => openManagerView("coaching", "manager-coaching-lane")} actionLabel="Open coaching lane" />
        <MetricCard label="Direct report readiness" value={`${data.directReport.readinessScore}`} supporting={data.directReport.name} icon={<ShieldCheck className="h-4 w-4" />} onClick={() => openManagerView("coaching", "manager-coach-oversight")} actionLabel="Review coach oversight" />
      </div>

      <div className="mission-hero-card overflow-hidden rounded-[2rem] border border-amber-400/18 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(15,23,42,0.96))] px-6 py-6 shadow-[0_26px_80px_rgba(8,15,35,0.24)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="mission-chip rounded-full border-amber-300/20 bg-amber-300/12 text-amber-50">Manager operations mission</Badge>
              <span className="command-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-50/80">See the risk, coach the rep, close the action</span>
            </div>
            <div>
              <h2 className="text-[1.8rem] font-semibold tracking-tight text-white xl:text-[2.1rem]">A guided manager desk replaces the long operations page.</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">The manager workspace now opens like a case-management console: priority signals first, then split views for interventions, coaching, documentation, and alerts so users stay oriented without endless scrolling.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="guide-card border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Today's focus</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{data.aiSuggestion.headline ?? data.aiSuggestion.title ?? "Resolve open signals and move coaching forward."}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">{data.aiSuggestion.summary ?? data.aiSuggestion.detail ?? "The manager lane should surface the most urgent workflow, quality, and coaching actions first."}</p>
            </div>
            <div className="trophy-card border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-emerald-50">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/80">Momentum cue</p>
              <p className="mt-2 text-sm leading-6">{data.directReport.name} is at {data.directReport.readinessScore} readiness with {data.coachingSessions.length} active coaching follow-ups in motion.</p>
            </div>
          </div>
        </div>
      </div>

      <div id="manager-signal-trend" className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] scroll-mt-24">
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
              <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#08111f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18 }} />
              <Area type="monotone" dataKey="value" stroke="#60A5FA" fill="url(#signalFill)" strokeWidth={3} />
              <Line type="monotone" dataKey="target" stroke="#F8FAFC" strokeDasharray="4 4" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartFrame>
        <GuidanceActionPanel
          tenantId={data.tenant.id}
          suggestion={data.aiSuggestion}
          catalog={data.retrainingCatalog}
          assignments={data.activeRetrainingAssignments}
          actorRole="manager"
          learnerName={data.directReport.name}
          onUpdated={onUpdated}
        />
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "interventions" | "coaching" | "documentation" | "notifications")} className="space-y-4">
        <div className="command-band px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Manager modes</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Each mode keeps a short queue on one side and the selected case detail on the other.</p>
            </div>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.3rem] border border-white/10 bg-white/6 p-2 xl:w-auto">
              <TabsTrigger value="interventions" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Interventions</TabsTrigger>
              <TabsTrigger value="coaching" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Coaching</TabsTrigger>
              <TabsTrigger value="documentation" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Documentation</TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Alerts</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="interventions" id="manager-interventions-lane" className="mt-0 grid gap-6 xl:grid-cols-[0.72fr_1.28fr] scroll-mt-24">
          <div className="space-y-4">
            {data.interventions.map((item: any) => (
              <button key={item.id} type="button" onClick={() => setSelectedInterventionId(item.id)} className={`w-full rounded-[1.45rem] border p-4 text-left transition ${selectedIntervention?.id === item.id ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{item.gap}</p>
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

        <TabsContent value="coaching" id="manager-coaching-lane" className="mt-0 grid gap-6 xl:grid-cols-[0.72fr_1.28fr] scroll-mt-24">
          <div className="space-y-4">
            {data.coachingSessions.map((session: any) => (
              <button key={session.id} type="button" onClick={() => setSelectedCoachingSessionId(session.id)} className={`w-full rounded-[1.45rem] border p-4 text-left transition ${selectedCoachingSession?.id === session.id ? "border-emerald-400/30 bg-emerald-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Coaching session</p>
                    <h3 className="mt-2 text-base font-medium text-white">{session.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{session.notes}</p>
                  </div>
                  <StatusBadge value={session.status} />
                </div>
              </button>
            ))}
            <PremiumCard className="border-cyan-400/20 bg-cyan-400/8">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-white">Open the coaching log in a focused pop-up</CardTitle>
                    <CardDescription className="mt-2 text-slate-300">Launch a cleaner writing surface without leaving the coaching lane.</CardDescription>
                  </div>
                  <WeeklyCoachingLogPopupBox composerProps={managerWeeklyCoachingLogProps} onCreated={onUpdated} />
                </div>
              </CardHeader>
            </PremiumCard>
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
            <WeeklyCoachingLogComposer {...managerWeeklyCoachingLogProps} onCreated={onUpdated} />
            <WeeklyCoachingLogTimeline
              title="Weekly coaching log history"
              description="Managers can review every structured coaching field, confirm the simulated email-copy list, and track how the learner responds over time."
              tenantId={data.tenant.id}
              logs={data.weeklyCoachingLogs}
              allowLogEditing
              onUpdated={onUpdated}
            />
            <PremiumCard className="scroll-mt-24" id="manager-coach-oversight">
              <CardHeader>
                <CardTitle className="text-white">Coach direct-report oversight</CardTitle>
                <CardDescription className="text-slate-400">Review the same direct-report coaching history the coach sees without leaving the manager workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        <RetrainingHistorySection title="Targeted retraining history" description="Managers can review the current retraining outcome, then export the filtered completion history with completion dates and assigning roles without leaving the coach-oversight lane." assignments={filteredHistory} emptyLabel={`No retraining completions fall inside the selected ${historyWindow} window yet.`} />
                      </div>
                    </div>
                  );
                })}
                <WeeklyCoachingLogTimeline
                  title="Coach-lane direct-report logs"
                  description="This mirrored timeline lets managers review the same direct-report coaching history the coach is working from without leaving the manager workspace."
                  tenantId={data.tenant.id}
                  logs={data.coachCoverage.flatMap((coverage: any) => coverage.weeklyCoachingLogs)}
                  allowLogEditing
                  onUpdated={onUpdated}
                />
              </CardContent>
            </PremiumCard>
          </div>
        </TabsContent>

        <TabsContent value="documentation" id="manager-documentation-lane" className="mt-0 grid gap-6 xl:grid-cols-[0.95fr_1.05fr] scroll-mt-24">
          <div className="space-y-6">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Auto-generated learning documentation</CardTitle>
                <CardDescription className="text-slate-400">Completion evidence from service foundations, workflow precision, and intervention activity is automatically assembled for coaching use.</CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentationFeed entries={data.documentationEntries} />
              </CardContent>
            </PremiumCard>
            <WorkflowLibraryPanel
              title="Documentation-ready asset mix"
              description="Review packets and coaching evidence can now blend tenant imports with CHCG governance references."
              resources={data.workflowLibraryMix.documentationResources}
            />
          </div>
          <div className="space-y-6">
            <ReviewLogComposer tenantId={data.tenant.id} subjectUserId={data.directReport.id} authorRole="manager" title="Write a one-on-one, quarterly, or annual coaching log" onCreated={onUpdated} />
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Structured review history</CardTitle>
                <CardDescription className="text-slate-400">Manager-authored logs and leadership checkpoints tied to the learner record and CHCG performance cadence.</CardDescription>
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
        </TabsContent>

        <TabsContent value="notifications" id="manager-alerts-lane" className="mt-0 grid gap-6 xl:grid-cols-[0.72fr_1.28fr] scroll-mt-24">
          <div className="space-y-4">
            {data.notifications.map((item: any) => (
              <button key={item.id} type="button" onClick={() => setSelectedNotificationId(item.id)} className={`w-full rounded-[1.45rem] border p-4 text-left transition ${selectedNotification?.id === item.id ? "border-rose-400/30 bg-rose-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Alert</p>
                    <h3 className="mt-2 text-base font-medium text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <StatusBadge value={item.priority} />
                </div>
              </button>
            ))}
          </div>
          <PremiumCard>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-white">{selectedNotification?.title ?? "Alert details"}</CardTitle>
                {selectedNotification ? <StatusBadge value={selectedNotification.priority} /> : null}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-300">{selectedNotification?.detail ?? "Select an alert to inspect the full manager-facing recommendation and time stamp."}</p>
              {selectedNotification ? <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">{new Date(selectedNotification.createdAt).toLocaleString()}</p> : null}
            </CardContent>
          </PremiumCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LearnerPanel({ data, onUpdated, freshStart = false }: { data: any; onUpdated?: () => void; freshStart?: boolean }) {
  const learnerModules = data.activeJourney.modules;
  const primaryLearnerModule = learnerModules[0] ?? null;
  const activeRetrainingAssignment = data.currentRetrainingAssignment ?? data.retrainingAssignments?.[0] ?? null;
  const retrainingHistory = data.retrainingHistory ?? [];
  const nextLearnerModule = learnerModules.find((module: any) => module.completionRate < 80) ?? learnerModules[0] ?? null;
  const completedLearnerModules = learnerModules.filter((module: any) => module.completionRate >= 80).length;
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"journey" | "reengagements" | "coaching" | "evidence">("journey");
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
  const learnerCelebrationCopy = completedLearnerModules >= Math.max(1, Math.ceil(learnerModules.length / 2))
    ? "You have already crossed the halfway mark in your guided journey."
    : "Each completed module unlocks the next coaching and readiness milestone.";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Readiness score" value={`${data.learner.readinessScore}`} supporting={data.learner.title} icon={<Gauge className="h-4 w-4" />} />
        <MetricCard label="Journey progress" value={`${data.activeJourney.progress}%`} supporting={data.activeJourney.title} icon={<BookOpen className="h-4 w-4" />} />
        <MetricCard label={learnerWorkspaceCopy.assignedReengagementsMetricLabel} value={`${data.assignedInterventions.length}`} supporting={learnerWorkspaceCopy.assignedReengagementsMetricSupporting} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Next coaching milestone" value={new Date(data.nextCoachingSession.dueDate).toLocaleDateString()} supporting={data.nextCoachingSession.title} icon={<Bell className="h-4 w-4" />} />
      </div>

      <div className="mission-hero-card overflow-hidden rounded-[2rem] border border-cyan-400/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_30%),linear-gradient(135deg,rgba(6,24,42,0.98),rgba(15,23,42,0.96))] px-6 py-6 shadow-[0_26px_80px_rgba(8,15,35,0.24)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)] xl:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="mission-chip rounded-full border-cyan-300/20 bg-cyan-300/12 text-cyan-50">Learner journey</Badge>
              <span className="command-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-50/80">One clear next step at a time</span>
            </div>
            <div>
              <h2 className="text-[1.8rem] font-semibold tracking-tight text-white xl:text-[2.1rem]">The learner workspace now guides progress, action, and evidence without making people hunt through one long page.</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">Use the guided modes below to continue the journey, handle assigned re-engagements, respond to coaching, and review evidence only when it is needed.</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={primaryTrainingPath}>
                <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={() => {
                  if (activeRetrainingAssignment?.status === "assigned") {
                    updateActiveAssignmentStatus("in_progress");
                  }
                }}>
                  {activeRetrainingAssignment ? (activeRetrainingAssignment.status === "completed" ? "Review completed retraining" : "Start assigned retraining") : "Resume guided training"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/library">
                <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">Browse mapped resources</Button>
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            <div className="guide-card border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Current focus</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{activeRetrainingAssignment?.moduleTitle ?? nextLearnerModule?.title ?? data.activeJourney.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-200">{activeRetrainingAssignment ? `Assigned from ${activeRetrainingAssignment.journeyTitle} with ${formatDueWindow(activeRetrainingAssignment.dueAt).toLowerCase()}.` : `Next recommendation inside ${data.activeJourney.title} with ${data.activeJourney.progress}% journey completion so far.`}</p>
            </div>
            <div className="trophy-card border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-emerald-50">
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/80">Progress celebration</p>
              <p className="mt-2 text-sm leading-6">{learnerCelebrationCopy}</p>
            </div>
          </div>
        </div>
      </div>

      {activeRetrainingAssignment ? (
        <div id="learner-priority-retraining" className="rounded-[1.8rem] border border-amber-300/30 bg-[radial-gradient(circle_at_top_left,rgba(253,224,71,0.18),transparent_34%),linear-gradient(135deg,rgba(69,26,3,0.92),rgba(15,23,42,0.98))] p-5 shadow-[0_24px_72px_rgba(8,15,35,0.26)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-50">Priority retraining notification</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{activeRetrainingAssignment.status === "completed" ? `${activeRetrainingAssignment.moduleTitle} is complete` : `${activeRetrainingAssignment.moduleTitle} has been assigned to you`}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-50">{activeRetrainingAssignment.status === "completed" ? `You finished this targeted retraining from ${activeRetrainingAssignment.journeyTitle}. Your manager and coach can now see the completed chip in their oversight lanes.` : `Complete this targeted refresher from ${activeRetrainingAssignment.journeyTitle} within 48 hours. It has been moved to the top of your learner journey so you can start it before returning to the broader path.`}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={activeRetrainingAssignment.status} />
              <Badge className="rounded-full border-amber-200/25 bg-amber-300/16 px-3 py-1 text-amber-50 shadow-[0_10px_24px_rgba(180,83,9,0.18)]">{activeRetrainingAssignment.status === "completed" && activeRetrainingAssignment.completedAt ? `Completed ${new Date(activeRetrainingAssignment.completedAt).toLocaleDateString()}` : formatDueWindow(activeRetrainingAssignment.dueAt)}</Badge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={primaryTrainingPath}>
              <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={() => {
                if (activeRetrainingAssignment.status === "assigned") {
                  updateActiveAssignmentStatus("in_progress");
                }
              }}>
                {activeRetrainingAssignment.status === "completed" ? "Review completed retraining" : "Start assigned retraining now"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            {activeRetrainingAssignment.status !== "completed" ? (
              <Button type="button" variant="outline" onClick={() => updateActiveAssignmentStatus("completed")} disabled={updateRetrainingStatus.isPending} className="rounded-full border-white/16 bg-slate-950/35 text-white hover:bg-slate-900/55 hover:text-white">
                {updateRetrainingStatus.isPending ? "Saving completion..." : "Mark retraining complete"}
              </Button>
            ) : null}
            <Badge variant="outline" className="rounded-full border-white/14 bg-slate-950/28 px-3 py-1 text-slate-50">Assigned by {activeRetrainingAssignment.requestedByRole}</Badge>
          </div>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "journey" | "reengagements" | "coaching" | "evidence")} className="space-y-4">
        <div className="command-band px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Learner modes</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">Move through the journey with one mode at a time instead of reading the whole workspace top to bottom.</p>
            </div>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.3rem] border border-white/10 bg-white/6 p-2 xl:w-auto">
              <TabsTrigger value="journey" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Journey</TabsTrigger>
              <TabsTrigger value="reengagements" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Re-engagements</TabsTrigger>
              <TabsTrigger value="coaching" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Coaching</TabsTrigger>
              <TabsTrigger value="evidence" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-950">Evidence</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="journey" className="mt-0 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PremiumCard className="overflow-hidden">
            <CardContent className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]">
              <div className="rounded-[2rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.14),transparent_35%),linear-gradient(135deg,rgba(8,47,73,0.95),rgba(15,23,42,0.98))] p-6 shadow-[0_24px_80px_rgba(8,15,35,0.28)]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border-cyan-200/25 bg-cyan-300/16 text-cyan-50">{activeRetrainingAssignment ? "Required retraining" : "Continue learning"}</Badge>
                  <Badge variant="outline" className="rounded-full border-white/14 bg-slate-950/30 text-slate-50">{activeRetrainingAssignment?.moduleFormat ?? primaryLearnerModule?.format ?? "Learning path"}</Badge>
                  <Badge variant="outline" className="rounded-full border-white/14 bg-slate-950/30 text-slate-50">{activeRetrainingAssignment ? formatDueWindow(activeRetrainingAssignment.dueAt) : `${data.activeJourney.progress}% path progress`}</Badge>
                </div>
                <div className="mt-5 max-w-3xl">
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-50">{activeRetrainingAssignment ? "Targeted retraining" : "Recommended path"}</p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">{activeRetrainingAssignment?.moduleTitle ?? primaryLearnerModule?.title ?? data.activeJourney.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-50">{activeRetrainingAssignment ? `Your manager or coach assigned ${activeRetrainingAssignment.moduleTitle} from ${activeRetrainingAssignment.journeyTitle}. Complete this focused retraining within the next 48 hours before returning to the broader learning path.` : primaryLearnerModule ? `Resume ${primaryLearnerModule.title} to keep building ${primaryLearnerModule.skillFocus.toLowerCase()} inside ${data.activeJourney.title}.` : `Continue the active journey inside ${data.activeJourney.title} with role-aware training, coaching prompts, and mapped resources.`}</p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/12 bg-slate-950/68 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Modules completed</p><p className="mt-2 text-xl font-semibold text-white">{completedLearnerModules}</p></div>
                  <div className="rounded-2xl border border-white/12 bg-slate-950/68 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Recommended next</p><p className="mt-2 text-sm font-medium text-white">{activeRetrainingAssignment?.moduleTitle ?? nextLearnerModule?.title ?? "Finish the current module to unlock the next lesson."}</p></div>
                  <div className="rounded-2xl border border-white/12 bg-slate-950/68 px-4 py-4"><p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Coach milestone</p><p className="mt-2 text-sm font-medium text-white">{data.nextCoachingSession.title}</p></div>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="rounded-[1.8rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(15,23,42,0.9))] p-5 shadow-[0_22px_60px_rgba(8,15,35,0.24)]">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Learning signals</p>
                  <h4 className="mt-3 text-xl font-semibold text-white">{data.activeJourney.competencyGap}</h4>
                  <p className="mt-3 text-sm leading-7 text-slate-100">The learner workspace now surfaces a clearer recommended path, visible continuation context, and the next coaching checkpoint before the learner enters the full course player.</p>
                </div>
                <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5"><p className="text-xs uppercase tracking-[0.22em] text-slate-300">Achievement layer</p><p className="mt-2 text-sm font-medium text-white">{completedLearnerModules}/{learnerModules.length} modules have already crossed the 80% completion mark.</p></div>
                <div className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5"><p className="text-xs uppercase tracking-[0.22em] text-slate-300">Recommendation framing</p><p className="mt-2 text-sm font-medium text-white">Use the training route for the immersive lesson player and the learner workspace for high-level progress, continuation, and next-step discovery.</p></div>
              </div>
            </CardContent>
          </PremiumCard>
          <div className="space-y-6">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Active enablement journey</CardTitle>
                <CardDescription className="text-slate-400">{learnerWorkspaceCopy.activeJourneyDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.activeJourney.modules.map((module: any, index: number) => (
                  <div key={module.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{module.format}</p>
                          {index === 0 ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Recommended</Badge> : null}
                          {index === 1 ? <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Up next</Badge> : null}
                          {module.completionRate >= 80 ? <Badge className="rounded-full border-emerald-400/20 bg-emerald-400/10 text-emerald-100">Strong progress</Badge> : null}
                          {activeRetrainingAssignment?.moduleId === module.id ? <Badge className="rounded-full border-amber-400/20 bg-amber-400/12 text-amber-100">Assigned</Badge> : null}
                        </div>
                        <h4 className="mt-2 text-lg font-medium text-white">{module.title}</h4>
                        <p className="mt-2 text-sm text-slate-300">Skill focus: {module.skillFocus}</p>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{module.durationMinutes} min</Badge>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-400"><span>{index === 0 ? "Recommended path" : "Completion"}</span><span>{module.completionRate}%</span></div>
                      <Progress value={module.completionRate} className="h-2 bg-white/8" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link href={launchTrainingPath(module)}>
                        <Button type="button" variant="outline" onClick={() => {
                          if (activeRetrainingAssignment?.moduleId === module.id && activeRetrainingAssignment.status === "assigned") {
                            updateActiveAssignmentStatus("in_progress");
                          }
                        }} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                          {activeRetrainingAssignment?.moduleId === module.id ? (activeRetrainingAssignment.status === "completed" ? "Review assigned module" : "Resume assigned module") : "Open this module"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </PremiumCard>
            {retrainingHistory.length ? <RetrainingHistorySection title="Past retraining history" description="Review what was already finished before the next intervention starts." assignments={retrainingHistory} /> : null}
            <WorkflowLibraryPanel title="Journey resource mix" description="Your learning path can now blend CHCG core modules with tenant-provided launch or compliance materials." resources={data.workflowLibraryMix.journeyResources} />
          </div>
        </TabsContent>

        <TabsContent value="reengagements" className="mt-0 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">{learnerWorkspaceCopy.assignedReengagementsCardTitle}</CardTitle>
              <CardDescription className="text-slate-400">Auto-assigned actions with clear accountability, grounded in workflow reliability and customer-service fundamentals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.assignedInterventions.map((item: any) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-medium text-white">{item.title}</h4>
                      <p className="mt-2 text-sm text-slate-300">{item.gap}</p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    {item.assignedActions.map((action: any) => (
                      <button key={action} type="button" onClick={() => setSelectedInterventionId(item.id)} className="flex w-full items-start gap-2 rounded-2xl border border-white/8 bg-slate-950/35 px-3 py-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"><ChevronRight className="mt-0.5 h-4 w-4 text-cyan-200" /><span>{action}</span></button>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" variant="outline" onClick={() => setSelectedInterventionId(item.id)} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">Choose training for this re-engagement</Button>
                    {activeRetrainingAssignment ? <Badge className="rounded-full border-amber-400/20 bg-amber-400/12 text-amber-100">Assigned module available now</Badge> : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </PremiumCard>
          <div className="space-y-6">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Re-engagement guidance</CardTitle>
                <CardDescription className="text-slate-400">Choose the best training continuation path when a re-engagement is assigned.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {interventionTrainingOptions.map((option) => (
                  <Link key={option.id} href={option.path}>
                    <button type="button" onClick={() => {
                      if (option.isAssigned && activeRetrainingAssignment?.status === "assigned") {
                        updateActiveAssignmentStatus("in_progress");
                      }
                    }} className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10">
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
              </CardContent>
            </PremiumCard>
            <Dialog open={Boolean(activeIntervention)} onOpenChange={(open) => !open ? setSelectedInterventionId(null) : null}>
              <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Select the training to continue this re-engagement</DialogTitle>
                  <DialogDescription className="text-slate-400">{activeIntervention ? `Route ${activeIntervention.title} into the right module so the learner lands exactly where the assigned re-engagement should continue.` : "Choose a module to continue this re-engagement."}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {interventionTrainingOptions.map((option) => (
                    <Link key={option.id} href={option.path}>
                      <button type="button" onClick={() => {
                        if (option.isAssigned && activeRetrainingAssignment?.status === "assigned") {
                          updateActiveAssignmentStatus("in_progress");
                        }
                        setSelectedInterventionId(null);
                      }} className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10">
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
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="coaching" className="mt-0 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Coaching timeline</CardTitle>
              <CardDescription className="text-slate-400">Review the next coaching checkpoint and your structured take-aways without leaving the learner workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Next coaching milestone</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{data.nextCoachingSession.title}</h3>
                <p className="mt-2 text-sm text-slate-300">Due {new Date(data.nextCoachingSession.dueDate).toLocaleDateString()}</p>
              </div>
              <WeeklyCoachingLogTimeline title="Weekly coaching log and your take-aways" description="Review the structured coaching notes your leaders recorded, see which email recipients would receive copies, and add your own response back into the same log." tenantId={data.tenant.id} logs={data.weeklyCoachingLogs} allowTakeawayEditing onUpdated={onUpdated} />
            </CardContent>
          </PremiumCard>
          <WorkflowLibraryPanel title="Coaching support assets" description="Use mapped resources to prepare for your next coaching step and reinforce the right behaviors before the next review." resources={data.workflowLibraryMix.documentationResources} />
        </TabsContent>

        <TabsContent value="evidence" className="mt-0 grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Documentation hub</CardTitle>
              <CardDescription className="text-slate-400">Automatically generated evidence and leadership review notes connected to your Service Foundations, Workflow Precision, and coaching history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DocumentationFeed entries={data.documentationEntries} />
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
          <WorkflowLibraryPanel title="Documentation support assets" description="Review evidence can be supported with both CHCG governance assets and tenant-authored documents." resources={data.workflowLibraryMix.documentationResources} />
        </TabsContent>
      </Tabs>
    </div>
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
  const [activeAdminMode, setActiveAdminMode] = useState<"overview" | "branding" | "roles" | "governance">("overview");
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6B7E8A]">Control cues</p>
              <p className="mt-2 text-sm leading-6 text-[#4A6373]">Use one mode at a time so tenant admins never have to scroll through branding, permissions, coaching, and evidence all at once.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.configuration.slice(0, 4).map((item: any) => (
                <div key={item.key} className="rounded-[1.35rem] border border-[#1B303C]/10 bg-white/70 px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">{item.label}</p>
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

      <Tabs value={activeAdminMode} onValueChange={(value) => setActiveAdminMode(value as "overview" | "branding" | "roles" | "governance")} className="space-y-4">
        <div className="command-band px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6B7E8A]">Client control modes</p>
              <p className="mt-2 text-sm leading-6 text-[#4A6373]">Switch between overview, branding, role architecture, and governance instead of scrolling through every admin surface sequentially.</p>
            </div>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.4rem] border border-[#1B303C]/10 bg-white/70 p-2 xl:w-auto">
              <TabsTrigger value="overview" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Overview</TabsTrigger>
              <TabsTrigger value="branding" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Branding</TabsTrigger>
              <TabsTrigger value="roles" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Roles</TabsTrigger>
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
                  <DocumentationFeed entries={data.documentationEntries} />
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

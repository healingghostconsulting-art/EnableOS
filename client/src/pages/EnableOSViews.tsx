import { useEffect, useMemo, useRef, useState } from "react";
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
}: {
  tenantId?: string | null;
  requestedRoleFilter?: DemoRole | null;
  requestedJourneyId?: string | null;
  requestedModuleId?: string | null;
  requestedAssignmentId?: string | null;
  previewScenarioId?: string | null;
}) {
  return [
    TRAINING_PROGRESS_STORAGE_PREFIX,
    tenantId ?? "tenantless",
    `scenario=${previewScenarioId ?? "active"}`,
    `journey=${requestedJourneyId ?? "none"}`,
    `module=${requestedModuleId ?? "none"}`,
    `assignment=${requestedAssignmentId ?? "none"}`,
    `role=${requestedRoleFilter ?? "none"}`,
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

const FORM_INPUT_SURFACE_CLASS = "w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/10 placeholder:text-slate-500 [color-scheme:dark]";
const READONLY_FORM_INPUT_SURFACE_CLASS = "w-full rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none [color-scheme:dark]";

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
    description: `The navigation has been narrowed to learner tools for this route, but your signed-in session still belongs to the ${viewerLane}. Use this banner as the role-context handoff so the perspective change feels intentional instead of abrupt.`,
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
    statusLabel: `${completedCount} of ${totalPages} guided pages complete`,
  };
}

export function getStageNavigatorLabel(stageId?: string | null) {
  return stageId === "brief"
    ? "Guided lesson flow"
    : stageId === "practice"
      ? "Practice walkthrough"
      : stageId === "apply"
        ? "Application walkthrough"
        : "Reflection walkthrough";
}

export function getModalCheckpointResetKey(trigger?: { id?: string | null; assessmentKey?: string | null } | null) {
  return trigger?.id ? `${trigger.id}:${trigger.assessmentKey ?? "unknown"}` : "none";
}

function SectionShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8 xl:space-y-9">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-4">
          <Badge variant="outline" className="mission-chip rounded-full px-3.5 py-1.5 text-[12px] uppercase tracking-[0.24em]">
            {eyebrow}
          </Badge>
          <div className="max-w-[54rem] space-y-3 xl:max-w-[60rem]">
            <h1 className="max-w-[16ch] text-[2.45rem] font-semibold leading-[1.06] tracking-tight text-[#1B303C] sm:text-[2.95rem] xl:max-w-[17ch] xl:text-[3.1rem]">{title}</h1>
            <p className="max-w-[56rem] text-base leading-8 text-[#4A6373] xl:text-[1.08rem]">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3.5 xl:justify-end">{actions}</div> : null}
      </div>
      {children}
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
}: {
  asset?: any;
  role?: DemoRole;
  journeyId?: string;
  moduleId?: string;
  assignmentId?: string;
}) {
  const params = new URLSearchParams();
  if (asset?.id) params.set("assetId", asset.id);
  if (asset?.title) params.set("assetTitle", asset.title);
  if (role) params.set("role", role);
  if (journeyId) params.set("journeyId", journeyId);
  if (moduleId) params.set("moduleId", moduleId);
  if (assignmentId) params.set("assignmentId", assignmentId);
  return params.toString() ? `/training?${params.toString()}` : "/training";
}

export function buildLearnerWorkspaceReturnPath({
  assignmentId,
  moduleId,
  focus,
}: {
  assignmentId?: string | null;
  moduleId?: string | null;
  focus?: "priority-retraining" | null;
}) {
  const params = new URLSearchParams();
  if (assignmentId) params.set("completedAssignmentId", assignmentId);
  if (moduleId) params.set("completedModuleId", moduleId);
  if (focus) params.set("focus", focus);
  return params.toString() ? `/learner?${params.toString()}` : "/learner";
}

export function buildLearnerJourneyModulePath({
  activeJourneyId,
  moduleId,
  activeRetrainingAssignment,
  primaryTrainingPath,
}: {
  activeJourneyId: string;
  moduleId: string;
  activeRetrainingAssignment?: { moduleId: string } | null;
  primaryTrainingPath: string;
}) {
  if (activeRetrainingAssignment && moduleId === activeRetrainingAssignment.moduleId) {
    return primaryTrainingPath;
  }

  return buildTrainingLaunchPath({
    journeyId: activeJourneyId,
    moduleId,
  });
}

export function buildLearnerInterventionTrainingOptions({
  activeJourneyId,
  learnerModules,
  activeRetrainingAssignment,
  primaryTrainingPath,
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
      <div className="container py-10 sm:py-12">
        <div className="grid-noise rounded-[2.25rem] border border-[#1B303C]/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,248,250,0.92))] p-0 sm:p-1">
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
          <div className="mx-auto max-w-2xl">
            <p className="text-center text-[11px] uppercase tracking-[0.3em] text-[#6b7857]">{isFinalQuiz ? "Knowledge validation" : "Knowledge check"}</p>
            <h3 className="mt-3 text-center text-[2rem] font-semibold tracking-[-0.02em] text-[#243018] sm:text-[2.35rem]">{title}</h3>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-[#586648]">{assessment.instructions}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
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
            <div className="mt-10 rounded-[1.6rem] border border-[#1f2b45] bg-[#26324a] px-5 py-5 shadow-[0_16px_35px_rgba(24,35,57,0.2)]">
              <p className="text-sm font-medium leading-7 text-white">{activeQuestion.prompt}</p>
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
              <div className="mt-6 flex flex-wrap items-center gap-3">
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
                    Submit
                  </Button>
                )}
              </div>
              {submitted ? (
                <div className={`mt-6 rounded-[1.25rem] border px-4 py-4 ${passed ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleAlert className="h-4 w-4 text-rose-600" />}
                    <span className={passed ? "text-emerald-700" : "text-rose-700"}>Score: {score}/{questions.length}</span>
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${passed ? "text-emerald-700" : "text-rose-700"}`}>{passed ? assessment.passMessage : assessment.failMessage}</p>
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
  const landingTrainingRecords = useMemo(
    () => [
      {
        title: "Soft Skills & Customer/Patient Service Foundation",
        subtitle: "Customer service, active listening, empathy, de-escalation, and professionalism.",
        keywords: ["learner", "service foundations", "soft skills", "communication"],
        href: "/training",
        cta: "Open training simulator",
      },
      {
        title: "Quality Assurance Essentials",
        subtitle: "Verification, QA discipline, documentation accuracy, and workflow execution.",
        keywords: ["manager", "workflow precision", "qa", "documentation"],
        href: "/training?role=manager",
        cta: "Open manager-aligned training",
      },
      {
        title: "Unlocking the power of date",
        subtitle: "KPI interpretation, trend review, and decision-quality leadership.",
        keywords: ["executive", "leadership", "data", "kpi"],
        href: "/training?role=executive",
        cta: "Open executive-aligned training",
      },
      {
        title: "Maximizing performance through performance management",
        subtitle: "Calibration, improvement planning, and coaching accountability.",
        keywords: ["manager", "performance", "calibration", "reviews"],
        href: "/training?role=manager",
        cta: "Open performance training",
      },
      {
        title: "Gamification & Work From Home",
        subtitle: "Recognition rhythms, gamification, and hybrid-team motivation design.",
        keywords: ["manager", "engagement", "recognition", "remote teams"],
        href: "/training?role=manager",
        cta: "Open engagement training",
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

  return (
    <Surface>
            <div className="space-y-10">
        <div className="glass-panel energy-frame overflow-hidden rounded-[2.4rem] border border-[#1B303C]/10 bg-white shadow-[0_32px_120px_rgba(27,48,60,0.12)]">
          <div className="grid gap-10 px-8 py-10 xl:grid-cols-[minmax(0,1.28fr)_minmax(21rem,0.72fr)] md:px-12 md:py-14">
            <div className="space-y-8">
              <div className="space-y-5">
                <Badge variant="outline" className="mission-chip w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.32em]">
                  CHCG EnableOS mission hub
                </Badge>
                <div className="max-w-[56rem] space-y-4">
                  <h1 className="max-w-[12ch] text-[2.95rem] font-semibold tracking-tight text-[#1B303C] md:text-[3.95rem] md:leading-[1.04] xl:text-[4.45rem]">
                    Turn enablement into a live performance mission, not a static training portal.
                  </h1>
                  <p className="max-w-3xl text-base leading-8 text-[#4A6373] md:text-[1.14rem]">
                    CHCG EnableOS now frames learning, coaching, and governance as one connected operating system with searchable missions, visible momentum, and role-specific decision support across every client workspace.
                  </p>
                </div>
                <div className="space-y-5 rounded-[1.9rem] border border-[#1B303C]/10 bg-[#F7F8FA] p-5 xl:p-6">
                  <div className="grid gap-3 xl:grid-cols-2">
                    <Link href="/learner" className="min-w-0">
                      <Button className="min-h-[3.5rem] w-full justify-between rounded-[1.35rem] bg-[#1B303C] px-5 py-3 text-left text-[14px] font-medium leading-5 text-white hover:bg-[#243f4d] xl:text-[15px]">
                        <span className="min-w-0 whitespace-normal">{viewer.data ? "Resume my enablement mission" : "Sign in for client mission access"}</span>
                        <ArrowRight className="ml-3 h-4 w-4 shrink-0" />
                      </Button>
                    </Link>
                    <Link href="/training" className="min-w-0">
                      <Button variant="outline" className="min-h-[3.5rem] w-full justify-start rounded-[1.35rem] border-[#1B303C]/14 bg-white px-5 py-3 text-left text-[14px] font-medium leading-5 text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C] xl:text-[15px]">
                        <span className="min-w-0 whitespace-normal">Preview interactive training simulator</span>
                      </Button>
                    </Link>
                  </div>
                  <div className="rounded-[1.4rem] border border-[#FCBC34]/25 bg-white px-4 py-3.5">
                    <p className="max-w-[62rem] text-[15px] leading-7 text-[#4A6373] xl:text-[1.02rem]">
                      {viewerAccess.data
                        ? `Signed in to ${viewerAccess.data.tenant.name}. This account only sees the client-specific workspaces and training access granted to ${viewerAccess.data.permittedRoles.join(", ")}.`
                        : "After sign-in, users only see the client-specific trainings and workspaces assigned to their account rather than a shared cross-client training selector."}
                    </p>
                  </div>
                </div>
                <div className="glass-panel max-w-3xl space-y-3 rounded-[1.8rem] border border-[#1B303C]/10 bg-white p-4 md:p-5">
                  <label className="block space-y-2 text-sm text-[#1B303C]">
                    <span>Search missions, training tracks, and workspaces</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-[#1B303C]/10 bg-[#F7F8FA] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                      <Search className="h-4 w-4 text-[#4A6373]" />
                      <input
                        value={landingSearchQuery}
                        onChange={(event) => setLandingSearchQuery(event.target.value)}
                        placeholder="Search Service Foundations, Workflow Precision, KPI, coaching, learner..."
                        className="w-full bg-transparent text-[#1B303C] outline-none placeholder:text-[#4A6373]"
                      />
                    </div>
                  </label>
                  {landingSearchQuery.trim() ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {landingSearchResults.length > 0 ? landingSearchResults.map((result) => (
                        <Link key={`${result.href}-${result.title}`} href={result.href}>
                          <button type="button" className="w-full rounded-[1.35rem] border border-[#1B303C]/10 bg-[#F7F8FA] p-4 text-left transition hover:border-[#FCBC34]/30 hover:bg-white">
                            <p className="text-sm font-medium text-[#1B303C]">{result.title}</p>
                            <p className="mt-2 text-xs leading-5 text-[#4A6373]">{result.subtitle}</p>
                            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#4A6373]">{result.cta}</p>
                          </button>
                        </Link>
                      )) : (
                        <div className="rounded-[1.35rem] border border-[#1B303C]/10 bg-[#F7F8FA] p-4 text-sm text-[#4A6373] md:col-span-2">
                          No training or workspace results match that search yet. Try a track name, role, or skill keyword.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {Object.values(roleMeta).map((item: any) => (
                    <Link key={item.route} href={item.route} className="min-w-0">
                      <Button variant="outline" className="min-h-[3.75rem] h-auto w-full justify-center rounded-[1.25rem] border-white/12 bg-white/6 px-3.5 py-3 text-center text-[12.5px] font-medium leading-[1.35] text-white hover:bg-white/12 hover:text-white xl:px-4 xl:text-[13px] 2xl:text-[13.5px]">
                        <span className="min-w-0 whitespace-normal">Secure {item.eyebrow} workspace</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {landing.data?.featuredMetrics.map((item: any) => (
                  <MetricCard
                    key={item.label}
                    label={item.label}
                    value={String(item.value)}
                    supporting="Grounded in the CHCG methodology and intervention model."
                    icon={<Sparkles className="h-4 w-4" />}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {featuredTenants.map((tenant: any) => (
                <PremiumCard key={tenant.id} className="relative overflow-hidden">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-sm font-medium text-white">
                        {tenant.logoMark}
                      </div>
                      <Badge className="mission-chip rounded-full border-white/10 bg-white/8 text-slate-200">{tenant.industry}</Badge>
                    </div>
                    <div>
                      <CardTitle className="text-xl text-white">{tenant.name}</CardTitle>
                      <CardDescription className="mt-2 text-slate-300">{tenant.description}</CardDescription>
                    </div>
                  </CardHeader>
                </PremiumCard>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "Signal-to-action missions",
              description: "Live KPI and QA cues now feed training, interventions, and coaching steps as one connected operating rhythm.",
              icon: <Gauge className="h-5 w-5" />,
            },
            {
              title: "Role-tuned command views",
              description: "Executives, managers, learners, and client admins each get a distinct interface with the right missions, urgency, and decision context.",
              icon: <Users2 className="h-5 w-5" />,
            },
            {
              title: "Guided coaching intelligence",
              description: "AI-assisted prompts, simulation cues, and human override controls keep the product dynamic without feeling opaque or over-automated.",
              icon: <Bot className="h-5 w-5" />,
            },
          ].map((item: any) => (
            <PremiumCard key={item.title}>
              <CardHeader>
                <div className="reward-ring mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/16 bg-gradient-to-br from-cyan-300/18 via-sky-400/10 to-violet-500/12 text-white">{item.icon}</div>
                <CardTitle className="text-white">{item.title}</CardTitle>
                <CardDescription className="text-slate-300">{item.description}</CardDescription>
              </CardHeader>
            </PremiumCard>
          ))}
        </div>

        <PremiumCard>
          <CardHeader className="space-y-4">
            <Badge className="mission-chip w-fit rounded-full text-slate-200">CHCG learning architecture</Badge>
            <div className="max-w-3xl space-y-3">
              <CardTitle className="text-2xl text-white">Five mission-ready learning tracks now power the EnableOS story.</CardTitle>
              <CardDescription className="text-base leading-7 text-slate-300">The experience is now framed around original CHCG mission tracks for frontline service, workflow execution, leadership decision quality, performance governance, and recognition-led engagement.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-5">
            {filterTrainingRecords([
              { title: "Soft Skills & Customer/Patient Service Foundation", subtitle: "Empathy, professionalism, de-escalation, and trust-building behaviors for frontline performance.", keywords: ["service foundations", "learner", "soft skills"] },
              { title: "Quality Assurance Essentials", subtitle: "Verification, QA discipline, documentation accuracy, transfers, and clean execution habits.", keywords: ["workflow precision", "qa", "manager"] },
              { title: "Unlocking the power of date", subtitle: "KPI reading, trend interpretation, root-cause analysis, and action ownership.", keywords: ["data", "kpi", "executive"] },
              { title: "Maximizing performance through performance management", subtitle: "Calibration, coaching cadence, review structure, and measurable improvement planning.", keywords: ["performance", "reviews", "coaching"] },
              { title: "Gamification & Work From Home", subtitle: "Recognition loops, pulse checks, gamified momentum, and hybrid-team operating rhythm.", keywords: ["engagement", "recognition", "remote teams"] },
            ], landingSearchQuery).map((track: any) => (
              <div key={track.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Track</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{track.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{track.subtitle}</p>
              </div>
            ))}
          </CardContent>
        </PremiumCard>
      </div>
    </Surface>
  );
}

export function RoleWorkspace({ role }: { role: DemoRole }) {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const queryMap: Record<DemoRole, any> = {
    executive: trpc.demo.secureExecutive.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) }),
    manager: trpc.demo.secureManager.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) }),
    coach: trpc.demo.secureCoach.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) }),
    learner: trpc.demo.secureLearner.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) }),
    client_admin: trpc.demo.secureAdmin.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) }),
  };

  const query = queryMap[role];
  const meta = roleMeta[role];
  const learnerPerspectiveNotice = role === "learner"
    ? getLearnerWorkspacePerspectiveNotice(access.data?.grant.role)
    : null;
  const canAccessRequestedRole = access.data ? access.data.permittedRoles.includes(role) : false;
  const refreshWorkspace = () => {
    void access.refetch();
    void query.refetch();
  };

  return (
    <Surface>
      <SectionShell
        eyebrow={meta.eyebrow}
        title={meta.title}
        description={meta.subtitle}
        actions={
          <>
            {access.data ? (
              <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
                {access.data.tenant.name}
              </Badge>
            ) : null}
            <Link href="/">
              <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                Back to overview
              </Button>
            </Link>
          </>
        }
      >
        {access.isLoading || query.isLoading ? <LoadingState /> : null}
        {!access.isLoading && !access.data ? (
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">No client access has been assigned yet.</CardTitle>
              <CardDescription className="text-slate-300">Sign in with a client-mapped account to load tenant-specific workspaces and purchased training access.</CardDescription>
            </CardHeader>
          </PremiumCard>
        ) : null}
        {!access.isLoading && canAccessRequestedRole && learnerPerspectiveNotice ? (
          <PremiumCard className="border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.96))]">
            <CardContent className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">{learnerPerspectiveNotice.eyebrow}</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{learnerPerspectiveNotice.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-100">{learnerPerspectiveNotice.description}</p>
              </div>
              <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Learner shell active</Badge>
            </CardContent>
          </PremiumCard>
        ) : null}
        {!access.isLoading && access.data && !canAccessRequestedRole ? (
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">This workspace is outside your current entitlement.</CardTitle>
              <CardDescription className="text-slate-300">Your signed-in account is limited to the client and role access assigned to {access.data.tenant.name}. Use the routes your role has been granted or sign in with a different client account.</CardDescription>
            </CardHeader>
          </PremiumCard>
        ) : null}
        {!query.isLoading && canAccessRequestedRole && role === "executive" && query.data ? <ExecutivePanel data={query.data} onUpdated={refreshWorkspace} /> : null}
        {!query.isLoading && canAccessRequestedRole && role === "manager" && query.data ? <ManagerPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
        {!query.isLoading && canAccessRequestedRole && role === "coach" && query.data ? <CoachPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
        {!query.isLoading && canAccessRequestedRole && role === "learner" && query.data ? <LearnerPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
        {!query.isLoading && canAccessRequestedRole && role === "client_admin" && query.data ? <AdminPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
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
  const learner = trpc.demo.secureTraining.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
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
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [briefTransitionDirection, setBriefTransitionDirection] = useState<"forward" | "backward">("forward");
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

  const trainingProgressStorageKey = useMemo(() => buildTrainingProgressStorageKey({
    tenantId,
    requestedRoleFilter,
    requestedJourneyId,
    requestedModuleId,
    requestedAssignmentId,
    previewScenarioId,
  }), [previewScenarioId, requestedAssignmentId, requestedJourneyId, requestedModuleId, requestedRoleFilter, tenantId]);

  useEffect(() => {
    setLessonPageIndex(0);
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

    const basePreviewScenarios = access.data?.grant.role === "learner"
      ? allPreviewScenarios.slice(0, 1)
      : allPreviewScenarios;

    return filterTrainingPreviewScenariosByRole(basePreviewScenarios, roleFilter);
  }, [access.data?.grant.role, liveJourney, learner.data?.nextCoachingSession.title, roleFilter]);

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
          label: "Brief",
          title: "Frame the learning objective",
          body: `This ${selectedModule.format.toLowerCase()} turns ${selectedModule.skillFocus.toLowerCase()} into a guided practice sequence inside ${effectiveJourneyTitle}.`,
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
    setTimerStartedAt(Date.now());
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
  const currentStageItemLabel = `${currentStage?.label ?? "Lesson"} ${currentStagePages.length > 0 ? lessonPageIndex + 1 : 0}`;
  const currentStageItemCountLabel = currentStagePages.length > 0 ? `${lessonPageIndex + 1} of ${currentStagePages.length}` : "No pages loaded";
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
    setTimerStartedAt(Date.now());
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
        eyebrow="Interactive Training"
        title="Interactive training simulator"
        description="This view shows how CHCG and tenant-specific content are reformatted into a guided learning sequence with briefing, practice, live-work application, and reflection moments."
        actions={
          <>
            {access.data ? (
              <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
                {access.data.tenant.name}
              </Badge>
            ) : null}
            <Link href="/learner">
              <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                Back to learner
              </Button>
            </Link>
          </>
        }
      >
        {access.isLoading || learner.isLoading ? <LoadingState /> : null}
        {!learner.isLoading && learner.data && selectedModule ? (
          <div className="space-y-6">
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

            <PremiumCard>
              <CardContent className="flex flex-col gap-4 px-6 py-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Training family preview</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Review every module family directly in the course player</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Use these preview states to inspect the richer workflow, leadership, performance, and engagement visuals in the same training shell instead of validating only the default learner path.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {requestedRoleLabel ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Role-chip launch · {requestedRoleLabel}</Badge> : null}
                    <Badge className="rounded-full border-white/10 bg-white/8 text-slate-100">{activePreview?.eyebrow ?? "Training preview"}</Badge>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {TRAINING_ROLE_FILTER_OPTIONS.map((option) => (
                    <Button
                      key={`training-role-filter-${option.value}`}
                      type="button"
                      variant="outline"
                      onClick={() => setRoleFilter(option.value)}
                      className={`rounded-full border-white/10 ${roleFilter === option.value ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-5">
                  {previewScenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => setPreviewScenarioId(scenario.id)}
                      className={`flex h-full min-h-[14.5rem] flex-col rounded-[1.5rem] border p-5 text-left transition ${previewScenarioId === scenario.id ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_16px_40px_rgba(34,211,238,0.12)]" : "border-white/10 bg-white/5 hover:bg-white/8"}`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{scenario.eyebrow}</p>
                      <p className="mt-3 text-base font-medium leading-7 text-white">{scenario.label}</p>
                      <p className="mt-3 break-words text-sm leading-7 text-slate-300">{scenario.description}</p>
                    </button>
                  ))}
                </div>
                {requestedRoleLabel || recentUnlockMoment ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm text-slate-300">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Active training launch filter</p>
                      <p className="mt-2 font-medium text-white">{requestedRoleLabel ? `${requestedRoleLabel} context is pinned into this preview.` : "Current preview is being reviewed without a role-chip launch filter."}</p>
                      <p className="mt-2 leading-6 text-slate-400">{requestedRoleLabel ? "This makes the role-chip handoff from the content library visible in the course player so stakeholders can see exactly which audience lens shaped the module preview." : "Use a role chip from the content library to show which audience lens carried into the guided training preview."}</p>
                    </div>
                    <div className={`rounded-[1.35rem] border px-4 py-4 text-sm ${recentUnlockMoment ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-slate-300"}`}>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Latest unlock moment</p>
                      <p className="mt-2 font-medium text-white">{recentUnlockMoment?.title ?? "Complete the next inline knowledge check to surface the next module achievement signal."}</p>
                      <p className={`mt-2 leading-6 ${recentUnlockMoment ? "text-emerald-100" : "text-slate-400"}`}>{recentUnlockMoment?.detail ?? "This panel gives the guided training flow a more presentation-ready sense of momentum after each comprehension checkpoint is cleared."}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </PremiumCard>

            <PremiumCard className="overflow-hidden">
              <CardContent className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(15,23,42,0.92))] p-6 shadow-[0_24px_80px_rgba(8,15,35,0.24)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Continue learning</Badge>
                    <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedModule.format}</Badge>
                    <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">Stage {stageIndex + 1} of {stages.length}</Badge>
                  </div>
                  <div className="mt-5 max-w-3xl">
                    <p className="text-sm uppercase tracking-[0.26em] text-cyan-100/70">Current learning path</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{selectedModule.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-200">{presentation?.heroSummary ?? `Continue progressing through ${selectedModule.title} so the learner can connect course content, workflow evidence, and coaching action without leaving the platform.`}</p>
                  </div>
                  <label className="mt-6 block max-w-2xl space-y-2 text-sm text-slate-200">
                    <span>Search this training path</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                      <Search className="h-4 w-4 text-cyan-100/70" />
                      <input
                        value={trainingSearchQuery}
                        onChange={(event) => setTrainingSearchQuery(event.target.value)}
                        placeholder="Search by training name, skill focus, format, or role preview"
                        className="w-full bg-transparent text-white outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </label>
                  <div className="mt-6 space-y-4">
                    <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-slate-950/50 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Journey momentum</p>
                          <p className="mt-2 text-2xl font-semibold text-white">{overallProgress}% complete</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current checkpoint</p>
                          <p className="mt-2 text-sm font-medium text-white">{currentStage?.label}</p>
                        </div>
                      </div>
                      <Progress value={overallProgress} className="h-2.5 bg-white/8" />
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Modules completed</p>
                          <p className="mt-2 text-xl font-semibold text-white">{completedModuleCount}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current page</p>
                          <p className="mt-2 text-xl font-semibold text-white">{currentStagePages.length > 0 ? `${lessonPageIndex + 1}/${currentStagePages.length}` : "Ready"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Guided runtime</p>
                          <p className="mt-2 text-lg font-semibold text-white">{guidedPlan.targetDurationLabel}</p>
                          <p className="mt-1 text-xs text-slate-400">{guidedPlan.family === "leadership" ? "Leadership workshop depth" : "Learner pathway depth"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Guided slides</p>
                          <p className="mt-2 text-xl font-semibold text-white">{guidedPlan.slideCount}</p>
                          <p className="mt-1 text-xs text-slate-400">Brief, practice, and transfer sequence</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Quiz moments</p>
                          <p className="mt-2 text-xl font-semibold text-white">{guidedPlan.quizTriggers.length}</p>
                          <p className="mt-1 text-xs text-slate-400">Interleaved comprehension gates</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Next unlock</p>
                        <p className="mt-2 text-sm font-medium text-white">{activeQuizTrigger ? activeQuizTrigger.label : currentStage?.title}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{activeQuizTrigger ? activeQuizTrigger.modalPrompt : "Advance through the narrated lesson pages to unlock the next inline knowledge check."}</p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-cyan-100/75">
                          {activeQuizTrigger ? `Attached to page ${activeQuizTrigger.pageIndex + 1} of ${activeQuizTrigger.pageCount}` : currentStagePages.length > 0 ? `Current stage spans ${currentStagePages.length} guided pages` : "Stage pacing will appear when the lesson loads"}
                        </p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recommended next</p>
                        <p className="mt-2 text-sm font-medium text-white">{nextRecommendedModule?.title ?? "Complete the current module to unlock the next guided lesson."}</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 sm:col-span-2 xl:col-span-1">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Certification signal</p>
                        <p className="mt-2 text-sm font-medium text-white">{atJourneyEnd ? "Final reflection is available once your current entry is complete." : "Progress is being tracked toward the next coaching-ready milestone."}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">Each passed inline knowledge check strengthens completion confidence before the module closes.</p>
                      </div>
                      <div className="rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 sm:col-span-2 xl:col-span-2">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/70">Presentation-quality pacing</p>
                        <p className="mt-2 text-sm font-medium text-white">{guidedPlan.pacingLabel}</p>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {guidedPlan.stageDurations.map((stagePlan) => (
                            <div key={stagePlan.stageId} className={`rounded-[1.1rem] border px-3 py-3 ${stagePlan.stageId === currentStage?.id ? "border-cyan-300/30 bg-cyan-300/10" : "border-white/10 bg-slate-950/35"}`}>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{stagePlan.label}</p>
                              <p className="mt-2 text-sm font-medium text-white">{stagePlan.durationLabel}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 sm:col-span-2 xl:col-span-1">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Narration mode</p>
                        <p className="mt-2 text-sm font-medium text-white">Voice guidance stays aligned to the active guided page instead of acting as a separate audio-only track.</p>
                      </div>
                    </div>
                  </div>
                </div>
                  <div className="grid gap-4">
                  <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.82))] p-5 shadow-[0_22px_60px_rgba(8,15,35,0.22)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-100"><Users2 className="h-5 w-5" /></div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Coach checkpoint</p>
                          <p className="mt-1 text-lg font-medium text-white">{effectiveCoachingTitle}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-white/15 bg-white/8 text-slate-100 hover:bg-white/12"
                        onClick={() => setCoachCheckpointOpen((current) => !current)}
                      >
                        {coachCheckpointOpen ? "Hide checkpoint" : "Open checkpoint"}
                      </Button>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-200">{coachPromptPreview}</p>
                    <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                      {reflectionPromptPreview}
                    </div>
                    {coachCheckpointOpen ? (
                      <div className="mt-4 space-y-4 rounded-[1.3rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Checkpoint response</p>
                            <p className="mt-2 text-sm leading-6 text-slate-100">Capture what the coach should look for next and how the learner will apply this behavior in live work.</p>
                          </div>
                          <Badge className={`rounded-full ${coachCheckpointSubmitted ? (coachCheckpointPassed ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100" : "border-amber-400/20 bg-amber-500/15 text-amber-100") : coachCheckpointReady ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/8 text-slate-200"}`}>
                            {coachCheckpointSubmitted ? `${coachCheckpointEvaluation.score}% · ${coachCheckpointPassed ? "Pass" : "Retry"}` : coachCheckpointReady ? "Ready for review" : `${coachCheckpointWordCount} words captured`}
                          </Badge>
                        </div>
                        <Textarea
                          value={coachCheckpointNote}
                          onChange={(event) => {
                            setCoachCheckpointNote(event.target.value);
                            setCoachCheckpointSubmitted(false);
                          }}
                          rows={5}
                          autoFocus
                          className="w-full rounded-2xl border-white/10 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500"
                          placeholder="Example: In the next coaching review, listen for a slower opening, one sentence that names the customer concern, and a clear next-step commitment before the rep moves into the solution."
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs leading-5 text-slate-300">Use the review action to lock this note as the checkpoint response for the current module stage.</p>
                          <Button
                            type="button"
                            className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-400"
                            disabled={!coachCheckpointReady}
                            onClick={submitCoachCheckpointForReview}
                          >
                            {coachCheckpointSubmitted ? (coachCheckpointPassed ? "Passed and advancing" : "Review again after edits") : "Submit for coach review"}
                          </Button>
                        </div>
                        {coachCheckpointSubmitted ? (
                          <div className={`rounded-[1.2rem] px-4 py-4 text-sm ${coachCheckpointPassed ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border border-amber-400/20 bg-amber-500/10 text-amber-100"}`}>
                            <p className={`text-[11px] uppercase tracking-[0.22em] ${coachCheckpointPassed ? "text-emerald-200/80" : "text-amber-200/80"}`}>Checkpoint review status</p>
                            <p className="mt-2 font-medium text-white">{coachCheckpointPassed ? `Grade: ${coachCheckpointEvaluation.score}% — passed.` : `Grade: ${coachCheckpointEvaluation.score}% — revise and retry.`}</p>
                            <p className={`mt-2 leading-6 ${coachCheckpointPassed ? "text-emerald-100" : "text-amber-100"}`}>Review summary: {coachCheckpointNote}</p>
                            <div className="mt-3 space-y-2">
                              {coachCheckpointPassed ? coachCheckpointEvaluation.strengths.slice(0, 2).map((strength) => (
                                <p key={strength} className="text-xs leading-5 text-white/85">{strength}</p>
                              )) : coachCheckpointEvaluation.feedback.map((item) => (
                                <p key={item} className="text-xs leading-5 text-white/85">{item}</p>
                              ))}
                            </div>
                            <p className={`mt-3 text-xs leading-5 ${coachCheckpointPassed ? "text-emerald-100/90" : "text-amber-100/90"}`}>{coachCheckpointPassed ? "The learner will move to the next training section automatically." : "Update the note until it clearly states the observable behavior, evidence, and timing the coach should review."}</p>
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Typing status</p>
                            <p className="mt-2 font-medium text-white">{coachCheckpointSubmitted ? (coachCheckpointPassed ? "Checkpoint passed and is advancing." : "Checkpoint needs revision before it can pass.") : coachCheckpointNote.trim().length > 0 ? "Checkpoint entry is active." : "Open the checkpoint and begin typing."}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">Your notes stay in the training flow so the checkpoint feels like an in-product coaching interaction instead of static text.</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-300">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Coach readiness</p>
                            <p className="mt-2 font-medium text-white">{coachCheckpointSubmitted ? `${coachCheckpointEvaluation.passedCriteria} of ${coachCheckpointEvaluation.totalCriteria} grading signals met.` : coachCheckpointReady ? "Observable follow-up is documented." : "Add a specific coached behavior and proof point."}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-400">A strong checkpoint response should describe what a coach can hear, see, or verify in the next live workflow moment.</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-slate-100"><Bell className="h-5 w-5" /></div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Learner signals</p>
                          <p className="mt-1 text-sm font-medium text-white">A recommendation-style LMS summary keeps the next action visible.</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-slate-100"><Sparkles className="h-5 w-5" /></div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Achievement layer</p>
                          <p className="mt-1 text-sm font-medium text-white">{completedModuleCount}/{modules.length} modules are already above an 80% completion threshold.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard label="Modules in path" value={String(modules.length)} supporting={effectiveJourneyTitle} icon={<BookOpen className="h-4 w-4" />} />
              <MetricCard label="Current module" value={`${moduleIndex + 1}/${modules.length}`} supporting={selectedModule.title} icon={<Target className="h-4 w-4" />} />
              <MetricCard label="Interactive progress" value={`${overallProgress}%`} supporting={`Stage ${stageIndex + 1} of ${stages.length}`} icon={<Sparkles className="h-4 w-4" />} />
              <MetricCard label="Mapped assets" value={String(supportingAssets.length)} supporting="CHCG and tenant materials blended into this lesson" icon={<Layers3 className="h-4 w-4" />} />
            </div>

            {trainingVisuals.length > 0 ? (
              <PremiumCard className="overflow-hidden">
                <CardHeader className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.42))] pb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">No deck download required</Badge>
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{moduleFamilyLabel}</Badge>
                      </div>
                      <CardTitle className="mt-4 text-white">Presentation visuals inside the platform</CardTitle>
                      <CardDescription className="mt-2 text-slate-300">The training now opens with a dedicated slide stage, deck-backed storyline, and embedded evidence panels so learners can stay inside a focused course-player instead of leaving EnableOS to inspect presentation files.</CardDescription>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Visual pages</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{trainingVisuals.length}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Evidence graphs</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{insightCharts.length}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Mapped assets</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{supportingAssets.length}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 p-6 2xl:grid-cols-[minmax(0,1.28fr)_minmax(320px,0.72fr)]">
                  <div className="space-y-4">
                    {featuredDeckVisual ? (
                      <div className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),rgba(2,6,23,0.94))] shadow-[0_32px_90px_rgba(8,15,35,0.3)]">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/75">Course stage visual</p>
                            <p className="mt-1 text-sm text-slate-300">{featuredDeckVisual.pageLabel} · {featuredDeckVisual.sourceDeck}</p>
                          </div>
                          <Badge variant="outline" className="rounded-full border-white/10 bg-white/8 text-slate-100">Primary learning canvas</Badge>
                        </div>
                        <div className="bg-slate-950/90 p-4 sm:p-5">
                          <div className="flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/8 bg-slate-950/80 px-4 py-4 sm:min-h-[22rem] sm:px-6 sm:py-5 lg:min-h-[26rem]">
                            <TrainingVisualFrame visual={featuredDeckVisual} />
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.76))] p-5 shadow-[0_18px_45px_rgba(8,15,35,0.18)]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-2xl">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Focused course visual sync</p>
                          <h3 className="mt-2 text-lg font-medium text-white">The active brief now drives the visual context</h3>
                          <p className="mt-3 text-sm leading-6 text-slate-300">The broad brief, practice, and apply gallery has been removed from this area so the learner stays anchored to the focused brief panel. The canvas and supporting visual context now follow the active lesson page instead of asking the learner to scan a second visual list.</p>
                        </div>
                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{trainingVisuals.length} mapped visuals in course memory</Badge>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current course visual</p>
                          <p className="mt-2 text-sm font-medium text-white">{featuredDeckVisual?.pageLabel ?? "Visual loading"}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{featuredDeckVisual?.title ?? "The current brief will populate the active learning visual here."}</p>
                        </div>
                        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current stage</p>
                          <p className="mt-2 text-sm font-medium text-white">{currentStage?.label ?? "Stage loading"}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{currentStage?.title ?? "The focused brief panel controls stage-by-stage movement through the lesson."}</p>
                        </div>
                        <div className="rounded-[1.2rem] border border-cyan-400/20 bg-cyan-400/10 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/75">Primary navigation</p>
                          <p className="mt-2 text-sm font-medium text-white">Use the brief panel and next-step controls</p>
                          <p className="mt-2 text-sm leading-6 text-slate-100">Learners now move with the focused brief cards and the guided next or previous actions rather than a separate thumbnail gallery.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {featuredDeckVisual ? (
                      <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.82))] p-5 shadow-[0_22px_60px_rgba(8,15,35,0.22)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{featuredDeckVisual.pageLabel}</Badge>
                          <Badge className="rounded-full border-[#FCBC34]/20 bg-[#FCBC34]/12 text-[#FCBC34]">{featuredDeckVisual.sourceDeck}</Badge>
                        </div>
                        <h3 className="mt-4 text-2xl font-semibold text-white">{featuredDeckVisual.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-300">{featuredDeckVisual.caption}</p>
                        <div className="mt-5 grid gap-3">
                          <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/60 p-4">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">How this visual is used</p>
                            <p className="mt-2 text-sm leading-6 text-slate-200">The selected slide anchors the lesson narrative, gives the learner the original deck framing, and acts as the reference image beside each instructional page as the course advances.</p>
                          </div>
                          {activeChart ? (
                            <div className="rounded-[1.25rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">Current evidence graphic</p>
                              <p className="mt-2 text-sm font-medium text-white">{activeChart.title}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-200">{activeChart.description}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Embedded course artifact</p>
                      <h3 className="mt-3 text-lg font-medium text-white">The deck visuals now behave like in-product learning media</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-300">Instead of a download-first flow, the learner enters a guided presentation stage, moves through mapped lesson pages, sees aligned evidence graphics, and carries the source visuals into practice, application, and reflection moments.</p>
                    </div>
                  </div>
                </CardContent>
              </PremiumCard>
            ) : null}

            <div className="grid gap-6 2xl:grid-cols-[340px_minmax(0,1fr)]">
              <PremiumCard className="2xl:sticky 2xl:top-6">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-white">Learning path navigator</CardTitle>
                      <CardDescription className="text-slate-400">A more persistent LMS-style rail keeps the journey sequence, completion status, and next recommendation visible while the learner moves through the module.</CardDescription>
                    </div>
                    <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{completedModuleCount}/{modules.length} complete</Badge>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto pr-1">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Competency gap</p>
                    <p className="mt-2 text-xl font-semibold text-white">{learner.data.activeJourney.competencyGap}</p>
                    <Progress value={learner.data.activeJourney.progress} className="mt-4 h-2 bg-white/8" />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recommended next</p>
                        <p className="mt-2 text-sm font-medium text-white">{nextRecommendedModule?.title ?? "Stay focused on the current module until the final reflection is complete."}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Current checkpoint</p>
                        <p className="mt-2 text-sm font-medium text-white">{currentStage?.title}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/80">{guidedPlan.stageDurations.find((entry) => entry.stageId === currentStage?.id)?.durationLabel ?? "Runtime calibration loading"}</p>
                      </div>
                    </div>
                  </div>
                  {filteredModuleEntries.length > 0 ? filteredModuleEntries.map((module: any) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setModuleIndex(module.originalIndex)}
                      className={`w-full rounded-[1.6rem] border px-4 py-4 text-left transition ${module.originalIndex === moduleIndex ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_18px_45px_rgba(6,182,212,0.12)]" : "border-white/10 bg-white/5 hover:bg-white/8"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{module.format}</p>
                            {module.originalIndex === moduleIndex ? <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">In progress</Badge> : null}
                            {module.originalIndex < moduleIndex ? <Badge className="rounded-full border-emerald-400/20 bg-emerald-400/10 text-emerald-100">Completed path</Badge> : null}
                            {module.originalIndex === moduleIndex + 1 ? <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Up next</Badge> : null}
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-lg font-medium text-white">{module.title}</h3>
                          <p className="mt-2 line-clamp-3 text-sm text-slate-300">{module.skillFocus}</p>
                        </div>
                        <Badge className="shrink-0 rounded-full border-white/10 bg-white/8 text-slate-200">{module.durationMinutes} min</Badge>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                        <span>{module.originalIndex === moduleIndex ? `Stage ${stageIndex + 1} active` : "Completion"}</span>
                        <span>{module.completionRate}%</span>
                      </div>
                      <Progress value={module.completionRate} className="mt-2 h-2 bg-white/8" />
                    </button>
                  )) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">
                      No modules match this training search yet. Try a broader keyword or switch to another role-aligned preview.
                    </div>
                  )}
                </CardContent>
              </PremiumCard>

              <div className="space-y-6">
                <PremiumCard>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-white">{currentStage?.title}</CardTitle>
                        <CardDescription className="text-slate-400">{currentStage?.body}</CardDescription>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{currentStage?.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-4">
                      {stages.map((stage, index) => {
                        const stagePlan = guidedPlan.stageDurations.find((entry) => entry.stageId === stage.id);
                        return (
                          <div key={stage.id} className={`rounded-2xl border px-3 py-3 text-sm ${index === stageIndex ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-white/10 bg-white/5 text-slate-300"}`}>
                            <p className="font-medium">{stage.label}</p>
                            <p className="mt-1 text-xs text-slate-400">Step {index + 1}</p>
                            {stagePlan ? <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/80">{stagePlan.durationLabel}</p> : null}
                          </div>
                        );
                      })}
                    </div>

                    {currentStagePages.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                          <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.65))] px-5 py-5 shadow-[0_18px_50px_rgba(8,15,35,0.18)]">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentStage?.label}</Badge>
                                <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{moduleFamilyLabel}</Badge>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lesson page</p>
                                <p className="mt-1 text-sm text-slate-300">Page {lessonPageIndex + 1} of {currentStagePages.length} in this course section.</p>
                                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-cyan-100/80">
                                  {guidedPlan.stageDurations.find((entry) => entry.stageId === currentStage?.id)?.durationLabel ?? "Stage runtime calibrating"}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="h-2 min-w-[14rem] flex-1 overflow-hidden rounded-full bg-white/8">
                                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500" style={{ width: `${lessonPageProgress}%` }} />
                                </div>
                                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">{lessonPageProgress}% section complete</p>
                                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                  {Math.max(currentStagePages.length - (lessonPageIndex + 1), 0)} guided pages remaining
                                </p>
                                {activeQuizTrigger ? <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Upcoming checkpoint: {activeQuizTrigger.label}</p> : null}
                              </div>
                            </div>
                          </div>
                          <div className="rounded-[1.9rem] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(15,23,42,0.92))] px-5 py-5 shadow-[0_20px_60px_rgba(8,15,35,0.2)]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="max-w-2xl">
                                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/75">{stageNavigatorLabel}</p>
                                <h4 className="mt-2 text-lg font-medium text-white">{currentLessonPage?.title ?? currentStageItemLabel}</h4>
                                <p className="mt-2 text-sm leading-6 text-slate-300">The opening lesson now stays in the main course flow so learners move through the guidance without stopping at a separate brief-box section.</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{currentStageItemCountLabel}</Badge>
                                <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{briefCompletionStatus.statusLabel}</Badge>
                              </div>
                            </div>
                            <div
                              key={`${currentStage?.id ?? "stage"}-${lessonPageIndex}`}
                              ref={briefCardRef}
                              className="mt-4 rounded-[1.45rem] border border-cyan-400/30 bg-slate-950/65 px-5 py-5 shadow-[0_22px_48px_rgba(34,211,238,0.12)]"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="max-w-2xl">
                                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/75">Current lesson focus</p>
                                  <h5 className="mt-2 text-base font-semibold text-white">{currentLessonPage?.title ?? "Lesson loading"}</h5>
                                </div>
                                <p className="text-sm font-semibold text-cyan-100">{briefCompletionStatus.percentComplete}%</p>
                              </div>
                              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900/70">
                                <div
                                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.95),rgba(125,211,252,0.95))] transition-[width] duration-300 ease-out"
                                  style={{ width: `${briefCompletionStatus.percentComplete}%` }}
                                />
                              </div>
                              <p className="mt-4 text-sm leading-7 text-slate-200">{currentLessonPage?.narrative ?? "The current lesson page will appear here once the training content is ready."}</p>
                              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-3">
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Sequence pacing</p>
                                  <p className="mt-2 text-sm leading-6 text-slate-300">Each page advances inside the same course surface so the learner stays oriented instead of bouncing between extra containers.</p>
                                </div>
                                <div className="rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-3">
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Up next</p>
                                  <p className="mt-2 text-sm font-medium text-white">{nextLessonPage?.title ?? "Practice checkpoint coming next"}</p>
                                  <p className="mt-2 text-sm leading-6 text-slate-300">{nextLessonPage?.narrative ?? "You are on the final guided page before the next training moment begins."}</p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={retreatLessonPage}
                                disabled={lessonPageIndex === 0}
                                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                              >
                                Previous page
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={advanceLessonPage}
                                disabled={lessonPageIndex >= currentStagePages.length - 1}
                                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                              >
                                Next page
                              </Button>
                              <p className="text-xs leading-5 text-slate-400">The guided opening now lives inside the main lesson canvas while the previous and next controls keep progression straightforward.</p>
                            </div>
                          </div>
                        </div>
                        <div className="sticky bottom-4 z-20 mt-6 rounded-[1.5rem] border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(8,145,178,0.18),rgba(15,23,42,0.94))] px-4 py-4 shadow-[0_20px_60px_rgba(8,15,35,0.35)] backdrop-blur-xl">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Mini audio bar</Badge>
                                <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentStage?.label ?? "Lesson"}</Badge>
                                {activeQuizTrigger ? <Badge className="rounded-full border-amber-400/20 bg-amber-400/10 text-amber-100">Next gate · {activeQuizTrigger.label}</Badge> : null}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">{miniAudioBarTitle}</p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">{narrationScript}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3 lg:items-end">
                              <div className="flex flex-wrap items-center gap-3">
                                <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-500" onClick={playNarrationPreview} disabled={!narrationSupported}>
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Play audio
                                </Button>
                                <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white disabled:bg-white/5 disabled:text-slate-500" onClick={stopNarration} disabled={!narrationSupported || narrationStatus === "idle" || narrationStatus === "unsupported"}>
                                  <PauseCircle className="mr-2 h-4 w-4" />
                                  Stop
                                </Button>
                                <Select value={narrationRate} onValueChange={setNarrationRate}>
                                  <SelectTrigger className="w-[160px] rounded-full border-white/12 bg-slate-950/80 text-slate-100">
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
                              <p className="text-xs text-slate-300 lg:text-right">
                                {narrationStatus === "playing" ? "Reading the current lesson script aloud." : narrationStatus === "ended" ? "Finished reading the current lesson script." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "Persistent narration controls stay available while you move through the lesson."}
                              </p>
                            </div>
                          </div>
                        </div>
                        {currentLessonPage ? (
                          <div className="rounded-[2.1rem] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.12),rgba(15,23,42,0.94))] p-6 shadow-[0_32px_90px_rgba(8,15,35,0.26)] lg:p-8 2xl:p-9">
                            <div className="space-y-8">
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentLessonPage.eyebrow}</Badge>
                                  <span className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">{currentLessonPage.visualTone}</span>
                                </div>
                                <h3 className="mt-4 break-words text-2xl font-semibold text-white">{currentLessonPage.title}</h3>
                                <p className="mt-4 max-w-none break-words text-sm leading-7 text-slate-200 2xl:text-[15px]">{currentLessonPage.narrative}</p>
                                <div className="mt-6 rounded-[1.6rem] border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Narration access</p>
                                      <p className="mt-2 text-sm text-slate-100">Use the persistent mini audio bar to keep lesson narration controls available as you move through every page and stage.</p>
                                    </div>
                                    <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Speaks current lesson script</Badge>
                                  </div>
                                  <p className="mt-3 text-sm text-slate-200">
                                    {narrationStatus === "playing" ? "The mini audio bar is currently reading the active lesson content." : narrationStatus === "ended" ? "The mini audio bar finished reading the active lesson content." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "The mini audio bar is ready to read the content shown on this page."}
                                  </p>
                                </div>
                                <div className="mt-6 grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                                  <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Narrated lesson controls</p>
                                        <h4 className="mt-2 text-lg font-medium text-white">Read this lesson aloud as spoken guidance</h4>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">This player reads the lesson script shown below and keeps narration scoped to the active training content only.</p>
                                      </div>
                                      <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Content narration</Badge>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                      <Badge className="rounded-full border-white/10 bg-white/6 text-slate-200"><Volume2 className="mr-2 h-4 w-4" /> Browser speech preview</Badge>
                                      <Badge className="rounded-full border-white/10 bg-white/6 text-slate-200"><Mic className="mr-2 h-4 w-4" /> Uses lesson script below</Badge>
                                    </div>
                                    <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-slate-200">
                                      Lesson narration now stays inside the guided training flow only, with no uploaded reference recording surfaced in the site experience.
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Narration speed</p>
                                          <p className="mt-1 text-sm text-slate-300">Adjust pacing so the spoken lesson matches the rhythm that works best for this module.</p>
                                        </div>
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
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                      <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-500" onClick={playNarrationPreview} disabled={!narrationSupported}>
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Play lesson narration
                                      </Button>
                                      <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white disabled:bg-white/5 disabled:text-slate-500" onClick={stopNarration} disabled={!narrationSupported || narrationStatus === "idle" || narrationStatus === "unsupported"}>
                                        <PauseCircle className="mr-2 h-4 w-4" />
                                        Stop preview
                                      </Button>
                                      <span className="text-sm text-slate-400">
                                        {narrationStatus === "playing" ? "Reading the current lesson script aloud." : narrationStatus === "ended" ? "Finished reading the current lesson script." : narrationStatus === "unsupported" ? "This browser does not support in-page speech preview." : "Ready to read the current lesson script as audio."}
                                      </span>
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-cyan-400/20 bg-cyan-400/10 p-4">
                                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Lesson narration script</p>
                                      <div className="mt-3 max-h-[16rem] overflow-y-auto pr-2 text-sm leading-7 text-slate-100 break-words">{narrationScript}</div>
                                    </div>
                                    {currentLessonPage.speakerNotes?.length ? (
                                      <div className="mt-4 rounded-[1.4rem] border border-amber-300/20 bg-amber-300/10 p-4">
                                        <p className="text-xs uppercase tracking-[0.22em] text-amber-100/90">Speaker notes</p>
                                        <div className="mt-3 max-h-[16rem] space-y-3 overflow-y-auto pr-2 text-sm leading-7 text-slate-100 break-words">
                                          {currentLessonPage.speakerNotes.map((note) => (
                                            <p key={note}>{note}</p>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.78))] p-5 shadow-[0_18px_45px_rgba(2,8,23,0.18)]">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Narration access</p>
                                      <h4 className="mt-2 text-lg font-medium text-white">Lesson narration stays inside the training experience</h4>
                                      <p className="mt-2 text-sm leading-6 text-slate-300">The guided player now keeps narration focused on the active lesson only. No uploaded voice sample, transcript excerpt, or downloadable reference recording is exposed anywhere in this training view.</p>
                                    </div>
                                    <div className="mt-4 rounded-[1.4rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                                      <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">Privacy safeguard</p>
                                      <p className="mt-3 text-sm leading-6 text-slate-100">Learners can use the in-platform narration controls for lesson playback, while private reference audio remains removed from the visible site experience.</p>
                                    </div>
                                  </div>
                                </div>
                                {lessonVisualSequence.length ? (
                                  <div className="mt-6 rounded-[1.7rem] border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">Visual storyboard</p>
                                        <p className="mt-2 text-sm text-slate-200">Each lesson page now turns the content into a visual sequence so every training step feels more like a guided in-product module.</p>
                                      </div>
                                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{lessonVisualSequence.length} step sequence</Badge>
                                    </div>
                                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
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
                                  </div>
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
                                  <div className="mt-6 rounded-[1.8rem] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,23,42,0.86))] p-5 shadow-[0_24px_60px_rgba(5,46,22,0.18)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/80">Self-guided slide challenge</p>
                                        <h4 className="mt-2 text-lg font-medium text-white">{currentSlideInteraction.title}</h4>
                                        <p className="mt-2 max-w-none text-sm leading-6 text-slate-200 2xl:max-w-[58rem]">{currentSlideInteraction.prompt}</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">{currentSlideInteraction.instructions}</p>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{currentSlideInteraction.kind.replaceAll("_", " ")}</Badge>
                                        <Badge className="rounded-full border-emerald-400/20 bg-emerald-400/10 text-emerald-100">Pass at {currentSlideInteraction.passingPercent}%</Badge>
                                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Progress {slideInteractionProgress}%</Badge>
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
                                              onClick={() => setSlideInteractionAttempt((current) => ({ ...current, selectedChoiceId: choice.id }))}
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
                                      <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                                              <SelectTrigger className="mt-3 border-white/10 bg-slate-950/80 text-slate-100">
                                                <SelectValue placeholder="Choose a matching card" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="unselected">Choose a matching card</SelectItem>
                                                {currentSlideInteraction.choices?.map((choice) => (
                                                  <SelectItem key={choice.id} value={choice.id}>{choice.detail}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        ))}
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
                                    <div className="mt-5 flex flex-wrap items-center gap-3">
                                      <Button type="button" className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={submitSlideInteraction}>
                                        {slideInteractionSubmitted ? (slideInteractionPassed ? "Passed" : "Check again") : "Check slide challenge"}
                                      </Button>
                                      <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white" onClick={resetSlideInteractionForRetry}>
                                        Review slide and retry
                                      </Button>
                                      {currentSlideInteraction.kind === "timed_challenge" && currentSlideInteraction.timeLimitSeconds ? <span className="text-sm text-slate-300">Timer limit: {currentSlideInteraction.timeLimitSeconds} seconds from page load.</span> : null}
                                    </div>
                                    {slideInteractionSubmitted && slideInteractionResult ? (
                                      <div className={`mt-4 rounded-[1.45rem] border p-4 ${slideInteractionPassed ? "border-emerald-400/25 bg-emerald-500/10" : "border-amber-400/25 bg-amber-500/10"}`}>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            <p className={`text-[11px] uppercase tracking-[0.22em] ${slideInteractionPassed ? "text-emerald-200/85" : "text-amber-200/85"}`}>Challenge score</p>
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
                                      <div className="mt-4 rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-slate-300">
                                        Pass this slide challenge before the next guided page unlocks. If you miss the threshold, use the hint, review the page content, and retry.
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
                                      <p className="mt-2 text-sm text-slate-300">Use the focused brief panel or the previous and next controls to keep the canvas aligned to the active learning moment. The duplicate slide-tile list has been removed so the learner stays in one guided flow.</p>
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
                                        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-cyan-100/75">Use the focused brief panel and the previous or next controls above to move the active visual. Open the full-size slide when you want a separate reading view.</p>
                                      </div>
                                    </div>
                                  </div>
                                  {interactiveGalleryVisuals.length ? (
                                    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="max-w-2xl">
                                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Visual focus lock</p>
                                          <p className="mt-2 text-sm leading-6 text-slate-300">This area no longer repeats the full brief and practice list as slide tiles. The focused brief panel is the main navigator, while this companion card simply confirms where the learner is in the visual sequence.</p>
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

                    {!activeModalQuizTrigger && currentStage?.id === "brief" ? (
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

                    {!activeModalQuizTrigger && currentStage?.id === "practice" ? (
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

                    {!activeModalQuizTrigger && currentStage?.id === "apply" ? (
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

                    {!activeModalQuizTrigger && currentStage?.id === "reflect" ? (
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

                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                    {activeModalQuizTrigger ? (
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

                <PremiumCard className="overflow-hidden">
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
  const [, setLocation] = useLocation();

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
      await library.refetch();
    },
    onError: (error) => {
      setUploadNotice(error.message);
    },
  });

  const trackKeywords: Record<string, string[]> = {
    all: [],
    "track-service-foundations": ["service foundations", "soft skills", "customer service", "communication"],
    "track-workflow-precision": ["workflow", "qa", "documentation", "verification", "execution"],
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

  const groupedAssets = useMemo(
    () => groupAssetsByTargetDemographic(assets),
    [assets],
  );

  const selectedAsset = useMemo(
    () => assets.find((asset: any) => asset.id === selectedAssetId) ?? assets[0] ?? null,
    [assets, selectedAssetId],
  );
  const selectedAssetRoleOptions = useMemo(
    () => selectedAsset ? resolveSelectedAssetWorkflowRoles(selectedAsset.linkedRoles) : [],
    [selectedAsset],
  );
  const selectedAssetWorkflowBrief = useMemo(
    () => getOperationalLaunchReadinessBrief(selectedAssetRole),
    [selectedAssetRole],
  );

  useEffect(() => {
    if (!selectedAsset) {
      return;
    }

    setSelectedAssetRole((currentRole) => {
      if (selectedAssetRoleOptions.includes(currentRole)) {
        return currentRole;
      }

      const preferredRole = roleFilter !== "all"
        ? roleFilter
        : access.data?.grant.role;

      return resolveDefaultSelectedAssetRole(selectedAsset.linkedRoles, preferredRole);
    });
  }, [access.data?.grant.role, roleFilter, selectedAsset, selectedAssetRoleOptions]);

  function handleStartTraining(asset?: any, role?: DemoRole, journeyId?: string, moduleId?: string, assignmentId?: string) {
    setLocation(buildTrainingLaunchPath({ asset, role, journeyId, moduleId, assignmentId }));
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

  return (
    <Surface>
      <SectionShell
        eyebrow="Content Library"
        title="CHCG methodology assets and tenant-scoped imports"
        description="Browse the CHCG core library by learning track, then blend in client-provided materials with clear source labeling, role alignment, and tenant-safe visibility."
        actions={
          <>
            {access.data ? (
              <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
                {access.data.tenant.name}
              </Badge>
            ) : null}
            <Button type="button" onClick={() => handleStartTraining(selectedAsset ?? undefined)} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">
              Start training
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
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard label="Total assets" value={String(library.data.stats.totalAssets)} supporting="Visible under the current tenant, role, and search filters." icon={<Layers3 className="h-4 w-4" />} />
              <MetricCard label="CHCG core assets" value={String(library.data.stats.chcgAssets)} supporting="Sanitized CHCG methodology assets ready for reuse." icon={<BookOpen className="h-4 w-4" />} />
              <MetricCard label="Client imports" value={String(library.data.stats.importedAssets)} supporting="Tenant-scoped materials uploaded for this workspace." icon={<Building2 className="h-4 w-4" />} />
              <MetricCard label="Mapped journeys" value={String(library.data.stats.mappedJourneys)} supporting="Assets already connected to enablement journeys." icon={<Target className="h-4 w-4" />} />
            </div>

            <PremiumCard className="overflow-hidden">
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${library.data.branding.accent}, rgba(255,255,255,0.08))` }} />
              <CardContent className="flex flex-col gap-6 px-7 py-7 lg:flex-row lg:items-center lg:justify-between xl:px-8 xl:py-8">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border text-xl font-semibold text-white shadow-[0_20px_40px_rgba(8,15,30,0.35)]"
                    style={{ borderColor: `${library.data.branding.accent}55`, backgroundColor: `${library.data.branding.accent}22` }}
                  >
                    {library.data.branding.logoMark}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[12px] uppercase tracking-[0.22em] text-slate-500">White-label library view</p>
                    <h2 className="text-[2rem] font-semibold leading-tight tracking-tight text-white xl:text-[2.2rem]">{library.data.branding.preferredLabel}</h2>
                    <p className="max-w-3xl text-base leading-7 text-slate-300">{library.data.branding.heroStatement}</p>
                  </div>
                </div>
                <div className="max-w-xl rounded-3xl border border-white/10 bg-slate-950/60 px-5 py-4 text-[15px] leading-7 text-slate-300 xl:px-6 xl:py-5">
                  <p className="font-medium text-white">Tenant-safe presentation</p>
                  <p className="mt-1.5">Imported assets inherit this tenant context while CHCG core materials remain visibly labeled as shared methodology content.</p>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <CardTitle className="text-[1.65rem] text-white">Track explorer</CardTitle>
                      <CardDescription className="max-w-3xl text-base leading-7 text-slate-400">Filter by CHCG learning track and role relevance to inspect how methodology assets and client imports align.</CardDescription>
                    </div>
                    <label className="block max-w-2xl space-y-2 text-[15px] text-slate-200">
                      <span>Search assets</span>
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-13 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4.5 text-[15px] text-white outline-none placeholder:text-slate-500 xl:text-base"
                        placeholder="Search by title, category, tag, or source label"
                      />
                    </label>
                  </div>
                  <div className="flex max-w-3xl flex-wrap gap-2.5 xl:justify-end">
                    {[{ value: "all", label: "All roles" }, { value: "executive", label: "Executive" }, { value: "manager", label: "Manager" }, { value: "coach", label: "Coach / Supervisor" }, { value: "learner", label: "Learner" }, { value: "client_admin", label: "Client admin" }].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        onClick={() => setRoleFilter(option.value as DemoRole | "all")}
                        className={`rounded-full border-white/10 ${roleFilter === option.value ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTrackFilter("all")}
                    className={`h-auto rounded-3xl border-white/10 px-5 py-5 text-left ${trackFilter === "all" ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                  >
                    <div>
                      <p className="text-base font-semibold leading-6">All tracks</p>
                      <p className={`mt-2 text-sm leading-6 ${trackFilter === "all" ? "text-slate-700" : "text-slate-300"}`}>See the full blended library.</p>
                    </div>
                  </Button>
                  {library.data.tracks.map((track: any) => (
                    <Button
                      key={track.id}
                      type="button"
                      variant="outline"
                      onClick={() => setTrackFilter(track.id)}
                      className={`h-auto rounded-3xl border-white/10 px-5 py-5 text-left ${trackFilter === track.id ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                    >
                      <div>
                        <p className="text-base font-semibold leading-6">{track.title}</p>
                        <p className={`mt-2 text-sm leading-6 ${trackFilter === track.id ? "text-slate-700" : "text-slate-300"}`}>{track.summary}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardHeader>
            </PremiumCard>

            {selectedAsset ? (
              <PremiumCard>
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="text-white">Selected asset workflow handoff</CardTitle>
                      <CardDescription className="text-slate-400">Use the library to inspect an asset, then jump directly into the guided training experience with that content in mind.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setLocation("/learner")} className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white">
                        Open learner journey
                      </Button>
                      <Button type="button" onClick={() => handleStartTraining(selectedAsset, selectedAssetRole)} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">
                        {selectedAssetWorkflowBrief.startLabel}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] xl:gap-7">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`rounded-full ${selectedAsset.sourceKind === "chcg" ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-200" : "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"}`}>{selectedAsset.sourceKind === "chcg" ? "CHCG asset" : "Client upload"}</Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedAsset.format}</Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedAsset.category}</Badge>
                    </div>
                    <div>
                      <h3 className="text-[2rem] font-semibold leading-tight text-white">{selectedAsset.title}</h3>
                      <p className="mt-3 text-base leading-7 text-slate-300">{selectedAsset.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedAsset.tags.map((tag: string) => (
                        <span key={`selected-${selectedAsset.id}-${tag}`} className="rounded-full border border-white/10 bg-white/6 px-3.5 py-1.5 text-sm text-slate-300">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-[15px] leading-7 text-slate-100 sm:col-span-2">
                      <p className="text-[12px] uppercase tracking-[0.2em] text-cyan-100/75">Operational launch readiness brief</p>
                      <h4 className="mt-2.5 text-lg font-medium text-white">{selectedAssetWorkflowBrief.title}</h4>
                      <p className="mt-3 text-sm leading-6 text-slate-100">Use the role chips to align this handoff with the exact workspace lens that should receive the asset first.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedAssetRoleOptions.map((linkedRole) => (
                          <Button
                            key={`selected-role-${selectedAsset.id}-${linkedRole}`}
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedAssetRole(linkedRole)}
                            className={`rounded-full px-4 py-2 text-sm ${selectedAssetRole === linkedRole ? "border-white bg-white text-slate-950 hover:bg-slate-100" : "border-white/10 bg-slate-950/55 text-slate-200 hover:bg-white/10 hover:text-white"}`}
                          >
                            {getRoleLabel(linkedRole)}
                          </Button>
                        ))}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-200">Source label · <span className="font-medium text-white">{selectedAsset.sourceLabel}</span></p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-5 text-[15px] leading-7 text-slate-300">
                      <p className="text-[12px] uppercase tracking-[0.2em] text-slate-500">Training use</p>
                      <p className="mt-2.5 text-white">{selectedAssetWorkflowBrief.trainingUse}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-5 text-[15px] leading-7 text-slate-300">
                      <p className="text-[12px] uppercase tracking-[0.2em] text-slate-500">Workflow owner</p>
                      <p className="mt-2.5 text-white">{selectedAssetWorkflowBrief.workflowOwner}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-5 text-[15px] leading-7 text-slate-300">
                      <p className="text-[12px] uppercase tracking-[0.2em] text-slate-500">Launch alignment</p>
                      <p className="mt-2.5 text-white">{selectedAssetWorkflowBrief.launchAlignment}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-5 text-[15px] leading-7 text-slate-300">
                      <p className="text-[12px] uppercase tracking-[0.2em] text-slate-500">Follow-through proof</p>
                      <p className="mt-2.5 text-white">{selectedAssetWorkflowBrief.followThrough}</p>
                    </div>
                  </div>
                </CardContent>
              </PremiumCard>
            ) : null}

            <Tabs value={assetView} onValueChange={(value) => setAssetView(value as "all" | "chcg" | "imported")} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 rounded-3xl border border-white/10 bg-white/6 p-1">
                <TabsTrigger value="all" className="rounded-[1.2rem] data-[state=active]:bg-white data-[state=active]:text-slate-950">Blended library</TabsTrigger>
                <TabsTrigger value="chcg" className="rounded-[1.2rem] data-[state=active]:bg-white data-[state=active]:text-slate-950">CHCG core</TabsTrigger>
                <TabsTrigger value="imported" className="rounded-[1.2rem] data-[state=active]:bg-white data-[state=active]:text-slate-950">Client imports</TabsTrigger>
              </TabsList>
              <TabsContent value={assetView} className="mt-0 space-y-6">
                {groupedAssets.length > 0 ? (
                  <div className="space-y-6">
                    {groupedAssets.map((group) => (
                      <PremiumCard key={group.id} className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.82))]">
                        <CardHeader className="space-y-3 border-b border-white/8 bg-white/[0.03]">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <CardTitle className="text-white">{group.title}</CardTitle>
                              <CardDescription className="mt-2 max-w-3xl text-base leading-7 text-slate-300">{group.description}</CardDescription>
                            </div>
                            <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{group.assets.length} asset{group.assets.length === 1 ? "" : "s"}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="px-6 py-6">
                          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                            {group.assets.map((asset: any) => (
                              <PremiumCard key={asset.id} className={`h-full transition-all ${selectedAsset?.id === asset.id ? "ring-1 ring-white/30" : ""}`}>
                                <CardHeader className="space-y-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={`rounded-full ${asset.sourceKind === "chcg" ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-200" : "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"}`}>{asset.sourceKind === "chcg" ? "CHCG asset" : "Client upload"}</Badge>
                                    <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{asset.format}</Badge>
                                    <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{asset.category}</Badge>
                                  </div>
                                  <div className="space-y-3">
                                    <CardTitle className="text-[1.4rem] leading-tight text-white">{asset.title}</CardTitle>
                                    <CardDescription className="text-base leading-7 text-slate-300">{asset.summary}</CardDescription>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="flex flex-wrap gap-2">
                                    {asset.linkedRoles.map((linked: string) => (
                                      <Badge key={`${asset.id}-${linked}`} variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">
                                        {linked === "all" ? "All roles" : linked.replaceAll("_", " ")}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap gap-2.5 text-sm text-slate-300">
                                    {asset.tags.map((tag: string) => (
                                      <span key={`${asset.id}-${tag}`} className="rounded-full border border-white/10 bg-white/6 px-3.5 py-1.5">#{tag}</span>
                                    ))}
                                  </div>
                                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4.5 text-[15px] leading-7 text-slate-300">
                                    <p><span className="text-slate-500">Source</span> · {asset.sourceLabel}</p>
                                    <p className="mt-2"><span className="text-slate-500">Created</span> · {new Date(asset.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" onClick={() => setSelectedAssetId(asset.id)} className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white">
                                      {selectedAsset?.id === asset.id ? "Selected for training" : "Preview in workflow"}
                                    </Button>
                                    <Button type="button" onClick={() => handleStartTraining(asset)} className="rounded-full bg-white px-4 text-slate-950 hover:bg-slate-100">
                                      Start training
                                      <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    {asset.fileUrl ? (
                                      <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-white/10 hover:text-cyan-100">
                                        Open stored asset
                                        <ChevronRight className="ml-1 h-4 w-4" />
                                      </a>
                                    ) : null}
                                  </div>
                                </CardContent>
                              </PremiumCard>
                            ))}
                          </div>
                        </CardContent>
                      </PremiumCard>
                    ))}
                  </div>
                ) : null}
                {assets.length === 0 ? (
                  <PremiumCard>
                    <CardContent className="py-12 text-center text-slate-300">
                      No assets match the current search, track, and role filters yet. Try broadening the search, switching library views, or uploading tenant-specific material below.
                    </CardContent>
                  </PremiumCard>
                ) : null}
              </TabsContent>
            </Tabs>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Client content ingestion</CardTitle>
                  <CardDescription className="text-slate-400">Upload a deck or document to blend client-specific materials into the tenant library without diluting CHCG core content visibility.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleUpload}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-slate-200">
                        <span>Asset title</span>
                        <input value={title} onChange={(event) => setTitle(event.target.value)} required className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none ring-0 placeholder:text-slate-500" placeholder="New hire workflow deck" />
                      </label>
                      <label className="space-y-2 text-sm text-slate-200">
                        <span>Category</span>
                        <input value={category} onChange={(event) => setCategory(event.target.value)} required className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none ring-0 placeholder:text-slate-500" placeholder="Operational execution" />
                      </label>
                    </div>
                    <label className="space-y-2 text-sm text-slate-200">
                      <span>Summary</span>
                      <textarea value={summary} onChange={(event) => setSummary(event.target.value)} required rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500" placeholder="Describe how this material supports coaching, readiness, or documentation workflows." />
                    </label>
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-2 text-sm text-slate-200">
                        <span>Format</span>
                        <Select value={format} onValueChange={(value) => setFormat(value as typeof format)}>
                          <SelectTrigger className="h-12 border-white/10 bg-slate-950/70 text-slate-100">
                            <SelectValue placeholder="Choose format" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Deck", "Playbook", "Checklist", "Guide", "Worksheet", "Microlearning", "Document"].map((option) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-2 text-sm text-slate-200">
                        <span>Primary audience</span>
                        <Select value={linkedRole} onValueChange={(value) => setLinkedRole(value as DemoRole | "all")}>
                          <SelectTrigger className="h-12 border-white/10 bg-slate-950/70 text-slate-100">
                            <SelectValue placeholder="Choose audience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="executive">Executive</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="coach">Coach / Supervisor</SelectItem>
                            <SelectItem value="learner">Learner</SelectItem>
                            <SelectItem value="client_admin">Client admin</SelectItem>
                            <SelectItem value="all">All roles</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-2 text-sm text-slate-200">
                        <span>Source label</span>
                        <input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} required className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none placeholder:text-slate-500" placeholder="Client enablement team" />
                      </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-slate-200">
                        <span>Tags</span>
                        <input value={tags} onChange={(event) => setTags(event.target.value)} className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none placeholder:text-slate-500" placeholder="workflow, qa, launch" />
                      </label>
                      <label className="space-y-2 text-sm text-slate-200">
                        <span>Optional file</span>
                        <input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="block h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950" />
                      </label>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-400">Uploads are tenant-scoped and surfaced with explicit source labeling so CHCG assets remain distinguishable from imported materials.</p>
                      <Button type="submit" disabled={uploadMutation.isPending} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">
                        {uploadMutation.isPending ? "Uploading..." : "Add to library"}
                      </Button>
                    </div>
                    {uploadNotice ? <p className="text-sm text-cyan-200">{uploadNotice}</p> : null}
                  </form>
                </CardContent>
              </PremiumCard>

              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Integration notes</CardTitle>
                  <CardDescription className="text-slate-400">How the library fits the wider EnableOS demo story.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-6 text-slate-300">
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <p className="font-medium text-white">Tenant-safe blending</p>
                    <p className="mt-2">CHCG methodology assets stay globally available while imported client materials remain isolated to the selected tenant.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <p className="font-medium text-white">Role-aware curation</p>
                    <p className="mt-2">Role filters reveal the same library through executive, manager, learner, and client-admin relevance lenses.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <p className="font-medium text-white">Journey alignment</p>
                    <p className="mt-2">Mapped-journey counts reinforce how methodology assets can feed interventions, coaching sessions, and review evidence workflows.</p>
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

function DocumentationFeed({ entries }: { entries: any[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry: any) => (
        <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-[0_16px_40px_rgba(2,8,23,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{entry.sourceType.replaceAll("_", " ")}</p>
              <h4 className="mt-2 text-lg font-medium text-white">{entry.title}</h4>
            </div>
            <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200 capitalize">{entry.authoredByRole.replaceAll("_", " ")}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{entry.summary}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {entry.evidencePoints.map((point: any) => (
              <div key={point} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
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
}: {
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
}) {
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

function WeeklyCoachingLogTimeline({
  title,
  description,
  tenantId,
  logs,
  allowTakeawayEditing = false,
  onUpdated,
}: {
  title: string;
  description: string;
  tenantId: string;
  logs: any[];
  allowTakeawayEditing?: boolean;
  onUpdated?: () => void;
}) {
  const [takeawayDrafts, setTakeawayDrafts] = useState<Record<string, string>>(() => Object.fromEntries(logs.map((log: any) => [log.id, log.agentTakeaways ?? ""])));
  const updateTakeaways = trpc.demo.previewUpdateWeeklyCoachingTakeaways.useMutation({
    onSuccess: () => {
      onUpdated?.();
    },
  });

  useEffect(() => {
    setTakeawayDrafts(Object.fromEntries(logs.map((log: any) => [log.id, log.agentTakeaways ?? ""])));
  }, [logs]);

  return (
    <PremiumCard>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-300/76">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-400">No weekly coaching logs have been captured for this learner yet.</div>
        ) : null}
        {logs.map((log: any) => (
          <div key={log.id} className="rounded-[1.7rem] border border-white/10 bg-slate-950/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{new Date(log.sessionDate).toLocaleDateString()}</p>
                <h4 className="mt-2 text-lg font-medium text-white">{log.employeeName} · coached by {log.coachName}</h4>
                <p className="mt-2 text-sm text-slate-400">Coach role: {log.coachRole.replaceAll("_", " ")}</p>
              </div>
              <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Linked review: {log.linkedReviewLogId ?? "Pending"}</Badge>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Attendance</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{log.attendance}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Additional support</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{log.additionalSupport}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Follow-up from previous coaching</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{log.followUpFromPrevious}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coaching comments</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{log.coachingComments}</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">SMART Goal Coaching Commitment</p>
                <p className="mt-2 text-sm leading-6 text-slate-100">{log.smartGoalCommitment}</p>
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
                <Badge key={recipient.key} variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{recipient.label}</Badge>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Agent take-aways</p>
              {allowTakeawayEditing ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    value={takeawayDrafts[log.id] ?? ""}
                    onChange={(event) => setTakeawayDrafts((current) => ({ ...current, [log.id]: event.target.value }))}
                    rows={4}
                    className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20 placeholder:text-slate-500"
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
                    <span className="text-sm text-slate-400">Your response is written back into the same coaching record.</span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-300">{log.agentTakeaways || "The learner has not added take-aways yet."}</p>
              )}
            </div>
          </div>
        ))}
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
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
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
            <CardDescription className="text-slate-400">A clear executive story of intervention impact.</CardDescription>
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
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
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
        <PremiumCard>
          <CardHeader>
            <CardTitle className="text-white">Executive methodology references</CardTitle>
            <CardDescription className="text-slate-400">CHCG governance assets from Data-Led Leadership, Performance Leadership, and engagement-system design surfaced directly in the experience.</CardDescription>
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
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
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
    </div>
  );
}

function CoachPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  const leadModule = data.activeJourney?.modules?.[0] ?? null;
  const [activeTab, setActiveTab] = useState<"coaching" | "transfer" | "documentation" | "alerts">("coaching");

  const openCoachView = (tab: "coaching" | "transfer" | "documentation" | "alerts", sectionId: string) => {
    setActiveTab(tab);
    window.setTimeout(() => revealWorkspaceSection(sectionId), 20);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Coach readiness" value={`${data.coach.readinessScore}`} supporting={data.coach.name} icon={<ShieldCheck className="h-4 w-4" />} onClick={() => openCoachView("coaching", "coach-signal-trend")} actionLabel="Open signal trend" />
        <MetricCard label="Learner focus" value={data.directLearner.name} supporting={data.directLearner.title} icon={<Users2 className="h-4 w-4" />} onClick={() => openCoachView("coaching", "coach-supervision-lane")} actionLabel="Open supervision lane" />
        <MetricCard label="Weekly logs" value={`${data.weeklyCoachingLogs.length}`} supporting="Structured coaching cycles recorded" icon={<BookOpen className="h-4 w-4" />} onClick={() => openCoachView("coaching", "coach-weekly-logs")} actionLabel="Review coaching logs" />
        <MetricCard label="Journey progress" value={`${data.activeJourney.progress}%`} supporting={data.activeJourney.title} icon={<Gauge className="h-4 w-4" />} onClick={() => openCoachView("transfer", "coach-transfer-lane")} actionLabel="Open training transfer" />
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
            <CardDescription className="text-slate-400">A dedicated coach workspace sits between learner delivery and manager governance so weekly coaching, observed behaviors, and escalation context stay visible.</CardDescription>
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
            <RetrainingHistorySection
              title="Retraining completion history"
              description="Coach-visible history keeps past retraining outcomes attached to Nina's supervision lane so follow-through remains easy to confirm over time."
              assignments={data.retrainingHistory ?? []}
              emptyLabel="Past retraining completions will appear here after the learner finishes assigned modules."
            />
            <GuidanceActionPanel
              tenantId={data.tenant.id}
              suggestion={data.aiSuggestion}
              catalog={data.retrainingCatalog}
              assignments={data.activeRetrainingAssignments}
              actorRole="coach"
              learnerName={data.directLearner.name}
              onUpdated={onUpdated}
            />
          </CardContent>
        </PremiumCard>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "coaching" | "transfer" | "documentation" | "alerts")} className="space-y-4">
        <TabsList className="w-full justify-start rounded-full border border-white/10 bg-white/5 p-1 text-slate-300">
          <TabsTrigger value="coaching" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Coaching lane</TabsTrigger>
          <TabsTrigger value="transfer" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Training transfer</TabsTrigger>
          <TabsTrigger value="documentation" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Documentation</TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="coaching" id="coach-coaching-lane" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] scroll-mt-24">
          <div className="space-y-4">
            {data.coachingSessions.map((session: any) => (
              <PremiumCard key={session.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">{session.title}</CardTitle>
                      <CardDescription className="mt-2 text-slate-400">{session.notes}</CardDescription>
                    </div>
                    <StatusBadge value={session.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Action plan</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-300">
                      {session.actionPlan.map((step: any) => (
                        <div key={step} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </PremiumCard>
            ))}
          </div>
          <div id="coach-weekly-logs" className="space-y-6 scroll-mt-24">
            <WeeklyCoachingLogComposer
              tenantId={data.tenant.id}
              subjectUserId={data.directLearner.id}
              coachRole="coach"
              title="Capture a weekly coaching log from the coach workspace"
              employeeName={data.directLearner.name}
              employeeEmail={data.directLearner.email}
              coachName={data.coach.name}
              coachEmail={data.coach.email}
              supervisorName={data.escalationPartner.name}
              supervisorEmail={data.escalationPartner.email}
              managerOfSupervisorEmail={data.weeklyCoachingLogs[0]?.managerOfSupervisorEmail}
              onCreated={onUpdated}
            />
            <WeeklyCoachingLogTimeline
              title="Coach-visible weekly coaching history"
              description="Coaches can review the exact structured fields, confirm sharing targets, and keep learner take-aways connected to the same record."
              tenantId={data.tenant.id}
              logs={data.weeklyCoachingLogs}
            />
          </div>
        </TabsContent>
        <TabsContent value="transfer" id="coach-transfer-lane" className="grid gap-6 xl:grid-cols-[1fr_0.92fr] scroll-mt-24">
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
          <WorkflowLibraryPanel
            title="Coach-ready content mix"
            description="Supervisors can pull both CHCG methodology and tenant resources into coaching prep, floor walks, and next-session planning."
            resources={data.workflowLibraryMix.documentationResources}
          />
        </TabsContent>
        <TabsContent value="documentation" id="coach-documentation-feed" className="grid gap-6 xl:grid-cols-[1fr_0.92fr] scroll-mt-24">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Coach documentation feed</CardTitle>
              <CardDescription className="text-slate-400">Observed behavior, weekly coaching records, and review notes remain connected so the coach does not lose context between sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentationFeed entries={data.documentationEntries} />
            </CardContent>
          </PremiumCard>
          <div className="space-y-6">
            <ReviewLogComposer
              tenantId={data.tenant.id}
              subjectUserId={data.directLearner.id}
              authorRole="coach"
              title="Write a coach follow-up or observational review"
              onCreated={onUpdated}
            />
            <WorkflowLibraryPanel
              title="Coach observation resources"
              description="Use methodology references and tenant materials to keep observation notes aligned with the lesson evidence and coaching standard."
              resources={data.workflowLibraryMix.interventionResources}
            />
          </div>
        </TabsContent>
        <TabsContent value="alerts" id="coach-alerts-feed" className="grid gap-4 md:grid-cols-2 scroll-mt-24">
          {data.notifications.map((item: any) => (
            <PremiumCard key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">{item.title}</CardTitle>
                    <CardDescription className="mt-2 text-slate-400">{new Date(item.createdAt).toLocaleString()}</CardDescription>
                  </div>
                  <StatusBadge value={item.priority} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-300">{item.detail}</p>
              </CardContent>
            </PremiumCard>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManagerPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  const [activeTab, setActiveTab] = useState<"interventions" | "coaching" | "documentation" | "notifications">("interventions");
  const [historyWindow, setHistoryWindow] = useState<RetrainingHistoryWindow>("month");

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Active signals" value={`${data.openSignals.length}`} supporting="Live KPI and QA feed requiring attention" icon={<CircleAlert className="h-4 w-4" />} onClick={() => openManagerView("interventions", "manager-signal-trend")} actionLabel="Open signal feed" />
        <MetricCard label="Open interventions" value={`${data.interventions.length}`} supporting="Workflow actions assigned from rule triggers" icon={<Target className="h-4 w-4" />} onClick={() => openManagerView("interventions", "manager-interventions-lane")} actionLabel="Open interventions" />
        <MetricCard label="Coaching follow-ups" value={`${data.coachingSessions.length}`} supporting="Structured sessions with action plans and reminders" icon={<Users2 className="h-4 w-4" />} onClick={() => openManagerView("coaching", "manager-coaching-lane")} actionLabel="Open coaching lane" />
        <MetricCard label="Direct report readiness" value={`${data.directReport.readinessScore}`} supporting={data.directReport.name} icon={<ShieldCheck className="h-4 w-4" />} onClick={() => openManagerView("coaching", "manager-coach-oversight")} actionLabel="Review coach oversight" />
      </div>
      <div id="manager-signal-trend" className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] scroll-mt-24">
        <ChartFrame title="Signal severity feed" description="Simulated KPI and QA signals tied to Workflow Precision, Service Foundations, and manager-led intervention logic.">
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
        <TabsList className="w-full justify-start rounded-full border border-white/10 bg-white/5 p-1 text-slate-300">
          <TabsTrigger value="interventions" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Interventions</TabsTrigger>
          <TabsTrigger value="coaching" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Coaching log</TabsTrigger>
          <TabsTrigger value="documentation" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Documentation</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="interventions" id="manager-interventions-lane" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] scroll-mt-24">
          <div className="grid gap-4">
            {data.interventions.map((item: any) => (
              <PremiumCard key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">{item.title}</CardTitle>
                      <CardDescription className="mt-2 text-slate-400">Gap: {item.gap}</CardDescription>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-slate-300">
                    {item.assignedActions.map((action: any) => (
                      <div key={action} className="flex items-start gap-2">
                        <ChevronRight className="mt-0.5 h-4 w-4 text-slate-500" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-white/8" />
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Due {new Date(item.dueDate).toLocaleDateString()}</span>
                    <span>Owner: {data.manager.name}</span>
                  </div>
                </CardContent>
              </PremiumCard>
            ))}
          </div>
          <WorkflowLibraryPanel
            title="Intervention content mix"
            description="Managers can pull both CHCG methodology assets and tenant uploads directly into intervention execution."
            resources={data.workflowLibraryMix.interventionResources}
          />
        </TabsContent>
        <TabsContent value="coaching" id="manager-coaching-lane" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] scroll-mt-24">
          <div className="space-y-4">
            {data.coachingSessions.map((session: any) => (
              <PremiumCard key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-white">{session.title}</CardTitle>
                    <CardDescription className="mt-2 text-slate-400">{session.notes}</CardDescription>
                  </div>
                  <StatusBadge value={session.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Action plan</p>
                  <div className="mt-2 space-y-2 text-sm text-slate-300">
                    {session.actionPlan.map((step: any) => (
                      <div key={step} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Audit trail</p>
                  <div className="mt-2 space-y-2">
                    {session.auditTrail.map((entry: any) => (
                      <div key={entry.at + entry.detail} className="rounded-2xl border border-white/8 bg-white/5 p-3 text-sm text-slate-300">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{new Date(entry.at).toLocaleString()}</p>
                        <p className="mt-1">{entry.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </PremiumCard>
            ))}
          </div>
          <div className="space-y-6">
            <WeeklyCoachingLogComposer
              tenantId={data.tenant.id}
              subjectUserId={data.directReport.id}
              coachRole="manager"
              title="Capture this week's coaching log"
              employeeName={data.directReport.name}
              employeeEmail={data.directReport.email}
              coachName={data.manager.name}
              coachEmail={data.manager.email}
              supervisorName={data.manager.name}
              supervisorEmail={data.manager.email}
              managerOfSupervisorEmail={data.weeklyCoachingLogs[0]?.managerOfSupervisorEmail}
              onCreated={onUpdated}
            />
            <WeeklyCoachingLogTimeline
              title="Weekly coaching log history"
              description="Managers can review every structured coaching field, confirm the simulated email-copy list, and track how the learner responds over time."
              tenantId={data.tenant.id}
              logs={data.weeklyCoachingLogs}
            />
            <PremiumCard className="scroll-mt-24" id="manager-coach-oversight">
              <CardHeader>
                <CardTitle className="text-white">Coach direct-report oversight</CardTitle>
                <CardDescription className="text-slate-400">Managers can remotely review the same direct-report coaching history the coach sees, keeping the escalation conversation aligned inside the manager workspace.</CardDescription>
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
                      <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coach escalation path</p>
                        <p className="mt-2 text-sm text-white">{coverage.coach.name} · {coverage.coach.email}</p>
                        <p className="mt-1 text-sm text-slate-300">Escalates into {data.manager.name}'s manager review lane for remote follow-through.</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Most recent direct-report log</p>
                        <p className="mt-2 text-sm text-white">{coverage.latestLog ? new Date(coverage.latestLog.sessionDate).toLocaleDateString() : "No coach-authored log yet"}</p>
                        <p className="mt-1 text-sm text-slate-300">{coverage.latestLog ? coverage.latestLog.coachingComments : "The manager lane will surface direct-report coaching history here as soon as a weekly log is recorded."}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">History window</p>
                            <p className="mt-2 text-sm text-slate-300">Showing completions from the last {historyWindow === "week" ? "7 days" : "31 days"} so managers can review recent retraining by week or month.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant={historyWindow === "week" ? "default" : "outline"} className={historyWindow === "week" ? "rounded-full bg-white text-slate-950 hover:bg-slate-100" : "rounded-full border-white/10 bg-white/6 text-slate-200 hover:bg-white/12 hover:text-white"} onClick={() => setHistoryWindow("week")}>
                              Week
                            </Button>
                            <Button type="button" variant={historyWindow === "month" ? "default" : "outline"} className={historyWindow === "month" ? "rounded-full bg-white text-slate-950 hover:bg-slate-100" : "rounded-full border-white/10 bg-white/6 text-slate-200 hover:bg-white/12 hover:text-white"} onClick={() => setHistoryWindow("month")}>
                              Month
                            </Button>
                            <Button type="button" variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200 hover:bg-white/12 hover:text-white" onClick={() => exportRetrainingHistory(coverage.directReport.name, filteredHistory)} disabled={!filteredHistory.length}>
                              Export CSV
                            </Button>
                          </div>
                        </div>
                      </div>
                      <RetrainingHistorySection
                        title="Targeted retraining history"
                        description="Managers can review the current retraining outcome, then export the filtered completion history with completion dates and assigning roles without leaving the coach-oversight lane."
                        assignments={filteredHistory}
                        emptyLabel={`No retraining completions fall inside the selected ${historyWindow} window yet.`}
                      />
                    </div>
                  </div>
                  );
                })}
                <WeeklyCoachingLogTimeline
                  title="Coach-lane direct-report logs"
                  description="This mirrored timeline lets managers review the same direct-report coaching history the coach is working from without leaving the manager workspace."
                  tenantId={data.tenant.id}
                  logs={data.coachCoverage.flatMap((coverage: any) => coverage.weeklyCoachingLogs)}
                />
              </CardContent>
            </PremiumCard>
          </div>
        </TabsContent>
        <TabsContent value="documentation" id="manager-documentation-lane" className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] scroll-mt-24">
          <div className="space-y-6">
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Auto-generated learning documentation</CardTitle>
                <CardDescription className="text-slate-400">Completion evidence from Service Foundations, Workflow Precision, and intervention activity is automatically assembled for coaching use.</CardDescription>
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
            <ReviewLogComposer
              tenantId={data.tenant.id}
              subjectUserId={data.directReport.id}
              authorRole="manager"
              title="Write a one-on-one, quarterly, or annual coaching log"
              onCreated={onUpdated}
            />
            <PremiumCard>
              <CardHeader>
                <CardTitle className="text-white">Structured review history</CardTitle>
                <CardDescription className="text-slate-400">Manager-authored logs and leadership checkpoints tied to the learner record and CHCG performance-leadership cadence.</CardDescription>
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
        <TabsContent value="notifications" id="manager-alerts-lane" className="grid gap-4 lg:grid-cols-2 scroll-mt-24">
          {data.notifications.map((item: any) => (
            <PremiumCard key={item.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-white">{item.title}</CardTitle>
                  <StatusBadge value={item.priority} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-300">{item.detail}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </CardContent>
            </PremiumCard>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LearnerPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  const learnerModules = data.activeJourney.modules;
  const primaryLearnerModule = learnerModules[0] ?? null;
  const activeRetrainingAssignment = data.currentRetrainingAssignment ?? data.retrainingAssignments?.[0] ?? null;
  const retrainingHistory = data.retrainingHistory ?? [];
  const nextLearnerModule = learnerModules.find((module: any) => module.completionRate < 80) ?? learnerModules[0] ?? null;
  const completedLearnerModules = learnerModules.filter((module: any) => module.completionRate >= 80).length;
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const updateRetrainingStatus = trpc.demo.secureUpdateRetrainingAssignmentStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.demo.secureLearner.invalidate({ tenantId: data.tenant.id }),
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
    })
    : "/training";
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
  });
  const interventionTrainingOptions = buildLearnerInterventionTrainingOptions({
    activeJourneyId: data.activeJourney.id,
    learnerModules,
    activeRetrainingAssignment,
    primaryTrainingPath,
  });
  const activeIntervention = data.assignedInterventions.find((item: any) => item.id === selectedInterventionId) ?? null;

  return (

    <div className="space-y-6">
      {activeRetrainingAssignment ? (
        <div id="learner-priority-retraining" className="rounded-[1.8rem] border border-amber-400/25 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(15,23,42,0.92))] p-5 shadow-[0_24px_72px_rgba(8,15,35,0.24)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-100/85">Priority retraining notification</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{activeRetrainingAssignment.status === "completed" ? `${activeRetrainingAssignment.moduleTitle} is complete` : `${activeRetrainingAssignment.moduleTitle} has been assigned to you`}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-100/92">{activeRetrainingAssignment.status === "completed" ? `You finished this targeted retraining from ${activeRetrainingAssignment.journeyTitle}. Your manager and coach can now see the completed chip in their oversight lanes.` : `Complete this targeted refresher from ${activeRetrainingAssignment.journeyTitle} within 48 hours. It has been moved to the top of your learner journey so you can start it before returning to the broader path.`}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={activeRetrainingAssignment.status} />
              <Badge className="rounded-full border-amber-400/20 bg-amber-400/12 px-3 py-1 text-amber-100">{activeRetrainingAssignment.status === "completed" && activeRetrainingAssignment.completedAt ? `Completed ${new Date(activeRetrainingAssignment.completedAt).toLocaleDateString()}` : formatDueWindow(activeRetrainingAssignment.dueAt)}</Badge>
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
              <Button type="button" variant="outline" onClick={() => updateActiveAssignmentStatus("completed")} disabled={updateRetrainingStatus.isPending} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                {updateRetrainingStatus.isPending ? "Saving completion..." : "Mark retraining complete"}
              </Button>
            ) : null}
            <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 px-3 py-1 text-slate-100">Assigned by {activeRetrainingAssignment.requestedByRole}</Badge>
          </div>
        </div>
      ) : null}
      {retrainingHistory.length ? (
        <RetrainingHistorySection
          title="Past retraining history"
          description="Your learner workspace now keeps earlier assigned modules visible after completion so you can review what was already finished before the next intervention starts."
          assignments={retrainingHistory}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Readiness score" value={`${data.learner.readinessScore}`} supporting={data.learner.title} icon={<Gauge className="h-4 w-4" />} />
        <MetricCard label="Journey progress" value={`${data.activeJourney.progress}%`} supporting={data.activeJourney.title} icon={<BookOpen className="h-4 w-4" />} />
        <MetricCard label={learnerWorkspaceCopy.assignedReengagementsMetricLabel} value={`${data.assignedInterventions.length}`} supporting={learnerWorkspaceCopy.assignedReengagementsMetricSupporting} icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Next coaching milestone" value={new Date(data.nextCoachingSession.dueDate).toLocaleDateString()} supporting={data.nextCoachingSession.title} icon={<Bell className="h-4 w-4" />} />
      </div>
      <PremiumCard className="overflow-hidden">
        <CardContent className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <div className="rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.1),rgba(15,23,42,0.92))] p-6 shadow-[0_24px_80px_rgba(8,15,35,0.24)]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{activeRetrainingAssignment ? "Required retraining" : "Continue learning"}</Badge>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{activeRetrainingAssignment?.moduleFormat ?? primaryLearnerModule?.format ?? "Learning path"}</Badge>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{activeRetrainingAssignment ? formatDueWindow(activeRetrainingAssignment.dueAt) : `${data.activeJourney.progress}% path progress`}</Badge>
            </div>
            <div className="mt-5 max-w-3xl">
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-100/75">{activeRetrainingAssignment ? "Targeted retraining" : "Recommended path"}</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">{activeRetrainingAssignment?.moduleTitle ?? primaryLearnerModule?.title ?? data.activeJourney.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-200">{activeRetrainingAssignment ? `Your manager or coach assigned ${activeRetrainingAssignment.moduleTitle} from ${activeRetrainingAssignment.journeyTitle}. Complete this focused retraining within the next 48 hours before returning to the broader learning path.` : primaryLearnerModule ? `Resume ${primaryLearnerModule.title} to keep building ${primaryLearnerModule.skillFocus.toLowerCase()} inside ${data.activeJourney.title}.` : `Continue the active journey inside ${data.activeJourney.title} with role-aware training, coaching prompts, and mapped resources.`}</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Modules completed</p>
                <p className="mt-2 text-xl font-semibold text-white">{completedLearnerModules}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{activeRetrainingAssignment ? "Assigned module" : "Recommended next"}</p>
                <p className="mt-2 text-sm font-medium text-white">{activeRetrainingAssignment?.moduleTitle ?? nextLearnerModule?.title ?? "Finish the current module to unlock the next lesson."}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Coach milestone</p>
                <p className="mt-2 text-sm font-medium text-white">{data.nextCoachingSession.title}</p>
              </div>
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
              {activeRetrainingAssignment && activeRetrainingAssignment.status !== "completed" ? (
                <Button type="button" variant="outline" onClick={() => updateActiveAssignmentStatus("completed")} disabled={updateRetrainingStatus.isPending} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                  {updateRetrainingStatus.isPending ? "Saving completion..." : "Mark module complete"}
                </Button>
              ) : null}
              <Link href="/library">
                <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                  Browse mapped resources
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.82))] p-5 shadow-[0_22px_60px_rgba(8,15,35,0.22)]">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Learning signals</p>
              <h4 className="mt-3 text-xl font-semibold text-white">{data.activeJourney.competencyGap}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-300">The learner workspace now mirrors modern LMS discovery patterns by surfacing a clearer recommended path, visible continuation context, and the next coaching checkpoint before the learner enters the full course player.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Achievement layer</p>
                <p className="mt-2 text-sm font-medium text-white">{completedLearnerModules}/{learnerModules.length} modules have already crossed the 80% completion mark.</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Recommendation framing</p>
                <p className="mt-2 text-sm font-medium text-white">Use the training route for the immersive lesson player and the learner workspace for high-level progress, continuation, and next-step discovery.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </PremiumCard>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Active enablement journey</CardTitle>
              <CardDescription className="text-slate-400">{learnerWorkspaceCopy.activeJourneyDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeRetrainingAssignment ? (
                <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 p-4 shadow-[0_18px_50px_rgba(251,191,36,0.12)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-amber-100/80">Assigned first</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{activeRetrainingAssignment.moduleTitle}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-100/90">{activeRetrainingAssignment.status === "completed" ? "This targeted retraining is complete and leadership can now see the completion chip in their oversight lanes." : "This retraining has been pinned to the top of your journey and should be completed before resuming the rest of your learning path."}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={activeRetrainingAssignment.status} />
                      <Badge className="rounded-full border-amber-400/20 bg-amber-400/14 text-amber-100">{activeRetrainingAssignment.status === "completed" && activeRetrainingAssignment.completedAt ? `Completed ${new Date(activeRetrainingAssignment.completedAt).toLocaleDateString()}` : formatDueWindow(activeRetrainingAssignment.dueAt)}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={primaryTrainingPath}>
                      <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={() => {
                        if (activeRetrainingAssignment.status === "assigned") {
                          updateActiveAssignmentStatus("in_progress");
                        }
                      }}>{activeRetrainingAssignment.status === "completed" ? "Review assigned module" : "Open assigned module"}</Button>
                    </Link>
                    {activeRetrainingAssignment.status !== "completed" ? (
                      <Button type="button" variant="outline" onClick={() => updateActiveAssignmentStatus("completed")} disabled={updateRetrainingStatus.isPending} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                        {updateRetrainingStatus.isPending ? "Saving completion..." : "Mark complete"}
                      </Button>
                    ) : null}
                    <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 px-3 py-1 text-slate-100">{activeRetrainingAssignment.journeyTitle}</Badge>
                  </div>
                </div>
              ) : null}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Competency gap</p>
                    <h3 className="text-xl font-semibold text-white">{data.activeJourney.competencyGap}</h3>
                  </div>
                  <Badge className="rounded-full border-blue-500/20 bg-blue-500/10 text-blue-200">{data.activeJourney.progress}% complete</Badge>
                </div>
                <Progress value={data.activeJourney.progress} className="mt-4 h-2 bg-white/8" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={primaryTrainingPath}>
                  <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100" onClick={() => {
                    if (activeRetrainingAssignment?.status === "assigned") {
                      updateActiveAssignmentStatus("in_progress");
                    }
                  }}>
                    {activeRetrainingAssignment ? (activeRetrainingAssignment.status === "completed" ? "Review assigned retraining" : "Launch assigned retraining") : "Launch interactive training"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/library">
                  <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                    Open mapped resources
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
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
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                        <span>{index === 0 ? "Recommended path" : "Completion"}</span>
                        <span>{module.completionRate}%</span>
                      </div>
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
              </div>
            </CardContent>
          </PremiumCard>
          <WorkflowLibraryPanel
            title="Journey resource mix"
            description="Your learning path can now blend CHCG core modules with tenant-provided launch or compliance materials."
            resources={data.workflowLibraryMix.journeyResources}
          />
        </div>
        <div className="space-y-6">
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
                      <button
                        key={action}
                        type="button"
                        onClick={() => setSelectedInterventionId(item.id)}
                        className="flex w-full items-start gap-2 rounded-2xl border border-white/8 bg-slate-950/35 px-3 py-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white"
                      >
                        <ChevronRight className="mt-0.5 h-4 w-4 text-cyan-200" />
                        <span>{action}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" variant="outline" onClick={() => setSelectedInterventionId(item.id)} className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                      Choose training for this re-engagement
                    </Button>
                    {activeRetrainingAssignment ? <Badge className="rounded-full border-amber-400/20 bg-amber-400/12 text-amber-100">Assigned module available now</Badge> : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </PremiumCard>
          <Dialog open={Boolean(activeIntervention)} onOpenChange={(open) => !open ? setSelectedInterventionId(null) : null}>
            <DialogContent className="border-white/10 bg-slate-950 text-slate-100 sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Select the training to continue this re-engagement</DialogTitle>
                <DialogDescription className="text-slate-400">
                  {activeIntervention ? `Route ${activeIntervention.title} into the right module so the learner lands exactly where the assigned re-engagement should continue.` : "Choose a module to continue this re-engagement."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {interventionTrainingOptions.map((option) => (
                  <Link key={option.id} href={option.path}>
                    <button
                      type="button"
                      onClick={() => {
                        if (option.isAssigned && activeRetrainingAssignment?.status === "assigned") {
                          updateActiveAssignmentStatus("in_progress");
                        }
                        setSelectedInterventionId(null);
                      }}
                      className="w-full rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
                    >
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
          <WeeklyCoachingLogTimeline
            title="Weekly coaching log and your take-aways"
            description="Review the structured coaching notes your leaders recorded, see which email recipients would receive copies, and add your own response back into the same log."
            tenantId={data.tenant.id}
            logs={data.weeklyCoachingLogs}
            allowTakeawayEditing
            onUpdated={onUpdated}
          />
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
          <WorkflowLibraryPanel
            title="Documentation support assets"
            description="Review evidence can be supported with both CHCG governance assets and tenant-authored documents."
            resources={data.workflowLibraryMix.documentationResources}
          />
        </div>
      </div>
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
  const updateBranding = trpc.demo.previewUpdateBranding.useMutation({
    onSuccess: () => {
      onUpdated?.();
    },
  });

  useEffect(() => {
    setPreferredLabel(data.branding.preferredLabel);
    setAccent(data.branding.accent);
    setLogoMark(data.branding.logoMark);
    setHeroStatement(data.branding.heroStatement);
  }, [data.branding.accent, data.branding.heroStatement, data.branding.logoMark, data.branding.preferredLabel]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Tenant" value={data.tenant.name} supporting={data.tenant.industry} icon={<Building2 className="h-4 w-4" />} />
        <MetricCard label="Role users" value={`${data.tenantUsers.length}`} supporting="Strictly tenant-scoped account inventory" icon={<Users2 className="h-4 w-4" />} />
        <MetricCard label="Brand accent" value={data.branding.accent} supporting={data.branding.preferredLabel} icon={<Sparkles className="h-4 w-4" />} />
        <MetricCard label="Isolation mode" value="Strict" supporting={data.branding.dataIsolation} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <PremiumCard>
          <CardHeader>
            <CardTitle className="text-white">White-label tenant identity</CardTitle>
            <CardDescription className="text-slate-400">Client-specific identity and enterprise presentation controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 text-lg font-semibold text-white" style={{ backgroundColor: data.branding.accent + "22" }}>
                  {data.branding.logoMark}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Preferred label</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{data.branding.preferredLabel}</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{data.branding.heroStatement}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <div className="mb-4 space-y-1">
                <p className="text-sm font-medium text-white">Branding controls</p>
                <p className="text-sm leading-6 text-slate-400">Update the label, accent, logo mark, and hero message to demonstrate tenant-specific white-label configuration layered over CHCG methodology tracks.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Preferred label</span>
                  <input value={preferredLabel} onChange={(event) => setPreferredLabel(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
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
                  <span>Hero statement</span>
                  <textarea value={heroStatement} onChange={(event) => setHeroStatement(event.target.value)} className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  className="rounded-full bg-white text-slate-950 hover:bg-slate-100"
                  onClick={() => updateBranding.mutate({ tenantId: data.tenant.id, preferredLabel, accent, logoMark, heroStatement })}
                  disabled={updateBranding.isPending}
                >
                  {updateBranding.isPending ? "Applying..." : "Apply branding"}
                </Button>
                {updateBranding.isSuccess ? <span className="text-sm text-emerald-300">Branding updated for this tenant.</span> : null}
              </div>
            </div>
            <div className="space-y-3">
              {data.configuration.map((item: any) => (
                <div key={item.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <span className="text-slate-300">{item.label}</span>
                  <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-300">{item.value}</Badge>
                </div>
              ))}
            </div>
            <ReviewLogComposer
              tenantId={data.tenant.id}
              subjectUserId={data.tenantUsers.find((user: any) => user.role === "learner")?.id ?? data.admin.id}
              authorRole="client_admin"
              title="Write coach or calibration documentation"
              onCreated={onUpdated}
            />
          </CardContent>
        </PremiumCard>
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
        </div>
        <div className="space-y-6">
          <WorkflowLibraryPanel
            title="Blended workflow library governance"
            description="Client admins can now see how tenant-uploaded materials are mixed with CHCG assets across journeys, interventions, and documentation support."
            resources={[
              ...data.workflowLibraryMix.journeyResources,
              ...data.workflowLibraryMix.interventionResources,
              ...data.workflowLibraryMix.documentationResources,
            ].filter((asset: any, index: number, collection: any[]) => collection.findIndex((candidate: any) => candidate.id === asset.id) === index).slice(0, 4)}
          />
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Tenant user roster</CardTitle>
              <CardDescription className="text-slate-400">Role-scoped access model within the current client boundary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.tenantUsers.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-sm text-slate-400">{user.title} · {user.team}</p>
                  </div>
                  <Badge className="rounded-full border-white/10 bg-white/8 capitalize text-slate-200">{user.role.replace("_", " ")}</Badge>
                </div>
              ))}
            </CardContent>
          </PremiumCard>
          <WeeklyCoachingLogTimeline
            title="Tenant weekly coaching governance"
            description="Client admins can audit who was coached, who would receive the simulated copies, and whether learner take-aways have been written back into each record."
            tenantId={data.tenant.id}
            logs={data.weeklyCoachingLogs}
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
    </div>
  );
}

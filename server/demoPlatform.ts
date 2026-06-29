import { slideDecks } from "../shared/slideManifest";
import { isoDaysFromNow, dateOnlyDaysFromNow } from "../shared/demoClock";
import { getTrainingPresentation, type TrainingApplicationQuestion } from "../shared/trainingContent";

export type DemoRole = "executive" | "manager" | "coach" | "learner" | "client_admin";

export type DemoTenant = {
  id: string;
  name: string;
  industry: string;
  accent: string;
  logoMark: string;
  description: string;
  heroStatement: string;
};

export type DemoUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  title: string;
  role: DemoRole;
  team: string;
  avatarFallback: string;
  readinessScore: number;
  // Leaderboard signals (LEAD2). Optional so non-learner roles can omit them and
  // the accessor in shared/leaderboardConfig.ts falls back to 0 defensively.
  journeyProgressPct?: number;
  completedRatioPct?: number;
  quizFirstPassPct?: number;
  onTimeStreakWeeks?: number;
};

export type MetricKey = "aht" | "qaScore" | "csat" | "adherence";

export type PerformanceSignal = {
  id: string;
  tenantId: string;
  userId: string;
  metric: MetricKey;
  label: string;
  value: number;
  target: number;
  direction: "above_limit" | "below_target";
  severity: "low" | "medium" | "high";
  occurredAt: string;
  source: "QA" | "WFM" | "CX Ops";
  summary: string;
};

export type InterventionRule = {
  id: string;
  metric: MetricKey;
  thresholdLabel: string;
  skillGap: string;
  assignedJourneyId: string;
  assignedAction: string;
  rationale: string;
};

export type LearningModule = {
  id: string;
  title: string;
  format: "Microlearning" | "Playbook" | "Scenario" | "Checklist";
  durationMinutes: number;
  skillFocus: string;
  completionRate: number;
};

export type LearningJourney = {
  id: string;
  tenantId: string;
  role: Extract<DemoRole, "manager" | "coach" | "learner" | "executive">;
  title: string;
  progress: number;
  competencyGap: string;
  modules: LearningModule[];
};

export type Intervention = {
  id: string;
  tenantId: string;
  signalId: string;
  assigneeUserId: string;
  ownerUserId: string;
  ruleId: string;
  title: string;
  status: "new" | "in_progress" | "completed" | "overdue";
  dueDate: string;
  createdAt: string;
  gap: string;
  assignedActions: string[];
};

export type CoachingSession = {
  id: string;
  tenantId: string;
  managerUserId: string;
  learnerUserId: string;
  title: string;
  status: "scheduled" | "follow_up_due" | "completed";
  dueDate: string;
  notes: string;
  auditTrail: Array<{
    at: string;
    detail: string;
  }>;
  actionPlan: string[];
};

export type NotificationItem = {
  id: string;
  tenantId: string;
  audience: DemoRole | "all";
  title: string;
  detail: string;
  priority: "info" | "warning" | "critical";
  createdAt: string;
};

export type MethodologyAsset = {
  id: string;
  title: string;
  category: string;
  summary: string;
  linkedRole: DemoRole | "all";
};

export type MethodologyMapping = {
  assetId: string;
  tenantId: string | "all";
  principle: string;
  platformSurface: string;
  implementationNote: string;
};

export type AiSuggestion = {
  id: string;
  tenantId: string;
  managerUserId: string;
  learnerUserId: string;
  summary: string;
  recommendation: string;
  rationale: string[];
  overrideAvailable: boolean;
};

export type RetrainingAssignment = {
  id: string;
  tenantId: string;
  learnerUserId: string;
  journeyId: string;
  journeyTitle: string;
  moduleId: string;
  moduleTitle: string;
  moduleFormat: LearningModule["format"];
  skillFocus: string;
  sourceSuggestionId: string;
  requestedByRole: "manager" | "coach";
  requestedByUserId: string;
  deliveryMode: "ai_approved" | "manual_override";
  summary: string;
  guidanceNote: string;
  status: "assigned" | "in_progress" | "completed";
  createdAt: string;
  dueAt: string;
  completedAt?: string;
};

export type DocumentationEntry = {
  id: string;
  tenantId: string;
  subjectUserId: string;
  sourceType: "journey_completion" | "module_completion" | "intervention_completion" | "coaching_summary";
  title: string;
  summary: string;
  createdAt: string;
  authoredByRole: "system" | DemoRole;
  evidencePoints: string[];
  weeklyCoachingLogId?: string;
};

export type ReviewLogAttachedResource = {
  id: string;
  title: string;
  format: string;
  sourceKind: "client_upload" | "chcg_library";
  sourceLabel: string;
};

export type ReviewLog = {
  id: string;
  tenantId: string;
  subjectUserId: string;
  authorUserId: string;
  authorRole: "manager" | "coach" | "executive" | "client_admin";
  reviewType: "one_on_one" | "quarterly_check_in" | "annual_review";
  title: string;
  notes: string;
  createdAt: string;
  nextStep: string;
  weeklyCoachingLogId?: string;
  attachments: WeeklyCoachingAttachment[];
  attachedResources: ReviewLogAttachedResource[];
};

export type CreateReviewLogInput = {
  tenantId: string;
  subjectUserId: string;
  authorRole: "manager" | "coach" | "executive" | "client_admin";
  reviewType: "one_on_one" | "quarterly_check_in" | "annual_review";
  title: string;
  notes: string;
  nextStep: string;
  weeklyCoachingLogId?: string;
  attachments?: WeeklyCoachingAttachment[];
  attachedResources?: ReviewLogAttachedResource[];
};

export type WeeklyCoachingAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileUrl: string;
  storageKey?: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByRole: "manager" | "coach" | "executive" | "client_admin";
};

export type WeeklyCoachingVisibility = "public" | "private";

export type WeeklyCoachingLog = {
  id: string;
  tenantId: string;
  subjectUserId: string;
  coachUserId: string;
  coachRole: "manager" | "coach" | "executive" | "client_admin";
  coachName: string;
  coachEmail: string;
  employeeName: string;
  employeeEmail: string;
  supervisorUserId: string;
  supervisorName: string;
  supervisorEmail: string;
  managerOfSupervisorEmail?: string;
  sessionDate: string;
  attendance: string;
  followUpFromPrevious: string;
  coachingComments: string;
  smartGoalCommitment: string;
  additionalSupport: string;
  agentTakeaways: string;
  createdAt: string;
  updatedAt: string;
  linkedReviewLogId?: string;
  visibility: WeeklyCoachingVisibility;
  attachments: WeeklyCoachingAttachment[];
};

export type CreateWeeklyCoachingLogInput = {
  tenantId: string;
  subjectUserId: string;
  coachRole: "manager" | "coach" | "executive" | "client_admin";
  sessionDate: string;
  attendance: string;
  followUpFromPrevious: string;
  coachingComments: string;
  smartGoalCommitment: string;
  additionalSupport: string;
  managerOfSupervisorEmail?: string;
  agentTakeaways?: string;
  visibility?: WeeklyCoachingVisibility;
  attachments?: WeeklyCoachingAttachment[];
};

export type UpdateWeeklyCoachingTakeawaysInput = {
  tenantId: string;
  weeklyCoachingLogId: string;
  agentTakeaways: string;
};

export type UpdateWeeklyCoachingLogInput = {
  tenantId: string;
  weeklyCoachingLogId: string;
  sessionDate: string;
  attendance: string;
  followUpFromPrevious: string;
  coachingComments: string;
  smartGoalCommitment: string;
  additionalSupport: string;
  agentTakeaways?: string;
};

export type AddWeeklyCoachingLogAttachmentsInput = {
  tenantId: string;
  weeklyCoachingLogId: string;
  attachments: WeeklyCoachingAttachment[];
};

export type TenantCustomRole = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  inheritsFrom: DemoRole;
  createdAt: string;
};

export type CreateTenantCustomRoleInput = {
  tenantId: string;
  name: string;
  description: string;
  inheritsFrom: DemoRole;
};

export type ApplyCoachingGuidanceInput = {
  tenantId: string;
  suggestionId: string;
  approverRole: "manager" | "coach";
  journeyId?: string;
  moduleId?: string;
};

export type UpdateRetrainingAssignmentStatusInput = {
  tenantId: string;
  assignmentId: string;
  status: RetrainingAssignment["status"];
};

export type TenantBranding = {
  accent: string;
  logoMark: string;
  preferredLabel: string;
  heroStatement: string;
  dataIsolation: string;
};

export type BrandingUpdateInput = {
  tenantId: string;
  accent: string;
  logoMark: string;
  preferredLabel: string;
  heroStatement: string;
};

export type ContentLibraryAsset = {
  id: string;
  tenantId: string | "all";
  title: string;
  summary: string;
  category: string;
  sourceKind: "chcg" | "client_upload";
  format: "Deck" | "Playbook" | "Checklist" | "Guide" | "Worksheet" | "Microlearning" | "Document";
  linkedRoles: Array<DemoRole | "all">;
  tags: string[];
  linkedJourneyIds: string[];
  linkedInterventionRuleIds: string[];
  sourceLabel: string;
  sourceType?: "Client SOP" | "QA finding" | "Compliance update" | "Program rollout" | "Leadership enablement";
  curriculumStatus?: "mapped_ready" | "pending_alignment" | "review_only";
  maintenanceJourneyId?: string;
  maintenanceModuleId?: string;
  launchReadinessNote?: string;
  fileName?: string;
  fileUrl?: string;
  createdAt: string;
};

export type CreateClientContentInput = {
  tenantId: string;
  title: string;
  summary: string;
  category: string;
  format: ContentLibraryAsset["format"];
  linkedRoles: Array<DemoRole | "all">;
  tags: string[];
  sourceLabel: string;
  sourceType?: ContentLibraryAsset["sourceType"];
  curriculumStatus?: ContentLibraryAsset["curriculumStatus"];
  maintenanceJourneyId?: string;
  maintenanceModuleId?: string;
  launchReadinessNote?: string;
  fileName?: string;
  fileUrl?: string;
};

export type DemoAccessGrant = {
  openId: string;
  tenantId: string;
  role: DemoRole | "platform_admin";
  name: string;
};

export type DemoViewerAccess = {
  grant: DemoAccessGrant;
  tenant: Pick<DemoTenant, "id" | "name" | "industry">;
  permittedRoles: DemoRole[];
  canSwitchTenant: boolean;
};

export type TenantTrainingEntitlement = {
  licensedJourneyIds: string[];
  licensedAssetIds: string[];
};

export type ChcgPlatformSettings = {
  provisioningMode: "Guided" | "Self-serve review";
  defaultLibraryPolicy: "CHCG core plus licensed tenant uploads" | "Tenant-curated with CHCG overlays";
  trainingUnlockPolicy: "Manual CHCG approval" | "Client-admin request with CHCG confirmation";
  governanceNote: string;
};

type CreateChcgTenantInput = {
  name: string;
  industry: string;
  accent: string;
  logoMark: string;
  description: string;
  heroStatement: string;
};

type UpdateTenantTrainingAccessInput = {
  tenantId: string;
  licensedJourneyIds: string[];
  licensedAssetIds: string[];
};

const tenants: DemoTenant[] = [
  {
    id: "atlas-operations",
    name: "Enterprise Operations Workspace",
    industry: "Enterprise shared services",
    accent: "#2F6FED",
    logoMark: "EW",
    description: "A distributed service organization using CHCG methodology to connect coaching discipline, workflow precision, and measurable performance movement.",
    heroStatement: "CHCG-powered enablement intelligence for service teams that need stronger execution, cleaner coaching, and clearer ROI.",
  },
  {
    id: "lighthouse-finance",
    name: "Regulated Operations Workspace",
    industry: "Regulated customer operations",
    accent: "#0E7490",
    logoMark: "LF",
    description: "A quality-sensitive operation focused on trust, auditability, and consistent frontline coaching across distributed teams.",
    heroStatement: "Structured coaching and evidence-led readiness for high-accountability service environments.",
  },
  {
    id: "horizon-commerce",
    name: "Horizon Commerce Support",
    industry: "Omnichannel customer support",
    accent: "#7C3AED",
    logoMark: "HC",
    description: "A modern support organization balancing speed, service quality, and recognition-driven engagement in hybrid delivery models.",
    heroStatement: "Operational readiness and culture momentum, built through CHCG learning journeys and intervention precision.",
  },
];

const users: DemoUser[] = [
  { id: "u-exec-1", tenantId: "atlas-operations", name: "Alicia Warren", email: "alicia.warren@enterpriseworkspace.demo", title: "VP, Workforce Performance", role: "executive", team: "Enterprise", avatarFallback: "AW", readinessScore: 84 },
  { id: "u-mgr-1", tenantId: "atlas-operations", name: "Marcus Bell", email: "marcus.bell@enterpriseworkspace.demo", title: "Performance Enablement Manager", role: "manager", team: "Core Service Delivery", avatarFallback: "MB", readinessScore: 78 },
  { id: "u-coach-1", tenantId: "atlas-operations", name: "Renee Lawson", email: "renee.lawson@enterpriseworkspace.demo", title: "Frontline Coach Supervisor", role: "coach", team: "Core Service Delivery", avatarFallback: "RL", readinessScore: 79 },
  { id: "u-learn-1", tenantId: "atlas-operations", name: "Nina Patel", email: "nina.patel@enterpriseworkspace.demo", title: "Senior Service Specialist", role: "learner", team: "Core Service Delivery", avatarFallback: "NP", readinessScore: 72, journeyProgressPct: 71, completedRatioPct: 50, quizFirstPassPct: 62, onTimeStreakWeeks: 8 },
  { id: "u-learn-1b", tenantId: "atlas-operations", name: "Avery Chen", email: "avery.chen@enterpriseworkspace.demo", title: "Service Specialist II", role: "learner", team: "Core Service Delivery", avatarFallback: "AC", readinessScore: 76, journeyProgressPct: 71, completedRatioPct: 90, quizFirstPassPct: 65, onTimeStreakWeeks: 7 },
  { id: "u-learn-1c", tenantId: "atlas-operations", name: "Maya Johnson", email: "maya.johnson@enterpriseworkspace.demo", title: "Customer Resolution Specialist", role: "learner", team: "Core Service Delivery", avatarFallback: "MJ", readinessScore: 68, journeyProgressPct: 71, completedRatioPct: 60, quizFirstPassPct: 73, onTimeStreakWeeks: 6 },
  { id: "u-admin-1", tenantId: "atlas-operations", name: "Jared Kim", email: "jared.kim@enterpriseworkspace.demo", title: "Client Admin", role: "client_admin", team: "Enablement Governance", avatarFallback: "JK", readinessScore: 90 },
  { id: "u-exec-2", tenantId: "lighthouse-finance", name: "Leah Porter", email: "leah.porter@regulatedworkspace.demo", title: "Chief Service Officer", role: "executive", team: "Enterprise", avatarFallback: "LP", readinessScore: 86 },
  { id: "u-mgr-2", tenantId: "lighthouse-finance", name: "Darius Cole", email: "darius.cole@regulatedworkspace.demo", title: "Quality and Coaching Supervisor", role: "manager", team: "Resolution Operations", avatarFallback: "DC", readinessScore: 80 },
  { id: "u-coach-2", tenantId: "lighthouse-finance", name: "Monica Ellis", email: "monica.ellis@regulatedworkspace.demo", title: "Coaching Supervisor", role: "coach", team: "Resolution Operations", avatarFallback: "ME", readinessScore: 78 },
  { id: "u-learn-2", tenantId: "lighthouse-finance", name: "Emily Ross", email: "emily.ross@regulatedworkspace.demo", title: "Client Support Specialist", role: "learner", team: "Resolution Operations", avatarFallback: "ER", readinessScore: 74, journeyProgressPct: 66, completedRatioPct: 70, quizFirstPassPct: 62, onTimeStreakWeeks: 8 },
  { id: "u-admin-2", tenantId: "lighthouse-finance", name: "Tanya Brooks", email: "tanya.brooks@regulatedworkspace.demo", title: "Client Admin", role: "client_admin", team: "Operational Governance", avatarFallback: "TB", readinessScore: 91 },
  { id: "u-exec-3", tenantId: "horizon-commerce", name: "Devon Hayes", email: "devon.hayes@horizoncommerce.demo", title: "VP, Experience Operations", role: "executive", team: "Enterprise", avatarFallback: "DH", readinessScore: 81 },
  { id: "u-mgr-3", tenantId: "horizon-commerce", name: "Sofia Nguyen", email: "sofia.nguyen@horizoncommerce.demo", title: "Omnichannel Team Leader", role: "manager", team: "Digital Care", avatarFallback: "SN", readinessScore: 76 },
  { id: "u-coach-3", tenantId: "horizon-commerce", name: "Caleb Morris", email: "caleb.morris@horizoncommerce.demo", title: "Customer Care Coach", role: "coach", team: "Digital Care", avatarFallback: "CM", readinessScore: 77 },
  { id: "u-learn-3", tenantId: "horizon-commerce", name: "Jordan Blake", email: "jordan.blake@horizoncommerce.demo", title: "Support Associate", role: "learner", team: "Digital Care", avatarFallback: "JB", readinessScore: 70, journeyProgressPct: 63, completedRatioPct: 65, quizFirstPassPct: 60, onTimeStreakWeeks: 6 },
  { id: "u-admin-3", tenantId: "horizon-commerce", name: "Priya Shah", email: "priya.shah@horizoncommerce.demo", title: "Client Admin", role: "client_admin", team: "Experience Systems", avatarFallback: "PS", readinessScore: 88 },
  // Additional learners (LEAD2) so Team standings are meaningful: Resolution Operations → 4, Digital Care → 4.
  { id: "u-learn-2b", tenantId: "lighthouse-finance", name: "Owen Bradley", email: "owen.bradley@regulatedworkspace.demo", title: "Client Support Specialist", role: "learner", team: "Resolution Operations", avatarFallback: "OB", readinessScore: 81, journeyProgressPct: 88, completedRatioPct: 95, quizFirstPassPct: 84, onTimeStreakWeeks: 8 },
  { id: "u-learn-2c", tenantId: "lighthouse-finance", name: "Carla Devlin", email: "carla.devlin@regulatedworkspace.demo", title: "Resolution Specialist", role: "learner", team: "Resolution Operations", avatarFallback: "CD", readinessScore: 70, journeyProgressPct: 60, completedRatioPct: 55, quizFirstPassPct: 58, onTimeStreakWeeks: 4 },
  { id: "u-learn-2d", tenantId: "lighthouse-finance", name: "Trent Walsh", email: "trent.walsh@regulatedworkspace.demo", title: "Client Support Associate", role: "learner", team: "Resolution Operations", avatarFallback: "TW", readinessScore: 65, journeyProgressPct: 45, completedRatioPct: 40, quizFirstPassPct: 50, onTimeStreakWeeks: 3 },
  { id: "u-learn-3b", tenantId: "horizon-commerce", name: "Hannah Kim", email: "hannah.kim@horizoncommerce.demo", title: "Support Associate", role: "learner", team: "Digital Care", avatarFallback: "HK", readinessScore: 73, journeyProgressPct: 70, completedRatioPct: 72, quizFirstPassPct: 68, onTimeStreakWeeks: 7 },
  { id: "u-learn-3c", tenantId: "horizon-commerce", name: "Liam Foster", email: "liam.foster@horizoncommerce.demo", title: "Care Associate", role: "learner", team: "Digital Care", avatarFallback: "LF", readinessScore: 67, journeyProgressPct: 52, completedRatioPct: 48, quizFirstPassPct: 55, onTimeStreakWeeks: 5 },
  { id: "u-learn-3d", tenantId: "horizon-commerce", name: "Gabriela Santos", email: "gabriela.santos@horizoncommerce.demo", title: "Senior Care Associate", role: "learner", team: "Digital Care", avatarFallback: "GS", readinessScore: 79, journeyProgressPct: 82, completedRatioPct: 88, quizFirstPassPct: 77, onTimeStreakWeeks: 8 },
];

const journeys: LearningJourney[] = [
  {
    id: "journey-service-foundations",
    tenantId: "atlas-operations",
    role: "learner",
    title: "Soft Skills & Customer/Patient Service Foundation",
    progress: 71,
    competencyGap: "Empathy language and call control consistency",
    modules: [
      { id: "mod-sf-1", title: "Active Listening", format: "Microlearning", durationMinutes: 8, skillFocus: "Listening precision", completionRate: 88 },
      { id: "mod-sf-2", title: "Empathy and Reassurance", format: "Playbook", durationMinutes: 11, skillFocus: "Language confidence", completionRate: 77 },
      { id: "mod-sf-3", title: "De-Escalation and Service Recovery", format: "Scenario", durationMinutes: 10, skillFocus: "Service recovery", completionRate: 69 },
      { id: "mod-sf-4", title: "Professionalism and Call Closing", format: "Checklist", durationMinutes: 6, skillFocus: "Call closure discipline", completionRate: 74 },
    ],
  },
  {
    id: "journey-workflow-precision",
    tenantId: "atlas-operations",
    role: "manager",
    title: "Quality Assurance Essentials",
    progress: 83,
    competencyGap: "Coaching consistency on workflow accuracy and documentation",
    modules: [
      { id: "mod-wp-1", title: "Verification and Workflow Accuracy", format: "Playbook", durationMinutes: 9, skillFocus: "Process discipline", completionRate: 91 },
      { id: "mod-wp-2", title: "Turning QA Findings into Behavior Coaching", format: "Microlearning", durationMinutes: 7, skillFocus: "Behavior-based coaching", completionRate: 89 },
      { id: "mod-wp-3", title: "QA Calibration and Fair Score Interpretation", format: "Checklist", durationMinutes: 6, skillFocus: "Evaluation rigor", completionRate: 82 },
    ],
  },
  {
    id: "journey-coach-practice-atlas",
    tenantId: "atlas-operations",
    role: "coach",
    title: "Real-time Coaching",
    progress: 77,
    competencyGap: "Consistent field coaching with observable follow-through",
    modules: [
      { id: "mod-rtc-1", title: "5 Coaching Pillars", format: "Playbook", durationMinutes: 9, skillFocus: "Trust-building and self-discovery", completionRate: 89 },
      { id: "mod-rtc-2", title: "SMART Goals and Coaching Documentation", format: "Microlearning", durationMinutes: 8, skillFocus: "Action planning and follow-through", completionRate: 84 },
      { id: "mod-rtc-3", title: "Learning Styles and Accountability Conversations", format: "Scenario", durationMinutes: 10, skillFocus: "Personalized coaching and ownership", completionRate: 79 },
    ],
  },
  {
    id: "journey-data-led-leadership",
    tenantId: "atlas-operations",
    role: "executive",
    title: "Unlocking the Power of Data",
    progress: 68,
    competencyGap: "Intervention-to-outcome visibility",
    modules: [
      { id: "mod-dl-1", title: "Reading and Understanding KPIs", format: "Playbook", durationMinutes: 10, skillFocus: "KPI interpretation", completionRate: 72 },
      { id: "mod-dl-2", title: "Translating Data into Actionable Insights", format: "Microlearning", durationMinutes: 9, skillFocus: "Root-cause analysis and action planning", completionRate: 69 },
      { id: "mod-dl-3", title: "Validating Conclusions and Building Better Reports", format: "Checklist", durationMinutes: 8, skillFocus: "Decision-ready data review", completionRate: 64 },
    ],
  },
  {
    id: "journey-service-foundations-lf",
    tenantId: "lighthouse-finance",
    role: "learner",
    title: "Soft Skills & Customer/Patient Service Foundation",
    progress: 66,
    competencyGap: "Professional confidence in regulated conversations",
    modules: [
      { id: "mod-lfs-1", title: "Professional clarity under compliance pressure", format: "Microlearning", durationMinutes: 9, skillFocus: "Composure", completionRate: 71 },
      { id: "mod-lfs-2", title: "Verification discipline and secure handoffs", format: "Checklist", durationMinutes: 7, skillFocus: "Accuracy", completionRate: 79 },
      { id: "mod-lfs-3", title: "Reassurance phrases that build trust", format: "Playbook", durationMinutes: 10, skillFocus: "Trust-building", completionRate: 67 },
    ],
  },
  {
    id: "journey-coach-practice-lf",
    tenantId: "lighthouse-finance",
    role: "coach",
    title: "Real-time Coaching",
    progress: 75,
    competencyGap: "Recovery coaching consistency under compliance pressure",
    modules: [
      { id: "mod-rtc-1", title: "5 Coaching Pillars", format: "Playbook", durationMinutes: 9, skillFocus: "Trust-building and self-discovery", completionRate: 82 },
      { id: "mod-rtc-2", title: "SMART Goals and Coaching Documentation", format: "Microlearning", durationMinutes: 8, skillFocus: "Action planning and follow-through", completionRate: 86 },
      { id: "mod-rtc-3", title: "Learning Styles and Accountability Conversations", format: "Scenario", durationMinutes: 10, skillFocus: "Personalized coaching and ownership", completionRate: 80 },
    ],
  },
  {
    id: "journey-performance-leadership-lf",
    tenantId: "lighthouse-finance",
    role: "manager",
    title: "Utilizing Performance Management to Maximize Results",
    progress: 79,
    competencyGap: "Performance segmentation without bias",
    modules: [
      { id: "mod-lfp-1", title: "The 3 Performance Buckets", format: "Playbook", durationMinutes: 9, skillFocus: "Performance segmentation", completionRate: 81 },
      { id: "mod-lfp-2", title: "Calibration and QA-Driven Coaching", format: "Scenario", durationMinutes: 12, skillFocus: "Objective coaching and bias control", completionRate: 75 },
      { id: "mod-lfp-3", title: "Tailored Performance Plans and Leadership Rituals", format: "Checklist", durationMinutes: 9, skillFocus: "Performance planning and follow-through", completionRate: 80 },
    ],
  },
  {
    id: "journey-data-led-leadership-lf",
    tenantId: "lighthouse-finance",
    role: "executive",
    title: "Unlocking the Power of Data",
    progress: 73,
    competencyGap: "Cross-team trend validation",
    modules: [
      { id: "mod-lfd-1", title: "Avoiding Pitfalls in Data Analysis", format: "Microlearning", durationMinutes: 8, skillFocus: "Bias-aware interpretation", completionRate: 77 },
      { id: "mod-lfd-2", title: "Validating Conclusions Across Teams and Time Periods", format: "Playbook", durationMinutes: 9, skillFocus: "Decision quality", completionRate: 74 },
    ],
  },
  {
    id: "journey-service-foundations-hc",
    tenantId: "horizon-commerce",
    role: "learner",
    title: "Customer Service Foundations for Digital Care",
    progress: 63,
    competencyGap: "Consistency in tone and issue ownership",
    modules: [
      { id: "mod-hcs-1", title: "Human service language in fast channels", format: "Microlearning", durationMinutes: 7, skillFocus: "Tone control", completionRate: 70 },
      { id: "mod-hcs-2", title: "Warm transfers and clean next steps", format: "Checklist", durationMinutes: 6, skillFocus: "Transfer discipline", completionRate: 65 },
      { id: "mod-hcs-3", title: "Closing the loop with confidence", format: "Scenario", durationMinutes: 9, skillFocus: "Issue ownership", completionRate: 61 },
    ],
  },
  {
    id: "journey-coach-practice-hc",
    tenantId: "horizon-commerce",
    role: "manager",
    title: "Real-time Coaching",
    progress: 74,
    competencyGap: "Visible coaching follow-through across digital channels",
    modules: [
      { id: "mod-rtc-1", title: "5 Coaching Pillars", format: "Playbook", durationMinutes: 9, skillFocus: "Trust-building and self-discovery", completionRate: 80 },
      { id: "mod-rtc-2", title: "SMART Goals and Coaching Documentation", format: "Microlearning", durationMinutes: 8, skillFocus: "Action planning and follow-through", completionRate: 78 },
      { id: "mod-rtc-3", title: "Learning Styles and Accountability Conversations", format: "Scenario", durationMinutes: 10, skillFocus: "Personalized coaching and ownership", completionRate: 76 },
    ],
  },
  {
    id: "journey-engagement-systems-hc",
    tenantId: "horizon-commerce",
    role: "manager",
    title: "Gamification for Remote Teams: Engaging and Empowering Leaders",
    progress: 76,
    competencyGap: "Recognition rhythm for hybrid teams",
    modules: [
      { id: "mod-hce-1", title: "Foundations of Engagement and Gamification", format: "Playbook", durationMinutes: 9, skillFocus: "Recognition and motivation design", completionRate: 84 },
      { id: "mod-hce-2", title: "Designing Rewards, Games, and Recognition Rhythms", format: "Microlearning", durationMinutes: 8, skillFocus: "Team motivation and reward systems", completionRate: 72 },
      { id: "mod-hce-3", title: "Measuring Engagement and Iterating the Program", format: "Checklist", durationMinutes: 8, skillFocus: "Continuous improvement", completionRate: 77 },
    ],
  },
  {
    id: "journey-exec-culture-hc",
    tenantId: "horizon-commerce",
    role: "executive",
    title: "Culture Momentum and Readiness Visibility",
    progress: 61,
    competencyGap: "Linking recognition to measurable performance",
    modules: [
      { id: "mod-hcd-1", title: "Engagement metrics that matter", format: "Playbook", durationMinutes: 10, skillFocus: "Engagement measurement", completionRate: 66 },
      { id: "mod-hcd-2", title: "Operating rhythm for distributed teams", format: "Checklist", durationMinutes: 7, skillFocus: "Leadership cadence", completionRate: 59 },
    ],
  },
  {
    id: "journey-wfm-kpi",
    tenantId: "atlas-operations",
    role: "learner",
    title: "Workforce Management & KPIs",
    progress: 0,
    competencyGap: "Schedule adherence and KPI literacy for frontline agents",
    modules: [
      { id: "mod-wfm-1", title: "WFM Foundations and Adherence", format: "Playbook", durationMinutes: 10, skillFocus: "Schedule adherence", completionRate: 0 },
      { id: "mod-wfm-2", title: "Productivity, Occupancy, and Utilization", format: "Microlearning", durationMinutes: 9, skillFocus: "Efficiency metrics", completionRate: 0 },
      { id: "mod-wfm-3", title: "KPI Scorecards and Targets", format: "Checklist", durationMinutes: 8, skillFocus: "KPI literacy", completionRate: 0 },
    ],
  },
];

const rules: InterventionRule[] = [
  {
    id: "rule-qa-precision",
    metric: "qaScore",
    thresholdLabel: "QA below 85",
    skillGap: "Workflow precision and communication quality",
    assignedJourneyId: "journey-workflow-precision",
    assignedAction: "Assign workflow-precision modules and schedule manager coaching review",
    rationale: "Quality gaps should trigger both learning reinforcement and manager-led behavior coaching, not one or the other in isolation.",
  },
  {
    id: "rule-aht-call-control",
    metric: "aht",
    thresholdLabel: "AHT above threshold",
    skillGap: "Call control and workflow navigation",
    assignedJourneyId: "journey-service-foundations",
    assignedAction: "Assign call-control module and require one-on-one follow-up with summary-note review",
    rationale: "Extended handle time often reflects uncertainty, weak transitions, or documentation friction that should be coached with observable behavior targets.",
  },
  {
    id: "rule-adherence-rhythm",
    metric: "adherence",
    thresholdLabel: "Adherence below 88",
    skillGap: "Daily operating rhythm and accountability",
    assignedJourneyId: "journey-performance-leadership-lf",
    assignedAction: "Launch adherence coaching plan with weekly check-ins and documented checkpoints",
    rationale: "Schedule reliability improves when leaders combine data visibility, expectations, and follow-up cadence.",
  },
  {
    id: "rule-csat-recovery",
    metric: "csat",
    thresholdLabel: "CSAT below 4.3",
    skillGap: "Service recovery and reassurance language",
    assignedJourneyId: "journey-service-foundations",
    assignedAction: "Assign reassurance and service-recovery modules, then review three interactions for progress",
    rationale: "Customer sentiment should map directly to empathy, ownership, and confidence behaviors supported by targeted learning.",
  },
];

const signals: PerformanceSignal[] = [
  {
    id: "sig-1",
    tenantId: "atlas-operations",
    userId: "u-learn-1",
    metric: "qaScore",
    label: "QA score",
    value: 81,
    target: 90,
    direction: "below_target",
    severity: "high",
    occurredAt: isoDaysFromNow(-2),
    source: "QA",
    summary: "Verification consistency and reassurance phrasing drifted below the CHCG quality target across recent monitored interactions.",
  },
  {
    id: "sig-2",
    tenantId: "atlas-operations",
    userId: "u-learn-1",
    metric: "aht",
    label: "Average handle time",
    value: 602,
    target: 540,
    direction: "above_limit",
    severity: "medium",
    occurredAt: isoDaysFromNow(-2),
    source: "CX Ops",
    summary: "Summary statements and system navigation pauses are extending interactions beyond target duration.",
  },
  {
    id: "sig-3",
    tenantId: "atlas-operations",
    userId: "u-learn-1",
    metric: "csat",
    label: "Customer satisfaction",
    value: 4.1,
    target: 4.5,
    direction: "below_target",
    severity: "medium",
    occurredAt: isoDaysFromNow(-1),
    source: "CX Ops",
    summary: "Recent feedback suggests customers want clearer reassurance and stronger ownership language.",
  },
  {
    id: "sig-4",
    tenantId: "atlas-operations",
    userId: "u-learn-1",
    metric: "adherence",
    label: "Adherence",
    value: 86,
    target: 90,
    direction: "below_target",
    severity: "low",
    occurredAt: isoDaysFromNow(-1),
    source: "WFM",
    summary: "Return-from-break drift appears in two recent intervals and requires a coaching checkpoint.",
  },
];

const interventions: Intervention[] = [
  {
    id: "int-1",
    tenantId: "atlas-operations",
    signalId: "sig-1",
    assigneeUserId: "u-learn-1",
    ownerUserId: "u-mgr-1",
    ruleId: "rule-qa-precision",
    title: "Restore workflow precision and score reliability",
    status: "in_progress",
    dueDate: dateOnlyDaysFromNow(3),
    createdAt: isoDaysFromNow(-5),
    gap: "Verification accuracy and reassurance quality",
    assignedActions: [
      "Complete verification and workflow accuracy playbook",
      "Review two scored interactions with manager annotation",
      "Document one behavior commitment in the next coaching log",
    ],
  },
  {
    id: "int-2",
    tenantId: "atlas-operations",
    signalId: "sig-2",
    assigneeUserId: "u-learn-1",
    ownerUserId: "u-mgr-1",
    ruleId: "rule-aht-call-control",
    title: "Reduce handle time through stronger call control",
    status: "new",
    dueDate: dateOnlyDaysFromNow(2),
    createdAt: isoDaysFromNow(-4),
    gap: "Call structure and documentation efficiency",
    assignedActions: [
      "Complete high-scoring closings checklist",
      "Practice shorter transition statements",
      "Capture one call-opening improvement in the 1:1 log",
    ],
  },
  {
    id: "int-3",
    tenantId: "atlas-operations",
    signalId: "sig-4",
    assigneeUserId: "u-learn-1",
    ownerUserId: "u-mgr-1",
    ruleId: "rule-adherence-rhythm",
    title: "Stabilize daily operating rhythm",
    status: "completed",
    dueDate: dateOnlyDaysFromNow(-6),
    createdAt: isoDaysFromNow(-8),
    gap: "Schedule discipline and operating rhythm",
    assignedActions: [
      "Set start-of-day checklist",
      "Confirm break-return commitments",
      "Review adherence trend at weekly coaching touchpoint",
    ],
  },
];

const coachingSessions: CoachingSession[] = [
  {
    id: "coach-1",
    tenantId: "atlas-operations",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1",
    title: "Workflow precision follow-up",
    status: "follow_up_due",
    dueDate: dateOnlyDaysFromNow(-1),
    notes: "Focused on verification flow, reassurance language, and faster summary transitions tied to recent QA variance.",
    auditTrail: [
      { at: "2026-04-19T08:35:00Z", detail: "Intervention created after QA threshold breach." },
      { at: "2026-04-19T14:00:00Z", detail: "Manager reviewed scored interaction and highlighted three behavior targets." },
      { at: "2026-04-20T13:15:00Z", detail: "One-on-one completed and next monitored-call sample requested." },
    ],
    actionPlan: [
      "Use ask-don't-tell verification language",
      "Confirm next steps with concise summary language",
      "Document confidence phrases for service recovery scenarios",
    ],
  },
  {
    id: "coach-2",
    tenantId: "atlas-operations",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1",
    title: "Quarterly growth checkpoint",
    status: "scheduled",
    dueDate: dateOnlyDaysFromNow(6),
    notes: "Quarterly review will combine journey progress, intervention closeout evidence, and readiness movement into an updated development path.",
    auditTrail: [
      { at: "2026-04-20T16:05:00Z", detail: "Quarterly checkpoint scheduled by manager." },
    ],
    actionPlan: [
      "Review completed modules and behavior changes",
      "Assess readiness score movement",
      "Set next-quarter growth focus",
    ],
  },
  {
    id: "coach-3",
    tenantId: "atlas-operations",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1b",
    title: "Escalation confidence tune-up",
    status: "scheduled",
    dueDate: dateOnlyDaysFromNow(2),
    notes: "Focused on confident transfer framing, escalation ownership, and tighter wrap-up language after complex workflows.",
    auditTrail: [
      { at: "2026-04-20T09:10:00Z", detail: "Coach flagged repeated hesitation during escalation handoffs." },
      { at: "2026-04-20T12:20:00Z", detail: "Follow-up session scheduled with a transfer-observation checklist." },
    ],
    actionPlan: [
      "Use the approved transfer explanation before warm handoff",
      "State ownership before placing the customer on hold",
      "Log the exact escalation reason in the coaching follow-up",
    ],
  },
  {
    id: "coach-4",
    tenantId: "atlas-operations",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1c",
    title: "Empathy transfer follow-up",
    status: "follow_up_due",
    dueDate: dateOnlyDaysFromNow(1),
    notes: "Focused on reassurance phrasing, documentation clarity, and making AI-recommended training visible inside the next coaching cycle.",
    auditTrail: [
      { at: "2026-04-19T11:40:00Z", detail: "Documentation review showed inconsistent explanation of next steps after complex contacts." },
      { at: "2026-04-20T15:15:00Z", detail: "Coach requested a short empathy-to-action follow-up after the latest review." },
    ],
    actionPlan: [
      "Pair empathy language with one explicit ownership statement",
      "Reference the assigned refresher inside the next weekly coaching log",
      "Document the exact follow-through action for the learner",
    ],
  },
];

const notifications: NotificationItem[] = [
  {
    id: "note-retraining-seeded",
    tenantId: "atlas-operations",
    audience: "learner",
    title: "Retraining assigned: QA calibration",
    detail: "Marcus Bell assigned a targeted refresher on calibration discipline and fair score interpretation. Complete QA Calibration and Fair Score Interpretation within the next 48 hours.",
    priority: "critical",
    createdAt: isoDaysFromNow(-1),
  },
  {
    id: "note-1",
    tenantId: "atlas-operations",
    audience: "manager",
    title: "Follow-up coaching due tomorrow",
    detail: "The workflow precision follow-up for Nina Patel is due in less than 24 hours and should include updated monitored-call notes.",
    priority: "warning",
    createdAt: isoDaysFromNow(-1),
  },
  {
    id: "note-2",
    tenantId: "atlas-operations",
    audience: "executive",
    title: "Readiness uplift holding above target",
    detail: "Intervention-linked readiness movement is currently outperforming the month-to-date plan by 2 points.",
    priority: "info",
    createdAt: isoDaysFromNow(-2),
  },
  {
    id: "note-3",
    tenantId: "atlas-operations",
    audience: "learner",
    title: "New action assigned",
    detail: "Complete the call-control checklist before your next one-on-one so the manager can validate your updated closing approach.",
    priority: "warning",
    createdAt: isoDaysFromNow(-2),
  },
  {
    id: "note-4",
    tenantId: "atlas-operations",
    audience: "all",
    title: "Documentation hub updated",
    detail: "Recent module completions and coaching summaries are now available in the documentation timeline.",
    priority: "info",
    createdAt: isoDaysFromNow(-3),
  },
];

const methodologyAssets: MethodologyAsset[] = [
  {
    id: "asset-kpi-mastery",
    title: "CHCG KPI Mastery Framework",
    category: "Performance governance",
    summary: "A structured CHCG model for reading KPI relationships, spotting variance patterns, and translating data into owned actions.",
    linkedRole: "all",
  },
  {
    id: "asset-service-foundations",
    title: "Service Foundations Playbook",
    category: "Learner enablement",
    summary: "A CHCG service model centered on active listening, empathy, confidence, and professional control in high-friction interactions.",
    linkedRole: "learner",
  },
  {
    id: "asset-workflow-precision",
    title: "Workflow Precision Standard",
    category: "Quality and workflow",
    summary: "A CHCG operational framework for verification, workflow adherence, transfers, hold discipline, and documentation accuracy.",
    linkedRole: "manager",
  },
  {
    id: "asset-performance-leadership",
    title: "Utilizing Performance Management to Maximize Results",
    category: "Coaching methodology",
    summary: "A leadership module centered on performance buckets, calibration, coaching cadence, structured performance plans, and daily leadership rituals.",
    linkedRole: "manager",
  },
  {
    id: "asset-exec-roi",
    title: "Executive Readiness Review",
    category: "Executive governance",
    summary: "A decision framework for connecting interventions, coaching consistency, and measurable performance improvement at the portfolio level.",
    linkedRole: "executive",
  },
  {
    id: "asset-engagement-systems",
    title: "Gamification for Remote Teams",
    category: "Culture and motivation",
    summary: "A leadership module focused on recognition loops, gamified engagement mechanics, pulse checks, and distributed-team operating rhythms.",
    linkedRole: "all",
  },
  {
    id: "asset-qa-calibration",
    title: "QA Calibration and Fairness Guide",
    category: "Quality governance",
    summary: "A CHCG guide for review consistency, critical-failure handling, calibration sessions, and constructive score conversations.",
    linkedRole: "manager",
  },
  {
    id: "asset-review-rhythm",
    title: "Coaching Rhythm and Review Architecture",
    category: "Documentation and cadence",
    summary: "A CHCG structure for one-on-ones, quarterly check-ins, annual reviews, and documented action ownership across workforce levels.",
    linkedRole: "all",
  },
];

const methodologyMappings: MethodologyMapping[] = [
  {
    assetId: "asset-kpi-mastery",
    tenantId: "all",
    principle: "Translate KPI movement into action ownership rather than passive reporting.",
    platformSurface: "Executive dashboard, manager signal feed, intervention engine",
    implementationNote: "Derived from the data-leadership deck's emphasis on trend interpretation, bias avoidance, and root-cause-driven action planning.",
  },
  {
    assetId: "asset-service-foundations",
    tenantId: "all",
    principle: "Frontline performance improves when empathy, confidence, and professionalism are trained as repeatable behaviors.",
    platformSurface: "Learner journeys, intervention modules, documentation evidence",
    implementationNote: "Derived from the soft-skills and QA-essentials decks that emphasize active listening, reassurance, control, and consistent closings.",
  },
  {
    assetId: "asset-workflow-precision",
    tenantId: "all",
    principle: "Workflow fidelity and service quality must be coached together because both shape the customer outcome.",
    platformSurface: "QA signal summaries, manager coaching tools, learner workflow modules",
    implementationNote: "Derived from the QA workflow and QA-essentials decks covering verification, hold procedures, transfers, scoring categories, and call-flow discipline.",
  },
  {
    assetId: "asset-performance-leadership",
    tenantId: "all",
    principle: "Coaching should segment performance fairly, document progress clearly, and create measurable next steps.",
    platformSurface: "Manager one-on-ones, quarterly check-ins, annual reviews, admin governance",
    implementationNote: "Derived from the performance-management deck's buckets, calibration practices, PIP structure, and leadership rituals.",
  },
  {
    assetId: "asset-exec-roi",
    tenantId: "all",
    principle: "Executives need visibility into intervention effectiveness, readiness movement, and coaching consistency to govern investment decisions.",
    platformSurface: "Executive ROI cards, correlation chart, readiness score narrative",
    implementationNote: "Derived from leadership modules that connect dashboards, trends, and action ownership to business outcomes.",
  },
  {
    assetId: "asset-engagement-systems",
    tenantId: "all",
    principle: "Recognition and gamified engagement work best as purposeful operating rhythms, not disconnected reward programs.",
    platformSurface: "Manager engagement panels, admin configuration concepts, recognition and pulse-check content",
    implementationNote: "Derived from the gamification module's points, badges, pulse checks, daily rhythms, and continuous-iteration guidance.",
  },
  {
    assetId: "asset-qa-calibration",
    tenantId: "all",
    principle: "Quality scoring should be fair, explainable, and behavior-focused so coaching improves trust instead of creating confusion.",
    platformSurface: "Manager score interpretation, intervention rules, coaching prep, documentation governance",
    implementationNote: "Derived from the QA essentials deck's scoring categories, critical-failure handling, calibration guidance, and review-conversation structure.",
  },
  {
    assetId: "asset-review-rhythm",
    tenantId: "all",
    principle: "Performance reviews create value when one-on-ones, quarterly check-ins, and annual reviews follow a shared structure with clear evidence and owned next steps.",
    platformSurface: "Documentation hub, structured review logs, executive governance, manager coaching cadence",
    implementationNote: "Derived from the performance-management and documentation workflow themes found across the uploaded leadership and QA decks.",
  },
];

const contentLibraryAssets: ContentLibraryAsset[] = [
  {
    id: "library-service-foundations-core",
    tenantId: "all",
    title: "Soft Skills & Customer/Patient Service Foundation",
    summary: "A CHCG learning deck covering empathy, active listening, professionalism, reassurance, and customer-service recovery behaviors for frontline roles.",
    category: "Agent enablement",
    sourceKind: "chcg",
    format: "Deck",
    linkedRoles: ["learner", "manager"],
    tags: ["service foundations", "soft skills", "customer service", "communication"],
    linkedJourneyIds: ["journey-service-foundations"],
    linkedInterventionRuleIds: [],
    sourceLabel: "Sanitized CHCG source modules",
    createdAt: "2026-04-20T18:45:00Z",
  },
  {
    id: "library-qa-essentials",
    tenantId: "all",
    title: "QA Essentials and Score Confidence",
    summary: "A CHCG quality-governance asset focused on score interpretation, critical-failure handling, call-flow categories, and coaching-ready QA review conversations.",
    category: "Quality governance",
    sourceKind: "chcg",
    format: "Guide",
    linkedRoles: ["manager", "client_admin"],
    tags: ["qa", "quality assurance", "calibration", "coaching"],
    linkedJourneyIds: ["journey-workflow-precision"],
    linkedInterventionRuleIds: ["rule-qa-variance"],
    sourceLabel: "Sanitized CHCG source modules",
    createdAt: "2026-04-20T18:46:00Z",
  },
  {
    id: "library-workflow-precision-kit",
    tenantId: "all",
    title: "Quality Assurance Essentials",
    summary: "A structured CHCG toolkit for verification, hold and transfer discipline, documentation accuracy, and workflow behaviors that directly influence quality results.",
    category: "Operational execution",
    sourceKind: "chcg",
    format: "Checklist",
    linkedRoles: ["learner", "manager"],
    tags: ["workflow", "documentation", "verification", "execution"],
    linkedJourneyIds: ["journey-workflow-precision"],
    linkedInterventionRuleIds: ["rule-aht-recovery", "rule-adherence-rhythm"],
    sourceLabel: "Sanitized CHCG source modules",
    createdAt: "2026-04-20T18:47:00Z",
  },
  {
    id: "library-data-leadership-studio",
    tenantId: "all",
    title: "Unlocking the Power of Data",
    summary: "A leadership deck covering KPI interpretation, trend reading, root-cause analysis, report design, and action-focused decision making.",
    category: "Leadership intelligence",
    sourceKind: "chcg",
    format: "Deck",
    linkedRoles: ["executive", "manager"],
    tags: ["leadership", "data", "kpi", "analytics"],
    linkedJourneyIds: ["journey-data-led-leadership"],
    linkedInterventionRuleIds: [],
    sourceLabel: "Normalized leadership source module",
    createdAt: "2026-04-20T18:48:00Z",
  },
  {
    id: "library-performance-governance",
    tenantId: "all",
    title: "Utilizing Performance Management to Maximize Results",
    summary: "A leadership playbook covering performance buckets, calibration, QA-driven coaching, tailored performance plans, and structured follow-through.",
    category: "Performance governance",
    sourceKind: "chcg",
    format: "Playbook",
    linkedRoles: ["executive", "manager", "client_admin"],
    tags: ["performance management", "calibration", "performance plans", "coaching"],
    linkedJourneyIds: ["journey-performance-leadership"],
    linkedInterventionRuleIds: [],
    sourceLabel: "Normalized leadership source module",
    createdAt: "2026-04-20T18:49:00Z",
  },
  {
    id: "library-gamified-engagement",
    tenantId: "all",
    title: "Gamification for Remote Teams: Engaging and Empowering Leaders",
    summary: "A leadership asset focused on engagement psychology, recognition loops, reward design, pulse checks, and remote-team operating rhythms.",
    category: "Culture and motivation",
    sourceKind: "chcg",
    format: "Worksheet",
    linkedRoles: ["executive", "manager", "client_admin"],
    tags: ["gamification", "engagement", "recognition", "remote teams"],
    linkedJourneyIds: ["journey-engagement-systems-hc"],
    linkedInterventionRuleIds: [],
    sourceLabel: "Normalized leadership source module",
    createdAt: "2026-04-20T18:50:00Z",
  },
  {
    id: "library-atlas-launch-readiness",
    tenantId: "atlas-operations",
    title: "Operational launch readiness brief",
    summary: "A tenant-provided operational brief covering launch checkpoints, workflow reinforcement, and manager review expectations for new process rollouts.",
    category: "Launch readiness",
    sourceKind: "client_upload",
    format: "Deck",
    linkedRoles: ["executive", "manager", "learner", "client_admin"],
    tags: ["launch", "readiness", "workflow", "documentation"],
    linkedJourneyIds: ["journey-service-foundations", "journey-workflow-precision"],
    linkedInterventionRuleIds: ["rule-qa-precision", "rule-aht-call-control"],
    sourceLabel: "Operations enablement office",
    createdAt: "2026-04-20T18:51:00Z",
  },
  {
    id: "library-lighthouse-compliance-brief",
    tenantId: "lighthouse-finance",
    title: "Compliance conversation guide",
    summary: "A tenant-provided guide aligning frontline coaching, quality review language, and documented evidence expectations for regulated interactions.",
    category: "Compliance enablement",
    sourceKind: "client_upload",
    format: "Guide",
    linkedRoles: ["manager", "learner", "client_admin"],
    tags: ["compliance", "qa", "documentation", "coaching"],
    linkedJourneyIds: ["journey-service-foundations"],
    linkedInterventionRuleIds: ["rule-qa-variance"],
    sourceLabel: "Compliance enablement office",
    createdAt: "2026-04-20T18:52:00Z",
  },
  {
    id: "library-meridian-quality-brief",
    tenantId: "meridian-health",
    title: "Meridian care coordination review packet",
    summary: "A tenant-provided packet for manager coaching, workflow precision reinforcement, and review-log evidence capture in healthcare operations.",
    category: "Care coordination",
    sourceKind: "client_upload",
    format: "Document",
    linkedRoles: ["manager", "learner", "client_admin"],
    tags: ["care coordination", "workflow", "reviews", "documentation"],
    linkedJourneyIds: ["journey-workflow-precision"],
    linkedInterventionRuleIds: ["rule-adherence-rhythm"],
    sourceLabel: "Meridian operations excellence",
    createdAt: "2026-04-20T18:53:00Z",
  },
];

const aiSuggestions: AiSuggestion[] = [
  {
    id: "ai-1",
    tenantId: "atlas-operations",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1",
    summary: "Coach Nina on verification confidence and closing discipline before adding new learning volume.",
    recommendation: "Run a 20-minute one-on-one using the workflow precision standard. Review one monitored interaction, document two behavior changes, and keep the active service-foundations modules in place rather than assigning new content immediately.",
    rationale: [
      "QA score remains 9 points below target with recurring verification and reassurance variance.",
      "AHT is elevated, which suggests uncertainty in call transitions and closing structure rather than pure workload pressure.",
      "The learner has already completed foundational empathy content, so the highest-value next step is reinforced coaching with observable call-control behaviors.",
    ],
    overrideAvailable: true,
  },
  {
    id: "ai-2",
    tenantId: "atlas-operations",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1b",
    summary: "Coach Avery on escalation ownership and transfer explanations while reinforcing workflow accuracy.",
    recommendation: "Use the next one-on-one to review one complex transfer, capture the handoff explanation Avery used, and assign a targeted workflow refresher only if the transfer explanation still breaks down under pressure.",
    rationale: [
      "Recent coaching notes show Avery is moving quickly through the workflow but still sounds uncertain when explaining why an escalation is happening.",
      "The best next step is a transfer-specific coaching review tied to a concrete call example rather than a broad coaching reset.",
      "A focused training assignment should stay attached to the transfer lane so the coach can connect the recommendation to operational follow-through.",
    ],
    overrideAvailable: true,
  },
  {
    id: "ai-3",
    tenantId: "atlas-operations",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1c",
    summary: "Coach Maya on empathy-to-action transitions and keep the AI-driven follow-up visible in the transfer workspace.",
    recommendation: "Review one recent customer interaction, focus on how Maya shifts from reassurance into next-step ownership, and reinforce the assigned refresher inside the documented coaching follow-up.",
    rationale: [
      "Recent documentation shows Maya is strong on empathy but inconsistent when turning that empathy into a clear next action for the customer.",
      "A coaching-led review with a visible transfer assignment will help connect the behavior expectation to the learner's next module.",
      "The team needs clearer traceability when AI drives follow-up actions, so the recommendation should remain attached to transfer context.",
    ],
    overrideAvailable: true,
  },
];

const retrainingAssignments: RetrainingAssignment[] = [
  {
    id: "retraining-seeded-1",
    tenantId: "atlas-operations",
    learnerUserId: "u-learn-1",
    journeyId: "journey-workflow-precision",
    journeyTitle: "Quality Assurance Essentials",
    moduleId: "mod-wp-1",
    moduleTitle: "Verification and Workflow Accuracy",
    moduleFormat: "Playbook",
    skillFocus: "Process discipline",
    sourceSuggestionId: "suggest-1",
    requestedByRole: "manager",
    requestedByUserId: "u-manager-1",
    deliveryMode: "ai_approved",
    summary: "Coach Nina on verification workflow accuracy before adding new learning volume.",
    guidanceNote: "Marcus Bell approved the AI recommendation and assigned a targeted workflow-accuracy refresher to the top of Nina's learner journey.",
    status: "assigned",
    createdAt: isoDaysFromNow(-2),
    dueAt: isoDaysFromNow(2),
  },
  {
    id: "retraining-seeded-2",
    tenantId: "atlas-operations",
    learnerUserId: "u-learn-1",
    journeyId: "journey-workflow-precision",
    journeyTitle: "Quality Assurance Essentials",
    moduleId: "mod-wp-3",
    moduleTitle: "QA Calibration and Fair Score Interpretation",
    moduleFormat: "Checklist",
    skillFocus: "Evaluation rigor",
    sourceSuggestionId: "suggest-archive-2",
    requestedByRole: "manager",
    requestedByUserId: "u-manager-1",
    deliveryMode: "ai_approved",
    summary: "Tighten calibration discipline so borderline QA scores are defended with evidence instead of instinct.",
    guidanceNote: "Marcus Bell assigned a focused QA-calibration refresher and Nina completed it during the current coaching cycle.",
    status: "completed",
    createdAt: isoDaysFromNow(-16),
    dueAt: isoDaysFromNow(-14),
    completedAt: isoDaysFromNow(-15),
  },
  {
    id: "retraining-seeded-0",
    tenantId: "atlas-operations",
    learnerUserId: "u-learn-1",
    journeyId: "journey-service-foundations",
    journeyTitle: "Service Foundations",
    moduleId: "mod-sf-1",
    moduleTitle: "Active listening in high-friction interactions",
    moduleFormat: "Scenario",
    skillFocus: "Listening precision",
    sourceSuggestionId: "suggest-archive-1",
    requestedByRole: "coach",
    requestedByUserId: "u-coach-1",
    deliveryMode: "manual_override",
    summary: "Reinforce calm acknowledgment and paraphrasing before the next coaching cycle.",
    guidanceNote: "Renee Lawson assigned a focused listening refresher after the prior QA review and the learner completed it before the next weekly coaching log.",
    status: "completed",
    createdAt: isoDaysFromNow(-32),
    dueAt: isoDaysFromNow(-30),
    completedAt: isoDaysFromNow(-31),
  },
  {
    id: "retraining-seeded-3",
    tenantId: "atlas-operations",
    learnerUserId: "u-learn-1b",
    journeyId: "journey-workflow-precision",
    journeyTitle: "Quality Assurance Essentials",
    moduleId: "mod-wp-1",
    moduleTitle: "Verification and Workflow Accuracy",
    moduleFormat: "Playbook",
    skillFocus: "Transfer accuracy",
    sourceSuggestionId: "ai-2",
    requestedByRole: "coach",
    requestedByUserId: "u-coach-1",
    deliveryMode: "ai_approved",
    summary: "Coach Avery on escalation ownership and transfer explanations while reinforcing workflow accuracy.",
    guidanceNote: "Renee Lawson approved the AI transfer recommendation and kept the exact workflow refresher visible in the coach transfer lane.",
    status: "assigned",
    createdAt: isoDaysFromNow(-3),
    dueAt: isoDaysFromNow(-1),
  },
  {
    id: "retraining-seeded-4",
    tenantId: "atlas-operations",
    learnerUserId: "u-learn-1c",
    journeyId: "journey-service-foundations",
    journeyTitle: "Service Foundations",
    moduleId: "mod-sf-1",
    moduleTitle: "Active listening in high-friction interactions",
    moduleFormat: "Scenario",
    skillFocus: "Empathy-to-action transitions",
    sourceSuggestionId: "ai-3",
    requestedByRole: "coach",
    requestedByUserId: "u-coach-1",
    deliveryMode: "manual_override",
    summary: "Coach Maya on empathy-to-action transitions and keep the AI-driven follow-up visible in the transfer workspace.",
    guidanceNote: "Renee Lawson overrode the broader suggestion and assigned a focused service-foundations refresher that Maya has already completed.",
    status: "completed",
    createdAt: isoDaysFromNow(-12),
    dueAt: isoDaysFromNow(-10),
    completedAt: isoDaysFromNow(-11),
  },
];

const documentationEntries: DocumentationEntry[] = [
  {
    id: "doc-1",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1",
    sourceType: "module_completion",
    title: "Active listening module completion recorded",
    summary: "The platform captured completion of the active-listening microlearning and attached the targeted behavior change expected in monitored interactions.",
    createdAt: "2026-04-19T18:05:00Z",
    authoredByRole: "system",
    evidencePoints: [
      "Module: Active listening in high-friction interactions",
      "Skill focus: Listening precision",
      "Expected transfer: stronger acknowledgment and paraphrasing on live interactions",
    ],
  },
  {
    id: "doc-2",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1",
    sourceType: "journey_completion",
    title: "Service Foundations journey checkpoint",
    summary: "Journey progress and module completion were converted into a coaching-ready documentation artifact for manager and executive review.",
    createdAt: "2026-04-20T08:10:00Z",
    authoredByRole: "system",
    evidencePoints: [
      "Journey progress: 71%",
      "Competency gap: Empathy language and call control consistency",
      "Assigned owner: Marcus Bell",
    ],
  },
  {
    id: "doc-3",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1",
    sourceType: "intervention_completion",
    title: "Workflow precision intervention evidence",
    summary: "Assigned actions, due dates, and learner acknowledgment were assembled into a manager-ready documentation record.",
    createdAt: "2026-04-20T09:40:00Z",
    authoredByRole: "system",
    evidencePoints: [
      "Intervention: Restore workflow precision and score reliability",
      "Due date: 2026-04-25",
      "Evidence includes QA review, behavior targets, and checklist assignment",
    ],
  },
  {
    id: "doc-4",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1",
    sourceType: "coaching_summary",
    title: "Quarterly review packet starter",
    summary: "The documentation hub assembled learning progress, intervention status, and coaching history into an executive-visible review starter.",
    createdAt: "2026-04-20T16:40:00Z",
    authoredByRole: "system",
    evidencePoints: [
      "Includes learning progress, QA movement, and manager follow-up evidence",
      "Supports quarterly and annual review preparation",
      "Aligned with CHCG Performance Leadership System",
    ],
    weeklyCoachingLogId: "weekly-log-1",
  },
  {
    id: "doc-5",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1b",
    sourceType: "coaching_summary",
    title: "Transfer coaching summary ready for review",
    summary: "The documentation lane now captures Avery's transfer-language follow-up and links directly to the structured weekly coaching log.",
    createdAt: "2026-04-20T17:00:00Z",
    authoredByRole: "system",
    evidencePoints: [
      "Focus area: escalation ownership and transfer explanations",
      "Linked transfer refresher remains visible to the coach",
      "Supports follow-up review without leaving Documentation mode",
    ],
    weeklyCoachingLogId: "weekly-log-2",
  },
  {
    id: "doc-6",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1b",
    sourceType: "intervention_completion",
    title: "Transfer workflow evidence packet",
    summary: "Avery's workflow evidence now combines the latest transfer assignment, coaching notes, and observed call-handling expectations in one record.",
    createdAt: isoDaysFromNow(-2),
    authoredByRole: "system",
    evidencePoints: [
      "Assigned refresher: Verification and Workflow Accuracy",
      "Expected transfer: clearer escalation explanation before handoff",
      "Coach-visible next check: confirm ownership language in the next session",
    ],
  },
  {
    id: "doc-7",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1c",
    sourceType: "coaching_summary",
    title: "Empathy follow-through packet prepared",
    summary: "Maya's follow-up now links the completed refresher, the latest weekly coaching log, and the expected next-step language for the next monitored interaction.",
    createdAt: "2026-04-20T18:25:00Z",
    authoredByRole: "system",
    evidencePoints: [
      "Completed refresher: Active listening in high-friction interactions",
      "Expected behavior: connect reassurance language to a clear next action",
      "Visible to coach and documentation reviewers in the same lane",
    ],
    weeklyCoachingLogId: "weekly-log-3",
  },
];

const reviewLogs: ReviewLog[] = [
  {
    id: "review-1",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1",
    authorUserId: "u-mgr-1",
    authorRole: "manager",
    reviewType: "one_on_one",
    title: "Weekly coaching one-on-one",
    notes: "Reviewed verification phrasing, reassurance language, and closing structure against recent QA findings. Agreed on two repeatable behavior changes for the next monitored interactions.",
    createdAt: "2026-04-20T13:15:00Z",
    nextStep: "Validate phrasing improvement in the next five monitored interactions and record one example in the documentation hub.",
    weeklyCoachingLogId: "weekly-log-1",
    attachments: [],
    attachedResources: [],
  },
  {
    id: "review-2",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1",
    authorUserId: "u-exec-1",
    authorRole: "executive",
    reviewType: "quarterly_check_in",
    title: "Quarterly readiness checkpoint",
    notes: "Connected intervention volume to readiness movement and confirmed that coaching consistency remains the primary leverage point for the quarter.",
    createdAt: "2026-04-20T15:00:00Z",
    nextStep: "Review readiness movement after the next intervention cycle closes and confirm whether manager cadence is sustaining improvement.",
    attachments: [],
    attachedResources: [],
  },
  {
    id: "review-3",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1",
    authorUserId: "u-admin-1",
    authorRole: "client_admin",
    reviewType: "annual_review",
    title: "Annual enablement record draft",
    notes: "Compiled the learner's evidence history, coaching logs, and improvement actions into a governance-ready annual review draft aligned with CHCG methodology.",
    createdAt: "2026-04-20T17:10:00Z",
    nextStep: "Finalize annual review after the next quarterly checkpoint is completed.",
    attachments: [],
    attachedResources: [],
  },
];

const weeklyCoachingLogs: WeeklyCoachingLog[] = [
  {
    id: "weekly-log-1",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1",
    coachUserId: "u-mgr-1",
    coachRole: "manager",
    coachName: "Marcus Bell",
    coachEmail: "marcus.bell@enterpriseworkspace.demo",
    employeeName: "Nina Patel",
    employeeEmail: "nina.patel@enterpriseworkspace.demo",
    supervisorUserId: "u-mgr-1",
    supervisorName: "Marcus Bell",
    supervisorEmail: "marcus.bell@enterpriseworkspace.demo",
    managerOfSupervisorEmail: "alicia.warren@enterpriseworkspace.demo",
    sessionDate: dateOnlyDaysFromNow(-9),
    attendance: "Present and on time; adherence stabilized after the previous scheduling correction.",
    followUpFromPrevious: "Nina met the prior SMART goal by using verification language on four of the last five monitored interactions, but summary transitions still slowed call closure in one call.",
    coachingComments: "Reviewed verification phrasing, reassurance language, and closing structure against recent QA findings. The agreed action is to use one concise summary statement before confirming next steps.",
    smartGoalCommitment: "By 2026-04-27, Nina will use the approved concise summary statement on 90% of monitored calls and reduce closing-script variance to fewer than one miss across five scored interactions. Follow-up date: 2026-04-27.",
    additionalSupport: "Manager will provide two annotated call examples and complete one live side-by-side review before the next coaching touchpoint.",
    agentTakeaways: "I need to keep the closing summary short and consistent so I can confirm next steps without sounding rushed.",
    createdAt: isoDaysFromNow(-9),
    updatedAt: "2026-04-20T14:30:00.000Z",
    linkedReviewLogId: "review-1",
    visibility: "public",
    attachments: [],
  },
  {
    id: "weekly-log-2",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1b",
    coachUserId: "u-coach-1",
    coachRole: "coach",
    coachName: "Renee Lawson",
    coachEmail: "renee.lawson@enterpriseworkspace.demo",
    employeeName: "Avery Chen",
    employeeEmail: "avery.chen@enterpriseworkspace.demo",
    supervisorUserId: "u-mgr-1",
    supervisorName: "Marcus Bell",
    supervisorEmail: "marcus.bell@enterpriseworkspace.demo",
    managerOfSupervisorEmail: "alicia.warren@enterpriseworkspace.demo",
    sessionDate: dateOnlyDaysFromNow(-3),
    attendance: "Present and engaged; Avery brought the most recent transfer examples and reviewed the exact escalation path used on two calls.",
    followUpFromPrevious: "Avery improved documentation accuracy, but still rushes through why a transfer is needed when the conversation becomes complex.",
    coachingComments: "Reviewed one escalation example, captured the transfer language used, and agreed that the coach will reinforce a cleaner ownership statement before each warm handoff.",
    smartGoalCommitment: "By 2026-04-28, Avery will explain the transfer reason and next owner on every monitored escalation call and document the handoff reason in the same workflow note.",
    additionalSupport: "Coach will provide one annotated transfer example and keep the targeted workflow refresher visible in the transfer lane until the next follow-up.",
    agentTakeaways: "I need to explain the handoff clearly before I move the customer so the transfer feels intentional instead of abrupt.",
    createdAt: isoDaysFromNow(-3),
    updatedAt: "2026-04-21T15:10:00.000Z",
    visibility: "public",
    attachments: [],
  },
  {
    id: "weekly-log-3",
    tenantId: "atlas-operations",
    subjectUserId: "u-learn-1c",
    coachUserId: "u-coach-1",
    coachRole: "coach",
    coachName: "Renee Lawson",
    coachEmail: "renee.lawson@enterpriseworkspace.demo",
    employeeName: "Maya Johnson",
    employeeEmail: "maya.johnson@enterpriseworkspace.demo",
    supervisorUserId: "u-mgr-1",
    supervisorName: "Marcus Bell",
    supervisorEmail: "marcus.bell@enterpriseworkspace.demo",
    managerOfSupervisorEmail: "alicia.warren@enterpriseworkspace.demo",
    sessionDate: dateOnlyDaysFromNow(-10),
    attendance: "Present, on time, and prepared with two callback examples from the prior week for live review.",
    followUpFromPrevious: "Maya met the prior commitment to slow down and acknowledge concern before offering reassurance, but she still needs a firmer final next-step statement before closing the call.",
    coachingComments: "Renee reviewed Maya's two callback examples, modeled a tighter ownership statement, and coached her to move from empathy into a direct explanation of what will happen next, who owns the follow-up, and when the member should expect the next update.",
    smartGoalCommitment: "By 2026-04-28, Maya will deliver the approved owner-and-next-step close on every monitored callback, document that close in the workflow note, and review five scored interactions with Renee on 2026-04-29.",
    additionalSupport: "Renee will send Maya one annotated callback transcript, complete one side-by-side monitor before the next session, and keep the callback close script pinned in the coach workflow for reinforcement.",
    agentTakeaways: "I need to keep the empathy opening, then land the close with a clear owner, next step, and timing so the member knows exactly what happens after the call.",
    createdAt: isoDaysFromNow(-10),
    updatedAt: "2026-04-21T16:00:00.000Z",
    visibility: "public",
    attachments: [],
  },
];

const tenantCustomRoles: TenantCustomRole[] = [
  {
    id: "custom-role-1",
    tenantId: "atlas-operations",
    name: "Quality Assurance Analyst",
    description: "Tenant-defined role for analysts who review scored interactions and coordinate workflow reliability follow-up before coaching actions are assigned.",
    inheritsFrom: "manager",
    createdAt: "2026-04-18T13:00:00.000Z",
  },
];

const accessGrants: DemoAccessGrant[] = [

  { openId: "atlas-exec", tenantId: "atlas-operations", role: "executive", name: "Enterprise Executive" },
  { openId: "atlas-manager", tenantId: "atlas-operations", role: "manager", name: "Enterprise Manager" },
  { openId: "atlas-coach", tenantId: "atlas-operations", role: "coach", name: "Enterprise Coach Supervisor" },
  { openId: "atlas-learner", tenantId: "atlas-operations", role: "learner", name: "Enterprise Learner" },
  { openId: "atlas-admin", tenantId: "atlas-operations", role: "client_admin", name: "Enterprise Client Admin" },
  { openId: "platform-admin", tenantId: "atlas-operations", role: "platform_admin", name: "Platform Admin" },
];

const tenantTrainingEntitlements = new Map<string, TenantTrainingEntitlement>([
  [
    "atlas-operations",
    {
      licensedJourneyIds: [
        "journey-service-foundations",
        "journey-workflow-precision",
        "journey-coach-practice-atlas",
        "journey-data-led-leadership",
      ],
      licensedAssetIds: [
        "library-service-foundations-core",
        "library-qa-essentials",
        "library-workflow-field-kit",
        "library-data-led-leadership",
        "library-performance-governance",
        "library-engagement-recognition",
        "library-atlas-launch-readiness",
      ],
    },
  ],
  [
    "lighthouse-finance",
    {
      licensedJourneyIds: [
        "journey-service-foundations-lf",
        "journey-coach-practice-lf",
        "journey-performance-leadership-lf",
        "journey-data-led-leadership-lf",
      ],
      licensedAssetIds: [
        "library-service-foundations-core",
        "library-qa-essentials",
        "library-performance-governance",
        "library-lighthouse-compliance-brief",
      ],
    },
  ],
  [
    "horizon-commerce",
    {
      licensedJourneyIds: [
        "journey-service-foundations-hc",
        "journey-coach-practice-hc",
        "journey-engagement-systems-hc",
        "journey-exec-culture-hc",
      ],
      licensedAssetIds: [
        "library-service-foundations-core",
        "library-workflow-field-kit",
        "library-engagement-recognition",
      ],
    },
  ],
]);

const brandingOverrides = new Map<string, Partial<TenantBranding>>();

// ── ContentStore seam (AUTHOR2 / Wave 1) ────────────────────────────────────
// Generalizes `brandingOverrides` (a single per-tenant Partial) to keyed
// collections of identified items. A canonical "core" base layer is computed
// from shared content; on top of it sit two override layers that can patch,
// hide, or add items without mutating the base:
//   • core layer   — authored by platform_admin, applies to every tenant
//   • tenant layer — authored by client_admin, applies to that tenant only
// resolveForTenant() is the single read path; putCoreContent / putTenantContent
// are the writes. Conflict rule: tenant override wins over core.
//
// PERSISTENCE TODO: `coreContentOverrides` and `tenantContentOverrides` are the
// entire durable surface. They reset on server restart today. To make edits
// durable, back them with two tenant-scoped Drizzle tables keyed identically —
// content_core_override(type, collection_key, payload) and
// content_tenant_override(tenant_id, type, collection_key, payload) — and swap
// the Map reads/writes below for table reads/writes. No caller changes needed.
// AUTHOR3 (Wave 1.5): the three runtime-generated checkpoints join the
// hand-authored apply checkpoint ("quizQuestions"). Each is a per-module
// collection keyed by moduleId; an override layer edits/replaces its questions.
// AUTHOR3 added the three generated checkpoints; LIBRARY2 adds the library as a
// single global collection ("libraryAsset", keyed by the constant below).
export type ContentCollectionType = "quizQuestions" | "briefCheckpoint" | "practiceCheckpoint" | "finalQuiz" | "libraryAsset";

export type ContentItem = { id: string };

export type ContentOverrideSet<T extends ContentItem> = {
  /** Field-level edits applied to a base/core item by id. */
  patches: Record<string, Partial<T>>;
  /** Base/core item ids tombstoned for this layer. */
  hidden: string[];
  /** Items that exist only in this layer. */
  added: T[];
  /** Collection-level overrides (e.g. a quiz's passingScore). Opaque to the store. */
  meta: Record<string, unknown>;
};

export type ContentOverrideOp<T extends ContentItem> =
  | { kind: "patch"; id: string; patch: Partial<T> }
  | { kind: "add"; item: T }
  | { kind: "hide"; id: string }
  | { kind: "unhide"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "meta"; meta: Record<string, unknown> };

function emptyOverrideSet<T extends ContentItem>(): ContentOverrideSet<T> {
  return { patches: {}, hidden: [], added: [], meta: {} };
}

function contentStoreKey(type: ContentCollectionType, collectionKey: string) {
  return `${type}::${collectionKey}`;
}

const coreContentOverrides = new Map<string, ContentOverrideSet<ContentItem>>();
const tenantContentOverrides = new Map<string, Map<string, ContentOverrideSet<ContentItem>>>();

function applyOverrideSet<T extends ContentItem>(base: T[], set: ContentOverrideSet<T>): T[] {
  const hidden = new Set(set.hidden);
  const resolved = base
    .filter((item) => !hidden.has(item.id))
    .map((item) => (set.patches[item.id] ? { ...item, ...set.patches[item.id] } : item));
  const present = new Set(resolved.map((item) => item.id));
  for (const item of set.added) {
    if (!present.has(item.id)) {
      resolved.push(item);
    }
  }
  return resolved;
}

function mutateOverrideSet<T extends ContentItem>(set: ContentOverrideSet<T>, op: ContentOverrideOp<T>) {
  switch (op.kind) {
    case "patch": {
      set.patches[op.id] = { ...set.patches[op.id], ...op.patch };
      // If the target is a layer-added item, patch it in place too.
      const added = set.added.find((item) => item.id === op.id);
      if (added) {
        Object.assign(added, op.patch);
      }
      break;
    }
    case "add":
      if (!set.added.some((item) => item.id === op.item.id)) {
        set.added.push(op.item);
      }
      break;
    case "hide":
      if (!set.hidden.includes(op.id)) {
        set.hidden.push(op.id);
      }
      break;
    case "unhide":
      set.hidden = set.hidden.filter((id) => id !== op.id);
      break;
    case "remove":
      set.added = set.added.filter((item) => item.id !== op.id);
      delete set.patches[op.id];
      break;
    case "meta":
      set.meta = { ...set.meta, ...op.meta };
      break;
  }
}

/** THE READ PATH. Apply the core layer to `base`, then the tenant layer (tenant wins). */
export function resolveForTenant<T extends ContentItem>(
  type: ContentCollectionType,
  tenantId: string | null,
  collectionKey: string,
  base: T[],
): { items: T[]; meta: Record<string, unknown> } {
  const key = contentStoreKey(type, collectionKey);
  const coreSet = coreContentOverrides.get(key) as ContentOverrideSet<T> | undefined;
  let items = coreSet ? applyOverrideSet(base, coreSet) : base.slice();
  let meta = coreSet ? { ...coreSet.meta } : {};
  if (tenantId) {
    const tenantSet = tenantContentOverrides.get(tenantId)?.get(key) as ContentOverrideSet<T> | undefined;
    if (tenantSet) {
      items = applyOverrideSet(items, tenantSet);
      meta = { ...meta, ...tenantSet.meta };
    }
  }
  return { items, meta };
}

/** WRITE — core layer (platform_admin). Affects every tenant that hasn't overridden the item. */
export function putCoreContent<T extends ContentItem>(
  type: ContentCollectionType,
  collectionKey: string,
  op: ContentOverrideOp<T>,
) {
  const key = contentStoreKey(type, collectionKey);
  const set = (coreContentOverrides.get(key) as ContentOverrideSet<T> | undefined) ?? emptyOverrideSet<T>();
  mutateOverrideSet(set, op);
  coreContentOverrides.set(key, set as ContentOverrideSet<ContentItem>);
}

/** WRITE — tenant layer (client_admin). Scoped to one tenant; never mutates core. */
export function putTenantContent<T extends ContentItem>(
  tenantId: string,
  type: ContentCollectionType,
  collectionKey: string,
  op: ContentOverrideOp<T>,
) {
  const key = contentStoreKey(type, collectionKey);
  const byKey = tenantContentOverrides.get(tenantId) ?? new Map<string, ContentOverrideSet<ContentItem>>();
  const set = (byKey.get(key) as ContentOverrideSet<T> | undefined) ?? emptyOverrideSet<T>();
  mutateOverrideSet(set, op);
  byKey.set(key, set as ContentOverrideSet<ContentItem>);
  tenantContentOverrides.set(tenantId, byKey);
}

// ── Quiz-question content layer (Wave 1) ────────────────────────────────────
// The canonical apply-checkpoint questions for a module are deterministic per
// moduleId (seed literals or module-only generation), so the base is computed
// from the shared content the same way the player computes it.
function findModuleContext(moduleId: string): { module: LearningModule; journeyTitle: string; competencyGap: string } | null {
  for (const journey of journeys) {
    const module = journey.modules.find((entry) => entry.id === moduleId);
    if (module) {
      return { module, journeyTitle: journey.title, competencyGap: journey.competencyGap };
    }
  }
  return null;
}

// The four checkpoints an author can target, mapped to their ContentStore type
// and the presentation field that supplies the generated baseline questions.
export type CheckpointKey = "application" | "brief" | "practice" | "final";

const CHECKPOINT_TO_TYPE: Record<CheckpointKey, ContentCollectionType> = {
  application: "quizQuestions",
  brief: "briefCheckpoint",
  practice: "practiceCheckpoint",
  final: "finalQuiz",
};

const CHECKPOINT_ORDER: CheckpointKey[] = ["application", "brief", "practice", "final"];

// The generated activity (questions + passing config) for one checkpoint. This is
// the canonical baseline the override layers edit or replace. Deterministic per
// moduleId, so it matches what the player computes from the shared content.
function getCheckpointActivity(moduleId: string, checkpoint: CheckpointKey) {
  const context = findModuleContext(moduleId);
  if (!context) {
    return null;
  }
  const presentation = getTrainingPresentation(context.module, context.journeyTitle, context.competencyGap);
  switch (checkpoint) {
    case "application":
      return presentation.applicationActivity;
    case "brief":
      return presentation.briefCheckpoint;
    case "practice":
      return presentation.practiceCheckpoint;
    case "final":
      return presentation.finalQuiz;
  }
}

export type ResolvedCheckpoint = {
  checkpoint: CheckpointKey;
  questions: TrainingApplicationQuestion[];
  passingScore?: number;
  passingPercent?: number;
};

export type ResolvedModuleQuiz = {
  moduleId: string;
  moduleTitle: string;
  journeyTitle: string;
  checkpoints: ResolvedCheckpoint[];
};

// Resolve one checkpoint through the seam: apply the override layers over the
// generated baseline. When no override exists, the items fall through unchanged
// (still generated + deterministically shuffled). Passing config defaults to the
// generated activity's, with collection-level meta overrides winning.
function resolveCheckpoint(moduleId: string, checkpoint: CheckpointKey, tenantId: string | null): ResolvedCheckpoint | null {
  const activity = getCheckpointActivity(moduleId, checkpoint);
  if (!activity) {
    return null;
  }
  const { items, meta } = resolveForTenant<TrainingApplicationQuestion>(CHECKPOINT_TO_TYPE[checkpoint], tenantId, moduleId, activity.questions);
  return {
    checkpoint,
    questions: items,
    passingScore: typeof meta.passingScore === "number" ? meta.passingScore : activity.passingScore,
    passingPercent: typeof meta.passingPercent === "number" ? meta.passingPercent : activity.passingPercent,
  };
}

function resolveModuleQuiz(moduleId: string, tenantId: string | null): ResolvedModuleQuiz | null {
  const context = findModuleContext(moduleId);
  if (!context) {
    return null;
  }
  return {
    moduleId,
    moduleTitle: context.module.title,
    journeyTitle: context.journeyTitle,
    checkpoints: CHECKPOINT_ORDER
      .map((checkpoint) => resolveCheckpoint(moduleId, checkpoint, tenantId))
      .filter((entry): entry is ResolvedCheckpoint => entry !== null),
  };
}

/** Authoring read: resolved checkpoints per module for the scope. `core` → base+core; tenant → base+core+tenant. */
export function getAuthoringQuizContent(input: { scope: "core" | "tenant"; tenantId?: string; moduleId?: string }): { modules: ResolvedModuleQuiz[] } {
  const tenantId = input.scope === "tenant" ? input.tenantId ?? null : null;
  const moduleIds = input.moduleId
    ? [input.moduleId]
    : Array.from(new Set(journeys.flatMap((journey) => journey.modules.map((module) => module.id))));
  const modules = moduleIds
    .map((moduleId) => resolveModuleQuiz(moduleId, tenantId))
    .filter((entry): entry is ResolvedModuleQuiz => entry !== null);
  return { modules };
}

/** Authoring write: route a checkpoint override op to the core or tenant layer by scope. */
export function authorQuizContent(input: {
  scope: "core" | "tenant";
  tenantId?: string;
  moduleId: string;
  checkpoint: CheckpointKey;
  op: ContentOverrideOp<TrainingApplicationQuestion>;
}): { modules: ResolvedModuleQuiz[] } {
  const type = CHECKPOINT_TO_TYPE[input.checkpoint];
  if (input.scope === "core") {
    putCoreContent<TrainingApplicationQuestion>(type, input.moduleId, input.op);
    return getAuthoringQuizContent({ scope: "core", moduleId: input.moduleId });
  }
  if (!input.tenantId) {
    throw new Error("authorQuizContent: tenant scope requires a tenantId");
  }
  putTenantContent<TrainingApplicationQuestion>(input.tenantId, type, input.moduleId, input.op);
  return getAuthoringQuizContent({ scope: "tenant", tenantId: input.tenantId, moduleId: input.moduleId });
}

// ── Library-asset content layer (LIBRARY2 / Wave 2) ─────────────────────────
// The library is one global collection (not per-module), so it uses a single
// constant collection key. The two-tier model already lives in the asset data
// (tenantId "all" = CHCG core; tenantId <id> = client); the ContentStore adds
// the edit/hide/add override layers on top, with the same core-vs-tenant routing
// and tenant-wins rule. Resolution is identity when no override exists, so every
// existing consumer stays byte-identical until an edit is authored.
const LIBRARY_COLLECTION_KEY = "library";
let libraryUploadSequence = 0;

function getCoreLibrarySeed(): ContentLibraryAsset[] {
  return contentLibraryAssets.filter((asset) => asset.tenantId === "all");
}

// Core seed + this tenant's seed uploads, in original array order (so the
// identity case matches the legacy filter byte-for-byte).
function getTenantLibraryBase(tenantId: string): ContentLibraryAsset[] {
  return contentLibraryAssets.filter((asset) => asset.tenantId === "all" || asset.tenantId === tenantId);
}

// THE READ PATH. core scope (tenantId null) → core seed + core layer; tenant
// scope → core seed + tenant uploads, with core then tenant layers applied.
function resolveLibraryAssets(tenantId: string | null): ContentLibraryAsset[] {
  if (tenantId === null) {
    return resolveForTenant<ContentLibraryAsset>("libraryAsset", null, LIBRARY_COLLECTION_KEY, getCoreLibrarySeed()).items;
  }
  return resolveForTenant<ContentLibraryAsset>("libraryAsset", tenantId, LIBRARY_COLLECTION_KEY, getTenantLibraryBase(tenantId)).items;
}

export type ResolvedLibraryContent = { assets: ContentLibraryAsset[] };

/** Authoring read: resolved library assets for the scope. `core` → core+core layer; tenant → core+tenant. */
export function getAuthoringLibraryContent(input: { scope: "core" | "tenant"; tenantId?: string }): ResolvedLibraryContent {
  const tenantId = input.scope === "tenant" ? input.tenantId ?? null : null;
  return { assets: resolveLibraryAssets(tenantId) };
}

// sourceKind + tenantId are scope-derived, never author-set: forced on add and
// stripped from patches so an edit can't move an asset between layers.
function normalizeLibraryOp(scope: "core" | "tenant", tenantId: string | undefined, op: ContentOverrideOp<ContentLibraryAsset>): ContentOverrideOp<ContentLibraryAsset> {
  if (op.kind === "add") {
    return {
      kind: "add",
      item: {
        ...op.item,
        tenantId: scope === "core" ? "all" : tenantId ?? op.item.tenantId,
        sourceKind: scope === "core" ? "chcg" : "client_upload",
        createdAt: op.item.createdAt || new Date().toISOString(),
      },
    };
  }
  if (op.kind === "patch") {
    const { tenantId: _tenantId, sourceKind: _sourceKind, id: _id, ...safe } = op.patch as Partial<ContentLibraryAsset>;
    return { kind: "patch", id: op.id, patch: safe };
  }
  return op;
}

/** Authoring write: route a library override op to the core or tenant layer by scope. */
export function authorLibraryContent(input: {
  scope: "core" | "tenant";
  tenantId?: string;
  op: ContentOverrideOp<ContentLibraryAsset>;
}): ResolvedLibraryContent {
  const op = normalizeLibraryOp(input.scope, input.tenantId, input.op);
  if (input.scope === "core") {
    putCoreContent<ContentLibraryAsset>("libraryAsset", LIBRARY_COLLECTION_KEY, op);
    return getAuthoringLibraryContent({ scope: "core" });
  }
  if (!input.tenantId) {
    throw new Error("authorLibraryContent: tenant scope requires a tenantId");
  }
  putTenantContent<ContentLibraryAsset>(input.tenantId, "libraryAsset", LIBRARY_COLLECTION_KEY, op);
  return getAuthoringLibraryContent({ scope: "tenant", tenantId: input.tenantId });
}

const chcgPlatformSettings: ChcgPlatformSettings = {
  provisioningMode: "Guided",
  defaultLibraryPolicy: "CHCG core plus licensed tenant uploads",
  trainingUnlockPolicy: "Manual CHCG approval",
  governanceNote: "CHCG governs tenant activation, training availability, and white-label standards from one organization-level control plane.",
};

function getTenant(tenantId?: string) {
  return tenants.find((tenant) => tenant.id === tenantId) ?? tenants[0]!;
}

function getUser(role: DemoRole, tenantId?: string) {
  const tenant = getTenant(tenantId);
  return users.find((user) => user.tenantId === tenant.id && user.role === role) ?? users[0]!;
}

function getUserById(userId: string, tenantId?: string) {
  const tenant = getTenant(tenantId);
  return users.find((user) => user.tenantId === tenant.id && user.id === userId) ?? null;
}

function getTenantSignals(tenantId: string) {
  return signals.filter((signal) => signal.tenantId === tenantId);
}

function getTenantInterventions(tenantId: string) {
  return interventions.filter((item) => item.tenantId === tenantId);
}

function getTenantCoachingSessions(tenantId: string) {
  return coachingSessions.filter((session) => session.tenantId === tenantId);
}

function getTenantTrainingEntitlement(tenantId: string): TenantTrainingEntitlement {
  const seeded = tenantTrainingEntitlements.get(tenantId);
  if (seeded) {
    return seeded;
  }

  return {
    licensedJourneyIds: journeys.filter((journey) => journey.tenantId === tenantId).map((journey) => journey.id),
    licensedAssetIds: contentLibraryAssets
      .filter((asset) => asset.tenantId === "all" || asset.tenantId === tenantId)
      .map((asset) => asset.id),
  };
}

function grantTenantTrainingEntitlement(tenantId: string, assetId: string) {
  const existing = getTenantTrainingEntitlement(tenantId);
  tenantTrainingEntitlements.set(tenantId, {
    licensedJourneyIds: existing.licensedJourneyIds,
    licensedAssetIds: Array.from(new Set([...existing.licensedAssetIds, assetId])),
  });
}

function isAssetLicensedForTenant(asset: ContentLibraryAsset, tenantId: string) {
  // A tenant always sees its own assets (seed uploads or store-added), so
  // tenant-layer adds aren't filtered out without a separate entitlement grant.
  if (asset.tenantId === tenantId) {
    return true;
  }
  const entitlement = getTenantTrainingEntitlement(tenantId);
  return entitlement.licensedAssetIds.includes(asset.id)
    || asset.linkedJourneyIds.some((journeyId) => entitlement.licensedJourneyIds.includes(journeyId));
}

function getTenantJourneys(tenantId: string, role: Extract<DemoRole, "manager" | "coach" | "learner" | "executive">) {
  const entitlement = getTenantTrainingEntitlement(tenantId);
  return (
    journeys.find(
      (journey) => journey.tenantId === tenantId && journey.role === role && entitlement.licensedJourneyIds.includes(journey.id),
    )
    ?? journeys.find((journey) => journey.tenantId === tenantId && journey.role === role)
    ?? journeys.find((journey) => journey.role === role)
    ?? journeys[0]!
  );
}

function getJourneyById(journeyId: string, tenantId?: string) {
  const tenant = getTenant(tenantId);
  return journeys.find((journey) => journey.id === journeyId && journey.tenantId === tenant.id) ?? null;
}

function getJourneyModule(tenantId: string, journeyId: string, moduleId: string) {
  const journey = getJourneyById(journeyId, tenantId);
  const module = journey?.modules.find((entry) => entry.id === moduleId) ?? null;
  return journey && module ? { journey, module } : null;
}

function getRetrainingAssignmentsForLearner(tenantId: string, learnerUserId: string) {
  const statusRank: Record<RetrainingAssignment["status"], number> = {
    in_progress: 0,
    assigned: 1,
    completed: 2,
  };

  return retrainingAssignments
    .filter((assignment) => assignment.tenantId === tenantId && assignment.learnerUserId === learnerUserId)
    .sort((left, right) => {
      const rankDelta = statusRank[left.status] - statusRank[right.status];
      if (rankDelta !== 0) {
        return rankDelta;
      }

      const completedAtDelta = (right.completedAt ?? "").localeCompare(left.completedAt ?? "");
      if (completedAtDelta !== 0) {
        return completedAtDelta;
      }

      return right.createdAt.localeCompare(left.createdAt);
    });
}

function getCurrentRetrainingAssignment(assignments: RetrainingAssignment[]) {
  return assignments.find((assignment) => assignment.status !== "completed") ?? assignments[0] ?? null;
}

function getHistoricalRetrainingAssignments(assignments: RetrainingAssignment[], currentAssignmentId?: string | null) {
  return assignments.filter((assignment) => assignment.id !== currentAssignmentId);
}

function getSuggestedRetrainingTarget(suggestion: AiSuggestion) {
  if (suggestion.id === "ai-1") {
    return getJourneyModule(suggestion.tenantId, "journey-workflow-precision", "mod-wp-1");
  }

  const fallbackJourney = getTenantJourneys(suggestion.tenantId, "learner");
  const fallbackModule = fallbackJourney.modules[0] ?? null;
  return fallbackJourney && fallbackModule ? { journey: fallbackJourney, module: fallbackModule } : null;
}

function isLearnerTrainingAsset(asset: ContentLibraryAsset) {
  return asset.category === "Agent enablement"
    || asset.linkedJourneyIds.includes("journey-service-foundations")
    || asset.linkedJourneyIds.includes("journey-workflow-precision")
    || asset.title === "Workforce & Key Performance Indicators";
}

function getTenantLibraryAssets(tenantId: string, role?: DemoRole | "all") {
  // Source from the resolved override layers (identity when no edits exist), then
  // apply the existing role / entitlement / learner filters unchanged.
  return resolveLibraryAssets(tenantId).filter((asset) => {
    const tenantScoped = asset.tenantId === "all" || asset.tenantId === tenantId;
    const roleScoped = !role
      || role === "all"
      || asset.linkedRoles.includes("all")
      || asset.linkedRoles.includes(role)
      || (role === "coach" && asset.linkedRoles.includes("manager"));
    const entitled = isAssetLicensedForTenant(asset, tenantId);
    const learnerScoped = role !== "learner" || isLearnerTrainingAsset(asset);
    return tenantScoped && roleScoped && entitled && learnerScoped;
  });
}

function blendAssets(clientAssets: ContentLibraryAsset[], chcgAssets: ContentLibraryAsset[], maxItems = 4) {
  const blended: ContentLibraryAsset[] = [];
  const queues = [clientAssets, chcgAssets].map((items) => [...items]);

  while (blended.length < maxItems && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && !blended.some((asset) => asset.id === next.id)) {
        blended.push(next);
      }
      if (blended.length >= maxItems) {
        break;
      }
    }
  }

  return blended;
}

function getWorkflowLibraryMix(tenantId: string, role: DemoRole) {
  const roleAssets = getTenantLibraryAssets(tenantId, role);
  const clientAssets = roleAssets.filter((asset) => asset.sourceKind === "client_upload");
  const chcgAssets = roleAssets.filter((asset) => asset.sourceKind === "chcg");
  const learnerJourney = getTenantJourneys(tenantId, "learner");
  const interventionRuleIds = getTenantInterventions(tenantId).map((intervention) => intervention.ruleId);

  const journeyResources = blendAssets(
    clientAssets.filter((asset) => asset.linkedJourneyIds.includes(learnerJourney.id)),
    chcgAssets.filter((asset) => asset.linkedJourneyIds.includes(learnerJourney.id)),
  );

  const interventionResources = blendAssets(
    clientAssets.filter((asset) => asset.linkedInterventionRuleIds.some((ruleId) => interventionRuleIds.includes(ruleId))),
    chcgAssets.filter((asset) => asset.linkedInterventionRuleIds.some((ruleId) => interventionRuleIds.includes(ruleId))),
  );

  const documentationResources = blendAssets(
    clientAssets.filter((asset) => asset.tags.some((tag) => ["documentation", "reviews", "review", "qa", "coaching"].includes(tag))),
    chcgAssets.filter((asset) => asset.tags.some((tag) => ["documentation", "qa", "coaching", "quarterly reviews", "annual reviews"].includes(tag))),
  );

  return {
    journeyResources,
    interventionResources,
    documentationResources,
  };
}

// ── Catalog courses (deck-backed) ───────────────────────────────────────────
// A "course" is a slide-deck-backed journey. Covers/slide counts come from
// shared/slideManifest.ts; per-learner status is seeded here (realistic demo
// values) so the catalog — and CAT4's continue-learning / recommended rows —
// are alive without a live progress backend. See docs/library-catalog-gaps.md.
export type CatalogCourse = {
  id: string;
  title: string;
  description: string;
  track: string;
  deckId: string;
  coverImage: string;
  slideCount: number;
  durationMinutes: number;
  source: "chcg" | "client_upload";
  tags: string[];
  status: "not_started" | "in_progress" | "completed" | "recommended";
  percentComplete: number;
  lastSlideIndex?: number;
  recommended: boolean;
  launchPath: string;
};

const CATALOG_COURSE_SEED: Array<Omit<CatalogCourse, "description" | "coverImage" | "slideCount" | "durationMinutes" | "source" | "launchPath"> & { journeyId: string; moduleId: string }> = [
  { id: "course-softskills", title: "Soft Skills & Customer Service Foundations", track: "track-service-foundations", deckId: "softskills", journeyId: "journey-service-foundations", moduleId: "mod-sf-1", tags: ["communication", "empathy", "service recovery"], status: "completed", percentComplete: 100, recommended: false },
  { id: "course-qa", title: "Quality Assurance Essentials", track: "track-workflow-precision", deckId: "qa", journeyId: "journey-workflow-precision", moduleId: "mod-wp-1", tags: ["qa", "verification", "calibration"], status: "in_progress", percentComplete: 62, lastSlideIndex: 23, recommended: false },
  { id: "course-coaching", title: "Real-time Coaching", track: "track-real-time-coaching", deckId: "coaching", journeyId: "journey-coach-practice-atlas", moduleId: "mod-rtc-1", tags: ["coaching", "feedback", "accountability"], status: "in_progress", percentComplete: 34, lastSlideIndex: 10, recommended: false },
  { id: "course-wfm-kpi", title: "Workforce Management & KPIs", track: "track-workforce-management", deckId: "wfm-kpi", journeyId: "journey-wfm-kpi", moduleId: "mod-wfm-1", tags: ["wfm", "kpi", "adherence"], status: "recommended", percentComplete: 0, recommended: true },
  { id: "course-performance", title: "Utilizing Performance Management to Maximize Results", track: "track-performance-leadership", deckId: "performance-leadership", journeyId: "journey-performance-leadership-lf", moduleId: "mod-lfp-1", tags: ["calibration", "coaching", "performance"], status: "recommended", percentComplete: 0, recommended: true },
  { id: "course-leadership-data", title: "Unlocking the Power of Data", track: "track-data-leadership", deckId: "leadership-data", journeyId: "journey-data-led-leadership", moduleId: "mod-dl-1", tags: ["kpi", "trends", "root cause"], status: "not_started", percentComplete: 0, recommended: false },
  { id: "course-gamification", title: "Gamification for Remote Teams", track: "track-engagement-recognition", deckId: "gamification", journeyId: "journey-engagement-systems-hc", moduleId: "mod-hce-1", tags: ["recognition", "motivation", "remote"], status: "not_started", percentComplete: 0, recommended: false },
];

const CATALOG_COURSE_DESCRIPTIONS: Record<string, string> = {
  softskills: "Build the communication, empathy, and service-recovery habits that define every great patient and customer interaction.",
  qa: "Understand how quality is measured, what great looks like, and how to turn QA findings into stronger calls.",
  coaching: "The five coaching pillars, SMART goals, and accountability conversations that make real-time coaching stick.",
  "wfm-kpi": "How workforce management and the KPIs behind it shape adherence, occupancy, and your day-to-day performance.",
  "performance-leadership": "Segment performance fairly, calibrate without bias, and build improvement plans that move the middle.",
  "leadership-data": "Read KPIs with confidence, separate signal from noise, and turn data into clear, owned action.",
  gamification: "Design recognition, rewards, and pulse rhythms that keep distributed teams engaged and motivated.",
};

export function buildCatalogCourses(): CatalogCourse[] {
  return CATALOG_COURSE_SEED.map((seed) => {
    const deck = slideDecks.find((entry) => entry.id === seed.deckId);
    const slideCount = deck ? deck.slides.length : 0;
    const coverImage = deck ? `/slides/${deck.slides[0].file}` : "";
    const params = new URLSearchParams({ role: "learner", journeyId: seed.journeyId, moduleId: seed.moduleId });
    if (seed.lastSlideIndex !== undefined) params.set("slide", String(seed.lastSlideIndex));
    const { journeyId: _journeyId, moduleId: _moduleId, ...course } = seed;
    return {
      ...course,
      description: CATALOG_COURSE_DESCRIPTIONS[seed.deckId] ?? "",
      coverImage,
      slideCount,
      durationMinutes: Math.max(10, Math.round(slideCount * 0.8)),
      source: "chcg" as const,
      launchPath: `/training?${params.toString()}`,
    };
  });
}

export function listContentLibrary(tenantId?: string, role?: DemoRole | "all") {
  const tenant = getTenant(tenantId);
  const baseAssets = getTenantLibraryAssets(tenant.id, role);
  const assets = role === "learner"
    ? baseAssets.filter((asset) => isLearnerTrainingAsset(asset))
    : baseAssets;
  const chcgAssets = assets.filter((asset) => asset.sourceKind === "chcg");
  const importedAssets = assets.filter((asset) => asset.sourceKind === "client_upload");

  return {
    tenant,
    branding: getTenantBranding(tenant.id),
    stats: {
      totalAssets: assets.length,
      chcgAssets: chcgAssets.length,
      importedAssets: importedAssets.length,
      mappedJourneys: new Set(assets.flatMap((asset) => asset.linkedJourneyIds)).size,
    },
    tracks: [
      {
        id: "track-service-foundations",
        title: "Service Foundations",
        summary: "Frontline communication, empathy, confidence, and service-recovery behaviors.",
      },
      {
        id: "track-workflow-precision",
        title: "Workflow Precision",
        summary: "Verification discipline, QA reliability, documentation accuracy, and consistent execution.",
      },
      {
        id: "track-data-leadership",
        title: "Unlocking the Power of Data",
        summary: "KPI interpretation, trend analysis, root-cause thinking, and action ownership.",
      },
      {
        id: "track-performance-leadership",
        title: "Utilizing Performance Management to Maximize Results",
        summary: "Coaching cadence, calibration, review rhythms, and measurable improvement planning.",
      },
      {
        id: "track-engagement-recognition",
        title: "Gamification for Remote Teams",
        summary: "Recognition loops, gamified motivation, pulse checks, and distributed-team rhythm.",
      },
      {
        id: "track-real-time-coaching",
        title: "Real-time Coaching",
        summary: "Coaching pillars, SMART goals, accountability conversations, and follow-through.",
      },
      {
        id: "track-workforce-management",
        title: "Workforce Management & KPIs",
        summary: "Adherence, occupancy, scheduling, and the KPI scorecards that drive performance.",
      },
    ],
    courses: buildCatalogCourses(),
    featuredAssets: assets.slice(0, 6),
    chcgAssets,
    importedAssets,
  };
}

export function createClientContent(input: CreateClientContentInput) {
  const created: ContentLibraryAsset = {
    id: `library-upload-${++libraryUploadSequence}`,
    tenantId: input.tenantId,
    title: input.title,
    summary: input.summary,
    category: input.category,
    sourceKind: "client_upload",
    format: input.format,
    linkedRoles: input.linkedRoles,
    tags: input.tags,
    linkedJourneyIds: input.curriculumStatus === "mapped_ready" && input.maintenanceJourneyId ? [input.maintenanceJourneyId] : [],
    linkedInterventionRuleIds: [],
    sourceLabel: input.sourceLabel,
    sourceType: input.sourceType,
    curriculumStatus: input.curriculumStatus,
    maintenanceJourneyId: input.maintenanceJourneyId,
    maintenanceModuleId: input.maintenanceModuleId,
    launchReadinessNote: input.launchReadinessNote,
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    createdAt: new Date().toISOString(),
  };

  // Single source of truth for tenant adds: the asset lives in the ContentStore
  // tenant layer, not the raw seed array. (The S3 upload + fileUrl are handled by
  // the caller; this records the asset metadata.) The entitlement grant is kept
  // for any consumer that reads licensedAssetIds directly.
  authorLibraryContent({ scope: "tenant", tenantId: input.tenantId, op: { kind: "add", item: created } });
  grantTenantTrainingEntitlement(input.tenantId, created.id);
  notifications.unshift({
    id: `note-library-${notifications.length + 1}`,
    tenantId: input.tenantId,
    audience: "client_admin",
    title: "New client content added to the library",
    detail: `${input.title} is now available inside the tenant-scoped content library and can be referenced in journeys and coaching workflows.`,
    priority: "info",
    createdAt: created.createdAt,
  });

  return created;
}

export function listTenants() {
  return tenants;
}

export function listMethodologyMappings() {
  return methodologyMappings;
}

export function getPermittedRolesForGrant(role: DemoAccessGrant["role"]): DemoRole[] {
  switch (role) {
    case "platform_admin":
    case "client_admin":
      return ["executive", "manager", "coach", "learner", "client_admin"];
    case "manager":
      return ["manager", "coach", "learner", "client_admin"];
    case "coach":
      return ["coach", "learner"];
    case "executive":
      return ["executive"];
    case "learner":
    default:
      return ["learner"];
  }
}

export function canAccessWorkspace(grantRole: DemoAccessGrant["role"], requiredRole: DemoRole) {
  return getPermittedRolesForGrant(grantRole).includes(requiredRole);
}

function createFallbackGrant(openId?: string | null, appRole?: string | null): DemoAccessGrant | null {
  switch (appRole) {
    case "admin":
      return {
        openId: openId ?? "platform-admin",
        tenantId: tenants[0]!.id,
        role: "platform_admin",
        name: "Platform Admin",
      } satisfies DemoAccessGrant;
    case "manager":
      return {
        openId: openId ?? "platform-manager",
        tenantId: tenants[0]!.id,
        role: "manager",
        name: "Operations Manager",
      } satisfies DemoAccessGrant;
    case "coach":
      return {
        openId: openId ?? "platform-coach",
        tenantId: tenants[0]!.id,
        role: "coach",
        name: "Coaching Supervisor",
      } satisfies DemoAccessGrant;
    case "user":
      return {
        openId: openId ?? "platform-learner",
        tenantId: tenants[0]!.id,
        role: "learner",
        name: "Learner User",
      } satisfies DemoAccessGrant;
    default:
      return null;
  }
}

export function getAccessGrant(openId?: string | null, appRole?: string | null) {
  if (openId) {
    const explicitGrant = accessGrants.find((grant) => grant.openId === openId) ?? null;
    if (explicitGrant) {
      return explicitGrant;
    }
  }

  return createFallbackGrant(openId, appRole);
}

export function getViewerAccess(openId?: string | null, appRole?: string | null): DemoViewerAccess | null {
  const grant = getAccessGrant(openId, appRole);

  if (!grant) {
    return null;
  }

  const tenant = getTenant(grant.tenantId);

  return {
    grant,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      industry: tenant.industry,
    },
    permittedRoles: getPermittedRolesForGrant(grant.role),
    canSwitchTenant: grant.role === "platform_admin",
  };
}

export function getTenantBranding(tenantId?: string): TenantBranding {
  const tenant = getTenant(tenantId);
  const override = brandingOverrides.get(tenant.id) ?? {};

  return {
    accent: override.accent ?? tenant.accent,
    logoMark: override.logoMark ?? tenant.logoMark,
    preferredLabel: override.preferredLabel ?? `${tenant.name} EnableOS`,
    heroStatement: override.heroStatement ?? tenant.heroStatement,
    dataIsolation: "Strict tenant-scoped segmentation enabled",
  };
}

export function updateTenantBranding(input: BrandingUpdateInput) {
  const tenant = getTenant(input.tenantId);
  brandingOverrides.set(tenant.id, {
    accent: input.accent,
    logoMark: input.logoMark,
    preferredLabel: input.preferredLabel,
    heroStatement: input.heroStatement,
  });

  return getTenantBranding(tenant.id);
}

function toTenantId(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toLogoMark(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function getChcgAdminDashboard(requestedTenantId?: string) {
  const selectedTenant = getTenant(requestedTenantId);
  const selectedEntitlement = getTenantTrainingEntitlement(selectedTenant.id);
  const selectedJourneys = journeys.filter((journey) => journey.tenantId === selectedTenant.id);
  const selectedAssets = contentLibraryAssets.filter((asset) => asset.tenantId === "all" || asset.tenantId === selectedTenant.id);

  return {
    organization: {
      title: "CHCG Organization Control Plane",
      subtitle: "Manage tenant onboarding, training unlocks, and organization-wide governance from a single workspace.",
    },
    metrics: [
      { label: "Client workspaces", value: String(tenants.length), supporting: "Active tenant environments currently governed by CHCG." },
      { label: "Licensed journeys", value: String(tenants.reduce((sum, tenant) => sum + getTenantTrainingEntitlement(tenant.id).licensedJourneyIds.length, 0)), supporting: "Journey-level training unlocks currently granted across clients." },
      { label: "Licensed assets", value: String(tenants.reduce((sum, tenant) => sum + getTenantTrainingEntitlement(tenant.id).licensedAssetIds.length, 0)), supporting: "Library assets currently available under CHCG approval." },
      { label: "Platform policy", value: chcgPlatformSettings.trainingUnlockPolicy, supporting: "Current organization-level training approval model." },
    ],
    platformSettings: { ...chcgPlatformSettings },
    tenants: tenants.map((tenant) => {
      const entitlement = getTenantTrainingEntitlement(tenant.id);
      const tenantUsers = users.filter((user) => user.tenantId === tenant.id);
      return {
        ...tenant,
        branding: getTenantBranding(tenant.id),
        userCount: tenantUsers.length,
        licensedJourneyCount: entitlement.licensedJourneyIds.length,
        licensedAssetCount: entitlement.licensedAssetIds.length,
        workspaceStatus: tenantUsers.length > 0 ? "Active" : "Provisioning",
      };
    }),
    selectedTenant: {
      tenant: selectedTenant,
      branding: getTenantBranding(selectedTenant.id),
      users: users.filter((user) => user.tenantId === selectedTenant.id),
      entitlement: selectedEntitlement,
      availableJourneys: selectedJourneys.map((journey) => ({
        id: journey.id,
        title: journey.title,
        role: journey.role,
        licensed: selectedEntitlement.licensedJourneyIds.includes(journey.id),
      })),
      availableAssets: selectedAssets.map((asset) => ({
        id: asset.id,
        title: asset.title,
        category: asset.category,
        sourceKind: asset.sourceKind,
        linkedRoles: asset.linkedRoles,
        licensed: selectedEntitlement.licensedAssetIds.includes(asset.id),
      })),
    },
  };
}

export function createChcgTenant(input: CreateChcgTenantInput) {
  const tenantId = toTenantId(input.name);
  if (!tenantId || tenants.some((tenant) => tenant.id === tenantId)) {
    throw new Error("A client workspace with this name already exists. Choose a more specific client name.");
  }

  const logoMark = input.logoMark.trim().slice(0, 3).toUpperCase() || toLogoMark(input.name);
  const created: DemoTenant = {
    id: tenantId,
    name: input.name,
    industry: input.industry,
    accent: input.accent,
    logoMark,
    description: input.description,
    heroStatement: input.heroStatement,
  };

  tenants.push(created);
  brandingOverrides.set(created.id, {
    accent: input.accent,
    logoMark,
    preferredLabel: `${input.name} EnableOS`,
    heroStatement: input.heroStatement,
  });
  tenantTrainingEntitlements.set(created.id, {
    licensedJourneyIds: [],
    licensedAssetIds: [],
  });

  const emailDomain = `${tenantId}.demo`;
  const userSuffix = users.filter((user) => user.tenantId === created.id).length + 1;
  users.push(
    { id: `u-exec-${tenantId}-${userSuffix}`, tenantId: created.id, name: `${input.name} Executive Lead`, email: `executive@${emailDomain}`, title: "Executive Sponsor", role: "executive", team: "Enterprise Leadership", avatarFallback: "EL", readinessScore: 80 },
    { id: `u-mgr-${tenantId}-${userSuffix}`, tenantId: created.id, name: `${input.name} Enablement Manager`, email: `manager@${emailDomain}`, title: "Enablement Manager", role: "manager", team: "Operations", avatarFallback: "EM", readinessScore: 78 },
    { id: `u-coach-${tenantId}-${userSuffix}`, tenantId: created.id, name: `${input.name} Coaching Lead`, email: `coach@${emailDomain}`, title: "Coaching Lead", role: "coach", team: "Operations", avatarFallback: "CL", readinessScore: 79 },
    { id: `u-learn-${tenantId}-${userSuffix}`, tenantId: created.id, name: `${input.name} Frontline Learner`, email: `learner@${emailDomain}`, title: "Frontline Specialist", role: "learner", team: "Operations", avatarFallback: "FL", readinessScore: 74 },
    { id: `u-admin-${tenantId}-${userSuffix}`, tenantId: created.id, name: `${input.name} Client Admin`, email: `admin@${emailDomain}`, title: "Client Admin", role: "client_admin", team: "Governance", avatarFallback: "CA", readinessScore: 88 },
  );

  notifications.unshift({
    id: `note-platform-${notifications.length + 1}`,
    tenantId: created.id,
    audience: "client_admin",
    title: "Workspace created by CHCG",
    detail: `${created.name} was added to the CHCG control plane and is ready for branding and training-access configuration.`,
    priority: "info",
    createdAt: new Date().toISOString(),
  });

  return created;
}

export function updateTenantTrainingAccess(input: UpdateTenantTrainingAccessInput) {
  const tenant = getTenant(input.tenantId);
  const licensedJourneyIds = Array.from(new Set(input.licensedJourneyIds));
  const licensedAssetIds = Array.from(new Set(input.licensedAssetIds));

  tenantTrainingEntitlements.set(tenant.id, {
    licensedJourneyIds,
    licensedAssetIds,
  });

  return getTenantTrainingEntitlement(tenant.id);
}

export function updateChcgPlatformSettings(input: ChcgPlatformSettings) {
  chcgPlatformSettings.provisioningMode = input.provisioningMode;
  chcgPlatformSettings.defaultLibraryPolicy = input.defaultLibraryPolicy;
  chcgPlatformSettings.trainingUnlockPolicy = input.trainingUnlockPolicy;
  chcgPlatformSettings.governanceNote = input.governanceNote;

  return { ...chcgPlatformSettings };
}

function getDocumentationEntries(tenantId: string, subjectUserId?: string) {
  return documentationEntries.filter((entry) => entry.tenantId === tenantId && (!subjectUserId || entry.subjectUserId === subjectUserId));
}

function getReviewLogs(tenantId: string, subjectUserId?: string) {
  return reviewLogs.filter((entry) => entry.tenantId === tenantId && (!subjectUserId || entry.subjectUserId === subjectUserId));
}

function getWeeklyCoachingLogs(tenantId: string, subjectUserId?: string) {
  return weeklyCoachingLogs.filter((entry) => entry.tenantId === tenantId && (!subjectUserId || entry.subjectUserId === subjectUserId));
}

export function createReviewLog(input: CreateReviewLogInput) {
  const author = getUser(input.authorRole === "client_admin" ? "client_admin" : input.authorRole, input.tenantId);
  const created: ReviewLog = {
    id: `review-${reviewLogs.length + 1}`,
    tenantId: input.tenantId,
    subjectUserId: input.subjectUserId,
    authorUserId: author.id,
    authorRole: input.authorRole,
    reviewType: input.reviewType,
    title: input.title,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    nextStep: input.nextStep,
    weeklyCoachingLogId: input.weeklyCoachingLogId,
    attachments: input.attachments ?? [],
    attachedResources: input.attachedResources ?? [],
  };

  reviewLogs.unshift(created);
  documentationEntries.unshift({
    id: `doc-review-${documentationEntries.length + 1}`,
    tenantId: input.tenantId,
    subjectUserId: input.subjectUserId,
    sourceType: "coaching_summary",
    title: `${input.title} documentation summary`,
    summary: input.notes,
    createdAt: created.createdAt,
    authoredByRole: input.authorRole,
    evidencePoints: [
      `Review type: ${input.reviewType.replaceAll("_", " ")}`,
      `Next step: ${input.nextStep}`,
      `Authored by: ${input.authorRole.replaceAll("_", " ")}`,
      ...(created.attachedResources.length ? [`Resources attached: ${created.attachedResources.map((resource) => resource.title).join(", ")}`] : []),
      ...(created.attachments.length ? [`Files attached: ${created.attachments.map((attachment) => attachment.fileName).join(", ")}`] : []),
    ],
    weeklyCoachingLogId: input.weeklyCoachingLogId,
  });

  return created;
}

export function createWeeklyCoachingLog(input: CreateWeeklyCoachingLogInput) {
  const learner = getUserById(input.subjectUserId, input.tenantId) ?? getUser("learner", input.tenantId);
  const coach = getUser(input.coachRole === "client_admin" ? "client_admin" : input.coachRole, input.tenantId);
  const supervisor = getUser("manager", input.tenantId);
  const managerOfSupervisor = getUser("executive", input.tenantId);
  const weeklyCoachingLogId = `weekly-log-${weeklyCoachingLogs.length + 1}`;

  const review = createReviewLog({
    tenantId: input.tenantId,
    subjectUserId: learner.id,
    authorRole: input.coachRole,
    reviewType: "one_on_one",
    title: `Weekly coaching log - ${learner.name}`,
    notes: `${input.coachingComments}\n\nFollow-up from previous coaching: ${input.followUpFromPrevious}`,
    nextStep: input.smartGoalCommitment,
    weeklyCoachingLogId,
  });

  const createdAt = review.createdAt;
  const created: WeeklyCoachingLog = {
    id: weeklyCoachingLogId,
    tenantId: input.tenantId,
    subjectUserId: learner.id,
    coachUserId: coach.id,
    coachRole: input.coachRole,
    coachName: coach.name,
    coachEmail: coach.email,
    employeeName: learner.name,
    employeeEmail: learner.email,
    supervisorUserId: supervisor.id,
    supervisorName: supervisor.name,
    supervisorEmail: supervisor.email,
    managerOfSupervisorEmail: input.managerOfSupervisorEmail ?? managerOfSupervisor.email,
    sessionDate: input.sessionDate,
    attendance: input.attendance,
    followUpFromPrevious: input.followUpFromPrevious,
    coachingComments: input.coachingComments,
    smartGoalCommitment: input.smartGoalCommitment,
    additionalSupport: input.additionalSupport,
    agentTakeaways: input.agentTakeaways ?? "",
    createdAt,
    updatedAt: createdAt,
    linkedReviewLogId: review.id,
    visibility: input.visibility ?? "public",
    attachments: input.attachments ?? [],
  };

  weeklyCoachingLogs.unshift(created);

  if (created.visibility === "public") {
    notifications.unshift({
      id: `note-weekly-coaching-${notifications.length + 1}`,
      tenantId: input.tenantId,
      audience: "learner",
      title: "Weekly coaching log ready for your takeaways",
      detail: `${coach.name} documented a weekly coaching log for ${learner.name}. The log includes agent, supervisor, and optional leadership copy details for follow-up sharing.`,
      priority: "info",
      createdAt,
    });
  }

  return created;
}

export function updateWeeklyCoachingLogTakeaways(input: UpdateWeeklyCoachingTakeawaysInput) {
  const existing = weeklyCoachingLogs.find((entry) => entry.tenantId === input.tenantId && entry.id === input.weeklyCoachingLogId);

  if (!existing) {
    throw new Error(`Weekly coaching log not found for ${input.weeklyCoachingLogId}`);
  }

  existing.agentTakeaways = input.agentTakeaways;
  existing.updatedAt = new Date().toISOString();

  documentationEntries.unshift({
    id: `doc-takeaway-${documentationEntries.length + 1}`,
    tenantId: input.tenantId,
    subjectUserId: existing.subjectUserId,
    sourceType: "coaching_summary",
    title: `Learner takeaways added for ${existing.employeeName}`,
    summary: input.agentTakeaways,
    createdAt: existing.updatedAt,
    authoredByRole: "learner",
    evidencePoints: [
      `Weekly coaching log: ${existing.id}`,
      `Coach copy: ${existing.coachEmail}`,
      `Supervisor copy: ${existing.supervisorEmail}`,
    ],
    weeklyCoachingLogId: existing.id,
  });

  return existing;
}

export function updateWeeklyCoachingLog(input: UpdateWeeklyCoachingLogInput) {
  const existing = weeklyCoachingLogs.find((entry) => entry.tenantId === input.tenantId && entry.id === input.weeklyCoachingLogId);

  if (!existing) {
    throw new Error(`Weekly coaching log not found for ${input.weeklyCoachingLogId}`);
  }

  existing.sessionDate = input.sessionDate;
  existing.attendance = input.attendance;
  existing.followUpFromPrevious = input.followUpFromPrevious;
  existing.coachingComments = input.coachingComments;
  existing.smartGoalCommitment = input.smartGoalCommitment;
  existing.additionalSupport = input.additionalSupport;
  existing.agentTakeaways = input.agentTakeaways ?? existing.agentTakeaways;
  existing.attachments = existing.attachments ?? [];
  existing.updatedAt = new Date().toISOString();

  const linkedReview = existing.linkedReviewLogId
    ? reviewLogs.find((entry) => entry.tenantId === input.tenantId && entry.id === existing.linkedReviewLogId)
    : null;

  if (linkedReview) {
    linkedReview.notes = `${input.coachingComments}\n\nFollow-up from previous coaching: ${input.followUpFromPrevious}`;
    linkedReview.nextStep = input.smartGoalCommitment;
  }

  documentationEntries.unshift({
    id: `doc-weekly-log-edit-${documentationEntries.length + 1}`,
    tenantId: input.tenantId,
    subjectUserId: existing.subjectUserId,
    sourceType: "coaching_summary",
    title: `Weekly coaching log updated for ${existing.employeeName}`,
    summary: input.coachingComments,
    createdAt: existing.updatedAt,
    authoredByRole: existing.coachRole,
    evidencePoints: [
      `Attendance: ${input.attendance}`,
      `SMART goal: ${input.smartGoalCommitment}`,
      `Additional support: ${input.additionalSupport}`,
    ],
    weeklyCoachingLogId: existing.id,
  });

  return existing;
}

export function addWeeklyCoachingLogAttachments(input: AddWeeklyCoachingLogAttachmentsInput) {
  const existing = weeklyCoachingLogs.find((entry) => entry.tenantId === input.tenantId && entry.id === input.weeklyCoachingLogId);

  if (!existing) {
    throw new Error(`Weekly coaching log not found for ${input.weeklyCoachingLogId}`);
  }

  existing.attachments = [...(existing.attachments ?? []), ...input.attachments];
  existing.updatedAt = new Date().toISOString();

  documentationEntries.unshift({
    id: `doc-weekly-log-attachment-${documentationEntries.length + 1}`,
    tenantId: input.tenantId,
    subjectUserId: existing.subjectUserId,
    sourceType: "coaching_summary",
    title: `Weekly coaching attachment${input.attachments.length === 1 ? "" : "s"} added for ${existing.employeeName}`,
    summary: `${input.attachments.length} attachment${input.attachments.length === 1 ? "" : "s"} added to the weekly coaching record.`,
    createdAt: existing.updatedAt,
    authoredByRole: existing.coachRole,
    evidencePoints: [
      `Weekly coaching log: ${existing.id}`,
      ...input.attachments.map((attachment) => `Attachment: ${attachment.fileName}`),
    ],
    weeklyCoachingLogId: existing.id,
  });

  return existing;
}

export function createTenantCustomRole(input: CreateTenantCustomRoleInput) {
  const created: TenantCustomRole = {
    id: `custom-role-${tenantCustomRoles.length + 1}`,
    tenantId: input.tenantId,
    name: input.name,
    description: input.description,
    inheritsFrom: input.inheritsFrom,
    createdAt: new Date().toISOString(),
  };

  tenantCustomRoles.unshift(created);
  return created;
}

export function applyCoachingGuidance(input: ApplyCoachingGuidanceInput) {
  const suggestion = aiSuggestions.find((entry) => entry.tenantId === input.tenantId && entry.id === input.suggestionId);

  if (!suggestion) {
    throw new Error(`AI coaching suggestion not found for ${input.suggestionId}`);
  }

  const approver = getUser(input.approverRole, input.tenantId);
  const learner = getUserById(suggestion.learnerUserId, input.tenantId) ?? getUser("learner", input.tenantId);
  const selectedTarget = input.journeyId && input.moduleId
    ? getJourneyModule(input.tenantId, input.journeyId, input.moduleId)
    : getSuggestedRetrainingTarget(suggestion);

  if (!selectedTarget) {
    throw new Error("No valid training target is available for this coaching suggestion.");
  }

  const createdAt = new Date().toISOString();
  const dueAt = new Date(Date.now() + (48 * 60 * 60 * 1000)).toISOString();
  const existingAssignment = retrainingAssignments.find((assignment) => assignment.tenantId === input.tenantId && assignment.sourceSuggestionId === suggestion.id && assignment.learnerUserId === learner.id && assignment.status !== "completed");
  const guidanceMode = input.journeyId && input.moduleId ? "manual_override" : "ai_approved";
  const guidanceNote = guidanceMode === "manual_override"
    ? `${approver.name} overrode the AI suggestion and selected ${selectedTarget.module.title} from ${selectedTarget.journey.title}.`
    : `${approver.name} approved the AI recommendation and assigned the targeted retraining module ${selectedTarget.module.title}.`;

  const assignment: RetrainingAssignment = existingAssignment ?? {
    id: `retraining-${retrainingAssignments.length + 1}`,
    tenantId: input.tenantId,
    learnerUserId: learner.id,
    journeyId: selectedTarget.journey.id,
    journeyTitle: selectedTarget.journey.title,
    moduleId: selectedTarget.module.id,
    moduleTitle: selectedTarget.module.title,
    moduleFormat: selectedTarget.module.format,
    skillFocus: selectedTarget.module.skillFocus,
    sourceSuggestionId: suggestion.id,
    requestedByRole: input.approverRole,
    requestedByUserId: approver.id,
    deliveryMode: guidanceMode,
    summary: suggestion.summary,
    guidanceNote,
    status: "assigned",
    createdAt,
    dueAt,
    completedAt: undefined,
  };

  assignment.journeyId = selectedTarget.journey.id;
  assignment.journeyTitle = selectedTarget.journey.title;
  assignment.moduleId = selectedTarget.module.id;
  assignment.moduleTitle = selectedTarget.module.title;
  assignment.moduleFormat = selectedTarget.module.format;
  assignment.skillFocus = selectedTarget.module.skillFocus;
  assignment.requestedByRole = input.approverRole;
  assignment.requestedByUserId = approver.id;
  assignment.deliveryMode = guidanceMode;
  assignment.summary = suggestion.summary;
  assignment.guidanceNote = guidanceNote;
  assignment.status = "assigned";
  assignment.createdAt = createdAt;
  assignment.dueAt = dueAt;
  assignment.completedAt = undefined;

  if (!existingAssignment) {
    retrainingAssignments.unshift(assignment);
  }

  notifications.unshift(
    {
      id: `note-retraining-learner-${notifications.length + 1}`,
      tenantId: input.tenantId,
      audience: "learner",
      title: `Retraining assigned: ${assignment.moduleTitle}`,
      detail: `${approver.name} assigned a targeted retraining module for ${assignment.skillFocus.toLowerCase()}. Complete ${assignment.moduleTitle} within the next 48 hours.`,
      priority: "critical",
      createdAt,
    },
    {
      id: `note-retraining-${input.approverRole}-${notifications.length + 2}`,
      tenantId: input.tenantId,
      audience: input.approverRole,
      title: `${guidanceMode === "manual_override" ? "Override" : "AI guidance"} sent to learner`,
      detail: `${learner.name} was assigned ${assignment.moduleTitle} from ${assignment.journeyTitle} with a 48-hour due window.`,
      priority: "info",
      createdAt,
    },
  );

  documentationEntries.unshift({
    id: `doc-guidance-${documentationEntries.length + 1}`,
    tenantId: input.tenantId,
    subjectUserId: learner.id,
    sourceType: "coaching_summary",
    title: `Targeted retraining assigned: ${assignment.moduleTitle}`,
    summary: guidanceNote,
    createdAt,
    authoredByRole: input.approverRole,
    evidencePoints: [
      `Journey: ${assignment.journeyTitle}`,
      `Module: ${assignment.moduleTitle}`,
      `Due by: ${new Date(assignment.dueAt).toLocaleString()}`,
    ],
  });

  return assignment;
}

export function updateRetrainingAssignmentStatus(input: UpdateRetrainingAssignmentStatusInput) {
  const assignment = retrainingAssignments.find((entry) => entry.tenantId === input.tenantId && entry.id === input.assignmentId);

  if (!assignment) {
    throw new Error(`Retraining assignment not found for ${input.assignmentId}`);
  }

  const learner = getUserById(assignment.learnerUserId, input.tenantId) ?? getUser("learner", input.tenantId);
  const changedAt = new Date().toISOString();

  assignment.status = input.status;
  assignment.completedAt = input.status === "completed" ? changedAt : undefined;

  const journey = journeys.find((entry) => entry.tenantId === input.tenantId && entry.id === assignment.journeyId);
  const module = journey?.modules.find((entry) => entry.id === assignment.moduleId);

  if (module) {
    if (input.status === "completed") {
      module.completionRate = 100;
    } else if (input.status === "in_progress") {
      module.completionRate = Math.max(module.completionRate, 55);
    }
  }

  if (journey) {
    const total = journey.modules.reduce((sum, entry) => sum + entry.completionRate, 0);
    journey.progress = Math.round(total / Math.max(journey.modules.length, 1));
  }

  if (input.status === "completed") {
    notifications.unshift(
      {
        id: `note-retraining-complete-learner-${notifications.length + 1}`,
        tenantId: input.tenantId,
        audience: "learner",
        title: `Retraining completed: ${assignment.moduleTitle}`,
        detail: `You completed the targeted retraining module ${assignment.moduleTitle}. Your coach and manager can now see the completed status in their oversight views.`,
        priority: "info",
        createdAt: changedAt,
      },
      {
        id: `note-retraining-complete-manager-${notifications.length + 2}`,
        tenantId: input.tenantId,
        audience: "manager",
        title: `${learner.name} completed retraining`,
        detail: `${learner.name} finished ${assignment.moduleTitle} from ${assignment.journeyTitle}. The completion chip is now reflected in the oversight lane.`,
        priority: "info",
        createdAt: changedAt,
      },
      {
        id: `note-retraining-complete-coach-${notifications.length + 3}`,
        tenantId: input.tenantId,
        audience: "coach",
        title: `${learner.name} completed retraining`,
        detail: `${learner.name} finished ${assignment.moduleTitle} from ${assignment.journeyTitle}. The completion chip is now reflected in the coach supervision lane.`,
        priority: "info",
        createdAt: changedAt,
      },
    );

    documentationEntries.unshift({
      id: `doc-retraining-complete-${documentationEntries.length + 1}`,
      tenantId: input.tenantId,
      subjectUserId: learner.id,
      sourceType: "module_completion",
      title: `Targeted retraining completed: ${assignment.moduleTitle}`,
      summary: `${learner.name} completed the assigned retraining module and the completion state is now visible in leadership oversight views.`,
      createdAt: changedAt,
      authoredByRole: "system",
      evidencePoints: [
        `Journey: ${assignment.journeyTitle}`,
        `Module: ${assignment.moduleTitle}`,
        `Completed at: ${new Date(changedAt).toLocaleString()}`,
      ],
    });
  }

  return assignment;
}

export function getDemoLanding() {
  return {
    tenants: tenants.map((tenant) => ({
      ...tenant,
      branding: getTenantBranding(tenant.id),
    })),
    featuredMetrics: [
      { label: "Active interventions", value: 18 },
      { label: "Avg. readiness uplift", value: "+9 pts" },
      { label: "Documented coaching cycles", value: "94%" },
      { label: "Intervention-to-impact confidence", value: "High" },
    ],
  };
}

export function getExecutiveDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const executive = getUser("executive", tenant.id);
  const branding = getTenantBranding(tenant.id);
  const workflowLibraryMix = getWorkflowLibraryMix(tenant.id, "executive");

  return {
    tenant,
    branding,
    executive,
    readiness: {
      score: executive.readinessScore,
      target: 88,
      teamScore: 76,
      uplift: 9,
    },
    // Sourced from data (was a hardcoded "High" literal in the panel) so the exports are fully data-driven.
    interventionConfidence: {
      value: "High",
      supporting: "Correlation between action volume and readiness movement is positive",
    },
    roiMetrics: [
      { label: "QA score", before: 81, after: 89, delta: "+8 pts" },
      { label: "AHT", before: 602, after: 548, delta: "-54 sec" },
      { label: "CSAT", before: 4.1, after: 4.6, delta: "+0.5" },
      { label: "Adherence", before: 86, after: 92, delta: "+6 pts" },
    ],
    roiTrendSeries: [
      { period: "Jan", qaScore: 80, csat: 4.0, readiness: 70, benchmarkQa: 78, benchmarkCsat: 3.9, benchmarkReadiness: 69 },
      { period: "Feb", qaScore: 82, csat: 4.1, readiness: 72, benchmarkQa: 79, benchmarkCsat: 4.0, benchmarkReadiness: 70 },
      { period: "Mar", qaScore: 84, csat: 4.2, readiness: 75, benchmarkQa: 80, benchmarkCsat: 4.0, benchmarkReadiness: 71 },
      { period: "Apr", qaScore: 86, csat: 4.4, readiness: 79, benchmarkQa: 81, benchmarkCsat: 4.1, benchmarkReadiness: 73 },
      { period: "May", qaScore: 89, csat: 4.6, readiness: 84, benchmarkQa: 82, benchmarkCsat: 4.2, benchmarkReadiness: 75 },
    ],
    correlationSeries: [
      { week: "W1", interventions: 3, readiness: 69 },
      { week: "W2", interventions: 5, readiness: 73 },
      { week: "W3", interventions: 7, readiness: 79 },
      { week: "W4", interventions: 6, readiness: 84 },
    ],
    teamReadiness: [
      { team: "Core Service Delivery", score: 76 },
      { team: "Resolution Operations", score: 82 },
      { team: "Digital Care", score: 78 },
    ],
    reportingOverview: {
      headline: "Client reporting turns frontline activity into an executive-ready ROI story.",
      summary: "The reporting dashboard combines intervention evidence, coaching discipline, assessment risk, peer benchmarks, and operational error movement so clients can see whether enablement is changing behavior at scale.",
      summaryCards: [
        { label: "Tracked learners", value: "78", detail: "People currently inside the active reporting population across the seeded business units." },
        { label: "High-alert questions", value: "3", detail: "Assessment prompts whose miss-rate trend and attempt volume exceed the intervention threshold." },
        { label: "Repeat-module escalations", value: "4", detail: "Learners who have been sent the same intervention pattern at least three times without full behavior recovery." },
        { label: "Coaching cadence target hit", value: "94%", detail: "Share of expected coaching touchpoints that landed on time across the current review cycle." },
      ],
    },
    questionReporting: [
      {
        id: "question-report-workflow-verification",
        module: "QA Calibration and Fair Score Interpretation",
        skillDomain: "Evaluation rigor",
        question: "Which evidence check should happen before a reviewer finalizes a disputed QA score?",
        missRate: 42,
        peerMissRate: 26,
        peerPercentile: 18,
        firstPassSuccess: 48,
        retryDependency: 29,
        affectedCohort: "New hires in workflow-heavy queues",
        attemptsLast14Days: 64,
        assetId: "library-workflow-precision-kit",
        assetTitle: "Quality Assurance Essentials",
        journeyId: "journey-workflow-precision",
        moduleId: "mod-wp-3",
        trend: "Miss rate climbed 7 points week over week after reviewers began skipping calibration comparisons on borderline calls.",
        alert: "high",
        coachingAction: "Reinforce evidence-first score reviews and require one comparison example before finalizing disputed ratings.",
      },
      {
        id: "question-report-closing-control",
        module: "QA Calibration and Fair Score Interpretation",
        skillDomain: "Score-defense discipline",
        question: "What should a reviewer cite first when defending a borderline QA score during calibration?",
        missRate: 34,
        peerMissRate: 22,
        peerPercentile: 31,
        firstPassSuccess: 57,
        retryDependency: 24,
        affectedCohort: "Developing specialists with recent transfer variance",
        attemptsLast14Days: 51,
        assetId: "library-workflow-precision-kit",
        assetTitle: "Quality Assurance Essentials",
        journeyId: "journey-workflow-precision",
        moduleId: "mod-wp-3",
        trend: "Performance improved slightly after manager side-by-side reviews, but misses still cluster when reviewers defend intuition before the standard.",
        alert: "medium",
        coachingAction: "Coach reviewers to cite the standard language before explaining their interpretation in calibration huddles.",
      },
      {
        id: "question-report-service-recovery",
        module: "Service recovery and de-escalation",
        skillDomain: "Empathy under pressure",
        question: "Which response best lowers tension before the next workflow instruction is introduced?",
        missRate: 19,
        peerMissRate: 17,
        peerPercentile: 56,
        firstPassSuccess: 73,
        retryDependency: 12,
        affectedCohort: "Tenured specialists after escalation surges",
        attemptsLast14Days: 38,
        assetId: "library-service-foundations-core",
        assetTitle: "Soft Skills & Customer/Patient Service Foundation",
        journeyId: "journey-service-foundations",
        moduleId: "mod-sf-3",
        trend: "Miss rate is stable, but managers still keep this item visible because it predicts repeat escalations when tone drift appears.",
        alert: "watch",
        coachingAction: "Keep the module in rotation and confirm the empathy statement is still audible in monitored calls.",
      },
    ],
    lifecycleReporting: [
      {
        id: "lifecycle-early-stage",
        stage: "Early stage",
        tenureRange: "0-30 days",
        population: 18,
        readiness: 68,
        qaScore: 78,
        interventionCloseRate: 82,
        peerPercentile: 26,
        errorRate: 12,
        trend: "Fastest improvement happens when coaching starts within the first two weeks.",
        coachingFocus: "Increase guided shadowing and verify the first-call workflow script before solo volume rises.",
      },
      {
        id: "lifecycle-developing-stage",
        stage: "Developing stage",
        tenureRange: "31-90 days",
        population: 26,
        readiness: 77,
        qaScore: 85,
        interventionCloseRate: 89,
        peerPercentile: 58,
        errorRate: 8,
        trend: "Readiness climbs most when managers pair quality reviews with weekly coaching commitments.",
        coachingFocus: "Tighten coaching follow-through on recurring skill gaps so performance stabilizes before quarter close.",
      },
      {
        id: "lifecycle-tenured-stage",
        stage: "Tenured stage",
        tenureRange: "91+ days",
        population: 34,
        readiness: 84,
        qaScore: 91,
        interventionCloseRate: 95,
        peerPercentile: 74,
        errorRate: 5,
        trend: "Tenured specialists sustain the strongest quality outcomes but still need targeted refreshers after workflow changes.",
        coachingFocus: "Use brief reinforcement sprints after policy updates so experienced staff do not drift from the current standard.",
      },
    ],
    peerBenchmarking: [
      {
        id: "peer-benchmark-core-service",
        cohort: "Core Service Delivery managers",
        metric: "QA score",
        score: "84th percentile",
        comparison: "8 points above similar workflow teams",
        insight: "The highest-performing cohort combines weekly coaching completion with lower repeat-module counts.",
      },
      {
        id: "peer-benchmark-movable-middle",
        cohort: "Developing specialists, 31-90 days tenure",
        metric: "Readiness growth",
        score: "61st percentile",
        comparison: "3 points above matched peers after intervention closeout",
        insight: "This cohort improves when coaching follows retraining within seven days of assignment.",
      },
      {
        id: "peer-benchmark-digital-care",
        cohort: "Digital Care queue",
        metric: "Error-rate reduction",
        score: "72nd percentile",
        comparison: "4.2 points lower than the peer error baseline",
        insight: "Error recovery is strongest where workflow modules are paired with documented manager follow-through.",
      },
    ],
    repeatAssignmentReporting: [
      {
        id: "repeat-assignment-nina",
        learner: "Nina Patel",
        module: "QA Calibration and Fair Score Interpretation",
        assignmentCount: 3,
        completionRate: "100%",
        assetId: "library-workflow-precision-kit",
        assetTitle: "Quality Assurance Essentials",
        journeyId: "journey-workflow-precision",
        moduleId: "mod-wp-3",
        behaviorChange: "QA improvement stalled after the second calibration assignment and only resumed once weekly coaching notes required evidence-first score defense.",
        recommendedEscalation: "Escalate from module resend to live calibration review plus manager side-by-side scoring practice.",
      },
      {
        id: "repeat-assignment-emily",
        learner: "Emily Ross",
        module: "Service recovery and de-escalation",
        assignmentCount: 3,
        completionRate: "67%",
        assetId: "library-service-foundations-core",
        assetTitle: "Soft Skills & Customer/Patient Service Foundation",
        journeyId: "journey-service-foundations",
        moduleId: "mod-sf-3",
        behaviorChange: "Escalation tone improved, but repeat documentation misses suggest workflow reinforcement is still incomplete.",
        recommendedEscalation: "Shift from standalone retraining to combined empathy coaching and documentation audit.",
      },
    ],
    coachingConsistency: {
      cadenceAdherence: "94%",
      missedIntervals: 5,
      followUpCompletion: "88%",
      documentationCompleteness: "91%",
      outcomeAlignment: "Teams above the cadence target hold 6-point stronger readiness than teams that miss two or more coaching windows.",
      managerRollup: [
        {
          manager: "Marcus Bell",
          cadenceAdherence: 96,
          missedIntervals: 1,
          followUpCompletion: 92,
          documentationCompleteness: 95,
        },
        {
          manager: "Darius Cole",
          cadenceAdherence: 89,
          missedIntervals: 2,
          followUpCompletion: 84,
          documentationCompleteness: 87,
        },
        {
          manager: "Sofia Nguyen",
          cadenceAdherence: 91,
          missedIntervals: 2,
          followUpCompletion: 86,
          documentationCompleteness: 89,
        },
      ],
    },
    behaviorAnalysis: [
      {
        id: "behavior-verification",
        behavior: "Verification language consistency",
        signalShare: "32% of flagged behaviors",
        trend: "Improving after targeted workflow retraining, but still the largest source of preventable QA variance.",
        recommendedAction: "Keep question-level monitoring tied to the verification module and weekly call-opening audits.",
      },
      {
        id: "behavior-closing-control",
        behavior: "Closing control and next-step clarity",
        signalShare: "24% of flagged behaviors",
        trend: "The behavior improves when managers document one observable close-out phrase in the coaching log.",
        recommendedAction: "Require the next coaching note to include the exact close-out behavior expected in live calls.",
      },
      {
        id: "behavior-empathy",
        behavior: "Empathy during escalation handling",
        signalShare: "18% of flagged behaviors",
        trend: "Tenured specialists show occasional drift during high-volume periods even when quiz performance remains strong.",
        recommendedAction: "Use refresher scenarios and side-by-side reviews during escalation spikes rather than resending foundational modules alone.",
      },
    ],
    errorRateReporting: {
      currentErrorRate: "7.8%",
      baselineErrorRate: "12.4%",
      delta: "-4.6 pts",
      trendSeries: [
        { period: "Jan", total: 12.4, critical: 3.1, moderate: 5.3, minor: 4.0 },
        { period: "Feb", total: 11.3, critical: 2.8, moderate: 4.9, minor: 3.6 },
        { period: "Mar", total: 10.1, critical: 2.6, moderate: 4.3, minor: 3.2 },
        { period: "Apr", total: 8.8, critical: 2.3, moderate: 3.9, minor: 2.6 },
        { period: "May", total: 7.8, critical: 2.1, moderate: 3.4, minor: 2.3 },
      ],
      severityMix: [
        { label: "Critical", value: "2.1%", detail: "Identity, compliance, or documentation misses with direct operational risk." },
        { label: "Moderate", value: "3.4%", detail: "Workflow and transfer misses that create avoidable rework or repeat contact." },
        { label: "Minor", value: "2.3%", detail: "Non-critical phrasing or closure misses that still weaken consistency." },
      ],
      movementSummary: "Error-rate improvement is strongest in teams where managers document follow-up evidence inside the next weekly coaching log instead of only resending training.",
    },
    proofOfImpact: {
      headline: "Program evidence is strongest where targeted retraining and coaching cadence stay tightly aligned.",
      summary: "The executive scorecard combines before-and-after movement, intervention-volume correlation, sustained-readiness checks, and operational error improvement to show directional proof that the operating model is working.",
      beforeAfter: [
        {
          label: "Targeted readiness cohort",
          before: 71,
          after: 83,
          delta: "+12 pts",
          evidence: "Measured 45 days after intervention launch for specialists who completed the assigned coaching loop and module follow-through.",
        },
        {
          label: "Workflow precision cohort",
          before: 78,
          after: 88,
          delta: "+10 pts",
          evidence: "Observed after the same cohort closed workflow-verification retraining and moved back into live quality review.",
        },
      ],
      interventionCorrelation: {
        value: "0.78",
        label: "Positive intervention/readiness relationship",
        detail: "Across the current four-week trend, higher intervention volume tracks with stronger readiness movement, which supports attribution review but not a sole-cause claim.",
      },
      sustainedReadiness: [
        {
          label: "60-day sustain rate",
          value: "82%",
          detail: "Share of improved specialists still holding at least 80% of their readiness gain after intervention closeout.",
        },
        {
          label: "Coaching cadence adherence",
          value: "94%",
          detail: "Teams above the coaching-cadence target show the most stable post-intervention readiness in the seeded review set.",
        },
        {
          label: "Error-rate reduction hold",
          value: "-4.6 pts",
          detail: "Teams that closed both retraining and coaching follow-through sustained the strongest decline in repeat workflow errors.",
        },
      ],
      evidenceNote: "These measures show evidence consistent with program effectiveness, but they do not isolate EnableOS as the only cause of movement.",
    },
    methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "executive" || asset.linkedRole === "all"),
    methodologyMappings: methodologyMappings.filter((mapping) => mapping.tenantId === tenant.id || mapping.tenantId === "all"),
    documentationEntries: getDocumentationEntries(tenant.id),
    reviewLogs: getReviewLogs(tenant.id),
    weeklyCoachingLogs: getWeeklyCoachingLogs(tenant.id),
    notifications: notifications.filter((item) => item.tenantId === tenant.id && (item.audience === "executive" || item.audience === "all")),
    workflowLibraryMix,
  };
}

export function getManagerDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const manager = getUser("manager", tenant.id);
  const coach = getUser("coach", tenant.id);
  const learner = getUser("learner", tenant.id);
  const branding = getTenantBranding(tenant.id);
  const workflowLibraryMix = getWorkflowLibraryMix(tenant.id, "manager");
  const directReportLogs = getWeeklyCoachingLogs(tenant.id, learner.id);
  const coachingSessions = getTenantCoachingSessions(tenant.id);
  const aiSuggestion = aiSuggestions.find((suggestion) => suggestion.tenantId === tenant.id && suggestion.managerUserId === manager.id) ?? aiSuggestions[0];
  const retrainingAssignments = getRetrainingAssignmentsForLearner(tenant.id, learner.id);
  const currentRetrainingAssignment = getCurrentRetrainingAssignment(retrainingAssignments);
  const activeRetrainingAssignments = currentRetrainingAssignment && currentRetrainingAssignment.status !== "completed"
    ? [currentRetrainingAssignment]
    : [];
  const retrainingHistory = getHistoricalRetrainingAssignments(retrainingAssignments, currentRetrainingAssignment?.id);
  const retrainingCatalog = journeys
    .filter((journey) => journey.tenantId === tenant.id)
    .map((journey) => ({
      id: journey.id,
      title: journey.title,
      role: journey.role,
      modules: journey.modules.map((module) => ({
        id: module.id,
        title: module.title,
        format: module.format,
        skillFocus: module.skillFocus,
      })),
    }));
  const coachCoverage = [
    {
      coach,
      directReport: learner,
      coachingSessions: coachingSessions.filter((session) => session.learnerUserId === learner.id),
      weeklyCoachingLogs: directReportLogs,
      latestLog: directReportLogs[0] ?? null,
      currentRetrainingAssignment,
      retrainingAssignments,
      retrainingHistory,
    },
  ];

  return {
    tenant,
    branding,
    manager,
    directReport: learner,
    coachCoverage,
    openSignals: getTenantSignals(tenant.id),
    interventions: getTenantInterventions(tenant.id),
    coachingSessions,
    methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "manager" || asset.linkedRole === "all"),
    methodologyMappings: methodologyMappings.filter((mapping) => mapping.tenantId === tenant.id || mapping.tenantId === "all"),
    documentationEntries: getDocumentationEntries(tenant.id, learner.id),
    reviewLogs: getReviewLogs(tenant.id, learner.id),
    weeklyCoachingLogs: directReportLogs,
    aiSuggestion,
    currentRetrainingAssignment,
    activeRetrainingAssignments,
    retrainingAssignments,
    retrainingHistory,
    retrainingCatalog,
    notifications: notifications.filter((item) => item.tenantId === tenant.id && (item.audience === "manager" || item.audience === "all")),
    rules: rules.filter((rule) => ["qaScore", "aht", "adherence", "csat"].includes(rule.metric)),
    workflowLibraryMix,
    // Leaderboard roster for the manager board (LEAD5). Managers oversee reports
    // org-wide; the component derives Coach Team groups and the per-learner drill-down
    // from the `team` field. directReportId is the manager's primary report.
    leaderboard: {
      directReportId: learner.id,
      orgRoster: buildLeaderboardRoster(),
    },
  };
}

export function getCoachDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const coach = getUser("coach", tenant.id);
  const learner = getUser("learner", tenant.id);
  const manager = getUser("manager", tenant.id);
  const branding = getTenantBranding(tenant.id);
  const workflowLibraryMix = getWorkflowLibraryMix(tenant.id, "coach");
  const teamLearners = users.filter((user) => user.tenantId === tenant.id && user.role === "learner" && user.team === coach.team);
  const teamLearnerIds = new Set(teamLearners.map((entry) => entry.id));
  const teamCoachingSessions = getTenantCoachingSessions(tenant.id).filter((session) => teamLearnerIds.has(session.learnerUserId));
  const teamWeeklyCoachingLogs = weeklyCoachingLogs.filter((log) => log.tenantId === tenant.id && teamLearnerIds.has(log.subjectUserId));
  const teamDocumentationEntries = documentationEntries.filter((entry) => entry.tenantId === tenant.id && teamLearnerIds.has(entry.subjectUserId));
  const teamAiSuggestions = aiSuggestions.filter((suggestion) => suggestion.tenantId === tenant.id && teamLearnerIds.has(suggestion.learnerUserId));
  const teamRetrainingAssignments = retrainingAssignments.filter((assignment) => assignment.tenantId === tenant.id && teamLearnerIds.has(assignment.learnerUserId));
  const coachingSessions = teamCoachingSessions.filter((session) => session.learnerUserId === learner.id);
  const openSignals = getTenantSignals(tenant.id).slice(0, 3);
  const weeklyLogs = teamWeeklyCoachingLogs.filter((log) => log.subjectUserId === learner.id);
  const directLearnerAssignments = teamRetrainingAssignments.filter((assignment) => assignment.learnerUserId === learner.id);
  const aiSuggestion = teamAiSuggestions.find((suggestion) => suggestion.learnerUserId === learner.id) ?? teamAiSuggestions[0] ?? aiSuggestions[0];
  const currentRetrainingAssignment = getCurrentRetrainingAssignment(directLearnerAssignments);
  const activeRetrainingAssignments = currentRetrainingAssignment && currentRetrainingAssignment.status !== "completed"
    ? [currentRetrainingAssignment]
    : [];
  const retrainingHistory = getHistoricalRetrainingAssignments(directLearnerAssignments, currentRetrainingAssignment?.id);
  const retrainingCatalog = journeys
    .filter((journey) => journey.tenantId === tenant.id)
    .map((journey) => ({
      id: journey.id,
      title: journey.title,
      role: journey.role,
      modules: journey.modules.map((module) => ({
        id: module.id,
        title: module.title,
        format: module.format,
        skillFocus: module.skillFocus,
      })),
    }));

  return {
    tenant,
    branding,
    coach,
    directLearner: learner,
    teamLearners,
    escalationPartner: manager,
    activeJourney: getTenantJourneys(tenant.id, "coach"),
    openSignals,
    coachingSessions,
    teamCoachingSessions,
    weeklyCoachingLogs: weeklyLogs,
    teamWeeklyCoachingLogs,
    reviewLogs: getReviewLogs(tenant.id, learner.id),
    documentationEntries: teamDocumentationEntries.filter((entry) => entry.subjectUserId === learner.id),
    teamDocumentationEntries,
    methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "manager" || asset.linkedRole === "all"),
    methodologyMappings: methodologyMappings.filter((mapping) => mapping.tenantId === tenant.id || mapping.tenantId === "all"),
    aiSuggestion,
    teamAiSuggestions,
    currentRetrainingAssignment,
    activeRetrainingAssignments,
    retrainingAssignments: directLearnerAssignments,
    teamRetrainingAssignments,
    retrainingHistory,
    retrainingCatalog,
    notifications: notifications.filter((item) => item.tenantId === tenant.id && (item.audience === "coach" || item.audience === "manager" || item.audience === "all")).slice(0, 4),
    workflowLibraryMix,
  };
}

type LearnerDashboardOptions = {
  freshStart?: boolean;
  viewerName?: string | null;
  viewerOpenId?: string | null;
};

// Read-only leaderboard roster projection over the seeded users — no seed values are
// mutated here. Shared by the learner board (LEAD2) and the manager board (LEAD5).
// PRODUCTION: scope this to the real organization/tenant boundary and resolve true
// team membership server-side (human-engineer item — same as our other multi-tenant
// flags). The demo intentionally spans tenants so the Org / Coach Team / Learner
// scopes all have a meaningful population.
function buildLeaderboardRoster() {
  return users
    .filter((entry) => entry.role === "learner")
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      team: entry.team,
      tenantId: entry.tenantId,
      readinessScore: entry.readinessScore,
      journeyProgressPct: entry.journeyProgressPct,
      completedRatioPct: entry.completedRatioPct,
      quizFirstPassPct: entry.quizFirstPassPct,
      onTimeStreakWeeks: entry.onTimeStreakWeeks,
    }));
}

function buildFreshLearnerIdentity(tenantId: string, viewerName?: string | null, viewerOpenId?: string | null) {
  const baseLearner = getUser("learner", tenantId);
  const normalizedName = viewerName?.trim();
  const safeIdSuffix = (viewerOpenId ?? normalizedName ?? "fresh-learner")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "fresh-learner";
  const avatarFallback = (normalizedName ?? "Fresh Learner")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("") || "FL";

  return {
    ...baseLearner,
    id: `fresh-learner-${safeIdSuffix}`,
    name: normalizedName && normalizedName.length > 0 ? normalizedName : "Fresh Learner",
    email: `${safeIdSuffix}@fresh-learner.demo`,
    avatarFallback,
    readinessScore: 0,
  };
}

function buildFreshLearnerJourney(tenantId: string) {
  const journey = structuredClone(getTenantJourneys(tenantId, "learner"));
  return {
    ...journey,
    progress: 0,
    modules: journey.modules.map((module) => ({
      ...module,
      completionRate: 0,
    })),
  };
}

export function getLearnerDashboard(tenantId?: string, options?: LearnerDashboardOptions) {
  const tenant = getTenant(tenantId);
  const learner = getUser("learner", tenant.id);
  const branding = getTenantBranding(tenant.id);
  const workflowLibraryMix = getWorkflowLibraryMix(tenant.id, "learner");

  if (options?.freshStart) {
    const freshLearner = buildFreshLearnerIdentity(tenant.id, options.viewerName, options.viewerOpenId);
    const freshJourney = buildFreshLearnerJourney(tenant.id);
    const createdAt = new Date().toISOString();
    const baseCoachingSession = getTenantCoachingSessions(tenant.id).find((session) => session.learnerUserId === learner.id) ?? coachingSessions[0];

    return {
      tenant,
      branding,
      learner: freshLearner,
      activeJourney: freshJourney,
      assignedInterventions: [],
      currentRetrainingAssignment: null,
      retrainingAssignments: [],
      retrainingHistory: [],
      methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "learner" || asset.linkedRole === "all"),
      methodologyMappings: methodologyMappings.filter((mapping) => mapping.tenantId === tenant.id || mapping.tenantId === "all"),
      documentationEntries: [],
      reviewLogs: [],
      weeklyCoachingLogs: [],
      notifications: [{
        id: `note-fresh-learner-${freshLearner.id}`,
        tenantId: tenant.id,
        audience: "learner",
        title: "Fresh learner session ready",
        detail: "This learner view starts at 0% progress so you can test the full journey from the beginning without inherited completions or retraining history.",
        priority: "info",
        createdAt,
      }],
      nextCoachingSession: {
        ...baseCoachingSession,
        id: `coaching-fresh-${freshLearner.id}`,
        tenantId: tenant.id,
        learnerUserId: freshLearner.id,
        title: "Initial coaching touchpoint",
        dueDate: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)).toISOString(),
        status: "scheduled",
        notes: "Fresh learner test path created so the end-to-end learner flow can be exercised from the beginning.",
        auditTrail: [{ at: createdAt, detail: "Fresh learner test session created for end-to-end validation." }],
      },
      workflowLibraryMix,
    };
  }

  const retrainingAssignments = getRetrainingAssignmentsForLearner(tenant.id, learner.id);
  const currentRetrainingAssignment = getCurrentRetrainingAssignment(retrainingAssignments);
  const retrainingHistory = getHistoricalRetrainingAssignments(retrainingAssignments, currentRetrainingAssignment?.id);
  const learnerVisibleWeeklyCoachingLogs = getWeeklyCoachingLogs(tenant.id, learner.id).filter((entry) => (entry.visibility ?? "public") === "public");
  const learnerVisibleWeeklyCoachingLogIds = new Set(learnerVisibleWeeklyCoachingLogs.map((entry) => entry.id));
  const learnerVisibleDocumentationEntries = getDocumentationEntries(tenant.id, learner.id).filter((entry) => !entry.weeklyCoachingLogId || learnerVisibleWeeklyCoachingLogIds.has(entry.weeklyCoachingLogId));
  const learnerVisibleReviewLogs = getReviewLogs(tenant.id, learner.id).filter((entry) => !entry.weeklyCoachingLogId || learnerVisibleWeeklyCoachingLogIds.has(entry.weeklyCoachingLogId));

  // Leaderboard roster (LEAD2). `team` = the current learner's team; `org` = every
  // seeded learner so the Org-wide scope has a real population to rank.
  const allLearnerRoster = buildLeaderboardRoster();
  const leaderboard = {
    currentLearnerId: learner.id,
    teamRoster: allLearnerRoster.filter((entry) => entry.team === learner.team),
    orgRoster: allLearnerRoster,
  };

  return {
    leaderboard,
    tenant,
    branding,
    learner,
    activeJourney: getTenantJourneys(tenant.id, "learner"),
    assignedInterventions: getTenantInterventions(tenant.id).filter((item) => item.assigneeUserId === learner.id),
    currentRetrainingAssignment,
    retrainingAssignments,
    retrainingHistory,
    methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "learner" || asset.linkedRole === "all"),
    methodologyMappings: methodologyMappings.filter((mapping) => mapping.tenantId === tenant.id || mapping.tenantId === "all"),
    documentationEntries: learnerVisibleDocumentationEntries,
    reviewLogs: learnerVisibleReviewLogs,
    weeklyCoachingLogs: learnerVisibleWeeklyCoachingLogs,
    notifications: notifications.filter((item) => item.tenantId === tenant.id && (item.audience === "learner" || item.audience === "all")),
    nextCoachingSession: getTenantCoachingSessions(tenant.id).find((session) => session.learnerUserId === learner.id) ?? coachingSessions[0],
    workflowLibraryMix,
  };
}

export function getAdminDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const admin = getUser("client_admin", tenant.id);
  const branding = getTenantBranding(tenant.id);
  const workflowLibraryMix = getWorkflowLibraryMix(tenant.id, "client_admin");

  return {
    tenant,
    admin,
    branding,
    tenantUsers: users.filter((user) => user.tenantId === tenant.id),
    methodologyAssets,
    methodologyMappings: methodologyMappings.filter((mapping) => mapping.tenantId === tenant.id || mapping.tenantId === "all"),
    documentationEntries: getDocumentationEntries(tenant.id),
    reviewLogs: getReviewLogs(tenant.id),
    weeklyCoachingLogs: getWeeklyCoachingLogs(tenant.id),
    configuration: [
      { key: "whiteLabelBranding", label: "White-label branding", value: "Enabled" },
      { key: "roleScopedViews", label: "Role-scoped views", value: "Strictly enforced" },
      { key: "aiRationale", label: "AI rationale required", value: "Enabled" },
      { key: "humanOverride", label: "Human override controls", value: "Enabled" },
      { key: "sanitizedContent", label: "Client-specific content removed", value: "Verified in demo seed layer" },
    ],
    customRoles: tenantCustomRoles.filter((role) => role.tenantId === tenant.id),
    workflowLibraryMix,
  };
}

export function getDemoBundle(tenantId?: string) {
  const tenant = getTenant(tenantId);
  return {
    landing: getDemoLanding(),
    executive: getExecutiveDashboard(tenant.id),
    manager: getManagerDashboard(tenant.id),
    coach: getCoachDashboard(tenant.id),
    learner: getLearnerDashboard(tenant.id),
    admin: getAdminDashboard(tenant.id),
  };
}

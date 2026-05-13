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
};

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
};

export type UpdateWeeklyCoachingTakeawaysInput = {
  tenantId: string;
  weeklyCoachingLogId: string;
  agentTakeaways: string;
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
  { id: "u-learn-1", tenantId: "atlas-operations", name: "Nina Patel", email: "nina.patel@enterpriseworkspace.demo", title: "Senior Service Specialist", role: "learner", team: "Core Service Delivery", avatarFallback: "NP", readinessScore: 72 },
  { id: "u-admin-1", tenantId: "atlas-operations", name: "Jared Kim", email: "jared.kim@enterpriseworkspace.demo", title: "Client Admin", role: "client_admin", team: "Enablement Governance", avatarFallback: "JK", readinessScore: 90 },
  { id: "u-exec-2", tenantId: "lighthouse-finance", name: "Leah Porter", email: "leah.porter@regulatedworkspace.demo", title: "Chief Service Officer", role: "executive", team: "Enterprise", avatarFallback: "LP", readinessScore: 86 },
  { id: "u-mgr-2", tenantId: "lighthouse-finance", name: "Darius Cole", email: "darius.cole@regulatedworkspace.demo", title: "Quality and Coaching Supervisor", role: "manager", team: "Resolution Operations", avatarFallback: "DC", readinessScore: 80 },
  { id: "u-coach-2", tenantId: "lighthouse-finance", name: "Monica Ellis", email: "monica.ellis@regulatedworkspace.demo", title: "Coaching Supervisor", role: "coach", team: "Resolution Operations", avatarFallback: "ME", readinessScore: 78 },
  { id: "u-learn-2", tenantId: "lighthouse-finance", name: "Emily Ross", email: "emily.ross@regulatedworkspace.demo", title: "Client Support Specialist", role: "learner", team: "Resolution Operations", avatarFallback: "ER", readinessScore: 74 },
  { id: "u-admin-2", tenantId: "lighthouse-finance", name: "Tanya Brooks", email: "tanya.brooks@regulatedworkspace.demo", title: "Client Admin", role: "client_admin", team: "Operational Governance", avatarFallback: "TB", readinessScore: 91 },
  { id: "u-exec-3", tenantId: "horizon-commerce", name: "Devon Hayes", email: "devon.hayes@horizoncommerce.demo", title: "VP, Experience Operations", role: "executive", team: "Enterprise", avatarFallback: "DH", readinessScore: 81 },
  { id: "u-mgr-3", tenantId: "horizon-commerce", name: "Sofia Nguyen", email: "sofia.nguyen@horizoncommerce.demo", title: "Omnichannel Team Leader", role: "manager", team: "Digital Care", avatarFallback: "SN", readinessScore: 76 },
  { id: "u-coach-3", tenantId: "horizon-commerce", name: "Caleb Morris", email: "caleb.morris@horizoncommerce.demo", title: "Customer Care Coach", role: "coach", team: "Digital Care", avatarFallback: "CM", readinessScore: 77 },
  { id: "u-learn-3", tenantId: "horizon-commerce", name: "Jordan Blake", email: "jordan.blake@horizoncommerce.demo", title: "Support Associate", role: "learner", team: "Digital Care", avatarFallback: "JB", readinessScore: 70 },
  { id: "u-admin-3", tenantId: "horizon-commerce", name: "Priya Shah", email: "priya.shah@horizoncommerce.demo", title: "Client Admin", role: "client_admin", team: "Experience Systems", avatarFallback: "PS", readinessScore: 88 },
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
    title: "Real Time Coaching",
    progress: 77,
    competencyGap: "Consistent field coaching with observable follow-through",
    modules: [
      { id: "preview-workflow-module", title: "Turning QA Findings into Behavior Coaching", format: "Microlearning", durationMinutes: 7, skillFocus: "Behavior-based coaching", completionRate: 89 },
      { id: "mod-sf-1", title: "Active Listening", format: "Microlearning", durationMinutes: 6, skillFocus: "Active listening", completionRate: 84 },
    ],
  },
  {
    id: "journey-data-led-leadership",
    tenantId: "atlas-operations",
    role: "executive",
    title: "Unlocking the power of date",
    progress: 68,
    competencyGap: "Intervention-to-outcome visibility",
    modules: [
      { id: "mod-dl-1", title: "Reading KPI Relationships", format: "Playbook", durationMinutes: 10, skillFocus: "KPI literacy", completionRate: 72 },
      { id: "mod-dl-2", title: "From Signal to Root Cause", format: "Microlearning", durationMinutes: 8, skillFocus: "Root-cause discipline", completionRate: 69 },
      { id: "mod-dl-3", title: "Executive Readiness and ROI Review", format: "Checklist", durationMinutes: 7, skillFocus: "Governance rhythm", completionRate: 64 },
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
    title: "Real Time Coaching",
    progress: 75,
    competencyGap: "Recovery coaching consistency under compliance pressure",
    modules: [
      { id: "mod-sf-3", title: "De-Escalation and Service Recovery", format: "Scenario", durationMinutes: 8, skillFocus: "Recovery coaching", completionRate: 82 },
      { id: "preview-workflow-module", title: "Turning QA Findings into Behavior Coaching", format: "Microlearning", durationMinutes: 7, skillFocus: "Behavior-based coaching", completionRate: 86 },
    ],
  },
  {
    id: "journey-performance-leadership-lf",
    tenantId: "lighthouse-finance",
    role: "manager",
    title: "Maximizing performance through performance management",
    progress: 79,
    competencyGap: "Performance segmentation without bias",
    modules: [
      { id: "mod-lfp-1", title: "Performance Archetypes", format: "Playbook", durationMinutes: 9, skillFocus: "Pattern recognition", completionRate: 81 },
      { id: "mod-lfp-2", title: "Coaching the Movable Middle", format: "Scenario", durationMinutes: 12, skillFocus: "Targeted coaching", completionRate: 75 },
      { id: "mod-lfp-3", title: "Improvement Plans and Measurable Checkpoints", format: "Checklist", durationMinutes: 8, skillFocus: "Documentation rigor", completionRate: 80 },
    ],
  },
  {
    id: "journey-data-led-leadership-lf",
    tenantId: "lighthouse-finance",
    role: "executive",
    title: "Unlocking the power of date",
    progress: 73,
    competencyGap: "Cross-team trend validation",
    modules: [
      { id: "mod-lfd-1", title: "Avoiding false conclusions in dashboard reviews", format: "Microlearning", durationMinutes: 8, skillFocus: "Bias avoidance", completionRate: 77 },
      { id: "mod-lfd-2", title: "Trend validation across teams and time periods", format: "Playbook", durationMinutes: 9, skillFocus: "Decision quality", completionRate: 74 },
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
    role: "coach",
    title: "Coach Supervision: Digital-Care Coaching Readiness",
    progress: 74,
    competencyGap: "Visible coaching follow-through across digital channels",
    modules: [
      { id: "mod-sf-2", title: "Empathy and Reassurance", format: "Microlearning", durationMinutes: 6, skillFocus: "Reassurance coaching", completionRate: 80 },
      { id: "preview-performance-module", title: "Performance Archetypes", format: "Playbook", durationMinutes: 9, skillFocus: "Pattern recognition", completionRate: 78 },
    ],
  },
  {
    id: "journey-engagement-systems-hc",
    tenantId: "horizon-commerce",
    role: "manager",
    title: "Gamification & Work From Home",
    progress: 76,
    competencyGap: "Recognition rhythm for hybrid teams",
    modules: [
      { id: "mod-hce-1", title: "Points, Badges, and Meaningful Recognition", format: "Playbook", durationMinutes: 9, skillFocus: "Recognition strategy", completionRate: 84 },
      { id: "mod-hce-2", title: "Balancing Competition and Collaboration", format: "Microlearning", durationMinutes: 8, skillFocus: "Team motivation", completionRate: 72 },
      { id: "mod-hce-3", title: "Pulse Checks and Engagement Iteration", format: "Checklist", durationMinutes: 7, skillFocus: "Continuous improvement", completionRate: 77 },
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
    occurredAt: "2026-04-18T10:20:00Z",
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
    occurredAt: "2026-04-18T12:00:00Z",
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
    occurredAt: "2026-04-19T15:30:00Z",
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
    occurredAt: "2026-04-19T17:10:00Z",
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
    dueDate: "2026-04-25",
    createdAt: "2026-04-19T08:30:00Z",
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
    dueDate: "2026-04-24",
    createdAt: "2026-04-19T11:15:00Z",
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
    dueDate: "2026-04-21",
    createdAt: "2026-04-17T09:45:00Z",
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
    dueDate: "2026-04-23",
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
    dueDate: "2026-05-01",
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
];

const notifications: NotificationItem[] = [
  {
    id: "note-retraining-seeded",
    tenantId: "atlas-operations",
    audience: "learner",
    title: "Retraining assigned: Verification confidence",
    detail: "Marcus Bell assigned a targeted refresher on verification confidence and closing discipline. Complete Verification confidence and closing control within the next 48 hours.",
    priority: "critical",
    createdAt: "2026-05-05T12:00:00Z",
  },
  {
    id: "note-1",
    tenantId: "atlas-operations",
    audience: "manager",
    title: "Follow-up coaching due tomorrow",
    detail: "The workflow precision follow-up for Nina Patel is due in less than 24 hours and should include updated monitored-call notes.",
    priority: "warning",
    createdAt: "2026-04-20T18:00:00Z",
  },
  {
    id: "note-2",
    tenantId: "atlas-operations",
    audience: "executive",
    title: "Readiness uplift holding above target",
    detail: "Intervention-linked readiness movement is currently outperforming the month-to-date plan by 2 points.",
    priority: "info",
    createdAt: "2026-04-20T18:10:00Z",
  },
  {
    id: "note-3",
    tenantId: "atlas-operations",
    audience: "learner",
    title: "New action assigned",
    detail: "Complete the call-control checklist before your next one-on-one so the manager can validate your updated closing approach.",
    priority: "warning",
    createdAt: "2026-04-20T18:20:00Z",
  },
  {
    id: "note-4",
    tenantId: "atlas-operations",
    audience: "all",
    title: "Documentation hub updated",
    detail: "Recent module completions and coaching summaries are now available in the documentation timeline.",
    priority: "info",
    createdAt: "2026-04-20T18:30:00Z",
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
    title: "Performance Leadership System",
    category: "Coaching methodology",
    summary: "A CHCG framework for fair performance segmentation, coaching cadence, structured improvement plans, and calibration discipline.",
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
    title: "Engagement and Recognition Toolkit",
    category: "Culture and motivation",
    summary: "A CHCG toolkit for recognition loops, gamified engagement mechanics, pulse checks, and distributed-team leadership rhythms.",
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
    title: "Unlocking the power of date",
    summary: "A CHCG leadership deck that teaches KPI interpretation, trend reading, root-cause diagnosis, and decision-ready storytelling for enablement leaders.",
    category: "Leadership intelligence",
    sourceKind: "chcg",
    format: "Deck",
    linkedRoles: ["executive", "manager"],
    tags: ["leadership", "data", "kpi", "analytics"],
    linkedJourneyIds: ["journey-data-led-leadership"],
    linkedInterventionRuleIds: [],
    sourceLabel: "Sanitized CHCG source modules",
    createdAt: "2026-04-20T18:48:00Z",
  },
  {
    id: "library-performance-governance",
    tenantId: "all",
    title: "Performance Maximization Governance Playbook",
    summary: "A CHCG leadership playbook covering performance segmentation, coaching cadence, quarterly reviews, annual reviews, and measurable improvement planning.",
    category: "Performance governance",
    sourceKind: "chcg",
    format: "Playbook",
    linkedRoles: ["executive", "manager", "client_admin"],
    tags: ["performance management", "quarterly reviews", "annual reviews", "coaching"],
    linkedJourneyIds: ["journey-performance-leadership"],
    linkedInterventionRuleIds: [],
    sourceLabel: "Sanitized CHCG source modules",
    createdAt: "2026-04-20T18:49:00Z",
  },
  {
    id: "library-gamified-engagement",
    tenantId: "all",
    title: "Gamification & Work From Home",
    summary: "A CHCG asset focused on recognition loops, gamified motivation, pulse checks, and leadership rhythms for distributed teams.",
    category: "Culture and motivation",
    sourceKind: "chcg",
    format: "Worksheet",
    linkedRoles: ["executive", "manager", "client_admin"],
    tags: ["gamification", "engagement", "recognition", "remote teams"],
    linkedJourneyIds: [],
    linkedInterventionRuleIds: [],
    sourceLabel: "Sanitized CHCG source modules",
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
];

const retrainingAssignments: RetrainingAssignment[] = [
  {
    id: "retraining-seeded-1",
    tenantId: "atlas-operations",
    learnerUserId: "u-learn-1",
    journeyId: "journey-workflow-precision",
    journeyTitle: "Workflow Precision",
    moduleId: "mod-wp-1",
    moduleTitle: "Verification confidence and closing control",
    moduleFormat: "Microlearning",
    skillFocus: "Verification confidence",
    sourceSuggestionId: "suggest-1",
    requestedByRole: "manager",
    requestedByUserId: "u-manager-1",
    deliveryMode: "ai_approved",
    summary: "Coach Nina on verification confidence and closing discipline before adding new learning volume.",
    guidanceNote: "Marcus Bell approved the AI recommendation and assigned a targeted verification refresher to the top of Nina's learner journey.",
    status: "assigned",
    createdAt: "2026-05-05T12:00:00Z",
    dueAt: "2026-05-07T12:00:00Z",
  },
  {
    id: "retraining-seeded-2",
    tenantId: "atlas-operations",
    learnerUserId: "u-learn-1",
    journeyId: "journey-workflow-precision",
    journeyTitle: "Workflow Precision",
    moduleId: "mod-wp-2",
    moduleTitle: "Workflow handoff accuracy under pressure",
    moduleFormat: "Checklist",
    skillFocus: "Handoff control",
    sourceSuggestionId: "suggest-archive-2",
    requestedByRole: "manager",
    requestedByUserId: "u-manager-1",
    deliveryMode: "ai_approved",
    summary: "Tighten handoff clarity and reduce repeat explanations during escalated service scenarios.",
    guidanceNote: "Marcus Bell assigned a rapid handoff-control refresher and Nina completed it during the current coaching cycle.",
    status: "completed",
    createdAt: "2026-05-02T09:00:00Z",
    dueAt: "2026-05-04T09:00:00Z",
    completedAt: "2026-05-03T16:30:00Z",
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
    createdAt: "2026-04-18T14:00:00Z",
    dueAt: "2026-04-20T14:00:00Z",
    completedAt: "2026-04-19T18:05:00Z",
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
    sessionDate: "2026-04-20",
    attendance: "Present and on time; adherence stabilized after the previous scheduling correction.",
    followUpFromPrevious: "Nina met the prior SMART goal by using verification language on four of the last five monitored interactions, but summary transitions still slowed call closure in one call.",
    coachingComments: "Reviewed verification phrasing, reassurance language, and closing structure against recent QA findings. The agreed action is to use one concise summary statement before confirming next steps.",
    smartGoalCommitment: "By 2026-04-27, Nina will use the approved concise summary statement on 90% of monitored calls and reduce closing-script variance to fewer than one miss across five scored interactions. Follow-up date: 2026-04-27.",
    additionalSupport: "Manager will provide two annotated call examples and complete one live side-by-side review before the next coaching touchpoint.",
    agentTakeaways: "I need to keep the closing summary short and consistent so I can confirm next steps without sounding rushed.",
    createdAt: "2026-04-20T13:15:00Z",
    updatedAt: "2026-04-20T13:30:00Z",
    linkedReviewLogId: "review-1",
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
  return contentLibraryAssets.filter((asset) => {
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
        title: "Data-Led Leadership",
        summary: "KPI interpretation, trend analysis, root-cause thinking, and action ownership.",
      },
      {
        id: "track-performance-leadership",
        title: "Performance Leadership",
        summary: "Coaching cadence, calibration, review rhythms, and measurable improvement planning.",
      },
      {
        id: "track-engagement-recognition",
        title: "Engagement and Recognition",
        summary: "Recognition loops, gamified motivation, pulse checks, and distributed-team rhythm.",
      },
    ],
    featuredAssets: assets.slice(0, 6),
    chcgAssets,
    importedAssets,
  };
}

export function createClientContent(input: CreateClientContentInput) {
  const created: ContentLibraryAsset = {
    id: `library-upload-${contentLibraryAssets.length + 1}`,
    tenantId: input.tenantId,
    title: input.title,
    summary: input.summary,
    category: input.category,
    sourceKind: "client_upload",
    format: input.format,
    linkedRoles: input.linkedRoles,
    tags: input.tags,
    linkedJourneyIds: [],
    linkedInterventionRuleIds: [],
    sourceLabel: input.sourceLabel,
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    createdAt: new Date().toISOString(),
  };

  contentLibraryAssets.unshift(created);
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
    ],
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
  };

  weeklyCoachingLogs.unshift(created);
  notifications.unshift({
    id: `note-weekly-coaching-${notifications.length + 1}`,
    tenantId: input.tenantId,
    audience: "learner",
    title: "Weekly coaching log ready for your takeaways",
    detail: `${coach.name} documented a weekly coaching log for ${learner.name}. The log includes agent, supervisor, and optional leadership copy details for follow-up sharing.`,
    priority: "info",
    createdAt,
  });

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
  });

  return existing;
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
    roiMetrics: [
      { label: "QA score", before: 81, after: 89, delta: "+8 pts" },
      { label: "AHT", before: 602, after: 548, delta: "-54 sec" },
      { label: "CSAT", before: 4.1, after: 4.6, delta: "+0.5" },
      { label: "Adherence", before: 86, after: 92, delta: "+6 pts" },
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
  };
}

export function getCoachDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const coach = getUser("coach", tenant.id);
  const learner = getUser("learner", tenant.id);
  const manager = getUser("manager", tenant.id);
  const branding = getTenantBranding(tenant.id);
  const workflowLibraryMix = getWorkflowLibraryMix(tenant.id, "coach");
  const coachingSessions = getTenantCoachingSessions(tenant.id).filter((session) => session.learnerUserId === learner.id);
  const openSignals = getTenantSignals(tenant.id).slice(0, 3);
  const weeklyLogs = getWeeklyCoachingLogs(tenant.id, learner.id);
  const aiSuggestion = aiSuggestions.find((suggestion) => suggestion.tenantId === tenant.id && suggestion.learnerUserId === learner.id) ?? aiSuggestions[0];
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

  return {
    tenant,
    branding,
    coach,
    directLearner: learner,
    escalationPartner: manager,
    activeJourney: getTenantJourneys(tenant.id, "coach"),
    openSignals,
    coachingSessions,
    weeklyCoachingLogs: weeklyLogs,
    reviewLogs: getReviewLogs(tenant.id, learner.id),
    documentationEntries: getDocumentationEntries(tenant.id, learner.id),
    methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "manager" || asset.linkedRole === "all"),
    methodologyMappings: methodologyMappings.filter((mapping) => mapping.tenantId === tenant.id || mapping.tenantId === "all"),
    aiSuggestion,
    currentRetrainingAssignment,
    activeRetrainingAssignments,
    retrainingAssignments,
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

  return {
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
    documentationEntries: getDocumentationEntries(tenant.id, learner.id),
    reviewLogs: getReviewLogs(tenant.id, learner.id),
    weeklyCoachingLogs: getWeeklyCoachingLogs(tenant.id, learner.id),
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

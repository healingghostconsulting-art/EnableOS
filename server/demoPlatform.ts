export type DemoRole = "executive" | "manager" | "learner" | "client_admin";

export type DemoTenant = {
  id: string;
  name: string;
  industry: string;
  accent: string;
  logoMark: string;
  description: string;
};

export type DemoUser = {
  id: string;
  tenantId: string;
  name: string;
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
  role: Extract<DemoRole, "manager" | "learner" | "executive">;
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

const tenants: DemoTenant[] = [
  {
    id: "northstar-health",
    name: "Northstar Health Access",
    industry: "Healthcare access",
    accent: "#2F6FED",
    logoMark: "NH",
    description: "A patient access and contact center operation focused on adherence, QA consistency, and service recovery.",
  },
  {
    id: "summit-financial",
    name: "Summit Financial Care",
    industry: "Financial services",
    accent: "#0E7490",
    logoMark: "SF",
    description: "A regulated service environment emphasizing trust, QA rigor, and customer satisfaction improvement.",
  },
  {
    id: "velocity-retail",
    name: "Velocity Retail Support",
    industry: "Retail support",
    accent: "#7C3AED",
    logoMark: "VR",
    description: "A multi-channel retail support team balancing handle time, sentiment, and schedule adherence.",
  },
];

const users: DemoUser[] = [
  { id: "u-exec-1", tenantId: "northstar-health", name: "Alicia Warren", title: "VP, Patient Access", role: "executive", team: "Enterprise", avatarFallback: "AW", readinessScore: 82 },
  { id: "u-mgr-1", tenantId: "northstar-health", name: "Marcus Bell", title: "Operations Manager", role: "manager", team: "Cardiology Access", avatarFallback: "MB", readinessScore: 74 },
  { id: "u-learn-1", tenantId: "northstar-health", name: "Nina Patel", title: "Senior Access Specialist", role: "learner", team: "Cardiology Access", avatarFallback: "NP", readinessScore: 69 },
  { id: "u-admin-1", tenantId: "northstar-health", name: "Jared Kim", title: "Client Admin", role: "client_admin", team: "Operations Excellence", avatarFallback: "JK", readinessScore: 88 },
  { id: "u-exec-2", tenantId: "summit-financial", name: "Leah Porter", title: "Chief Experience Officer", role: "executive", team: "Enterprise", avatarFallback: "LP", readinessScore: 85 },
  { id: "u-mgr-2", tenantId: "summit-financial", name: "Darius Cole", title: "Supervisor", role: "manager", team: "Card Services", avatarFallback: "DC", readinessScore: 77 },
  { id: "u-learn-2", tenantId: "summit-financial", name: "Emily Ross", title: "Client Support Specialist", role: "learner", team: "Card Services", avatarFallback: "ER", readinessScore: 72 },
  { id: "u-admin-2", tenantId: "summit-financial", name: "Tanya Brooks", title: "Client Admin", role: "client_admin", team: "CX Governance", avatarFallback: "TB", readinessScore: 90 },
  { id: "u-exec-3", tenantId: "velocity-retail", name: "Devon Hayes", title: "VP, Service Operations", role: "executive", team: "Enterprise", avatarFallback: "DH", readinessScore: 79 },
  { id: "u-mgr-3", tenantId: "velocity-retail", name: "Sofia Nguyen", title: "Team Leader", role: "manager", team: "Omnichannel Care", avatarFallback: "SN", readinessScore: 71 },
  { id: "u-learn-3", tenantId: "velocity-retail", name: "Jordan Blake", title: "Support Associate", role: "learner", team: "Omnichannel Care", avatarFallback: "JB", readinessScore: 67 },
  { id: "u-admin-3", tenantId: "velocity-retail", name: "Priya Shah", title: "Client Admin", role: "client_admin", team: "Enablement", avatarFallback: "PS", readinessScore: 86 },
];

const journeys: LearningJourney[] = [
  {
    id: "journey-empathy",
    tenantId: "northstar-health",
    role: "learner",
    title: "Service Recovery and Empathy Precision",
    progress: 58,
    competencyGap: "Empathy and call control",
    modules: [
      { id: "mod-1", title: "Empathy under pressure", format: "Microlearning", durationMinutes: 8, skillFocus: "Empathy", completionRate: 76 },
      { id: "mod-2", title: "Patient reassurance scripting", format: "Playbook", durationMinutes: 12, skillFocus: "Language control", completionRate: 61 },
      { id: "mod-3", title: "Escalation de-escalation scenario", format: "Scenario", durationMinutes: 10, skillFocus: "Service recovery", completionRate: 49 },
    ],
  },
  {
    id: "journey-manager-coaching",
    tenantId: "northstar-health",
    role: "manager",
    title: "Behavior-Based Coaching for QA Movement",
    progress: 81,
    competencyGap: "Coaching consistency",
    modules: [
      { id: "mod-4", title: "From score variance to behavior insight", format: "Microlearning", durationMinutes: 9, skillFocus: "Diagnosis", completionRate: 87 },
      { id: "mod-5", title: "Structured coaching cadence", format: "Checklist", durationMinutes: 6, skillFocus: "Execution discipline", completionRate: 92 },
    ],
  },
  {
    id: "journey-exec-roi",
    tenantId: "northstar-health",
    role: "executive",
    title: "ROI Governance for Enablement Investments",
    progress: 66,
    competencyGap: "Outcome visibility",
    modules: [
      { id: "mod-6", title: "Readiness score interpretation", format: "Playbook", durationMinutes: 11, skillFocus: "Decision support", completionRate: 68 },
      { id: "mod-7", title: "Intervention impact review", format: "Microlearning", durationMinutes: 7, skillFocus: "Outcome review", completionRate: 73 },
    ],
  },
];

const signals: PerformanceSignal[] = [
  {
    id: "sig-1",
    tenantId: "northstar-health",
    userId: "u-learn-1",
    metric: "qaScore",
    label: "QA score",
    value: 78,
    target: 90,
    direction: "below_target",
    severity: "high",
    occurredAt: "2026-04-18T10:20:00Z",
    source: "QA",
    summary: "Documentation accuracy and empathy language fell below target during high-volume intake calls.",
  },
  {
    id: "sig-2",
    tenantId: "northstar-health",
    userId: "u-learn-1",
    metric: "aht",
    label: "Average handle time",
    value: 615,
    target: 540,
    direction: "above_limit",
    severity: "medium",
    occurredAt: "2026-04-18T12:00:00Z",
    source: "CX Ops",
    summary: "Call handling exceeded acceptable range for three consecutive shifts.",
  },
  {
    id: "sig-3",
    tenantId: "northstar-health",
    userId: "u-learn-1",
    metric: "adherence",
    label: "Schedule adherence",
    value: 84,
    target: 92,
    direction: "below_target",
    severity: "medium",
    occurredAt: "2026-04-19T08:45:00Z",
    source: "WFM",
    summary: "Adherence drift suggests workflow disruption after complex call escalations.",
  },
  {
    id: "sig-4",
    tenantId: "northstar-health",
    userId: "u-learn-1",
    metric: "csat",
    label: "CSAT",
    value: 4.1,
    target: 4.5,
    direction: "below_target",
    severity: "low",
    occurredAt: "2026-04-19T15:10:00Z",
    source: "CX Ops",
    summary: "Patient satisfaction softened in interactions requiring next-step clarification.",
  },
];

const rules: InterventionRule[] = [
  {
    id: "rule-qa-empathy",
    metric: "qaScore",
    thresholdLabel: "QA below 85",
    skillGap: "Empathy and documentation discipline",
    assignedJourneyId: "journey-empathy",
    assignedAction: "Assign service recovery journey and schedule a coaching session.",
    rationale: "Low QA combined with empathy variance indicates behavior reinforcement needs rather than knowledge-only refreshers.",
  },
  {
    id: "rule-aht-workflow",
    metric: "aht",
    thresholdLabel: "AHT above 580 seconds",
    skillGap: "Workflow clarity and call control",
    assignedJourneyId: "journey-empathy",
    assignedAction: "Assign workflow precision microlearning and manager follow-up.",
    rationale: "Handle-time inflation in complex contacts often reflects navigation hesitation and uneven reassurance language.",
  },
  {
    id: "rule-adherence-routine",
    metric: "adherence",
    thresholdLabel: "Adherence below 88%",
    skillGap: "Routine discipline and escalation handling",
    assignedJourneyId: "journey-manager-coaching",
    assignedAction: "Create follow-up plan with supervisor and reinforce routine discipline.",
    rationale: "Adherence slips are most durable when corrected through supervisor habit-setting and schedule coaching.",
  },
  {
    id: "rule-csat-recovery",
    metric: "csat",
    thresholdLabel: "CSAT below 4.3",
    skillGap: "Confidence in recovery communication",
    assignedJourneyId: "journey-empathy",
    assignedAction: "Assign communication scenario and monitor next-contact satisfaction trend.",
    rationale: "CSAT decline coupled with recovery scenarios signals a need for targeted communication reinforcement.",
  },
];

const interventions: Intervention[] = [
  {
    id: "int-1",
    tenantId: "northstar-health",
    signalId: "sig-1",
    assigneeUserId: "u-learn-1",
    ownerUserId: "u-mgr-1",
    ruleId: "rule-qa-empathy",
    title: "Recover empathy and documentation precision",
    status: "in_progress",
    dueDate: "2026-04-24T17:00:00Z",
    createdAt: "2026-04-18T10:35:00Z",
    gap: "Empathy and documentation discipline",
    assignedActions: ["Complete service recovery journey", "Attend live coaching session", "Review CHCG reassurance playbook"],
  },
  {
    id: "int-2",
    tenantId: "northstar-health",
    signalId: "sig-2",
    assigneeUserId: "u-learn-1",
    ownerUserId: "u-mgr-1",
    ruleId: "rule-aht-workflow",
    title: "Reduce handle time through workflow precision",
    status: "new",
    dueDate: "2026-04-25T17:00:00Z",
    createdAt: "2026-04-18T12:15:00Z",
    gap: "Workflow clarity and call control",
    assignedActions: ["Complete workflow precision module", "Acknowledge action plan", "Review next-best-call-control checklist"],
  },
  {
    id: "int-3",
    tenantId: "northstar-health",
    signalId: "sig-3",
    assigneeUserId: "u-mgr-1",
    ownerUserId: "u-mgr-1",
    ruleId: "rule-adherence-routine",
    title: "Stabilize adherence through routine coaching",
    status: "overdue",
    dueDate: "2026-04-21T15:00:00Z",
    createdAt: "2026-04-19T09:00:00Z",
    gap: "Routine discipline and escalation handling",
    assignedActions: ["Lead follow-up review", "Set escalation handling checkpoints", "Confirm routine expectations"],
  },
];

const coachingSessions: CoachingSession[] = [
  {
    id: "coach-1",
    tenantId: "northstar-health",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1",
    title: "Empathy recovery 1:1",
    status: "follow_up_due",
    dueDate: "2026-04-23T16:00:00Z",
    notes: "Focus on call opening control, patient reassurance language, and cleaner documentation closeout.",
    actionPlan: [
      "Use the CHCG reassurance script framework in the next five patient contacts.",
      "Complete the escalation recovery scenario before the next shift.",
      "Review QA notes with manager and capture self-reflection.",
    ],
    auditTrail: [
      { at: "2026-04-18T14:00:00Z", detail: "Session created from QA threshold breach." },
      { at: "2026-04-18T14:15:00Z", detail: "Manager documented three behavior targets and attached methodology playbook." },
      { at: "2026-04-19T18:10:00Z", detail: "Learner acknowledged action plan and completed first module." },
    ],
  },
  {
    id: "coach-2",
    tenantId: "northstar-health",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1",
    title: "Handle-time precision review",
    status: "scheduled",
    dueDate: "2026-04-24T13:00:00Z",
    notes: "Review where hesitation is extending calls and tie coaching to workflow simplification.",
    actionPlan: [
      "Observe two high-complexity calls.",
      "Document repeat navigation barriers.",
      "Confirm updated call-control checkpoints.",
    ],
    auditTrail: [
      { at: "2026-04-18T12:30:00Z", detail: "Session created from AHT rule trigger." },
    ],
  },
];

const notifications: NotificationItem[] = [
  {
    id: "notif-1",
    tenantId: "northstar-health",
    audience: "manager",
    title: "Overdue intervention requires action",
    detail: "Stabilize adherence through routine coaching is overdue and needs manager closure.",
    priority: "critical",
    createdAt: "2026-04-20T08:30:00Z",
  },
  {
    id: "notif-2",
    tenantId: "northstar-health",
    audience: "manager",
    title: "Follow-up reminder due tomorrow",
    detail: "Empathy recovery 1:1 follow-up is due tomorrow at 4:00 PM.",
    priority: "warning",
    createdAt: "2026-04-20T10:10:00Z",
  },
  {
    id: "notif-3",
    tenantId: "northstar-health",
    audience: "learner",
    title: "Microlearning assignment updated",
    detail: "Workflow precision module has been added to your active enablement plan.",
    priority: "info",
    createdAt: "2026-04-20T11:45:00Z",
  },
  {
    id: "notif-4",
    tenantId: "northstar-health",
    audience: "executive",
    title: "Readiness variance detected",
    detail: "Cardiology Access readiness is 8 points below enterprise target after QA variance spike.",
    priority: "warning",
    createdAt: "2026-04-20T09:15:00Z",
  },
];

const methodologyAssets: MethodologyAsset[] = [
  {
    id: "asset-1",
    title: "CHCG KPI Mastery Framework",
    category: "Performance governance",
    summary: "A structured model for connecting frontline metrics, manager action, and executive visibility to measurable business outcomes.",
    linkedRole: "all",
  },
  {
    id: "asset-2",
    title: "Behavior-Based Coaching Loop",
    category: "Coaching methodology",
    summary: "A repeatable coaching cadence that converts QA and KPI insights into observable behavior change and follow-up discipline.",
    linkedRole: "manager",
  },
  {
    id: "asset-3",
    title: "Executive Readiness Review",
    category: "Executive governance",
    summary: "A decision framework for tracking intervention impact, readiness movement, and enablement ROI across business units.",
    linkedRole: "executive",
  },
  {
    id: "asset-4",
    title: "Service Recovery Playbook",
    category: "Learner enablement",
    summary: "A CHCG-aligned framework for managing difficult interactions with precise language, empathy, and workflow control.",
    linkedRole: "learner",
  },
];

const aiSuggestions: AiSuggestion[] = [
  {
    id: "ai-1",
    tenantId: "northstar-health",
    managerUserId: "u-mgr-1",
    learnerUserId: "u-learn-1",
    summary: "Coach Nina on call openings and closeout discipline before reinforcing advanced de-escalation techniques.",
    recommendation: "Lead a 20-minute coaching review focused on empathy phrasing, documentation accuracy, and shorter summary statements. Keep the current journey assignment active and delay any new content until the first follow-up review is complete.",
    rationale: [
      "QA score dropped 12 points below target with recurring empathy-language variance.",
      "AHT rose 75 seconds above the acceptable range during the same period.",
      "The learner has already started the assigned CHCG service recovery journey, so the next highest-value action is reinforced coaching rather than adding more volume.",
    ],
    overrideAvailable: true,
  },
];

function getTenant(tenantId?: string) {
  return tenants.find((tenant) => tenant.id === tenantId) ?? tenants[0];
}

function getUser(role: DemoRole, tenantId?: string) {
  const tenant = getTenant(tenantId);
  return users.find((user) => user.tenantId === tenant.id && user.role === role) ?? users[0]!;
}

export function getDemoLanding() {
  return {
    tenants,
    featuredMetrics: [
      { label: "Active interventions", value: 18 },
      { label: "Avg. readiness uplift", value: "+9 pts" },
      { label: "Coaching plans completed", value: "94%" },
      { label: "Intervention-to-impact confidence", value: "High" },
    ],
  };
}

export function getExecutiveDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const executive = getUser("executive", tenant.id);

  return {
    tenant,
    executive,
    readiness: {
      score: 82,
      target: 88,
      teamScore: 74,
      uplift: 9,
    },
    roiMetrics: [
      { label: "QA score", before: 78, after: 87, delta: "+9 pts" },
      { label: "AHT", before: 615, after: 552, delta: "-63 sec" },
      { label: "CSAT", before: 4.1, after: 4.5, delta: "+0.4" },
      { label: "Adherence", before: 84, after: 91, delta: "+7 pts" },
    ],
    correlationSeries: [
      { week: "W1", interventions: 3, readiness: 68 },
      { week: "W2", interventions: 6, readiness: 72 },
      { week: "W3", interventions: 7, readiness: 78 },
      { week: "W4", interventions: 5, readiness: 82 },
    ],
    teamReadiness: [
      { team: "Cardiology Access", score: 74 },
      { team: "Primary Care Access", score: 83 },
      { team: "Referral Services", score: 79 },
    ],
    methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "executive" || asset.linkedRole === "all"),
    notifications: notifications.filter((item) => item.tenantId === tenant.id && (item.audience === "executive" || item.audience === "all")),
  };
}

export function getManagerDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const manager = getUser("manager", tenant.id);
  const learner = getUser("learner", tenant.id);

  return {
    tenant,
    manager,
    directReport: learner,
    openSignals: signals.filter((signal) => signal.tenantId === tenant.id),
    interventions: interventions.filter((item) => item.tenantId === tenant.id),
    coachingSessions: coachingSessions.filter((session) => session.tenantId === tenant.id),
    methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "manager" || asset.linkedRole === "all"),
    aiSuggestion: aiSuggestions.find((suggestion) => suggestion.tenantId === tenant.id && suggestion.managerUserId === manager.id) ?? aiSuggestions[0],
    notifications: notifications.filter((item) => item.tenantId === tenant.id && (item.audience === "manager" || item.audience === "all")),
    rules,
  };
}

export function getLearnerDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const learner = getUser("learner", tenant.id);

  return {
    tenant,
    learner,
    activeJourney: journeys.find((journey) => journey.tenantId === tenant.id && journey.role === "learner") ?? journeys[0],
    assignedInterventions: interventions.filter((item) => item.tenantId === tenant.id && item.assigneeUserId === learner.id),
    methodologyAssets: methodologyAssets.filter((asset) => asset.linkedRole === "learner" || asset.linkedRole === "all"),
    notifications: notifications.filter((item) => item.tenantId === tenant.id && (item.audience === "learner" || item.audience === "all")),
    nextCoachingSession: coachingSessions.find((session) => session.tenantId === tenant.id && session.learnerUserId === learner.id) ?? coachingSessions[0],
  };
}

export function getAdminDashboard(tenantId?: string) {
  const tenant = getTenant(tenantId);
  const admin = getUser("client_admin", tenant.id);

  return {
    tenant,
    admin,
    branding: {
      accent: tenant.accent,
      logoMark: tenant.logoMark,
      preferredLabel: `${tenant.name} Enablement Hub`,
      dataIsolation: "Strict tenant-scoped segmentation enabled",
    },
    tenantUsers: users.filter((user) => user.tenantId === tenant.id),
    methodologyAssets,
    configuration: [
      { key: "whiteLabelBranding", label: "White-label branding", value: "Enabled" },
      { key: "roleScopedViews", label: "Role-scoped views", value: "Strictly enforced" },
      { key: "aiRationale", label: "AI rationale required", value: "Enabled" },
      { key: "humanOverride", label: "Human override controls", value: "Enabled" },
    ],
  };
}

export function getDemoBundle(tenantId?: string) {
  const tenant = getTenant(tenantId);
  return {
    landing: getDemoLanding(),
    executive: getExecutiveDashboard(tenant.id),
    manager: getManagerDashboard(tenant.id),
    learner: getLearnerDashboard(tenant.id),
    admin: getAdminDashboard(tenant.id),
  };
}

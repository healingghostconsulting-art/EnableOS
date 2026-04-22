import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ShieldCheck,
  Sparkles,
  Target,
  Users2,
} from "lucide-react";
import type { DemoRole } from "../../../server/demoPlatform";
import { getTrainingPresentation } from "../../../shared/trainingContent";
import { Link, useLocation } from "wouter";

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
    eyebrow: "Manager / Supervisor",
    subtitle: "Review active signals, orchestrate coaching, and close workflow and service-quality gaps faster.",
  },
  learner: {
    title: "Learner enablement journey",
    route: "/learner",
    eyebrow: "Learner",
    subtitle: "Complete assignments tied to skill gaps, coaching actions, and readiness progress.",
  },
  client_admin: {
    title: "Client admin control plane",
    route: "/admin",
    eyebrow: "Client Admin",
    subtitle: "Manage white-label branding, tenant boundaries, and role-scoped configuration.",
  },
};

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="rounded-full border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
            {eyebrow}
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function PremiumCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <Card className={`border-white/10 bg-white/[0.035] shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl ${className}`}>
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
      <SelectTrigger className="w-[260px] border-white/10 bg-slate-950/70 text-slate-100">
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
}: {
  label: string;
  value: string;
  supporting: string;
  icon: React.ReactNode;
}) {
  return (
    <PremiumCard>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-slate-400">{label}</CardDescription>
          <div className="rounded-2xl border border-white/10 bg-white/6 p-2 text-slate-100">{icon}</div>
        </div>
        <CardTitle className="text-3xl font-semibold text-white">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-300">{supporting}</p>
      </CardContent>
    </PremiumCard>
  );
}

function ChartFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <PremiumCard className="h-full">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
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
        : "border-blue-500/30 bg-blue-500/12 text-blue-300";

  return <Badge className={`rounded-full border ${tone}`}>{value.replaceAll("_", " ")}</Badge>;
}

function LoadingState() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-3xl border border-white/8 bg-white/6" />
      ))}
    </div>
  );
}

function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(47,111,237,0.22),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(124,58,237,0.18),transparent_24%),linear-gradient(180deg,#08111f_0%,#091525_52%,#070d18_100%)] text-slate-100">
      <div className="container py-10 sm:py-12">{children}</div>
    </div>
  );
}

export function LandingView() {
  const landing = trpc.demo.landing.useQuery();
  const featuredTenants = landing.data?.tenants ?? [];

  return (
    <Surface>
      <div className="space-y-10">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_30px_120px_rgba(8,15,30,0.6)]">
          <div className="grid gap-10 px-8 py-10 md:grid-cols-[1.15fr_0.85fr] md:px-12 md:py-14">
            <div className="space-y-8">
              <div className="space-y-5">
                <Badge variant="outline" className="rounded-full border-white/12 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.32em] text-slate-300">
                  CHCG EnableOS Demo
                </Badge>
                <div className="space-y-4">
                  <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.02]">
                    Enterprise enablement and coaching intelligence built to move performance.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                    This demo shows how CHCG can transform KPI and QA signals into explainable interventions, structured coaching, role-specific insight, and measurable readiness improvement inside a polished multi-tenant experience.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.values(roleMeta).map((item: any) => (
                  <Link key={item.route} href={item.route}>
                    <Button className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">
                      Explore {item.eyebrow}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
              {featuredTenants.map((tenant: any) => (
                <PremiumCard key={tenant.id} className="relative overflow-hidden">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-sm font-medium text-white">
                        {tenant.logoMark}
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{tenant.industry}</Badge>
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
              title: "Signal to action",
              description: "Simulated KPI and QA feeds trigger interventions tied to Service Foundations, Workflow Precision, and CHCG coaching workflows.",
              icon: <Gauge className="h-5 w-5" />,
            },
            {
              title: "Role-specific intelligence",
              description: "Executives, managers, learners, and client admins see only the signals, journeys, and governance content relevant to their decision horizon.",
              icon: <Users2 className="h-5 w-5" />,
            },
            {
              title: "Explainable AI support",
              description: "AI-assisted coaching prompts include rationale, connect to CHCG methodology, and preserve explicit human override controls.",
              icon: <Bot className="h-5 w-5" />,
            },
          ].map((item: any) => (
            <PremiumCard key={item.title}>
              <CardHeader>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white">{item.icon}</div>
                <CardTitle className="text-white">{item.title}</CardTitle>
                <CardDescription className="text-slate-300">{item.description}</CardDescription>
              </CardHeader>
            </PremiumCard>
          ))}
        </div>

        <PremiumCard>
          <CardHeader className="space-y-4">
            <Badge className="w-fit rounded-full border-white/10 bg-white/8 text-slate-200">CHCG learning architecture</Badge>
            <div className="max-w-3xl space-y-3">
              <CardTitle className="text-2xl text-white">Five sanitized learning tracks now power the EnableOS story.</CardTitle>
              <CardDescription className="text-base leading-7 text-slate-300">The uploaded training materials are being translated into a clearer CHCG product narrative built around frontline service, workflow execution, leadership decision quality, performance governance, and recognition-led engagement.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-5">
            {[
              ["Service Foundations", "Empathy, professionalism, de-escalation, and trust-building behaviors for frontline performance."],
              ["Workflow Precision", "Verification, QA discipline, documentation accuracy, transfers, and clean execution habits."],
              ["Data-Led Leadership", "KPI reading, trend interpretation, root-cause analysis, and action ownership."],
              ["Performance Leadership", "Calibration, coaching cadence, review structure, and measurable improvement planning."],
              ["Engagement & Recognition", "Recognition loops, pulse checks, gamified momentum, and hybrid-team operating rhythm."],
            ].map((track: any) => (
              <div key={track[0]} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Track</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{track[0]}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{track[1]}</p>
              </div>
            ))}
          </CardContent>
        </PremiumCard>
      </div>
    </Surface>
  );
}

export function RoleWorkspace({ role }: { role: DemoRole }) {
  const landing = trpc.demo.landing.useQuery();
  const initialTenantId = landing.data?.tenants?.[0]?.id ?? "atlas-operations";
  const [tenantId, setTenantId] = useState(initialTenantId);

  const tenants = landing.data?.tenants ?? [];
  const tenantPicker = useMemo(
    () => <TenantPicker tenants={tenants} tenantId={tenantId} setTenantId={setTenantId} />,
    [tenantId, tenants],
  );

  const queryMap: Record<DemoRole, any> = {
    executive: trpc.demo.executive.useQuery({ tenantId }),
    manager: trpc.demo.manager.useQuery({ tenantId }),
    learner: trpc.demo.learner.useQuery({ tenantId }),
    client_admin: trpc.demo.admin.useQuery({ tenantId }),
  };

  const query = queryMap[role];
  const meta = roleMeta[role];
  const refreshWorkspace = () => {
    void landing.refetch();
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
            {tenantPicker}
            <Link href="/">
              <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                Back to overview
              </Button>
            </Link>
          </>
        }
      >
        {query.isLoading || landing.isLoading ? <LoadingState /> : null}
        {!query.isLoading && role === "executive" && query.data ? <ExecutivePanel data={query.data} onUpdated={refreshWorkspace} /> : null}
        {!query.isLoading && role === "manager" && query.data ? <ManagerPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
        {!query.isLoading && role === "learner" && query.data ? <LearnerPanel data={query.data} /> : null}
        {!query.isLoading && role === "client_admin" && query.data ? <AdminPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
      </SectionShell>
    </Surface>
  );
}

export function TrainingExperienceView() {
  const landing = trpc.demo.landing.useQuery();
  const tenants = landing.data?.tenants ?? [];
  const initialTenantId = landing.data?.tenants?.[0]?.id ?? "atlas-operations";
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [location] = useLocation();
  const queryParams = useMemo(() => {
    if (typeof window === "undefined") {
      return new URLSearchParams();
    }
    return new URLSearchParams(window.location.search);
  }, [location]);
  const requestedTenantId = queryParams.get("tenantId");
  const requestedAssetId = queryParams.get("assetId");
  const requestedAssetTitle = queryParams.get("assetTitle");
  const learner = trpc.demo.learner.useQuery({ tenantId });
  const [moduleIndex, setModuleIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [lessonPageIndex, setLessonPageIndex] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [practiceChoice, setPracticeChoice] = useState<"coach_first" | "peer_shadow" | null>(null);
  const [reflection, setReflection] = useState("");
  const [applicationAnswers, setApplicationAnswers] = useState<Record<string, string>>({});
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  useEffect(() => {
    if (requestedTenantId && requestedTenantId !== tenantId) {
      setTenantId(requestedTenantId);
    }
  }, [requestedTenantId, tenantId]);

  useEffect(() => {
    setModuleIndex(0);
    setStageIndex(0);
    setLessonPageIndex(0);
    setConfidence(null);
    setPracticeChoice(null);
    setReflection("");
    setApplicationAnswers({});
    setApplicationSubmitted(false);
  }, [tenantId]);

  useEffect(() => {
    setStageIndex(0);
    setLessonPageIndex(0);
    setConfidence(null);
    setPracticeChoice(null);
    setReflection("");
    setApplicationAnswers({});
    setApplicationSubmitted(false);
  }, [moduleIndex]);

  useEffect(() => {
    setLessonPageIndex(0);
    setApplicationAnswers({});
    setApplicationSubmitted(false);
  }, [stageIndex]);

  const tenantPicker = useMemo(
    () => <TenantPicker tenants={tenants} tenantId={tenantId} setTenantId={setTenantId} />,
    [tenantId, tenants],
  );

  const modules = learner.data?.activeJourney.modules ?? [];
  const selectedModule = modules[moduleIndex] ?? null;
  const journeyResources = learner.data?.workflowLibraryMix.journeyResources ?? [];
  const launchedAsset = journeyResources.find((asset: any) => asset.id === requestedAssetId)
    ?? journeyResources.find((asset: any) => asset.title === requestedAssetTitle)
    ?? null;
  const moduleKeywords = `${selectedModule?.title ?? ""} ${selectedModule?.skillFocus ?? ""} ${learner.data?.activeJourney.competencyGap ?? ""} ${launchedAsset?.title ?? ""} ${launchedAsset?.tags?.join(" ") ?? ""}`
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
    ? getTrainingPresentation(selectedModule, learner.data?.activeJourney.title ?? "Enablement journey", learner.data?.activeJourney.competencyGap ?? "Behavior consistency")
    : null;

  const stages = selectedModule
    ? [
        {
          id: "brief",
          label: "Brief",
          title: "Frame the learning objective",
          body: `This ${selectedModule.format.toLowerCase()} turns ${selectedModule.skillFocus.toLowerCase()} into a guided practice sequence inside ${learner.data?.activeJourney.title}.`,
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
          body: `Write the action you want to demonstrate before ${learner.data?.nextCoachingSession.title ?? "your next coaching session"}.`,
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
  const currentLessonPage = currentStagePages[Math.min(lessonPageIndex, Math.max(currentStagePages.length - 1, 0))] ?? null;
  const onLastLessonPage = currentStagePages.length === 0 || lessonPageIndex >= currentStagePages.length - 1;
  const applicationQuestions = presentation?.applicationActivity.questions ?? [];
  const applicationAnsweredCount = applicationQuestions.filter((question) => applicationAnswers[question.id]).length;
  const applicationScore = applicationQuestions.filter((question) => applicationAnswers[question.id] === question.correctOptionId).length;
  const applicationPassed = applicationSubmitted && applicationScore >= (presentation?.applicationActivity.passingScore ?? Number.MAX_SAFE_INTEGER);
  const totalSteps = Math.max(modules.length * Math.max(stages.length, 1), 1);
  const overallProgress = selectedModule ? Math.round((((moduleIndex * stages.length) + stageIndex + 1) / totalSteps) * 100) : 0;
  const canAdvance = currentStage?.id === "brief"
    ? confidence !== null && onLastLessonPage
    : currentStage?.id === "practice"
      ? practiceChoice !== null && onLastLessonPage
      : currentStage?.id === "apply"
        ? applicationPassed && onLastLessonPage
        : currentStage?.id === "reflect"
          ? reflection.trim().length >= 20
          : true;
  const atJourneyEnd = Boolean(selectedModule) && moduleIndex === modules.length - 1 && stageIndex === stages.length - 1;

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

  const gradeApplication = () => {
    if (applicationAnsweredCount !== applicationQuestions.length) {
      return;
    }
    setApplicationSubmitted(true);
  };

  const retryApplication = () => {
    setApplicationSubmitted(false);
  };

  return (
    <Surface>
      <SectionShell
        eyebrow="Interactive Training"
        title="Interactive training simulator"
        description="This view shows how CHCG and tenant-specific content are reformatted into a guided learning sequence with briefing, practice, live-work application, and reflection moments."
        actions={
          <>
            {tenantPicker}
            <Link href="/learner">
              <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">
                Back to learner
              </Button>
            </Link>
          </>
        }
      >
        {learner.isLoading || landing.isLoading ? <LoadingState /> : null}
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Modules in path" value={String(modules.length)} supporting={learner.data.activeJourney.title} icon={<BookOpen className="h-4 w-4" />} />
              <MetricCard label="Current module" value={`${moduleIndex + 1}/${modules.length}`} supporting={selectedModule.title} icon={<Target className="h-4 w-4" />} />
              <MetricCard label="Interactive progress" value={`${overallProgress}%`} supporting={`Stage ${stageIndex + 1} of ${stages.length}`} icon={<Sparkles className="h-4 w-4" />} />
              <MetricCard label="Mapped assets" value={String(supportingAssets.length)} supporting="CHCG and tenant materials blended into this lesson" icon={<Layers3 className="h-4 w-4" />} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              <PremiumCard>
                <CardHeader>
                  <CardTitle className="text-white">Training path outline</CardTitle>
                  <CardDescription className="text-slate-400">Each module is reformatted into a repeatable coaching-ready lesson structure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Competency gap</p>
                    <p className="mt-2 text-xl font-semibold text-white">{learner.data.activeJourney.competencyGap}</p>
                    <Progress value={learner.data.activeJourney.progress} className="mt-4 h-2 bg-white/8" />
                  </div>
                  {modules.map((module: any, index: number) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setModuleIndex(index)}
                      className={`w-full rounded-[1.6rem] border px-4 py-4 text-left transition ${index === moduleIndex ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/8"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{module.format}</p>
                          <h3 className="mt-2 text-lg font-medium text-white">{module.title}</h3>
                          <p className="mt-2 text-sm text-slate-300">{module.skillFocus}</p>
                        </div>
                        <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{module.durationMinutes} min</Badge>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                        <span>Completion</span>
                        <span>{module.completionRate}%</span>
                      </div>
                      <Progress value={module.completionRate} className="mt-2 h-2 bg-white/8" />
                    </button>
                  ))}
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
                      {stages.map((stage, index) => (
                        <div key={stage.id} className={`rounded-2xl border px-3 py-3 text-sm ${index === stageIndex ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-white/10 bg-white/5 text-slate-300"}`}>
                          <p className="font-medium">{stage.label}</p>
                          <p className="mt-1 text-xs text-slate-400">Step {index + 1}</p>
                        </div>
                      ))}
                    </div>

                    {currentStagePages.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-white/10 bg-white/5 px-4 py-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lesson page</p>
                            <p className="mt-1 text-sm text-slate-300">Page {lessonPageIndex + 1} of {currentStagePages.length} in this course section.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setLessonPageIndex((value) => Math.max(value - 1, 0))}
                              disabled={lessonPageIndex === 0}
                              className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                            >
                              Previous page
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setLessonPageIndex((value) => Math.min(value + 1, currentStagePages.length - 1))}
                              disabled={lessonPageIndex >= currentStagePages.length - 1}
                              className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                            >
                              Next page
                            </Button>
                          </div>
                        </div>
                        {currentLessonPage ? (
                          <div className="rounded-[1.8rem] border border-cyan-400/20 bg-cyan-400/10 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{currentLessonPage.eyebrow}</Badge>
                              <span className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">{currentLessonPage.visualTone}</span>
                            </div>
                            <h3 className="mt-4 text-2xl font-semibold text-white">{currentLessonPage.title}</h3>
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">{currentLessonPage.narrative}</p>
                            <div className="mt-6 grid gap-3 md:grid-cols-3">
                              {currentLessonPage.bullets.map((bullet) => (
                                <div key={bullet} className="rounded-[1.4rem] border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                                  <div className="flex items-start gap-3">
                                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
                                    <span>{bullet}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {currentStage?.id === "brief" ? (
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
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-sm leading-6 text-slate-300">Work through each presentation page, then set your confidence baseline before the rehearsal step unlocks.</p>
                          <div className="mt-4 flex flex-wrap gap-3">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Button
                                key={value}
                                type="button"
                                variant="outline"
                                onClick={() => setConfidence(value)}
                                className={`rounded-full border-white/12 ${confidence === value ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/12 hover:text-white"}`}
                              >
                                Confidence {value}
                              </Button>
                            ))}
                          </div>
                          {!onLastLessonPage ? <p className="mt-4 text-sm text-amber-300">Continue to the remaining lesson pages before this step unlocks.</p> : null}
                        </div>
                      </div>
                    ) : null}

                    {currentStage?.id === "practice" ? (
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
                        {!onLastLessonPage ? <p className="text-sm text-amber-300">Review each practice page before this step unlocks.</p> : null}
                      </div>
                    ) : null}

                    {currentStage?.id === "apply" ? (
                      <div className="space-y-4">
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Gated application activity</p>
                          <h4 className="mt-2 text-lg font-medium text-white">{presentation?.applicationActivity.title}</h4>
                          <p className="mt-3 text-sm leading-6 text-slate-300">{presentation?.applicationActivity.objective}</p>
                          <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                            <p className="text-sm leading-6 text-slate-100">{presentation?.applicationActivity.instructions}</p>
                            <p className="mt-2 text-sm text-cyan-100/80">Passing score: {presentation?.applicationActivity.passingScore}/{presentation?.applicationActivity.questions.length}</p>
                          </div>
                        </div>
                        <div className="grid gap-4">
                          {presentation?.applicationActivity.questions.map((question, questionIndex) => (
                            <div key={question.id} className="rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Application question {questionIndex + 1}</p>
                                {applicationSubmitted ? (
                                  applicationAnswers[question.id] === question.correctOptionId ? (
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
                              <h4 className="mt-3 text-lg font-medium text-white">{question.prompt}</h4>
                              <div className="mt-4 grid gap-3">
                                {question.options.map((option) => {
                                  const selected = applicationAnswers[question.id] === option.id;
                                  const isCorrect = option.id === question.correctOptionId;
                                  const stateClass = applicationSubmitted && selected
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
                                      onClick={() => {
                                        setApplicationSubmitted(false);
                                        setApplicationAnswers((value) => ({ ...value, [question.id]: option.id }));
                                      }}
                                      className={`rounded-[1.4rem] border p-4 text-left transition ${stateClass}`}
                                    >
                                      <p className="text-sm font-medium text-white">{option.label}</p>
                                      <p className="mt-2 text-sm leading-6 text-slate-300">{option.rationale}</p>
                                      {applicationSubmitted && selected ? (
                                        <p className={`mt-3 text-sm ${isCorrect ? "text-emerald-300" : "text-rose-300"}`}>
                                          {isCorrect ? question.successFeedback : question.failureFeedback}
                                        </p>
                                      ) : null}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">Assessment status</p>
                              <p className="mt-1 text-sm text-slate-300">{applicationAnsweredCount}/{applicationQuestions.length} questions answered.</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={retryApplication}
                                className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"
                              >
                                Retry
                              </Button>
                              <Button
                                type="button"
                                onClick={gradeApplication}
                                disabled={applicationAnsweredCount !== applicationQuestions.length || !onLastLessonPage}
                                className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-400"
                              >
                                Grade activity
                              </Button>
                            </div>
                          </div>
                          {applicationSubmitted ? (
                            <div className={`mt-4 rounded-2xl border p-4 ${applicationPassed ? "border-emerald-500/20 bg-emerald-500/10" : "border-rose-500/20 bg-rose-500/10"}`}>
                              <p className={`text-sm font-medium ${applicationPassed ? "text-emerald-200" : "text-rose-200"}`}>Score: {applicationScore}/{applicationQuestions.length}</p>
                              <p className={`mt-2 text-sm leading-6 ${applicationPassed ? "text-emerald-100" : "text-rose-100"}`}>
                                {applicationPassed ? presentation?.applicationActivity.passMessage : presentation?.applicationActivity.failMessage}
                              </p>
                            </div>
                          ) : null}
                          {!onLastLessonPage ? <p className="mt-4 text-sm text-amber-300">Finish the lesson page in this step before grading the activity.</p> : null}
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

                    {currentStage?.id === "reflect" ? (
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
                        <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                          <p className="text-sm leading-6 text-slate-300">Write the behavior you want your coach or manager to observe next.</p>
                          <textarea
                            value={reflection}
                            onChange={(event) => setReflection(event.target.value)}
                            rows={5}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                            placeholder="Example: I will shorten my verification phrasing, confirm the next action clearly, and document the outcome before ending the interaction."
                          />
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
                        {atJourneyEnd && canAdvance ? <span className="text-sm text-emerald-300">Training preview complete.</span> : null}
                        <Button
                          type="button"
                          onClick={advanceStage}
                          disabled={!canAdvance || atJourneyEnd}
                          className="rounded-full bg-white text-slate-950 hover:bg-slate-100 disabled:bg-white/20 disabled:text-slate-400"
                        >
                          {stageIndex === stages.length - 1 && moduleIndex < modules.length - 1 ? "Next module" : atJourneyEnd ? "Preview complete" : "Next step"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </PremiumCard>

                <PremiumCard>
                  <CardHeader>
                    <CardTitle className="text-white">Deep resources and transfer actions</CardTitle>
                    <CardDescription className="text-slate-400">The training now carries more of the underlying presentation substance into visible resources, coaching moves, and evidence-ready next actions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
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
                    <div className="grid gap-4 md:grid-cols-2">
                      {presentation?.resourceActions.map((resource) => (
                        <div key={resource.id} className="rounded-[1.6rem] border border-white/10 bg-slate-950/60 p-5">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Resource action</p>
                          <h4 className="mt-2 text-lg font-medium text-white">{resource.label}</h4>
                          <p className="mt-3 text-sm leading-6 text-slate-300">{resource.detail}</p>
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
  const landing = trpc.demo.landing.useQuery();
  const tenants = landing.data?.tenants ?? [];
  const initialTenantId = landing.data?.tenants?.[0]?.id ?? "atlas-operations";
  const [tenantId, setTenantId] = useState(initialTenantId);
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
  const [, setLocation] = useLocation();

  const library = trpc.demo.library.useQuery({ tenantId, role: roleFilter });
  const uploadMutation = trpc.demo.previewUploadContent.useMutation({
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

  const tenantPicker = useMemo(
    () => <TenantPicker tenants={tenants} tenantId={tenantId} setTenantId={setTenantId} />,
    [tenantId, tenants],
  );

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

  const selectedAsset = useMemo(
    () => assets.find((asset: any) => asset.id === selectedAssetId) ?? assets[0] ?? null,
    [assets, selectedAssetId],
  );

  function handleStartTraining(asset?: any) {
    const params = new URLSearchParams({ tenantId });
    if (asset?.id) params.set("assetId", asset.id);
    if (asset?.title) params.set("assetTitle", asset.title);
    setLocation(`/training?${params.toString()}`);
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
            {tenantPicker}
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
        {library.isLoading || landing.isLoading ? <LoadingState /> : null}
        {!library.isLoading && library.data ? (
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total assets" value={String(library.data.stats.totalAssets)} supporting="Visible under the current tenant, role, and search filters." icon={<Layers3 className="h-4 w-4" />} />
              <MetricCard label="CHCG core assets" value={String(library.data.stats.chcgAssets)} supporting="Sanitized CHCG methodology assets ready for reuse." icon={<BookOpen className="h-4 w-4" />} />
              <MetricCard label="Client imports" value={String(library.data.stats.importedAssets)} supporting="Tenant-scoped materials uploaded for this workspace." icon={<Building2 className="h-4 w-4" />} />
              <MetricCard label="Mapped journeys" value={String(library.data.stats.mappedJourneys)} supporting="Assets already connected to enablement journeys." icon={<Target className="h-4 w-4" />} />
            </div>

            <PremiumCard className="overflow-hidden">
              <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${library.data.branding.accent}, rgba(255,255,255,0.08))` }} />
              <CardContent className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border text-xl font-semibold text-white shadow-[0_20px_40px_rgba(8,15,30,0.35)]"
                    style={{ borderColor: `${library.data.branding.accent}55`, backgroundColor: `${library.data.branding.accent}22` }}
                  >
                    {library.data.branding.logoMark}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">White-label library view</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">{library.data.branding.preferredLabel}</h2>
                    <p className="max-w-2xl text-sm leading-6 text-slate-300">{library.data.branding.heroStatement}</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm text-slate-300">
                  <p className="font-medium text-white">Tenant-safe presentation</p>
                  <p className="mt-1">Imported assets inherit this tenant context while CHCG core materials remain visibly labeled as shared methodology content.</p>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <CardTitle className="text-white">Track explorer</CardTitle>
                      <CardDescription className="text-slate-400">Filter by CHCG learning track and role relevance to inspect how methodology assets and client imports align.</CardDescription>
                    </div>
                    <label className="block max-w-xl space-y-2 text-sm text-slate-200">
                      <span>Search assets</span>
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none placeholder:text-slate-500"
                        placeholder="Search by title, category, tag, or source label"
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[{ value: "all", label: "All roles" }, { value: "executive", label: "Executive" }, { value: "manager", label: "Manager" }, { value: "learner", label: "Learner" }, { value: "client_admin", label: "Client admin" }].map((option) => (
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
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTrackFilter("all")}
                    className={`h-auto rounded-3xl border-white/10 px-4 py-4 text-left ${trackFilter === "all" ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                  >
                    <div>
                      <p className="text-sm font-semibold">All tracks</p>
                      <p className={`mt-1 text-xs leading-5 ${trackFilter === "all" ? "text-slate-700" : "text-slate-300"}`}>See the full blended library.</p>
                    </div>
                  </Button>
                  {library.data.tracks.map((track: any) => (
                    <Button
                      key={track.id}
                      type="button"
                      variant="outline"
                      onClick={() => setTrackFilter(track.id)}
                      className={`h-auto rounded-3xl border-white/10 px-4 py-4 text-left ${trackFilter === track.id ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{track.title}</p>
                        <p className={`mt-1 text-xs leading-5 ${trackFilter === track.id ? "text-slate-700" : "text-slate-300"}`}>{track.summary}</p>
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
                      <Button type="button" onClick={() => handleStartTraining(selectedAsset)} className="rounded-full bg-white px-5 text-slate-950 hover:bg-slate-100">
                        Start training from this asset
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={`rounded-full ${selectedAsset.sourceKind === "chcg" ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-200" : "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"}`}>{selectedAsset.sourceKind === "chcg" ? "CHCG asset" : "Client upload"}</Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedAsset.format}</Badge>
                      <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedAsset.category}</Badge>
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-white">{selectedAsset.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{selectedAsset.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedAsset.tags.map((tag: string) => (
                        <span key={`selected-${selectedAsset.id}-${tag}`} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-300">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Training use</p>
                      <p className="mt-2 text-white">This asset can be framed as lesson context, practice language, or reflection evidence inside the training simulator.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Source label</p>
                      <p className="mt-2 text-white">{selectedAsset.sourceLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-slate-300 sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Role relevance</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedAsset.linkedRoles.map((linked: string) => (
                          <Badge key={`selected-role-${selectedAsset.id}-${linked}`} variant="outline" className="rounded-full border-white/10 bg-slate-950/60 text-slate-200">
                            {linked === "all" ? "All roles" : linked.replaceAll("_", " ")}
                          </Badge>
                        ))}
                      </div>
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
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">

                  {assets.map((asset: any) => (
                    <PremiumCard key={asset.id} className={`h-full transition-all ${selectedAsset?.id === asset.id ? "ring-1 ring-white/30" : ""}`}>
                      <CardHeader className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`rounded-full ${asset.sourceKind === "chcg" ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-200" : "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"}`}>{asset.sourceKind === "chcg" ? "CHCG asset" : "Client upload"}</Badge>
                          <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{asset.format}</Badge>
                          <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{asset.category}</Badge>
                        </div>
                        <div className="space-y-2">
                          <CardTitle className="text-xl text-white">{asset.title}</CardTitle>
                          <CardDescription className="text-sm leading-6 text-slate-300">{asset.summary}</CardDescription>
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
                        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                          {asset.tags.map((tag: string) => (
                            <span key={`${asset.id}-${tag}`} className="rounded-full border border-white/10 bg-white/6 px-3 py-1">#{tag}</span>
                          ))}
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
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
        <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
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

function ReviewLogComposer({
  tenantId,
  subjectUserId,
  authorRole,
  onCreated,
  title,
}: {
  tenantId: string;
  subjectUserId: string;
  authorRole: "manager" | "executive" | "client_admin";
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
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-sm leading-6 text-slate-400">Capture one-on-ones, quarterly reviews, and annual summaries while the platform keeps learning evidence attached.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Review type</span>
          <Select value={reviewType} onValueChange={(value) => setReviewType(value as "one_on_one" | "quarterly_check_in" | "annual_review")}>
            <SelectTrigger className="border-white/10 bg-slate-950/80 text-slate-100">
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
          <input value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Documentation notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Next step</span>
          <input value={nextStep} onChange={(event) => setNextStep(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
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
        <CardDescription className="text-slate-400">{description}</CardDescription>
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
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

function ManagerPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active signals" value={`${data.openSignals.length}`} supporting="Live KPI and QA feed requiring attention" icon={<CircleAlert className="h-4 w-4" />} />
        <MetricCard label="Open interventions" value={`${data.interventions.length}`} supporting="Workflow actions assigned from rule triggers" icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Coaching follow-ups" value={`${data.coachingSessions.length}`} supporting="Structured sessions with action plans and reminders" icon={<Users2 className="h-4 w-4" />} />
        <MetricCard label="Direct report readiness" value={`${data.directReport.readinessScore}`} supporting={data.directReport.name} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
        <PremiumCard>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-white">AI coaching suggestion</CardTitle>
                <CardDescription className="text-slate-400">Explainable rationale with human override.</CardDescription>
              </div>
              <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">Override enabled</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-sm font-medium text-blue-100">{data.aiSuggestion.summary}</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{data.aiSuggestion.recommendation}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Why this was suggested</p>
              {data.aiSuggestion.rationale.map((reason: any) => (
                <div key={reason} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 p-3 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100">Approve guidance</Button>
              <Button variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white">Override suggestion</Button>
            </div>
          </CardContent>
        </PremiumCard>
      </div>
      <Tabs defaultValue="interventions" className="space-y-4">
        <TabsList className="w-full justify-start rounded-full border border-white/10 bg-white/5 p-1 text-slate-300">
          <TabsTrigger value="interventions" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Interventions</TabsTrigger>
          <TabsTrigger value="coaching" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Coaching log</TabsTrigger>
          <TabsTrigger value="documentation" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Documentation</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-950">Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="interventions" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
        <TabsContent value="coaching" className="grid gap-4 lg:grid-cols-2">
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
        </TabsContent>
        <TabsContent value="documentation" className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
        <TabsContent value="notifications" className="grid gap-4 lg:grid-cols-2">
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

function LearnerPanel({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Readiness score" value={`${data.learner.readinessScore}`} supporting={data.learner.title} icon={<Gauge className="h-4 w-4" />} />
        <MetricCard label="Journey progress" value={`${data.activeJourney.progress}%`} supporting={data.activeJourney.title} icon={<BookOpen className="h-4 w-4" />} />
        <MetricCard label="Assigned interventions" value={`${data.assignedInterventions.length}`} supporting="Skill-gap actions linked to manager workflows" icon={<Target className="h-4 w-4" />} />
        <MetricCard label="Next coaching milestone" value={new Date(data.nextCoachingSession.dueDate).toLocaleDateString()} supporting={data.nextCoachingSession.title} icon={<Bell className="h-4 w-4" />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Active enablement journey</CardTitle>
              <CardDescription className="text-slate-400">Role-based learning mapped directly to your skill gap across Service Foundations and Workflow Precision tracks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Link href="/training">
                  <Button className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
                    Launch interactive training
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
                {data.activeJourney.modules.map((module: any) => (
                  <div key={module.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{module.format}</p>
                        <h4 className="mt-2 text-lg font-medium text-white">{module.title}</h4>
                        <p className="mt-2 text-sm text-slate-300">Skill focus: {module.skillFocus}</p>
                      </div>
                      <Badge className="rounded-full border-white/10 bg-white/8 text-slate-200">{module.durationMinutes} min</Badge>
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
                        <span>Completion</span>
                        <span>{module.completionRate}%</span>
                      </div>
                      <Progress value={module.completionRate} className="h-2 bg-white/8" />
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
              <CardTitle className="text-white">Assigned interventions</CardTitle>
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
                      <div key={action} className="flex items-start gap-2">
                        <ChevronRight className="mt-0.5 h-4 w-4 text-slate-500" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </PremiumCard>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tenant" value={data.tenant.name} supporting={data.tenant.industry} icon={<Building2 className="h-4 w-4" />} />
        <MetricCard label="Role users" value={`${data.tenantUsers.length}`} supporting="Strictly tenant-scoped account inventory" icon={<Users2 className="h-4 w-4" />} />
        <MetricCard label="Brand accent" value={data.branding.accent} supporting={data.branding.preferredLabel} icon={<Sparkles className="h-4 w-4" />} />
        <MetricCard label="Isolation mode" value="Strict" supporting={data.branding.dataIsolation} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
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

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
import { Link } from "wouter";

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
        <PremiumCard>
          <CardHeader>
            <CardTitle className="text-white">Documentation generated from learning and interventions</CardTitle>
            <CardDescription className="text-slate-400">Executives can review evidence trails produced automatically from enablement activity across service, workflow, leadership, and coaching programs.</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentationFeed entries={data.documentationEntries} />
          </CardContent>
        </PremiumCard>
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
        <TabsContent value="interventions" className="grid gap-4 lg:grid-cols-2">
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
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Auto-generated learning documentation</CardTitle>
              <CardDescription className="text-slate-400">Completion evidence from Service Foundations, Workflow Precision, and intervention activity is automatically assembled for coaching use.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentationFeed entries={data.documentationEntries} />
            </CardContent>
          </PremiumCard>
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

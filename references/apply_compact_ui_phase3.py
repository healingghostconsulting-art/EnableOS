from pathlib import Path

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()

landing_replacement = '''export function LandingView() {
  const landing = trpc.demo.landing.useQuery();
  const viewer = trpc.auth.me.useQuery();
  const viewerAccess = trpc.demo.viewerAccess.useQuery(undefined, { enabled: Boolean(viewer.data) });
  const featuredTenants = landing.data?.tenants ?? [];
  const [landingSearchQuery, setLandingSearchQuery] = useState("");
  const [missionHubMode, setMissionHubMode] = useState<"overview" | "workspaces" | "tracks">("overview");
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
        title: "Unlocking the Power of Data",
        subtitle: "KPI interpretation, trend review, and decision-quality leadership.",
        keywords: ["executive", "leadership", "data", "kpi"],
        href: "/training?role=executive",
        cta: "Open executive-aligned training",
      },
      {
        title: "Real-time Coaching",
        subtitle: "In-the-moment coaching responses, reinforcement, and follow-through cues.",
        keywords: ["manager", "coaching", "feedback", "leadership"],
        href: "/training?role=manager",
        cta: "Open coaching module",
      },
      {
        title: "Utilizing Performance to Maximize Performance",
        subtitle: "Calibration, improvement planning, and performance accountability rhythms.",
        keywords: ["manager", "performance", "calibration", "reviews"],
        href: "/training?role=manager",
        cta: "Open performance training",
      },
      {
        title: "Engagement and Empowering",
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
  const landingMetricHighlights = landing.data?.featuredMetrics ?? [
    { label: "Ready to launch", value: 12 },
    { label: "Due this week", value: 4 },
    { label: "Avg. progress", value: "61%" },
    { label: "In coaching", value: 9 },
  ];
  const compactMissionQueue = landingSearchQuery.trim() ? landingSearchResults : landingTrainingRecords.slice(0, 6);
  const compactWorkspaceCards = featuredTenants.slice(0, 4);

  return (
    <Surface>
      <div className="workspace-stack">
        <div className="glass-panel energy-frame overflow-hidden rounded-[2.2rem] border border-[#1B303C]/10 bg-white shadow-[0_28px_90px_rgba(27,48,60,0.12)]">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)] lg:px-6 lg:py-6 xl:px-7 xl:py-7">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="outline" className="mission-chip rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.28em]">
                  EnableOS mission hub
                </Badge>
                <span className="command-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#4A6373]">Search-first entry</span>
                <span className="command-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#4A6373]">Compact rows</span>
                <span className="command-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-[#4A6373]">Fewer scroll jumps</span>
              </div>
              <div className="max-w-4xl space-y-3">
                <h1 className="max-w-[15ch] text-[2.35rem] font-semibold tracking-tight text-[#1B303C] md:text-[3.05rem] md:leading-[1.02] xl:text-[3.4rem]">
                  Show more actionable training in one screen.
                </h1>
                <p className="max-w-3xl text-[0.98rem] leading-7 text-[#4A6373]">
                  This compact mission hub keeps real training, workspace entry, and next-action signals above the fold so users can browse, choose, and launch without crossing long explanatory sections first.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                <label className="block min-w-0 space-y-2 text-sm text-[#1B303C]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Search mission hub</span>
                  <div className="flex items-center gap-3 rounded-[1.35rem] border border-[#1B303C]/10 bg-[#F7F8FA] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                    <Search className="h-4 w-4 text-[#4A6373]" />
                    <input
                      value={landingSearchQuery}
                      onChange={(event) => setLandingSearchQuery(event.target.value)}
                      placeholder="Search data, coaching, QA, learner, manager..."
                      className="w-full bg-transparent text-sm text-[#1B303C] outline-none placeholder:text-[#6B7E8A]"
                    />
                  </div>
                </label>
                <Link href={viewer.data ? "/learner" : "/login"}>
                  <Button className="h-12 rounded-[1.25rem] bg-[#1B303C] px-5 text-white hover:bg-[#243f4d]">
                    {viewer.data ? "Resume my mission" : "Launch next"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/training">
                  <Button variant="outline" className="h-12 rounded-[1.25rem] border-[#1B303C]/12 bg-white px-5 text-[#1B303C] hover:bg-[#FCBC34]/10 hover:text-[#1B303C]">
                    Preview player
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {landingMetricHighlights.map((item: any) => (
                <div key={item.label} className="rounded-[1.3rem] border border-[#1B303C]/8 bg-[linear-gradient(160deg,rgba(27,48,60,0.98),rgba(23,37,47,0.96))] px-4 py-4 text-white shadow-[0_18px_48px_rgba(27,48,60,0.16)]">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-[1.7rem] font-semibold tracking-tight">{String(item.value)}</p>
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
                  <Link key={tenant.id} href="/learner">
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
'''

library_replacement = '''export function ContentLibraryView() {
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
                <p className="mt-2 leading-6">This launch keeps the learner in a contained player with visible progress, persistent outline, and fewer surrounding distractions.</p>
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
'''


def replace_between(source: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = source.index(start_marker)
    end = source.index(end_marker, start)
    return source[:start] + replacement + "\n\n" + source[end:]

text = replace_between(text, 'export function LandingView() {', 'export function ReportingWorkspaceView() {', landing_replacement)
text = replace_between(text, 'export function ContentLibraryView() {', 'export function ChcgAdminView() {', library_replacement)
path.write_text(text)
print('updated compact UI phase 3 surfaces')

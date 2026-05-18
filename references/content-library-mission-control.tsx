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

  const groupedAssets = useMemo(() => groupAssetsByTargetDemographic(assets), [assets]);
  const selectedAsset = useMemo(() => assets.find((asset: any) => asset.id === selectedAssetId) ?? assets[0] ?? null, [assets, selectedAssetId]);
  const selectedAssetRoleOptions = useMemo(() => selectedAsset ? resolveSelectedAssetWorkflowRoles(selectedAsset.linkedRoles) : [], [selectedAsset]);
  const selectedAssetWorkflowBrief = useMemo(() => getOperationalLaunchReadinessBrief(selectedAssetRole), [selectedAssetRole]);
  const launchSummaryCards = useMemo(
    () => [
      {
        label: "Visible assets",
        value: String(library.data?.stats.totalAssets ?? 0),
        support: "Filtered by tenant, role, and search intent.",
      },
      {
        label: "Selected lane",
        value: roleFilter === "all" ? "All roles" : getRoleLabel(roleFilter),
        support: "Use role lenses to reduce noise before launching training.",
      },
      {
        label: "Focus track",
        value: trackFilter === "all" ? "All tracks" : library.data?.tracks.find((track: any) => track.id === trackFilter)?.title ?? "All tracks",
        support: "Pinned to the current methodology stream.",
      },
    ],
    [library.data?.stats.totalAssets, library.data?.tracks, roleFilter, trackFilter],
  );

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

  const jumpToLibraryMode = (mode: "launcher" | "explore" | "ingest", sectionId: string) => {
    setLibraryMode(mode);
    window.setTimeout(() => revealWorkspaceSection(sectionId), 20);
  };

  return (
    <Surface>
      <SectionShell
        eyebrow="Content Library"
        title="CHCG methodology assets and tenant-scoped imports"
        description="Move from discovery to launch to upload through guided library modes instead of scrolling through one long content catalog."
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
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
              <PremiumCard className="overflow-hidden">
                <CardContent className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <div className="rounded-[2rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.18),transparent_38%),linear-gradient(135deg,rgba(7,31,54,0.96),rgba(15,23,42,0.98))] p-6 shadow-[0_28px_85px_rgba(8,15,35,0.3)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border-cyan-200/25 bg-cyan-300/16 text-cyan-50">Content mission control</Badge>
                      <Badge variant="outline" className="rounded-full border-white/14 bg-slate-950/30 text-slate-50">{library.data.branding.preferredLabel}</Badge>
                      <Badge variant="outline" className="rounded-full border-white/14 bg-slate-950/30 text-slate-50">{assetView === "all" ? "Blended view" : assetView === "chcg" ? "CHCG core" : "Client imports"}</Badge>
                    </div>
                    <div className="mt-5 max-w-3xl">
                      <p className="text-sm uppercase tracking-[0.24em] text-cyan-50">Guided library flow</p>
                      <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">Find the right asset, launch it fast, and only open deeper controls when you need them.</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-50">The library now force-feeds discovery, workflow handoff, and ingestion as separate modes so users stop getting lost inside long catalog pages.</p>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {launchSummaryCards.map((card) => (
                        <div key={card.label} className="rounded-2xl border border-white/12 bg-slate-950/68 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">{card.label}</p>
                          <p className="mt-2 text-xl font-semibold text-white">{card.value}</p>
                          <p className="mt-1 text-xs text-slate-300">{card.support}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div className="rounded-[1.8rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(15,23,42,0.9))] p-5 shadow-[0_22px_60px_rgba(8,15,35,0.24)]">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">What matters now</p>
                      <h4 className="mt-3 text-xl font-semibold text-white">Use a role lens first, then select one asset and launch from the detail panel instead of scanning every card equally.</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-100">This redesign keeps the catalog searchable, but turns the workflow into a tighter launch deck with fewer vertical interruptions.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => jumpToLibraryMode("explore", "library-explore-mode")} className="guide-card min-w-0 p-4 text-left transition hover:-translate-y-0.5">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recommended next</p>
                        <p className="mt-2 text-base font-semibold text-white">Open asset explorer</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">Filter by role, track, and source until you have one clear launch candidate.</p>
                      </button>
                      <button type="button" onClick={() => jumpToLibraryMode("ingest", "library-ingest-mode")} className="guide-card min-w-0 p-4 text-left transition hover:-translate-y-0.5">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Upload lane</p>
                        <p className="mt-2 text-base font-semibold text-white">Add a tenant-specific asset</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">Bring in client materials without diluting CHCG source clarity or role mapping.</p>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </PremiumCard>

              <div className="command-band px-4 py-4 md:px-5">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6B7E8A]">Library cues</p>
                    <p className="mt-2 text-sm leading-6 text-[#4A6373]">Assets stay tenant-safe, role-aware, and launch-ready. Each mode reveals just enough information to move forward confidently.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.35rem] border border-[#1B303C]/10 bg-white/70 px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">CHCG core assets</p>
                      <p className="mt-2 text-sm font-semibold text-[#1B303C]">{library.data.stats.chcgAssets}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#1B303C]/10 bg-white/70 px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">Client imports</p>
                      <p className="mt-2 text-sm font-semibold text-[#1B303C]">{library.data.stats.importedAssets}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#1B303C]/10 bg-white/70 px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">Mapped journeys</p>
                      <p className="mt-2 text-sm font-semibold text-[#1B303C]">{library.data.stats.mappedJourneys}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#1B303C]/10 bg-white/70 px-4 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#6B7E8A]">Search state</p>
                      <p className="mt-2 text-sm font-semibold text-[#1B303C]">{searchQuery.trim().length > 0 ? "Focused" : "Open"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard label="Total assets" value={String(library.data.stats.totalAssets)} supporting="Visible under the current tenant, role, and search filters." icon={<Layers3 className="h-4 w-4" />} />
              <MetricCard label="CHCG core assets" value={String(library.data.stats.chcgAssets)} supporting="Sanitized CHCG methodology assets ready for reuse." icon={<BookOpen className="h-4 w-4" />} />
              <MetricCard label="Client imports" value={String(library.data.stats.importedAssets)} supporting="Tenant-scoped materials uploaded for this workspace." icon={<Building2 className="h-4 w-4" />} />
              <MetricCard label="Mapped journeys" value={String(library.data.stats.mappedJourneys)} supporting="Assets already connected to enablement journeys." icon={<Target className="h-4 w-4" />} />
            </div>

            <Tabs value={libraryMode} onValueChange={(value) => setLibraryMode(value as "launcher" | "explore" | "ingest")} className="space-y-4">
              <div className="command-band px-4 py-4 md:px-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6B7E8A]">Library modes</p>
                    <p className="mt-2 text-sm leading-6 text-[#4A6373]">Switch between launcher, explore, and ingest instead of moving through one long catalog-and-upload page.</p>
                  </div>
                  <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.4rem] border border-[#1B303C]/10 bg-white/70 p-2 xl:w-auto">
                    <TabsTrigger value="launcher" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Launcher</TabsTrigger>
                    <TabsTrigger value="explore" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Explore</TabsTrigger>
                    <TabsTrigger value="ingest" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-[#1B303C] data-[state=active]:text-white">Ingest</TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value="launcher" className="mt-0 space-y-6" id="library-launcher-mode">
                {selectedAsset ? (
                  <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                    <PremiumCard>
                      <CardHeader className="space-y-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <CardTitle className="text-white">Selected asset workflow handoff</CardTitle>
                            <CardDescription className="text-slate-400">Inspect one asset deeply, then launch the right training view without leaving the library.</CardDescription>
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
                      <CardContent className="space-y-5">
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
                        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4.5 text-[15px] leading-7 text-slate-300">
                          <p><span className="text-slate-500">Source</span> · {selectedAsset.sourceLabel}</p>
                          <p className="mt-2"><span className="text-slate-500">Created</span> · {new Date(selectedAsset.createdAt).toLocaleDateString()}</p>
                        </div>
                      </CardContent>
                    </PremiumCard>
                    <PremiumCard>
                      <CardHeader>
                        <CardTitle className="text-white">Operational launch readiness brief</CardTitle>
                        <CardDescription className="text-slate-400">Choose the receiving role and see how this asset should be introduced.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-[15px] leading-7 text-slate-100 sm:col-span-2">
                          <p className="text-[12px] uppercase tracking-[0.2em] text-cyan-100/75">Launch brief</p>
                          <h4 className="mt-2.5 text-lg font-medium text-white">{selectedAssetWorkflowBrief.title}</h4>
                          <p className="mt-3 text-sm leading-6 text-slate-100">Use the role chips to align this handoff with the exact workspace lens that should receive the asset first.</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedAssetRoleOptions.map((linkedRole) => (
                              <Button key={`selected-role-${selectedAsset.id}-${linkedRole}`} type="button" variant="outline" onClick={() => setSelectedAssetRole(linkedRole)} className={`rounded-full px-4 py-2 text-sm ${selectedAssetRole === linkedRole ? "border-white bg-white text-slate-950 hover:bg-slate-100" : "border-white/10 bg-slate-950/55 text-slate-200 hover:bg-white/10 hover:text-white"}`}>
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
                      </CardContent>
                    </PremiumCard>
                  </div>
                ) : (
                  <PremiumCard>
                    <CardContent className="py-12 text-center text-slate-300">
                      Select an asset in Explore mode to activate the launcher panel.
                    </CardContent>
                  </PremiumCard>
                )}
              </TabsContent>

              <TabsContent value="explore" className="mt-0 space-y-6" id="library-explore-mode">
                <PremiumCard>
                  <CardHeader className="space-y-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-[1.65rem] text-white">Track explorer</CardTitle>
                        <CardDescription className="max-w-3xl text-base leading-7 text-slate-400">Filter by role, track, and source so users see only the asset lanes that matter before they drill down.</CardDescription>
                      </div>
                      <label className="block w-full max-w-xl space-y-2 text-[15px] text-slate-200">
                        <span>Search assets</span>
                        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className={FORM_INPUT_SURFACE_CLASS} placeholder="Search by title, category, tag, or source label" />
                      </label>
                    </div>
                    <div className="flex max-w-4xl flex-wrap gap-2.5">
                      {[{ value: "all", label: "All roles" }, { value: "executive", label: "Executive" }, { value: "manager", label: "Manager" }, { value: "coach", label: "Coach / Supervisor" }, { value: "learner", label: "Learner" }, { value: "client_admin", label: "Client admin" }].map((option) => (
                        <Button key={option.value} type="button" variant="outline" onClick={() => setRoleFilter(option.value as DemoRole | "all")} className={`rounded-full border-white/10 ${roleFilter === option.value ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}>
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                      <Button type="button" variant="outline" onClick={() => setTrackFilter("all")} className={`h-auto rounded-3xl border-white/10 px-5 py-4 text-left ${trackFilter === "all" ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}>
                        <div>
                          <p className="text-base font-semibold leading-6">All tracks</p>
                          <p className={`mt-2 text-sm leading-6 ${trackFilter === "all" ? "text-slate-700" : "text-slate-300"}`}>See the full blended library.</p>
                        </div>
                      </Button>
                      {library.data.tracks.map((track: any) => (
                        <Button key={track.id} type="button" variant="outline" onClick={() => setTrackFilter(track.id)} className={`h-auto rounded-3xl border-white/10 px-5 py-4 text-left ${trackFilter === track.id ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-white/6 text-white hover:bg-white/10 hover:text-white"}`}>
                          <div>
                            <p className="text-base font-semibold leading-6">{track.title}</p>
                            <p className={`mt-2 text-sm leading-6 ${trackFilter === track.id ? "text-slate-700" : "text-slate-300"}`}>{track.summary}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardHeader>
                </PremiumCard>

                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <Tabs value={assetView} onValueChange={(value) => setAssetView(value as "all" | "chcg" | "imported")} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 rounded-3xl border border-white/10 bg-white/6 p-1">
                      <TabsTrigger value="all" className="rounded-[1.2rem] data-[state=active]:bg-white data-[state=active]:text-slate-950">Blended library</TabsTrigger>
                      <TabsTrigger value="chcg" className="rounded-[1.2rem] data-[state=active]:bg-white data-[state=active]:text-slate-950">CHCG core</TabsTrigger>
                      <TabsTrigger value="imported" className="rounded-[1.2rem] data-[state=active]:bg-white data-[state=active]:text-slate-950">Client imports</TabsTrigger>
                    </TabsList>
                    <TabsContent value={assetView} className="mt-0">
                      <PremiumCard>
                        <CardHeader>
                          <CardTitle className="text-white">Audience groups</CardTitle>
                          <CardDescription className="text-slate-400">Choose one asset from a grouped audience lane to preview it in the launcher.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[880px] space-y-5 overflow-auto pr-1">
                          {groupedAssets.length > 0 ? groupedAssets.map((group) => (
                            <div key={group.id} className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-base font-semibold text-white">{group.title}</p>
                                  <p className="mt-1 text-sm leading-6 text-slate-300">{group.description}</p>
                                </div>
                                <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">{group.assets.length}</Badge>
                              </div>
                              <div className="space-y-2">
                                {group.assets.map((asset: any) => (
                                  <button key={asset.id} type="button" onClick={() => { setSelectedAssetId(asset.id); setLibraryMode("launcher"); }} className={`flex w-full items-start justify-between rounded-2xl border px-4 py-4 text-left transition ${selectedAsset?.id === asset.id ? "border-cyan-400/30 bg-cyan-400/12" : "border-white/10 bg-slate-950/50 hover:bg-white/8"}`}>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white">{asset.title}</p>
                                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-300">{asset.summary}</p>
                                    </div>
                                    <ChevronRight className="ml-3 h-4 w-4 shrink-0 text-slate-500" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )) : (
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-slate-300">
                              No assets match the current search, track, and role filters yet.
                            </div>
                          )}
                        </CardContent>
                      </PremiumCard>
                    </TabsContent>
                  </Tabs>

                  <div className="space-y-6">
                    {selectedAsset ? (
                      <PremiumCard>
                        <CardHeader>
                          <CardTitle className="text-white">Active selection</CardTitle>
                          <CardDescription className="text-slate-400">The side panel keeps detail close without forcing a separate full-page scroll.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`rounded-full ${selectedAsset.sourceKind === "chcg" ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-200" : "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"}`}>{selectedAsset.sourceKind === "chcg" ? "CHCG asset" : "Client upload"}</Badge>
                            <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedAsset.format}</Badge>
                            <Badge variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{selectedAsset.category}</Badge>
                          </div>
                          <div>
                            <h3 className="text-2xl font-semibold leading-tight text-white">{selectedAsset.title}</h3>
                            <p className="mt-3 text-sm leading-7 text-slate-300">{selectedAsset.summary}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedAsset.linkedRoles.map((linked: string) => (
                              <Badge key={`${selectedAsset.id}-${linked}`} variant="outline" className="rounded-full border-white/10 bg-white/5 text-slate-300">
                                {linked === "all" ? "All roles" : linked.replaceAll("_", " ")}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2.5 text-sm text-slate-300">
                            {selectedAsset.tags.map((tag: string) => (
                              <span key={`${selectedAsset.id}-${tag}`} className="rounded-full border border-white/10 bg-white/6 px-3.5 py-1.5">#{tag}</span>
                            ))}
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                            <p><span className="text-slate-500">Source</span> · {selectedAsset.sourceLabel}</p>
                            <p className="mt-2"><span className="text-slate-500">Created</span> · {new Date(selectedAsset.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" onClick={() => setLibraryMode("launcher")} className="rounded-full bg-white px-4 text-slate-950 hover:bg-slate-100">Open launcher</Button>
                            <Button type="button" variant="outline" onClick={() => handleStartTraining(selectedAsset)} className="rounded-full border-white/10 bg-white/6 text-white hover:bg-white/10 hover:text-white">
                              Start training
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            {selectedAsset.fileUrl ? (
                              <a href={selectedAsset.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-white/10 hover:text-cyan-100">
                                Open stored asset
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </a>
                            ) : null}
                          </div>
                        </CardContent>
                      </PremiumCard>
                    ) : null}
                    <WorkflowLibraryPanel
                      title="Blended workflow library governance"
                      description="Client admins and operators can still see how tenant-uploaded materials are mixed with CHCG assets across journeys, interventions, and documentation support."
                      resources={[
                        ...(library.data.importedAssets ?? []),
                        ...(library.data.chcgAssets ?? []),
                      ].filter((asset: any, index: number, collection: any[]) => collection.findIndex((candidate: any) => candidate.id === asset.id) === index).slice(0, 4)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ingest" className="mt-0 grid gap-6 xl:grid-cols-[1.06fr_0.94fr]" id="library-ingest-mode">
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
                          <input value={title} onChange={(event) => setTitle(event.target.value)} required className={FORM_INPUT_SURFACE_CLASS} placeholder="New hire workflow deck" />
                        </label>
                        <label className="space-y-2 text-sm text-slate-200">
                          <span>Category</span>
                          <input value={category} onChange={(event) => setCategory(event.target.value)} required className={FORM_INPUT_SURFACE_CLASS} placeholder="Operational execution" />
                        </label>
                      </div>
                      <label className="space-y-2 text-sm text-slate-200">
                        <span>Summary</span>
                        <textarea value={summary} onChange={(event) => setSummary(event.target.value)} required rows={4} className={`min-h-[120px] ${FORM_INPUT_SURFACE_CLASS}`} placeholder="Describe how this material supports coaching, readiness, or documentation workflows." />
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
                          <input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} required className={FORM_INPUT_SURFACE_CLASS} placeholder="Client enablement team" />
                        </label>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm text-slate-200">
                          <span>Tags</span>
                          <input value={tags} onChange={(event) => setTags(event.target.value)} className={FORM_INPUT_SURFACE_CLASS} placeholder="workflow, qa, launch" />
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

                <div className="space-y-6">
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
                  <PremiumCard>
                    <CardHeader>
                      <CardTitle className="text-white">Ingestion checklist</CardTitle>
                      <CardDescription className="text-slate-400">A compact preflight so uploads remain consistent and immediately usable.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm leading-6 text-slate-300">
                      <div className="rounded-2xl border border-white/10 bg-white/6 p-4">Name the asset clearly and assign one primary audience first.</div>
                      <div className="rounded-2xl border border-white/10 bg-white/6 p-4">Use tags that match how coaches and managers actually search inside missions.</div>
                      <div className="rounded-2xl border border-white/10 bg-white/6 p-4">Keep the source label explicit so imported material never looks like native CHCG methodology.</div>
                    </CardContent>
                  </PremiumCard>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </SectionShell>
    </Surface>
  );
}

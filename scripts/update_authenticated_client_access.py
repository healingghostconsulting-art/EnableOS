from pathlib import Path

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()

replacements = [
    (
        '''export function RoleWorkspace({ role }: { role: DemoRole }) {
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
    coach: trpc.demo.coach.useQuery({ tenantId }),
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
        {!query.isLoading && role === "coach" && query.data ? <CoachPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
        {!query.isLoading && role === "learner" && query.data ? <LearnerPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
        {!query.isLoading && role === "client_admin" && query.data ? <AdminPanel data={query.data} onUpdated={refreshWorkspace} /> : null}
      </SectionShell>
    </Surface>
  );
}
''',
        '''export function RoleWorkspace({ role }: { role: DemoRole }) {
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
'''
    ),
    (
        '''export function TrainingExperienceView() {
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
''',
        '''export function TrainingExperienceView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const [location] = useLocation();
  const queryParams = useMemo(() => {
    if (typeof window === "undefined") {
      return new URLSearchParams();
    }
    return new URLSearchParams(window.location.search);
  }, [location]);
  const requestedAssetId = queryParams.get("assetId");
  const requestedAssetTitle = queryParams.get("assetTitle");
  const learner = trpc.demo.secureTraining.useQuery(tenantId ? { tenantId } : {}, { enabled: Boolean(tenantId) });
'''
    ),
    (
        '''  useEffect(() => {
    if (requestedTenantId && requestedTenantId !== tenantId) {
      setTenantId(requestedTenantId);
    }
  }, [requestedTenantId, tenantId]);

''',
        ''
    ),
    (
        '''  const tenantPicker = useMemo(
    () => <TenantPicker tenants={tenants} tenantId={tenantId} setTenantId={setTenantId} />,
    [tenantId, tenants],
  );

''',
        ''
    ),
    (
        '''        actions={
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
''',
        '''        actions={
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
'''
    ),
    (
        '''export function ContentLibraryView() {
  const landing = trpc.demo.landing.useQuery();
  const tenants = landing.data?.tenants ?? [];
  const initialTenantId = landing.data?.tenants?.[0]?.id ?? "atlas-operations";
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [roleFilter, setRoleFilter] = useState<DemoRole | "all">("all");
''',
        '''export function ContentLibraryView() {
  const access = trpc.demo.viewerAccess.useQuery();
  const tenantId = access.data?.tenant.id;
  const [roleFilter, setRoleFilter] = useState<DemoRole | "all">("all");
'''
    ),
    (
        '''  const library = trpc.demo.library.useQuery({ tenantId, role: roleFilter });
  const uploadMutation = trpc.demo.previewUploadContent.useMutation({
''',
        '''  const library = trpc.demo.secureLibrary.useQuery(tenantId ? { tenantId, role: roleFilter } : { role: roleFilter }, { enabled: Boolean(tenantId) });
  const uploadMutation = trpc.demo.secureUploadContent.useMutation({
'''
    ),
    (
        '''  function handleStartTraining(asset?: any) {
    const params = new URLSearchParams({ tenantId });
    if (asset?.id) params.set("assetId", asset.id);
    if (asset?.title) params.set("assetTitle", asset.title);
    setLocation(`/training?${params.toString()}`);
  }
''',
        '''  function handleStartTraining(asset?: any) {
    const params = new URLSearchParams();
    if (asset?.id) params.set("assetId", asset.id);
    if (asset?.title) params.set("assetTitle", asset.title);
    setLocation(params.toString() ? `/training?${params.toString()}` : "/training");
  }
'''
    ),
    (
        '''        actions={
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
''',
        '''        actions={
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
'''
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Missing expected block:\n{old[:200]}')
    text = text.replace(old, new, 1)

path.write_text(text)
print('updated')

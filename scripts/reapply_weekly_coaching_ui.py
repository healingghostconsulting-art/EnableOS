from pathlib import Path

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()

insert_helpers_after = '''function ReviewLogComposer({
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
'''

helpers = insert_helpers_after + '''
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
  coachRole: "manager" | "executive" | "client_admin";
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
    `${employeeName} · ${employeeEmail}`,
    `${coachName} · ${coachEmail}`,
    `${supervisorName} · ${supervisorEmail}`,
    managerOfSupervisorEmail ? `Optional leadership copy · ${managerOfSupervisorEmail}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
      <div className="mb-4 space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Weekly coaching log</p>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm leading-6 text-slate-400">Capture the exact weekly coaching fields, show who receives the simulated copy, and preserve the learner's own take-aways in the same record.</p>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {shareTargets.map((target) => (
          <Badge key={target} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target}</Badge>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Date</span>
          <input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20" />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Coach</span>
          <input value={`${coachName} (${coachRole.replaceAll("_", " ")})`} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-200 outline-none" />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Employee</span>
          <input value={employeeName} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-200 outline-none" />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Attendance</span>
          <input value={attendance} onChange={(event) => setAttendance(event.target.value)} placeholder="Document where the agent stands for attendance." className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20 placeholder:text-slate-500" />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Follow-up from previous coaching</span>
          <textarea value={followUpFromPrevious} onChange={(event) => setFollowUpFromPrevious(event.target.value)} rows={4} placeholder="Progress on the prior SMART goal — did the agent meet it, and how or how not?" className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20 placeholder:text-slate-500" />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Coaching comments</span>
          <textarea value={coachingComments} onChange={(event) => setCoachingComments(event.target.value)} rows={4} placeholder="Behavior discussed and actions the agent will take." className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20 placeholder:text-slate-500" />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>SMART Goal Coaching Commitment</span>
          <textarea value={smartGoalCommitment} onChange={(event) => setSmartGoalCommitment(event.target.value)} rows={4} placeholder="How behavior will change, metric impact, timeline, and follow-up date." className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20 placeholder:text-slate-500" />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Additional support</span>
          <textarea value={additionalSupport} onChange={(event) => setAdditionalSupport(event.target.value)} rows={3} placeholder="What the leader can do to remove barriers." className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20 placeholder:text-slate-500" />
        </label>
        <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
          <span>Agent take-aways</span>
          <textarea value={agentTakeaways} onChange={(event) => setAgentTakeaways(event.target.value)} rows={3} placeholder="The agent's own response or take-aways can be entered now or added later from the learner view." className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-white/20 placeholder:text-slate-500" />
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
        <CardDescription className="text-slate-400">{description}</CardDescription>
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
              {[
                `Employee copy · ${log.employeeEmail}`,
                `Coach copy · ${log.coachEmail}`,
                `Supervisor copy · ${log.supervisorEmail}`,
                log.managerOfSupervisorEmail ? `Optional leadership copy · ${log.managerOfSupervisorEmail}` : null,
              ].filter(Boolean).map((recipient) => (
                <Badge key={String(recipient)} variant="outline" className="rounded-full border-white/10 bg-white/6 text-slate-200">{recipient}</Badge>
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
'''

if insert_helpers_after not in text:
    raise SystemExit('Could not locate ReviewLogComposer block.')
text = text.replace(insert_helpers_after, helpers, 1)

replacements = [
    (
        '        {!query.isLoading && role === "learner" && query.data ? <LearnerPanel data={query.data} /> : null}\n',
        '        {!query.isLoading && role === "learner" && query.data ? <LearnerPanel data={query.data} onUpdated={refreshWorkspace} /> : null}\n',
    ),
    (
        'function ExecutivePanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {\n  return (\n',
        'function ExecutivePanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {\n  const coachingSubject = data.weeklyCoachingLogs[0] ?? {\n    subjectUserId: data.reviewLogs[0]?.subjectUserId ?? data.executive.id,\n    employeeName: data.executive.name,\n    employeeEmail: data.executive.email,\n    supervisorName: data.executive.name,\n    supervisorEmail: data.executive.email,\n    managerOfSupervisorEmail: data.executive.email,\n  };\n\n  return (\n',
    ),
    (
        '        <div className="space-y-6">\n          <ReviewLogComposer\n',
        '        <div className="space-y-6">\n          <WeeklyCoachingLogComposer\n            tenantId={data.tenant.id}\n            subjectUserId={coachingSubject.subjectUserId}\n            coachRole="executive"\n            title="Capture a weekly coaching log from the executive view"\n            employeeName={coachingSubject.employeeName}\n            employeeEmail={coachingSubject.employeeEmail}\n            coachName={data.executive.name}\n            coachEmail={data.executive.email}\n            supervisorName={coachingSubject.supervisorName}\n            supervisorEmail={coachingSubject.supervisorEmail}\n            managerOfSupervisorEmail={coachingSubject.managerOfSupervisorEmail}\n            onCreated={onUpdated}\n          />\n          <WeeklyCoachingLogTimeline\n            title="Weekly coaching logs in the readiness record"\n            description="Executives can review the exact attendance, SMART-goal follow-up, coaching comments, support requests, and learner take-aways tied to each coaching cycle."\n            tenantId={data.tenant.id}\n            logs={data.weeklyCoachingLogs}\n          />\n          <ReviewLogComposer\n',
    ),
    (
        '        <TabsContent value="coaching" className="grid gap-4 lg:grid-cols-2">\n          {data.coachingSessions.map((session: any) => (\n            <PremiumCard key={session.id}>\n',
        '        <TabsContent value="coaching" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">\n          <div className="space-y-4">\n            {data.coachingSessions.map((session: any) => (\n              <PremiumCard key={session.id}>\n',
    ),
    (
        '          ))}\n        </TabsContent>\n',
        '            ))}\n          </div>\n          <div className="space-y-6">\n            <WeeklyCoachingLogComposer\n              tenantId={data.tenant.id}\n              subjectUserId={data.directReport.id}\n              coachRole="manager"\n              title="Capture this week\'s coaching log"\n              employeeName={data.directReport.name}\n              employeeEmail={data.directReport.email}\n              coachName={data.manager.name}\n              coachEmail={data.manager.email}\n              supervisorName={data.manager.name}\n              supervisorEmail={data.manager.email}\n              managerOfSupervisorEmail={data.weeklyCoachingLogs[0]?.managerOfSupervisorEmail}\n              onCreated={onUpdated}\n            />\n            <WeeklyCoachingLogTimeline\n              title="Weekly coaching log history"\n              description="Managers can review every structured coaching field, confirm the simulated email-copy list, and track how the learner responds over time."\n              tenantId={data.tenant.id}\n              logs={data.weeklyCoachingLogs}\n            />\n          </div>\n        </TabsContent>\n',
    ),
    (
        'function LearnerPanel({ data }: { data: any }) {\n',
        'function LearnerPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {\n',
    ),
    (
        '          <PremiumCard>\n            <CardHeader>\n              <CardTitle className="text-white">Documentation hub</CardTitle>\n',
        '          <WeeklyCoachingLogTimeline\n            title="Weekly coaching log and your take-aways"\n            description="Review the structured coaching notes your leaders recorded, see which email recipients would receive copies, and add your own response back into the same log."\n            tenantId={data.tenant.id}\n            logs={data.weeklyCoachingLogs}\n            allowTakeawayEditing\n            onUpdated={onUpdated}\n          />\n          <PremiumCard>\n            <CardHeader>\n              <CardTitle className="text-white">Documentation hub</CardTitle>\n',
    ),
    (
        'function AdminPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {\n  const [preferredLabel, setPreferredLabel] = useState(data.branding.preferredLabel);\n',
        'function AdminPanel({ data, onUpdated }: { data: any; onUpdated?: () => void }) {\n  const [preferredLabel, setPreferredLabel] = useState(data.branding.preferredLabel);\n  const learnerUser = data.tenantUsers.find((user: any) => user.role === "learner") ?? data.admin;\n  const managerUser = data.tenantUsers.find((user: any) => user.role === "manager") ?? data.admin;\n  const executiveUser = data.tenantUsers.find((user: any) => user.role === "executive") ?? data.admin;\n',
    ),
    (
        '      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">\n        <PremiumCard>\n',
        '      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">\n        <div className="space-y-6">\n          <PremiumCard>\n',
    ),
    (
        '          </CardContent>\n        </PremiumCard>\n        <div className="space-y-6">\n',
        '          </CardContent>\n        </PremiumCard>\n          <WeeklyCoachingLogComposer\n            tenantId={data.tenant.id}\n            subjectUserId={learnerUser.id}\n            coachRole="client_admin"\n            title="Write a structured weekly coaching log as client admin"\n            employeeName={learnerUser.name}\n            employeeEmail={learnerUser.email}\n            coachName={data.admin.name}\n            coachEmail={data.admin.email}\n            supervisorName={managerUser.name}\n            supervisorEmail={managerUser.email}\n            managerOfSupervisorEmail={executiveUser.email}\n            onCreated={onUpdated}\n          />\n        </div>\n        <div className="space-y-6">\n',
    ),
    (
        '          <PremiumCard>\n            <CardHeader>\n              <CardTitle className="text-white">Documentation governance</CardTitle>\n',
        '          <WeeklyCoachingLogTimeline\n            title="Tenant weekly coaching governance"\n            description="Client admins can audit who was coached, who would receive the simulated copies, and whether learner take-aways have been written back into each record."\n            tenantId={data.tenant.id}\n            logs={data.weeklyCoachingLogs}\n          />\n          <PremiumCard>\n            <CardHeader>\n              <CardTitle className="text-white">Documentation governance</CardTitle>\n',
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Missing snippet for replacement: {old[:120]!r}')
    text = text.replace(old, new, 1)

path.write_text(text)
print('Weekly coaching UI reapplied safely.')

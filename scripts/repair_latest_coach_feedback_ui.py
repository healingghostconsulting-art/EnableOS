from pathlib import Path

path = Path('/home/ubuntu/chcg-enableos-demo/client/src/pages/EnableOSViews.tsx')
text = path.read_text()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    if old not in source:
        raise RuntimeError(f'Could not find expected block for {label}')
    return source.replace(old, new, 1)

helper_block = '''
function getWeeklyCoachingVisibilityPresentation(visibility?: string | null) {
  if ((visibility ?? "public") === "private") {
    return {
      label: "Private coaching note",
      summary: "Private stays on file for leadership only and does not notify the learner.",
      badgeClassName: "border-violet-300/30 bg-violet-400/12 text-violet-100",
    };
  }

  return {
    label: "Public coaching log",
    summary: "Public coaching logs route to the learner, coach, and supervisor so everyone sees the same follow-through record.",
    badgeClassName: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100",
  };
}

function buildWeeklyCoachingShareRecipients(log: {
  id: string;
  employeeEmail: string;
  coachEmail: string;
  supervisorEmail: string;
  managerOfSupervisorEmail?: string | null;
  visibility?: string | null;
}) {
  const visibility = log.visibility ?? "public";
  const recipients = [
    { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },
    { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },
    log.managerOfSupervisorEmail
      ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }
      : null,
  ].filter(Boolean) as { key: string; label: string }[];

  if (visibility === "public") {
    recipients.unshift({ key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` });
  }

  return recipients;
}
'''
text = replace_once(text, '\nfunction WeeklyCoachingLogDetailDialog({', '\n' + helper_block + '\nfunction WeeklyCoachingLogDetailDialog({', 'helper block insertion')

old_dialog_header = '''  const recipients = [
    { key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` },
    { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },
    { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },
    log.managerOfSupervisorEmail
      ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }
      : null,
  ].filter(Boolean) as { key: string; label: string }[];
'''
new_dialog_header = '''  const visibilityPresentation = getWeeklyCoachingVisibilityPresentation(log.visibility);
  const recipients = buildWeeklyCoachingShareRecipients(log);
'''
text = replace_once(text, old_dialog_header, new_dialog_header, 'detail dialog recipients')

old_shared_block = '''          <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Shared copies</p>
            <div className="flex flex-wrap gap-2">
              {recipients.map((recipient) => (
                <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-950/90 text-slate-100">{recipient.label}</Badge>
              ))}
            </div>
          </div>
'''
new_shared_block = '''          <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Visibility and routing</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{visibilityPresentation.summary}</p>
              </div>
              <Badge variant="outline" className={`rounded-full ${visibilityPresentation.badgeClassName}`}>{visibilityPresentation.label}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {recipients.map((recipient) => (
                <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-950/90 text-slate-100">{recipient.label}</Badge>
              ))}
            </div>
          </div>
'''
text = replace_once(text, old_shared_block, new_shared_block, 'detail dialog routing block')

old_composer_state = '''  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
'''
new_composer_state = '''  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
'''
text = replace_once(text, old_composer_state, new_composer_state, 'composer visibility state')

old_success_reset = '''      setAgentTakeaways("");
      setSelectedAttachments([]);
      setAttachmentNotice(null);
      setAttachmentInputKey((current) => current + 1);
      onCreated?.();
'''
new_success_reset = '''      setAgentTakeaways("");
      setSelectedAttachments([]);
      setAttachmentNotice(null);
      setAttachmentInputKey((current) => current + 1);
      setVisibility("public");
      onCreated?.();
'''
text = replace_once(text, old_success_reset, new_success_reset, 'composer success reset')

old_share_targets = '''  const shareTargets = [
    { key: `employee-${subjectUserId}`, label: `${employeeName} · ${employeeEmail}` },
    { key: `coach-${coachRole}-${coachEmail}`, label: `${coachName} · ${coachEmail}` },
    { key: `supervisor-${supervisorEmail}`, label: `${supervisorName} · ${supervisorEmail}` },
    managerOfSupervisorEmail
      ? { key: `leadership-${managerOfSupervisorEmail}`, label: `Optional leadership copy · ${managerOfSupervisorEmail}` }
      : null,
  ].filter(Boolean) as { key: string; label: string }[];
'''
new_share_targets = '''  const visibilityPresentation = getWeeklyCoachingVisibilityPresentation(visibility);
  const shareTargets = buildWeeklyCoachingShareRecipients({
    id: subjectUserId,
    employeeEmail,
    coachEmail,
    supervisorEmail,
    managerOfSupervisorEmail,
    visibility,
  }).map((recipient) => ({ key: recipient.key, label: recipient.label.replace("copy", "delivery") }));
'''
text = replace_once(text, old_share_targets, new_share_targets, 'composer share targets')

old_share_badges = '''      <div className="mb-5 flex flex-wrap gap-2">
        {shareTargets.map((target) => (
          <Badge key={target.key} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target.label}</Badge>
        ))}
      </div>
'''
new_share_badges = '''      <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Public / Private visibility</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Choose whether this coaching log is routed to the learner or stays leadership-only on file.</p>
          </div>
          <Badge className={`rounded-full border ${visibilityPresentation.badgeClassName}`}>{visibilityPresentation.label}</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setVisibility("public")}
            className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${visibility === "public" ? "border-emerald-300 bg-emerald-400/12 shadow-[0_18px_40px_rgba(16,185,129,0.16)]" : "border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-white/8"}`}
          >
            <p className="text-sm font-semibold text-white">Public coaching log</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Learner, coach, and supervisor receive the same coaching record and linked follow-through.</p>
          </button>
          <button
            type="button"
            onClick={() => setVisibility("private")}
            className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${visibility === "private" ? "border-violet-300 bg-violet-400/12 shadow-[0_18px_40px_rgba(139,92,246,0.16)]" : "border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-white/8"}`}
          >
            <p className="text-sm font-semibold text-white">Private coaching note</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Private stays on file for leadership only and does not notify the learner.</p>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {shareTargets.map((target) => (
            <Badge key={target.key} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target.label}</Badge>
          ))}
        </div>
      </div>
'''
text = replace_once(text, old_share_badges, new_share_badges, 'composer visibility chooser')

old_payload = '''                managerOfSupervisorEmail,
                agentTakeaways: trimmedAgentTakeaways || undefined,
                attachments: attachments.length ? attachments : undefined,
              });
'''
new_payload = '''                managerOfSupervisorEmail,
                agentTakeaways: trimmedAgentTakeaways || undefined,
                visibility,
                attachments: attachments.length ? attachments : undefined,
              });
'''
text = replace_once(text, old_payload, new_payload, 'composer submit visibility')

old_success_message = '''          {createWeeklyCoachingLog.isSuccess ? <p className="text-emerald-300">Weekly coaching log saved with learner, supervisor, and attachment details.</p> : null}
'''
new_success_message = '''          {createWeeklyCoachingLog.isSuccess ? <p className="text-emerald-300">Weekly coaching log saved with visibility, routing, and attachment details.</p> : null}
'''
text = replace_once(text, old_success_message, new_success_message, 'composer success message')

old_timeline_badges = '''                  <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Linked review: {log.linkedReviewLogId ?? "Pending"}</Badge>
                  {allowLogEditing ? (
'''
new_timeline_badges = '''                  <Badge className={`rounded-full border ${getWeeklyCoachingVisibilityPresentation(log.visibility).badgeClassName}`}>{getWeeklyCoachingVisibilityPresentation(log.visibility).label}</Badge>
                  <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Linked review: {log.linkedReviewLogId ?? "Pending"}</Badge>
                  {allowLogEditing ? (
'''
text = replace_once(text, old_timeline_badges, new_timeline_badges, 'timeline visibility badge')

old_timeline_recipients = '''                  <div className="mt-4 flex flex-wrap gap-2">
                    {([
                      { key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` },
                      { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },
                      { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },
                      log.managerOfSupervisorEmail
                        ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }
                        : null,
                    ].filter(Boolean) as { key: string; label: string }[]).map((recipient) => (
                      <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-900/90 text-slate-100">{recipient.label}</Badge>
                    ))}
                  </div>
'''
new_timeline_recipients = '''                  <div className="mt-4 space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Visibility and routing</p>
                    <p className="text-sm leading-6 text-slate-300">{getWeeklyCoachingVisibilityPresentation(log.visibility).summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {buildWeeklyCoachingShareRecipients(log).map((recipient) => (
                        <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-900/90 text-slate-100">{recipient.label}</Badge>
                      ))}
                    </div>
                  </div>
'''
text = replace_once(text, old_timeline_recipients, new_timeline_recipients, 'timeline recipients')

old_overview_block = '''      <div id="coach-overview" className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr] scroll-mt-24">
        <div className="space-y-6">
          <PremiumCard className="scroll-mt-24" id="coach-supervision-lane">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <CardTitle className="text-white">Coach supervision lane</CardTitle>
                  <CardDescription className="mt-2 text-slate-300/82">The coach workspace now leads with the active pathway, the next observation, and the action that should happen now instead of a decorative trend chart.</CardDescription>
                </div>
                <Badge className="rounded-full border-white/10 bg-white/8 px-3 py-1 text-slate-100">{data.coachingSessions.length} active coaching threads</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.6rem] border border-cyan-400/18 bg-cyan-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/82">Current coach pathway</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{data.activeJourney.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-100">{data.activeJourney.competencyGap}</p>
                </div>
                {leadModule ? (
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Next coach-focused module</p>
                    <p className="mt-2 text-lg font-medium text-white">{leadModule.title}</p>
                    <p className="mt-2 text-sm text-slate-300">{leadModule.skillFocus} · {leadModule.durationMinutes} min · {leadModule.completionRate}% completion</p>
                  </div>
                ) : (
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Next coach-focused module</p>
                    <p className="mt-2 text-lg font-medium text-white">Module detail will appear here once the active pathway resolves.</p>
                    <p className="mt-2 text-sm text-slate-300">Keep the supervision lane focused on the active learner and documented follow-through.</p>
                  </div>
                )}
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Escalation partner</p>
                <p className="mt-2 text-lg font-medium text-white">{data.escalationPartner.name}</p>
                <p className="mt-1 text-sm text-slate-300">{data.escalationPartner.title}</p>
              </div>
              <GuidanceActionPanel tenantId={data.tenant.id} suggestion={data.aiSuggestion} catalog={data.retrainingCatalog} assignments={data.activeRetrainingAssignments} actorRole="coach" learnerName={data.directLearner.name} onUpdated={onUpdated} />
            </CardContent>
          </PremiumCard>
        </div>
        <div className="space-y-6">
          <Card id="coach-needs-rail" className="rounded-[2rem] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-950">Coach needs</CardTitle>
                  <CardDescription className="mt-2 max-w-xl text-slate-600">Keep the documentation handoff in a tighter side-channel box so the next saved detail is always visible without extra scrolling.</CardDescription>
                </div>
                <Button type="button" variant="outline" className="rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-100" onClick={openCoachDocumentationLane}>
                  Open full documentation lane
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {coachNeedEntries.length ? coachNeedEntries.map((entry: any, index: number) => {
                const linkedWeeklyCoachingLog = entry.weeklyCoachingLogId
                  ? data.weeklyCoachingLogs.find((log: any) => log.id === entry.weeklyCoachingLogId) ?? null
                  : null;
                const supportsCoachingPopup = entry.sourceType === "coaching_summary" && linkedWeeklyCoachingLog;

                return (
                  <button
                    key={entry.id ?? `${entry.title ?? "coach-need"}-${index}`}
                    type="button"
                    onClick={() => openCoachNeed(entry.id)}
                    className={`w-full rounded-[1.45rem] border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${selectedCoachNeedEntry?.id === entry.id ? "border-cyan-300 bg-[linear-gradient(180deg,rgba(236,254,255,0.98),rgba(224,242,254,0.94))] shadow-[0_18px_40px_rgba(14,116,144,0.14)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{entry.title ?? entry.label ?? `Documentation item ${index + 1}`}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{entry.owner ?? entry.status ?? "Documentation stream"}</p>
                      </div>
                      <Badge className={`rounded-full ${supportsCoachingPopup ? "border-cyan-300/70 bg-cyan-100 text-cyan-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
                        {supportsCoachingPopup ? "Open exact coaching log" : "Open document details"}
                      </Badge>
                    </div>
                    {entry.summary ? <p className="mt-3 text-sm leading-6 text-slate-600">{entry.summary}</p> : null}
                  </button>
                );
              }) : (
                <div className="rounded-[1.45rem] border border-dashed border-slate-300 bg-white px-4 py-5 text-sm leading-6 text-slate-500">
                  Documentation items will surface here as soon as new coaching notes, follow-ups, or linked reviews are available.
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="coach-alert-summary" className="rounded-[2rem] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-950">Coach alerts</CardTitle>
                  <CardDescription className="mt-2 max-w-xl text-slate-600">Alerts now use clearer contrast and stronger hierarchy so the coach can quickly identify what needs attention without a washed-out feed.</CardDescription>
                </div>
                <Button type="button" variant="outline" className="rounded-full border-slate-300 bg-white text-slate-700 hover:bg-slate-100" onClick={openCoachAlertsLane}>
                  Open full alerts lane
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {overviewAlerts.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAlertId(item.id)}
                    className={`w-full rounded-[1.45rem] border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 ${selectedAlert?.id === item.id ? "border-rose-300 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(254,226,226,0.96))] shadow-[0_18px_40px_rgba(225,29,72,0.12)]" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Alert</p>
                        <h3 className="mt-2 text-base font-semibold text-slate-950">{item.title}</h3>
                        <p className="mt-2 text-sm text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <StatusBadge value={item.priority} />
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-950 px-5 py-5 text-slate-100 shadow-[0_18px_45px_rgba(15,23,42,0.24)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Selected alert</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{selectedAlert?.title ?? "Alert detail"}</h3>
                    {selectedAlert ? <p className="mt-2 text-sm text-slate-300">{new Date(selectedAlert.createdAt).toLocaleString()}</p> : null}
                  </div>
                  {selectedAlert ? <StatusBadge value={selectedAlert.priority} /> : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-200">{selectedAlert?.detail ?? "Select an alert to inspect the coach-facing recommendation and timing context."}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
'''
new_overview_block = '''      <div id="coach-overview" className="space-y-6 scroll-mt-24">
        <PremiumCard className="scroll-mt-24" id="coach-supervision-lane">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <CardTitle className="text-white">Coach control surface</CardTitle>
                <CardDescription className="mt-2 text-slate-300/82">The coach workspace now keeps supervision, documentation, and alerts in one tighter command surface so the next action is visible without dropping into a long side column.</CardDescription>
              </div>
              <Badge className="rounded-full border-white/10 bg-white/8 px-3 py-1 text-slate-100">{data.coachingSessions.length} active coaching threads</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.6rem] border border-cyan-400/18 bg-cyan-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/82">Current coach pathway</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{data.activeJourney.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-100">{data.activeJourney.competencyGap}</p>
                </div>
                {leadModule ? (
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Next coach-focused module</p>
                    <p className="mt-2 text-lg font-medium text-white">{leadModule.title}</p>
                    <p className="mt-2 text-sm text-slate-300">{leadModule.skillFocus} · {leadModule.durationMinutes} min · {leadModule.completionRate}% completion</p>
                  </div>
                ) : (
                  <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Next coach-focused module</p>
                    <p className="mt-2 text-lg font-medium text-white">Module detail will appear here once the active pathway resolves.</p>
                    <p className="mt-2 text-sm text-slate-300">Keep the supervision lane focused on the active learner and documented follow-through.</p>
                  </div>
                )}
                <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Escalation partner</p>
                  <p className="mt-2 text-lg font-medium text-white">{data.escalationPartner.name}</p>
                  <p className="mt-1 text-sm text-slate-300">{data.escalationPartner.title}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Documentation mode</p>
                      <p className="mt-2 text-base font-semibold text-white">Coach needs now live inside Documentation mode</p>
                    </div>
                    <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white" onClick={openCoachDocumentationLane}>
                      Open documentation
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Open the focused documentation tab to review coach needs, linked weekly logs, and saved follow-up notes in the same working area.</p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Alerts mode</p>
                      <p className="mt-2 text-base font-semibold text-white">Alerts mode keeps the coach queue compact until detail is needed.</p>
                    </div>
                    <Button type="button" variant="outline" className="rounded-full border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white" onClick={openCoachAlertsLane}>
                      Open alerts
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{selectedAlert?.title ?? overviewAlerts[0]?.title ?? "The next alert will appear here."}</p>
                </div>
                <div className="rounded-[1.6rem] border border-emerald-400/20 bg-emerald-400/10 p-4 md:col-span-2 xl:col-span-1">
                  <p className="text-xs uppercase tracking-[0.22em] text-emerald-100">Weekly coaching signal</p>
                  <p className="mt-2 text-base font-semibold text-white">{data.weeklyCoachingLogs.length} coaching logs are ready with explicit public-private visibility and linked documentation.</p>
                  <p className="mt-3 text-sm leading-6 text-emerald-50/90">Use the gold ribbon action to keep the structured coaching log capture in a focused pop-up while the rest of the desk stays compact.</p>
                </div>
              </div>
            </div>
            <GuidanceActionPanel tenantId={data.tenant.id} suggestion={data.aiSuggestion} catalog={data.retrainingCatalog} assignments={data.activeRetrainingAssignments} actorRole="coach" learnerName={data.directLearner.name} onUpdated={onUpdated} />
          </CardContent>
        </PremiumCard>
      </div>
'''
text = replace_once(text, old_overview_block, new_overview_block, 'coach overview control surface')

old_docs_block = '''        <TabsContent value="documentation" id="coach-documentation-feed" className="mt-0 grid gap-6 xl:grid-cols-[0.95fr_1.05fr] scroll-mt-24">
          <div className="space-y-6">
            <ReviewLogComposer tenantId={data.tenant.id} subjectUserId={data.directLearner.id} authorRole="coach" title="Write a coach follow-up or observational review" onCreated={onUpdated} />
            <WorkflowLibraryPanel title="Coach observation resources" description="Use methodology references and tenant materials to keep observation notes aligned with the lesson evidence and coaching standard." resources={data.workflowLibraryMix.interventionResources} />
          </div>
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Coach documentation feed</CardTitle>
              <CardDescription className="text-slate-400">Observed behavior, weekly coaching records, and review notes remain connected so the coach does not lose context between sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentationFeed entries={data.documentationEntries} weeklyCoachingLogs={data.weeklyCoachingLogs} />
            </CardContent>
          </PremiumCard>
        </TabsContent>
'''
new_docs_block = '''        <TabsContent value="documentation" id="coach-documentation-feed" className="mt-0 grid gap-6 xl:grid-cols-[0.95fr_1.05fr] scroll-mt-24">
          <div className="space-y-6">
            <PremiumCard id="coach-needs-rail">
              <CardHeader>
                <CardTitle className="text-white">Coach needs now live inside Documentation mode</CardTitle>
                <CardDescription className="text-slate-400">Review the next documentation handoff, open the exact coaching record when it exists, and keep follow-up notes in the same focused mode.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {coachNeedEntries.length ? coachNeedEntries.map((entry: any, index: number) => {
                  const linkedWeeklyCoachingLog = entry.weeklyCoachingLogId
                    ? data.weeklyCoachingLogs.find((log: any) => log.id === entry.weeklyCoachingLogId) ?? null
                    : null;
                  const supportsCoachingPopup = entry.sourceType === "coaching_summary" && linkedWeeklyCoachingLog;

                  return (
                    <button
                      key={entry.id ?? `${entry.title ?? "coach-need"}-${index}`}
                      type="button"
                      onClick={() => openCoachNeed(entry.id)}
                      className={`w-full rounded-[1.45rem] border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${selectedCoachNeedEntry?.id === entry.id ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_20px_45px_rgba(8,15,35,0.18)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{entry.title ?? entry.label ?? `Documentation item ${index + 1}`}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{entry.owner ?? entry.status ?? "Documentation stream"}</p>
                        </div>
                        <Badge className={`rounded-full ${supportsCoachingPopup ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100" : "border-white/12 bg-white/8 text-slate-100"}`}>
                          {supportsCoachingPopup ? "Open exact coaching log" : "Open document details"}
                        </Badge>
                      </div>
                      {entry.summary ? <p className="mt-3 text-sm leading-6 text-slate-300">{entry.summary}</p> : null}
                    </button>
                  );
                }) : (
                  <div className="rounded-[1.45rem] border border-dashed border-white/12 bg-white/5 px-4 py-5 text-sm leading-6 text-slate-400">
                    Documentation items will surface here as soon as new coaching notes, follow-ups, or linked reviews are available.
                  </div>
                )}
              </CardContent>
            </PremiumCard>
            <ReviewLogComposer tenantId={data.tenant.id} subjectUserId={data.directLearner.id} authorRole="coach" title="Write a coach follow-up or observational review" onCreated={onUpdated} />
            <WorkflowLibraryPanel title="Coach observation resources" description="Use methodology references and tenant materials to keep observation notes aligned with the lesson evidence and coaching standard." resources={data.workflowLibraryMix.interventionResources} />
          </div>
          <PremiumCard>
            <CardHeader>
              <CardTitle className="text-white">Coach documentation feed</CardTitle>
              <CardDescription className="text-slate-400">Observed behavior, weekly coaching records, and review notes remain connected so the coach does not lose context between sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentationFeed entries={data.documentationEntries} weeklyCoachingLogs={data.weeklyCoachingLogs} />
            </CardContent>
          </PremiumCard>
        </TabsContent>
'''
text = replace_once(text, old_docs_block, new_docs_block, 'documentation tab consolidation')

old_alerts_header = '''                <div>
                  <CardTitle className="text-slate-950">{selectedAlert?.title ?? "Alert detail"}</CardTitle>
                  {selectedAlert ? <CardDescription className="mt-2 text-slate-500">{new Date(selectedAlert.createdAt).toLocaleString()}</CardDescription> : null}
                </div>
'''
new_alerts_header = '''                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Alerts mode keeps the coach queue compact until detail is needed.</p>
                  <CardTitle className="mt-2 text-slate-950">{selectedAlert?.title ?? "Alert detail"}</CardTitle>
                  {selectedAlert ? <CardDescription className="mt-2 text-slate-500">{new Date(selectedAlert.createdAt).toLocaleString()}</CardDescription> : null}
                </div>
'''
text = replace_once(text, old_alerts_header, new_alerts_header, 'alerts tab detail header')

path.write_text(text)

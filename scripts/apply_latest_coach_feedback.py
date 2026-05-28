from pathlib import Path
import re

ROOT = Path('/home/ubuntu/chcg-enableos-demo')


def read(rel: str) -> str:
    return (ROOT / rel).read_text()


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Could not find expected block for {label}')
    return text.replace(old, new, 1)


def replace_regex(text: str, pattern: str, repl: str, label: str) -> str:
    updated, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'Expected one regex replacement for {label}, found {count}')
    return updated


# server/demoPlatform.ts
platform = read('server/demoPlatform.ts')
platform = replace_once(
    platform,
    'export type WeeklyCoachingLog = {\n',
    'export type WeeklyCoachingVisibility = "public" | "private";\n\nexport type WeeklyCoachingLog = {\n',
    'weekly coaching visibility type',
)
platform = replace_once(
    platform,
    '  linkedReviewLogId?: string;\n  attachments: WeeklyCoachingAttachment[];\n};\n',
    '  linkedReviewLogId?: string;\n  visibility: WeeklyCoachingVisibility;\n  attachments: WeeklyCoachingAttachment[];\n};\n',
    'weekly coaching log visibility field',
)
platform = replace_once(
    platform,
    '  managerOfSupervisorEmail?: string;\n  agentTakeaways?: string;\n  attachments?: WeeklyCoachingAttachment[];\n};\n',
    '  managerOfSupervisorEmail?: string;\n  agentTakeaways?: string;\n  visibility?: WeeklyCoachingVisibility;\n  attachments?: WeeklyCoachingAttachment[];\n};\n',
    'create weekly coaching visibility input',
)
platform = replace_once(
    platform,
    '    linkedReviewLogId: "review-1",\n    attachments: [],\n  },\n];\n',
    '    linkedReviewLogId: "review-1",\n    visibility: "public",\n    attachments: [],\n  },\n];\n',
    'seeded weekly coaching visibility',
)
platform = replace_once(
    platform,
    '    linkedReviewLogId: review.id,\n    attachments: input.attachments ?? [],\n  };\n\n  weeklyCoachingLogs.unshift(created);\n  notifications.unshift({\n    id: `note-weekly-coaching-${notifications.length + 1}`,\n    tenantId: input.tenantId,\n    audience: "learner",\n    title: "Weekly coaching log ready for your takeaways",\n    detail: `${coach.name} documented a weekly coaching log for ${learner.name}. The log includes agent, supervisor, and optional leadership copy details for follow-up sharing.`,\n    priority: "info",\n    createdAt,\n  });\n\n  return created;\n}\n',
    '    linkedReviewLogId: review.id,\n    visibility: input.visibility ?? "public",\n    attachments: input.attachments ?? [],\n  };\n\n  weeklyCoachingLogs.unshift(created);\n\n  if (created.visibility === "public") {\n    notifications.unshift({\n      id: `note-weekly-coaching-${notifications.length + 1}`,\n      tenantId: input.tenantId,\n      audience: "learner",\n      title: "Weekly coaching log ready for your takeaways",\n      detail: `${coach.name} documented a weekly coaching log for ${learner.name}. The log includes agent, supervisor, and optional leadership copy details for follow-up sharing.`,\n      priority: "info",\n      createdAt,\n    });\n  }\n\n  return created;\n}\n',
    'create weekly coaching notification branch',
)
platform = replace_once(
    platform,
    '  const retrainingAssignments = getRetrainingAssignmentsForLearner(tenant.id, learner.id);\n  const currentRetrainingAssignment = getCurrentRetrainingAssignment(retrainingAssignments);\n  const retrainingHistory = getHistoricalRetrainingAssignments(retrainingAssignments, currentRetrainingAssignment?.id);\n\n  return {\n',
    '  const retrainingAssignments = getRetrainingAssignmentsForLearner(tenant.id, learner.id);\n  const currentRetrainingAssignment = getCurrentRetrainingAssignment(retrainingAssignments);\n  const retrainingHistory = getHistoricalRetrainingAssignments(retrainingAssignments, currentRetrainingAssignment?.id);\n  const learnerVisibleWeeklyCoachingLogs = getWeeklyCoachingLogs(tenant.id, learner.id).filter((entry) => (entry.visibility ?? "public") === "public");\n  const learnerVisibleWeeklyCoachingLogIds = new Set(learnerVisibleWeeklyCoachingLogs.map((entry) => entry.id));\n  const learnerVisibleDocumentationEntries = getDocumentationEntries(tenant.id, learner.id).filter((entry) => !entry.weeklyCoachingLogId || learnerVisibleWeeklyCoachingLogIds.has(entry.weeklyCoachingLogId));\n  const learnerVisibleReviewLogs = getReviewLogs(tenant.id, learner.id).filter((entry) => !entry.weeklyCoachingLogId || learnerVisibleWeeklyCoachingLogIds.has(entry.weeklyCoachingLogId));\n\n  return {\n',
    'learner visibility filtering prelude',
)
platform = replace_once(
    platform,
    '    documentationEntries: getDocumentationEntries(tenant.id, learner.id),\n    reviewLogs: getReviewLogs(tenant.id, learner.id),\n    weeklyCoachingLogs: getWeeklyCoachingLogs(tenant.id, learner.id),\n',
    '    documentationEntries: learnerVisibleDocumentationEntries,\n    reviewLogs: learnerVisibleReviewLogs,\n    weeklyCoachingLogs: learnerVisibleWeeklyCoachingLogs,\n',
    'learner visibility filtered return values',
)
write('server/demoPlatform.ts', platform)

# server/routers/demo.ts
router = read('server/routers/demo.ts')
router = replace_once(
    router,
    '  managerOfSupervisorEmail: z.string().email().optional(),\n  agentTakeaways: z.string().max(800).optional(),\n  attachments: z.array(coachingAttachmentUploadInput).max(5).optional(),\n});\n',
    '  managerOfSupervisorEmail: z.string().email().optional(),\n  agentTakeaways: z.string().max(800).optional(),\n  visibility: z.enum(["public", "private"]).default("public"),\n  attachments: z.array(coachingAttachmentUploadInput).max(5).optional(),\n});\n',
    'weekly coaching log zod visibility',
)
write('server/routers/demo.ts', router)

# server/demo.router.test.ts
router_test = read('server/demo.router.test.ts')
router_test = replace_once(
    router_test,
    '      managerOfSupervisorEmail: "executive-copy@enterpriseworkspace.demo",\n      agentTakeaways: "I need to slow down before the final summary so my next steps sound confident.",\n    });\n\n    expect(created.supervisorEmail).toContain(\'@\');\n',
    '      managerOfSupervisorEmail: "executive-copy@enterpriseworkspace.demo",\n      agentTakeaways: "I need to slow down before the final summary so my next steps sound confident.",\n      visibility: "public",\n    });\n\n    expect(created.visibility).toBe("public");\n    expect(created.supervisorEmail).toContain(\'@\');\n',
    'public visibility preview test update',
)
private_test = '''\n\n  it("keeps private weekly coaching logs off the learner workspace while preserving leadership visibility", async () => {\n    const caller = appRouter.createCaller(\n      createContext({\n        openId: "atlas-manager",\n        role: "user",\n        name: "Enterprise Manager",\n      }),\n    );\n\n    const created = await caller.demo.secureCreateWeeklyCoachingLog({\n      tenantId: "atlas-operations",\n      subjectUserId: "u-learn-1",\n      coachRole: "manager",\n      sessionDate: "2026-05-02",\n      attendance: "Present and reflective.",\n      followUpFromPrevious: "The previous goal needs another observation cycle before it is shared back to the learner.",\n      coachingComments: "Manager recorded an internal coaching note that should stay private until the leadership team is ready to release it.",\n      smartGoalCommitment: "Validate the pattern privately across the next three monitored contacts before publishing a learner-facing plan.",\n      additionalSupport: "Leadership will review the evidence and decide whether a public coaching log should follow.",\n      visibility: "private",\n    });\n\n    expect(created.visibility).toBe("private");\n\n    const learner = await caller.demo.learner({ tenantId: "atlas-operations" });\n    expect(learner.weeklyCoachingLogs.find((entry: any) => entry.id === created.id)).toBeUndefined();\n    expect(learner.documentationEntries.find((entry: any) => entry.weeklyCoachingLogId === created.id)).toBeUndefined();\n\n    const manager = await caller.demo.secureManager({ tenantId: "atlas-operations" });\n    expect(manager.weeklyCoachingLogs).toEqual(\n      expect.arrayContaining([\n        expect.objectContaining({ id: created.id, visibility: "private" }),\n      ]),\n    );\n  });\n'''
router_test = replace_once(
    router_test,
    '\n  it("stores coaching-log attachments when leadership creates a secure weekly coaching log", async () => {\n',
    private_test + '\n  it("stores coaching-log attachments when leadership creates a secure weekly coaching log", async () => {\n',
    'insert private weekly coaching visibility test',
)
write('server/demo.router.test.ts', router_test)

# server/enableosTrainingLayout.test.ts
layout_test = read('server/enableosTrainingLayout.test.ts')
layout_test = replace_once(
    layout_test,
    '    expect(trainingViewSource).toContain("Attach any file type to the coaching log");\n    expect(trainingViewSource).toContain("Attach files to this log");\n    expect(trainingViewSource).toContain("function CoachingAttachmentList");\n',
    '    expect(trainingViewSource).toContain("Attach any file type to the coaching log");\n    expect(trainingViewSource).toContain("Attach files to this log");\n    expect(trainingViewSource).toContain("function CoachingAttachmentList");\n    expect(trainingViewSource).toContain("Public / Private visibility");\n    expect(trainingViewSource).toContain("Public coaching log");\n    expect(trainingViewSource).toContain("Private coaching note");\n    expect(trainingViewSource).toContain("Private stays on file for leadership only and does not notify the learner.");\n    expect(trainingViewSource).toContain("Coach needs now live inside Documentation mode");\n    expect(trainingViewSource).toContain("Alerts mode keeps the coach queue compact until detail is needed.");\n',
    'layout regression additions for latest coach feedback',
)
write('server/enableosTrainingLayout.test.ts', layout_test)

# client/src/pages/EnableOSViews.tsx
views = read('client/src/pages/EnableOSViews.tsx')
views = replace_once(
    views,
    'return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;\n}\n\nfunction CoachingAttachmentList({\n',
    '''return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

type WeeklyCoachingVisibilityMode = "public" | "private";

function normalizeWeeklyCoachingVisibility(visibility?: string): WeeklyCoachingVisibilityMode {
  return visibility === "private" ? "private" : "public";
}

function getWeeklyCoachingVisibilityMeta(visibility?: string) {
  const normalizedVisibility = normalizeWeeklyCoachingVisibility(visibility);

  return normalizedVisibility === "private"
    ? {
        value: normalizedVisibility,
        badgeLabel: "Private coaching note",
        summary: "Private stays on file for leadership only and does not notify the learner.",
        emphasisClass: "border-amber-300/35 bg-amber-400/12 text-amber-50",
        outlineClass: "border-amber-300/30 bg-amber-400/10 text-amber-100",
        confirmation: "Weekly coaching log saved as private and kept on file for leadership only.",
      }
    : {
        value: normalizedVisibility,
        badgeLabel: "Public coaching log",
        summary: "Public shares the log into the learner workflow and keeps the follow-up notification intentional.",
        emphasisClass: "border-emerald-300/35 bg-emerald-400/12 text-emerald-50",
        outlineClass: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
        confirmation: "Weekly coaching log saved as public and routed into the learner workflow.",
      };
}

function buildWeeklyCoachingRecipients({
  visibility,
  employeeKey,
  employeeLabel,
  coachKey,
  coachLabel,
  supervisorKey,
  supervisorLabel,
  leadershipKey,
  leadershipLabel,
}: {
  visibility?: string;
  employeeKey: string;
  employeeLabel: string;
  coachKey: string;
  coachLabel: string;
  supervisorKey: string;
  supervisorLabel: string;
  leadershipKey?: string | null;
  leadershipLabel?: string;
}) {
  const normalizedVisibility = normalizeWeeklyCoachingVisibility(visibility);

  return [
    normalizedVisibility === "private"
      ? { key: `${coachKey}-private`, label: "Leadership file only" }
      : { key: employeeKey, label: employeeLabel },
    { key: coachKey, label: coachLabel },
    { key: supervisorKey, label: supervisorLabel },
    leadershipKey && leadershipLabel ? { key: leadershipKey, label: leadershipLabel } : null,
  ].filter(Boolean) as { key: string; label: string }[];
}

function CoachingAttachmentList({
''',
    'coach visibility helpers insertion',
)
views = replace_once(
    views,
    '  if (!entry || !log) {\n    return null;\n  }\n\n  const recipients = [\n    { key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` },\n    { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },\n    { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },\n    log.managerOfSupervisorEmail\n      ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }\n      : null,\n  ].filter(Boolean) as { key: string; label: string }[];\n',
    '  if (!entry || !log) {\n    return null;\n  }\n\n  const visibilityMeta = getWeeklyCoachingVisibilityMeta(log.visibility);\n  const recipients = buildWeeklyCoachingRecipients({\n    visibility: log.visibility,\n    employeeKey: `employee-${log.id}-${log.employeeEmail}`,\n    employeeLabel: `Employee copy · ${log.employeeEmail}`,\n    coachKey: `coach-${log.id}-${log.coachEmail}`,\n    coachLabel: `Coach copy · ${log.coachEmail}`,\n    supervisorKey: `supervisor-${log.id}-${log.supervisorEmail}`,\n    supervisorLabel: `Supervisor copy · ${log.supervisorEmail}`,\n    leadershipKey: log.managerOfSupervisorEmail ? `leadership-${log.id}-${log.managerOfSupervisorEmail}` : null,\n    leadershipLabel: log.managerOfSupervisorEmail ? `Optional leadership copy · ${log.managerOfSupervisorEmail}` : undefined,\n  });\n',
    'detail dialog recipients and visibility meta',
)
views = replace_once(
    views,
    '        <div className="space-y-4">\n          <div className="rounded-2xl border border-cyan-400/18 bg-cyan-400/10 p-4">\n',
    '        <div className="space-y-4">\n          <div className="flex flex-wrap gap-2">\n            <Badge variant="outline" className={`rounded-full ${visibilityMeta.outlineClass}`}>{visibilityMeta.badgeLabel}</Badge>\n            <Badge variant="outline" className="rounded-full border-white/12 bg-slate-900/90 text-slate-100">Linked documentation record</Badge>\n          </div>\n          <div className="rounded-2xl border border-cyan-400/18 bg-cyan-400/10 p-4">\n',
    'detail dialog visibility badges',
)
views = replace_once(
    views,
    '            <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">\n              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Shared copies</p>\n',
    '            <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">\n              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Routing list</p>\n              <p className="text-sm leading-6 text-slate-300">{visibilityMeta.summary}</p>\n',
    'detail dialog routing list label',
)
views = replace_once(
    views,
    '  const [agentTakeaways, setAgentTakeaways] = useState("");\n  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);\n  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);\n  const [attachmentInputKey, setAttachmentInputKey] = useState(0);\n',
    '  const [agentTakeaways, setAgentTakeaways] = useState("");\n  const [visibility, setVisibility] = useState<WeeklyCoachingVisibilityMode>("public");\n  const [lastSavedVisibility, setLastSavedVisibility] = useState<WeeklyCoachingVisibilityMode>("public");\n  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);\n  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);\n  const [attachmentInputKey, setAttachmentInputKey] = useState(0);\n',
    'composer visibility state',
)
views = replace_once(
    views,
    '  });\n  const canSaveWeeklyCoachingLog = coachingValidationMessages.length === 0;\n  const createWeeklyCoachingLog = trpc.demo.secureCreateWeeklyCoachingLog.useMutation({\n    onSuccess: () => {\n',
    '  });\n  const canSaveWeeklyCoachingLog = coachingValidationMessages.length === 0;\n  const visibilityMeta = getWeeklyCoachingVisibilityMeta(visibility);\n  const createWeeklyCoachingLog = trpc.demo.secureCreateWeeklyCoachingLog.useMutation({\n    onSuccess: (_data, variables) => {\n      setLastSavedVisibility(normalizeWeeklyCoachingVisibility(variables.visibility));\n',
    'composer visibility meta and onSuccess signature',
)
views = replace_once(
    views,
    '      setAgentTakeaways("");\n      setSelectedAttachments([]);\n',
    '      setAgentTakeaways("");\n      setVisibility("public");\n      setSelectedAttachments([]);\n',
    'composer visibility reset on success',
)
views = replace_once(
    views,
    '  const shareTargets = [\n    { key: `employee-${subjectUserId}`, label: `${employeeName} · ${employeeEmail}` },\n    { key: `coach-${coachRole}-${coachEmail}`, label: `${coachName} · ${coachEmail}` },\n    { key: `supervisor-${supervisorEmail}`, label: `${supervisorName} · ${supervisorEmail}` },\n    managerOfSupervisorEmail\n      ? { key: `leadership-${managerOfSupervisorEmail}`, label: `Optional leadership copy · ${managerOfSupervisorEmail}` }\n      : null,\n  ].filter(Boolean) as { key: string; label: string }[];\n',
    '  const shareTargets = buildWeeklyCoachingRecipients({\n    visibility,\n    employeeKey: `employee-${subjectUserId}` ,\n    employeeLabel: `${employeeName} · ${employeeEmail}`,\n    coachKey: `coach-${coachRole}-${coachEmail}`,\n    coachLabel: `${coachName} · ${coachEmail}`,\n    supervisorKey: `supervisor-${supervisorEmail}`,\n    supervisorLabel: `${supervisorName} · ${supervisorEmail}`,\n    leadershipKey: managerOfSupervisorEmail ? `leadership-${managerOfSupervisorEmail}` : null,\n    leadershipLabel: managerOfSupervisorEmail ? `Optional leadership copy · ${managerOfSupervisorEmail}` : undefined,\n  });\n',
    'composer routing preview helper',
)
views = replace_once(
    views,
    '      <div className="mb-5 flex flex-wrap gap-2">\n        {shareTargets.map((target) => (\n          <Badge key={target.key} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target.label}</Badge>\n        ))}\n      </div>\n',
    '      <div className="mb-5 grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">\n        <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">\n          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Public / Private visibility</p>\n          <p className="mt-2 text-sm leading-6 text-slate-300">Choose whether this coaching log is shared into the learner workflow or kept on file as a private leadership note.</p>\n          <div className="mt-4 grid gap-2 sm:grid-cols-2">\n            <button\n              type="button"\n              onClick={() => setVisibility("public")}\n              className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${visibility === "public" ? visibilityMeta.emphasisClass : "border-white/10 bg-slate-950/70 text-slate-200 hover:bg-slate-950"}`}\n            >\n              <p className="text-sm font-semibold">Public coaching log</p>\n              <p className="mt-2 text-sm leading-6">Share with the learner workflow and keep the follow-up notification intentional.</p>\n            </button>\n            <button\n              type="button"\n              onClick={() => setVisibility("private")}\n              className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${visibility === "private" ? visibilityMeta.emphasisClass : "border-white/10 bg-slate-950/70 text-slate-200 hover:bg-slate-950"}`}\n            >\n              <p className="text-sm font-semibold">Private coaching note</p>\n              <p className="mt-2 text-sm leading-6">Keep the record on file for leadership only and suppress the learner notification.</p>\n            </button>\n          </div>\n          <p className="mt-3 text-sm leading-6 text-slate-300">{visibilityMeta.summary}</p>\n        </div>\n        <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">\n          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Routing preview</p>\n          <p className="mt-2 text-sm leading-6 text-slate-300">Confirm who will see or receive the saved coaching record before you submit it.</p>\n          <div className="mt-4 flex flex-wrap gap-2">\n            {shareTargets.map((target) => (\n              <Badge key={target.key} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target.label}</Badge>\n            ))}\n          </div>\n        </div>\n      </div>\n',
    'composer visibility and routing preview block',
)
views = replace_once(
    views,
    '                managerOfSupervisorEmail,\n                agentTakeaways: trimmedAgentTakeaways || undefined,\n                attachments: attachments.length ? attachments : undefined,\n              });\n',
    '                managerOfSupervisorEmail,\n                agentTakeaways: trimmedAgentTakeaways || undefined,\n                visibility,\n                attachments: attachments.length ? attachments : undefined,\n              });\n',
    'composer save payload visibility',
)
views = replace_once(
    views,
    '          {createWeeklyCoachingLog.isSuccess ? <p className="text-emerald-300">Weekly coaching log saved with learner, supervisor, and attachment details.</p> : null}\n',
    '          {createWeeklyCoachingLog.isSuccess ? <p className="text-emerald-300">{getWeeklyCoachingVisibilityMeta(lastSavedVisibility).confirmation}</p> : null}\n',
    'composer success message visibility aware',
)
views = replace_once(
    views,
    '          const structuredValidationMessages = getWeeklyCoachingValidationMessages(structuredDraft);\n          const canSaveStructuredLog = structuredValidationMessages.length === 0;\n\n          return (\n',
    '          const structuredValidationMessages = getWeeklyCoachingValidationMessages(structuredDraft);\n          const canSaveStructuredLog = structuredValidationMessages.length === 0;\n          const visibilityMeta = getWeeklyCoachingVisibilityMeta(log.visibility);\n          const routingRecipients = buildWeeklyCoachingRecipients({\n            visibility: log.visibility,\n            employeeKey: `employee-${log.id}-${log.employeeEmail}`,\n            employeeLabel: `Employee copy · ${log.employeeEmail}`,\n            coachKey: `coach-${log.id}-${log.coachEmail}`,\n            coachLabel: `Coach copy · ${log.coachEmail}`,\n            supervisorKey: `supervisor-${log.id}-${log.supervisorEmail}`,\n            supervisorLabel: `Supervisor copy · ${log.supervisorEmail}`,\n            leadershipKey: log.managerOfSupervisorEmail ? `leadership-${log.id}-${log.managerOfSupervisorEmail}` : null,\n            leadershipLabel: log.managerOfSupervisorEmail ? `Optional leadership copy · ${log.managerOfSupervisorEmail}` : undefined,\n          });\n\n          return (\n',
    'timeline visibility meta and recipients',
)
views = replace_once(
    views,
    '                  {log.updatedAt !== log.createdAt ? <Badge className="rounded-full border-white/12 bg-white/8 text-slate-100">Updated {new Date(log.updatedAt).toLocaleDateString()}</Badge> : null}\n                  <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Linked review: {log.linkedReviewLogId ?? "Pending"}</Badge>\n',
    '                  {log.updatedAt !== log.createdAt ? <Badge className="rounded-full border-white/12 bg-white/8 text-slate-100">Updated {new Date(log.updatedAt).toLocaleDateString()}</Badge> : null}\n                  <Badge className={`rounded-full ${visibilityMeta.outlineClass}`}>{visibilityMeta.badgeLabel}</Badge>\n                  <Badge className="rounded-full border-cyan-400/20 bg-cyan-400/10 text-cyan-100">Linked review: {log.linkedReviewLogId ?? "Pending"}</Badge>\n',
    'timeline visibility badge',
)
views = replace_once(
    views,
    '                    {([\n                      { key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` },\n                      { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },\n                      { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },\n                      log.managerOfSupervisorEmail\n                        ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }\n                        : null,\n                    ].filter(Boolean) as { key: string; label: string }[]).map((recipient) => (\n',
    '                    {routingRecipients.map((recipient) => (\n',
    'timeline routing recipients helper',
)
views = replace_regex(
    views,
    r'      <div id="coach-overview" className="grid gap-6 xl:grid-cols-\[1\.02fr_0\.98fr\] scroll-mt-24">.*?      <WeeklyCoachingLogDetailDialog',
    '''      <div id="coach-overview" className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr] scroll-mt-24">
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
          <Card className="rounded-[2rem] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-950">Coach control surface</CardTitle>
                  <CardDescription className="mt-2 max-w-xl text-slate-600">Keep the coach page short, then jump into the focused mode that carries the full queue, detail, and drill-down when you need it.</CardDescription>
                </div>
                <Badge className="rounded-full border-slate-200 bg-slate-100 text-slate-700">Overview first · detail on demand</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                type="button"
                onClick={openCoachDocumentationLane}
                className="w-full rounded-[1.45rem] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Documentation mode</p>
                    <h3 className="mt-2 text-base font-semibold text-slate-950">Coach needs now live inside Documentation mode</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Open the documentation tab to review coaching summaries, exact log drill-downs, and the current coach-needs queue without stacking another long overview rail.</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-slate-500" />
                </div>
              </button>
              <button
                type="button"
                onClick={openCoachAlertsLane}
                className="w-full rounded-[1.45rem] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Alerts mode</p>
                    <h3 className="mt-2 text-base font-semibold text-slate-950">Alerts mode keeps the coach queue compact until detail is needed.</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Jump into the alerts tab for the full feed and selected detail instead of parking a second alert stack under the overview.</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-slate-500" />
                </div>
              </button>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.45rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Queued documentation focus</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedCoachNeedEntry?.title ?? coachNeedEntries[0]?.title ?? "No coaching documentation queued yet."}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedCoachNeedEntry?.summary ?? coachNeedEntries[0]?.summary ?? "The documentation tab will surface the next coaching summary, evidence handoff, or linked review as soon as it is available."}</p>
                </div>
                <div className="rounded-[1.45rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Active alert focus</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{selectedAlert?.title ?? overviewAlerts[0]?.title ?? "No active coach alerts queued."}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedAlert?.detail ?? overviewAlerts[0]?.detail ?? "The alerts tab keeps the current recommendation and timestamp in one focused review panel."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.7rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.95))] px-5 py-5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_20px_45px_rgba(15,23,42,0.18)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Current learner focus</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">{data.directLearner.name}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{data.directLearner.title} · {data.activeJourney.title}</p>
            </div>
            <div className="rounded-[1.7rem] border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.9))] px-5 py-5 text-slate-950 shadow-[0_20px_45px_rgba(16,185,129,0.14)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Coach momentum</p>
              <p className="mt-2 text-base font-semibold text-slate-950">{data.weeklyCoachingLogs.length} structured logs and {data.coachingSessions.length} active coaching threads are ready.</p>
              <p className="mt-3 text-sm leading-6 text-emerald-900/80">Keep the log, next action, and follow-up visible without expanding into a long vertical briefing.</p>
            </div>
          </div>
        </div>
      </div>

      <WeeklyCoachingLogDetailDialog''',
    'coach overview consolidation',
)
views = replace_regex(
    views,
    r'        <TabsContent value="documentation" id="coach-documentation-feed" className="mt-0 grid gap-6 xl:grid-cols-\[0\.95fr_1\.05fr\] scroll-mt-24">.*?        </TabsContent>',
    '''        <TabsContent value="documentation" id="coach-documentation-feed" className="mt-0 grid gap-6 xl:grid-cols-[0.95fr_1.05fr] scroll-mt-24">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border border-slate-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.96))] shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
              <CardHeader>
                <CardTitle className="text-slate-950">Coach needs now live inside Documentation mode</CardTitle>
                <CardDescription className="mt-2 text-slate-600">Open the full coaching-summary and documentation queue here so the overview can stay short while the detail panel remains one click away.</CardDescription>
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
        </TabsContent>''',
    'coach documentation tab consolidation',
)
write('client/src/pages/EnableOSViews.tsx', views)

print('Applied latest coach feedback patches successfully.')

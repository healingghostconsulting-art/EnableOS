from pathlib import Path

ROOT = Path('/home/ubuntu/chcg-enableos-demo')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Missing expected snippet for {label}')
    return text.replace(old, new, 1)


# --- server/demoPlatform.ts ---
demo_platform_path = ROOT / 'server' / 'demoPlatform.ts'
demo_platform = demo_platform_path.read_text()

demo_platform = replace_once(
    demo_platform,
    'export type WeeklyCoachingLog = {\n',
    'export type WeeklyCoachingAttachment = {\n  id: string;\n  fileName: string;\n  mimeType: string;\n  fileUrl: string;\n  storageKey?: string;\n  sizeBytes: number;\n  uploadedAt: string;\n  uploadedByRole: "manager" | "coach" | "executive" | "client_admin";\n};\n\nexport type WeeklyCoachingLog = {\n',
    'weekly coaching attachment type insertion',
)

demo_platform = replace_once(
    demo_platform,
    '  linkedReviewLogId?: string;\n};',
    '  linkedReviewLogId?: string;\n  attachments: WeeklyCoachingAttachment[];\n};',
    'weekly coaching attachment field insertion',
)

demo_platform = replace_once(
    demo_platform,
    '  managerOfSupervisorEmail?: string;\n  agentTakeaways?: string;\n};',
    '  managerOfSupervisorEmail?: string;\n  agentTakeaways?: string;\n  attachments?: WeeklyCoachingAttachment[];\n};',
    'create weekly coaching input attachment field',
)

demo_platform = replace_once(
    demo_platform,
    'export type UpdateWeeklyCoachingLogInput = {\n  tenantId: string;\n  weeklyCoachingLogId: string;\n  sessionDate: string;\n  attendance: string;\n  followUpFromPrevious: string;\n  coachingComments: string;\n  smartGoalCommitment: string;\n  additionalSupport: string;\n  agentTakeaways?: string;\n};\n',
    'export type UpdateWeeklyCoachingLogInput = {\n  tenantId: string;\n  weeklyCoachingLogId: string;\n  sessionDate: string;\n  attendance: string;\n  followUpFromPrevious: string;\n  coachingComments: string;\n  smartGoalCommitment: string;\n  additionalSupport: string;\n  agentTakeaways?: string;\n};\n\nexport type AddWeeklyCoachingLogAttachmentsInput = {\n  tenantId: string;\n  weeklyCoachingLogId: string;\n  attachments: WeeklyCoachingAttachment[];\n};\n',
    'add weekly coaching attachment input type',
)

demo_platform = replace_once(
    demo_platform,
    '    updatedAt: "2026-04-20T14:30:00.000Z",\n    linkedReviewLogId: "review-1",\n  },',
    '    updatedAt: "2026-04-20T14:30:00.000Z",\n    linkedReviewLogId: "review-1",\n    attachments: [],\n  },',
    'seed weekly coaching attachments',
)

demo_platform = replace_once(
    demo_platform,
    '    updatedAt: createdAt,\n    linkedReviewLogId: review.id,\n  };',
    '    updatedAt: createdAt,\n    linkedReviewLogId: review.id,\n    attachments: input.attachments ?? [],\n  };',
    'create weekly coaching preserves attachments',
)

demo_platform = replace_once(
    demo_platform,
    '  existing.agentTakeaways = input.agentTakeaways ?? existing.agentTakeaways;\n  existing.updatedAt = new Date().toISOString();',
    '  existing.agentTakeaways = input.agentTakeaways ?? existing.agentTakeaways;\n  existing.attachments = existing.attachments ?? [];\n  existing.updatedAt = new Date().toISOString();',
    'update weekly coaching preserves attachments',
)

demo_platform = replace_once(
    demo_platform,
    '  return existing;\n}\n\nexport function createTenantCustomRole(input: CreateTenantCustomRoleInput) {\n',
    '  return existing;\n}\n\nexport function addWeeklyCoachingLogAttachments(input: AddWeeklyCoachingLogAttachmentsInput) {\n  const existing = weeklyCoachingLogs.find((entry) => entry.tenantId === input.tenantId && entry.id === input.weeklyCoachingLogId);\n\n  if (!existing) {\n    throw new Error(`Weekly coaching log not found for ${input.weeklyCoachingLogId}`);\n  }\n\n  existing.attachments = [...(existing.attachments ?? []), ...input.attachments];\n  existing.updatedAt = new Date().toISOString();\n\n  documentationEntries.unshift({\n    id: `doc-weekly-log-attachment-${documentationEntries.length + 1}`,\n    tenantId: input.tenantId,\n    subjectUserId: existing.subjectUserId,\n    sourceType: "coaching_summary",\n    title: `Weekly coaching attachment${input.attachments.length === 1 ? "" : "s"} added for ${existing.employeeName}`,\n    summary: `${input.attachments.length} attachment${input.attachments.length === 1 ? "" : "s"} added to the weekly coaching record.`,\n    createdAt: existing.updatedAt,\n    authoredByRole: existing.coachRole,\n    evidencePoints: [\n      `Weekly coaching log: ${existing.id}`,\n      ...input.attachments.map((attachment) => `Attachment: ${attachment.fileName}`),\n    ],\n    weeklyCoachingLogId: existing.id,\n  });\n\n  return existing;\n}\n\nexport function createTenantCustomRole(input: CreateTenantCustomRoleInput) {\n',
    'add weekly coaching attachments function',
)

demo_platform_path.write_text(demo_platform)


# --- server/routers/demo.ts ---
demo_router_path = ROOT / 'server' / 'routers' / 'demo.ts'
demo_router = demo_router_path.read_text()

demo_router = replace_once(
    demo_router,
    '  applyCoachingGuidance,\n',
    '  addWeeklyCoachingLogAttachments,\n  applyCoachingGuidance,\n',
    'demo router import add attachments helper',
)

demo_router = replace_once(
    demo_router,
    'const weeklyCoachingLogInput = z.object({\n  tenantId: z.string(),\n  subjectUserId: z.string(),\n  coachRole: z.enum(["manager", "coach", "executive", "client_admin"]),\n  sessionDate: z.string().min(8).max(40),\n  attendance: z.string().min(3).max(240),\n  followUpFromPrevious: z.string().min(5).max(1200),\n  coachingComments: z.string().min(5).max(1600),\n  smartGoalCommitment: z.string().min(5).max(800),\n  additionalSupport: z.string().min(3).max(600),\n  managerOfSupervisorEmail: z.string().email().optional(),\n  agentTakeaways: z.string().max(800).optional(),\n});\n',
    'const coachingAttachmentUploadInput = z.object({\n  fileName: z.string().min(1).max(180),\n  mimeType: z.string().min(1).max(160).optional(),\n  dataBase64: z.string().min(1).max(20_000_000),\n  sizeBytes: z.number().int().min(1).max(15 * 1024 * 1024),\n});\n\nconst weeklyCoachingLogInput = z.object({\n  tenantId: z.string(),\n  subjectUserId: z.string(),\n  coachRole: z.enum(["manager", "coach", "executive", "client_admin"]),\n  sessionDate: z.string().min(8).max(40),\n  attendance: z.string().min(3).max(240),\n  followUpFromPrevious: z.string().min(5).max(1200),\n  coachingComments: z.string().min(5).max(1600),\n  smartGoalCommitment: z.string().min(5).max(800),\n  additionalSupport: z.string().min(3).max(600),\n  managerOfSupervisorEmail: z.string().email().optional(),\n  agentTakeaways: z.string().max(800).optional(),\n  attachments: z.array(coachingAttachmentUploadInput).max(5).optional(),\n});\n',
    'weekly coaching log schema attachments',
)

demo_router = replace_once(
    demo_router,
    'const weeklyCoachingLogEditInput = z.object({\n  tenantId: z.string(),\n  weeklyCoachingLogId: z.string(),\n  sessionDate: z.string().min(8).max(40),\n  attendance: z.string().min(3).max(240),\n  followUpFromPrevious: z.string().min(5).max(1200),\n  coachingComments: z.string().min(5).max(1600),\n  smartGoalCommitment: z.string().min(5).max(800),\n  additionalSupport: z.string().min(3).max(800),\n  agentTakeaways: z.string().max(800).optional(),\n});\n',
    'const weeklyCoachingLogEditInput = z.object({\n  tenantId: z.string(),\n  weeklyCoachingLogId: z.string(),\n  sessionDate: z.string().min(8).max(40),\n  attendance: z.string().min(3).max(240),\n  followUpFromPrevious: z.string().min(5).max(1200),\n  coachingComments: z.string().min(5).max(1600),\n  smartGoalCommitment: z.string().min(5).max(800),\n  additionalSupport: z.string().min(3).max(800),\n  agentTakeaways: z.string().max(800).optional(),\n});\n\nconst weeklyCoachingAttachmentAddInput = z.object({\n  tenantId: z.string(),\n  weeklyCoachingLogId: z.string(),\n  attachments: z.array(coachingAttachmentUploadInput).min(1).max(5),\n});\n',
    'weekly coaching attachment add schema',
)

demo_router = replace_once(
    demo_router,
    'function assertTenantMembership(openId: string | undefined, appRole: string | undefined, requestedTenantId: string | undefined) {\n  const grant = getAccessGrant(openId, appRole);\n\n  if (!grant) {\n    throw new TRPCError({ code: "FORBIDDEN", message: "No tenant access grant is configured for this user." });\n  }\n\n  const tenantId = requestedTenantId ?? grant.tenantId;\n  if (grant.role !== "platform_admin" && grant.tenantId !== tenantId) {\n    throw new TRPCError({ code: "FORBIDDEN", message: "Cross-tenant access is not allowed." });\n  }\n\n  return { grant, tenantId };\n}\n\nexport const demoRouter = router({\n',
    'function assertTenantMembership(openId: string | undefined, appRole: string | undefined, requestedTenantId: string | undefined) {\n  const grant = getAccessGrant(openId, appRole);\n\n  if (!grant) {\n    throw new TRPCError({ code: "FORBIDDEN", message: "No tenant access grant is configured for this user." });\n  }\n\n  const tenantId = requestedTenantId ?? grant.tenantId;\n  if (grant.role !== "platform_admin" && grant.tenantId !== tenantId) {\n    throw new TRPCError({ code: "FORBIDDEN", message: "Cross-tenant access is not allowed." });\n  }\n\n  return { grant, tenantId };\n}\n\nfunction sanitizeUploadFileName(fileName: string) {\n  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");\n}\n\nasync function uploadWeeklyCoachingAttachments(\n  tenantId: string,\n  uploadedByRole: "manager" | "coach" | "executive" | "client_admin",\n  attachments?: Array<z.infer<typeof coachingAttachmentUploadInput>>,\n) {\n  if (!attachments?.length) {\n    return [];\n  }\n\n  const batchTimestamp = Date.now();\n  const uploadedAt = new Date().toISOString();\n\n  return await Promise.all(attachments.map(async (attachment, index) => {\n    const safeFileName = sanitizeUploadFileName(attachment.fileName);\n    const upload = await storagePut(\n      `weekly-coaching-attachments/${tenantId}/${batchTimestamp}-${index + 1}-${safeFileName}`,\n      Buffer.from(attachment.dataBase64, "base64"),\n      attachment.mimeType || "application/octet-stream",\n    );\n\n    return {\n      id: `weekly-attachment-${batchTimestamp}-${index + 1}`,\n      fileName: attachment.fileName,\n      mimeType: attachment.mimeType || "application/octet-stream",\n      fileUrl: upload.url,\n      storageKey: upload.key,\n      sizeBytes: attachment.sizeBytes,\n      uploadedAt,\n      uploadedByRole,\n    };\n  }));\n}\n\nexport const demoRouter = router({\n',
    'weekly coaching attachment upload helper',
)

demo_router = replace_once(
    demo_router,
    '  previewCreateWeeklyCoachingLog: publicProcedure.input(weeklyCoachingLogInput).mutation(({ input }) => createWeeklyCoachingLog(input)),\n',
    '  previewCreateWeeklyCoachingLog: publicProcedure.input(weeklyCoachingLogInput).mutation(async ({ input }) => {\n    const attachments = await uploadWeeklyCoachingAttachments(input.tenantId, input.coachRole, input.attachments);\n    return createWeeklyCoachingLog({ ...input, attachments });\n  }),\n',
    'preview weekly coaching attachment upload mutation',
)

demo_router = replace_once(
    demo_router,
    '  secureCreateWeeklyCoachingLog: protectedProcedure.input(weeklyCoachingLogInput).mutation(({ ctx, input }) => {\n    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);\n\n    if (!["manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {\n      throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership roles can create weekly coaching logs." });\n    }\n\n    const coachRole = (grant.role === "platform_admin" ? input.coachRole : grant.role) as "manager" | "coach" | "executive" | "client_admin";\n    return createWeeklyCoachingLog({ ...input, tenantId, coachRole });\n  }),\n',
    '  secureCreateWeeklyCoachingLog: protectedProcedure.input(weeklyCoachingLogInput).mutation(async ({ ctx, input }) => {\n    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);\n\n    if (!["manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {\n      throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership roles can create weekly coaching logs." });\n    }\n\n    const coachRole = (grant.role === "platform_admin" ? input.coachRole : grant.role) as "manager" | "coach" | "executive" | "client_admin";\n    const attachments = await uploadWeeklyCoachingAttachments(tenantId, coachRole, input.attachments);\n    return createWeeklyCoachingLog({ ...input, tenantId, coachRole, attachments });\n  }),\n',
    'secure weekly coaching attachment upload mutation',
)

demo_router = replace_once(
    demo_router,
    '  secureUpdateWeeklyCoachingLog: protectedProcedure.input(weeklyCoachingLogEditInput).mutation(({ ctx, input }) => {\n    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);\n\n    if (!["manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {\n      throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership roles can edit weekly coaching logs." });\n    }\n\n    return updateWeeklyCoachingLog({ ...input, tenantId });\n  }),\n',
    '  secureUpdateWeeklyCoachingLog: protectedProcedure.input(weeklyCoachingLogEditInput).mutation(({ ctx, input }) => {\n    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);\n\n    if (!["manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {\n      throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership roles can edit weekly coaching logs." });\n    }\n\n    return updateWeeklyCoachingLog({ ...input, tenantId });\n  }),\n  secureAddWeeklyCoachingLogAttachments: protectedProcedure.input(weeklyCoachingAttachmentAddInput).mutation(async ({ ctx, input }) => {\n    const { grant, tenantId } = assertTenantMembership(ctx.user.openId, ctx.user.role, input.tenantId);\n\n    if (!["manager", "coach", "executive", "client_admin", "platform_admin"].includes(grant.role)) {\n      throw new TRPCError({ code: "FORBIDDEN", message: "Only leadership roles can attach files to weekly coaching logs." });\n    }\n\n    const uploadedByRole = (grant.role === "platform_admin" ? "client_admin" : grant.role) as "manager" | "coach" | "executive" | "client_admin";\n    const attachments = await uploadWeeklyCoachingAttachments(tenantId, uploadedByRole, input.attachments);\n    return addWeeklyCoachingLogAttachments({ ...input, tenantId, attachments });\n  }),\n',
    'secure add weekly coaching attachments mutation',
)

demo_router_path.write_text(demo_router)


# --- client/src/pages/EnableOSViews.tsx ---
views_path = ROOT / 'client' / 'src' / 'pages' / 'EnableOSViews.tsx'
views = views_path.read_text()

views = replace_once(
    views,
    'type WeeklyCoachingLogComposerProps = {\n',
    'type WeeklyCoachingUploadInput = {\n  fileName: string;\n  mimeType: string;\n  dataBase64: string;\n  sizeBytes: number;\n};\n\nconst WEEKLY_COACHING_ATTACHMENT_LIMIT = 5;\nconst WEEKLY_COACHING_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;\n\nasync function readWeeklyCoachingFileAsBase64(file: File) {\n  return await new Promise<string>((resolve, reject) => {\n    const reader = new FileReader();\n    reader.onload = () => {\n      const result = typeof reader.result === "string" ? reader.result : "";\n      resolve(result.includes(",") ? result.split(",")[1] ?? "" : result);\n    };\n    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));\n    reader.readAsDataURL(file);\n  });\n}\n\nasync function buildWeeklyCoachingAttachmentPayload(files: File[]) {\n  if (files.length > WEEKLY_COACHING_ATTACHMENT_LIMIT) {\n    throw new Error(`Attach up to ${WEEKLY_COACHING_ATTACHMENT_LIMIT} files per coaching log.`);\n  }\n\n  return await Promise.all(files.map(async (file) => {\n    if (file.size > WEEKLY_COACHING_ATTACHMENT_MAX_BYTES) {\n      throw new Error(`${file.name} exceeds the 15 MB attachment limit.`);\n    }\n\n    return {\n      fileName: file.name,\n      mimeType: file.type || "application/octet-stream",\n      dataBase64: await readWeeklyCoachingFileAsBase64(file),\n      sizeBytes: file.size,\n    } satisfies WeeklyCoachingUploadInput;\n  }));\n}\n\nfunction formatWeeklyCoachingAttachmentSize(sizeBytes: number) {\n  if (sizeBytes >= 1024 * 1024) {\n    return `${(sizeBytes / (1024 * 1024)).toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;\n  }\n\n  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;\n}\n\nfunction CoachingAttachmentList({\n  attachments,\n  emptyLabel = "No attachments added to this coaching log yet.",\n}: {\n  attachments?: Array<{\n    id: string;\n    fileName: string;\n    mimeType: string;\n    fileUrl: string;\n    sizeBytes: number;\n    uploadedAt: string;\n    uploadedByRole?: string;\n  }>;\n  emptyLabel?: string;\n}) {\n  if (!attachments?.length) {\n    return <p className="text-sm leading-6 text-slate-300">{emptyLabel}</p>;\n  }\n\n  return (\n    <div className="grid gap-3">\n      {attachments.map((attachment) => (\n        <a\n          key={attachment.id}\n          href={attachment.fileUrl}\n          target="_blank"\n          rel="noreferrer"\n          className="group flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-slate-950/80 px-4 py-3 transition hover:border-cyan-300/50 hover:bg-slate-950"\n        >\n          <div className="min-w-0">\n            <p className="truncate text-sm font-medium text-white">{attachment.fileName}</p>\n            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">\n              {attachment.mimeType || "application/octet-stream"} · {formatWeeklyCoachingAttachmentSize(attachment.sizeBytes)}\n            </p>\n            <p className="mt-1 text-xs text-slate-400">Uploaded {new Date(attachment.uploadedAt).toLocaleDateString()} by {String(attachment.uploadedByRole ?? "coach").replaceAll("_", " ")}</p>\n          </div>\n          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 transition group-hover:text-cyan-100">Open file</span>\n        </a>\n      ))}\n    </div>\n  );\n}\n\ntype WeeklyCoachingLogComposerProps = {\n',
    'weekly coaching attachment helper insertion',
)

views = replace_once(
    views,
    '  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));\n  const [attendance, setAttendance] = useState("");\n  const [followUpFromPrevious, setFollowUpFromPrevious] = useState("");\n  const [coachingComments, setCoachingComments] = useState("");\n  const [smartGoalCommitment, setSmartGoalCommitment] = useState("");\n  const [additionalSupport, setAdditionalSupport] = useState("");\n  const [agentTakeaways, setAgentTakeaways] = useState("");\n',
    '  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));\n  const [attendance, setAttendance] = useState("");\n  const [followUpFromPrevious, setFollowUpFromPrevious] = useState("");\n  const [coachingComments, setCoachingComments] = useState("");\n  const [smartGoalCommitment, setSmartGoalCommitment] = useState("");\n  const [additionalSupport, setAdditionalSupport] = useState("");\n  const [agentTakeaways, setAgentTakeaways] = useState("");\n  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);\n  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);\n  const [attachmentInputKey, setAttachmentInputKey] = useState(0);\n',
    'weekly coaching composer attachment state',
)

views = replace_once(
    views,
    '    onSuccess: () => {\n      setAttendance("");\n      setFollowUpFromPrevious("");\n      setCoachingComments("");\n      setSmartGoalCommitment("");\n      setAdditionalSupport("");\n      setAgentTakeaways("");\n      onCreated?.();\n    },\n  });\n',
    '    onSuccess: () => {\n      setAttendance("");\n      setFollowUpFromPrevious("");\n      setCoachingComments("");\n      setSmartGoalCommitment("");\n      setAdditionalSupport("");\n      setAgentTakeaways("");\n      setSelectedAttachments([]);\n      setAttachmentNotice(null);\n      setAttachmentInputKey((current) => current + 1);\n      onCreated?.();\n    },\n  });\n',
    'weekly coaching composer success reset attachments',
)

views = replace_once(
    views,
    '      <div className="mb-5 flex flex-wrap gap-2">\n        {shareTargets.map((target) => (\n          <Badge key={target.key} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target.label}</Badge>\n        ))}\n      </div>\n      <div className="grid gap-4 md:grid-cols-2">\n',
    '      <div className="mb-5 flex flex-wrap gap-2">\n        {shareTargets.map((target) => (\n          <Badge key={target.key} className="rounded-full border-white/10 bg-white/8 text-slate-200">{target.label}</Badge>\n        ))}\n      </div>\n      <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">\n        <div className="flex flex-wrap items-start justify-between gap-3">\n          <div>\n            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Attachments</p>\n            <p className="mt-2 text-sm leading-6 text-slate-300">Attach any file type to the coaching log for scorecards, screenshots, recordings, or supporting notes. Upload up to five files, 15 MB each.</p>\n          </div>\n          <label className="cursor-pointer rounded-full border border-white/12 bg-slate-950/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900">\n            Add supporting files\n            <input\n              key={attachmentInputKey}\n              type="file"\n              multiple\n              className="hidden"\n              onChange={(event) => {\n                const incomingFiles = Array.from(event.target.files ?? []);\n                if (!incomingFiles.length) {\n                  return;\n                }\n\n                const oversizedFiles = incomingFiles.filter((file) => file.size > WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);\n                const validFiles = incomingFiles.filter((file) => file.size <= WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);\n\n                setSelectedAttachments((current) => {\n                  const deduped = validFiles.filter((file) => !current.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));\n                  return [...current, ...deduped].slice(0, WEEKLY_COACHING_ATTACHMENT_LIMIT);\n                });\n\n                if (oversizedFiles.length) {\n                  setAttachmentNotice(`${oversizedFiles[0]?.name ?? "A file"} exceeds the 15 MB attachment limit.`);\n                } else if ((selectedAttachments.length + validFiles.length) > WEEKLY_COACHING_ATTACHMENT_LIMIT) {\n                  setAttachmentNotice(`Only the first ${WEEKLY_COACHING_ATTACHMENT_LIMIT} files will be attached.`);\n                } else {\n                  setAttachmentNotice(null);\n                }\n\n                event.currentTarget.value = "";\n              }}\n            />\n          </label>\n        </div>\n        {selectedAttachments.length ? (\n          <div className="mt-4 flex flex-wrap gap-2">\n            {selectedAttachments.map((file) => {\n              const fileKey = `${file.name}-${file.lastModified}-${file.size}`;\n              return (\n                <button\n                  key={fileKey}\n                  type="button"\n                  onClick={() => {\n                    setSelectedAttachments((current) => current.filter((entry) => `${entry.name}-${entry.lastModified}-${entry.size}` !== fileKey));\n                    setAttachmentNotice(null);\n                  }}\n                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-left text-xs text-cyan-100 transition hover:bg-cyan-400/16"\n                >\n                  {file.name} · {formatWeeklyCoachingAttachmentSize(file.size)} · Remove\n                </button>\n              );\n            })}\n          </div>\n        ) : (\n          <p className="mt-4 text-sm leading-6 text-slate-400">No attachment selected yet.</p>\n        )}\n      </div>\n      <div className="grid gap-4 md:grid-cols-2">\n',
    'weekly coaching composer attachment UI',
)

views = replace_once(
    views,
    '        <Button\n          type="button"\n          className="rounded-full bg-white text-slate-950 hover:bg-slate-100"\n          disabled={createWeeklyCoachingLog.isPending || !canSaveWeeklyCoachingLog}\n          onClick={() => createWeeklyCoachingLog.mutate({\n            tenantId,\n            subjectUserId,\n            coachRole,\n            sessionDate,\n            attendance: trimmedAttendance,\n            followUpFromPrevious: trimmedFollowUpFromPrevious,\n            coachingComments: trimmedCoachingComments,\n            smartGoalCommitment: trimmedSmartGoalCommitment,\n            additionalSupport: trimmedAdditionalSupport,\n            managerOfSupervisorEmail,\n            agentTakeaways: trimmedAgentTakeaways || undefined,\n          })}\n        >\n',
    '        <Button\n          type="button"\n          className="rounded-full bg-white text-slate-950 hover:bg-slate-100"\n          disabled={createWeeklyCoachingLog.isPending || !canSaveWeeklyCoachingLog}\n          onClick={async () => {\n            try {\n              setAttachmentNotice(null);\n              const attachments = await buildWeeklyCoachingAttachmentPayload(selectedAttachments);\n              await createWeeklyCoachingLog.mutateAsync({\n                tenantId,\n                subjectUserId,\n                coachRole,\n                sessionDate,\n                attendance: trimmedAttendance,\n                followUpFromPrevious: trimmedFollowUpFromPrevious,\n                coachingComments: trimmedCoachingComments,\n                smartGoalCommitment: trimmedSmartGoalCommitment,\n                additionalSupport: trimmedAdditionalSupport,\n                managerOfSupervisorEmail,\n                agentTakeaways: trimmedAgentTakeaways || undefined,\n                attachments: attachments.length ? attachments : undefined,\n              });\n            } catch (error) {\n              setAttachmentNotice(error instanceof Error ? error.message : "Unable to prepare the selected attachments.");\n            }\n          }}\n        >\n',
    'weekly coaching composer create mutation attachments',
)

views = replace_once(
    views,
    '          {!canSaveWeeklyCoachingLog ? <p className="text-amber-200">Complete the remaining required coaching fields before saving: {coachingValidationMessages.join(" ")}</p> : null}\n          {createWeeklyCoachingLog.isError ? <p className="text-rose-300">{createWeeklyCoachingLog.error.message}</p> : null}\n          {createWeeklyCoachingLog.isSuccess ? <p className="text-emerald-300">Weekly coaching log saved with learner and supervisor copy details.</p> : null}\n',
    '          {!canSaveWeeklyCoachingLog ? <p className="text-amber-200">Complete the remaining required coaching fields before saving: {coachingValidationMessages.join(" ")}</p> : null}\n          {attachmentNotice ? <p className="text-amber-200">{attachmentNotice}</p> : null}\n          {createWeeklyCoachingLog.isError ? <p className="text-rose-300">{createWeeklyCoachingLog.error.message}</p> : null}\n          {createWeeklyCoachingLog.isSuccess ? <p className="text-emerald-300">Weekly coaching log saved with learner, supervisor, and attachment details.</p> : null}\n',
    'weekly coaching composer attachment notice',
)

views = replace_once(
    views,
    '  const [editingLogId, setEditingLogId] = useState<string | null>(null);\n  const updateTakeaways = trpc.demo.secureUpdateWeeklyCoachingTakeaways.useMutation({\n',
    '  const [editingLogId, setEditingLogId] = useState<string | null>(null);\n  const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<Record<string, File[]>>({});\n  const [attachmentNoticeByLog, setAttachmentNoticeByLog] = useState<Record<string, string | null>>({});\n  const [attachmentInputKeys, setAttachmentInputKeys] = useState<Record<string, number>>({});\n  const updateTakeaways = trpc.demo.secureUpdateWeeklyCoachingTakeaways.useMutation({\n',
    'weekly coaching timeline attachment state',
)

views = replace_once(
    views,
    '  const updateStructuredLog = trpc.demo.secureUpdateWeeklyCoachingLog.useMutation({\n    onSuccess: () => {\n      setEditingLogId(null);\n      onUpdated?.();\n    },\n  });\n',
    '  const updateStructuredLog = trpc.demo.secureUpdateWeeklyCoachingLog.useMutation({\n    onSuccess: () => {\n      setEditingLogId(null);\n      onUpdated?.();\n    },\n  });\n  const addWeeklyCoachingAttachments = trpc.demo.secureAddWeeklyCoachingLogAttachments.useMutation({\n    onSuccess: (_, variables) => {\n      setPendingAttachmentFiles((current) => ({ ...current, [variables.weeklyCoachingLogId]: [] }));\n      setAttachmentNoticeByLog((current) => ({ ...current, [variables.weeklyCoachingLogId]: null }));\n      setAttachmentInputKeys((current) => ({ ...current, [variables.weeklyCoachingLogId]: (current[variables.weeklyCoachingLogId] ?? 0) + 1 }));\n      onUpdated?.();\n    },\n  });\n',
    'weekly coaching timeline add attachment mutation',
)

views = replace_once(
    views,
    '  useEffect(() => {\n    setTakeawayDrafts(Object.fromEntries(logs.map((log: any) => [log.id, log.agentTakeaways ?? ""])));\n    setStructuredLogDrafts(buildStructuredLogDrafts(logs));\n  }, [logs]);\n',
    '  useEffect(() => {\n    setTakeawayDrafts(Object.fromEntries(logs.map((log: any) => [log.id, log.agentTakeaways ?? ""])));\n    setStructuredLogDrafts(buildStructuredLogDrafts(logs));\n    setPendingAttachmentFiles((current) => Object.fromEntries(logs.map((log: any) => [log.id, current[log.id] ?? []])));\n    setAttachmentNoticeByLog((current) => Object.fromEntries(logs.map((log: any) => [log.id, current[log.id] ?? null])));\n    setAttachmentInputKeys((current) => Object.fromEntries(logs.map((log: any) => [log.id, current[log.id] ?? 0])));\n  }, [logs]);\n',
    'weekly coaching timeline sync attachment state',
)

views = replace_once(
    views,
    '                  <div className="mt-4 flex flex-wrap gap-2">\n                    {([\n                      { key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` },\n                      { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },\n                      { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },\n                      log.managerOfSupervisorEmail\n                        ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }\n                        : null,\n                    ].filter(Boolean) as { key: string; label: string }[]).map((recipient) => (\n                      <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-900/90 text-slate-100">{recipient.label}</Badge>\n                    ))}\n                  </div>\n                  <div className="mt-4 rounded-2xl border border-white/12 bg-slate-900/88 p-4">\n',
    '                  <div className="mt-4 flex flex-wrap gap-2">\n                    {([\n                      { key: `employee-${log.id}-${log.employeeEmail}`, label: `Employee copy · ${log.employeeEmail}` },\n                      { key: `coach-${log.id}-${log.coachEmail}`, label: `Coach copy · ${log.coachEmail}` },\n                      { key: `supervisor-${log.id}-${log.supervisorEmail}`, label: `Supervisor copy · ${log.supervisorEmail}` },\n                      log.managerOfSupervisorEmail\n                        ? { key: `leadership-${log.id}-${log.managerOfSupervisorEmail}`, label: `Optional leadership copy · ${log.managerOfSupervisorEmail}` }\n                        : null,\n                    ].filter(Boolean) as { key: string; label: string }[]).map((recipient) => (\n                      <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-900/90 text-slate-100">{recipient.label}</Badge>\n                    ))}\n                  </div>\n                  <div className="mt-4 rounded-2xl border border-white/12 bg-slate-900/88 p-4">\n                    <div className="flex flex-wrap items-start justify-between gap-3">\n                      <div>\n                        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Attachments</p>\n                        <p className="mt-2 text-sm leading-6 text-slate-300">Add any file type to keep screenshots, QA exports, or supporting evidence attached to the same coaching record.</p>\n                      </div>\n                      {allowLogEditing ? (\n                        <label className="cursor-pointer rounded-full border border-white/12 bg-slate-950/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-950">\n                          Add attachments\n                          <input\n                            key={attachmentInputKeys[log.id] ?? 0}\n                            type="file"\n                            multiple\n                            className="hidden"\n                            onChange={(event) => {\n                              const incomingFiles = Array.from(event.target.files ?? []);\n                              if (!incomingFiles.length) {\n                                return;\n                              }\n\n                              const oversizedFiles = incomingFiles.filter((file) => file.size > WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);\n                              const validFiles = incomingFiles.filter((file) => file.size <= WEEKLY_COACHING_ATTACHMENT_MAX_BYTES);\n\n                              setPendingAttachmentFiles((current) => {\n                                const currentFiles = current[log.id] ?? [];\n                                const deduped = validFiles.filter((file) => !currentFiles.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));\n                                return {\n                                  ...current,\n                                  [log.id]: [...currentFiles, ...deduped].slice(0, WEEKLY_COACHING_ATTACHMENT_LIMIT),\n                                };\n                              });\n\n                              if (oversizedFiles.length) {\n                                setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: `${oversizedFiles[0]?.name ?? "A file"} exceeds the 15 MB attachment limit.` }));\n                              } else if (((pendingAttachmentFiles[log.id] ?? []).length + validFiles.length) > WEEKLY_COACHING_ATTACHMENT_LIMIT) {\n                                setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: `Only the first ${WEEKLY_COACHING_ATTACHMENT_LIMIT} files will be attached.` }));\n                              } else {\n                                setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: null }));\n                              }\n\n                              event.currentTarget.value = "";\n                            }}\n                          />\n                        </label>\n                      ) : null}\n                    </div>\n                    <div className="mt-4">\n                      <CoachingAttachmentList attachments={log.attachments} />\n                    </div>\n                    {allowLogEditing ? (\n                      <div className="mt-4 space-y-3">\n                        {(pendingAttachmentFiles[log.id] ?? []).length ? (\n                          <div className="flex flex-wrap gap-2">\n                            {(pendingAttachmentFiles[log.id] ?? []).map((file) => {\n                              const fileKey = `${file.name}-${file.lastModified}-${file.size}`;\n                              return (\n                                <button\n                                  key={fileKey}\n                                  type="button"\n                                  onClick={() => {\n                                    setPendingAttachmentFiles((current) => ({\n                                      ...current,\n                                      [log.id]: (current[log.id] ?? []).filter((entry) => `${entry.name}-${entry.lastModified}-${entry.size}` !== fileKey),\n                                    }));\n                                    setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: null }));\n                                  }}\n                                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-left text-xs text-cyan-100 transition hover:bg-cyan-400/16"\n                                >\n                                  {file.name} · {formatWeeklyCoachingAttachmentSize(file.size)} · Remove\n                                </button>\n                              );\n                            })}\n                          </div>\n                        ) : (\n                          <p className="text-sm leading-6 text-slate-400">No new attachments selected for this record.</p>\n                        )}\n                        <div className="flex flex-wrap items-start gap-3">\n                          <Button\n                            type="button"\n                            className="rounded-full bg-white text-slate-950 hover:bg-slate-100"\n                            disabled={addWeeklyCoachingAttachments.isPending || !(pendingAttachmentFiles[log.id] ?? []).length}\n                            onClick={async () => {\n                              try {\n                                setAttachmentNoticeByLog((current) => ({ ...current, [log.id]: null }));\n                                const attachments = await buildWeeklyCoachingAttachmentPayload(pendingAttachmentFiles[log.id] ?? []);\n                                await addWeeklyCoachingAttachments.mutateAsync({\n                                  tenantId,\n                                  weeklyCoachingLogId: log.id,\n                                  attachments,\n                                });\n                              } catch (error) {\n                                setAttachmentNoticeByLog((current) => ({\n                                  ...current,\n                                  [log.id]: error instanceof Error ? error.message : "Unable to prepare the selected attachments.",\n                                }));\n                              }\n                            }}\n                          >\n                            {addWeeklyCoachingAttachments.isPending ? "Uploading..." : "Attach files to this log"}\n                          </Button>\n                          <div className="space-y-1 text-sm">\n                            {attachmentNoticeByLog[log.id] ? <p className="text-amber-200">{attachmentNoticeByLog[log.id]}</p> : null}\n                            <p className="text-slate-300">Existing attachments stay connected to the coaching record and documentation drill-down.</p>\n                          </div>\n                        </div>\n                      </div>\n                    ) : null}\n                  </div>\n                  <div className="mt-4 rounded-2xl border border-white/12 bg-slate-900/88 p-4">\n',
    'weekly coaching timeline attachment panel',
)

views = replace_once(
    views,
    '          <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">\n            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Shared copies</p>\n            <div className="flex flex-wrap gap-2">\n              {recipients.map((recipient) => (\n                <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-950/90 text-slate-100">{recipient.label}</Badge>\n              ))}\n            </div>\n          </div>\n',
    '          <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">\n            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Shared copies</p>\n            <div className="flex flex-wrap gap-2">\n              {recipients.map((recipient) => (\n                <Badge key={recipient.key} variant="outline" className="rounded-full border-white/12 bg-slate-950/90 text-slate-100">{recipient.label}</Badge>\n              ))}\n            </div>\n          </div>\n          <div className="space-y-3 rounded-2xl border border-white/12 bg-slate-900/88 p-4">\n            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Attachments</p>\n            <CoachingAttachmentList attachments={log.attachments} emptyLabel="No attachments were saved on this coaching log." />\n          </div>\n',
    'coaching detail dialog attachment list',
)

views_path.write_text(views)


# --- server/demo.router.test.ts ---
demo_router_test_path = ROOT / 'server' / 'demo.router.test.ts'
demo_router_test = demo_router_test_path.read_text()

demo_router_test = replace_once(
    demo_router_test,
    'import { describe, expect, it } from "vitest";\n',
    'import { beforeEach, describe, expect, it, vi } from "vitest";\n\nvi.mock("./storage", () => ({\n  storagePut: vi.fn(async (relKey: string) => ({\n    key: `mocked-${relKey.replace(/[^a-zA-Z0-9._/-]/g, "-")}`,\n    url: `/manus-storage/mocked-${relKey.replace(/[^a-zA-Z0-9._/-]/g, "-")}`,\n  })),\n}));\n\nconst { storagePut } = await import("./storage");\n',
    'demo router storage mock import',
)

demo_router_test = replace_once(
    demo_router_test,
    'describe("demo router", () => {\n',
    'describe("demo router", () => {\n  beforeEach(() => {\n    vi.clearAllMocks();\n  });\n',
    'demo router beforeEach mocks',
)

demo_router_test = replace_once(
    demo_router_test,
    '  it("allows leadership to create a secure weekly coaching log inside the assigned tenant", async () => {\n',
    '  it("stores coaching-log attachments when leadership creates a secure weekly coaching log", async () => {\n    const caller = appRouter.createCaller(\n      createContext({\n        openId: "atlas-manager",\n        role: "user",\n        name: "Enterprise Manager",\n      }),\n    );\n\n    const created = await caller.demo.secureCreateWeeklyCoachingLog({\n      tenantId: "atlas-operations",\n      subjectUserId: "u-learn-1",\n      coachRole: "manager",\n      sessionDate: "2026-05-01",\n      attendance: "Present and engaged.",\n      followUpFromPrevious: "The learner met the prior target and now needs to document the escalation reset phrase consistently.",\n      coachingComments: "Attached the latest QA worksheet and screenshot evidence to the weekly coaching record for the next review.",\n      smartGoalCommitment: "Use the escalation reset phrase on every monitored escalation call before 2026-05-08.",\n      additionalSupport: "Manager will attach supporting QA evidence and review it live in the next side-by-side.",\n      attachments: [\n        {\n          fileName: "qa-calibration-notes.pdf",\n          mimeType: "application/pdf",\n          dataBase64: "dGVzdC1wZGY=",\n          sizeBytes: 2048,\n        },\n      ],\n    });\n\n    expect(created.attachments).toEqual(\n      expect.arrayContaining([\n        expect.objectContaining({\n          fileName: "qa-calibration-notes.pdf",\n          mimeType: "application/pdf",\n          fileUrl: expect.stringContaining("/manus-storage/"),\n          uploadedByRole: "manager",\n        }),\n      ]),\n    );\n    expect(storagePut).toHaveBeenCalled();\n  });\n\n  it("allows leadership to create a secure weekly coaching log inside the assigned tenant", async () => {\n',
    'demo router create attachment test insertion',
)

demo_router_test = replace_once(
    demo_router_test,
    '  it("allows leadership to edit a secure weekly coaching log and propagates the updated structure", async () => {\n',
    '  it("allows leadership to append attachments to an existing weekly coaching log", async () => {\n    const caller = appRouter.createCaller(\n      createContext({\n        openId: "atlas-coach",\n        role: "user",\n        name: "Enterprise Coach Supervisor",\n      }),\n    );\n\n    const updated = await caller.demo.secureAddWeeklyCoachingLogAttachments({\n      tenantId: "atlas-operations",\n      weeklyCoachingLogId: "weekly-log-1",\n      attachments: [\n        {\n          fileName: "call-snippet.mp3",\n          mimeType: "audio/mpeg",\n          dataBase64: "YXVkaW8tdGVzdA==",\n          sizeBytes: 4096,\n        },\n      ],\n    });\n\n    expect(updated.attachments).toEqual(\n      expect.arrayContaining([\n        expect.objectContaining({\n          fileName: "call-snippet.mp3",\n          mimeType: "audio/mpeg",\n          fileUrl: expect.stringContaining("/manus-storage/"),\n          uploadedByRole: "coach",\n        }),\n      ]),\n    );\n\n    const coach = await caller.demo.secureCoach({ tenantId: "atlas-operations" });\n    expect(coach.weeklyCoachingLogs.find((entry: any) => entry.id === "weekly-log-1")?.attachments).toEqual(\n      expect.arrayContaining([\n        expect.objectContaining({ fileName: "call-snippet.mp3" }),\n      ]),\n    );\n  });\n\n  it("allows leadership to edit a secure weekly coaching log and propagates the updated structure", async () => {\n',
    'demo router append attachment test insertion',
)

demo_router_test_path.write_text(demo_router_test)


# --- server/enableosTrainingLayout.test.ts ---
layout_test_path = ROOT / 'server' / 'enableosTrainingLayout.test.ts'
layout_test = layout_test_path.read_text()

layout_test = replace_once(
    layout_test,
    '    expect(trainingViewSource).toContain("Complete the remaining required coaching fields before saving");\n    expect(trainingViewSource).toContain("Attendance needs a short status note.");\n',
    '    expect(trainingViewSource).toContain("Complete the remaining required coaching fields before saving");\n    expect(trainingViewSource).toContain("Attendance needs a short status note.");\n    expect(trainingViewSource).toContain("Add supporting files");\n    expect(trainingViewSource).toContain("Attach any file type to the coaching log");\n    expect(trainingViewSource).toContain("Attach files to this log");\n    expect(trainingViewSource).toContain("function CoachingAttachmentList");\n',
    'layout test coaching attachment assertions',
)

layout_test_path.write_text(layout_test)

print('Coaching-log attachment patch applied successfully.')

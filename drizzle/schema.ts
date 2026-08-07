import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "coach", "manager", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const tenants = mysqlTable("tenants", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  industry: varchar("industry", { length: 120 }).notNull(),
  preferredLabel: varchar("preferredLabel", { length: 160 }).notNull(),
  accent: varchar("accent", { length: 7 }).notNull(),
  logoMark: varchar("logoMark", { length: 8 }).notNull(),
  heroStatement: text("heroStatement").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tenantAccessGrants = mysqlTable("tenantAccessGrants", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  userOpenId: varchar("userOpenId", { length: 64 }).notNull(),
  workspaceRole: mysqlEnum("workspaceRole", ["executive", "manager", "learner", "client_admin", "platform_admin"]).notNull(),
  // Additive (Phase 1 hardening): NULL = active. A timestamp deactivates the seat —
  // the record is kept (never deleted) so it can be reactivated.
  deactivatedAt: timestamp("deactivated_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const documentationEntries = mysqlTable("documentationEntries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  subjectUserId: varchar("subjectUserId", { length: 64 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["journey_completion", "module_completion", "intervention_completion", "coaching_summary"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: text("summary").notNull(),
  authoredByRole: mysqlEnum("authoredByRole", ["system", "executive", "manager", "learner", "client_admin"]).notNull(),
  evidenceJson: text("evidenceJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reviewLogs = mysqlTable("reviewLogs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  subjectUserId: varchar("subjectUserId", { length: 64 }).notNull(),
  authorUserId: varchar("authorUserId", { length: 64 }).notNull(),
  authorRole: mysqlEnum("authorRole", ["executive", "manager", "client_admin"]).notNull(),
  reviewType: mysqlEnum("reviewType", ["one_on_one", "quarterly_check_in", "annual_review"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  notes: text("notes").notNull(),
  nextStep: text("nextStep").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;
export type TenantAccessGrant = typeof tenantAccessGrants.$inferSelect;
export type InsertTenantAccessGrant = typeof tenantAccessGrants.$inferInsert;
export type DocumentationEntry = typeof documentationEntries.$inferSelect;
export type InsertDocumentationEntry = typeof documentationEntries.$inferInsert;
export type ReviewLog = typeof reviewLogs.$inferSelect;
export type InsertReviewLog = typeof reviewLogs.$inferInsert;

/**
 * Authoring ContentStore override layer (PERSIST2). Per-item rows: one row per
 * (scope, tenant, content_type, collection_key, item_id, op). tenant_id '' = core;
 * item_id '' = set-level meta. payload is JSON.stringify of the op's data (NULL for
 * a hide row). Base/canonical content is code-seeded and never stored here.
 */
export const contentOverrides = mysqlTable("content_overrides", {
  id: int("id").autoincrement().primaryKey(),
  scope: mysqlEnum("scope", ["core", "tenant"]).notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull().default(""),
  contentType: varchar("content_type", { length: 48 }).notNull(),
  collectionKey: varchar("collection_key", { length: 191 }).notNull(),
  itemId: varchar("item_id", { length: 191 }).notNull().default(""),
  op: mysqlEnum("op", ["patch", "hide", "add", "meta"]).notNull(),
  payload: text("payload"),
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  naturalKey: unique("content_overrides_natural").on(table.scope, table.tenantId, table.contentType, table.collectionKey, table.itemId, table.op),
  lookup: index("content_overrides_lookup").on(table.scope, table.tenantId, table.contentType, table.collectionKey),
}));

export type ContentOverride = typeof contentOverrides.$inferSelect;
export type InsertContentOverride = typeof contentOverrides.$inferInsert;

/**
 * Notification delivery preferences (DELIVER2). Opt-out model: absence of a row
 * means "enabled". A row can disable a specific (reminderType, channel) pair —
 * use reminderType '' / channel '' as an "all" wildcard — or set unsubscribedAt
 * to globally suppress all delivery for that user/tenant (CAN-SPAM unsubscribe).
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  reminderType: varchar("reminder_type", { length: 48 }).notNull().default(""),
  channel: varchar("channel", { length: 16 }).notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  naturalKey: unique("notification_preferences_natural").on(table.userId, table.tenantId, table.reminderType, table.channel),
  lookup: index("notification_preferences_lookup").on(table.userId, table.tenantId),
}));

/**
 * Notification delivery outbox / idempotency log (DELIVER2). One row per unique
 * (source.refId + recipient + period) delivery attempt; the unique idempotencyKey
 * dedups repeat sends of the same reminder to the same recipient in the same
 * window. status records the outcome for audit.
 */
export const notificationOutbox = mysqlTable("notification_outbox", {
  id: int("id").autoincrement().primaryKey(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  reminderType: varchar("reminder_type", { length: 48 }).notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["stubbed", "sent", "failed", "skipped"]).notNull(),
  renderedSubject: varchar("rendered_subject", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  idemKey: unique("notification_outbox_idem").on(table.idempotencyKey),
}));

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
export type NotificationOutboxEntry = typeof notificationOutbox.$inferSelect;
export type InsertNotificationOutboxEntry = typeof notificationOutbox.$inferInsert;

/**
 * Scheduled coaching sessions / follow-ups (CAL5) — the first user-created,
 * persisted calendar records. `id` is the stable key that flows straight into the
 * calendar `refId` and the `.ics` UID. `start` is an ISO-8601 string the app owns;
 * `sequence` bumps on each reschedule/cancel so a re-sent invite updates (not
 * duplicates) the same UID. auditTrail/actionPlan are demo-narrative only and stay
 * in memory — the durable surface is exactly these columns.
 */
export const coachingSessionsTable = mysqlTable("coaching_sessions", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  coachUserId: varchar("coach_user_id", { length: 64 }).notNull(),
  managerUserId: varchar("manager_user_id", { length: 64 }).notNull(),
  learnerUserId: varchar("learner_user_id", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["coaching", "follow_up"]).notNull().default("coaching"),
  title: varchar("title", { length: 200 }).notNull(),
  start: varchar("start", { length: 40 }).notNull(), // ISO 8601, UTC
  durationMins: int("duration_mins").notNull().default(30),
  status: mysqlEnum("session_status", ["scheduled", "follow_up_due", "completed", "cancelled"]).notNull().default("scheduled"),
  sequence: int("sequence").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantLookup: index("coaching_sessions_tenant").on(table.tenantId),
}));

export type CoachingSessionRow = typeof coachingSessionsTable.$inferSelect;
export type InsertCoachingSessionRow = typeof coachingSessionsTable.$inferInsert;

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1 hardening — durable surfaces for the write flows that were previously
// optimistic-only. All additive; every mutation persists here only when
// DEMO_MODE=false (shouldPersist()), so the shared demo stays reset-friendly.
// ──────────────────────────────────────────────────────────────────────────────

/** Learner SMART goals (create/update). detail is nullable because MySQL TEXT cannot
 *  carry a column default; the app treats NULL as "". */
export const learnerGoals = mysqlTable("learner_goals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  learnerUserId: varchar("learner_user_id", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  detail: text("detail"),
  status: mysqlEnum("goal_status", ["active", "achieved", "archived"]).notNull().default("active"),
  targetDate: varchar("target_date", { length: 40 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantLookup: index("learner_goals_tenant").on(table.tenantId, table.learnerUserId),
}));

/** Invited members (admin → Users). An invite is durable, but the person cannot sign in
 *  until a managed IdP exists (demo OAuth mints openIds for real Manus users only) — see
 *  the AUTH SEAM note. status flips to "accepted" when the IdP provisions the account. */
export const tenantUserInvites = mysqlTable("tenant_user_invites", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  workspaceRole: mysqlEnum("invite_workspace_role", ["executive", "manager", "coach", "learner", "client_admin"]).notNull(),
  status: mysqlEnum("invite_status", ["invited", "accepted", "revoked"]).notNull().default("invited"),
  invitedByOpenId: varchar("invited_by_open_id", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantEmail: unique("tenant_user_invites_natural").on(table.tenantId, table.email),
}));

/** Tenant-defined custom roles (admin → Roles & Access). Narrow-only: a custom role
 *  inherits a base role's workspaces and can only be restricted (enforced server-side). */
export const tenantCustomRoles = mysqlTable("tenant_custom_roles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  baseRole: mysqlEnum("base_role", ["executive", "manager", "coach", "learner", "client_admin"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantLookup: index("tenant_custom_roles_tenant").on(table.tenantId),
}));

/** The narrowed workspace grant set for a custom role — one row per granted workspace. */
export const tenantCustomRoleGrants = mysqlTable("tenant_custom_role_grants", {
  id: int("id").autoincrement().primaryKey(),
  customRoleId: varchar("custom_role_id", { length: 64 }).notNull(),
  workspacePath: varchar("workspace_path", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  naturalKey: unique("tenant_custom_role_grants_natural").on(table.customRoleId, table.workspacePath),
}));

export type LearnerGoalRow = typeof learnerGoals.$inferSelect;
export type InsertLearnerGoalRow = typeof learnerGoals.$inferInsert;
export type TenantUserInviteRow = typeof tenantUserInvites.$inferSelect;
export type InsertTenantUserInviteRow = typeof tenantUserInvites.$inferInsert;
export type TenantCustomRoleRow = typeof tenantCustomRoles.$inferSelect;
export type InsertTenantCustomRoleRow = typeof tenantCustomRoles.$inferInsert;
export type TenantCustomRoleGrantRow = typeof tenantCustomRoleGrants.$inferSelect;
export type InsertTenantCustomRoleGrantRow = typeof tenantCustomRoleGrants.$inferInsert;

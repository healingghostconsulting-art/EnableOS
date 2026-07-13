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

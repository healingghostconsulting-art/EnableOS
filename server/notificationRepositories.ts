// ──────────────────────────────────────────────────────────────────────────────
// Notification persistence repositories (DELIVER2).
//
// Two repositories, each mirroring ContentOverrideRepository: an interface, an
// InMemory impl (default in tests, synchronous), a Drizzle impl (fire-and-forget
// writes, a no-op when there is no DB), a module-level binding, and a __set setter.
//   • NotificationOutboxRepository      — idempotency/audit log with dedup
//   • NotificationPreferencesRepository — per-user/tenant opt-out preferences
// The outbox keeps an in-process index so dedup works with or without a DB.
// ──────────────────────────────────────────────────────────────────────────────

import { and, eq } from "drizzle-orm";
import { notificationOutbox, notificationPreferences } from "../drizzle/schema";
import { getDb } from "./db";
import type { ReminderType } from "../shared/reminders";

// ── Outbox ──────────────────────────────────────────────────────────────────

export type OutboxStatus = "stubbed" | "sent" | "failed" | "skipped";

export interface OutboxRecord {
  idempotencyKey: string;
  reminderType: ReminderType;
  recipient: string;
  status: OutboxStatus;
  renderedSubject: string;
  createdAt: string; // ISO
}

/** Build the natural idempotency key: what + who + when-window. */
export function buildOutboxKey(refId: string, recipient: string, period: string): string {
  return `${refId}::${recipient}::${period}`;
}

export interface NotificationOutboxRepository {
  /** Read every row (boot hydration). Also primes the in-process dedup index. */
  loadAll(): Promise<OutboxRecord[]>;
  /** Record an attempt. Returns false if the key already exists (deduped, no write). */
  record(entry: OutboxRecord): boolean;
  /** Synchronous lookup from the in-process index. */
  find(idempotencyKey: string): OutboxRecord | null;
  /** Await in-flight fire-and-forget writes (tests / graceful shutdown). */
  flush(): Promise<void>;
}

/** In-memory outbox — deterministic, synchronous. */
export class InMemoryNotificationOutboxRepository implements NotificationOutboxRepository {
  protected seen = new Map<string, OutboxRecord>();

  async loadAll(): Promise<OutboxRecord[]> {
    return Array.from(this.seen.values()).map((row) => ({ ...row }));
  }
  record(entry: OutboxRecord): boolean {
    if (this.seen.has(entry.idempotencyKey)) return false;
    this.seen.set(entry.idempotencyKey, { ...entry });
    return true;
  }
  find(idempotencyKey: string): OutboxRecord | null {
    const row = this.seen.get(idempotencyKey);
    return row ? { ...row } : null;
  }
  async flush(): Promise<void> {
    // Synchronous; nothing to await.
  }
}

/**
 * Drizzle outbox. The in-process index (inherited) is the running source of truth
 * for dedup; DB writes are fire-and-forget and no-op without a database.
 */
export class DrizzleNotificationOutboxRepository extends InMemoryNotificationOutboxRepository {
  private pending = new Set<Promise<void>>();

  async loadAll(): Promise<OutboxRecord[]> {
    const db = await getDb();
    if (db) {
      try {
        const rows = await db.select().from(notificationOutbox);
        for (const row of rows) {
          this.seen.set(row.idempotencyKey, {
            idempotencyKey: row.idempotencyKey,
            reminderType: row.reminderType as ReminderType,
            recipient: row.recipient,
            status: row.status,
            renderedSubject: row.renderedSubject,
            createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
          });
        }
      } catch (error) {
        console.warn("[notify] outbox loadAll failed; starting empty:", error);
      }
    }
    return super.loadAll();
  }

  record(entry: OutboxRecord): boolean {
    const isNew = super.record(entry);
    if (isNew) this.persist(entry);
    return isNew;
  }

  private persist(entry: OutboxRecord): void {
    const task = (async () => {
      const db = await getDb();
      if (!db) return;
      try {
        await db
          .insert(notificationOutbox)
          .values({
            idempotencyKey: entry.idempotencyKey,
            reminderType: entry.reminderType,
            recipient: entry.recipient,
            status: entry.status,
            renderedSubject: entry.renderedSubject,
            createdAt: new Date(entry.createdAt),
          })
          .onDuplicateKeyUpdate({ set: { status: entry.status } });
      } catch (error) {
        console.warn("[notify] outbox persist failed (in-memory index is ahead of DB):", error);
      }
    })();
    this.pending.add(task);
    void task.finally(() => this.pending.delete(task));
  }

  async flush(): Promise<void> {
    await Promise.all(Array.from(this.pending));
  }
}

let outboxRepo: NotificationOutboxRepository = new DrizzleNotificationOutboxRepository();
export function getNotificationOutboxRepository(): NotificationOutboxRepository {
  return outboxRepo;
}
export function __setNotificationOutboxRepository(repo: NotificationOutboxRepository): void {
  outboxRepo = repo;
}

// ── Preferences ───────────────────────────────────────────────────────────────

export type PreferenceChannel = "email" | "calendar" | "";

export interface PreferenceRow {
  userId: string;
  tenantId: string;
  /** "" = applies to every reminder type. */
  reminderType: ReminderType | "";
  /** "" = applies to every channel. */
  channel: PreferenceChannel;
  enabled: boolean;
  /** ISO timestamp of a global unsubscribe, or null. */
  unsubscribedAt: string | null;
}

export interface NotificationPreferencesRepository {
  loadAll(): Promise<PreferenceRow[]>;
  /** Insert-or-replace a preference row by its natural key. */
  upsert(row: PreferenceRow): void;
  /** All rows for one user in one tenant (synchronous, from the in-process view). */
  list(userId: string, tenantId: string): PreferenceRow[];
  flush(): Promise<void>;
}

function samePrefKey(a: PreferenceRow, b: PreferenceRow): boolean {
  return a.userId === b.userId && a.tenantId === b.tenantId && a.reminderType === b.reminderType && a.channel === b.channel;
}

export class InMemoryNotificationPreferencesRepository implements NotificationPreferencesRepository {
  protected rows: PreferenceRow[] = [];

  async loadAll(): Promise<PreferenceRow[]> {
    return this.rows.map((row) => ({ ...row }));
  }
  upsert(row: PreferenceRow): void {
    const index = this.rows.findIndex((existing) => samePrefKey(existing, row));
    if (index >= 0) this.rows[index] = { ...row };
    else this.rows.push({ ...row });
  }
  list(userId: string, tenantId: string): PreferenceRow[] {
    return this.rows.filter((row) => row.userId === userId && row.tenantId === tenantId).map((row) => ({ ...row }));
  }
  async flush(): Promise<void> {
    // Synchronous.
  }
}

export class DrizzleNotificationPreferencesRepository extends InMemoryNotificationPreferencesRepository {
  private pending = new Set<Promise<void>>();

  async loadAll(): Promise<PreferenceRow[]> {
    const db = await getDb();
    if (db) {
      try {
        const dbRows = await db.select().from(notificationPreferences);
        this.rows = dbRows.map((row) => ({
          userId: row.userId,
          tenantId: row.tenantId,
          reminderType: row.reminderType as ReminderType | "",
          channel: row.channel as PreferenceChannel,
          enabled: Boolean(row.enabled),
          unsubscribedAt: row.unsubscribedAt instanceof Date ? row.unsubscribedAt.toISOString() : (row.unsubscribedAt ?? null),
        }));
      } catch (error) {
        console.warn("[notify] preferences loadAll failed; starting empty:", error);
      }
    }
    return super.loadAll();
  }

  upsert(row: PreferenceRow): void {
    super.upsert(row);
    const task = (async () => {
      const db = await getDb();
      if (!db) return;
      try {
        await db
          .insert(notificationPreferences)
          .values({
            userId: row.userId,
            tenantId: row.tenantId,
            reminderType: row.reminderType,
            channel: row.channel,
            enabled: row.enabled,
            unsubscribedAt: row.unsubscribedAt ? new Date(row.unsubscribedAt) : null,
          })
          .onDuplicateKeyUpdate({ set: { enabled: row.enabled, unsubscribedAt: row.unsubscribedAt ? new Date(row.unsubscribedAt) : null } });
      } catch (error) {
        console.warn("[notify] preferences persist failed:", error);
      }
    })();
    this.pending.add(task);
    void task.finally(() => this.pending.delete(task));
  }

  async flush(): Promise<void> {
    await Promise.all(Array.from(this.pending));
  }
}

let preferencesRepo: NotificationPreferencesRepository = new DrizzleNotificationPreferencesRepository();
export function getNotificationPreferencesRepository(): NotificationPreferencesRepository {
  return preferencesRepo;
}
export function __setNotificationPreferencesRepository(repo: NotificationPreferencesRepository): void {
  preferencesRepo = repo;
}

/**
 * Opt-out resolution: is delivery allowed for (type, channel) given a user's rows?
 * Absence of rows = enabled. A global unsubscribe wins. Otherwise the most specific
 * matching row decides; ties default to enabled.
 */
export function isDeliveryAllowed(rows: PreferenceRow[], reminderType: ReminderType, channel: Exclude<PreferenceChannel, "">): boolean {
  if (rows.some((row) => row.unsubscribedAt)) return false;
  const matches = rows.filter(
    (row) => (row.reminderType === reminderType || row.reminderType === "") && (row.channel === channel || row.channel === ""),
  );
  if (matches.length === 0) return true;
  const specificity = (row: PreferenceRow) => (row.reminderType !== "" ? 2 : 0) + (row.channel !== "" ? 1 : 0);
  const best = matches.reduce((top, row) => (specificity(row) > specificity(top) ? row : top), matches[0]!);
  return best.enabled;
}

// ──────────────────────────────────────────────────────────────────────────────
// Coaching-session persistence repository (CAL5).
//
// Mirrors the notification/content repository seam: an interface, an InMemory impl
// (default in tests, synchronous, seeded BY REFERENCE from the demo coachingSessions
// array so nothing regresses and created sessions also surface to the seed readers),
// a Drizzle impl (fire-and-forget write-through, hydrate-at-boot, a no-op without a
// DB), a module binding, and a __set setter.
//
// The durable surface is exactly the coaching_sessions columns. auditTrail/actionPlan
// are demo narrative and stay in memory (default [] on hydrate). `dueDate` is the
// canonical calendar date; `start` is its persisted ISO mirror.
// ──────────────────────────────────────────────────────────────────────────────

import { coachingSessionsTable, type CoachingSessionRow, type InsertCoachingSessionRow } from "../drizzle/schema";
import { getDb } from "./db";
import type { CoachingSession } from "./demoPlatform";

/** Serialize an in-memory session to a persistable row (drops demo-only narrative). */
export function coachingSessionToRow(session: CoachingSession): InsertCoachingSessionRow {
  return {
    id: session.id,
    tenantId: session.tenantId,
    coachUserId: session.coachUserId ?? session.managerUserId,
    managerUserId: session.managerUserId,
    learnerUserId: session.learnerUserId,
    type: session.type ?? (session.status === "follow_up_due" ? "follow_up" : "coaching"),
    title: session.title,
    start: session.start ?? session.dueDate,
    durationMins: session.durationMins ?? 30,
    status: session.status,
    sequence: session.sequence ?? 0,
    notes: session.notes ?? "",
  };
}

/** Rebuild an in-memory session from a persisted row (narrative resets to empty). */
export function coachingSessionFromRow(row: CoachingSessionRow): CoachingSession {
  const iso = (value: unknown): string =>
    value instanceof Date ? value.toISOString() : typeof value === "string" ? value : new Date(0).toISOString();
  return {
    id: row.id,
    tenantId: row.tenantId,
    managerUserId: row.managerUserId,
    coachUserId: row.coachUserId,
    learnerUserId: row.learnerUserId,
    type: row.type,
    title: row.title,
    status: row.status,
    dueDate: row.start, // the feed reads dueDate; the persisted column is `start`
    start: row.start,
    durationMins: row.durationMins,
    sequence: row.sequence,
    notes: row.notes ?? "",
    auditTrail: [],
    actionPlan: [],
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export interface CoachingSessionRepository {
  /** Read every row from the DB into the in-process store (boot hydration). */
  loadAll(): Promise<CoachingSession[]>;
  /** Synchronous read of the in-process store, optionally tenant-filtered. */
  list(tenantId?: string): CoachingSession[];
  find(id: string): CoachingSession | null;
  /** Append a session (write-through). */
  create(session: CoachingSession): CoachingSession;
  /** Patch a session by id (write-through). Returns null if not found. */
  update(id: string, patch: Partial<CoachingSession>): CoachingSession | null;
  /** Await in-flight fire-and-forget writes (tests / graceful shutdown). */
  flush(): Promise<void>;
}

/** In-memory repo. Seeded BY REFERENCE so appends are visible to the seed array. */
export class InMemoryCoachingSessionRepository implements CoachingSessionRepository {
  protected rows: CoachingSession[];
  constructor(seed: CoachingSession[] = []) {
    this.rows = seed;
  }
  async loadAll(): Promise<CoachingSession[]> {
    return this.rows.map((row) => ({ ...row }));
  }
  list(tenantId?: string): CoachingSession[] {
    return tenantId ? this.rows.filter((row) => row.tenantId === tenantId) : this.rows.slice();
  }
  find(id: string): CoachingSession | null {
    return this.rows.find((row) => row.id === id) ?? null;
  }
  create(session: CoachingSession): CoachingSession {
    this.rows.push(session);
    return session;
  }
  update(id: string, patch: Partial<CoachingSession>): CoachingSession | null {
    const row = this.rows.find((entry) => entry.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  }
  async flush(): Promise<void> {
    // Synchronous; nothing to await.
  }
}

/** Drizzle repo. The in-process store is the running source of truth; DB writes are
 *  fire-and-forget and no-op without a database. */
export class DrizzleCoachingSessionRepository extends InMemoryCoachingSessionRepository {
  private pending = new Set<Promise<void>>();

  async loadAll(): Promise<CoachingSession[]> {
    const db = await getDb();
    if (db) {
      try {
        const dbRows = await db.select().from(coachingSessionsTable);
        for (const row of dbRows) {
          if (!this.rows.some((existing) => existing.id === row.id)) this.rows.push(coachingSessionFromRow(row));
        }
      } catch (error) {
        console.warn("[coaching] loadAll failed; using seed only:", error);
      }
    }
    return super.loadAll();
  }

  create(session: CoachingSession): CoachingSession {
    const created = super.create(session);
    this.persist(created);
    return created;
  }

  update(id: string, patch: Partial<CoachingSession>): CoachingSession | null {
    const updated = super.update(id, patch);
    if (updated) this.persist(updated);
    return updated;
  }

  private persist(session: CoachingSession): void {
    const values = coachingSessionToRow(session);
    const task = (async () => {
      const db = await getDb();
      if (!db) return;
      try {
        await db.insert(coachingSessionsTable).values(values).onDuplicateKeyUpdate({
          set: {
            coachUserId: values.coachUserId,
            title: values.title,
            start: values.start,
            durationMins: values.durationMins,
            status: values.status,
            sequence: values.sequence,
            notes: values.notes,
            type: values.type,
          },
        });
      } catch (error) {
        console.warn("[coaching] persist failed (in-memory store is ahead of DB):", error);
      }
    })();
    this.pending.add(task);
    void task.finally(() => this.pending.delete(task));
  }

  async flush(): Promise<void> {
    await Promise.all(Array.from(this.pending));
  }
}

let repo: CoachingSessionRepository | null = null;

/** Create + install the default (Drizzle) repo, seeded by reference from the demo
 *  array. Called once by demoPlatform at module init. */
export function initCoachingSessionRepository(seed: CoachingSession[]): CoachingSessionRepository {
  repo = new DrizzleCoachingSessionRepository(seed);
  return repo;
}

export function getCoachingSessionRepository(): CoachingSessionRepository {
  if (!repo) repo = new DrizzleCoachingSessionRepository([]);
  return repo;
}

export function __setCoachingSessionRepository(next: CoachingSessionRepository): void {
  repo = next;
}

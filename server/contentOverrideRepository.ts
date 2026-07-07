import { and, eq } from "drizzle-orm";
import { contentOverrides } from "../drizzle/schema";
import { getDb } from "./db";

// PERSIST2: durable backing for the ContentStore override layer. One row per
// (scope, tenant, content_type, collection_key, item_id, op). Base content is
// code-seeded and never stored here. Writes are fire-and-forget (the in-memory
// Maps are the running source of truth); loadAll runs once at boot to hydrate.

export type OverrideOp = "patch" | "hide" | "add" | "meta";

export type OverrideRow = {
  scope: "core" | "tenant";
  tenantId: string; // "" = core
  contentType: string;
  collectionKey: string;
  itemId: string; // "" = set-level meta
  op: OverrideOp;
  payload: string | null; // JSON.stringify of the op data; null for a hide row
  position: number;
};

export type OverrideScopeKey = { scope: "core" | "tenant"; tenantId: string; contentType: string; collectionKey: string };
export type OverrideRowKey = OverrideScopeKey & { itemId: string; op: OverrideOp };

export interface ContentOverrideRepository {
  /** Read every override row (boot hydration only). */
  loadAll(): Promise<OverrideRow[]>;
  /** Insert-or-replace a row by its natural key. Fire-and-forget. */
  upsertRow(row: OverrideRow): void;
  /** Delete a single row by its full natural key (e.g. unhide → drop the hide row). */
  deleteRow(key: OverrideRowKey): void;
  /** Delete all rows for one item within a collection (e.g. remove → drop add + patch). */
  deleteItem(scopeKey: OverrideScopeKey, itemId: string): void;
}

function sameScope(row: OverrideRow, key: OverrideScopeKey): boolean {
  return row.scope === key.scope && row.tenantId === key.tenantId && row.contentType === key.contentType && row.collectionKey === key.collectionKey;
}
function sameRow(row: OverrideRow, key: OverrideRowKey): boolean {
  return sameScope(row, key) && row.itemId === key.itemId && row.op === key.op;
}

/** In-memory repository for tests — synchronous, deterministic (insertion-ordered). */
export class InMemoryContentOverrideRepository implements ContentOverrideRepository {
  private rows: OverrideRow[] = [];

  async loadAll(): Promise<OverrideRow[]> {
    return this.rows.map((row) => ({ ...row }));
  }
  upsertRow(row: OverrideRow): void {
    const index = this.rows.findIndex((existing) => sameRow(existing, row));
    if (index >= 0) {
      this.rows[index] = { ...row };
    } else {
      this.rows.push({ ...row });
    }
  }
  deleteRow(key: OverrideRowKey): void {
    this.rows = this.rows.filter((row) => !sameRow(row, key));
  }
  deleteItem(scopeKey: OverrideScopeKey, itemId: string): void {
    this.rows = this.rows.filter((row) => !(sameScope(row, scopeKey) && row.itemId === itemId));
  }
}

/** Drizzle/MySQL repository. Guarded by getDb() and try/catch — a no-op when the DB is unavailable. */
export class DrizzleContentOverrideRepository implements ContentOverrideRepository {
  async loadAll(): Promise<OverrideRow[]> {
    const db = await getDb();
    if (!db) return [];
    try {
      const rows = await db.select().from(contentOverrides).orderBy(contentOverrides.position, contentOverrides.id);
      return rows.map((row) => ({
        scope: row.scope,
        tenantId: row.tenantId,
        contentType: row.contentType,
        collectionKey: row.collectionKey,
        itemId: row.itemId,
        op: row.op,
        payload: row.payload ?? null,
        position: row.position,
      }));
    } catch (error) {
      console.warn("[ContentStore] loadAll failed; starting with base content only:", error);
      return [];
    }
  }

  private run(work: (db: NonNullable<Awaited<ReturnType<typeof getDb>>>) => Promise<void>): void {
    void (async () => {
      const db = await getDb();
      if (!db) return;
      try {
        await work(db);
      } catch (error) {
        console.warn("[ContentStore] persist failed (in-memory state is ahead of DB):", error);
      }
    })();
  }

  upsertRow(row: OverrideRow): void {
    this.run(async (db) => {
      await db
        .insert(contentOverrides)
        .values({
          scope: row.scope,
          tenantId: row.tenantId,
          contentType: row.contentType,
          collectionKey: row.collectionKey,
          itemId: row.itemId,
          op: row.op,
          payload: row.payload,
          position: row.position,
        })
        .onDuplicateKeyUpdate({ set: { payload: row.payload, position: row.position } });
    });
  }
  deleteRow(key: OverrideRowKey): void {
    this.run(async (db) => {
      await db.delete(contentOverrides).where(and(
        eq(contentOverrides.scope, key.scope),
        eq(contentOverrides.tenantId, key.tenantId),
        eq(contentOverrides.contentType, key.contentType),
        eq(contentOverrides.collectionKey, key.collectionKey),
        eq(contentOverrides.itemId, key.itemId),
        eq(contentOverrides.op, key.op),
      ));
    });
  }
  deleteItem(scopeKey: OverrideScopeKey, itemId: string): void {
    this.run(async (db) => {
      await db.delete(contentOverrides).where(and(
        eq(contentOverrides.scope, scopeKey.scope),
        eq(contentOverrides.tenantId, scopeKey.tenantId),
        eq(contentOverrides.contentType, scopeKey.contentType),
        eq(contentOverrides.collectionKey, scopeKey.collectionKey),
        eq(contentOverrides.itemId, itemId),
      ));
    });
  }
}

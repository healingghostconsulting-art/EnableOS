// ──────────────────────────────────────────────────────────────────────────────
// Admin / write-flow persistence (Phase 1 hardening).
//
// The durable surface for the flows that used to be optimistic-only: learner goals,
// branding, and the admin writes (invite / role-change / deactivate / custom-role
// grants). Mirrors the repository seam used elsewhere in the server — an interface, an
// InMemory impl (default in tests, synchronous, assertable), a Drizzle impl (write-
// through, a no-op without a DB), a module binding, and a __set setter.
//
// The mutations only touch this layer when shouldPersist() (DEMO_MODE=false); in the
// shared demo they run the in-memory/optimistic path and never persist, so the demo
// stays reset-friendly. Reads here are the PROD durable surface and return [] in the
// demo, so prod dashboards can merge them without changing demo output.
// ──────────────────────────────────────────────────────────────────────────────

import { and, eq } from "drizzle-orm";
import {
  learnerGoals, tenantAccessGrants, tenantCustomRoleGrants, tenantCustomRoles, tenants, tenantUserInvites,
} from "../drizzle/schema";
import { getDb } from "./db";

export interface GoalRecord {
  id: string;
  tenantId: string;
  learnerUserId: string;
  title: string;
  detail: string;
  status: "active" | "achieved" | "archived";
  targetDate: string | null;
}

export interface InviteRecord {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  workspaceRole: "executive" | "manager" | "coach" | "learner" | "client_admin";
  status: "invited" | "accepted" | "revoked";
  invitedByOpenId: string | null;
}

export interface CustomRoleRecord {
  id: string;
  tenantId: string;
  name: string;
  baseRole: "executive" | "manager" | "coach" | "learner" | "client_admin";
  description: string;
  grants: string[]; // narrowed workspace paths
}

export interface BrandingRecord {
  accent: string;
  logoMark: string;
  preferredLabel: string;
  heroStatement: string;
}

export interface AdminPersistence {
  saveGoal(row: GoalRecord): void;
  listGoals(tenantId: string, learnerUserId: string): GoalRecord[];
  createInvite(row: InviteRecord): void;
  listInvites(tenantId: string): InviteRecord[];
  /** Deactivate (or reactivate) a tenant seat by grant identity. */
  setGrantDeactivated(tenantId: string, userOpenId: string, deactivated: boolean): void;
  /** Change a member's workspace role on their tenant access grant. */
  setGrantRole(tenantId: string, userOpenId: string, role: string): void;
  saveCustomRole(row: CustomRoleRecord): void;
  listCustomRoles(tenantId: string): CustomRoleRecord[];
  saveBranding(tenantId: string, branding: BrandingRecord): void;
  getBranding(tenantId: string): BrandingRecord | null;
  /** Await in-flight fire-and-forget writes (tests / graceful shutdown). */
  flush(): Promise<void>;
}

// ── In-memory (tests + demo fallback) ─────────────────────────────────────────

export class InMemoryAdminPersistence implements AdminPersistence {
  protected goals = new Map<string, GoalRecord>();
  protected invites = new Map<string, InviteRecord>();
  protected deactivated = new Set<string>(); // `${tenantId}::${userOpenId}`
  protected grantRoles = new Map<string, string>(); // `${tenantId}::${userOpenId}` -> role
  protected customRoles = new Map<string, CustomRoleRecord>();
  protected branding = new Map<string, BrandingRecord>();

  saveGoal(row: GoalRecord): void { this.goals.set(row.id, { ...row }); }
  listGoals(tenantId: string, learnerUserId: string): GoalRecord[] {
    return Array.from(this.goals.values()).filter((g) => g.tenantId === tenantId && g.learnerUserId === learnerUserId).map((g) => ({ ...g }));
  }
  createInvite(row: InviteRecord): void { this.invites.set(`${row.tenantId}::${row.email}`, { ...row }); }
  listInvites(tenantId: string): InviteRecord[] {
    return Array.from(this.invites.values()).filter((i) => i.tenantId === tenantId).map((i) => ({ ...i }));
  }
  setGrantDeactivated(tenantId: string, userOpenId: string, deactivated: boolean): void {
    const key = `${tenantId}::${userOpenId}`;
    if (deactivated) this.deactivated.add(key); else this.deactivated.delete(key);
  }
  isDeactivated(tenantId: string, userOpenId: string): boolean { return this.deactivated.has(`${tenantId}::${userOpenId}`); }
  setGrantRole(tenantId: string, userOpenId: string, role: string): void { this.grantRoles.set(`${tenantId}::${userOpenId}`, role); }
  grantRoleOf(tenantId: string, userOpenId: string): string | null { return this.grantRoles.get(`${tenantId}::${userOpenId}`) ?? null; }
  saveCustomRole(row: CustomRoleRecord): void { this.customRoles.set(row.id, { ...row, grants: [...row.grants] }); }
  listCustomRoles(tenantId: string): CustomRoleRecord[] {
    return Array.from(this.customRoles.values()).filter((r) => r.tenantId === tenantId).map((r) => ({ ...r, grants: [...r.grants] }));
  }
  saveBranding(tenantId: string, branding: BrandingRecord): void { this.branding.set(tenantId, { ...branding }); }
  getBranding(tenantId: string): BrandingRecord | null { const b = this.branding.get(tenantId); return b ? { ...b } : null; }
  async flush(): Promise<void> { /* synchronous */ }
}

// ── Drizzle write-through (prod) ──────────────────────────────────────────────

export class DrizzleAdminPersistence extends InMemoryAdminPersistence {
  private pending = new Set<Promise<void>>();

  private track(run: () => Promise<void>): void {
    const task = run().catch((error) => console.warn("[adminPersistence] write failed:", error));
    this.pending.add(task);
    void task.finally(() => this.pending.delete(task));
  }

  saveGoal(row: GoalRecord): void {
    super.saveGoal(row);
    this.track(async () => {
      const db = await getDb();
      if (!db) return;
      await db.insert(learnerGoals).values({
        id: row.id, tenantId: row.tenantId, learnerUserId: row.learnerUserId,
        title: row.title, detail: row.detail, status: row.status, targetDate: row.targetDate,
      }).onDuplicateKeyUpdate({ set: { title: row.title, detail: row.detail, status: row.status, targetDate: row.targetDate } });
    });
  }

  createInvite(row: InviteRecord): void {
    super.createInvite(row);
    this.track(async () => {
      const db = await getDb();
      if (!db) return;
      await db.insert(tenantUserInvites).values({
        id: row.id, tenantId: row.tenantId, email: row.email, name: row.name,
        workspaceRole: row.workspaceRole, status: row.status, invitedByOpenId: row.invitedByOpenId,
      }).onDuplicateKeyUpdate({ set: { name: row.name, workspaceRole: row.workspaceRole, status: row.status } });
    });
  }

  setGrantDeactivated(tenantId: string, userOpenId: string, deactivated: boolean): void {
    super.setGrantDeactivated(tenantId, userOpenId, deactivated);
    this.track(async () => {
      const db = await getDb();
      if (!db) return;
      await db.update(tenantAccessGrants)
        .set({ deactivatedAt: deactivated ? new Date() : null })
        .where(and(eq(tenantAccessGrants.tenantId, tenantId), eq(tenantAccessGrants.userOpenId, userOpenId)));
    });
  }

  setGrantRole(tenantId: string, userOpenId: string, role: string): void {
    super.setGrantRole(tenantId, userOpenId, role);
    this.track(async () => {
      const db = await getDb();
      if (!db) return;
      await db.update(tenantAccessGrants)
        .set({ workspaceRole: role as "executive" | "manager" | "learner" | "client_admin" | "platform_admin" })
        .where(and(eq(tenantAccessGrants.tenantId, tenantId), eq(tenantAccessGrants.userOpenId, userOpenId)));
    });
  }

  saveCustomRole(row: CustomRoleRecord): void {
    super.saveCustomRole(row);
    this.track(async () => {
      const db = await getDb();
      if (!db) return;
      await db.insert(tenantCustomRoles).values({
        id: row.id, tenantId: row.tenantId, name: row.name, baseRole: row.baseRole, description: row.description,
      }).onDuplicateKeyUpdate({ set: { name: row.name, baseRole: row.baseRole, description: row.description } });
      // Replace the grant set: delete then insert the narrowed workspaces.
      await db.delete(tenantCustomRoleGrants).where(eq(tenantCustomRoleGrants.customRoleId, row.id));
      if (row.grants.length > 0) {
        await db.insert(tenantCustomRoleGrants).values(row.grants.map((workspacePath) => ({ customRoleId: row.id, workspacePath })));
      }
    });
  }

  saveBranding(tenantId: string, branding: BrandingRecord): void {
    super.saveBranding(tenantId, branding);
    this.track(async () => {
      const db = await getDb();
      if (!db) return;
      await db.update(tenants).set({
        accent: branding.accent, logoMark: branding.logoMark,
        preferredLabel: branding.preferredLabel, heroStatement: branding.heroStatement,
      }).where(eq(tenants.id, tenantId));
    });
  }

  async flush(): Promise<void> { await Promise.all(Array.from(this.pending)); }
}

let repo: AdminPersistence = new DrizzleAdminPersistence();
export function getAdminPersistence(): AdminPersistence { return repo; }
export function __setAdminPersistence(next: AdminPersistence): void { repo = next; }

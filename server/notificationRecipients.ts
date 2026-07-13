// ──────────────────────────────────────────────────────────────────────────────
// Notification recipient resolver (DELIVER2).
//
// Maps a Reminder + the viewing grant + tenant to a concrete {email,name}, or
// null when it cannot be resolved — in which case the caller skips and logs
// rather than guessing an address. Rule (ratified):
//   • learner-audience  → the subject's email (reminder.subjectUserId)
//   • coach/manager     → the viewer's email  (viewerGrant's role in the tenant)
// The default directory is backed by the demo seed, whose addresses are all
// non-routable *.demo — safe to "send" in stub mode.
// ──────────────────────────────────────────────────────────────────────────────

import type { Reminder } from "../shared/reminders";
import type { DemoAccessGrant, DemoRole } from "./demoPlatform";
import { findDemoUserById, findDemoUserByRole } from "./demoPlatform";

export interface Recipient {
  email: string;
  name: string;
}

/** Lookup surface the resolver depends on — injectable so tests stay hermetic. */
export interface RecipientDirectory {
  byId(userId: string, tenantId?: string): Recipient | null;
  byRole(role: string, tenantId?: string): Recipient | null;
}

export interface ResolverTenant {
  id: string;
}

const toRecipient = (user: { email: string; name: string } | null): Recipient | null =>
  user && user.email ? { email: user.email, name: user.name } : null;

/** Default directory — resolves against the demo seed (safe *.demo addresses). */
export const demoRecipientDirectory: RecipientDirectory = {
  byId: (userId, tenantId) => toRecipient(findDemoUserById(userId, tenantId)),
  byRole: (role, tenantId) => toRecipient(findDemoUserByRole(role as DemoRole, tenantId)),
};

/**
 * Resolve who should receive the email for this reminder. Returns null (and logs)
 * when no address is available — never a guessed or fallback recipient.
 */
export function resolveRecipient(
  reminder: Reminder,
  viewerGrant: DemoAccessGrant | null | undefined,
  tenant: ResolverTenant | null | undefined,
  directory: RecipientDirectory = demoRecipientDirectory,
): Recipient | null {
  const tenantId = tenant?.id ?? viewerGrant?.tenantId;

  let recipient: Recipient | null = null;
  if (reminder.audience === "learner") {
    // The subject IS the learner; prefer their precise id, fall back to the
    // viewing learner grant only when the reminder carries no subject (announcements).
    recipient =
      (reminder.subjectUserId ? directory.byId(reminder.subjectUserId, tenantId) : null) ??
      (viewerGrant ? directory.byRole(viewerGrant.role, tenantId) : null);
  } else {
    // coach | manager audience → the viewer receives it.
    recipient = viewerGrant ? directory.byRole(viewerGrant.role, tenantId) : null;
  }

  if (!recipient) {
    console.warn(
      `[notify] unresolved recipient for reminder ${reminder.id} (type=${reminder.type}, audience=${reminder.audience}); skipping.`,
    );
    return null;
  }
  return recipient;
}

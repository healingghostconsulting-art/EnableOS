// ──────────────────────────────────────────────────────────────────────────────
// Notification email templates (DELIVER2) — one per ReminderType.
//
// The plain-text body is the source of truth (deliverability + snapshot-testable);
// the HTML is a minimal, inline-styled mirror. Both are tenant-aware via
// TenantBranding (preferredLabel + accent) and carry a CAN-SPAM footer: a working
// unsubscribe link and a physical mailing address. Deep links are built from
// APP_PUBLIC_URL + reminder.deepLink so a click lands on the exact surface.
// ──────────────────────────────────────────────────────────────────────────────

import type { Reminder, ReminderType } from "./reminders";

export interface TemplateBranding {
  preferredLabel: string;
  accent: string;
}

export interface TemplateContext {
  reminder: Reminder;
  /** Display name of the human receiving the email. */
  recipientName: string;
  branding: TemplateBranding;
  /** Public origin (no trailing slash). Empty → relative links. */
  appPublicUrl: string;
  /** Fully-formed unsubscribe URL (CAN-SPAM). */
  unsubscribeUrl: string;
  /** Physical mailing address line (CAN-SPAM). */
  physicalAddress: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/** Per-type copy: the subject and the lead sentence. Everything else is shared frame. */
interface TemplateCopy {
  subject: (r: Reminder) => string;
  lead: (r: Reminder) => string;
  cta: string;
}

const TEMPLATES: Record<ReminderType, TemplateCopy> = {
  training_due: {
    subject: (r) => `Training due: ${r.subject}`,
    lead: (r) => r.reason,
    cta: "Open assigned training",
  },
  coaching_follow_up: {
    subject: (r) => `Coaching follow-up: ${r.subject}`,
    lead: (r) => r.reason,
    cta: "Review the follow-up",
  },
  one_on_one_scheduled: {
    subject: (r) => `Upcoming one-on-one: ${r.subject}`,
    lead: (r) => r.reason,
    cta: "See the session",
  },
  knowledge_check_failed: {
    subject: (r) => `Knowledge check needs attention: ${r.subject}`,
    lead: (r) => r.reason,
    cta: "Open the journey",
  },
  coaching_cadence_gap: {
    subject: (r) => `Coaching cadence gap: ${r.subject}`,
    lead: (r) => r.reason,
    cta: "Open coaching",
  },
  announcement: {
    subject: (r) => r.subject,
    lead: (r) => r.reason,
    cta: "Open EnableOS",
  },
};

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]!);
}

/** Build the deep-link URL from the public origin + the reminder's deepLink. */
export function buildDeepLinkUrl(appPublicUrl: string, reminder: Reminder): string {
  const base = (appPublicUrl || "").replace(/\/+$/, "");
  const link = reminder.deepLink;
  if (!link) return base || "/";
  const query = link.tab ? `?tab=${encodeURIComponent(link.tab)}` : "";
  const hash = link.sectionId ? `#${encodeURIComponent(link.sectionId)}` : "";
  return `${base}${link.route}${query}${hash}`;
}

/** Render a reminder into an email. Text is authoritative; HTML mirrors it. */
export function renderReminderEmail(ctx: TemplateContext): RenderedEmail {
  const { reminder, branding, recipientName, unsubscribeUrl, physicalAddress } = ctx;
  const template = TEMPLATES[reminder.type];
  const subject = template.subject(reminder);
  const lead = template.lead(reminder);
  const url = buildDeepLinkUrl(ctx.appPublicUrl, reminder);
  const dueLine = reminder.dueAt ? `\nWhen: ${new Date(reminder.dueAt).toUTCString()}` : "";

  // ── Plain text (source of truth) ────────────────────────────────────────────
  const text = [
    `${branding.preferredLabel}`,
    ``,
    `Hi ${recipientName},`,
    ``,
    lead,
    dueLine ? dueLine.trimStart() : ``,
    ``,
    `${template.cta}: ${url}`,
    ``,
    `— ${branding.preferredLabel}`,
    ``,
    `You are receiving this because you have an active EnableOS workspace role.`,
    `Unsubscribe: ${unsubscribeUrl}`,
    physicalAddress,
  ]
    .filter((line) => line !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  // ── Minimal inline-styled HTML mirror ───────────────────────────────────────
  const accent = branding.accent || "#0f172a";
  const html = [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">`,
    `<div style="border-top:4px solid ${escapeHtml(accent)};padding:16px 0;">`,
    `<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:0 0 4px;">${escapeHtml(branding.preferredLabel)}</p>`,
    `<h1 style="font-size:18px;margin:0 0 12px;">${escapeHtml(subject)}</h1>`,
    `</div>`,
    `<p style="font-size:15px;line-height:1.5;margin:0 0 8px;">Hi ${escapeHtml(recipientName)},</p>`,
    `<p style="font-size:15px;line-height:1.5;margin:0 0 12px;">${escapeHtml(lead)}</p>`,
    reminder.dueAt
      ? `<p style="font-size:14px;color:#475569;margin:0 0 16px;">When: ${escapeHtml(new Date(reminder.dueAt).toUTCString())}</p>`
      : ``,
    `<p style="margin:0 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;background:${escapeHtml(accent)};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">${escapeHtml(template.cta)}</a></p>`,
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />`,
    `<p style="font-size:12px;color:#94a3b8;line-height:1.5;margin:0;">You are receiving this because you have an active EnableOS workspace role.<br/>`,
    `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#94a3b8;">Unsubscribe</a><br/>`,
    `${escapeHtml(physicalAddress)}</p>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join("");

  return { subject, text, html };
}

/** All reminder types that have a template (i.e. all of them) — for iteration/tests. */
export const TEMPLATED_REMINDER_TYPES: ReminderType[] = Object.keys(TEMPLATES) as ReminderType[];

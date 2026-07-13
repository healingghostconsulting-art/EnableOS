// ──────────────────────────────────────────────────────────────────────────────
// Notification delivery provider seam (DELIVER2).
//
// Mirrors the ContentOverrideRepository swap pattern: an interface, a default
// binding, and a __set setter for tests. The default is StubProvider, which NEVER
// sends — it records what it would have sent and returns status "stubbed". The
// SesProvider only performs a real send when SES_* env is fully configured AND
// ALLOW_REAL_SEND is true; otherwise it is a logged no-op ("skipped"). So nothing
// leaves the process without an explicit, credentialed opt-in.
// ──────────────────────────────────────────────────────────────────────────────

import { ENV } from "./_core/env";

export interface EmailMessage {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export type DeliveryStatus = "stubbed" | "sent" | "failed" | "skipped";

export interface DeliveryResult {
  status: DeliveryStatus;
  provider: "stub" | "ses";
  /** Provider message id when a real send occurred. */
  messageId?: string;
  /** Populated when status is "failed" or "skipped". */
  detail?: string;
}

export interface NotificationDelivery {
  sendEmail(msg: EmailMessage): Promise<DeliveryResult>;
  /** Send an email with a calendar invite (.ics) attached. */
  sendCalendarInvite(msg: EmailMessage, ics: string): Promise<DeliveryResult>;
  /** Render-only preview path — never touches the network. */
  renderOnly(msg: EmailMessage): RenderedEmail;
}

export interface StubRecord {
  to: string;
  subject: string;
  text: string;
  html: string;
  hasCalendar: boolean;
  ics?: string;
}

/**
 * Default provider. Records every message to an in-memory outbox and returns
 * "stubbed" without sending. Safe for dev, tests, and any un-credentialed env.
 */
export class StubProvider implements NotificationDelivery {
  readonly records: StubRecord[] = [];

  async sendEmail(msg: EmailMessage): Promise<DeliveryResult> {
    this.records.push({ to: msg.to, subject: msg.subject, text: msg.text, html: msg.html, hasCalendar: false });
    return { status: "stubbed", provider: "stub" };
  }

  async sendCalendarInvite(msg: EmailMessage, ics: string): Promise<DeliveryResult> {
    this.records.push({ to: msg.to, subject: msg.subject, text: msg.text, html: msg.html, hasCalendar: true, ics });
    return { status: "stubbed", provider: "stub" };
  }

  renderOnly(msg: EmailMessage): RenderedEmail {
    return { subject: msg.subject, text: msg.text, html: msg.html };
  }

  /** Test helper — clear the recorded outbox. */
  reset(): void {
    this.records.length = 0;
  }
}

/** True only when every SES field is set AND the real-send gate is open. */
export function isSesConfigured(): boolean {
  return Boolean(ENV.allowRealSend && ENV.sesRegion && ENV.sesFromAddress);
}

/**
 * Amazon SES adapter. When SES is not fully configured (or ALLOW_REAL_SEND is
 * off) every call is a logged no-op returning "skipped" — it never sends. The
 * real transport is loaded lazily via a non-literal dynamic import so the SES SDK
 * is only required in environments that actually send (keeping it out of the
 * default dependency/build path until wired).
 */
export class SesProvider implements NotificationDelivery {
  private readonly moduleName = "@aws-sdk/client-sesv2";

  private skip(reason: string): DeliveryResult {
    console.warn(`[notify] SES no-op (${reason}); email not sent.`);
    return { status: "skipped", provider: "ses", detail: reason };
  }

  async sendEmail(msg: EmailMessage): Promise<DeliveryResult> {
    if (!isSesConfigured()) return this.skip("SES not configured or ALLOW_REAL_SEND is off");
    return this.transport(msg);
  }

  async sendCalendarInvite(msg: EmailMessage, ics: string): Promise<DeliveryResult> {
    if (!isSesConfigured()) return this.skip("SES not configured or ALLOW_REAL_SEND is off");
    return this.transport(msg, ics);
  }

  renderOnly(msg: EmailMessage): RenderedEmail {
    return { subject: msg.subject, text: msg.text, html: msg.html };
  }

  private async transport(msg: EmailMessage, _ics?: string): Promise<DeliveryResult> {
    try {
      // Non-literal specifier: typed `any`, not statically resolved, so the SES
      // SDK is an optional runtime dependency only needed when actually sending.
      const spec = this.moduleName;
      const aws: any = await import(spec);
      const client = new aws.SESv2Client({ region: ENV.sesRegion });
      const fromName = ENV.sesFromName || "EnableOS";
      const command = new aws.SendEmailCommand({
        FromEmailAddress: `${fromName} <${ENV.sesFromAddress}>`,
        Destination: { ToAddresses: [msg.to] },
        Content: {
          Simple: {
            Subject: { Data: msg.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: msg.text, Charset: "UTF-8" },
              Html: { Data: msg.html, Charset: "UTF-8" },
            },
          },
        },
      });
      const res = await client.send(command);
      return { status: "sent", provider: "ses", messageId: res?.MessageId };
    } catch (error) {
      console.error("[notify] SES send failed:", error);
      return { status: "failed", provider: "ses", detail: String(error) };
    }
  }
}

// ── Module-level binding + swap point (mirror of ContentOverrideRepository) ─────
let delivery: NotificationDelivery = new StubProvider();

/** The active delivery provider. */
export function getNotificationDelivery(): NotificationDelivery {
  return delivery;
}

/** Test/wiring seam: swap the delivery provider (e.g. a StubProvider or SesProvider). */
export function __setNotificationDelivery(provider: NotificationDelivery): void {
  delivery = provider;
}

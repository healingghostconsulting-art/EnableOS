# Notification Delivery — Post-Deploy Runbook

Email + calendar notification delivery for EnableOS (DELIVER2–5). This is the
operator checklist to turn the built pipeline on **after** the branch is merged and
the site is deployed. Until every step here is done the system is inert-by-design:
the default `StubProvider` records what it *would* send and nothing leaves the
process.

## What ships in the branch

- **Provider seam** (`server/notificationDelivery.ts`) — `StubProvider` (default,
  records to the outbox, never sends) and `SesProvider` (real send only when SES is
  fully configured **and** `ALLOW_REAL_SEND=true`; otherwise a logged no-op).
- **Templates + `.ics`** (`shared/notificationTemplates.ts`, `shared/ics.ts`) — one
  email per reminder type + a combined digest email; VEVENT invites for dated types.
- **Recipient resolver + repositories** (`server/notificationRecipients.ts`,
  `server/notificationRepositories.ts`) — outbox (idempotency/audit) and
  per-user/tenant preferences, in-memory + Drizzle (no-op without a DB) impls.
- **Event-triggered delivery** (`server/notificationService.ts`) wired into the
  retraining-assign, retraining-complete, and coaching-log mutations.
- **Admin surface** — a "Notifications" tab in the content authoring panel: outbox,
  rendered previews, and a preferences/opt-out editor.
- **Digest** (`server/notificationDigest.ts`) driven by the managed Heartbeat cron
  via `POST /api/scheduled/digest` (`server/scheduledDigest.ts`).

## Step 1 — Apply the database migration

The two tables ship as one additive migration:

- **`drizzle/0004_slippery_stature.sql`** — creates `notification_outbox`
  (unique `idempotency_key`) and `notification_preferences` (unique natural key
  `user_id, tenant_id, reminder_type, channel`; lookup index on `user_id, tenant_id`).

Apply it against the production database:

```sh
pnpm db:push        # drizzle-kit generate && drizzle-kit migrate
```

Without a DB the Drizzle repositories no-op and the in-process index still powers
dedup for the current process — but preferences and the outbox won't persist across
restarts, so apply the migration before relying on either.

## Step 2 — Set the base env

Required for correct deep links in emails (no trailing slash):

```
APP_PUBLIC_URL=https://<your-production-host>
```

Leave the SES + real-send vars unset for now (Step 5) — the system stays stubbed.

## Step 3 — Register the digest cron (after deploy)

The digest fires from the managed Manus **Heartbeat** cron, not an in-process timer
(timers are forbidden on the host). The site **must already be deployed** — bizserver
POSTs the production URL; dev sandboxes are unreachable.

`registerDigestJobs(sessionToken, { includeWeekly })` in `server/scheduledDigest.ts`
creates the jobs. It needs the **decoded `app_session_id` cookie value** of the owner/
admin issuing the call (not the raw Cookie header). It registers:

- **Daily** — cron `0 0 9 * * *` (09:00 UTC), `POST /api/scheduled/digest` body `{period:"daily"}`
- **Weekly** (optional) — cron `0 0 9 * * 1` (Mondays 09:00 UTC), body `{period:"weekly"}`

Persist the returned `task_uid`s if you'll later pause/update/delete the jobs
(`manus-heartbeat list` can also recover them). Alternatively create the same jobs
from a sandbox terminal with the project-owner identity:

```sh
manus-heartbeat create --name notification-digest-daily \
  --cron "0 0 9 * * *" --path /api/scheduled/digest \
  --description "Daily notification digest of pending reminders"
```

The endpoint is **cron-only**: it authenticates the caller via
`sdk.authenticateRequest` and requires `user.isCron` + `user.taskUid` (periodic-
updates.md §5c). Any non-cron request gets `403 {"error":"cron-only"}`.

## Step 4 — Verify live (still stubbed — safe)

1. **Trigger an event.** As a coach/manager, assign targeted retraining (or complete
   one, or log a weekly coaching session).
2. **Check the outbox.** Open the admin **Notifications** tab (CHCG Command or Client
   Control → content authoring → *Notifications*). You should see a new row with
   status **`stubbed`**, the recipient, the reminder type, and the rendered subject.
   Dated types (coaching follow-up / one-on-one) show a `.ics` in the preview.
3. **Digest (optional, on demand).** To run the digest without waiting for 09:00 UTC,
   set `ALLOW_MANUAL_DIGEST=true` and POST the guarded manual path:

   ```sh
   curl -X POST "$APP_PUBLIC_URL/api/scheduled/digest?manual=1" \
     -H "Content-Type: application/json" -d '{"period":"daily"}'
   ```

   Expect `{"ok":true,"period":"daily","recipients":N,"sent":N,...}`; a second call
   the same day returns `sent:0,deduped:N` (period-keyed idempotency). **Unset
   `ALLOW_MANUAL_DIGEST` again when done** — production digests should only fire from
   the authenticated cron.

Everything above is safe: the provider is still the Stub, so nothing is emailed.

## Step 5 — Turn on real SES sending (final, deliberate)

Only after Steps 1–4 look right. Two prerequisites are infra, not code:

- A **verified SES sending domain/identity** with SPF, DKIM, and DMARC configured
  (deliverability + not being blocked as spoofed). This is an infra task — no API
  keys belong in the repo.
- SES out of the sandbox (production access) if you need to email unverified
  recipients.

Then set all of:

```
SES_REGION=<aws-region, e.g. us-east-1>
SES_FROM_ADDRESS=<verified-from@your-domain>
SES_FROM_NAME=<display name, e.g. EnableOS>
ALLOW_REAL_SEND=true        # hard gate — must be exactly "true"
```

`ALLOW_REAL_SEND=true` **and** all three `SES_*` present is the only combination that
flips `isSesConfigured()` to true and lets `SesProvider` actually send. Anything
missing keeps it a no-op. Also make the `@aws-sdk/client-sesv2` package available in
production (it's loaded lazily so it isn't required until real sending is on), and
swap the active provider to `SesProvider` via the delivery seam.

Roll out cautiously — send to a seeded internal address first, watch SES bounce/
complaint metrics, then widen.

## Safety guarantees (asserted in tests)

- `server/notificationDelivery.e2e.test.ts` — one consolidated flow (event → outbox
  row + `.ics` → opt-out suppress → dedup → digest incl. computed types → digest
  dedup) **and** a named safety test proving that with no SES creds and
  `ALLOW_REAL_SEND` unset, nothing sends anywhere (Stub records, SES no-ops), even
  through the digest path.
- Idempotency: events key on `refId::recipient::YYYY-MM-DD`; digests on
  `digest-<period>::recipient::<YYYY-MM-DD | YYYY-Www>`. Re-runs never double-send.
- Recipients with no resolvable email are skipped and logged — never guessed.
- CAN-SPAM: every email carries a working unsubscribe link and a physical address.

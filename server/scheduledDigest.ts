// ──────────────────────────────────────────────────────────────────────────────
// Scheduled digest endpoint + Heartbeat job registration (DELIVER4).
//
// The managed Manus Heartbeat cron POSTs /api/scheduled/digest on a schedule; the
// handler authenticates the cron (periodic-updates.md §5c isCron/taskUid) and runs
// runDigest(). A guarded manual path (ENV.allowManualDigest + ?manual=1) lets a
// dev/admin fire it on demand to verify without waiting for the cron. NO in-process
// timer is used — timers are forbidden on the managed host.
// ──────────────────────────────────────────────────────────────────────────────

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { createHeartbeatJob } from "./_core/heartbeat";
import { runDigest, type DigestPeriod } from "./notificationDigest";

function resolvePeriod(req: Request): DigestPeriod {
  const raw = (req.body?.period ?? req.query?.period) as string | undefined;
  return raw === "weekly" ? "weekly" : "daily";
}

/** True only when the guarded manual trigger is explicitly enabled AND requested. */
function isManualTrigger(req: Request): boolean {
  return ENV.allowManualDigest && (req.query?.manual === "1" || req.body?.manual === true);
}

/**
 * POST /api/scheduled/digest — cron-only (or guarded manual). Rejects any request
 * that is neither an authenticated Heartbeat cron nor an explicitly-enabled manual
 * trigger. Errors are JSON-encoded on 500 for the platform Investigate flow.
 */
export async function digestHandler(req: Request, res: Response): Promise<Response> {
  try {
    if (!isManualTrigger(req)) {
      let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        user = null;
      }
      if (!user?.isCron || !user?.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }
    }

    const period = resolvePeriod(req);
    const summary = await runDigest(period);
    return res.json({ ok: true, ...summary });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Register the managed daily (and optional weekly) digest crons. Called post-deploy
 * with the owner/admin's decoded app_session_id — the site must be deployed first
 * (bizserver POSTs the production URL; dev sandboxes are unreachable). Persist the
 * returned task_uids if you'll later pause/update/delete the jobs.
 */
export async function registerDigestJobs(
  sessionToken: string,
  options: { includeWeekly?: boolean } = {},
): Promise<{ daily: string; weekly?: string }> {
  const daily = await createHeartbeatJob(
    {
      name: "notification-digest-daily",
      cron: "0 0 9 * * *", // 09:00 UTC every day (6-field, seconds first)
      path: "/api/scheduled/digest",
      payload: { period: "daily" },
      description: "Daily notification digest of pending reminders",
    },
    sessionToken,
  );

  if (options.includeWeekly === false) return { daily: daily.taskUid };

  const weekly = await createHeartbeatJob(
    {
      name: "notification-digest-weekly",
      cron: "0 0 9 * * 1", // 09:00 UTC Mondays
      path: "/api/scheduled/digest",
      payload: { period: "weekly" },
      description: "Weekly notification digest of pending reminders",
    },
    sessionToken,
  );

  return { daily: daily.taskUid, weekly: weekly.taskUid };
}

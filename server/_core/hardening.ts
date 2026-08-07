import type { NextFunction, Request, Response } from "express";

// Phase 3 hardening — security headers + an in-process API rate limiter. No new
// dependency (helmet's useful headers are a few setHeader calls; the limiter is a
// fixed-window counter). Tuned NOT to affect the live demo: the safe headers are inert
// for a same-origin SPA, CSP ships Report-Only by default, and the limiter is generous
// and scoped to the tRPC API only.

// ── Security headers ──────────────────────────────────────────────────────────

// Permissive by design so it never breaks the built SPA (inline styles, the bundle,
// data/blob assets, the API over https/wss), while still shutting down the cheap wins:
// object injection, base-tag hijacking, and cross-origin framing (clickjacking).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: data: https:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Always-safe, enforced everywhere.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");

  // HTTPS-only headers, production only.
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    // CSP is Report-Only until validated against the live build (set CSP_ENFORCE=true to
    // enforce). Report-Only never blocks, so it can't break the demo.
    const header = process.env.CSP_ENFORCE === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
    res.setHeader(header, CSP);
  }
  next();
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
/** Read at call time so it can be tuned by env per deploy (and flipped in tests). */
function maxRequests(): number { return Number(process.env.RATE_LIMIT_PER_MIN ?? 300); }

/** Reset the in-process counters (tests). */
export function __resetRateLimiter(): void { buckets.clear(); }

function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : (fwd ?? "").split(",")[0];
  return (first || "").trim() || req.socket?.remoteAddress || "unknown";
}

/** Fixed-window per-IP limiter for the tRPC API. Generous by default (300/min) so a
 *  normal batched page load never trips it; returns 429 with Retry-After past the cap. */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now();
  const ip = clientIp(req);
  let bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
    // Opportunistic sweep so the map can't grow unbounded across many client IPs.
    if (buckets.size > 5000) {
      buckets.forEach((b, key) => { if (now >= b.resetAt) buckets.delete(key); });
    }
  }
  bucket.count += 1;
  const max = maxRequests();
  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
  if (bucket.count > max) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  next();
}

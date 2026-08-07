import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { rateLimit, securityHeaders, __resetRateLimiter } from "./_core/hardening";

// Phase 3 hardening — security headers + the in-process rate limiter. Pure middleware
// unit tests with minimal fake req/res (no HTTP server needed).

function fakeRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    setHeader(k: string, v: string) { headers[k] = v; },
    status(code: number) { (res as any).statusCode = code; return res; },
    json(_body: unknown) { return res; },
  } as unknown as Response & { statusCode: number };
  return { res, headers };
}
function fakeReq(ip = "1.2.3.4"): Request {
  return { headers: {}, socket: { remoteAddress: ip } } as unknown as Request;
}

describe("securityHeaders", () => {
  const prev = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = prev; });

  it("sets the always-safe headers", () => {
    const { res, headers } = fakeRes();
    const next = vi.fn();
    securityHeaders(fakeReq(), res, next as unknown as NextFunction);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(next).toHaveBeenCalled();
  });

  it("adds HSTS + CSP (Report-Only by default) only in production", () => {
    const { res, headers } = fakeRes();
    process.env.NODE_ENV = "production";
    delete process.env.CSP_ENFORCE;
    securityHeaders(fakeReq(), res, vi.fn() as unknown as NextFunction);
    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
    expect(headers["Content-Security-Policy-Report-Only"]).toContain("frame-ancestors 'self'");
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });
});

describe("rateLimit", () => {
  afterEach(() => { __resetRateLimiter(); delete process.env.RATE_LIMIT_PER_MIN; });

  it("allows up to the cap then returns 429 with Retry-After", () => {
    process.env.RATE_LIMIT_PER_MIN = "3";
    __resetRateLimiter();
    let passed = 0;
    let blockedStatus = 0;
    let blockedHeaders: Record<string, string> = {};
    for (let i = 0; i < 5; i++) {
      const { res, headers } = fakeRes();
      const next = vi.fn();
      rateLimit(fakeReq("9.9.9.9"), res, next as unknown as NextFunction);
      if (next.mock.calls.length > 0) passed += 1;
      else { blockedStatus = (res as any).statusCode; blockedHeaders = headers; }
    }
    expect(passed).toBe(3); // the cap
    expect(blockedStatus).toBe(429);
    expect(blockedHeaders["Retry-After"]).toBeDefined();
  });

  it("tracks separate IPs independently", () => {
    process.env.RATE_LIMIT_PER_MIN = "1";
    __resetRateLimiter();
    const call = (ip: string) => { const { res } = fakeRes(); const next = vi.fn(); rateLimit(fakeReq(ip), res, next as unknown as NextFunction); return next.mock.calls.length > 0; };
    expect(call("10.0.0.1")).toBe(true);
    expect(call("10.0.0.2")).toBe(true); // different IP, own bucket
    expect(call("10.0.0.1")).toBe(false); // second hit on the first IP is blocked
  });
});

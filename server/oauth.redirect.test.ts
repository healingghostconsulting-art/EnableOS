import { buildLoginUrl } from "../client/src/const";
import { encodeOAuthState, parseOAuthState } from "../shared/oauthState";
import { describe, expect, it } from "vitest";
import { resolveOAuthReturnPath } from "./_core/oauth";

describe("resolveOAuthReturnPath", () => {
  it("keeps safe internal workspace paths and query strings for post-login redirects", () => {
    expect(resolveOAuthReturnPath("/coach")).toBe("/coach");
    expect(resolveOAuthReturnPath("/library?role=learner&assetId=library-service-foundations-core")).toBe("/library?role=learner&assetId=library-service-foundations-core");
  });

  it("falls back to the root path for missing or unsafe redirect targets", () => {
    expect(resolveOAuthReturnPath(undefined)).toBe("/");
    expect(resolveOAuthReturnPath("https://example.com/coach")).toBe("/");
    expect(resolveOAuthReturnPath("//coach")).toBe("/");
    expect(resolveOAuthReturnPath("coach")).toBe("/");
  });
});

describe("OAuth state payloads", () => {
  it("keeps the callback redirect URI query-free while preserving the workspace return path inside state", () => {
    const loginUrl = new URL(
      buildLoginUrl({
        oauthPortalUrl: "https://portal.example.com",
        appId: "demo-app",
        origin: "https://app.example.com",
        returnPath: "/coach?tab=alerts",
      })
    );

    expect(loginUrl.searchParams.get("redirectUri")).toBe(
      "https://app.example.com/api/oauth/callback"
    );
    expect(
      parseOAuthState(loginUrl.searchParams.get("state") ?? "")
    ).toEqual({
      redirectUri: "https://app.example.com/api/oauth/callback",
      returnTo: "/coach?tab=alerts",
    });
  });

  it("continues to parse legacy state values that encoded returnTo inside the callback URL", () => {
    const legacyState = btoa(
      "https://app.example.com/api/oauth/callback?returnTo=%2Fcoach"
    );

    expect(parseOAuthState(legacyState)).toEqual({
      redirectUri:
        "https://app.example.com/api/oauth/callback?returnTo=%2Fcoach",
      returnTo: "/coach",
    });
  });

  it("round-trips the explicit redirect URI and return path in the new state format", () => {
    const state = encodeOAuthState({
      redirectUri: "https://app.example.com/api/oauth/callback",
      returnTo: "/learner?module=service-foundations",
    });

    expect(parseOAuthState(state)).toEqual({
      redirectUri: "https://app.example.com/api/oauth/callback",
      returnTo: "/learner?module=service-foundations",
    });
  });
});

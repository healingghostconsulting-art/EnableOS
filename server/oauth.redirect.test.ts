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

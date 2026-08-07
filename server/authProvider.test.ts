import { describe, expect, it } from "vitest";
import { ClerkAuthProvider, ManusOAuthAuthProvider, createAuthProvider } from "./_core/authProvider";

// Phase 5 hardening — the auth seam. A managed IdP drops in behind the AuthProvider
// interface via AUTH_PROVIDER, without touching any call site. The demo OAuth stays the
// default and keeps working.

describe("auth seam — provider selection", () => {
  it("defaults to the Manus OAuth provider when AUTH_PROVIDER is unset", () => {
    expect(createAuthProvider(undefined)).toBeInstanceOf(ManusOAuthAuthProvider);
    expect(createAuthProvider(undefined).name).toBe("manus-oauth");
    expect(createAuthProvider("manus")).toBeInstanceOf(ManusOAuthAuthProvider);
  });

  it("selects the Clerk provider when AUTH_PROVIDER=clerk", () => {
    const p = createAuthProvider("clerk");
    expect(p).toBeInstanceOf(ClerkAuthProvider);
    expect(p.name).toBe("clerk");
  });

  it("keeps the demo working: the Manus provider resolves an unauthenticated request to null (never throws)", async () => {
    const user = await new ManusOAuthAuthProvider().authenticate({ headers: {}, socket: {} } as any);
    expect(user).toBeNull();
  });

  it("Clerk is a documented seam until configured (env-only activation)", async () => {
    await expect(new ClerkAuthProvider().authenticate({} as any)).rejects.toThrow(/not configured/i);
  });
});

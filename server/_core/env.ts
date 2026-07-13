export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // ── Notification delivery (DELIVER2) ────────────────────────────────────────
  // SES* credentials + ALLOW_REAL_SEND gate real email. All default to empty/false,
  // so with nothing configured the SesProvider no-ops and the StubProvider is used —
  // nothing ever sends without an explicit, credentialed opt-in.
  sesRegion: process.env.SES_REGION ?? "",
  sesFromAddress: process.env.SES_FROM_ADDRESS ?? "",
  sesFromName: process.env.SES_FROM_NAME ?? "",
  allowRealSend: process.env.ALLOW_REAL_SEND === "true",
  /** Public origin used to build deep links in notification emails. */
  appPublicUrl: process.env.APP_PUBLIC_URL ?? "",
};

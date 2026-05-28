import { encodeOAuthState } from "@shared/oauthState";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export function normalizeReturnPath(returnPath?: string) {
  if (!returnPath || !returnPath.startsWith("/") || returnPath.startsWith("//")) {
    return "/";
  }

  return returnPath;
}

type BuildLoginUrlOptions = {
  oauthPortalUrl: string;
  appId: string;
  origin: string;
  returnPath?: string;
};

export function buildLoginUrl({
  oauthPortalUrl,
  appId,
  origin,
  returnPath = "/",
}: BuildLoginUrlOptions) {
  const normalizedReturnPath = normalizeReturnPath(returnPath);
  const redirectUri = new URL("/api/oauth/callback", origin).toString();
  const state = encodeOAuthState({
    redirectUri,
    returnTo: normalizedReturnPath !== "/" ? normalizedReturnPath : undefined,
  });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath = "/") =>
  buildLoginUrl({
    oauthPortalUrl: import.meta.env.VITE_OAUTH_PORTAL_URL,
    appId: import.meta.env.VITE_APP_ID,
    origin: window.location.origin,
    returnPath,
  });

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function normalizeReturnPath(returnPath?: string) {
  if (!returnPath || !returnPath.startsWith("/") || returnPath.startsWith("//")) {
    return "/";
  }

  return returnPath;
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnPath = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUrl = new URL(`${window.location.origin}/api/oauth/callback`);
  const normalizedReturnPath = normalizeReturnPath(returnPath);

  if (normalizedReturnPath !== "/") {
    redirectUrl.searchParams.set("returnTo", normalizedReturnPath);
  }

  const redirectUri = redirectUrl.toString();
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

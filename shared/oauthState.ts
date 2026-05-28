export type OAuthStatePayload = {
  redirectUri: string;
  returnTo?: string;
};

function encodeBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function decodeBase64Utf8(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeOAuthState(payload: OAuthStatePayload) {
  return encodeBase64Utf8(JSON.stringify(payload));
}

export function parseOAuthState(state: string): OAuthStatePayload {
  const decoded = decodeBase64Utf8(state);

  try {
    const parsed = JSON.parse(decoded) as Partial<OAuthStatePayload>;

    if (typeof parsed.redirectUri === "string" && parsed.redirectUri.length > 0) {
      return {
        redirectUri: parsed.redirectUri,
        returnTo:
          typeof parsed.returnTo === "string" && parsed.returnTo.length > 0
            ? parsed.returnTo
            : undefined,
      };
    }
  } catch {
    // Support legacy state payloads that only encoded the redirect URL string.
  }

  const legacyRedirectUri = decoded;
  const legacyRedirectUrl = new URL(legacyRedirectUri);

  return {
    redirectUri: legacyRedirectUri,
    returnTo: legacyRedirectUrl.searchParams.get("returnTo") ?? undefined,
  };
}

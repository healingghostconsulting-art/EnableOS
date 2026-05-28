from pathlib import Path
import re

ROOT = Path('/home/ubuntu/chcg-enableos-demo')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Missing expected snippet for {label}')
    return text.replace(old, new, 1)


# client/src/const.ts
const_path = ROOT / 'client' / 'src' / 'const.ts'
const_path.write_text(
    '''export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

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
'''
)

# server/_core/oauth.ts
oauth_path = ROOT / 'server' / '_core' / 'oauth.ts'
oauth_path.write_text(
    '''import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function resolveOAuthReturnPath(returnTo?: string) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const returnTo = resolveOAuthReturnPath(getQueryParam(req, "returnTo"));

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, returnTo);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
'''
)

# client/src/pages/EnableOSViews.tsx
views_path = ROOT / 'client' / 'src' / 'pages' / 'EnableOSViews.tsx'
views = views_path.read_text()
views = replace_once(
    views,
    'import { Link, useLocation } from "wouter";\n',
    'import { Link, useLocation } from "wouter";\nimport { getLoginUrl } from "@/const";\n',
    'landing import getLoginUrl',
)

landing_pattern = re.compile(r'export function LandingView\(\) \{.*?\n\}\n\n\nexport function RoleWorkspace', re.S)
new_landing = '''export function LandingView() {
  const landing = trpc.demo.landing.useQuery();
  const viewer = trpc.auth.me.useQuery();
  const viewerAccess = trpc.demo.viewerAccess.useQuery(undefined, { enabled: Boolean(viewer.data) });
  const viewerHomeHref = viewerAccess.data?.grant.role === "platform_admin"
    ? "/chcg-admin"
    : viewerAccess.data?.grant.role === "client_admin"
      ? "/admin"
      : viewerAccess.data?.grant.role === "executive"
        ? "/executive"
        : viewerAccess.data?.grant.role === "manager"
          ? "/manager"
          : viewerAccess.data?.grant.role === "coach"
            ? "/coach"
            : "/learner";
  const landingMetricHighlights = landing.data?.featuredMetrics ?? [
    { label: "Ready to launch", value: 12 },
    { label: "Due this week", value: 4 },
    { label: "Avg. progress", value: "61%" },
    { label: "In coaching", value: 9 },
  ];
  const workspaceEntryOptions = useMemo(
    () => [
      {
        role: "executive" as DemoRole,
        title: "Executive command",
        route: "/executive",
        icon: Gauge,
        eyebrow: "Executive",
        subtitle: "Open ROI, readiness, and reporting decisions for the client account.",
      },
      {
        role: "manager" as DemoRole,
        title: "Manager operations",
        route: "/manager",
        icon: ShieldCheck,
        eyebrow: "Manager",
        subtitle: "Launch intervention tracking, assignment follow-through, and quality movement work.",
      },
      {
        role: "coach" as DemoRole,
        title: "Coach studio",
        route: "/coach",
        icon: Users2,
        eyebrow: "Coach / Supervisor",
        subtitle: "Run coaching cycles, document weekly sessions, and connect evidence back to live performance.",
      },
      {
        role: "learner" as DemoRole,
        title: "Learner journey",
        route: "/learner",
        icon: BookOpen,
        eyebrow: "Learner",
        subtitle: "Continue assigned re-engagements, learning missions, and training completions.",
      },
      {
        role: "client_admin" as DemoRole,
        title: "Client control",
        route: "/admin",
        icon: Building2,
        eyebrow: "Client Admin",
        subtitle: "Manage brand settings, workspace access, and client-level configuration safely.",
      },
    ],
    [],
  );

  return (
    <Surface>
      <div className="workspace-stack">
        <div className="glass-panel overflow-hidden rounded-[2rem] border border-[#1B303C]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,248,250,0.94))] shadow-[0_24px_70px_rgba(27,48,60,0.08)]">
          <div className="grid gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:px-7 lg:py-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="outline" className="mission-chip rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.28em]">
                  EnableOS entry
                </Badge>
                <span className="command-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[#4A6373]">Workspace-first login</span>
              </div>
              <div className="max-w-4xl space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Front door</p>
                <h1 className="max-w-[14ch] text-[2.05rem] font-semibold tracking-tight text-[#1B303C] md:text-[2.55rem] md:leading-[1.04] xl:text-[2.9rem]">
                  Choose your workspace.
                </h1>
                <p className="max-w-3xl text-[0.98rem] leading-6 text-[#4A6373]">
                  Start with a simple role choice. Select the workspace that matches your day and the entry flow will take you straight into sign-in before opening the right EnableOS experience.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {landingMetricHighlights.slice(0, 3).map((item: any) => (
                  <div key={item.label} className="rounded-[1.15rem] border border-[#1B303C]/10 bg-white px-4 py-3.5 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#6B7E8A]">{item.label}</p>
                    <p className="mt-2 text-[1.4rem] font-semibold tracking-tight text-[#1B303C]">{String(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-[#1B303C]/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.94),rgba(248,250,252,0.92))] p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6B7E8A]">Entry status</p>
              {viewerAccess.data ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[#1B303C]">Signed in to {viewerAccess.data.tenant.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[#4A6373]">
                      This account will only open workspaces granted to {viewerAccess.data.permittedRoles.join(", ")}. Use the selector below to continue, or jump directly to your assigned home.
                    </p>
                  </div>
                  <Link href={viewerHomeHref}>
                    <Button className="h-11 w-full rounded-[1.05rem] bg-[#1B303C] px-5 text-white hover:bg-[#243f4d]">
                      Open my assigned workspace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[#1B303C]">Select a workspace, then sign in</p>
                    <p className="mt-2 text-sm leading-6 text-[#4A6373]">
                      Each workspace card below routes into login with the correct return path, so the user lands in the right role context immediately after authentication.
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-[#FCBC34]/24 bg-[linear-gradient(160deg,rgba(255,251,240,0.92),rgba(255,255,255,0.95))] px-4 py-3.5 text-sm leading-6 text-[#4A6373]">
                    After sign-in, access is still limited by tenant mapping and assigned role entitlements.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[#1B303C]/8 px-5 py-6 lg:px-7 lg:py-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">Workspace selector</p>
                <p className="mt-1 text-sm leading-6 text-[#4A6373]">Keep the front page focused on one decision: choose the workspace, then move into login.</p>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6B7E8A]">Five role-based entry points</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {workspaceEntryOptions.map((item) => {
                const Icon = item.icon;
                const canOpenDirectly = viewerAccess.data ? viewerAccess.data.permittedRoles.includes(item.role) : false;

                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => {
                      if (viewer.data) {
                        window.location.href = canOpenDirectly ? item.route : viewerHomeHref;
                        return;
                      }

                      window.location.href = getLoginUrl(item.route);
                    }}
                    className="group flex h-full flex-col rounded-[1.35rem] border border-[#1B303C]/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(245,247,250,0.94))] px-4 py-4 text-left shadow-[0_16px_38px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#FCBC34]/30 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1B303C] text-white shadow-[0_16px_30px_rgba(27,48,60,0.16)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-[#1B303C]/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6B7E8A]">
                        {item.eyebrow}
                      </span>
                    </div>
                    <div className="mt-5 flex-1 space-y-2">
                      <p className="text-base font-semibold text-[#1B303C]">{item.title}</p>
                      <p className="text-sm leading-6 text-[#4A6373]">{item.subtitle}</p>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#1B303C]/8 pt-4">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7E8A]">
                        {viewer.data ? (canOpenDirectly ? "Open workspace" : "Open assigned workspace") : "Select and sign in"}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#1B303C] transition group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}


export function RoleWorkspace'''
views, count = landing_pattern.subn(new_landing, views)
if count != 1:
    raise RuntimeError('Failed to replace LandingView block')
views_path.write_text(views)

# server/enableosTrainingLayout.test.ts
layout_test_path = ROOT / 'server' / 'enableosTrainingLayout.test.ts'
layout_test = layout_test_path.read_text()
layout_test = replace_once(
    layout_test,
    '''  it("keeps the landing page denser and more proof-led after the compact mission-hub approval", () => {
    expect(trainingViewSource).toContain("EnableOS mission hub");
    expect(trainingViewSource).toContain("Primary queue");
    expect(trainingViewSource).toContain("Workspace launch");
    expect(trainingViewSource).toContain("Operations home");
    expect(trainingViewSource).toContain("Start with the next assigned action.");
    expect(trainingViewSource).toContain("Search, resume, and launch from one operational console so users can move into training, coaching, and workspace tasks without crossing showcase-style hero content first.");
    expect(trainingViewSource).toContain("Training queue");
    expect(trainingViewSource).toContain("Workspace launchers");
  });
''',
    '''  it("uses a cleaner workspace-first landing flow that routes users into login after role selection", () => {
    expect(trainingViewSource).toContain("EnableOS entry");
    expect(trainingViewSource).toContain("Workspace-first login");
    expect(trainingViewSource).toContain("Choose your workspace.");
    expect(trainingViewSource).toContain("Select a workspace, then sign in");
    expect(trainingViewSource).toContain("Each workspace card below routes into login with the correct return path");
    expect(trainingViewSource).toContain("Workspace selector");
    expect(trainingViewSource).toContain("Select and sign in");
    expect(trainingViewSource).toContain("Open my assigned workspace");
  });
''',
    'landing layout regression update',
)
layout_test = replace_once(
    layout_test,
    '''  it("routes the landing mission queue into exact library detail states or focused player launches instead of generic same-screen fallbacks", () => {
    expect(trainingViewSource).toContain("/library?assetId=library-service-foundations-core");
    expect(trainingViewSource).toContain("assetTitle=Quality%20Assurance%20Essentials");
    expect(trainingViewSource).toContain("journey-coach-practice-atlas");
    expect(trainingViewSource).toContain("journey-service-foundations-lf");
    expect(trainingViewSource).toContain("journey-performance-leadership-lf");
    expect(trainingViewSource).toContain("journey-exec-culture-hc");
    expect(trainingViewSource).toContain("const CONTENT_LIBRARY_TRAINING_TARGET_ALIASES");
    expect(trainingViewSource).toContain("const [location, setLocation] = useLocation()");
    expect(trainingViewSource).toContain("const requestedAssetTitle = queryParams.get(\"assetTitle\")");
    expect(trainingViewSource).toContain("if (matchedAsset && libraryMode !== \"launcher\")");
    expect(trainingViewSource).toContain("journeyId: journeyId ?? resolvedTrainingTarget?.journeyId");
    expect(trainingViewSource).toContain("moduleId: moduleId ?? resolvedTrainingTarget?.moduleId");
    expect(trainingViewSource).toContain("const requestedTrainingTarget = useMemo(() => resolveTrainingTargetByJourneyId(requestedJourneyId), [requestedJourneyId])");
    expect(trainingViewSource).toContain("return preset ? { journeyId: normalizedJourneyKey, ...preset } : null;");
  });
''',
    '''  it("keeps exact training-target resolution while the front page shifts to a workspace-selector entry flow", () => {
    expect(trainingViewSource).toContain("const CONTENT_LIBRARY_TRAINING_TARGET_ALIASES");
    expect(trainingViewSource).toContain("const [location, setLocation] = useLocation()");
    expect(trainingViewSource).toContain("const requestedAssetTitle = queryParams.get(\"assetTitle\")");
    expect(trainingViewSource).toContain("if (matchedAsset && libraryMode !== \"launcher\")");
    expect(trainingViewSource).toContain("journeyId: journeyId ?? resolvedTrainingTarget?.journeyId");
    expect(trainingViewSource).toContain("moduleId: moduleId ?? resolvedTrainingTarget?.moduleId");
    expect(trainingViewSource).toContain("const requestedTrainingTarget = useMemo(() => resolveTrainingTargetByJourneyId(requestedJourneyId), [requestedJourneyId])");
    expect(trainingViewSource).toContain("return preset ? { journeyId: normalizedJourneyKey, ...preset } : null;");
    expect(trainingViewSource).toContain("window.location.href = getLoginUrl(item.route)");
    expect(trainingViewSource).toContain("Open assigned workspace");
  });
''',
    'landing route regression update',
)
layout_test_path.write_text(layout_test)

# server/oauth.redirect.test.ts
(ROOT / 'server' / 'oauth.redirect.test.ts').write_text(
    '''import { describe, expect, it } from "vitest";
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
'''
)

print('Workspace-selector landing patch applied successfully.')

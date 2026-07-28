import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const appSource = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8");
const enableOsViewsSource = readFileSync(join(process.cwd(), "client/src/pages/EnableOSViews.tsx"), "utf8");
const indexCssSource = readFileSync(join(process.cwd(), "client/src/index.css"), "utf8");

describe("sitewide page transition", () => {
  it("applies the shared route fade at the router level so all route changes use the same wrapper", () => {
    expect(appSource).toContain("function Router() {");
    expect(appSource).toContain("const [location] = useLocation();");
    expect(appSource).toContain("<div key={location} className=\"route-fade-in\">");
    expect(appSource).toContain("<Route path=\"/\" component={WorkspaceEntryView} />");
    expect(appSource).toContain("<Route path=\"/mission-hub\">");
    expect(appSource).toContain("<Route path=\"/guide\">");
    expect(appSource).toContain("<Route path=\"/training\">");
    expect(appSource).toContain("<Route path=\"/library\">");
  });

  it("keeps the route animation fade-only at 280ms ease-out", () => {
    const routeFadeKeyframeBlock = indexCssSource.match(/@keyframes route-fade-in\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(indexCssSource).toContain("@keyframes route-fade-in");
    expect(routeFadeKeyframeBlock).toContain("from {");
    expect(routeFadeKeyframeBlock).toContain("opacity: 0;");
    expect(routeFadeKeyframeBlock).toContain("to {");
    expect(routeFadeKeyframeBlock).toContain("opacity: 1;");
    expect(indexCssSource).toContain("animation: route-fade-in 280ms ease-out;");
    expect(routeFadeKeyframeBlock).not.toContain("transform");
  });

  it("avoids double-applying the transition inside the page-level Surface wrapper", () => {
    expect(enableOsViewsSource).toContain("function Surface({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {");
    expect(enableOsViewsSource).toContain("<div className=\"min-h-screen text-[#1B303C]\">");
    expect(enableOsViewsSource).not.toContain("<div key={location} className=\"route-fade-in min-h-screen text-[#1B303C]\">");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Grayscale accessibility mode — persisted preference + account-menu toggle + a
// document-root filter. Source-level assertions (no DOM runner).

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("Grayscale mode", () => {
  it("persists the preference and applies grayscale(1) to the document root", () => {
    const ctx = read("client/src/contexts/GrayscaleContext.tsx");
    expect(ctx).toContain("localStorage");
    expect(ctx).toContain('classList.toggle("app-grayscale"');
    expect(read("client/src/index.css")).toContain(".app-grayscale");
    expect(read("client/src/index.css")).toContain("filter: grayscale(1)");
  });

  it("wraps the app so portalled overlays desaturate too", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain("GrayscaleProvider");
  });

  it("exposes the toggle in the v3 account menu", () => {
    const topbar = read("client/src/components/v3/TopBar.tsx");
    expect(topbar).toContain("useGrayscale");
    expect(topbar).toContain("DropdownMenuCheckboxItem");
    expect(topbar).toContain("Grayscale mode");
  });
});

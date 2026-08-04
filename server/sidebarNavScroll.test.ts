import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// SidebarNav — the active item is scrolled into view on mount so it's never below the
// fold in a short viewport, with a reduced-motion guard.

const read = (rel: string) => readFileSync(join(process.cwd(), "client/src/components/v3/SidebarNav.tsx"), "utf8");

describe("SidebarNav active-item scroll-into-view", () => {
  const src = read("");

  it("scrolls the aria-current item into view with block: nearest", () => {
    expect(src).toContain('querySelector<HTMLElement>(\'[aria-current="page"]\')');
    expect(src).toContain('scrollIntoView({ block: "nearest"');
  });

  it("honors reduced motion (OS setting or the in-app preference)", () => {
    expect(src).toContain("prefers-reduced-motion: reduce");
    expect(src).toContain("app-reduce-motion");
    expect(src).toContain('behavior: reduce ? "auto" : "smooth"');
  });

  it("makes the nav scrollable so the scroll target can move", () => {
    expect(src).toContain("overflow-y-auto");
  });
});

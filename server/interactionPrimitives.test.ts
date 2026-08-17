import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// v3 §2.8 — the stock shadcn interaction primitives, branded against the --eos-* tokens.
// Source-level assertions (the repo has no DOM runner; primitives are covered this way).
const read = (rel: string) => readFileSync(join(process.cwd(), `client/src/components/ui/${rel}`), "utf8");

describe("Dialog — v3 §2.8 geometry", () => {
  const src = read("dialog.tsx");

  it("DialogContent uses the 26px radius + deep shell shadow (not rounded-lg/shadow-lg)", () => {
    expect(src).toContain("rounded-[var(--eos-radius-xl)]");
    expect(src).toContain("shadow-[var(--eos-shadow-xl)]");
    expect(src).not.toContain("rounded-lg border p-6 shadow-lg");
  });

  it("DialogOverlay is a navy scrim with a soft blur (not flat bg-black/50)", () => {
    expect(src).toContain("bg-[rgba(11,24,38,0.52)] backdrop-blur-[3px]");
    expect(src).not.toContain("bg-black/50");
  });
});

describe("Input — v3 §2.8 geometry", () => {
  const src = read("input.tsx");

  it("is 42px tall with a 12px radius (not h-9 / rounded-md)", () => {
    expect(src).toContain("h-[42px]");
    expect(src).toContain("rounded-[var(--eos-radius-sm)]");
    expect(src).not.toContain("h-9 w-full min-w-0 rounded-md");
  });
});

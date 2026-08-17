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

describe("SelectTrigger — v3 §2.8 geometry", () => {
  const src = read("select.tsx");

  it("is 42px tall (default size) and full-width, not h-9 / w-fit", () => {
    expect(src).toContain("data-[size=default]:h-[42px]");
    expect(src).toContain("flex w-full items-center justify-between");
    expect(src).not.toContain("data-[size=default]:h-9");
    expect(src).not.toContain("flex w-fit items-center justify-between");
  });
});

describe("Skeleton — v3 §2.7 neutral loading surface", () => {
  const src = read("skeleton.tsx");

  it("uses the neutral sunken surface, not the gold-tinted bg-accent", () => {
    expect(src).toContain("bg-[var(--eos-surface-sunken)]");
    // The className string itself must not fall back to the gold accent token.
    expect(src).toContain('rounded-md bg-[var(--eos-surface-sunken)]"');
  });
});

describe("Toaster (sonner) — v3 §2.8 status accent bar", () => {
  const src = read("sonner.tsx");

  it("keeps a theme-aware surface but adds the brand radius, shadow, and a status accent bar", () => {
    expect(src).toContain('"--normal-bg": "var(--popover)"'); // still theme-aware (dark-safe)
    expect(src).toContain('"--border-radius": "var(--eos-radius-md)"');
    expect(src).toContain("border-l-4 shadow-[var(--eos-shadow-card)]");
    expect(src).toContain("border-l-[color:var(--eos-status-green)]");
    expect(src).toContain("border-l-[color:var(--eos-status-red)]");
    expect(src).toContain("border-l-[color:var(--eos-status-amber)]");
    expect(src).toContain("border-l-[color:var(--eos-status-info)]");
  });
});

describe("Textarea — v3 §2.8 radius parity with Input", () => {
  const src = read("textarea.tsx");

  it("uses the 12px radius (--eos-radius-sm), not rounded-md", () => {
    expect(src).toContain("rounded-[var(--eos-radius-sm)]");
    expect(src).not.toContain("min-h-16 w-full rounded-md");
  });
});

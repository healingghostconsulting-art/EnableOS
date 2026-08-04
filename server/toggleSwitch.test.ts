import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ToggleSwitch — the accessible v3 switch primitive used across the Settings page.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("v3 ToggleSwitch primitive", () => {
  const src = read("client/src/components/v3/ToggleSwitch.tsx");

  it("is a real switch with aria-checked and a ≥44px target", () => {
    expect(src).toContain('role="switch"');
    expect(src).toContain("aria-checked={checked}");
    expect(src).toContain("min-h-[44px]");
    expect(src).toContain("min-w-[44px]");
  });

  it("shows a focus-visible ring", () => {
    expect(src).toContain("focus-visible:ring-2");
  });

  it("carries the ON state with a non-color check glyph (grayscale-safe)", () => {
    expect(src).toContain("Check");
    // The check is tied to the checked state, not color alone.
    expect(src).toContain("checked ? \"opacity-100\" : \"opacity-0\"");
  });

  it("supports a disabled state", () => {
    expect(src).toContain("disabled={disabled}");
    expect(src).toContain("disabled:opacity-55");
  });
});

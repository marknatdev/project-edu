import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("smoke test", () => {
  it("resolves @/ alias and merges class names correctly", () => {
    // Non-tautological test against tailwind-merge behavior with known literal
    expect(cn("px-2", "px-4", { "text-red-500": true, "text-blue-500": false })).toBe("px-4 text-red-500");
  });
});

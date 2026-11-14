import { describe, expect, it } from "vitest";

import { isValidTitle, TITLE_MAX, toDueDate } from "@/lib/task-input";

describe("task input", () => {
  it("AC-001.4 accepts titles of 1 to 200 characters after trimming", () => {
    expect(TITLE_MAX).toBe(200);
    expect(isValidTitle("Call Anna")).toBe(true);
    expect(isValidTitle("a")).toBe(true);
    expect(isValidTitle("a".repeat(200))).toBe(true);
    expect(isValidTitle(`  ${"a".repeat(200)}  `)).toBe(true);
  });

  it("AC-001.4 rejects empty, whitespace-only and too long titles", () => {
    expect(isValidTitle("")).toBe(false);
    expect(isValidTitle("   \t ")).toBe(false);
    expect(isValidTitle("a".repeat(201))).toBe(false);
  });

  it("AC-001.3 converts the date input to YYYY-MM-DD or null", () => {
    expect(toDueDate("")).toBeNull();
    expect(toDueDate("2026-03-04")).toBe("2026-03-04");
    expect(toDueDate("04.03.2026")).toBeNull();
  });
});

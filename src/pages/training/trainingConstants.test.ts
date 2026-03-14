import { describe, expect, it } from "vitest";

import { formatRest, parseStoredJson, toNumber } from "@/pages/training/trainingConstants";

describe("trainingConstants helpers", () => {
  it("converts valid numeric strings and falls back to zero", () => {
    expect(toNumber("12")).toBe(12);
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber("abc")).toBe(0);
  });

  it("formats rest values in seconds and minutes", () => {
    expect(formatRest(45)).toBe("45s");
    expect(formatRest(90)).toBe("1m 30s");
  });

  it("parses stored json safely with fallback", () => {
    expect(parseStoredJson('{"a":1}', { a: 0 })).toEqual({ a: 1 });
    expect(parseStoredJson(null, { a: 0 })).toEqual({ a: 0 });
    expect(parseStoredJson("{invalid", { a: 0 })).toEqual({ a: 0 });
  });
});

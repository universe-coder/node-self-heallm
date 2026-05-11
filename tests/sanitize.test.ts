import { describe, expect, it } from "vitest";

import { sanitizeText } from "../src/runtime/sanitize.js";

describe("sanitizeText", () => {
  it("redacts common secret words", () => {
    const input = "api_key=12345 token=abcdef Authorization: Bearer qwerty";
    const result = sanitizeText(input);
    expect(result).not.toContain("api_key");
    expect(result).not.toContain("token");
    expect(result).not.toContain("Bearer qwerty");
  });
});

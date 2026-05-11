import { describe, expect, it } from "vitest";

import { isPathAllowed } from "../src/core/heal/policy.js";

describe("isPathAllowed", () => {
  it("allows whitelisted source path", () => {
    expect(isPathAllowed("src/app.ts", ["src/**"], [".git/**"])).toBe(true);
  });

  it("blocks forbidden path", () => {
    expect(isPathAllowed(".git/config", ["**"], [".git/**"])).toBe(false);
  });
});

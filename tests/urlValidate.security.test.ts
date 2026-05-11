import dns from "node:dns/promises";

import { describe, expect, it, vi } from "vitest";

import { validateHttpTarget } from "../src/notifications/urlValidate.js";

describe("validateHttpTarget", () => {
  it("rejects insecure http when allowInsecure=false", async () => {
    await expect(validateHttpTarget("http://example.com", false)).rejects.toThrow("https");
  });

  it("rejects localhost", async () => {
    await expect(validateHttpTarget("https://localhost/hook", false)).rejects.toThrow("forbidden");
  });

  it("rejects private ip by dns resolution", async () => {
    vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "10.0.0.1", family: 4 }] as never);
    await expect(validateHttpTarget("https://example.com", false)).rejects.toThrow("Private IPv4");
  });
});

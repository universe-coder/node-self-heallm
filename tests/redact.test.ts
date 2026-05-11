import { describe, expect, it } from "vitest";

import type { SelfHealConfig } from "../src/config/schema.js";
import { redactEvent } from "../src/notifications/redact.js";

const baseConfig: SelfHealConfig = {
  llm: {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    apiKeyEnv: "OPENAI_API_KEY"
  },
  index: { roots: ["src"], include: ["**/*.ts"], exclude: ["**/node_modules/**"], topK: 8 },
  heal: {
    mode: "suggest",
    dryRun: true,
    allowedPaths: ["src/**"],
    forbiddenPaths: [".git/**"],
    maxPatchLines: 1200
  },
  supervisor: { maxRestarts: 1, retryExitCodes: [1] },
  notifications: {
    enabled: true,
    includeTraceback: true,
    includeDiff: false,
    maxTracebackLines: 1,
    allowInsecure: false,
    webhook: { enabled: false, urlEnv: "A", signingSecretEnv: "B" },
    slack: { enabled: false, webhookEnv: "C" },
    telegram: { enabled: false, botTokenEnv: "D", chatIdEnv: "E" },
    sentry: { enabled: false, dsnEnv: "F" }
  }
};

describe("redactEvent", () => {
  it("cuts traceback lines and strips diff by config", () => {
    const result = redactEvent(baseConfig, {
      event: "error_captured",
      traceback: "line1\nline2",
      diff: "diff --git a b"
    });
    expect(result.traceback).toBe("line1");
    expect(result.diff).toBeUndefined();
  });
});

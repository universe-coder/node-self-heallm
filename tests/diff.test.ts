import { describe, expect, it } from "vitest";

import { extractDiffFromResponse, validatePatch } from "../src/core/heal/diff.js";
import type { SelfHealConfig } from "../src/config/schema.js";

const config: SelfHealConfig = {
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
    allowedPaths: ["src/**", "tests/**"],
    forbiddenPaths: [".git/**"],
    maxPatchLines: 1200
  },
  supervisor: { maxRestarts: 1, retryExitCodes: [1] },
  notifications: {
    enabled: false,
    includeTraceback: true,
    includeDiff: false,
    maxTracebackLines: 80,
    allowInsecure: false,
    webhook: { enabled: false, urlEnv: "SELF_HEAL_WEBHOOK_URL", signingSecretEnv: "SELF_HEAL_WEBHOOK_SIGNING_SECRET" },
    slack: { enabled: false, webhookEnv: "SLACK_WEBHOOK_URL" },
    telegram: { enabled: false, botTokenEnv: "TELEGRAM_BOT_TOKEN", chatIdEnv: "TELEGRAM_CHAT_ID" },
    sentry: { enabled: false, dsnEnv: "SENTRY_DSN" }
  }
};

describe("extractDiffFromResponse", () => {
  it("extracts fenced diff and removes trailing prose", () => {
    const input = [
      "Here is the fix:",
      "```diff",
      "diff --git a/src/a.ts b/src/a.ts",
      "index 1111111..2222222 100644",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,1 +1,1 @@",
      "-const x = 1;",
      "+const x = 2;",
      "```",
      "Done."
    ].join("\n");
    const diff = extractDiffFromResponse(input);
    expect(diff).toContain("diff --git a/src/a.ts b/src/a.ts");
    expect(diff).not.toContain("Done.");
  });

  it("returns null when there is no valid patch structure", () => {
    const input = "Try this manually: change line 5 and rerun.";
    expect(extractDiffFromResponse(input)).toBeNull();
  });
});

describe("validatePatch", () => {
  it("rejects diff without hunks", () => {
    const patch = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts"
    ].join("\n");
    const result = validatePatch(patch, config);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("no hunks");
  });
});

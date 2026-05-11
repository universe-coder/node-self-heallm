export interface SelfHealConfig {
  llm: {
    provider: "openai" | "huggingface" | "ollama" | "anthropic";
    baseUrl: string;
    model: string;
    embeddingModel: string;
    apiKeyEnv: string;
  };
  index: {
    roots: string[];
    include: string[];
    exclude: string[];
    topK: number;
  };
  heal: {
    mode: "suggest" | "apply";
    dryRun: boolean;
    allowedPaths: string[];
    forbiddenPaths: string[];
    maxPatchLines: number;
  };
  supervisor: {
    maxRestarts: number;
    retryExitCodes: number[];
  };
  notifications: {
    enabled: boolean;
    includeTraceback: boolean;
    includeDiff: boolean;
    maxTracebackLines: number;
    allowInsecure: boolean;
    webhook: { enabled: boolean; urlEnv: string; signingSecretEnv: string };
    slack: { enabled: boolean; webhookEnv: string };
    telegram: { enabled: boolean; botTokenEnv: string; chatIdEnv: string };
    sentry: { enabled: boolean; dsnEnv: string };
  };
}

export const defaultConfig: SelfHealConfig = {
  llm: {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    apiKeyEnv: "OPENAI_API_KEY"
  },
  index: {
    roots: ["src"],
    include: ["**/*.ts", "**/*.js"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    topK: 8
  },
  heal: {
    mode: "suggest",
    dryRun: true,
    allowedPaths: ["src/**", "tests/**"],
    forbiddenPaths: [".git/**", ".env*", "package-lock.json"],
    maxPatchLines: 1200
  },
  supervisor: {
    maxRestarts: 2,
    retryExitCodes: [1]
  },
  notifications: {
    enabled: false,
    includeTraceback: true,
    includeDiff: false,
    maxTracebackLines: 80,
    allowInsecure: false,
    webhook: {
      enabled: false,
      urlEnv: "SELF_HEAL_WEBHOOK_URL",
      signingSecretEnv: "SELF_HEAL_WEBHOOK_SIGNING_SECRET"
    },
    slack: {
      enabled: false,
      webhookEnv: "SLACK_WEBHOOK_URL"
    },
    telegram: {
      enabled: false,
      botTokenEnv: "TELEGRAM_BOT_TOKEN",
      chatIdEnv: "TELEGRAM_CHAT_ID"
    },
    sentry: {
      enabled: false,
      dsnEnv: "SENTRY_DSN"
    }
  }
};

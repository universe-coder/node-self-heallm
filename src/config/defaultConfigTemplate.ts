export const DEFAULT_CONFIG_FILE = ".self-heal.toml";

export const defaultConfigTemplate = `# self-heal default configuration

[llm]
provider = "openai"
baseUrl = "https://api.openai.com/v1"
model = "gpt-4o-mini"
embeddingModel = "text-embedding-3-small"
apiKeyEnv = "OPENAI_API_KEY"

[index]
roots = ["src"]
include = ["**/*.ts", "**/*.js"]
exclude = ["**/node_modules/**", "**/dist/**"]
topK = 8

[heal]
mode = "suggest"
dryRun = true
allowedPaths = ["src/**", "tests/**"]
forbiddenPaths = [".git/**", ".env*", "package-lock.json"]
maxPatchLines = 1200

[supervisor]
maxRestarts = 2
retryExitCodes = [1]

[notifications]
enabled = false
includeTraceback = true
includeDiff = false
maxTracebackLines = 80
allowInsecure = false

[notifications.webhook]
enabled = false
urlEnv = "SELF_HEAL_WEBHOOK_URL"
signingSecretEnv = "SELF_HEAL_WEBHOOK_SIGNING_SECRET"

[notifications.slack]
enabled = false
webhookEnv = "SLACK_WEBHOOK_URL"

[notifications.telegram]
enabled = false
botTokenEnv = "TELEGRAM_BOT_TOKEN"
chatIdEnv = "TELEGRAM_CHAT_ID"

[notifications.sentry]
enabled = false
dsnEnv = "SENTRY_DSN"
`;

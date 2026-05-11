# node-self-heallm

Self-healing runtime for Node.js and TypeScript projects.

The package helps you:
- capture runtime errors (stack traces),
- retrieve relevant code context,
- request a unified diff from an LLM,
- validate patch safety policy,
- optionally apply the patch,
- write an audit trail and notifications.

## Status

`node-self-heallm` is in active development (`0.x`) and targets parity with the Python `self-heal` workflow.

Current implemented areas:
- CLI: `init`, `index`, `heal`, `run`, `status`
- OpenAI-compatible and Anthropic chat support
- Safe patch flow (diff-only, policy validation)
- Audit log in `.self-heal/audit.jsonl`
- Notifications: webhook/slack/telegram/sentry

## Requirements

- Node.js `>= 20`
- npm `>= 9`
- Git available in `PATH` (for `git apply`)

## Install

### As a dependency

```bash
npm i node-self-heallm
```

### For local development

```bash
git clone <your-repo-url>
cd node-self-heallm
npm ci
npm run build
```

## Quickstart

### 1) Initialize config

```bash
self-heal init
```

This creates `.self-heal.toml` in your project root.

### 2) Set API key

By default config expects:

```bash
export OPENAI_API_KEY="..."
```

If you use another env var, set `llm.apiKeyEnv` in config.

### 3) Build code index

```bash
self-heal index
```

### 4) Generate fix from traceback file

```bash
node your-app.js 2> error.log
self-heal heal --tb error.log
```

### 5) Supervised mode

```bash
self-heal run -- node your-app.js
```

With auto-apply:

```bash
self-heal run --auto --no-dry-run -- node your-app.js
```

## CLI reference

## `self-heal init`

Create config from built-in template.

```bash
self-heal init --project .
self-heal init --force
```

Options:
- `-p, --project <path>`: explicit project root
- `-f, --force`: overwrite existing `.self-heal.toml`

## `self-heal index`

Scan configured files and prepare embeddings context.

```bash
self-heal index
```

Notes:
- For `llm.provider = "anthropic"` indexing is rejected (no embeddings route in current implementation).
- Uses include/exclude globs from config.

## `self-heal heal`

Generate a patch from traceback (`--tb` file or stdin).

```bash
self-heal heal --tb error.log
cat error.log | self-heal heal
self-heal heal --tb error.log --apply --no-dry-run
self-heal heal --tb error.log --auto --no-dry-run
```

Options:
- `--tb <path>`: traceback source file
- `--apply`: allow patch apply mode
- `--auto`: force auto-apply mode
- `--dry-run / --no-dry-run`: write changes or only propose diff
- `-p, --project <path>`: explicit project root

## `self-heal run`

Run a command under supervision and attempt healing when traceback is detected.

```bash
self-heal run -- node your-app.js
self-heal run --auto --no-dry-run -- node your-app.js
```

Options:
- `--auto`: auto-apply mode when patch is valid
- `--dry-run / --no-dry-run`: apply behavior toggle
- `-p, --project <path>`: explicit project root

## `self-heal status`

Show recent audit events.

```bash
self-heal status
self-heal status -n 50
```

Options:
- `-n, --limit <number>`: number of recent entries
- `-p, --project <path>`: explicit project root

## Configuration

Primary file: `.self-heal.toml`

Example:

```toml
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
```

## LLM providers

Supported chat providers:
- `openai` (default)
- `huggingface` (OpenAI-compatible endpoint)
- `ollama` (OpenAI-compatible local endpoint)
- `anthropic` (native messages API path)

Important:
- Embeddings path in current code is OpenAI-compatible only.
- With `anthropic`, `self-heal index` intentionally fails fast.

## Notifications

Channels:
- Webhook
- Slack webhook
- Telegram bot API
- Sentry

Security defaults:
- only http/https URLs
- https required unless `allowInsecure = true`
- localhost/private addresses rejected for webhook/slack URL targets
- redirects disabled in HTTP transport
- request timeout is bounded
- optional webhook HMAC signature in headers

## Audit log

Audit file path:

```text
.self-heal/audit.jsonl
```

Examples of event types:
- `error_captured`
- `heal_diff_proposed`
- `heal_applied`
- `heal_apply_failed`
- `notification_sent`
- `notification_failed`

Use:

```bash
self-heal status
```

## Security model

Core constraints:
- model output is treated as text, not executable code
- only unified diffs are accepted for patch flow
- changed paths must pass allow/deny policy
- secrets should be loaded from environment variables
- traceback/error text is sanitized before outbound usage

Recommended production defaults:
- keep `dryRun = true` until you trust the workflow
- keep narrow `allowedPaths`
- keep strict `forbiddenPaths` for credentials/config files

## Programmatic usage

Current public exports:

```ts
import { install, selfHeal } from "node-self-heallm";
```

Example:

```ts
import { install, selfHeal } from "node-self-heallm";

await install();

const wrapped = selfHeal("suggest")(async () => {
  // your risky logic
});

await wrapped();
```

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

Package validation:

```bash
npm run pack:check
npm publish --dry-run
```

## Troubleshooting

### `Missing required environment variable`

- Check `llm.apiKeyEnv` and exported env var name.

### `Anthropic provider does not support embeddings for index command`

- Use OpenAI-compatible provider for indexing.
- Then switch provider for heal stage if needed.

### `Path not allowed by policy`

- Expand `heal.allowedPaths` carefully.
- Ensure target file is not in `heal.forbiddenPaths`.

### `git apply failed`

- Ensure repository state is valid and patch cleanly applies.
- Retry in `dry-run`, inspect diff, then apply manually if needed.

## License

MIT

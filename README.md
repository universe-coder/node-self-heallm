# node-self-heallm

[![npm version](https://img.shields.io/npm/v/node-self-heallm?style=flat)](https://www.npmjs.com/package/node-self-heallm)
[![npm downloads](https://img.shields.io/npm/dm/node-self-heallm?style=flat)](https://www.npmjs.com/package/node-self-heallm)
[![npm license](https://img.shields.io/npm/l/node-self-heallm?style=flat)](https://www.npmjs.com/package/node-self-heallm)
[![Node.js](https://img.shields.io/node/v/node-self-heallm?style=flat)](https://www.npmjs.com/package/node-self-heallm)

[![GitHub stars](https://img.shields.io/github/stars/universe-coder/node-self-heallm?style=flat)](https://github.com/universe-coder/node-self-heallm/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/universe-coder/node-self-heallm?style=flat)](https://github.com/universe-coder/node-self-heallm/network/members)
[![GitHub issues](https://img.shields.io/github/issues/universe-coder/node-self-heallm?style=flat)](https://github.com/universe-coder/node-self-heallm/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/universe-coder/node-self-heallm?style=flat)](https://github.com/universe-coder/node-self-heallm/commits)
[![GitHub license](https://img.shields.io/github/license/universe-coder/node-self-heallm?style=flat)](https://github.com/universe-coder/node-self-heallm/blob/main/LICENSE)

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

### `[heal]` — allowed values

| Field | Allowed values | Purpose |
|------|----------------|---------|
| `mode` | string: `suggest` or `apply` | `suggest` — generate a diff and record audit only; `apply` — allow applying the patch (unless blocked by `dryRun`; see below). |
| `dryRun` | `true` or `false` | When `true`, the patch is never applied to the working tree, even if `mode = "apply"`. |
| `allowedPaths` | array of glob patterns | Paths in the diff that may be modified. |
| `forbiddenPaths` | array of glob patterns | Paths that must not be modified. |
| `maxPatchLines` | positive integer | Upper bound on patch size in lines. |

Runtime behavior: if `dryRun = true` or `mode = "suggest"`, only a proposed diff is produced (audit event `heal_diff_proposed`). `git apply` runs only when `mode = "apply"` and `dryRun = false`.

CLI mapping: `self-heal heal` currently chooses `suggest` vs `apply` from `--apply`, `--auto`, and `--dry-run` / `--no-dry-run`, not from the `[heal].mode` field in the file. The config `mode` mainly reflects intent for programmatic use (`selfHeal("apply")`, etc.) and documents the contract; keep it aligned with how you invoke the CLI. `self-heal run` uses only `--auto` and the dry-run flags. The `selfHeal(mode)` decorator passes the chosen `mode` into the pipeline and uses `dryRun` from `config.heal.dryRun`.

### `[llm].provider` — allowed values

| Value | Description |
|-------|-------------|
| `"openai"` | Chat and embeddings via an OpenAI-compatible API (default). |
| `"huggingface"` | Same protocol, different `baseUrl` (e.g. inference routers). |
| `"ollama"` | Local OpenAI-compatible endpoint. |
| `"anthropic"` | Native Messages API; `index` is not available in this setup (no embeddings path). |

For `[index]`, `[supervisor]`, and `[notifications]`, see the template from `self-heal init` and the example above; booleans are `true` / `false`, lists are TOML arrays of strings or numbers.

## LLM providers

Supported chat providers:
- `openai` (default)
- `huggingface` (OpenAI-compatible endpoint)
- `ollama` (OpenAI-compatible local endpoint)
- `anthropic` (native messages API path)

Important:
- Embeddings path in current code is OpenAI-compatible only.
- With `anthropic`, `self-heal index` intentionally fails fast.

## Choosing LLM models

The workflow sends a traceback plus retrieved code to the chat model and expects a **valid unified diff** back. Pick models that follow instructions reliably; cheap general chat models may omit diff headers, break hunks, or hallucinate paths.

### Chat model (`llm.model`)

| Goal | Suggestion |
|------|------------|
| Everyday fixes, CI noise, tight budget | Stay on the default or similar small multimodal/coding model (e.g. `gpt-4o-mini`). Often enough when the bug is localized and retrieval surfaces the right files. |
| Hard logic, cross-file refactors, unclear stacks | Use a stronger tier on the same API (e.g. `gpt-4o` or the vendor’s latest strong coding model, or a top Claude model). Quality of the diff usually matters more than raw speed. |
| Local / air-gapped (`ollama`, self-hosted OpenAI-compatible) | Prefer **coding-oriented** weights with a **context window** that fits your prompt (traceback + several file chunks). Smoke-test: run `heal` on a known small error and confirm the model returns a clean `diff --git` block. |
| Anthropic (`anthropic`) | Use a current Claude model your key can access. Note: the Anthropic path uses a bounded `max_tokens` for the reply; very large patches may truncate—if that happens, narrow retrieval (`index.topK`, globs) or split the fix manually. |

**Practical tips**

- Keep **one provider** for `index` + `heal` when possible so base URLs and keys stay simple. If you index with OpenAI-compatible and heal with Anthropic, that works, but you maintain two stacks.
- **Temperature** in this package is fixed at `0` for OpenAI-compatible chat—favor models that behave well at low temperature (deterministic, format-following).
- If the model often returns prose instead of a patch, switch up a tier or add a guard in your process (human review, `dryRun`) rather than fighting the same model repeatedly.

### Embedding model (`llm.embeddingModel`)

Only used on **OpenAI-compatible** providers for `self-heal index`.

| Situation | Suggestion |
|-----------|------------|
| Small repos, few languages | Smaller embedding models (e.g. `text-embedding-3-small`) are usually sufficient and cheaper. |
| Large monorepos, similar symbol names, noisy tracebacks | Consider a larger / higher-quality embedding model if your host offers one, so retrieval ranks the right snippets more often. |
| Third-party routers | Use whatever embedding id your `baseUrl` documents; mismatched model names fail at runtime, not at config parse time. |

### Cost, latency, and safety

- **Cost**: Most spend is chat tokens (long prompts + diff output). Embeddings are paid per index rebuild, not per heal.
- **Latency**: Stronger models can be slower; supervised `run` waits on the heal step—budget accordingly for interactive dev.
- **Safety**: A stronger model does not replace policy checks. Combine a capable model with narrow `heal.allowedPaths`, `dryRun` until you trust the flow, and review diffs before `--no-dry-run`.

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

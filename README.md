# node-self-heallm

Self-healing runtime for Node.js and TypeScript projects.

## Status

This package is under active development and currently targets feature parity with the Python `self-heal` project:

- CLI: `init`, `index`, `heal`, `run`, `status`
- Safe unified diff flow (no execution of model output)
- Path policy validation and audit log
- Notifications (webhook, slack, telegram, sentry)

## Install

```bash
npm i node-self-heallm
```

## Security principles

- Never execute model output
- Accept unified diffs only
- Enforce allow/deny path policy
- Redact sensitive data in tracebacks and locals
- Keep secrets in environment variables

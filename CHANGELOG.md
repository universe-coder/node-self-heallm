# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-11

### Added
- Initial npm-ready TypeScript package scaffold with `bin`, `files`, `engines`, build/test/lint scripts, CI workflow, and dry-run pack checks.
- CLI command set with parity targets: `init`, `index`, `heal`, `run`, `status`.
- Config system for `.self-heal.toml` with defaults and environment-based secrets loading.
- LLM client layer with OpenAI-compatible chat/embeddings and Anthropic chat provider support.
- Indexing and retrieval foundations for source scanning, chunking, and traceback-relevant snippet lookup.
- Healing pipeline with audit logging and unified diff extraction.
- Patch safety controls: path allow/deny policy and patch validation limits.
- Supervisor runner and traceback parser for monitored command execution and retry flow.
- Runtime hooks/decorator/error capture with sanitization for secret redaction.
- Notifications subsystem with webhook/slack/telegram/sentry channels, redaction, URL validation, secure HTTP defaults, and webhook HMAC support.
- Unit security-focused tests for URL validation, sanitization, redaction, and path policy.

### Security
- Model output is treated as diff text only; no code execution path is introduced.
- Notification HTTP targets are validated with private/localhost restrictions and redirect denial.
- Secrets are resolved from environment variables and masked in runtime sanitize flow.

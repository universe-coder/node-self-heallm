# Release Checklist

## Versioning and metadata
- [x] Confirm target version in `package.json` (`version`, `name`, `license`, `repository`).
- [x] Ensure `engines.node` matches supported runtime policy.
- [x] Verify `README.md` and `CHANGELOG.md` are up to date for this release.

## Quality gates
- [x] `npm ci`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`

## Security and safety checks
- [x] Verify no secrets are committed (`.env`, tokens, private keys).
- [x] Re-check patch safety defaults (`dryRun`, allowed/forbidden paths, max patch lines).
- [x] Re-check notification URL restrictions and webhook signing behavior.
- [x] Confirm runtime sanitization still redacts sensitive values in traceback/error text.

## Package artifact validation
- [x] `npm run pack:check`
- [x] Inspect tarball content (`npm pack --dry-run`) and ensure only expected files are included.
- [x] Ensure executable entrypoint works from built artifact (`dist/cli/main.js`).

## Publish flow
- [ ] Validate npm auth (`npm whoami`).
- [x] Run publish simulation: `npm publish --dry-run`.
- [ ] Publish: `npm publish --access public` (or org-specific flags if scoped package).
- [ ] Tag release in git and push tags.

## Post-release
- [ ] Verify package visibility and installability from npm registry.
- [ ] Smoke test install in clean directory (`npm i node-self-heallm`).
- [ ] Announce release notes using `CHANGELOG.md` highlights.

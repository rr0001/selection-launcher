# AGENTS.md

## Project conventions

- This is a dependency-free Manifest V3 extension for Chromium browsers.
- Keep the repository root minimal. Extension implementation belongs in `src/`.
- Do not add production or development dependencies without approval.
- Preserve keyboard accessibility and screen-reader support when changing UI.
- Search URLs must remain restricted to HTTP and HTTPS.
- Keep `manifest.json` and `package.json` versions synchronized.
- Keep packaged extension icons in `src/assets/icons/` and store-only media in `docs/store-assets/`.
- Store screenshots must depict real, current extension behavior. Update them when the represented UI changes materially.

## Validation

- After changing JavaScript, run `npm run check` and `npm test`.
- Before a release, run `npm run build`.
- Use `npm run release -- <major|minor|patch>` for public GitHub releases; use its dry-run mode first.
- The release ZIP must contain `manifest.json` at its root.
- Keep `LICENSE` in every release ZIP so the attribution and permission notice travels with distributed copies.
- Manually verify extension changes in both Chrome and Edge when browser behavior is affected.

## Documentation

- Update `README.md` when user-facing behavior changes.
- Keep non-essential project documentation under `docs/`.
- Update `docs/DEVELOPERS.md` when development or build commands change.
- Update `docs/STORE_LISTING.md` when features, permissions, data handling, or store-facing instructions change.
- `docs/RELEASE.local.md` is a private, Git-ignored release runbook.

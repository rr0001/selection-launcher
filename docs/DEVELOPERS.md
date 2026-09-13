# Developer guide

## Host requirements

- [Node.js](https://nodejs.org/) 20 or newer.
- npm, which is included with the standard Node.js installer.
- Git for source-control workflows.
- [GitHub CLI](https://cli.github.com/) for publishing GitHub releases.
- A Chromium-based browser such as Chrome, Edge, or Brave for manual extension testing.

The automated tests use Node's built-in test runner. The project has no third-party runtime or test dependencies, so `npm install` is not required.

Confirm that Node.js and npm are available:

```shell
node --version
npm --version
```

## Run the tests

From the project root, run:

```shell
npm test
```

The tests cover text trimming, whitespace transformations, regular-expression replacements, URL encoding, unsafe-protocol rejection, stored-settings normalization, and semantic-version calculations.

## Run syntax checks

To parse-check every extension JavaScript file without loading the extension in a browser, run:

```shell
npm run check
```

Before submitting a change, run both commands:

```shell
npm run check
npm test
```

## Build a package locally (without publishing)

Create a store-ready ZIP from `manifest.json`, `LICENSE`, and `src/`:

```shell
npm run build
```

The build runs the syntax checks and automated tests first. If they pass, it recreates `dist/selection-launcher-v<version>.zip`. Build output is ignored by Git. The ZIP contains `manifest.json` and `LICENSE` at its root, and excludes tests, project documentation, and developer tooling.

This command is useful for local testing. It does not bump the version, update the changelog, commit, tag, push, or publish anything. The release command always performs its own clean build, so a manually built ZIP is never reused for a GitHub release.

## Publish a GitHub release

Before the first release, install GitHub CLI, run `gh auth login`, configure an `origin` remote, and commit the project. The release command intentionally refuses to run with uncommitted or untracked files.

Publishing is a single-command workflow. Do not run `npm run build` afterward; the release command creates and uploads the authoritative package itself.

Preview the version and generated changelog without changing or building anything:

```shell
npm run release -- patch --dry-run
```

Publish a semantic-version increment:

```shell
npm run release -- patch
npm run release -- minor
npm run release -- major
```

The release command performs these operations in order:

1. Read commits since the previous tag and generate the changelog entry.
2. Bump and synchronize `manifest.json` and `package.json`.
3. Run syntax checks and automated tests.
4. Delete the old `dist/` output and build a fresh versioned ZIP.
5. Verify the ZIP exists, is fresh and nonempty, then generate its SHA-256 checksum.
6. Commit `CHANGELOG.md` and the version files, then create an annotated version tag.
7. Atomically push the commit and tag to `origin`.
8. Create the GitHub release with the freshly built ZIP, checksum, and categorized release notes.

After it succeeds, upload the existing `dist/selection-launcher-v<version>.zip` to the browser stores. Do not rebuild between the GitHub release and store upload.

For a first release, after committing the project at its intended version, publish that current version:

```shell
npm run release -- current
```

An explicit higher version such as `npm run release -- 1.4.0` is also accepted. Chromium extension versions do not support semantic-version prerelease suffixes, so use stable `x.y.z` versions only.

### Commit messages and changelog categories

Use concise Conventional Commit-style subjects so the generated changelog is useful:

```text
feat: add a search-engine shortcut
fix(options): keep replacement controls aligned
docs: add installation screenshots
refactor: simplify selection handling
feat!: change the stored settings format
```

The release script groups `feat` as **Added**, `fix` as **Fixed**, `security` as **Security**, `perf` and `refactor` as **Changed**, `docs` as **Documentation**, and build/test/CI/chore commits as **Maintenance**. A `!` before the colon or a `BREAKING CHANGE:` footer places the entry under **Breaking Changes**. Subjects that do not follow the convention remain visible under **Other Changes**.

## Manual browser testing

1. Open `chrome://extensions` in a Chromium-based browser.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the project root—the directory containing `manifest.json`.
4. If the extension is already loaded, select **Reload** after changing source files.
5. Test on a normal web page; browsers do not inject extensions into protected pages such as `chrome://extensions`.

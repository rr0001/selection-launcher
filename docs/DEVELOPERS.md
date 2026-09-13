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

## Build a release package

Create a store-ready ZIP from `manifest.json`, `LICENSE`, and `src/`:

```shell
npm run build
```

The build runs the syntax checks and automated tests first. If they pass, it creates `dist/selection-launcher-v<version>.zip`. Build output is ignored by Git. The ZIP contains `manifest.json` and `LICENSE` at its root, and excludes tests, project documentation, and developer tooling.

## Publish a GitHub release

Before the first release, install GitHub CLI, run `gh auth login`, configure an `origin` remote, and commit the project. The release command intentionally refuses to run with uncommitted or untracked files.

Preview a release without changing anything:

```shell
npm run release -- patch --dry-run
```

Publish a semantic-version increment:

```shell
npm run release -- patch
npm run release -- minor
npm run release -- major
```

The script synchronizes `manifest.json` and `package.json`, runs the complete build, commits the version as `chore(release): v<version>`, creates an annotated tag, atomically pushes the branch and tag to `origin`, and creates a GitHub release with generated notes and the extension ZIP attached.

For the first `0.1.0` release, after committing the project at version `0.1.0`, publish the current version without an extra version commit:

```shell
npm run release -- current
```

An explicit higher version such as `npm run release -- 1.4.0` is also accepted. Chromium extension versions do not support semantic-version prerelease suffixes, so use stable `x.y.z` versions only.

## Manual browser testing

1. Open `chrome://extensions` in a Chromium-based browser.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the project root—the directory containing `manifest.json`.
4. If the extension is already loaded, select **Reload** after changing source files.
5. Test on a normal web page; browsers do not inject extensions into protected pages such as `chrome://extensions`.

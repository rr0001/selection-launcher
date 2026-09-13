import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(projectRoot, "manifest.json");
const packagePath = join(projectRoot, "package.json");

export function parseVersion(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) {
    throw new Error(`Invalid semantic version "${value}". Use x.y.z without a prerelease suffix.`);
  }
  return match.slice(1).map(Number);
}

export function formatVersion(parts) {
  return parts.join(".");
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
  }
  return 0;
}

export function nextVersion(current, releaseType) {
  const [major, minor, patch] = parseVersion(current);
  if (releaseType === "major") return `${major + 1}.0.0`;
  if (releaseType === "minor") return `${major}.${minor + 1}.0`;
  if (releaseType === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown release type "${releaseType}". Use major, minor, or patch.`);
}

function run(command, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    stdio: capture ? "pipe" : "inherit"
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      throw new Error(`${command} was not found. Install it and ensure it is on PATH.`);
    }
    throw result.error;
  }
  if (!allowFailure && result.status !== 0) {
    const details = capture ? (result.stderr || result.stdout || "").trim() : "";
    throw new Error(`${command} ${args.join(" ")} failed${details ? `: ${details}` : "."}`);
  }
  return {
    status: result.status,
    stdout: capture ? (result.stdout || "").trim() : "",
    stderr: capture ? (result.stderr || "").trim() : ""
  };
}

function runNpmBuild() {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    run(process.execPath, [npmCli, "run", "build"]);
    return;
  }
  run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
}

function readMetadata() {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const packageMetadata = JSON.parse(readFileSync(packagePath, "utf8"));
  parseVersion(manifest.version);
  parseVersion(packageMetadata.version);
  if (manifest.version !== packageMetadata.version) {
    throw new Error(
      `Version mismatch: manifest.json is ${manifest.version}, but package.json is ${packageMetadata.version}.`
    );
  }
  return { manifest, packageMetadata, currentVersion: manifest.version };
}

function writeMetadata(path, metadata) {
  writeFileSync(path, `${JSON.stringify(metadata, null, 2)}\n`);
}

function resolveTarget(currentVersion, requested) {
  if (["major", "minor", "patch"].includes(requested)) {
    return nextVersion(currentVersion, requested);
  }
  if (requested === "current") return currentVersion;
  parseVersion(requested);
  if (compareVersions(requested, currentVersion) < 0) {
    throw new Error(`Requested version ${requested} is older than current version ${currentVersion}.`);
  }
  return requested;
}

function printUsage() {
  console.log(`Usage: npm run release -- <major|minor|patch|current|x.y.z> [--dry-run]

Examples:
  npm run release -- patch
  npm run release -- minor --dry-run
  npm run release -- current

"current" tags and publishes the version already in the manifest without creating
a version commit. It is intended for the first release after the initial commit.`);
}

async function main() {
  const argumentsList = process.argv.slice(2);
  const dryRun = argumentsList.includes("--dry-run");
  const positional = argumentsList.filter((argument) => !argument.startsWith("--"));
  const unknownOptions = argumentsList.filter(
    (argument) => argument.startsWith("--") && argument !== "--dry-run"
  );

  if (positional.length !== 1 || unknownOptions.length) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  run("git", ["--version"], { capture: true });
  run("gh", ["--version"], { capture: true });

  const status = run("git", ["status", "--porcelain", "--untracked-files=all"], {
    capture: true
  }).stdout;
  if (status) {
    throw new Error(
      "The working tree is not clean. Commit or stash every intended change before releasing."
    );
  }

  run("git", ["rev-parse", "--verify", "HEAD"], { capture: true });
  const branch = run("git", ["branch", "--show-current"], { capture: true }).stdout;
  if (!branch) throw new Error("Releases cannot be created from a detached HEAD.");
  run("git", ["remote", "get-url", "origin"], { capture: true });

  const { manifest, packageMetadata, currentVersion } = readMetadata();
  const targetVersion = resolveTarget(currentVersion, positional[0]);
  const tag = `v${targetVersion}`;
  const changesVersion = targetVersion !== currentVersion;
  const archivePath = join(projectRoot, "dist", `selection-launcher-v${targetVersion}.zip`);

  const localTag = run("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], {
    capture: true,
    allowFailure: true
  });
  if (localTag.status === 0) throw new Error(`Local tag ${tag} already exists.`);

  console.log(`\nRelease plan
  Branch:  ${branch}
  Version: ${currentVersion} -> ${targetVersion}${changesVersion ? "" : " (unchanged)"}
  Tag:     ${tag}
  Remote:  origin
  Asset:   ${archivePath}`);

  if (dryRun) {
    console.log("\nDry run complete. No files, commits, tags, pushes, or releases were changed.");
    return;
  }

  run("gh", ["auth", "status"]);
  const remoteTag = run(
    "git",
    ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`],
    { capture: true, allowFailure: true }
  );
  if (remoteTag.status === 0) throw new Error(`Remote tag ${tag} already exists.`);
  if (remoteTag.status !== 2) {
    throw new Error(`Could not check whether ${tag} exists on origin: ${remoteTag.stderr}`);
  }

  const originalManifest = readFileSync(manifestPath, "utf8");
  const originalPackage = readFileSync(packagePath, "utf8");
  let committed = false;

  try {
    if (changesVersion) {
      manifest.version = targetVersion;
      packageMetadata.version = targetVersion;
      writeMetadata(manifestPath, manifest);
      writeMetadata(packagePath, packageMetadata);
    }

    runNpmBuild();

    if (changesVersion) {
      run("git", ["add", "--", "manifest.json", "package.json"]);
      run("git", ["diff", "--cached", "--check"]);
      run("git", ["commit", "-m", `chore(release): ${tag}`]);
      committed = true;
    }
  } catch (error) {
    if (changesVersion && !committed) {
      writeFileSync(manifestPath, originalManifest);
      writeFileSync(packagePath, originalPackage);
      run("git", ["restore", "--staged", "--", "manifest.json", "package.json"], {
        allowFailure: true
      });
    }
    throw error;
  }

  run("git", ["tag", "-a", tag, "-m", `Selection Launcher ${tag}`]);
  run("git", [
    "push",
    "--atomic",
    "origin",
    `HEAD:refs/heads/${branch}`,
    `refs/tags/${tag}`
  ]);

  try {
    run("gh", [
      "release",
      "create",
      tag,
      archivePath,
      "--verify-tag",
      "--title",
      `Selection Launcher ${tag}`,
      "--generate-notes"
    ]);
  } catch (error) {
    throw new Error(
      `${error.message}\nThe commit and tag were pushed successfully. Retry only the GitHub release with:\n` +
      `gh release create ${tag} "${archivePath}" --verify-tag --title "Selection Launcher ${tag}" --generate-notes`
    );
  }

  console.log(`\nPublished Selection Launcher ${tag} successfully.`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(`\nRelease failed: ${error.message}`);
    process.exitCode = 1;
  });
}

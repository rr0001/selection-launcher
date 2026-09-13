import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const changelogPath = join(projectRoot, "CHANGELOG.md");
const manifestPath = join(projectRoot, "manifest.json");
const packagePath = join(projectRoot, "package.json");

const CHANGELOG_MARKER = "<!-- releases -->";
const CATEGORY_ORDER = [
  "Breaking Changes",
  "Added",
  "Fixed",
  "Security",
  "Changed",
  "Removed",
  "Deprecated",
  "Documentation",
  "Maintenance",
  "Other Changes"
];

const TYPE_CATEGORIES = Object.freeze({
  feat: "Added",
  fix: "Fixed",
  security: "Security",
  perf: "Changed",
  refactor: "Changed",
  remove: "Removed",
  deprecate: "Deprecated",
  docs: "Documentation",
  build: "Maintenance",
  chore: "Maintenance",
  ci: "Maintenance",
  test: "Maintenance"
});

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

export function parseConventionalCommit({ hash = "", subject = "", body = "" }) {
  const match = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/i.exec(subject.trim());
  const type = match?.[1]?.toLowerCase();
  const scope = match?.[2];
  const breaking = Boolean(match?.[3]) || /^BREAKING[ -]CHANGE:\s*.+$/im.test(body);
  const description = (match?.[4] || subject.trim() || "Unspecified change").replace(/\s+/g, " ");
  const readableDescription = description.charAt(0).toUpperCase() + description.slice(1);
  const shortHash = hash.slice(0, 7);

  return {
    category: breaking ? "Breaking Changes" : (TYPE_CATEGORIES[type] || "Other Changes"),
    text: `${scope ? `**${scope}:** ` : ""}${readableDescription}${shortHash ? ` (\`${shortHash}\`)` : ""}`
  };
}

export function renderReleaseNotes(version, date, commits) {
  const categorized = new Map(CATEGORY_ORDER.map((category) => [category, []]));
  for (const commit of commits) {
    const entry = parseConventionalCommit(commit);
    categorized.get(entry.category).push(entry.text);
  }

  const sections = CATEGORY_ORDER
    .filter((category) => categorized.get(category).length)
    .map((category) => [
      `### ${category}`,
      "",
      ...categorized.get(category).map((entry) => `- ${entry}`)
    ].join("\n"));

  if (!sections.length) throw new Error("No releasable commits were found.");
  return [`## ${version} - ${date}`, ...sections].join("\n\n");
}

export function updateChangelog(content, releaseNotes) {
  if (!content.includes(CHANGELOG_MARKER)) {
    throw new Error(`CHANGELOG.md must contain ${CHANGELOG_MARKER}.`);
  }
  const heading = releaseNotes.split("\n", 1)[0];
  if (content.includes(heading)) {
    throw new Error(`${heading.replace(/^## /, "Version ")} is already in CHANGELOG.md.`);
  }
  return content.replace(CHANGELOG_MARKER, `${CHANGELOG_MARKER}\n\n${releaseNotes.trim()}`);
}

export function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function run(command, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
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

function readReleaseCommits() {
  const previousTagResult = run(
    "git",
    ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*"],
    { capture: true, allowFailure: true }
  );
  const previousTag = previousTagResult.status === 0 ? previousTagResult.stdout : "";
  const range = previousTag ? `${previousTag}..HEAD` : "HEAD";
  const output = run(
    "git",
    ["log", range, "--no-merges", "--format=%H%x1f%s%x1f%b%x1e"],
    { capture: true }
  ).stdout;
  const commits = output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, ...bodyParts] = record.split("\x1f");
      return { hash, subject, body: bodyParts.join("\x1f") };
    })
    .filter((commit) => !/^chore\(release\):\s+v\d+\.\d+\.\d+$/i.test(commit.subject));

  if (!commits.length) {
    throw new Error(`No releasable commits were found${previousTag ? ` after ${previousTag}` : ""}.`);
  }
  return { commits, previousTag };
}

function localDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function runNpmBuild() {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    run(process.execPath, [npmCli, "run", "build"]);
    return;
  }
  run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
}

function verifyFreshArchive(archivePath, targetVersion, buildStartedAt) {
  if (!existsSync(archivePath)) {
    throw new Error(`The build did not create the expected ${basename(archivePath)}.`);
  }

  const archive = statSync(archivePath);
  if (!archive.isFile() || archive.size === 0) {
    throw new Error(`The release archive for ${targetVersion} is empty or invalid.`);
  }
  if (archive.mtimeMs < buildStartedAt - 2000) {
    throw new Error(`The release archive for ${targetVersion} was not freshly built.`);
  }

  const digest = sha256(readFileSync(archivePath));
  const checksumPath = join(dirname(archivePath), `${basename(archivePath)}.sha256`);
  writeFileSync(checksumPath, `${digest}  ${basename(archivePath)}\n`);
  return { checksumPath, digest, size: archive.size };
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

"current" publishes the version already in the manifest. It is intended for the
first release after the initial commit. Every release updates CHANGELOG.md.`);
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
  const releaseNotesPath = join(projectRoot, "dist", `release-notes-v${targetVersion}.md`);
  const { commits, previousTag } = readReleaseCommits();
  const releaseNotes = renderReleaseNotes(targetVersion, localDate(), commits);

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
  Since:   ${previousTag || "first commit"}
  Asset:   ${archivePath}

${releaseNotes}`);

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
  const originalChangelog = readFileSync(changelogPath, "utf8");
  let committed = false;
  let checksumPath = "";

  try {
    console.log("\n[1/7] Generating changelog and updating version metadata...");
    if (changesVersion) {
      manifest.version = targetVersion;
      packageMetadata.version = targetVersion;
      writeMetadata(manifestPath, manifest);
      writeMetadata(packagePath, packageMetadata);
    }

    writeFileSync(changelogPath, updateChangelog(originalChangelog, releaseNotes));

    console.log("[2/7] Running checks and tests, then building a clean package...");
    const buildStartedAt = Date.now();
    runNpmBuild();

    console.log("[3/7] Verifying the freshly built release asset...");
    const verifiedArchive = verifyFreshArchive(archivePath, targetVersion, buildStartedAt);
    checksumPath = verifiedArchive.checksumPath;
    writeFileSync(releaseNotesPath, `${releaseNotes}\n`);
    console.log(`Verified ${basename(archivePath)} (${verifiedArchive.size} bytes)`);
    console.log(`SHA-256: ${verifiedArchive.digest}`);

    console.log("[4/7] Creating the release commit...");
    const releaseFiles = changesVersion
      ? ["CHANGELOG.md", "manifest.json", "package.json"]
      : ["CHANGELOG.md"];
    run("git", ["add", "--", ...releaseFiles]);
    run("git", ["diff", "--cached", "--check"]);
    run("git", ["commit", "-m", `chore(release): ${tag}`]);
    committed = true;
  } catch (error) {
    if (!committed) {
      writeFileSync(changelogPath, originalChangelog);
      if (changesVersion) {
        writeFileSync(manifestPath, originalManifest);
        writeFileSync(packagePath, originalPackage);
      }
      run("git", ["restore", "--staged", "--", "CHANGELOG.md", "manifest.json", "package.json"], {
        allowFailure: true
      });
    }
    throw error;
  }

  console.log("[5/7] Creating the annotated version tag...");
  run("git", ["tag", "-a", tag, "-m", `Selection Launcher ${tag}`]);
  console.log("[6/7] Atomically pushing the release commit and tag...");
  run("git", [
    "push",
    "--atomic",
    "origin",
    `HEAD:refs/heads/${branch}`,
    `refs/tags/${tag}`
  ]);

  try {
    console.log("[7/7] Publishing the GitHub release with the verified package...");
    run("gh", [
      "release",
      "create",
      tag,
      archivePath,
      checksumPath,
      "--verify-tag",
      "--title",
      `Selection Launcher ${tag}`,
      "--notes-file",
      releaseNotesPath
    ]);
  } catch (error) {
    throw new Error(
      `${error.message}\nThe commit and tag were pushed successfully. Retry only the GitHub release with:\n` +
      `gh release create ${tag} "${archivePath}" "${checksumPath}" --verify-tag --title "Selection Launcher ${tag}" --notes-file "${releaseNotesPath}"`
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

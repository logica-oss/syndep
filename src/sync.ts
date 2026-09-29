import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { isRecursionGuarded, withRecursionGuard } from "./guard.ts";
import { hashManifests } from "./hash.ts";
import { detectPackageManager, getManifestPaths, runInstall } from "./pm/index.ts";
import { clearRecordedHash, readRecordedHash, writeRecordedHash } from "./record.ts";

export interface SyncOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

// Resolve the repo root so hooks run from any subdirectory. Falls back to cwd
// when git is unavailable (tarballs, non-git envs); hook setup itself is best-effort.
const resolveRoot = (cwd: string): string => {
  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (root.length > 0) {
      return root;
    }
  } catch {
    // Fall through to cwd.
  }
  return cwd;
};

const syncOnce = (root: string, env: NodeJS.ProcessEnv, hash: string): void => {
  const pm = detectPackageManager({ cwd: root, env });

  if (runInstall({ cwd: root, pm, env: withRecursionGuard(env) })) {
    writeRecordedHash(root, hash);
  } else {
    clearRecordedHash(root);
  }
};

// Throws on unexpected failures; the bin catches and warns so git never fails.
export const syncDeps = (options: SyncOptions = {}): void => {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  if (isRecursionGuarded(env)) {
    return;
  }

  const root = resolveRoot(cwd);
  const manifests = getManifestPaths({ cwd: root, env });
  if (manifests.length === 0) {
    return;
  }

  const current = hashManifests(root, manifests);

  // Missing node_modules always counts as drift (fresh clone, clean checkout).
  if (!existsSync(path.join(root, "node_modules"))) {
    console.log("[syndep] node_modules missing, running install ...");
    syncOnce(root, env, current);
    return;
  }

  if (current !== "" && current === readRecordedHash(root)) {
    return;
  }

  console.log("[syndep] dependencies out of sync, running install ...");
  syncOnce(root, env, current);
};

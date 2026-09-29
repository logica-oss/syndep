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
  } catch {}

  return cwd;
};

const syncOnce = (root: string, env: NodeJS.ProcessEnv): void => {
  const pm = detectPackageManager({ cwd: root, env });

  if (!runInstall({ cwd: root, pm, env: withRecursionGuard(env) })) {
    clearRecordedHash(root);
    return;
  }

  // Install may normalize lockfiles, so rehash after running.
  const manifests = getManifestPaths({ cwd: root, env });
  if (manifests.length === 0) {
    clearRecordedHash(root);
    return;
  }

  writeRecordedHash(root, hashManifests(root, manifests));
};

export const syncDeps = (options: SyncOptions = {}): boolean => {
  const env = options.env ?? process.env;
  if (isRecursionGuarded(env)) {
    return false;
  }

  const cwd = options.cwd ?? process.cwd();
  const root = resolveRoot(cwd);

  if (!existsSync(path.join(root, "node_modules"))) {
    console.log("[syndep] node_modules missing, running install ...");
    syncOnce(root, env);
    return true;
  }

  const manifests = getManifestPaths({ cwd: root, env });
  if (manifests.length === 0) {
    return false;
  }

  const current = hashManifests(root, manifests);
  if (current !== "" && current === readRecordedHash(root)) {
    return false;
  }

  console.log("[syndep] dependencies out of sync, running install ...");
  syncOnce(root, env);

  return true;
};

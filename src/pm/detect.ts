import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  isPackageManager,
  LOCKFILE_PRIORITY,
  type ManifestScope,
  type PackageManager,
} from "./managers.ts";

const normalize = (name: string): PackageManager | undefined => {
  const lower = name.toLowerCase();
  return isPackageManager(lower) ? lower : undefined;
};

const parseManagerName = (raw: string, separator: string): PackageManager | undefined => {
  const name = raw.split(separator)[0] ?? "";
  return normalize(name.trim());
};

const readPackageManagerField = (cwd: string): PackageManager | undefined => {
  const pkgPath = path.join(cwd, "package.json");
  if (!existsSync(pkgPath)) {
    return undefined;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return undefined;
  }
  if (typeof raw !== "object" || raw === null || !("packageManager" in raw)) {
    return undefined;
  }

  const packageManager = (raw as { packageManager?: unknown }).packageManager;
  if (typeof packageManager !== "string") {
    return undefined;
  }

  // Format is "<name>@<version>", e.g. "pnpm@9.0.0".
  return parseManagerName(packageManager, "@");
};

const detectByLockfile = (cwd: string): PackageManager | undefined => {
  for (const { file, pm } of LOCKFILE_PRIORITY) {
    if (existsSync(path.join(cwd, file))) {
      return pm;
    }
  }

  return undefined;
};

const detectByUserAgent = (env: NodeJS.ProcessEnv): PackageManager | undefined => {
  const agent = env["npm_config_user_agent"];
  if (typeof agent !== "string" || agent.length === 0) {
    return undefined;
  }

  // Format is "<name>/<version> ...", e.g. "pnpm/9.0.0 npm/? node/v22".
  const first = agent.split(" ")[0] ?? "";
  return parseManagerName(first, "/");
};

// Detection order: packageManager field -> lockfile -> npm_config_user_agent.
export const detectPackageManager = (options: ManifestScope): PackageManager => {
  const { cwd, env } = options;

  return readPackageManagerField(cwd) ?? detectByLockfile(cwd) ?? detectByUserAgent(env) ?? "npm";
};

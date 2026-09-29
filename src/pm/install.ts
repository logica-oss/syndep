import { spawnSync } from "node:child_process";

import { PACKAGE_MANAGERS, type ManifestScope, type PackageManager } from "./managers.ts";

const isCi = (env: NodeJS.ProcessEnv): boolean => env["CI"] === "true" || env["CI"] === "1";

const buildInstallCommand = (pm: PackageManager, env: NodeJS.ProcessEnv): string[] => {
  const ci = isCi(env);
  const { local, ci: ciCommand } = PACKAGE_MANAGERS[pm].install;

  return ci ? ciCommand : local;
};

const isRuntimeAvailable = ({ cwd, pm, env }: RunInstallOptions): boolean => {
  const result = spawnSync(pm, ["--version"], {
    cwd,
    stdio: "ignore",
    shell: process.platform === "win32",
    env,
  });

  return result.status === 0;
};

export interface RunInstallOptions extends ManifestScope {
  pm: PackageManager;
}

// Returns true on success. Install failures only warn so git never fails.
export const runInstall = ({ cwd, pm, env }: RunInstallOptions): boolean => {
  if (!isRuntimeAvailable({ cwd, pm, env })) {
    console.warn(
      `[syndep] ${pm} not found, skipping install (see ${PACKAGE_MANAGERS[pm].runtimeHint})`,
    );
    return false;
  }

  const [cmd, ...args] = buildInstallCommand(pm, env);
  const command = cmd ?? pm;
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    console.warn(`[syndep] ${command} ${args.join(" ")} failed, continuing`);
    return false;
  }

  return true;
};

// Test-only surface. Production code must not import this.
export const __test__ = {
  buildInstallCommand,
  isCi,
};

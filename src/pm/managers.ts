import { existsSync } from "node:fs";
import path from "node:path";

import { detectPackageManager } from "./detect.ts";

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm" | "deno";

export interface PackageManagerInfo {
  lockFiles: string[];
  extraManifests: string[];
  install: { local: string[]; ci: string[] };
  runtimeHint: string;
}

export interface ManifestScope {
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export const PACKAGE_MANAGERS: Record<PackageManager, PackageManagerInfo> = {
  bun: {
    lockFiles: ["bun.lock", "bun.lockb"],
    extraManifests: [],
    install: {
      local: ["bun", "install"],
      ci: ["bun", "install", "--frozen-lockfile"],
    },
    runtimeHint: "https://bun.sh",
  },
  pnpm: {
    lockFiles: ["pnpm-lock.yaml"],
    extraManifests: [],
    install: {
      local: ["pnpm", "install"],
      ci: ["pnpm", "install", "--frozen-lockfile"],
    },
    runtimeHint: "https://pnpm.io/installation",
  },
  yarn: {
    lockFiles: ["yarn.lock"],
    extraManifests: [],
    install: {
      local: ["yarn", "install"],
      ci: ["yarn", "install", "--immutable"],
    },
    runtimeHint: "https://yarnpkg.com/getting-started/install",
  },
  npm: {
    lockFiles: ["package-lock.json"],
    extraManifests: [],
    install: {
      local: ["npm", "install"],
      ci: ["npm", "ci"],
    },
    runtimeHint: "https://nodejs.org",
  },
  deno: {
    lockFiles: ["deno.lock", "deno.lockb"],
    extraManifests: ["deno.json", "deno.jsonc"],
    install: {
      local: ["deno", "install"],
      ci: ["deno", "install"],
    },
    runtimeHint: "https://deno.com",
  },
};

const MANAGER_NAMES: ReadonlySet<string> = new Set(Object.keys(PACKAGE_MANAGERS));
export const isPackageManager = (name: string): name is PackageManager => MANAGER_NAMES.has(name);

// First match wins when several lockfiles coexist.
// Keep npm before deno because npm's package-lock.json is far more common in mixed checkouts.
const PRIORITY_ORDER: PackageManager[] = ["bun", "pnpm", "yarn", "npm", "deno"];
export const LOCKFILE_PRIORITY: Array<{ file: string; pm: PackageManager }> =
  PRIORITY_ORDER.flatMap((pm) => PACKAGE_MANAGERS[pm].lockFiles.map((file) => ({ file, pm })));

const getManifestCandidates = (pm: PackageManager): string[] => [
  "package.json",
  ...PACKAGE_MANAGERS[pm].extraManifests,
  ...PACKAGE_MANAGERS[pm].lockFiles,
];

export const getManifestPaths = (options: ManifestScope): string[] => {
  const pm = detectPackageManager(options);
  return getManifestCandidates(pm).filter((file) => existsSync(path.join(options.cwd, file)));
};

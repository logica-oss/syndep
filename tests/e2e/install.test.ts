import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { withRecursionGuard } from "../../src/guard.ts";
import { hashManifests } from "../../src/hash.ts";
import { syncDeps } from "../../src/index.ts";
import { detectPackageManager, getManifestPaths, type PackageManager } from "../../src/pm/index.ts";
import { readRecordedHash } from "../../src/record.ts";

const TEST_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..", "..");
const FIXTURE_ROOT = path.join(TEST_DIR, "fixtures");

const miseBinPaths = (): string[] => {
  try {
    const result = Bun.spawnSync(["mise", "bin-paths", "-C", REPO_ROOT]);
    if (!result.success) {
      return [];
    }

    return result.stdout
      .toString()
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  } catch {
    return [];
  }
};
const MISE_PATHS = miseBinPaths();

// Temp dirs have no mise config, so shims would fail version resolution.
const PATH_WITHOUT_SHIMS = (process.env["PATH"] ?? "")
  .split(path.delimiter)
  .filter((entry) => !entry.endsWith("/shims"))
  .join(path.delimiter);

const TEST_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: [...MISE_PATHS, PATH_WITHOUT_SHIMS]
    .filter((entry) => entry.length > 0)
    .join(path.delimiter),
};

const PM_NAMES = [
  "bun",
  "pnpm",
  "yarn",
  "npm",
  "deno",
] as const satisfies readonly PackageManager[];

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const setupVirtualEnv = (pm: PackageManager): { dir: string; env: NodeJS.ProcessEnv } => {
  const dir = mkdtempSync(path.join(tmpdir(), `syndep-e2e-${pm}-`));
  dirs.push(dir);

  cpSync(path.join(FIXTURE_ROOT, pm), dir, { recursive: true });
  rmSync(path.join(dir, "node_modules"), { recursive: true, force: true });

  return { dir, env: TEST_ENV };
};

const touchPackageJson = (dir: string): void => {
  const pkgPath = path.join(dir, "package.json");
  const raw: unknown = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("fixture package.json is not an object");
  }

  const pkg: Record<string, unknown> = { ...raw };
  pkg["syndepE2e"] = Date.now();

  writeFileSync(pkgPath, JSON.stringify(pkg));
};

const touchLockfile = (dir: string, env: NodeJS.ProcessEnv): void => {
  const target = getManifestPaths({ cwd: dir, env }).find(
    (file) => file !== "package.json" && file !== "deno.json" && file !== "deno.jsonc",
  );
  if (target === undefined) {
    // Bun deletes empty lockfiles, so touch package.json to force drift.
    touchPackageJson(dir);
    return;
  }

  const filePath = path.join(dir, target);
  writeFileSync(filePath, `${readFileSync(filePath, "utf8")}\n`);
};

const touchDenoJson = (dir: string): void => {
  const filePath = path.join(dir, "deno.json");
  writeFileSync(filePath, `${readFileSync(filePath, "utf8")}\n`);
};

const currentHash = (dir: string, env: NodeJS.ProcessEnv): string => {
  const manifests = getManifestPaths({ cwd: dir, env });
  return hashManifests(dir, manifests);
};

for (const pm of PM_NAMES) {
  describe(`e2e: ${pm}`, () => {
    it("installs when node_modules is missing, then stays in sync", () => {
      const { dir, env } = setupVirtualEnv(pm);

      expect(detectPackageManager({ cwd: dir, env })).toBe(pm);

      expect(syncDeps({ cwd: dir, env })).toBe(true);
      expect(statSync(path.join(dir, "node_modules")).isDirectory()).toBe(true);
      expect(readRecordedHash(dir)).toBe(currentHash(dir, env));

      expect(syncDeps({ cwd: dir, env })).toBe(false);
      const second = readRecordedHash(dir);
      expect(second).toBe(currentHash(dir, env));

      expect(syncDeps({ cwd: dir, env })).toBe(false);
      expect(readRecordedHash(dir)).toBe(second);
      expect(readRecordedHash(dir)).toBe(currentHash(dir, env));
    }, 120_000);

    it("reinstalls when package.json drifts", () => {
      const { dir, env } = setupVirtualEnv(pm);

      expect(syncDeps({ cwd: dir, env })).toBe(true);
      const before = readRecordedHash(dir);
      expect(before.length).toBeGreaterThan(0);

      touchPackageJson(dir);

      expect(syncDeps({ cwd: dir, env })).toBe(true);
      expect(readRecordedHash(dir)).not.toBe(before);
      expect(readRecordedHash(dir)).toBe(currentHash(dir, env));
    }, 120_000);

    it("reinstalls when the lockfile drifts", () => {
      const { dir, env } = setupVirtualEnv(pm);

      expect(syncDeps({ cwd: dir, env })).toBe(true);
      const before = readRecordedHash(dir);
      expect(before.length).toBeGreaterThan(0);

      touchLockfile(dir, env);

      expect(syncDeps({ cwd: dir, env })).toBe(true);
      expect(readRecordedHash(dir)).toBe(currentHash(dir, env));
    }, 120_000);

    it("reinstalls when node_modules is removed", () => {
      const { dir, env } = setupVirtualEnv(pm);

      expect(syncDeps({ cwd: dir, env })).toBe(true);

      rmSync(path.join(dir, "node_modules"), { recursive: true, force: true });

      expect(syncDeps({ cwd: dir, env })).toBe(true);
      expect(readRecordedHash(dir)).toBe(currentHash(dir, env));
    }, 120_000);

    it("skips when the recursion guard is set", () => {
      const { dir, env } = setupVirtualEnv(pm);

      expect(syncDeps({ cwd: dir, env: withRecursionGuard(env) })).toBe(false);
      expect(readRecordedHash(dir)).toBe("");
    }, 120_000);
  });
}

describe("e2e: deno", () => {
  it("reinstalls when deno.json drifts", () => {
    const { dir, env } = setupVirtualEnv("deno");

    expect(syncDeps({ cwd: dir, env })).toBe(true);
    const before = readRecordedHash(dir);
    expect(before.length).toBeGreaterThan(0);

    touchDenoJson(dir);

    expect(syncDeps({ cwd: dir, env })).toBe(true);
    expect(readRecordedHash(dir)).not.toBe(before);
    expect(readRecordedHash(dir)).toBe(currentHash(dir, env));
  }, 120_000);
});

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { syncDeps } from "../../src/index.ts";
import type { PackageManager } from "../../src/pm/index.ts";
import { readRecordedHash } from "../../src/record.ts";

const FIXTURE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

const MISE_BIN = path.join(process.env["HOME"] ?? "", ".local/share/mise/installs");

const withMiseBin = (tool: string, version: string, subdir = "bin"): NodeJS.ProcessEnv => {
  // Exclude mise shims so pnpm does not see the parent packageManager pin.
  const filtered = (process.env["PATH"] ?? "")
    .split(path.delimiter)
    .filter((entry) => !entry.endsWith("/shims"))
    .join(path.delimiter);

  return {
    ...process.env,
    PATH: `${path.join(MISE_BIN, tool, version, subdir)}${path.delimiter}${filtered}`,
  };
};

const PM_NAMES = [
  "bun",
  "pnpm",
  "yarn",
  "npm",
  "deno",
] as const satisfies readonly PackageManager[];

const ENVS: Record<PackageManager, NodeJS.ProcessEnv> = {
  bun: withMiseBin("bun", "1.4.2"),
  pnpm: withMiseBin("pnpm", "12.8.1", "."),
  yarn: withMiseBin("yarn", "1.22.22"),
  npm: { ...process.env },
  deno: withMiseBin("deno", "2.9.7"),
};

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Copy the fixture into a temp dir so each run starts from a virtual env
// without node_modules or a recorded hash.
const setupVirtualEnv = (pm: PackageManager): { dir: string; env: NodeJS.ProcessEnv } => {
  const dir = mkdtempSync(path.join(tmpdir(), `syndep-e2e-${pm}-`));
  dirs.push(dir);
  cpSync(path.join(FIXTURE_ROOT, pm), dir, { recursive: true });
  return { dir, env: { ...ENVS[pm], COREPACK_ENABLE_STRICT: "0" } };
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

for (const pm of PM_NAMES) {
  describe(`e2e: ${pm}`, () => {
    it("installs on missing node_modules and skips when in sync", () => {
      const { dir, env } = setupVirtualEnv(pm);

      syncDeps({ cwd: dir, env });
      expect(readRecordedHash(dir).length).toBeGreaterThan(0);

      // Second run must be a no-op: install rewrites the lockfile, so the
      // recorded hash is refreshed on every run. A marker file proves the PM
      // was not invoked again.
      const marker = path.join(dir, "node_modules", ".syndep-e2e-marker");
      writeFileSync(marker, "marker");
      syncDeps({ cwd: dir, env });
      expect(existsSync(marker)).toBe(true);
    }, 120_000);

    it("reinstalls when manifests drift", () => {
      const { dir, env } = setupVirtualEnv(pm);

      syncDeps({ cwd: dir, env });
      const before = readRecordedHash(dir);
      expect(before.length).toBeGreaterThan(0);

      // package.json is always hashed, so mutating it forces drift.
      touchPackageJson(dir);

      syncDeps({ cwd: dir, env });
      expect(readRecordedHash(dir)).not.toBe(before);
    }, 120_000);
  });
}

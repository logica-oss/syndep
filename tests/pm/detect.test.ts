import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { detectPackageManager } from "../../src/pm/index.ts";

const makeDir = (): string => mkdtempSync(path.join(tmpdir(), "syndep-detect-"));

describe("detectPackageManager", () => {
  it("prefers the packageManager field over lockfiles", () => {
    const dir = makeDir();
    try {
      writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ packageManager: "pnpm@9.0.0" }),
      );
      writeFileSync(path.join(dir, "bun.lock"), "");
      expect(detectPackageManager({ cwd: dir, env: {} })).toBe("pnpm");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("falls back to lockfile detection", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "package.json"), JSON.stringify({}));
      writeFileSync(path.join(dir, "yarn.lock"), "");
      expect(detectPackageManager({ cwd: dir, env: {} })).toBe("yarn");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prefers bun.lock over package-lock.json", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "bun.lock"), "");
      writeFileSync(path.join(dir, "package-lock.json"), JSON.stringify({}));
      expect(detectPackageManager({ cwd: dir, env: {} })).toBe("bun");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads npm_config_user_agent when no other source exists", () => {
    const dir = makeDir();
    try {
      mkdirSync(dir, { recursive: true });
      expect(
        detectPackageManager({
          cwd: dir,
          env: { npm_config_user_agent: "pnpm/9.0.0 npm/? node/v22" },
        }),
      ).toBe("pnpm");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("defaults to npm", () => {
    const dir = makeDir();
    try {
      expect(detectPackageManager({ cwd: dir, env: {} })).toBe("npm");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getManifestPaths } from "../../src/pm/index.ts";

const makeDir = (): string => mkdtempSync(path.join(tmpdir(), "syndep-manifests-"));

describe("getManifestPaths", () => {
  it("prefers the packageManager field over coexisting lockfiles", () => {
    const dir = makeDir();
    try {
      writeFileSync(
        path.join(dir, "package.json"),
        JSON.stringify({ packageManager: "pnpm@9.0.0" }),
      );
      writeFileSync(path.join(dir, "bun.lock"), "");
      writeFileSync(path.join(dir, "pnpm-lock.yaml"), "");
      expect(getManifestPaths({ cwd: dir, env: {} })).toEqual(["package.json", "pnpm-lock.yaml"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolves bun before npm when both lockfiles coexist", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "package.json"), "{}");
      writeFileSync(path.join(dir, "bun.lock"), "");
      writeFileSync(path.join(dir, "package-lock.json"), "{}");
      expect(getManifestPaths({ cwd: dir, env: {} })).toEqual(["package.json", "bun.lock"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("includes deno.json only for deno projects", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "package.json"), "{}");
      writeFileSync(path.join(dir, "deno.json"), "{}");
      writeFileSync(path.join(dir, "deno.lock"), "{}");
      expect(getManifestPaths({ cwd: dir, env: {} })).toEqual([
        "package.json",
        "deno.json",
        "deno.lock",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ignores deno.json for npm projects", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "package.json"), "{}");
      writeFileSync(path.join(dir, "deno.json"), "{}");
      writeFileSync(path.join(dir, "package-lock.json"), "{}");
      expect(getManifestPaths({ cwd: dir, env: {} })).toEqual([
        "package.json",
        "package-lock.json",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

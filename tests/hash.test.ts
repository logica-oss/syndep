import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { hashManifests } from "../src/hash.ts";
import { getManifestPaths } from "../src/pm/index.ts";
import { readRecordedHash, writeRecordedHash } from "../src/record.ts";

const makeDir = (): string => mkdtempSync(path.join(tmpdir(), "syndep-hash-"));

describe("hashManifests", () => {
  it("is stable and content-sensitive", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x" }));
      const first = hashManifests(dir, ["package.json"]);
      const second = hashManifests(dir, ["package.json"]);
      expect(second).toBe(first);

      writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "y" }));
      expect(hashManifests(dir, ["package.json"])).not.toBe(first);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is order-independent", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "package.json"), "{}");
      writeFileSync(path.join(dir, "bun.lock"), "lock");
      expect(hashManifests(dir, ["bun.lock", "package.json"])).toBe(
        hashManifests(dir, ["package.json", "bun.lock"]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("getManifestPaths", () => {
  it("lists only existing manifests", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "package.json"), "{}");
      expect(getManifestPaths({ cwd: dir, env: process.env })).toEqual(["package.json"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("hashManifests + record round-trip", () => {
  it("writes and reads the recorded hash", () => {
    const dir = makeDir();
    try {
      writeFileSync(path.join(dir, "package.json"), "{}");
      const current = hashManifests(dir, ["package.json"]);
      expect(current.length).toBeGreaterThan(0);
      writeRecordedHash(dir, current);
      expect(readRecordedHash(dir)).toBe(current);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { clearRecordedHash, readRecordedHash, writeRecordedHash } from "../src/record.ts";

const makeDir = (): string => mkdtempSync(path.join(tmpdir(), "syndep-record-"));

describe("readRecordedHash", () => {
  it("returns empty when no record exists", () => {
    const dir = makeDir();
    try {
      expect(readRecordedHash(dir)).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns empty when cwd does not exist", () => {
    const parent = makeDir();
    const dir = path.join(parent, "missing");
    try {
      expect(readRecordedHash(dir)).toBe("");
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it("trims trailing newlines written by writeRecordedHash", () => {
    const dir = makeDir();
    try {
      writeRecordedHash(dir, "abc");
      expect(readRecordedHash(dir)).toBe("abc");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("clearRecordedHash", () => {
  it("removes the record and stays silent when absent", () => {
    const dir = makeDir();
    try {
      writeRecordedHash(dir, "abc");
      expect(readRecordedHash(dir)).toBe("abc");

      clearRecordedHash(dir);
      expect(readRecordedHash(dir)).toBe("");

      expect(() => clearRecordedHash(dir)).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stays silent when cwd does not exist", () => {
    const parent = makeDir();
    const dir = path.join(parent, "missing");
    try {
      expect(() => clearRecordedHash(dir)).not.toThrow();
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });
});

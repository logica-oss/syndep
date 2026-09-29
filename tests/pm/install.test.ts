import { describe, expect, it } from "vitest";

import type { PackageManager } from "../../src/pm/index.ts";
import { __test__ } from "../../src/pm/install.ts";

const { buildInstallCommand, isCi } = __test__;

describe("isCi", () => {
  it("detects CI=true", () => {
    expect(isCi({ CI: "true" })).toBe(true);
  });

  it("detects CI=1", () => {
    expect(isCi({ CI: "1" })).toBe(true);
  });

  it("returns false without CI", () => {
    expect(isCi({})).toBe(false);
  });
});

describe("buildInstallCommand", () => {
  const cases: Array<{ pm: PackageManager; local: string[]; ci: string[] }> = [
    { pm: "bun", local: ["bun", "install"], ci: ["bun", "install", "--frozen-lockfile"] },
    { pm: "pnpm", local: ["pnpm", "install"], ci: ["pnpm", "install", "--frozen-lockfile"] },
    { pm: "yarn", local: ["yarn", "install"], ci: ["yarn", "install", "--immutable"] },
    { pm: "npm", local: ["npm", "install"], ci: ["npm", "ci"] },
    { pm: "deno", local: ["deno", "install"], ci: ["deno", "install"] },
  ];

  for (const { pm, local, ci } of cases) {
    it(`builds ${pm} local command`, () => {
      expect(buildInstallCommand(pm, {})).toEqual(local);
    });

    it(`builds ${pm} CI command`, () => {
      expect(buildInstallCommand(pm, { CI: "true" })).toEqual(ci);
    });
  }
});

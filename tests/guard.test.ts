import { describe, expect, it } from "vitest";

import { isRecursionGuarded, withRecursionGuard } from "../src/guard.ts";

describe("isRecursionGuarded", () => {
  it("returns true only when the guard is set", () => {
    expect(isRecursionGuarded({ SYNDEP_RUNNING: "1" })).toBe(true);
    expect(isRecursionGuarded({})).toBe(false);
    expect(isRecursionGuarded({ SYNDEP_RUNNING: "0" })).toBe(false);
  });
});

describe("withRecursionGuard", () => {
  it("sets the guard without mutating the input", () => {
    const env = { PATH: "/bin" };
    const guarded = withRecursionGuard(env);

    expect(guarded["SYNDEP_RUNNING"]).toBe("1");
    expect(guarded["PATH"]).toBe("/bin");
    expect(env).not.toHaveProperty("SYNDEP_RUNNING");
  });
});

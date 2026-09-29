const GUARD_ENV = "SYNDEP_RUNNING";

export const isRecursionGuarded = (env: NodeJS.ProcessEnv): boolean => env[GUARD_ENV] === "1";

export const withRecursionGuard = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv => ({
  ...env,
  [GUARD_ENV]: "1",
});

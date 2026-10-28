import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/bin/**"],
    },
    reporters: ["default", ["junit", { outputFile: "./test-results/junit.xml" }]],
  },
});

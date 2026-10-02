import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: { entry: ["src/index.ts"], sourcemap: false },
  entry: ["src/index.ts", "src/bin/syndep.ts", "src/bin/syndep-bun.ts"],
  format: "esm",
  hash: false,
  minify: true,
  outDir: "dist",
  platform: "node",
  sourcemap: false,
  target: "node20",
  treeshake: true,
});

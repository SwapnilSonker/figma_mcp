import { defineConfig } from "tsup";

const isDev = process.env.npm_lifecycle_event === "dev";

export default defineConfig({
  clean: true,
  entry: ["src/index.ts", "src/clients.ts"],
  format: ["esm"],
  minify: !isDev,
  target: "esnext",
  outDir: "dist",
  outExtension: ({ format }) => ({
    js: ".js",
  }),
  onSuccess: isDev ? "node dist/index.js" : undefined,
});

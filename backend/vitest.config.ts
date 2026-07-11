import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: ".",
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
    },
    // Don't process CSS — we're testing backend logic only
    css: false,
    // Don't crawl up to parent dirs
    pool: "threads",
  },
});

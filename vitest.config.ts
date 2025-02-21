import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.spec.ts"],
    coverage: {
      reporter: ["text", "lcov", "clover", "json"],
    },
  },
});

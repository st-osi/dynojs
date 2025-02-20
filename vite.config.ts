import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MyLibrary", // The name of your library
      fileName: "my-library", // The output filename (without extension)
      formats: ["cjs", "es"], // Output both CommonJS and ES modules
    },
    rollupOptions: {
      // Ensure that external packages are not bundled into your library
      external: [], // Add any external dependencies here
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"], // Adjust if your tests are in a different location
    coverage: {
      reporter: ["text", "lcov", "clover", "json"],
    },
  },
});

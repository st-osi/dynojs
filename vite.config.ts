import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "@st-osi/dynojs", // The name of your library
      formats: ["cjs", "es"], // Output both CommonJS and ES modules
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // Ensure that external packages are not bundled into your library
      external: [], // Add any external dependencies here
      output: {
        entryFileNames:(ch)=> `[name].[format].js`,
        chunkFileNames: "[name]-[hash].[format].js",
        format: "cjs",
        exports: "named",
      },
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  plugins: [
    dts({
      entryRoot: "src",
      compilerOptions: {
        outDir: "dist/types",
        declaration: true,
        declarationMap: true,
      },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"], // Adjust if your tests are in a different location
    coverage: {
      reporter: ["text", "lcov", "clover", "json"],
    },
  },
});

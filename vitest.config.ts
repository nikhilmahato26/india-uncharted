import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Server-layer modules import "server-only"; in tests we exercise the pure
      // helpers inside them, so the guard is stubbed out.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // The session ledger reads `window.localStorage` — jsdom provides it.
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});

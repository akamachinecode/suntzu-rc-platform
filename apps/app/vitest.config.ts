import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the app (Vitest, the Itaca standard). Pages and components are checked in the
// browser; tests here cover what can be checked without one, such as the generated guide covers.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
});

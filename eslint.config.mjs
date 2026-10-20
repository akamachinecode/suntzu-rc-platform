import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    ".sst/**",
    "next-env.d.ts",
    "sst.config.ts",
    "sst-env.d.ts",
    "src/components/ui/**",
  ]),
]);

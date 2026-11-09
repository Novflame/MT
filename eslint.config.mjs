import { defineConfig } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

export default defineConfig([
...nextVitals,
...nextTs,


// CommonJS is intentionally used in scripts and tests.
{
    rules: {
        "@typescript-eslint/no-require-imports": "off",
    },
},

// Generated files and dependencies are not source code.
{
    ignores: [
        ".next/**",
        "node_modules/**",
        "out/**",
        "build/**",
        "dist/**",
        "next-env.d.ts",
    ],
},


])

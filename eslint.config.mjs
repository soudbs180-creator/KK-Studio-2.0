import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".worktrees/**",
      "src-tauri/**",
      "docs/**",
      ".tmp/**",
      "tmp/**",
      "test-results/**",
      "design/**",
      "public/**",
    ],
  },
  {
    files: [
      "src/**/*.{ts,tsx}",
      "tests/**/*.ts",
      "scripts/**/*.mjs",
      "*.config.{ts,mjs}",
    ],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-debugger": "error",
    },
  },
);

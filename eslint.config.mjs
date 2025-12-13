import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["**/public/*", "**/node_modules/*"],
  },
  {
    files: ["**/*.{js,cjs,mjs,ts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
);

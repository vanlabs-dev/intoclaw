import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "coverage/"],
  },
);

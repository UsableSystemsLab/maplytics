import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
    rules: {
      indent: ["error", 2],
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "no-trailing-spaces": "error",
      "comma-dangle": ["error", "always-multiline"],
      "no-unused-vars": ["warn"],
      "no-console": "off",
    },
  },

  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
]);

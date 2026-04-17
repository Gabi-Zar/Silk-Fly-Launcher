import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs}"],
        ignores: ["node_modules/**", "out/**"],
        plugins: { js, "@stylistic": stylistic },
        extends: ["js/recommended"],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        rules: {
            "no-unused-vars": "off",
            "no-undef": "off",
            "no-var": "error",
            "prefer-const": "error",
            "no-redeclare": "error",
            "@stylistic/semi": ["error", "always"],
            "@stylistic/semi-spacing": ["error", { before: false, after: true }],
            "@stylistic/no-tabs": "error",
            "@stylistic/no-mixed-spaces-and-tabs": "error",
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/key-spacing": ["error", { beforeColon: false, afterColon: true }],
            "@stylistic/keyword-spacing": ["error", { before: true, after: true }],
        },
    },
]);

import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      // 필요한 경우 여기에 규칙을 추가하거나 재정의할 수 있습니다.
    }
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser, // Some tests might still interact with browser-like APIs via JSDOM
        ...globals.node,
        ...globals.vitest
      }
    },
    rules: {
      "no-unused-vars": "warn", // Allow unused vars in tests as they might be setup for future tests
      "no-undef": "error"
    }
  }
];

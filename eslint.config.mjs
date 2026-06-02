import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  {
    ignores: ["src/lib/database.types.ts"]
  },
  ...nextVitals,
  {
    rules: {
      "react/no-unescaped-entities": "off"
    }
  }
]);

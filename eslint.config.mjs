import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // 스펙 §5 불변 규칙 2: Supabase 접근은 lib/db 안에서만 한다.
    // 이 경계 덕분에 정적 호스팅 전환에서 lib/db만 바뀌었다.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["lib/db/**", "scripts/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/supabase-js", "@supabase/ssr"],
              message: "Supabase 접근은 lib/db 안에서만 합니다 (스펙 §5 불변 규칙 2).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

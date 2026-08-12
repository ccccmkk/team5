import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  // tsconfig의 "@/*" 별칭을 Vite가 직접 읽는다 (vite-tsconfig-paths 불필요)
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
    // .env.local의 Supabase 자격증명을 RLS 테스트에 넘긴다
    env: loadEnv(mode, process.cwd(), ""),
    // RLS 테스트는 네트워크를 타므로 여유를 준다
    testTimeout: 30_000,
  },
}));

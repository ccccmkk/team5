import { describe, expect, it } from "vitest";

describe("테스트 인프라", () => {
  it("경로 별칭 @/ 가 동작한다", async () => {
    const mod = await import("@/lib/smoke");
    expect(mod.ok()).toBe(true);
  });
});

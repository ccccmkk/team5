import { describe, expect, it } from "vitest";
import { getIdentityState } from "@/lib/db/identity";
import { ensureSession } from "@/lib/db/session";

const hasCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!hasCredentials)("getIdentityState", () => {
  it("세션이 없으면 none이다", async () => {
    const { getBrowserClient } = await import("@/lib/db/client");
    await getBrowserClient().auth.signOut();

    expect(await getIdentityState()).toEqual({ kind: "none" });
  });

  it("익명 세션이면 anonymous다", async () => {
    // 이 구분이 틀리면 익명 사용자에게 로그아웃 버튼이 보인다
    await ensureSession();

    expect(await getIdentityState()).toEqual({ kind: "anonymous" });
  });
});

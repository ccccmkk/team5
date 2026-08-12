import { describe, expect, it } from "vitest";
import { getBrowserClient } from "@/lib/db/client";
import { ensureSession } from "@/lib/db/session";

const hasCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!hasCredentials)("ensureSession", () => {
  it("세션이 없으면 익명 세션을 만든다", async () => {
    const user = await ensureSession();
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.is_anonymous).toBe(true);
  });

  it("두 번 불러도 같은 사용자를 돌려준다", async () => {
    const first = await ensureSession();
    const second = await ensureSession();
    expect(second.id).toBe(first.id);
  });

  it("만든 세션으로 본인 프로필을 저장할 수 있다", async () => {
    const user = await ensureSession();
    const supabase = getBrowserClient();

    const { error } = await supabase.from("body_profiles").upsert({
      user_id: user.id,
      nickname: "익명테스터",
      height_cm: 175,
      weight_kg: 70,
      waist_inch: 32,
    });
    expect(error).toBeNull();

    await supabase.from("body_profiles").delete().eq("user_id", user.id);
  });

  // 대시보드 경고: 익명 사용자는 authenticated 롤을 쓰므로 기존 정책이 그대로 적용된다.
  // 그게 우리가 노린 것이지만, 실제로 그런지 확인해둔다.
  it("익명 세션이어도 남의 체형 프로필은 못 읽는다", async () => {
    const me = await ensureSession();
    const supabase = getBrowserClient();

    await supabase.from("body_profiles").upsert({
      user_id: me.id,
      nickname: "익명테스터",
      height_cm: 175,
      weight_kg: 70,
      waist_inch: 32,
    });

    // 내 것이 아닌 모든 프로필을 요청해본다
    const { data } = await supabase
      .from("body_profiles")
      .select("user_id")
      .neq("user_id", me.id);

    expect(data).toEqual([]);

    await supabase.from("body_profiles").delete().eq("user_id", me.id);
  });

  it("익명 세션이어도 시드 위장 후기는 못 넣는다", async () => {
    const me = await ensureSession();
    const supabase = getBrowserClient();

    const { error } = await supabase.from("fit_reviews").insert({
      user_id: me.id,
      model_id: "501",
      purchased_size: 32,
      waist_fit: 0,
      thigh_fit: 0,
      hip_fit: 0,
      length_fit: 0,
      overall: 5,
      snapshot: {
        nickname: "익명테스터",
        heightCm: 175,
        weightKg: 70,
        waistInch: 32,
      },
      is_seed: true,
    });

    expect(error).not.toBeNull();
  });
});

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingCredentials = !url || !anonKey || !serviceKey;

// RLS는 이 아키텍처의 유일한 보안 경계다. CI에서까지 조용히 건너뛰면 안 된다.
if (missingCredentials && process.env.CI) {
  throw new Error(
    "CI에서는 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, " +
      "SUPABASE_SERVICE_ROLE_KEY가 모두 있어야 한다. 저장소 시크릿을 확인한다.",
  );
}

type TestUser = { id: string; client: SupabaseClient };

describe.skipIf(missingCredentials)("RLS 정책", () => {
  // skipIf도 이 콜백 본문은 실행하므로, 클라이언트 생성은 beforeAll로 미룬다
  let admin: SupabaseClient;
  let alice: TestUser;
  let bob: TestUser;

  async function createTestUser(label: string): Promise<TestUser> {
    const email = `rls-${label}-${Date.now()}@example.test`;
    const password = "test-password-1234";

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;

    const client = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const signIn = await client.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;

    return { id: data.user.id, client };
  }

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    alice = await createTestUser("alice");
    bob = await createTestUser("bob");

    // fit_reviews의 외래키 때문에 모델 행이 먼저 있어야 한다
    const { MODELS } = await import("@/data/models");
    await admin.from("jean_models").upsert(
      MODELS.map((m) => ({
        id: m.id,
        name: m.name,
        fit_type: m.fitType,
        description: m.description,
        size_chart: m.sizeChart,
      })),
    );

    const { error } = await alice.client.from("body_profiles").insert({
      user_id: alice.id,
      nickname: "앨리스",
      height_cm: 175,
      weight_kg: 70,
      waist_inch: 32,
    });
    if (error) throw error;
  });

  afterAll(async () => {
    if (alice) await admin.auth.admin.deleteUser(alice.id);
    if (bob) await admin.auth.admin.deleteUser(bob.id);
  });

  it("본인 프로필은 읽을 수 있다", async () => {
    const { data } = await alice.client
      .from("body_profiles")
      .select("nickname")
      .eq("user_id", alice.id);

    expect(data).toEqual([{ nickname: "앨리스" }]);
  });

  it("남의 체형 프로필은 읽히지 않는다", async () => {
    const { data } = await bob.client
      .from("body_profiles")
      .select("nickname")
      .eq("user_id", alice.id);

    expect(data).toEqual([]);
  });

  it("남의 이름으로 프로필을 만들 수 없다", async () => {
    const { error } = await bob.client.from("body_profiles").insert({
      user_id: alice.id,
      nickname: "가짜",
      height_cm: 180,
      weight_kg: 80,
      waist_inch: 34,
    });

    expect(error).not.toBeNull();
  });

  it("is_seed를 켜서 후기를 넣을 수 없다", async () => {
    const { error } = await alice.client.from("fit_reviews").insert({
      user_id: alice.id,
      model_id: "501",
      purchased_size: 32,
      waist_fit: 0,
      thigh_fit: 0,
      hip_fit: 0,
      length_fit: 0,
      overall: 5,
      snapshot: {
        nickname: "앨리스",
        heightCm: 175,
        weightKg: 70,
        waistInch: 32,
      },
      is_seed: true,
    });

    expect(error).not.toBeNull();
  });

  it("남의 이름으로 후기를 쓸 수 없다", async () => {
    const { error } = await bob.client.from("fit_reviews").insert({
      user_id: alice.id,
      model_id: "501",
      purchased_size: 32,
      waist_fit: 0,
      thigh_fit: 0,
      hip_fit: 0,
      length_fit: 0,
      overall: 5,
      snapshot: {
        nickname: "가짜",
        heightCm: 175,
        weightKg: 70,
        waistInch: 32,
      },
      is_seed: false,
    });

    expect(error).not.toBeNull();
  });

  it("후기 읽기는 누구에게나 열려 있다", async () => {
    const { error } = await bob.client.from("fit_reviews").select("id");
    expect(error).toBeNull();
  });
});

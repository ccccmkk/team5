import { getBrowserClient } from "./client";
import {
  toBodyProfile,
  toProfileRow,
  type BodyProfile,
  type BodyProfileRow,
} from "./mappers";
import { ensureSession } from "./session";

export type { BodyProfile } from "./mappers";

const PROFILE_COLUMNS =
  "user_id, nickname, gender, height_cm, weight_kg, waist_inch, thigh_cm, hip_cm, inseam_cm";

/** 브라우저 전용. 빌드 시점에는 로그인한 사용자가 없다. */
export async function getMyProfile(): Promise<BodyProfile | null> {
  const supabase = getBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("body_profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? toBodyProfile(data as BodyProfileRow) : null;
}

/** 저장 시점에 익명 세션을 확보한다. 사용자는 로그인 화면을 보지 않는다. */
export async function upsertMyProfile(profile: BodyProfile): Promise<void> {
  const supabase = getBrowserClient();
  const user = await ensureSession();

  const { error } = await supabase.from("body_profiles").upsert({
    ...toProfileRow(user.id, profile),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

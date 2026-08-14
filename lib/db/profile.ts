import { getBrowserClient } from "./client";
import {
  toBodyProfile,
  toProfileRow,
  type BodyProfile,
  type BodyProfileRow,
} from "./mappers";
import { ensureSession } from "./session";

export type { BodyProfile } from "./mappers";

/**
 * 컬럼이 아직 없을 때 오는 코드 두 가지.
 *
 * 읽을 때는 Postgres가 `42703`(undefined_column)을 주지만, 쓸 때는 PostgREST가
 * 스키마 캐시에서 먼저 걸러 `PGRST204`를 준다. 실제로 42703만 보고 있다가
 * 되돌림 경로를 못 타는 것을 확인하고 둘 다 넣었다.
 */
const MISSING_COLUMN_CODES = ["42703", "PGRST204"];

const BASE_COLUMNS =
  "user_id, nickname, gender, height_cm, weight_kg, waist_inch, thigh_cm, hip_cm, inseam_cm";
const PROFILE_COLUMNS = `${BASE_COLUMNS}, estimated_fields`;

/**
 * 브라우저 전용. 빌드 시점에는 로그인한 사용자가 없다.
 *
 * 마이그레이션이 아직 안 돌았으면 `estimated_fields`를 고르는 것만으로 조회가
 * 통째로 실패한다. 그 사이에 들어온 사람에게 "체형을 입력한 적 없음"으로 보이면
 * 다시 처음부터 입력하게 되므로, 컬럼 없이 한 번 더 읽는다.
 */
export async function getMyProfile(): Promise<BodyProfile | null> {
  const supabase = getBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const read = (columns: string) =>
    supabase
      .from("body_profiles")
      .select(columns)
      .eq("user_id", user.id)
      .maybeSingle();

  let { data, error } = await read(PROFILE_COLUMNS);

  if (error && MISSING_COLUMN_CODES.includes(error.code)) {
    ({ data, error } = await read(BASE_COLUMNS));
  }

  if (error) throw error;
  return data ? toBodyProfile(data as unknown as BodyProfileRow) : null;
}

/**
 * 저장 시점에 익명 세션을 확보한다. 사용자는 로그인 화면을 보지 않는다.
 *
 * `estimated_fields`는 코드보다 마이그레이션이 늦게 적용될 수 있다. 배포는
 * main에 머지되는 즉시 도는데 마이그레이션은 사람이 대시보드에서 돌리기 때문이다.
 * 그 사이에 들어온 사람의 체형 저장이 통째로 실패하면 안 되므로, 컬럼이 없으면
 * 그 항목만 빼고 다시 시도한다.
 *
 * 마이그레이션이 적용되면 이 되돌림 경로는 더 이상 타지 않는다. 그때 지운다.
 */
export async function upsertMyProfile(profile: BodyProfile): Promise<void> {
  const supabase = getBrowserClient();
  const user = await ensureSession();

  const row = {
    ...toProfileRow(user.id, profile),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("body_profiles").upsert(row);
  if (!error) return;
  if (!MISSING_COLUMN_CODES.includes(error.code)) throw error;

  const withoutEstimates = { ...row };
  delete (withoutEstimates as Partial<typeof row>).estimated_fields;

  const retry = await supabase.from("body_profiles").upsert(withoutEstimates);
  if (retry.error) throw retry.error;
}

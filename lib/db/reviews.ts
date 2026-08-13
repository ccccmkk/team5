import type { SupabaseClient } from "@supabase/supabase-js";
import type { FitReview, ReviewSnapshot } from "@/lib/fit-matching";
import type { FitReviewInput } from "@/lib/validation/schemas";
import { getBrowserClient } from "./client";
import { toFitReview, type FitReviewRow } from "./mappers";
import { ensureSession } from "./session";

export const REVIEW_COLUMNS =
  "id, model_id, purchased_size, waist_fit, thigh_fit, hip_fit, length_fit, overall, comment, is_seed, created_at, snapshot";

/**
 * 모델의 후기 전체를 최신순으로 읽는다.
 * client를 넘기면 빌드 시점 프리렌더에서도 같은 함수를 쓸 수 있다.
 */
export async function getReviews(
  modelId: string,
  client?: SupabaseClient,
): Promise<FitReview[]> {
  const supabase = client ?? getBrowserClient();
  const { data, error } = await supabase
    .from("fit_reviews")
    .select(REVIEW_COLUMNS)
    .eq("model_id", modelId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as FitReviewRow[]).map(toFitReview);
}

/** 내가 쓴 후기만. 세션이 없으면 빈 배열이다 (익명 사용자도 본인 것은 소유한다). */
export async function getMyReviews(): Promise<FitReview[]> {
  const supabase = getBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("fit_reviews")
    .select(REVIEW_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as FitReviewRow[]).map(toFitReview);
}

/** RLS가 본인 행만 지우도록 강제한다. 남의 것을 지우려 하면 아무 행도 안 지워진다. */
export async function deleteReview(id: string): Promise<void> {
  const supabase = getBrowserClient();
  const { error } = await supabase.from("fit_reviews").delete().eq("id", id);
  if (error) throw error;
}

/**
 * 후기를 저장한다. 작성 시점의 체형을 snapshot으로 함께 박는다 (스펙 §6.3).
 * 나중에 프로필을 고쳐도 이 후기의 유사도 계산은 흔들리지 않는다.
 *
 * 서버가 없으므로 최종 검증은 DB의 CHECK 제약과 RLS가 한다.
 */
export async function insertReview(
  input: FitReviewInput,
  snapshot: ReviewSnapshot,
): Promise<void> {
  const supabase = getBrowserClient();
  const user = await ensureSession();

  const { error } = await supabase.from("fit_reviews").insert({
    user_id: user.id,
    model_id: input.modelId,
    purchased_size: input.purchasedSize,
    waist_fit: input.waistFit,
    thigh_fit: input.thighFit,
    hip_fit: input.hipFit,
    length_fit: input.lengthFit,
    overall: input.overall,
    comment: input.comment,
    snapshot,
    is_seed: false,
  });

  if (error) throw error;
}

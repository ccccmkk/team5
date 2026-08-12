import type { SupabaseClient } from "@supabase/supabase-js";
import type { FitReview } from "@/lib/fit-matching";
import { getBrowserClient } from "./client";
import { toFitReview, type FitReviewRow } from "./mappers";

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

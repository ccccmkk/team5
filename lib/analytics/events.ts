/**
 * 빈 화면이 뜬 이유. 콜드스타트 진단의 핵심 지표라
 * 어떤 상태가 얼마나 자주 뜨는지가 다음 가설의 근거가 된다 (스펙 §15.2).
 */
export type EmptyStateReason =
  | "no_profile"
  | "no_reviews"
  | "insufficient_recommendation";

export type SimilarityBucket = "high" | "mid" | "low";

/** 추천 사이즈를 받은 뒤 실제로 사러 나가는 곳 */
export type ShopDestination = "musinsa";

export type EventMap = {
  profile_start: Record<string, never>;
  profile_complete: { confidence: number; optional_field_count: number };
  view_model: { model_id: string; has_profile: boolean };
  view_recommendation: {
    model_id: string;
    recommended_size: number;
    support_count: number;
  };
  review_start: { model_id: string };
  review_submit: { model_id: string; purchased_size: number };
  empty_state_shown: { reason: EmptyStateReason };
  /**
   * 추천을 보고 사러 나갔다. H5의 분자다.
   *
   * 후기 작성(H4)보다 허들이 훨씬 낮아 표본이 적어도 비율이 흔들리지 않는다.
   * 트래픽이 수십 명 수준인 초기에 유일하게 읽을 만한 전환 지표다.
   */
  outbound_click: {
    model_id: string;
    size: number;
    destination: ShopDestination;
  };
};

export type EventName = keyof EventMap;

/** 유사도를 구간으로 묶는다. 원값을 그대로 보내면 카디널리티가 너무 높다. */
export function similarityBucket(score: number): SimilarityBucket {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

/** 선택 항목을 몇 개 채웠는지. H2(선택 항목 입력률)의 원자료다. */
export function countOptionalFields(profile: {
  thighCm?: number;
  hipCm?: number;
  inseamCm?: number;
}): number {
  return [profile.thighCm, profile.hipCm, profile.inseamCm].filter(
    (v) => v !== undefined,
  ).length;
}

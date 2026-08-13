export type BodyMeasurements = {
  heightCm: number;
  weightKg: number;
  waistInch: number;
  thighCm?: number;
  hipCm?: number;
  inseamCm?: number;
};

export type MeasurementField = keyof BodyMeasurements;

export type SimilarityResult = {
  /** 0~100 */
  score: number;
  /** 양쪽 모두 값이 있어 계산에 쓰인 항목의 가중치 비율 (0~1) */
  confidence: number;
  usedFields: MeasurementField[];
};

export type FitPart = "waistFit" | "thighFit" | "hipFit" | "lengthFit";

export type Gender = "male" | "female";

/**
 * 성별은 치수가 아니라 범주라 유사도 계산에 가중치로 넣지 않는다.
 * 대신 비교 대상을 거르는 필터로 쓴다 (lib/fit-matching/gender.ts).
 */
export type ReviewSnapshot = BodyMeasurements & {
  nickname: string;
  gender?: Gender;
};

export type FitReview = {
  id: string;
  modelId: string;
  purchasedSize: number;
  /** -2 아주 작음 ~ 0 딱 맞음 ~ +2 아주 큼 */
  waistFit: number;
  thighFit: number;
  hipFit: number;
  lengthFit: number;
  /** 1~5 만족도 */
  overall: number;
  comment: string;
  isSeed: boolean;
  /** ISO 8601 */
  createdAt: string;
  /** 작성 시점의 체형 사본 */
  snapshot: ReviewSnapshot;
};

export type RankedReview = FitReview & { similarity: SimilarityResult };

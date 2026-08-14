import type {
  EstimatableField,
  FitReview,
  Gender,
  ReviewSnapshot,
} from "@/lib/fit-matching";

export type FitReviewRow = {
  id: string;
  model_id: string;
  purchased_size: number;
  waist_fit: number;
  thigh_fit: number;
  hip_fit: number;
  length_fit: number;
  overall: number;
  comment: string;
  is_seed: boolean;
  created_at: string;
  snapshot: ReviewSnapshot;
};

export type BodyProfileRow = {
  user_id: string;
  nickname: string;
  gender: Gender | null;
  height_cm: number;
  weight_kg: number;
  waist_inch: number;
  thigh_cm: number | null;
  hip_cm: number | null;
  inseam_cm: number | null;
  estimated_fields: EstimatableField[];
};

/**
 * 후기의 snapshot과 같은 모양이라 그대로 넘길 수 있다.
 *
 * `estimatedFields`는 체형 옵션에서 추정해 채운 항목이다. 후기 스냅샷에도 같이
 * 실려, 나중에 "옵션으로 채운 사람의 후기"를 따로 볼 수 있다.
 */
export type BodyProfile = ReviewSnapshot & {
  estimatedFields?: EstimatableField[];
};

export function toFitReview(row: FitReviewRow): FitReview {
  return {
    id: row.id,
    modelId: row.model_id,
    purchasedSize: row.purchased_size,
    waistFit: row.waist_fit,
    thighFit: row.thigh_fit,
    hipFit: row.hip_fit,
    lengthFit: row.length_fit,
    overall: row.overall,
    comment: row.comment,
    isSeed: row.is_seed,
    createdAt: row.created_at,
    snapshot: row.snapshot,
  };
}

export function toBodyProfile(row: BodyProfileRow): BodyProfile {
  return {
    nickname: row.nickname,
    gender: row.gender ?? undefined,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    waistInch: row.waist_inch,
    thighCm: row.thigh_cm ?? undefined,
    hipCm: row.hip_cm ?? undefined,
    inseamCm: row.inseam_cm ?? undefined,
    // 옛 행에는 컬럼이 없으므로 빈 배열로 읽는다
    estimatedFields: row.estimated_fields ?? [],
  };
}

export function toProfileRow(
  userId: string,
  profile: BodyProfile,
): BodyProfileRow {
  return {
    user_id: userId,
    nickname: profile.nickname,
    gender: profile.gender ?? null,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    waist_inch: profile.waistInch,
    thigh_cm: profile.thighCm ?? null,
    hip_cm: profile.hipCm ?? null,
    inseam_cm: profile.inseamCm ?? null,
    estimated_fields: profile.estimatedFields ?? [],
  };
}

import type {
  BodyMeasurements,
  FitReview,
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
  height_cm: number;
  weight_kg: number;
  waist_inch: number;
  thigh_cm: number | null;
  hip_cm: number | null;
  inseam_cm: number | null;
};

export type BodyProfile = BodyMeasurements & { nickname: string };

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
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    waistInch: row.waist_inch,
    thighCm: row.thigh_cm ?? undefined,
    hipCm: row.hip_cm ?? undefined,
    inseamCm: row.inseam_cm ?? undefined,
  };
}

export function toProfileRow(
  userId: string,
  profile: BodyProfile,
): BodyProfileRow {
  return {
    user_id: userId,
    nickname: profile.nickname,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    waist_inch: profile.waistInch,
    thigh_cm: profile.thighCm ?? null,
    hip_cm: profile.hipCm ?? null,
    inseam_cm: profile.inseamCm ?? null,
  };
}

import { z } from "zod";
import { MODEL_IDS } from "@/lib/sizing";

/**
 * 폼에서 오는 문자열을 숫자로 바꾼다. 빈 값은 undefined가 되고,
 * 숫자로 못 바꾸는 값은 원본을 그대로 흘려보내 뒤쪽 스키마가 거부하게 한다.
 *
 * 주의: 이 검증은 브라우저에서 돌아가므로 신뢰 경계가 아니다 (스펙 §11.1).
 * 최종 방어선은 DB의 CHECK 제약과 RLS 정책이며, 범위 값은 양쪽을 일치시킨다.
 */
function coerceNumber(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function requiredInt(min: number, max: number) {
  return z.preprocess(coerceNumber, z.number().int().min(min).max(max));
}

function optionalInt(min: number, max: number) {
  return z.preprocess(
    coerceNumber,
    z.number().int().min(min).max(max).optional(),
  );
}

export const bodyProfileSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, "2자 이상이어야 합니다")
    .max(12, "12자 이하여야 합니다"),
  // 성별은 치수가 아니라 비교 대상을 거르는 필터로 쓴다
  gender: z.enum(["male", "female"], { message: "성별을 선택해 주세요" }),
  heightCm: requiredInt(120, 220),
  weightKg: requiredInt(30, 200),
  waistInch: requiredInt(22, 46),
  thighCm: optionalInt(30, 90),
  hipCm: optionalInt(60, 140),
  inseamCm: optionalInt(50, 110),
});

export type BodyProfileInput = z.infer<typeof bodyProfileSchema>;

const fitLevel = requiredInt(-2, 2);

export const fitReviewSchema = z.object({
  // 모델 목록에서 유도한다. 모델을 추가해도 여기를 따로 고칠 필요가 없다.
  modelId: z.enum(MODEL_IDS as [string, ...string[]]),
  purchasedSize: requiredInt(22, 46),
  waistFit: fitLevel,
  thighFit: fitLevel,
  hipFit: fitLevel,
  lengthFit: fitLevel,
  overall: requiredInt(1, 5),
  comment: z.string().trim().max(300, "300자 이하여야 합니다").default(""),
});

export type FitReviewInput = z.infer<typeof fitReviewSchema>;

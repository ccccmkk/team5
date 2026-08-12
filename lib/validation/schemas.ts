import { z } from "zod";

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
  modelId: z.enum(["501", "517"]),
  purchasedSize: requiredInt(22, 46),
  waistFit: fitLevel,
  thighFit: fitLevel,
  hipFit: fitLevel,
  lengthFit: fitLevel,
  overall: requiredInt(1, 5),
  comment: z.string().trim().max(300, "300자 이하여야 합니다").default(""),
});

export type FitReviewInput = z.infer<typeof fitReviewSchema>;

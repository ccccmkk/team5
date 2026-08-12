import type { MeasurementField } from "./types";

/**
 * tolerance = "이만큼 차이나면 체감상 다른 체형"인 값.
 * weight 합은 1.00이다.
 *
 * 주의: 이 값들은 초기 추정치다. 실제 후기가 20건 이상 모이면
 * 스펙 §13에 따라 검증하고 조정한다.
 */
export const MEASUREMENT_CONFIG = {
  waistInch: { tolerance: 3, weight: 0.3 },
  thighCm: { tolerance: 6, weight: 0.25 },
  weightKg: { tolerance: 12, weight: 0.2 },
  hipCm: { tolerance: 8, weight: 0.1 },
  heightCm: { tolerance: 10, weight: 0.1 },
  inseamCm: { tolerance: 6, weight: 0.05 },
} as const satisfies Record<
  MeasurementField,
  { tolerance: number; weight: number }
>;

export const MEASUREMENT_FIELDS = Object.keys(
  MEASUREMENT_CONFIG,
) as MeasurementField[];

export const TOTAL_WEIGHT = MEASUREMENT_FIELDS.reduce(
  (sum, field) => sum + MEASUREMENT_CONFIG[field].weight,
  0,
);

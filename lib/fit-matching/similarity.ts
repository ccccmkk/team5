import {
  MEASUREMENT_CONFIG,
  MEASUREMENT_FIELDS,
  TOTAL_WEIGHT,
} from "./config";
import { ESTIMATED_CREDIT } from "./estimate";
import type {
  BodyMeasurements,
  MeasurementField,
  SimilarityResult,
} from "./types";

/**
 * 두 체형의 유사도를 0~100으로 계산한다.
 * 양쪽 모두 값이 있는 항목만 쓰므로 선택 항목이 비어도 공정하게 비교된다.
 */
export function similarity(
  a: BodyMeasurements,
  b: BodyMeasurements,
): SimilarityResult {
  let weightedSquares = 0;
  let usedWeight = 0;
  const usedFields: MeasurementField[] = [];

  for (const field of MEASUREMENT_FIELDS) {
    const av = a[field];
    const bv = b[field];
    if (av === undefined || bv === undefined) continue;

    const { tolerance, weight } = MEASUREMENT_CONFIG[field];
    // 1로 클램프해 한 항목의 극단값이 점수를 붕괴시키지 않게 한다
    const diff = Math.min(Math.abs(av - bv) / tolerance, 1);

    weightedSquares += weight * diff * diff;
    usedWeight += weight;
    usedFields.push(field);
  }

  if (usedWeight === 0) {
    return { score: 0, confidence: 0, usedFields: [] };
  }

  const distance = Math.sqrt(weightedSquares / usedWeight);

  return {
    score: Math.round((1 - distance) * 100),
    confidence: usedWeight / TOTAL_WEIGHT,
    usedFields,
  };
}

/** 내가 입력한 항목이 얼마나 충분한지 (0~1). 추천의 신뢰도가 아니라 입력 충족도다. */
export function profileConfidence(
  me: BodyMeasurements,
  /** 체형 옵션에서 추정해 채운 항목. 직접 잰 값보다 거칠어 절반만 인정한다. */
  estimatedFields: readonly MeasurementField[] = [],
): number {
  const used = MEASUREMENT_FIELDS.reduce((sum, field) => {
    if (me[field] === undefined) return sum;

    const credit = estimatedFields.includes(field) ? ESTIMATED_CREDIT : 1;
    return sum + MEASUREMENT_CONFIG[field].weight * credit;
  }, 0);

  return used / TOTAL_WEIGHT;
}

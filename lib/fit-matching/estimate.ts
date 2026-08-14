import type { Gender } from "./types";

/**
 * 줄자 없이 고를 수 있는 체형 옵션에서 치수를 추정한다.
 *
 * 왜 필요한가: 사용자 피드백에서 "정확한 허벅지 둘레를 몰라서 입력을 못 하겠다"가
 * 나왔다. 실제로 GA에서도 `profile_start` 10건 대비 완료가 그보다 적었다.
 * 선택 항목을 비워 두면 유사도의 45%(허벅지 0.25 + 엉덩이 0.1 + 인심 0.05 + …)를
 * 못 쓰므로, 대충이라도 받는 편이 아무것도 못 받는 것보다 낫다.
 *
 * 기준값은 시드 생성기(`scripts/generate-synthetic.ts`)가 쓰는 것과 같은 계수다.
 * 두 곳이 어긋나면 합성 데이터와 실제 입력이 다른 분포를 갖게 된다.
 */

/** 표준 대비 얼마나 벌어진 것으로 볼지. 각 항목의 tolerance보다 작게 둔다. */
const SPREAD = { thighCm: 4, hipCm: 5, inseamCm: 3 } as const;

const RATIO: Record<Gender, { thigh: number; hip: number; inseam: number }> = {
  male: { thigh: 0.72, hip: 1.28, inseam: 0.45 },
  female: { thigh: 0.78, hip: 1.42, inseam: 0.45 },
};

/** -1 슬림 / 0 표준 / +1 발달 */
export type ShapeChoice = -1 | 0 | 1;

export type EstimateInput = {
  gender: Gender;
  weightKg: number;
  heightCm: number;
};

function round(value: number): number {
  return Math.round(value);
}

export function estimateThighCm(
  { gender, weightKg }: EstimateInput,
  choice: ShapeChoice,
): number {
  return round(weightKg * RATIO[gender].thigh + choice * SPREAD.thighCm);
}

export function estimateHipCm(
  { gender, weightKg }: EstimateInput,
  choice: ShapeChoice,
): number {
  return round(weightKg * RATIO[gender].hip + choice * SPREAD.hipCm);
}

export function estimateInseamCm(
  { gender, heightCm }: EstimateInput,
  choice: ShapeChoice,
): number {
  return round(heightCm * RATIO[gender].inseam + choice * SPREAD.inseamCm);
}

/**
 * 추정으로 채운 항목은 직접 잰 값보다 거칠다. 같은 옵션을 고른 사람끼리는
 * 같은 값이 나와 유사도가 실제보다 가깝게 계산된다.
 *
 * 유사도 계산 자체는 손대지 않는다(양쪽 스냅샷을 모두 고쳐야 해서 범위가 커진다).
 * 대신 화면에 보여 주는 "입력 정확도"에서 절반만 인정해, 사용자가 자기 입력이
 * 얼마나 정밀한지 오해하지 않게 한다.
 */
export const ESTIMATED_CREDIT = 0.5;

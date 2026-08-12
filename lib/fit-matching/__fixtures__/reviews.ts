import type { BodyMeasurements, FitReview } from "@/lib/fit-matching/types";

export const ME: BodyMeasurements = {
  heightCm: 175,
  weightKg: 70,
  waistInch: 32,
};

let counter = 0;

/** 테스트용 후기 하나를 만든다. 지정하지 않은 값은 ME와 같은 체형에 딱 맞는 핏이다. */
export function makeReview(overrides: Partial<FitReview> = {}): FitReview {
  counter += 1;
  return {
    id: `review-${counter}`,
    modelId: "501",
    purchasedSize: 32,
    waistFit: 0,
    thighFit: 0,
    hipFit: 0,
    lengthFit: 0,
    overall: 5,
    comment: "",
    isSeed: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    snapshot: { nickname: "테스터", ...ME },
    ...overrides,
  };
}

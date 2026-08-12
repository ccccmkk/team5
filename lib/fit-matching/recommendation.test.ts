import { describe, expect, it } from "vitest";
import { ME, makeReview } from "@/lib/fit-matching/__fixtures__/reviews";
import { rankReviews } from "@/lib/fit-matching/ranking";
import { recommendSize } from "@/lib/fit-matching/recommendation";
import type { FitReview } from "@/lib/fit-matching/types";

function recommend(reviews: FitReview[]) {
  return recommendSize(rankReviews(ME, reviews), ME);
}

describe("recommendSize", () => {
  it("표를 가장 많이 받은 사이즈를 추천한다", () => {
    const result = recommend([
      makeReview({ purchasedSize: 32 }),
      makeReview({ purchasedSize: 32 }),
      makeReview({ purchasedSize: 34 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.size).toBe(32);
    expect(result.supportCount).toBe(2);
    expect(result.totalCount).toBe(3);
  });

  it("유사도가 높은 후기가 더 큰 표를 가진다", () => {
    // 32는 유사도 58짜리 둘(합 0.58² × 2 ≈ 0.67),
    // 34는 나와 똑같은 사람 하나(1.00).
    // 유사도를 제곱하지 않으면 0.58 × 2 = 1.16으로 32가 이겨버린다.
    const result = recommend([
      makeReview({
        purchasedSize: 32,
        snapshot: {
          nickname: "far1",
          heightCm: 180,
          weightKg: 76,
          waistInch: 33,
        },
      }),
      makeReview({
        purchasedSize: 32,
        snapshot: {
          nickname: "far2",
          heightCm: 180,
          weightKg: 76,
          waistInch: 33,
        },
      }),
      makeReview({ purchasedSize: 34 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.size).toBe(34);
  });

  it("만족도 1~2점 후기는 표를 던지지 않는다", () => {
    const result = recommend([
      makeReview({ purchasedSize: 32, overall: 1 }),
      makeReview({ purchasedSize: 32, overall: 2 }),
      makeReview({ purchasedSize: 34, overall: 5 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.size).toBe(34);
  });

  it("유사도 40 미만만 있으면 후보가 없어 insufficient_data", () => {
    const result = recommend([
      makeReview({
        snapshot: {
          nickname: "far",
          heightCm: 200,
          weightKg: 120,
          waistInch: 44,
        },
      }),
    ]);

    expect(result).toEqual({ status: "insufficient_data", totalCount: 1 });
  });

  it("후기가 하나도 없으면 insufficient_data", () => {
    expect(recommend([])).toEqual({
      status: "insufficient_data",
      totalCount: 0,
    });
  });

  it("모두 불만족이면 insufficient_data", () => {
    const result = recommend([
      makeReview({ overall: 1 }),
      makeReview({ overall: 2 }),
    ]);

    expect(result.status).toBe("insufficient_data");
  });

  it("30% 이상이 같은 부위를 지적하면 이슈로 올린다", () => {
    const result = recommend([
      makeReview({ purchasedSize: 32, thighFit: -2 }),
      makeReview({ purchasedSize: 32, thighFit: -2 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.topIssues).toEqual([
      { part: "thighFit", direction: "tight", count: 2, total: 3 },
    ]);
  });

  it("30% 미만이면 이슈로 올리지 않는다", () => {
    const result = recommend([
      makeReview({ purchasedSize: 32, thighFit: -2 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.topIssues).toEqual([]);
  });

  it("profileConfidence는 내가 입력한 항목만으로 계산된다", () => {
    const result = recommend([makeReview({ purchasedSize: 32 })]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    // ME는 필수 3개만 채웠다
    expect(result.profileConfidence).toBeCloseTo(0.6);
  });
});

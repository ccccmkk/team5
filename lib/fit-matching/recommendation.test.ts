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
    // 32는 유사도 58짜리 넷(합 0.58² × 4 ≈ 1.35),
    // 34는 나와 똑같은 사람 둘(합 1.00² × 2 = 2.00).
    // 유사도를 제곱하지 않으면 0.58 × 4 = 2.32로 32가 이겨버린다.
    // 양쪽 다 MIN_SUPPORT를 넘겨서, 걸러지는 게 아니라 표 계산으로 갈린다.
    const far = (nickname: string) =>
      makeReview({
        purchasedSize: 32,
        snapshot: {
          nickname,
          heightCm: 180,
          weightKg: 76,
          waistInch: 33,
        },
      });

    const result = recommend([
      far("far1"),
      far("far2"),
      far("far3"),
      far("far4"),
      makeReview({ purchasedSize: 34 }),
      makeReview({ purchasedSize: 34 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.size).toBe(34);
  });

  it("만족도 1~2점 후기는 표를 던지지 않는다", () => {
    // 34는 만족 2건이라 MIN_SUPPORT를 넘고, 32는 불만족뿐이라 표가 0이다
    const result = recommend([
      makeReview({ purchasedSize: 32, overall: 1 }),
      makeReview({ purchasedSize: 32, overall: 2 }),
      makeReview({ purchasedSize: 34, overall: 5 }),
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

  it("지지자가 한 명뿐이면 추천하지 않는다", () => {
    // 한 사람의 구매 이력은 추천이 아니라 일화다
    const result = recommend([makeReview({ purchasedSize: 32 })]);

    expect(result.status).toBe("insufficient_data");
  });

  it("지지자가 둘이면 추천한다", () => {
    const result = recommend([
      makeReview({ purchasedSize: 32 }),
      makeReview({ purchasedSize: 32 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.supportCount).toBe(2);
  });

  it("지지자 2명 중 1명이 지적해도 경고를 올리지 않는다", () => {
    // 50%라 비율 기준은 넘지만 표본이 얇아 잡음이다
    const result = recommend([
      makeReview({ purchasedSize: 32, thighFit: -2 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.topIssues).toEqual([]);
  });

  it("지지자가 셋이어도 지적이 한 명뿐이면 경고를 올리지 않는다", () => {
    const result = recommend([
      makeReview({ purchasedSize: 32, thighFit: -2 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.topIssues).toEqual([]);
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
    const result = recommend([
      makeReview({ purchasedSize: 32 }),
      makeReview({ purchasedSize: 32 }),
    ]);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    // ME는 필수 3개만 채웠다
    expect(result.profileConfidence).toBeCloseTo(0.6);
  });
});

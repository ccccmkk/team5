import { describe, expect, it } from "vitest";
import { ME, makeReview } from "@/lib/fit-matching/__fixtures__/reviews";
import { rankReviews } from "@/lib/fit-matching/ranking";

describe("rankReviews", () => {
  it("유사도가 높은 순으로 정렬한다", () => {
    const far = makeReview({
      id: "far",
      snapshot: {
        nickname: "far",
        heightCm: 190,
        weightKg: 95,
        waistInch: 38,
      },
    });
    const near = makeReview({
      id: "near",
      snapshot: {
        nickname: "near",
        heightCm: 176,
        weightKg: 71,
        waistInch: 32,
      },
    });

    const ranked = rankReviews(ME, [far, near]);

    expect(ranked.map((r) => r.id)).toEqual(["near", "far"]);
    expect(ranked[0].similarity.score).toBeGreaterThan(
      ranked[1].similarity.score,
    );
  });

  it("유사도가 같으면 최신 후기가 앞에 온다", () => {
    const older = makeReview({
      id: "older",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = makeReview({
      id: "newer",
      createdAt: "2026-03-01T00:00:00.000Z",
    });

    expect(rankReviews(ME, [older, newer]).map((r) => r.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("빈 배열은 빈 배열을 돌려준다", () => {
    expect(rankReviews(ME, [])).toEqual([]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const reviews = [makeReview({ id: "a" }), makeReview({ id: "b" })];
    const before = reviews.map((r) => r.id);

    rankReviews(ME, reviews);

    expect(reviews.map((r) => r.id)).toEqual(before);
  });
});

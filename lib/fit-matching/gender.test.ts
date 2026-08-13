import { describe, expect, it } from "vitest";
import { makeReview } from "@/lib/fit-matching/__fixtures__/reviews";
import { MIN_SAME_GENDER, filterByGender } from "@/lib/fit-matching/gender";
import type { Gender } from "@/lib/fit-matching/types";

function reviewsOf(gender: Gender, count: number) {
  return Array.from({ length: count }, () =>
    makeReview({
      snapshot: {
        nickname: gender,
        gender,
        heightCm: 175,
        weightKg: 70,
        waistInch: 32,
      },
    }),
  );
}

describe("filterByGender", () => {
  it("표본이 충분하면 같은 성별만 남긴다", () => {
    const result = filterByGender("male", [
      ...reviewsOf("male", MIN_SAME_GENDER),
      ...reviewsOf("female", 10),
    ]);

    expect(result.sameGenderOnly).toBe(true);
    expect(result.reviews).toHaveLength(MIN_SAME_GENDER);
    expect(result.reviews.every((r) => r.snapshot.gender === "male")).toBe(true);
  });

  it("같은 성별이 부족하면 필터를 풀고 전체를 돌려준다", () => {
    const all = [
      ...reviewsOf("male", MIN_SAME_GENDER - 1),
      ...reviewsOf("female", 10),
    ];
    const result = filterByGender("male", all);

    expect(result.sameGenderOnly).toBe(false);
    expect(result.reviews).toHaveLength(all.length);
    expect(result.sameGenderCount).toBe(MIN_SAME_GENDER - 1);
  });

  it("내 성별을 모르면 아무것도 거르지 않는다", () => {
    const all = reviewsOf("male", 10);
    const result = filterByGender(undefined, all);

    expect(result.sameGenderOnly).toBe(false);
    expect(result.reviews).toBe(all);
  });

  it("성별이 없는 옛 후기는 같은 성별로 세지 않는다", () => {
    const legacy = Array.from({ length: 10 }, () => makeReview());
    const result = filterByGender("male", legacy);

    expect(result.sameGenderOnly).toBe(false);
    expect(result.sameGenderCount).toBe(0);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const all = [...reviewsOf("male", 6), ...reviewsOf("female", 6)];
    const before = all.length;
    filterByGender("male", all);
    expect(all).toHaveLength(before);
  });
});

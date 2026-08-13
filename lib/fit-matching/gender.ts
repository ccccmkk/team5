import type { FitReview, Gender } from "./types";

/**
 * 같은 성별 후기가 이보다 적으면 필터를 풀고 전체를 본다.
 * 성별로 나누면 분포가 좁아져 비교가 정확해지지만,
 * 데이터가 적을 때까지 고집하면 아무것도 못 보여준다.
 */
export const MIN_SAME_GENDER = 5;

export type GenderFilterResult = {
  reviews: FitReview[];
  /** 같은 성별만 남겼는지. UI에서 이 사실을 알려야 한다. */
  sameGenderOnly: boolean;
  /** 필터를 풀었다면 원래 같은 성별 후기가 몇 건이었는지 */
  sameGenderCount: number;
};

/**
 * 같은 성별 후기만 남긴다. 성별이 없거나 표본이 부족하면 전체를 그대로 돌려준다.
 *
 * 팀 피드백: 성별 구분이 없으면 체형 분포가 지나치게 넓어져
 * "나와 비슷한 사람"의 의미가 흐려진다.
 */
export function filterByGender(
  gender: Gender | undefined,
  reviews: FitReview[],
): GenderFilterResult {
  if (!gender) {
    return { reviews, sameGenderOnly: false, sameGenderCount: 0 };
  }

  const same = reviews.filter((r) => r.snapshot.gender === gender);

  if (same.length < MIN_SAME_GENDER) {
    return {
      reviews,
      sameGenderOnly: false,
      sameGenderCount: same.length,
    };
  }

  return {
    reviews: same,
    sameGenderOnly: true,
    sameGenderCount: same.length,
  };
}

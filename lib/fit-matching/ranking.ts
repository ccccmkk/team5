import { similarity } from "./similarity";
import type { BodyMeasurements, FitReview, RankedReview } from "./types";

/** 내 체형과의 유사도를 붙여 높은 순으로 정렬한다. 동점이면 최신순. */
export function rankReviews(
  me: BodyMeasurements,
  reviews: FitReview[],
): RankedReview[] {
  return reviews
    .map((review) => ({
      ...review,
      similarity: similarity(me, review.snapshot),
    }))
    .sort((a, b) => {
      if (b.similarity.score !== a.similarity.score) {
        return b.similarity.score - a.similarity.score;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

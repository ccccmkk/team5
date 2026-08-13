export {
  MEASUREMENT_CONFIG,
  MEASUREMENT_FIELDS,
  TOTAL_WEIGHT,
} from "./config";
export { profileConfidence, similarity } from "./similarity";
export { MIN_SAME_GENDER, filterByGender } from "./gender";
export type { GenderFilterResult } from "./gender";
export { rankReviews } from "./ranking";
export {
  ISSUE_THRESHOLD,
  MAX_CANDIDATES,
  MIN_SIMILARITY,
  recommendSize,
} from "./recommendation";
export type { FitIssue, SizeRecommendation } from "./recommendation";
export type {
  BodyMeasurements,
  FitPart,
  FitReview,
  Gender,
  MeasurementField,
  RankedReview,
  ReviewSnapshot,
  SimilarityResult,
} from "./types";

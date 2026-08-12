export {
  MEASUREMENT_CONFIG,
  MEASUREMENT_FIELDS,
  TOTAL_WEIGHT,
} from "./config";
export { profileConfidence, similarity } from "./similarity";
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
  MeasurementField,
  RankedReview,
  ReviewSnapshot,
  SimilarityResult,
} from "./types";

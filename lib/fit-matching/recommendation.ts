import { profileConfidence } from "./similarity";
import type { BodyMeasurements, FitPart, RankedReview } from "./types";

/** 이 점수 미만은 참고 가치가 없다고 보고 추천 계산에서 뺀다 */
export const MIN_SIMILARITY = 40;
export const MAX_CANDIDATES = 30;
/** 이 비율 이상이 같은 부위를 지적하면 이슈로 노출한다 */
export const ISSUE_THRESHOLD = 0.3;

/**
 * 한 사람이 산 사이즈는 추천이 아니라 일화다. 지지자가 이보다 적으면
 * 사이즈를 내지 않고 데이터 부족으로 돌린다.
 *
 * 시드 605건 기준으로 지지자 수 중앙값이 2명이다. 3명으로 올리면 절반 이상이
 * 추천을 못 받아 서비스가 성립하지 않아서 2로 뒀다. 후기가 쌓이면 올린다.
 */
export const MIN_SUPPORT = 2;

/**
 * 지지자가 2명일 때 1명이 지적하면 50%라 ISSUE_THRESHOLD를 그냥 넘는다.
 * 그 경고는 정보가 아니라 잡음이므로, 표본이 이만큼은 돼야 경고를 낸다.
 */
export const MIN_ISSUE_SUPPORTERS = 3;
/** 비율을 넘겨도 최소 이 인원이 같은 말을 해야 한다 */
export const MIN_ISSUE_COUNT = 2;

const FIT_PARTS: FitPart[] = ["waistFit", "thighFit", "hipFit", "lengthFit"];

export type FitIssue = {
  part: FitPart;
  direction: "tight" | "loose";
  count: number;
  total: number;
};

export type SizeRecommendation =
  | {
      status: "ok";
      size: number;
      /** 추천 사이즈에 실제로 표를 던진(만족한) 후기 수 */
      supportCount: number;
      /** 계산에 쓰인 후보 후기 수 */
      totalCount: number;
      /** 내 프로필 입력 충족도 (0~1). 추천 신뢰도가 아니다. */
      profileConfidence: number;
      topIssues: FitIssue[];
    }
  | { status: "insufficient_data"; totalCount: number };

function satisfactionFactor(overall: number): number {
  if (overall >= 4) return 1;
  if (overall === 3) return 0.5;
  return 0;
}

function collectIssues(supporters: RankedReview[]): FitIssue[] {
  // 표본이 얇으면 비율이 쉽게 튄다. 2명 중 1명은 50%지만 아무 뜻도 없다.
  if (supporters.length < MIN_ISSUE_SUPPORTERS) return [];

  const issues: FitIssue[] = [];
  for (const part of FIT_PARTS) {
    for (const direction of ["tight", "loose"] as const) {
      const count = supporters.filter((r) =>
        direction === "tight" ? r[part] <= -2 : r[part] >= 2,
      ).length;

      if (
        count >= MIN_ISSUE_COUNT &&
        count / supporters.length >= ISSUE_THRESHOLD
      ) {
        issues.push({ part, direction, count, total: supporters.length });
      }
    }
  }
  return issues.sort((a, b) => b.count - a.count);
}

/**
 * 유사도를 표의 무게로 쓰는 가중 투표로 사이즈를 추천한다.
 * 유사도를 제곱해 가까운 사람의 의견에 쏠리게 하고, 불만족 후기는 표를 던지지 않는다.
 */
export function recommendSize(
  ranked: RankedReview[],
  me: BodyMeasurements,
): SizeRecommendation {
  const candidates = ranked
    .filter((r) => r.similarity.score >= MIN_SIMILARITY)
    .slice(0, MAX_CANDIDATES);

  const votes = new Map<number, { weight: number; count: number }>();
  for (const review of candidates) {
    const weight =
      (review.similarity.score / 100) ** 2 * satisfactionFactor(review.overall);
    if (weight <= 0) continue;

    const entry = votes.get(review.purchasedSize) ?? { weight: 0, count: 0 };
    entry.weight += weight;
    entry.count += 1;
    votes.set(review.purchasedSize, entry);
  }

  let best: { size: number; weight: number; count: number } | null = null;
  for (const [size, { weight, count }] of votes) {
    const beats =
      best === null ||
      weight > best.weight ||
      (weight === best.weight && count > best.count) ||
      (weight === best.weight && count === best.count && size < best.size);

    if (beats) best = { size, weight, count };
  }

  if (best === null) {
    return { status: "insufficient_data", totalCount: ranked.length };
  }

  // const로 옮겨야 콜백 안에서 타입 좁힘이 유지된다
  const winner = best;
  const supporters = candidates.filter(
    (r) =>
      r.purchasedSize === winner.size && satisfactionFactor(r.overall) > 0,
  );

  // 한 사람의 구매 이력을 추천으로 포장하지 않는다
  if (supporters.length < MIN_SUPPORT) {
    return { status: "insufficient_data", totalCount: ranked.length };
  }

  return {
    status: "ok",
    size: winner.size,
    supportCount: supporters.length,
    totalCount: candidates.length,
    profileConfidence: profileConfidence(me),
    topIssues: collectIssues(supporters),
  };
}

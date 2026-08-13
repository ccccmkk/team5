"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FitScale } from "@/components/FitScale";
import { MeasureBar } from "@/components/MeasureBar";
import { SimilarityBadge } from "@/components/SimilarityBadge";
import {
  track,
  type EmptyStateReason,
  type ShopDestination,
} from "@/lib/analytics/track";
import { getMyProfile, type BodyProfile } from "@/lib/db/profile";
import { getReviews } from "@/lib/db/reviews";
import {
  filterByGender,
  rankReviews,
  recommendSize,
  type FitPart,
  type FitReview,
  type RankedReview,
} from "@/lib/fit-matching";
import { issueLabel } from "@/lib/view/labels";
import { shopLabel, shopSearchUrl } from "@/lib/view/shop";

const FIT_PARTS: FitPart[] = ["waistFit", "thighFit", "hipFit", "lengthFit"];
const VISIBLE_REVIEWS = 20;
const SHOP: ShopDestination = "musinsa";

function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`bg-line animate-pulse rounded-sm ${className}`} />;
}

function PersonalizationSkeleton() {
  return (
    <div role="status" aria-label="내 체형과 최신 후기를 불러오는 중" className="space-y-10">
      <section className="border-line rounded-sm border p-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-14" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-2/5" />
          </div>
        </div>
        <SkeletonBlock className="mt-4 h-3 w-1/3" />
      </section>

      <Link
        href="#"
        aria-disabled="true"
        tabIndex={-1}
        className="bg-line block h-12 animate-pulse rounded-sm"
      >
        <span className="sr-only">후기 작성 버튼 불러오는 중</span>
      </Link>

      <section className="space-y-5">
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-4 w-12" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-14" />
          <SkeletonBlock className="h-5 w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-5 w-full" />
        </div>
      </section>
    </div>
  );
}

export function ModelDetail({
  modelId,
  initialReviews,
}: {
  modelId: string;
  initialReviews: FitReview[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [fresh, mine] = await Promise.all([
        getReviews(modelId).catch(() => initialReviews),
        getMyProfile().catch(() => null),
      ]);
      if (!alive) return;
      setReviews(fresh);
      setProfile(mine);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [modelId, initialReviews]);

  const genderFilter = filterByGender(profile?.gender, reviews);
  const compared = genderFilter.reviews;

  const ranked: RankedReview[] = profile
    ? rankReviews(profile, compared)
    : compared.map((r) => ({
        ...r,
        similarity: { score: 0, confidence: 0, usedFields: [] },
      }));

  const recommendation = profile ? recommendSize(ranked, profile) : null;

  useEffect(() => {
    if (!loaded) return;

    track("view_model", { model_id: modelId, has_profile: profile !== null });

    if (recommendation?.status === "ok") {
      track("view_recommendation", {
        model_id: modelId,
        recommended_size: recommendation.size,
        support_count: recommendation.supportCount,
      });
    }

    const reason: EmptyStateReason | null =
      reviews.length === 0
        ? "no_reviews"
        : profile === null
          ? "no_profile"
          : recommendation?.status === "insufficient_data"
            ? "insufficient_recommendation"
            : null;

    if (reason) track("empty_state_shown", { reason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, modelId, profile, reviews.length]);

  const thighValues = compared
    .map((r) => r.snapshot.thighCm)
    .filter((v): v is number => v !== undefined);

  return (
    <div className="space-y-10">
      {!loaded ? (
        <PersonalizationSkeleton />
      ) : (
        <>
          {profile === null ? (
            <section className="border-line rounded-sm border p-5">
              <p className="font-medium">
                체형을 입력하면 나와 비슷한 사람 순으로 정렬됩니다.
              </p>
              <p className="text-ink-muted mt-1 text-sm">
                지금은 최신순으로 보고 있습니다. 로그인은 필요 없습니다.
              </p>
              <Link
                href="/onboarding"
                className="bg-ink text-surface mt-4 inline-block rounded-sm px-4 py-2 text-sm font-medium"
              >
                체형 입력
              </Link>
            </section>
          ) : recommendation?.status === "ok" ? (
            <section className="border-ink rounded-sm border p-5">
              <div className="flex items-baseline gap-3">
                <span className="tnum bg-ink text-surface rounded-sm px-2 font-mono text-3xl font-bold">
                  {recommendation.size}
                </span>
                <span className="text-ink-muted text-sm">
                  인치 · 비슷한 체형 {recommendation.supportCount}/
                  {recommendation.totalCount}명이 만족
                </span>
              </div>
              {recommendation.topIssues.length > 0 && (
                <ul className="text-warn mt-3 space-y-1 text-sm">
                  {recommendation.topIssues.map((issue) => (
                    <li key={`${issue.part}-${issue.direction}`}>
                      {issueLabel(issue)}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-ink-muted tnum mt-3 font-mono text-xs">
                내 입력 정확도 {Math.round(recommendation.profileConfidence * 100)}%
              </p>

              <a
                href={shopSearchUrl(modelId)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("outbound_click", {
                    model_id: modelId,
                    size: recommendation.size,
                    destination: SHOP,
                  })
                }
                className="border-ink mt-4 block rounded-sm border py-3 text-center text-sm font-medium"
              >
                {shopLabel(SHOP)}에서 {modelId} {recommendation.size}인치 보기
              </a>
            </section>
          ) : (
            <section className="border-line rounded-sm border p-5">
              <p className="font-medium">비슷한 체형의 후기가 아직 부족합니다.</p>
              <p className="text-ink-muted mt-1 text-sm">
                아래는 유사도 순이지만 상위 유사도가 낮습니다. 추천 사이즈를 내지
                않습니다.
              </p>
            </section>
          )}

          <Link
            href={`/reviews/new?model=${modelId}`}
            className="bg-ink text-surface block rounded-sm py-3 text-center font-medium"
          >
            내 후기 남기기
          </Link>

          {compared.length > 0 && (
            <section className="space-y-5">
              <h2 className="flex items-baseline justify-between text-sm font-semibold">
                <span>후기 작성자 체형 분포</span>
                <span className="text-ink-muted font-normal">
                  {genderFilter.sameGenderOnly
                    ? profile?.gender === "female"
                      ? "여성만"
                      : "남성만"
                    : "전체"}
                </span>
              </h2>
              <MeasureBar
                label="허리"
                unit="인치"
                others={compared.map((r) => r.snapshot.waistInch)}
                mine={profile?.waistInch}
              />
              {thighValues.length > 0 && (
                <MeasureBar
                  label="허벅지 둘레"
                  unit="cm"
                  others={thighValues}
                  mine={profile?.thighCm}
                />
              )}
            </section>
          )}
        </>
      )}

      <section>
        <h2 className="mb-2 flex items-baseline justify-between text-sm font-semibold">
          <span>{loaded && profile ? "나와 비슷한 순" : "최신순"}</span>
          <span className="text-ink-muted tnum font-mono font-normal">
            {compared.length}건{!loaded && " (갱신 중)"}
          </span>
        </h2>

        {loaded && profile?.gender && !genderFilter.sameGenderOnly && (
          <p className="text-ink-muted mb-4 text-sm">
            같은 성별 후기가 {genderFilter.sameGenderCount}건뿐이라 전체를 함께
            보여줍니다. 체형 분포가 넓어 유사도가 낮게 나올 수 있습니다.
          </p>
        )}

        {compared.length === 0 ? (
          <div className="border-line rounded-sm border p-5">
            <p className="font-medium">아직 후기가 없습니다.</p>
            <Link
              href={`/reviews/new?model=${modelId}`}
              className="bg-ink text-surface mt-4 inline-block rounded-sm px-4 py-2 text-sm font-medium"
            >
              첫 후기 남기기
            </Link>
          </div>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {ranked.slice(0, VISIBLE_REVIEWS).map((review) => (
              <li key={review.id} className="flex gap-4 py-5">
                {loaded && profile && <SimilarityBadge score={review.similarity.score} />}
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{review.snapshot.nickname}</span>
                    <span className="text-ink-muted tnum font-mono text-xs">
                      {review.snapshot.heightCm}cm · {review.snapshot.weightKg}kg · 허리{" "}
                      {review.snapshot.waistInch}
                    </span>
                    {review.isSeed && (
                      <span className="border-line text-ink-muted rounded-sm border px-1 text-xs">
                        샘플
                      </span>
                    )}
                  </div>
                  <p className="tnum font-mono text-sm">{review.purchasedSize}인치 구매</p>
                  <div className="space-y-1">
                    {FIT_PARTS.map((part) => (
                      <FitScale key={part} part={part} level={review[part]} />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm">{review.comment}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`/reviews/new?model=${modelId}`}
        className="border-ink block rounded-sm border py-3 text-center font-medium"
      >
        내 후기 남기기
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FitScale } from "@/components/FitScale";
import { getMyProfile, type BodyProfile } from "@/lib/db/profile";
import { deleteReview, getMyReviews } from "@/lib/db/reviews";
import { profileConfidence, type FitPart, type FitReview } from "@/lib/fit-matching";

const FIT_PARTS: FitPart[] = ["waistFit", "thighFit", "hipFit", "lengthFit"];

function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`bg-line animate-pulse rounded-sm ${className}`} />;
}

function MyPageSkeleton() {
  return (
    <div role="status" aria-label="내 정보를 불러오는 중" className="space-y-10">
      <section>
        <SkeletonBlock className="mb-4 h-4 w-16" />
        <div className="border-line rounded-sm border p-5">
          <SkeletonBlock className="h-5 w-20" />
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-4 w-12" />
                <SkeletonBlock className="h-4 w-14" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="mt-5 h-3 w-28" />
          <SkeletonBlock className="mt-4 h-10 w-16" />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-8" />
        </div>
        <div className="border-line rounded-sm border p-5">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="mt-4 h-10 w-24" />
        </div>
      </section>

      <section>
        <SkeletonBlock className="mb-4 h-4 w-24" />
        <div className="border-line rounded-sm border p-5">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-4/5" />
        </div>
      </section>
    </div>
  );
}

export function MyPage() {
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [reviews, setReviews] = useState<FitReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getMyProfile().catch(() => null),
      getMyReviews().catch(() => [] as FitReview[]),
    ])
      .then(([p, r]) => {
        setProfile(p);
        setReviews(r);
      })
      .finally(() => setLoaded(true));
  }, []);

  async function handleDelete(id: string) {
    setFailure(null);
    const before = reviews;
    setReviews(reviews.filter((r) => r.id !== id));
    try {
      await deleteReview(id);
    } catch (error) {
      setReviews(before);
      setFailure(error instanceof Error ? error.message : "삭제에 실패했습니다");
    }
  }

  if (!loaded) {
    return <MyPageSkeleton />;
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-sm font-semibold">내 체형</h2>

        {profile === null ? (
          <div className="border-line rounded-sm border p-5">
            <p className="font-medium">아직 체형을 입력하지 않았습니다.</p>
            <Link
              href="/onboarding"
              className="bg-ink text-surface mt-4 inline-block rounded-sm px-4 py-2 text-sm font-medium"
            >
              체형 입력
            </Link>
          </div>
        ) : (
          <div className="border-line rounded-sm border p-5">
            <p className="font-medium">{profile.nickname}</p>
            <dl className="tnum mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">키</dt>
                <dd>{profile.heightCm}cm</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">몸무게</dt>
                <dd>{profile.weightKg}kg</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">허리</dt>
                <dd>{profile.waistInch}인치</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">허벅지</dt>
                <dd>{profile.thighCm ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">엉덩이</dt>
                <dd>{profile.hipCm ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">인심</dt>
                <dd>{profile.inseamCm ?? "—"}</dd>
              </div>
            </dl>
            <p className="text-ink-muted tnum mt-4 font-mono text-xs">
              입력 정확도 {Math.round(profileConfidence(profile) * 100)}%
            </p>
            <Link
              href="/onboarding"
              className="border-line mt-4 inline-block rounded-sm border px-4 py-2 text-sm font-medium"
            >
              수정
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-baseline justify-between text-sm font-semibold">
          <span>내 후기</span>
          <span className="text-ink-muted tnum font-mono font-normal">
            {reviews.length}건
          </span>
        </h2>

        {failure && (
          <p className="border-warn text-warn mb-4 rounded-sm border p-3 text-sm">
            {failure}
          </p>
        )}

        {reviews.length === 0 ? (
          <div className="border-line rounded-sm border p-5">
            <p className="font-medium">아직 남긴 후기가 없습니다.</p>
            <Link
              href="/models"
              className="bg-ink text-surface mt-4 inline-block rounded-sm px-4 py-2 text-sm font-medium"
            >
              모델 고르기
            </Link>
          </div>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {reviews.map((review) => (
              <li key={review.id} className="space-y-3 py-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="tnum font-mono text-sm">
                    {review.modelId} · {review.purchasedSize}인치
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(review.id)}
                    className="border-line text-ink-muted hover:border-warn hover:text-warn rounded-sm border px-2 py-1 text-xs"
                  >
                    삭제
                  </button>
                </div>
                <div className="space-y-1">
                  {FIT_PARTS.map((part) => (
                    <FitScale key={part} part={part} level={review[part]} />
                  ))}
                </div>
                {review.comment && <p className="text-sm">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold">기록 보관 범위</h2>
        <div className="border-line rounded-sm border p-5">
          <p className="text-sm">
            로그인 없이 이 브라우저에만 기록이 남습니다. 기기를 바꾸거나 브라우저
            데이터를 지우면 위 내용에 접근할 수 없습니다.
          </p>
        </div>
      </section>
    </div>
  );
}

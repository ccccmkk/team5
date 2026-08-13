"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FitScale } from "@/components/FitScale";
import {
  continueWithGoogle,
  getIdentityState,
  onIdentitySettled,
  signOut,
  type IdentityState,
} from "@/lib/db/identity";
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

      <section className="border-line flex items-center justify-between gap-3 border-t pt-5">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-9 w-24" />
      </section>
    </div>
  );
}

export function MyPage() {
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [reviews, setReviews] = useState<FitReview[]>([]);
  const [identity, setIdentity] = useState<IdentityState>({ kind: "none" });
  const [loaded, setLoaded] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    Promise.all([
      getMyProfile().catch(() => null),
      getMyReviews().catch(() => [] as FitReview[]),
      getIdentityState().catch((): IdentityState => ({ kind: "none" })),
    ])
      .then(([p, r, i]) => {
        setProfile(p);
        setReviews(r);
        setIdentity(i);
      })
      .finally(() => setLoaded(true));
  }, []);

  // 구글에서 돌아온 직후를 잡는다. 이유는 onIdentitySettled 주석에 있다.
  useEffect(
    () =>
      onIdentitySettled(() => {
        Promise.all([
          getIdentityState().catch((): IdentityState => ({ kind: "none" })),
          getMyReviews().catch(() => [] as FitReview[]),
          getMyProfile().catch(() => null),
        ]).then(([i, r, p]) => {
          setIdentity(i);
          setReviews(r);
          setProfile(p);
        });
      }),
    [],
  );

  /**
   * 성공하면 구글로 떠났다가 이 페이지로 돌아온다. 그래서 성공 경로에는
   * 상태를 되돌리는 코드가 없다 — 돌아오면 컴포넌트가 새로 뜬다.
   */
  async function handleAccount(action: () => Promise<void>) {
    setFailure(null);
    setLinking(true);
    try {
      await action();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "연결에 실패했습니다");
      setLinking(false);
    }
  }

  async function handleSignOut() {
    setFailure(null);
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "로그아웃에 실패했습니다");
    }
  }

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

      {/*
        계정 안내는 첫 화면(로그인)으로 옮겼다. 여기서는 지금 상태와 빠져나갈
        길만 한 줄로 둔다 — 이미 들어와 있는 사람에게 설명은 잡음이다.
      */}
      <section className="border-line flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        {identity.kind === "linked" ? (
          <>
            <p className="text-ink-muted text-sm">
              구글 계정
              {identity.email && (
                <>
                  {" "}
                  <span className="text-ink font-mono text-xs">
                    {identity.email}
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="border-line rounded-sm border px-4 py-2 text-sm font-medium"
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <p className="text-ink-muted text-sm">로그인 없이 사용 중</p>
            <button
              type="button"
              disabled={linking}
              onClick={() => handleAccount(continueWithGoogle)}
              className="border-line rounded-sm border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {linking ? "이동 중" : "구글로 로그인"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

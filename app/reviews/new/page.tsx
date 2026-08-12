"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReviewForm } from "@/components/ReviewForm";

function ReviewFormWithParams() {
  const params = useSearchParams();
  return <ReviewForm defaultModelId={params.get("model") ?? "501"} />;
}

export default function NewReviewPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">후기 남기기</h1>
      <p className="text-ink-muted mt-2 mb-8">
        허리는 맞는데 허벅지가 낀다면, 그 차이가 다음 사람에게 가장 필요한
        정보입니다.
      </p>
      {/* 정적 export에서 useSearchParams는 Suspense 경계를 요구한다 */}
      <Suspense fallback={<p className="text-ink-muted">불러오는 중</p>}>
        <ReviewFormWithParams />
      </Suspense>
    </main>
  );
}

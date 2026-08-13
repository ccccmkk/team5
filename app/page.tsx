import Link from "next/link";
import { SERVICE_NAME, SERVICE_TAGLINE } from "@/lib/brand";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="border-line text-ink-muted mb-8 border-b pb-4 text-sm font-semibold tracking-tight">
        {SERVICE_NAME}
      </p>

      <h1 className="text-3xl leading-snug font-bold tracking-tight">
        같은 32인치인데
        <br />왜 나한테만 안 맞을까
      </h1>

      <p className="text-ink-muted mt-4">{SERVICE_TAGLINE}</p>

      <div className="border-line mt-10 border-y py-6">
        <p className="text-sm">
          브랜드 사이즈 표는 평균 체형 기준입니다. 골반과 허벅지 비율이 다르면
          같은 사이즈도 다르게 맞습니다. 여기서는 수치가 비슷한 사람들이 실제로
          어땠는지를 봅니다.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/onboarding"
          className="bg-ink text-surface rounded-sm px-5 py-3 font-medium"
        >
          체형 입력하고 시작
        </Link>
        <Link
          href="/models"
          className="border-line rounded-sm border px-5 py-3 font-medium"
        >
          그냥 둘러보기
        </Link>
      </div>

      <p className="text-ink-muted mt-6 text-sm">로그인이 필요 없습니다.</p>
    </main>
  );
}

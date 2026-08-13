import Link from "next/link";
import { listModels } from "@/lib/sizing";

export const metadata = {
  title: "모델 고르기",
  description:
    "리바이스 데님의 실착 핏 데이터. 슬림·스트레이트·부츠컷·릴랙스드 중 내 체형에 맞는 모델을 고릅니다.",
};

export default function ModelsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">모델 고르기</h1>

      <ul className="divide-line border-line mt-8 divide-y border-y">
        {listModels().map((model) => (
          <li key={model.id}>
            <Link
              href={`/models/${model.id}`}
              className="hover:bg-surface-alt flex items-center gap-5 py-5"
            >
              <span className="tnum w-24 shrink-0 font-mono text-4xl font-semibold tracking-tight">
                {model.id}
              </span>
              <span className="min-w-0 flex-1">
                {/* 번호는 왼쪽에 크게 서 있다. 이름에서 한 번 더 반복하지 않는다. */}
                <span className="block font-medium">
                  {model.name.replace(`${model.id} `, "")}
                </span>
                <span className="text-ink-muted block text-sm">
                  {model.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

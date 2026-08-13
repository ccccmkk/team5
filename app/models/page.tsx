import Link from "next/link";
import { listModels } from "@/lib/sizing";

export const metadata = {
  title: "모델 고르기",
  description:
    "리바이스 501·502·505·511·512·514·517·527·550·559·560·569의 실착 핏 데이터를 봅니다.",
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

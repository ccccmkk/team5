import { notFound } from "next/navigation";
import { ModelDetail } from "@/components/ModelDetail";
import { SITE_URL } from "@/lib/brand";
import { createBuildClient } from "@/lib/db/client";
import { getReviews } from "@/lib/db/reviews";
import type { FitReview } from "@/lib/fit-matching";
import { MODEL_IDS, getModel, isModelId } from "@/lib/sizing";
import { buildProductJsonLd } from "@/lib/view/jsonld";

export function generateStaticParams() {
  return MODEL_IDS.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isModelId(id)) return {};

  const model = getModel(id);
  const title = `리바이스 ${model.name} 사이즈`;
  const description = `${model.name}을 실제로 입어본 사람들의 체형과 핏 후기. 허리는 맞는데 허벅지가 끼는지, 나와 비슷한 체형 순으로 봅니다.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/models/${id}/` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/models/${id}/`,
      type: "website",
    },
  };
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isModelId(id)) notFound();

  const model = getModel(id);

  // 빌드 시점에 후기를 HTML에 굽는다. 전부 클라이언트에서 그리면
  // 크롤러에게 빈 페이지로 보여 SEO가 무의미해진다 (스펙 §16).
  let reviews: FitReview[] = [];
  try {
    reviews = await getReviews(id, createBuildClient());
    console.log(`[prerender] ${id}: 후기 ${reviews.length}건`);
  } catch (error) {
    // 자격증명이 없는 환경에서는 빈 상태로 굽고 런타임에 채운다.
    // 다만 조용히 넘어가면 프리렌더가 비어도 알 수 없으므로 반드시 남긴다.
    console.warn(
      `[prerender] ${id}: 후기를 가져오지 못했습니다 —`,
      error instanceof Error ? error.message : error,
    );
  }

  const jsonLd = buildProductJsonLd(
    model,
    reviews,
    `${SITE_URL}/models/${id}/`,
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {/* 검색 결과에 별점이 붙을 수 있게 구조화 데이터를 넣는다 (스펙 §16) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>
        <span className="text-ink-muted block text-sm font-medium">
          리바이스
        </span>
        <span className="display-num mt-1 block font-mono">{model.id}</span>
        <span className="mt-2 block text-base font-medium">
          {model.name.replace(`${model.id} `, "")}
        </span>
      </h1>
      <p className="text-ink-muted mt-2 mb-10">{model.description}</p>
      <ModelDetail modelId={id} initialReviews={reviews} />
    </main>
  );
}

import { notFound } from "next/navigation";
import { ModelDetail } from "@/components/ModelDetail";
import { createBuildClient } from "@/lib/db/client";
import { getReviews } from "@/lib/db/reviews";
import type { FitReview } from "@/lib/fit-matching";
import { MODEL_IDS, getModel, type ModelId } from "@/lib/sizing";

export function generateStaticParams() {
  return MODEL_IDS.map((id) => ({ id }));
}

function isModelId(value: string): value is ModelId {
  return (MODEL_IDS as string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isModelId(id)) return {};

  const model = getModel(id);
  return {
    title: `리바이스 ${model.name} 사이즈`,
    description: `${model.name}을 실제로 입어본 사람들의 체형과 핏 후기. 허리는 맞는데 허벅지가 끼는지, 나와 비슷한 체형 순으로 봅니다.`,
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
  } catch {
    // 빌드 환경에 자격증명이 없으면 빈 상태로 굽고 런타임에 채운다
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">
        리바이스 {model.name}
      </h1>
      <p className="text-ink-muted mt-2 mb-10">{model.description}</p>
      <ModelDetail modelId={id} initialReviews={reviews} />
    </main>
  );
}

import type { FitReview } from "@/lib/fit-matching";
import type { JeanModel } from "@/lib/sizing";

export type ProductJsonLd = {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  brand: { "@type": "Brand"; name: string };
  url: string;
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
    bestRating: 5;
    worstRating: 1;
  };
};

/**
 * 모델 상세의 구조화 데이터. 후기가 없으면 aggregateRating을 넣지 않는다 —
 * 빈 평점을 넣으면 구글이 구조화 데이터 오류로 잡는다.
 */
export function buildProductJsonLd(
  model: JeanModel,
  reviews: FitReview[],
  url: string,
): ProductJsonLd {
  const base: ProductJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `리바이스 ${model.name}`,
    description: model.description,
    brand: { "@type": "Brand", name: "Levi's" },
    url,
  };

  if (reviews.length === 0) return base;

  const sum = reviews.reduce((acc, r) => acc + r.overall, 0);

  return {
    ...base,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Math.round((sum / reviews.length) * 10) / 10,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

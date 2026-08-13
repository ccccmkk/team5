import { describe, expect, it } from "vitest";
import { makeReview } from "@/lib/fit-matching/__fixtures__/reviews";
import { getModel } from "@/lib/sizing";
import { buildProductJsonLd } from "@/lib/view/jsonld";

const model = getModel("501");
const url = "https://example.test/models/501/";

describe("buildProductJsonLd", () => {
  it("후기가 없으면 aggregateRating을 넣지 않는다", () => {
    const jsonLd = buildProductJsonLd(model, [], url);
    expect(jsonLd.aggregateRating).toBeUndefined();
    expect(jsonLd.name).toBe("리바이스 501 Original Fit");
  });

  it("후기가 있으면 평균 평점과 개수를 넣는다", () => {
    const jsonLd = buildProductJsonLd(
      model,
      [
        makeReview({ overall: 5 }),
        makeReview({ overall: 4 }),
        makeReview({ overall: 3 }),
      ],
      url,
    );

    expect(jsonLd.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4,
      reviewCount: 3,
      bestRating: 5,
      worstRating: 1,
    });
  });

  it("평균을 소수 한 자리로 반올림한다", () => {
    const jsonLd = buildProductJsonLd(
      model,
      [makeReview({ overall: 5 }), makeReview({ overall: 4 })],
      url,
    );
    expect(jsonLd.aggregateRating?.ratingValue).toBe(4.5);
  });

  it("JSON으로 직렬화된다", () => {
    const jsonLd = buildProductJsonLd(model, [makeReview()], url);
    expect(() => JSON.stringify(jsonLd)).not.toThrow();
  });
});

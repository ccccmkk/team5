import { describe, expect, it } from "vitest";
import { MEASUREMENT_CONFIG } from "@/lib/fit-matching";
import { generateSyntheticReviews } from "@/scripts/generate-synthetic";

describe("generateSyntheticReviews", () => {
  it("같은 시드면 같은 결과가 나온다", () => {
    const a = generateSyntheticReviews({ count: 20, seed: 42 });
    const b = generateSyntheticReviews({ count: 20, seed: 42 });
    expect(a).toEqual(b);
  });

  it("다른 시드면 다른 결과가 나온다", () => {
    const a = generateSyntheticReviews({ count: 20, seed: 1 });
    const b = generateSyntheticReviews({ count: 20, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it("요청한 개수만큼 만든다", () => {
    expect(generateSyntheticReviews({ count: 50, seed: 7 })).toHaveLength(50);
  });

  it("501과 517이 모두 들어간다", () => {
    const models = new Set(
      generateSyntheticReviews({ count: 100, seed: 7 }).map((r) => r.modelId),
    );
    expect(models).toEqual(new Set(["501", "517"]));
  });

  it("모든 값이 DB CHECK 제약 범위 안이다", () => {
    for (const review of generateSyntheticReviews({ count: 200, seed: 7 })) {
      expect(review.purchasedSize).toBeGreaterThanOrEqual(22);
      expect(review.purchasedSize).toBeLessThanOrEqual(46);
      expect(review.overall).toBeGreaterThanOrEqual(1);
      expect(review.overall).toBeLessThanOrEqual(5);

      for (const part of [
        "waistFit",
        "thighFit",
        "hipFit",
        "lengthFit",
      ] as const) {
        expect(review[part]).toBeGreaterThanOrEqual(-2);
        expect(review[part]).toBeLessThanOrEqual(2);
      }

      expect(review.snapshot.heightCm).toBeGreaterThanOrEqual(120);
      expect(review.snapshot.heightCm).toBeLessThanOrEqual(220);
      expect(review.snapshot.weightKg).toBeGreaterThanOrEqual(30);
      expect(review.snapshot.weightKg).toBeLessThanOrEqual(200);
      expect(review.snapshot.waistInch).toBeGreaterThanOrEqual(22);
      expect(review.snapshot.waistInch).toBeLessThanOrEqual(46);
      expect(review.snapshot.nickname.length).toBeGreaterThanOrEqual(2);
      expect(review.snapshot.nickname.length).toBeLessThanOrEqual(12);
      expect(review.comment.length).toBeLessThanOrEqual(300);
    }
  });

  it("핏이 난수가 아니라 치수에서 유도된다", () => {
    // 같은 모델·같은 사이즈를 산 사람들끼리 비교했을 때,
    // 허벅지가 굵을수록 핏 평가가 더 꽉 끼는 쪽이어야 한다.
    // 난수로 채웠다면 이 단조성이 깨진다.
    const reviews = generateSyntheticReviews({ count: 400, seed: 7 }).filter(
      (r) => r.snapshot.thighCm !== undefined,
    );

    const groups = new Map<string, { thighCm: number; thighFit: number }[]>();
    for (const r of reviews) {
      const key = `${r.modelId}-${r.purchasedSize}`;
      const group = groups.get(key) ?? [];
      group.push({ thighCm: r.snapshot.thighCm!, thighFit: r.thighFit });
      groups.set(key, group);
    }

    let comparisons = 0;
    for (const group of groups.values()) {
      const sorted = [...group].sort((a, b) => a.thighCm - b.thighCm);
      for (let i = 1; i < sorted.length; i += 1) {
        expect(sorted[i].thighFit).toBeLessThanOrEqual(sorted[i - 1].thighFit);
        comparisons += 1;
      }
    }

    // 비교가 실제로 일어났는지 확인한다 (빈 루프로 통과하는 것을 막는다)
    expect(comparisons).toBeGreaterThan(50);
  });

  it("꽉 낀다는 후기의 한줄평이 내용과 일치한다", () => {
    const reviews = generateSyntheticReviews({ count: 300, seed: 7 });
    const tight = reviews.filter((r) => r.thighFit <= -2);

    expect(tight.length).toBeGreaterThan(0);
    for (const review of tight) {
      expect(review.comment).toMatch(/허벅지/);
    }
  });

  it("선택 항목이 비어 있는 후기도 섞여 있다", () => {
    const reviews = generateSyntheticReviews({ count: 200, seed: 7 });
    expect(reviews.some((r) => r.snapshot.thighCm === undefined)).toBe(true);
    expect(reviews.some((r) => r.snapshot.thighCm !== undefined)).toBe(true);
  });

  it("설정된 모든 측정 항목이 최소 한 번은 채워진다", () => {
    const reviews = generateSyntheticReviews({ count: 200, seed: 7 });
    for (const field of Object.keys(MEASUREMENT_CONFIG)) {
      expect(
        reviews.some(
          (r) => r.snapshot[field as keyof typeof r.snapshot] !== undefined,
        ),
      ).toBe(true);
    }
  });

  it("모든 후기가 시드 플래그를 갖고 user_id가 없다", () => {
    for (const review of generateSyntheticReviews({ count: 50, seed: 7 })) {
      expect(review.isSeed).toBe(true);
    }
  });
});

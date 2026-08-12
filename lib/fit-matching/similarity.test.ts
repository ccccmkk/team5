import { describe, expect, it } from "vitest";
import { TOTAL_WEIGHT } from "@/lib/fit-matching/config";
import { profileConfidence, similarity } from "@/lib/fit-matching/similarity";
import type { BodyMeasurements } from "@/lib/fit-matching/types";

const BASE: BodyMeasurements = { heightCm: 175, weightKg: 70, waistInch: 32 };

describe("가중치 합", () => {
  it("1.00이다", () => {
    expect(TOTAL_WEIGHT).toBeCloseTo(1);
  });
});

describe("similarity", () => {
  it("완전히 같은 체형은 100점", () => {
    expect(similarity(BASE, BASE).score).toBe(100);
  });

  it("필수 3개만 있으면 confidence는 0.6", () => {
    expect(similarity(BASE, BASE).confidence).toBeCloseTo(0.6);
  });

  it("모든 항목이 tolerance 이상 벌어지면 0점이고 음수가 되지 않는다", () => {
    const far: BodyMeasurements = { heightCm: 225, weightKg: 130, waistInch: 44 };
    expect(similarity(BASE, far).score).toBe(0);
  });

  it("한 항목만 극단적으로 달라도 점수가 붕괴하지 않는다", () => {
    // waistInch만 tolerance를 크게 초과 → diff 1로 클램프
    // distance = sqrt(0.30 / 0.60) ≈ 0.7071 → 29점
    const oneOff: BodyMeasurements = {
      heightCm: 175,
      weightKg: 70,
      waistInch: 44,
    };
    expect(similarity(BASE, oneOff).score).toBe(29);
  });

  it("선택 항목은 양쪽 다 있을 때만 계산에 들어간다", () => {
    const onlyOneHasThigh: BodyMeasurements = { ...BASE, thighCm: 56 };
    const result = similarity(BASE, onlyOneHasThigh);
    expect(result.usedFields).not.toContain("thighCm");
    expect(result.confidence).toBeCloseTo(0.6);
  });

  it("양쪽에 허벅지가 있으면 confidence가 0.85로 오른다", () => {
    const a: BodyMeasurements = { ...BASE, thighCm: 56 };
    const b: BodyMeasurements = { ...BASE, thighCm: 58 };
    expect(similarity(a, b).confidence).toBeCloseTo(0.85);
  });

  it("대칭이다", () => {
    const a: BodyMeasurements = { heightCm: 170, weightKg: 65, waistInch: 30 };
    const b: BodyMeasurements = { heightCm: 180, weightKg: 78, waistInch: 33 };
    expect(similarity(a, b).score).toBe(similarity(b, a).score);
  });
});

describe("profileConfidence", () => {
  it("필수 3개만 채우면 0.6", () => {
    expect(profileConfidence(BASE)).toBeCloseTo(0.6);
  });

  it("여섯 항목을 다 채우면 1", () => {
    const full: BodyMeasurements = {
      ...BASE,
      thighCm: 56,
      hipCm: 95,
      inseamCm: 78,
    };
    expect(profileConfidence(full)).toBeCloseTo(1);
  });
});

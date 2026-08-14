import { describe, expect, it } from "vitest";
import { MEASUREMENT_CONFIG } from "@/lib/fit-matching/config";
import {
  estimateHipCm,
  estimateInseamCm,
  estimateThighCm,
} from "@/lib/fit-matching/estimate";

const MALE = { gender: "male" as const, weightKg: 74, heightCm: 177 };
const FEMALE = { gender: "female" as const, weightKg: 55, heightCm: 162 };

describe("체형 옵션 추정", () => {
  it("슬림 < 표준 < 발달 순서를 지킨다", () => {
    expect(estimateThighCm(MALE, -1)).toBeLessThan(estimateThighCm(MALE, 0));
    expect(estimateThighCm(MALE, 0)).toBeLessThan(estimateThighCm(MALE, 1));
  });

  it("같은 몸무게라도 성별에 따라 다르게 추정한다", () => {
    const male = estimateThighCm({ ...MALE, weightKg: 60 }, 0);
    const female = estimateThighCm({ ...FEMALE, weightKg: 60 }, 0);
    expect(male).not.toBe(female);
  });

  it("인심은 몸무게가 아니라 키에서 나온다", () => {
    const tall = estimateInseamCm({ ...MALE, heightCm: 190 }, 0);
    const short = estimateInseamCm({ ...MALE, heightCm: 160 }, 0);
    expect(tall).toBeGreaterThan(short);

    const heavy = estimateInseamCm({ ...MALE, weightKg: 100 }, 0);
    expect(heavy).toBe(estimateInseamCm(MALE, 0));
  });

  it("옵션 간 차이가 tolerance를 넘지 않는다", () => {
    // 한 칸 옮겼다고 "완전히 다른 체형"이 되면 옵션이 너무 거칠다는 뜻이다
    for (const [estimate, field] of [
      [estimateThighCm, "thighCm"],
      [estimateHipCm, "hipCm"],
      [estimateInseamCm, "inseamCm"],
    ] as const) {
      const gap = estimate(MALE, 1) - estimate(MALE, 0);
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThan(MEASUREMENT_CONFIG[field].tolerance);
    }
  });

  it("DB CHECK 제약 범위 안에 들어간다", () => {
    // 폼이 허용하는 양 끝 체형에서도 저장이 깨지지 않아야 한다
    for (const weightKg of [30, 200]) {
      for (const heightCm of [120, 220]) {
        for (const choice of [-1, 0, 1] as const) {
          for (const gender of ["male", "female"] as const) {
            const input = { gender, weightKg, heightCm };
            expect(estimateThighCm(input, choice)).toBeGreaterThanOrEqual(0);
            expect(estimateHipCm(input, choice)).toBeGreaterThanOrEqual(0);
            expect(estimateInseamCm(input, choice)).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it("정수를 돌려준다", () => {
    // DB 컬럼이 smallint라 소수가 오면 잘린다
    expect(Number.isInteger(estimateThighCm(FEMALE, -1))).toBe(true);
    expect(Number.isInteger(estimateHipCm(FEMALE, 1))).toBe(true);
    expect(Number.isInteger(estimateInseamCm(FEMALE, 0))).toBe(true);
  });
});

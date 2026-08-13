import { describe, expect, it } from "vitest";
import { isModelId } from "@/lib/sizing";
import { parseSeedCsv, splitRow } from "@/scripts/read-csv";

const HEADER =
  "nickname,gender,heightCm,weightKg,waistInch,thighCm,hipCm,inseamCm,modelId,purchasedSize,waistFit,thighFit,hipFit,lengthFit,overall,comment";

describe("splitRow", () => {
  it("마지막 컬럼의 쉼표는 자르지 않는다", () => {
    expect(splitRow("a,b,c,d", 3)).toEqual(["a", "b", "c,d"]);
  });

  it("컬럼이 모자라면 빈 문자열로 채운다", () => {
    expect(splitRow("a,b", 4)).toEqual(["a", "b", "", ""]);
  });
});

describe("parseSeedCsv", () => {
  it("한 줄을 후기 객체로 바꾼다", () => {
    const csv = `${HEADER}\n느긋한수달,male,178,74,32,58,97,80,501,32,0,-1,0,1,4,허벅지가 낀다`;
    const [review] = parseSeedCsv(csv);

    expect(review.modelId).toBe("501");
    expect(review.purchasedSize).toBe(32);
    expect(review.thighFit).toBe(-1);
    expect(review.isSeed).toBe(true);
    expect(review.snapshot).toEqual({
      nickname: "느긋한수달",
      gender: "male",
      heightCm: 178,
      weightKg: 74,
      waistInch: 32,
      thighCm: 58,
      hipCm: 97,
      inseamCm: 80,
    });
  });

  it("빈 선택 항목은 스냅샷에서 아예 빠진다", () => {
    const csv = `${HEADER}\n조용한오리,male,168,58,29,,,,501,30,1,0,0,2,3,무난하다`;
    const [review] = parseSeedCsv(csv);

    expect(review.snapshot).not.toHaveProperty("thighCm");
    expect(review.snapshot).not.toHaveProperty("hipCm");
    expect(review.snapshot).not.toHaveProperty("inseamCm");
  });

  it("알 수 없는 성별 값은 무시한다", () => {
    const csv = `${HEADER}\n조용한오리,몰라요,168,58,29,,,,501,30,1,0,0,2,3,무난하다`;
    const [review] = parseSeedCsv(csv);

    expect(review.snapshot).not.toHaveProperty("gender");
  });

  it("한줄평에 쉼표가 있어도 잘리지 않는다", () => {
    const csv = `${HEADER}\n조용한오리,male,168,58,29,,,,501,30,0,0,0,0,4,허리는 맞고, 허벅지도 맞는다`;
    const [review] = parseSeedCsv(csv);

    expect(review.comment).toBe("허리는 맞고, 허벅지도 맞는다");
  });

  it("헤더만 있으면 빈 배열", () => {
    expect(parseSeedCsv(HEADER)).toEqual([]);
  });

  it("빈 줄은 건너뛴다", () => {
    const csv = `${HEADER}\n조용한오리,168,58,29,,,,501,30,0,0,0,0,4,무난하다\n\n`;
    expect(parseSeedCsv(csv)).toHaveLength(1);
  });

  it("실제 시드 CSV 파일이 파싱되고 DB 제약 범위 안이다", async () => {
    const { readSeedCsv } = await import("@/scripts/read-csv");
    const reviews = readSeedCsv("data/seed-reviews.csv");

    expect(reviews.length).toBeGreaterThan(0);
    for (const r of reviews) {
      expect(isModelId(r.modelId)).toBe(true);
      expect(r.purchasedSize).toBeGreaterThanOrEqual(22);
      expect(r.purchasedSize).toBeLessThanOrEqual(46);
      expect(r.overall).toBeGreaterThanOrEqual(1);
      expect(r.overall).toBeLessThanOrEqual(5);
      expect(r.snapshot.nickname.length).toBeGreaterThanOrEqual(2);
      expect(Number.isNaN(r.snapshot.heightCm)).toBe(false);
      expect(Number.isNaN(r.snapshot.weightKg)).toBe(false);
      expect(Number.isNaN(r.snapshot.waistInch)).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import { countOptionalFields, similarityBucket } from "@/lib/analytics/events";

describe("similarityBucket", () => {
  it("70 이상은 high", () => {
    expect(similarityBucket(70)).toBe("high");
    expect(similarityBucket(100)).toBe("high");
  });

  it("40~69는 mid", () => {
    expect(similarityBucket(40)).toBe("mid");
    expect(similarityBucket(69)).toBe("mid");
  });

  it("40 미만은 low", () => {
    expect(similarityBucket(39)).toBe("low");
    expect(similarityBucket(0)).toBe("low");
  });

  it("추천 후보 기준(40)과 경계가 일치한다", () => {
    // MIN_SIMILARITY가 40이므로 mid 이상이 곧 추천 후보다
    expect(similarityBucket(40)).not.toBe("low");
    expect(similarityBucket(39)).toBe("low");
  });
});

describe("countOptionalFields", () => {
  it("아무것도 없으면 0", () => {
    expect(countOptionalFields({})).toBe(0);
  });

  it("셋 다 있으면 3", () => {
    expect(countOptionalFields({ thighCm: 56, hipCm: 95, inseamCm: 78 })).toBe(3);
  });

  it("일부만 채운 경우를 센다", () => {
    expect(countOptionalFields({ thighCm: 56 })).toBe(1);
    expect(countOptionalFields({ hipCm: 95, inseamCm: 78 })).toBe(2);
  });
});

import { describe, expect, it } from "vitest";
import { fitLabel, issueLabel, partLabel } from "@/lib/view/labels";

describe("fitLabel", () => {
  it("-2부터 +2까지 한글 라벨을 돌려준다", () => {
    expect([-2, -1, 0, 1, 2].map(fitLabel)).toEqual([
      "많이 낌",
      "살짝 낌",
      "딱 맞음",
      "살짝 큼",
      "많이 큼",
    ]);
  });

  it("범위 밖은 대시", () => {
    expect(fitLabel(9)).toBe("—");
    expect(fitLabel(-9)).toBe("—");
  });
});

describe("partLabel", () => {
  it("부위 키를 한글로 바꾼다", () => {
    expect(partLabel("thighFit")).toBe("허벅지");
    expect(partLabel("lengthFit")).toBe("기장");
    expect(partLabel("waistFit")).toBe("허리");
    expect(partLabel("hipFit")).toBe("엉덩이");
  });
});

describe("issueLabel", () => {
  it("꽉 낀 이슈를 문장으로 만든다", () => {
    expect(
      issueLabel({ part: "thighFit", direction: "tight", count: 8, total: 12 }),
    ).toBe("허벅지 많이 낌 8/12");
  });

  it("남는 이슈를 문장으로 만든다", () => {
    expect(
      issueLabel({ part: "lengthFit", direction: "loose", count: 4, total: 10 }),
    ).toBe("기장 많이 큼 4/10");
  });
});

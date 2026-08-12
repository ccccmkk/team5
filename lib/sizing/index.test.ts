import { describe, expect, it } from "vitest";
import { MODEL_IDS, findSizeRow, getModel, listModels } from "@/lib/sizing";

describe("listModels", () => {
  it("501과 517 두 모델을 돌려준다", () => {
    expect(listModels().map((m) => m.id)).toEqual(["501", "517"]);
  });
});

describe("getModel", () => {
  it("아이디로 모델을 찾는다", () => {
    expect(getModel("501").name).toBe("501 Original Fit");
  });

  it("없는 아이디면 던진다", () => {
    // @ts-expect-error 런타임 방어를 확인하려고 일부러 잘못된 값을 넣는다
    expect(() => getModel("999")).toThrow("알 수 없는 모델: 999");
  });
});

describe("사이즈표 불변식", () => {
  for (const id of MODEL_IDS) {
    it(`${id}의 사이즈표는 비어있지 않고 허리 인치 오름차순이다`, () => {
      const { sizes } = getModel(id).sizeChart;
      expect(sizes.length).toBeGreaterThan(0);
      const waists = sizes.map((s) => s.waistInch);
      expect(waists).toEqual([...waists].sort((a, b) => a - b));
    });

    it(`${id}의 사이즈표는 허리가 커질수록 허벅지도 커진다`, () => {
      const thighs = getModel(id).sizeChart.sizes.map((s) => s.thighCm);
      expect(thighs).toEqual([...thighs].sort((a, b) => a - b));
    });
  }
});

describe("findSizeRow", () => {
  it("정확히 일치하는 행을 찾는다", () => {
    expect(findSizeRow("501", 32)?.waistCm).toBe(81);
  });

  it("없는 사이즈면 undefined", () => {
    expect(findSizeRow("501", 99)).toBeUndefined();
  });
});

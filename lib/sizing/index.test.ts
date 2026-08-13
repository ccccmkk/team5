import { describe, expect, it } from "vitest";
import {
  MODEL_IDS,
  findSizeRow,
  getModel,
  isModelId,
  listModels,
} from "@/lib/sizing";

describe("listModels", () => {
  it("팀이 정리한 12개 모델을 돌려준다", () => {
    expect(listModels().map((m) => m.id)).toEqual([
      "501",
      "502",
      "505",
      "511",
      "512",
      "514",
      "517",
      "527",
      "550",
      "559",
      "560",
      "569",
    ]);
  });

  it("MODEL_IDS는 모델 목록에서 유도된다", () => {
    expect(MODEL_IDS).toEqual(listModels().map((m) => m.id));
  });

  it("모델마다 설명이 있다", () => {
    for (const model of listModels()) {
      expect(model.description.length).toBeGreaterThan(5);
    }
  });
});

describe("isModelId", () => {
  it("아는 모델은 참", () => {
    expect(isModelId("511")).toBe(true);
  });

  it("모르는 모델은 거짓", () => {
    expect(isModelId("999")).toBe(false);
  });
});

describe("getModel", () => {
  it("아이디로 모델을 찾는다", () => {
    expect(getModel("501").name).toBe("501 Original Fit");
    expect(getModel("511").fitType).toBe("slim");
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

    it(`${id}는 아직 공식 표와 대조되지 않았음이 표시된다`, () => {
      // 대조가 끝나면 checkedAt을 채우고 이 테스트를 지운다
      expect(getModel(id).sizeChart.checkedAt).toBe("");
    });
  }
});

describe("모델별 핏 특성", () => {
  it("슬림이 스트레이트보다 허벅지가 좁다", () => {
    const straight = findSizeRow("501", 32)!.thighCm;
    const slim = findSizeRow("511", 32)!.thighCm;
    expect(slim).toBeLessThan(straight);
  });

  it("릴랙스드와 루즈가 스트레이트보다 허벅지가 넓다", () => {
    const straight = findSizeRow("501", 32)!.thighCm;
    expect(findSizeRow("550", 32)!.thighCm).toBeGreaterThan(straight);
    expect(findSizeRow("560", 32)!.thighCm).toBeGreaterThan(straight);
  });

  it("부츠컷이 스트레이트보다 인심이 길다", () => {
    expect(findSizeRow("517", 32)!.inseamCm).toBeGreaterThan(
      findSizeRow("501", 32)!.inseamCm,
    );
  });
});

describe("findSizeRow", () => {
  it("정확히 일치하는 행을 찾는다", () => {
    expect(findSizeRow("501", 32)?.waistCm).toBe(81);
  });

  it("없는 사이즈면 undefined", () => {
    expect(findSizeRow("501", 99)).toBeUndefined();
  });
});

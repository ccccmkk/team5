import { describe, expect, it } from "vitest";
import { toBodyProfile, toFitReview, toProfileRow } from "@/lib/db/mappers";

const ROW = {
  id: "abc",
  model_id: "501",
  purchased_size: 32,
  waist_fit: 0,
  thigh_fit: -2,
  hip_fit: 0,
  length_fit: 1,
  overall: 4,
  comment: "허벅지가 낀다",
  is_seed: false,
  created_at: "2026-03-01T00:00:00.000Z",
  snapshot: {
    nickname: "테스터",
    heightCm: 175,
    weightKg: 70,
    waistInch: 32,
  },
};

describe("toFitReview", () => {
  it("snake_case row를 camelCase 도메인 객체로 바꾼다", () => {
    expect(toFitReview(ROW)).toEqual({
      id: "abc",
      modelId: "501",
      purchasedSize: 32,
      waistFit: 0,
      thighFit: -2,
      hipFit: 0,
      lengthFit: 1,
      overall: 4,
      comment: "허벅지가 낀다",
      isSeed: false,
      createdAt: "2026-03-01T00:00:00.000Z",
      snapshot: {
        nickname: "테스터",
        heightCm: 175,
        weightKg: 70,
        waistInch: 32,
      },
    });
  });
});

describe("toProfileRow", () => {
  it("선택 항목이 없으면 null로 넣는다", () => {
    const row = toProfileRow("user-1", {
      nickname: "테스터",
      heightCm: 175,
      weightKg: 70,
      waistInch: 32,
    });

    expect(row.thigh_cm).toBeNull();
    expect(row.hip_cm).toBeNull();
    expect(row.inseam_cm).toBeNull();
    expect(row.user_id).toBe("user-1");
  });

  it("선택 항목이 있으면 그대로 넣는다", () => {
    const row = toProfileRow("user-1", {
      nickname: "테스터",
      heightCm: 175,
      weightKg: 70,
      waistInch: 32,
      thighCm: 56,
    });

    expect(row.thigh_cm).toBe(56);
  });
});

describe("toBodyProfile", () => {
  it("null 선택 항목을 undefined로 바꾼다", () => {
    const profile = toBodyProfile({
      user_id: "user-1",
      nickname: "테스터",
      height_cm: 175,
      weight_kg: 70,
      waist_inch: 32,
      thigh_cm: null,
      hip_cm: null,
      inseam_cm: null,
    });

    expect(profile).toEqual({
      nickname: "테스터",
      heightCm: 175,
      weightKg: 70,
      waistInch: 32,
      thighCm: undefined,
      hipCm: undefined,
      inseamCm: undefined,
    });
  });

  it("toProfileRow와 왕복해도 값이 보존된다", () => {
    const original = {
      nickname: "테스터",
      heightCm: 175,
      weightKg: 70,
      waistInch: 32,
      thighCm: 56,
      hipCm: 95,
      inseamCm: 78,
    };

    expect(toBodyProfile(toProfileRow("user-1", original))).toEqual(original);
  });
});

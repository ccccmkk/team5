import { describe, expect, it } from "vitest";
import { bodyProfileSchema, fitReviewSchema } from "@/lib/validation/schemas";

const VALID_PROFILE = {
  nickname: "테스터",
  gender: "male",
  heightCm: "175",
  weightKg: "70",
  waistInch: "32",
  thighCm: "",
  hipCm: "",
  inseamCm: "",
};

describe("bodyProfileSchema", () => {
  it("문자열 입력을 숫자로 변환한다", () => {
    const parsed = bodyProfileSchema.parse(VALID_PROFILE);
    expect(parsed.heightCm).toBe(175);
    expect(parsed.waistInch).toBe(32);
  });

  it("빈 문자열 선택 항목은 undefined가 된다", () => {
    const parsed = bodyProfileSchema.parse(VALID_PROFILE);
    expect(parsed.thighCm).toBeUndefined();
    expect(parsed.hipCm).toBeUndefined();
    expect(parsed.inseamCm).toBeUndefined();
  });

  it("선택 항목에 값이 있으면 숫자로 들어간다", () => {
    const parsed = bodyProfileSchema.parse({ ...VALID_PROFILE, thighCm: "56" });
    expect(parsed.thighCm).toBe(56);
  });

  it("닉네임 앞뒤 공백을 제거한다", () => {
    const parsed = bodyProfileSchema.parse({
      ...VALID_PROFILE,
      nickname: "  테스터  ",
    });
    expect(parsed.nickname).toBe("테스터");
  });

  it("닉네임이 1자면 거부한다", () => {
    const result = bodyProfileSchema.safeParse({
      ...VALID_PROFILE,
      nickname: "가",
    });
    expect(result.success).toBe(false);
  });

  it("키가 범위를 벗어나면 거부한다", () => {
    expect(
      bodyProfileSchema.safeParse({ ...VALID_PROFILE, heightCm: "119" }).success,
    ).toBe(false);
    expect(
      bodyProfileSchema.safeParse({ ...VALID_PROFILE, heightCm: "221" }).success,
    ).toBe(false);
  });

  it("숫자가 아닌 값은 거부한다", () => {
    expect(
      bodyProfileSchema.safeParse({ ...VALID_PROFILE, weightKg: "몰라요" })
        .success,
    ).toBe(false);
  });

  it("필수 항목이 비어 있으면 거부한다", () => {
    expect(
      bodyProfileSchema.safeParse({ ...VALID_PROFILE, waistInch: "" }).success,
    ).toBe(false);
  });

  it("성별을 안 고르면 거부한다", () => {
    const withoutGender: Record<string, string> = { ...VALID_PROFILE };
    delete withoutGender.gender;
    expect(bodyProfileSchema.safeParse(withoutGender).success).toBe(false);
    expect(
      bodyProfileSchema.safeParse({ ...VALID_PROFILE, gender: "" }).success,
    ).toBe(false);
  });

  it("아는 성별 값만 통과시킨다", () => {
    expect(
      bodyProfileSchema.safeParse({ ...VALID_PROFILE, gender: "female" })
        .success,
    ).toBe(true);
    expect(
      bodyProfileSchema.safeParse({ ...VALID_PROFILE, gender: "기타" }).success,
    ).toBe(false);
  });
});

const VALID_REVIEW = {
  modelId: "501",
  purchasedSize: "32",
  waistFit: "0",
  thighFit: "-2",
  hipFit: "0",
  lengthFit: "1",
  overall: "4",
  comment: "허리는 맞는데 허벅지가 낀다",
};

describe("fitReviewSchema", () => {
  it("유효한 후기를 통과시킨다", () => {
    const parsed = fitReviewSchema.parse(VALID_REVIEW);
    expect(parsed.thighFit).toBe(-2);
    expect(parsed.overall).toBe(4);
  });

  it("핏 값이 -2~2를 벗어나면 거부한다", () => {
    expect(
      fitReviewSchema.safeParse({ ...VALID_REVIEW, thighFit: "-3" }).success,
    ).toBe(false);
  });

  it("알 수 없는 모델은 거부한다", () => {
    expect(
      fitReviewSchema.safeParse({ ...VALID_REVIEW, modelId: "999" }).success,
    ).toBe(false);
  });

  it("새로 추가된 모델도 통과시킨다", () => {
    for (const id of ["511", "550", "569"]) {
      expect(
        fitReviewSchema.safeParse({ ...VALID_REVIEW, modelId: id }).success,
      ).toBe(true);
    }
  });

  it("한줄평이 없으면 빈 문자열이 된다", () => {
    const withoutComment: Record<string, string> = { ...VALID_REVIEW };
    delete withoutComment.comment;
    expect(fitReviewSchema.parse(withoutComment).comment).toBe("");
  });

  it("한줄평이 300자를 넘으면 거부한다", () => {
    const result = fitReviewSchema.safeParse({
      ...VALID_REVIEW,
      comment: "ㄱ".repeat(301),
    });
    expect(result.success).toBe(false);
  });
});

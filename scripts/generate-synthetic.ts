import type { FitReview, Gender, ReviewSnapshot } from "@/lib/fit-matching";
import { getModel, listModels, type ModelId, type SizeRow } from "@/lib/sizing";
import { clampInt, createRandom, normal, pick } from "./random";

/**
 * 성별에 따라 체형 분포가 다르다. 한 분포에서 뽑으면
 * "나와 비슷한 사람"의 범위가 지나치게 넓어진다 (팀 피드백).
 */
const BODY_BY_GENDER: Record<
  Gender,
  {
    heightMean: number;
    heightSd: number;
    heightRange: [number, number];
    /** 몸무게 = (키 - 100) × 이 계수 */
    weightFactor: number;
    /** 허리 인치 = 기준 + (몸무게 - 기준몸무게) × 0.22 */
    waistBase: number;
    waistPivot: number;
    waistRange: [number, number];
    thighFactor: number;
    hipFactor: number;
  }
> = {
  male: {
    heightMean: 173,
    heightSd: 6,
    heightRange: [155, 195],
    weightFactor: 0.95,
    waistBase: 26,
    waistPivot: 60,
    waistRange: [26, 40],
    thighFactor: 0.72,
    hipFactor: 1.28,
  },
  female: {
    heightMean: 160,
    heightSd: 5.5,
    heightRange: [145, 180],
    weightFactor: 0.85,
    waistBase: 24,
    waistPivot: 50,
    waistRange: [23, 36],
    thighFactor: 0.78,
    hipFactor: 1.42,
  },
};

export type SyntheticReview = Omit<FitReview, "id">;

const NICKNAME_HEADS = [
  "조용한",
  "느긋한",
  "바쁜",
  "단단한",
  "무던한",
  "성실한",
  "꼼꼼한",
];
const NICKNAME_TAILS = [
  "수달",
  "오리",
  "고래",
  "두더지",
  "너구리",
  "올빼미",
  "거북",
];

const COMMENTS_BY_ISSUE: Record<string, string[]> = {
  thighTight: ["허리는 맞는데 허벅지가 꽉 낀다", "앉으면 허벅지가 불편하다"],
  waistLoose: ["허리가 남아서 벨트를 해야 한다", "허리가 조금 뜬다"],
  lengthLong: ["기장이 길어서 밑단을 줄였다", "한 번 접어 입는다"],
  none: ["그냥 무난하다", "평소 사이즈 그대로 맞다", "만족한다"],
};

/**
 * 내 치수가 사이즈표 기준치보다 얼마나 벌어졌는지를 -2~+2 핏 평가로 바꾼다.
 * 내 치수가 기준보다 크면 옷이 작다는 뜻이므로 음수가 된다.
 */
export function toFitLevel(
  mine: number,
  reference: number,
  step: number,
): number {
  const gap = (mine - reference) / step;
  if (gap >= 1.5) return -2;
  if (gap >= 0.6) return -1;
  if (gap <= -1.5) return 2;
  if (gap <= -0.6) return 1;
  return 0;
}

/** 구매 사이즈에 가장 가까운 사이즈표 행. 표에 없는 사이즈를 산 경우를 대비한다. */
export function nearestSizeRow(sizes: SizeRow[], waistInch: number): SizeRow {
  return sizes.reduce((best, row) =>
    Math.abs(row.waistInch - waistInch) < Math.abs(best.waistInch - waistInch)
      ? row
      : best,
  );
}

function makeNickname(random: () => number): string {
  return `${pick(random, NICKNAME_HEADS)}${pick(random, NICKNAME_TAILS)}`;
}

export function generateSyntheticReviews(options: {
  count: number;
  seed: number;
}): SyntheticReview[] {
  const random = createRandom(options.seed);
  const modelIds = listModels().map((m) => m.id);
  const reviews: SyntheticReview[] = [];

  for (let i = 0; i < options.count; i += 1) {
    const gender: Gender = random() < 0.55 ? "male" : "female";
    const g = BODY_BY_GENDER[gender];

    // 한국 성인 분포에 가깝게, 상관관계를 유지해 샘플링한다
    const heightCm = clampInt(
      normal(random, g.heightMean, g.heightSd),
      g.heightRange[0],
      g.heightRange[1],
    );
    const weightKg = clampInt(
      normal(random, (heightCm - 100) * g.weightFactor, 7),
      35,
      120,
    );
    // 허리를 몸무게의 결정함수로 두면 "같은 몸무게, 다른 허리"인 사람이 사라져
    // 데이터 다양성이 무너지고 유사도가 전반적으로 낮게 깔린다. 노이즈를 섞는다.
    const waistInch = clampInt(
      g.waistBase + (weightKg - g.waistPivot) * 0.22 + normal(random, 0, 1.3),
      g.waistRange[0],
      g.waistRange[1],
    );

    // 선택 항목은 일부만 채운다 (실제 입력률을 흉내낸다)
    const thighCm =
      random() < 0.7
        ? clampInt(normal(random, weightKg * g.thighFactor, 3), 30, 85)
        : undefined;
    const hipCm =
      random() < 0.6
        ? clampInt(normal(random, weightKg * g.hipFactor, 5), 65, 135)
        : undefined;
    const inseamCm =
      random() < 0.5
        ? clampInt(normal(random, heightCm * 0.45, 2), 55, 95)
        : undefined;

    const modelId = pick(random, modelIds) as ModelId;
    const model = getModel(modelId);

    // 실제 구매 사이즈는 자기 허리에서 한두 인치 흔들린다
    const purchasedSize = clampInt(
      waistInch + pick(random, [-1, 0, 0, 0, 1]),
      22,
      46,
    );
    const reference = nearestSizeRow(model.sizeChart.sizes, purchasedSize);

    // 핏은 난수가 아니라 사이즈표 기준치와의 차이에서 유도한다.
    // 난수로 채우면 "나와 95% 유사한 사람"의 후기가 서로 모순돼 데모가 무너진다.
    const waistFit = toFitLevel(waistInch * 2.54, reference.waistCm, 3);
    const thighFit =
      thighCm === undefined
        ? pick(random, [0, 0, -1])
        : toFitLevel(thighCm, reference.thighCm, 2.5);
    const hipFit =
      hipCm === undefined
        ? pick(random, [0, 0, 1])
        : toFitLevel(hipCm, reference.hipCm, 4);
    const lengthFit =
      inseamCm === undefined
        ? pick(random, [0, 1, 1])
        : toFitLevel(inseamCm, reference.inseamCm, 3);

    const issues = [waistFit, thighFit, hipFit, lengthFit].filter(
      (v) => Math.abs(v) >= 2,
    ).length;
    // 노이즈: 같은 치수라도 사람마다 만족도가 갈린다
    const overall = clampInt(5 - issues - (random() < 0.2 ? 1 : 0), 1, 5);

    let commentKey = "none";
    if (thighFit <= -2) commentKey = "thighTight";
    else if (waistFit >= 2) commentKey = "waistLoose";
    else if (lengthFit >= 2) commentKey = "lengthLong";

    const snapshot: ReviewSnapshot = {
      nickname: makeNickname(random),
      gender,
      heightCm,
      weightKg,
      waistInch,
      ...(thighCm !== undefined && { thighCm }),
      ...(hipCm !== undefined && { hipCm }),
      ...(inseamCm !== undefined && { inseamCm }),
    };

    reviews.push({
      modelId,
      purchasedSize,
      waistFit,
      thighFit,
      hipFit,
      lengthFit,
      overall,
      comment: pick(random, COMMENTS_BY_ISSUE[commentKey]),
      isSeed: true,
      createdAt: new Date(Date.UTC(2026, 0, 1 + (i % 180))).toISOString(),
      snapshot,
    });
  }

  return reviews;
}

import type { FitType, JeanModel, ModelId, SizeChart } from "@/lib/sizing/types";

const SOURCE = "https://www.levi.com/US/en_US/size-guide/mens";

/**
 * 아래 수치는 일반적인 데님 그레이딩과 팀이 정리한 모델별 핏 특성에서 유도한
 * 근사값이며 공식 표와 아직 대조하지 않았다.
 * SOURCE를 열어 확인한 뒤 값을 고치고 이 상수에 대조한 날짜를 채운다.
 * 비어 있다는 것은 "아직 검증 안 됨"을 뜻한다.
 */
const CHECKED_AT = "";

/** 허리 인치별 기준 치수. 모델별 차이는 허벅지·엉덩이·인심 보정으로 표현한다. */
const BASE_SIZES = [
  { waistInch: 28, waistCm: 71, hipCm: 89, thighCm: 55 },
  { waistInch: 29, waistCm: 74, hipCm: 92, thighCm: 56 },
  { waistInch: 30, waistCm: 76, hipCm: 94, thighCm: 57 },
  { waistInch: 31, waistCm: 79, hipCm: 97, thighCm: 58 },
  { waistInch: 32, waistCm: 81, hipCm: 99, thighCm: 59 },
  { waistInch: 33, waistCm: 84, hipCm: 102, thighCm: 60 },
  { waistInch: 34, waistCm: 86, hipCm: 104, thighCm: 61 },
  { waistInch: 36, waistCm: 91, hipCm: 109, thighCm: 63 },
  { waistInch: 38, waistCm: 96, hipCm: 114, thighCm: 65 },
];

function chart(
  thighOffset: number,
  hipOffset: number,
  inseamCm: number,
): SizeChart {
  return {
    unit: "cm",
    source: SOURCE,
    checkedAt: CHECKED_AT,
    sizes: BASE_SIZES.map((s) => ({
      waistInch: s.waistInch,
      waistCm: s.waistCm,
      hipCm: s.hipCm + hipOffset,
      thighCm: s.thighCm + thighOffset,
      inseamCm,
    })),
  };
}

type ModelSpec = {
  id: ModelId;
  name: string;
  fitType: FitType;
  description: string;
  /** 501 대비 허벅지 여유 (cm) */
  thighOffset: number;
  hipOffset: number;
  inseamCm: number;
};

/** 모델별 핏 특성은 팀이 정리한 자료를 따른다. */
const SPECS: ModelSpec[] = [
  {
    id: "501",
    name: "501 Original Fit",
    fitType: "straight",
    description: "클래식 레귤러 스트레이트. 기준이 되는 핏.",
    thighOffset: 0,
    hipOffset: 0,
    inseamCm: 81,
  },
  {
    id: "502",
    name: "502 Taper",
    fitType: "tapered",
    description: "허벅지는 여유 있고 밑단으로 갈수록 좁아지는 테이퍼드.",
    thighOffset: 2,
    hipOffset: 1,
    inseamCm: 81,
  },
  {
    id: "505",
    name: "505 Regular Fit",
    fitType: "straight",
    description: "여유 있는 레귤러 스트레이트.",
    thighOffset: 1,
    hipOffset: 1,
    inseamCm: 81,
  },
  {
    id: "511",
    name: "511 Slim Fit",
    fitType: "slim",
    description: "몸에 붙는 슬림 스트레이트.",
    thighOffset: -3,
    hipOffset: -2,
    inseamCm: 81,
  },
  {
    id: "512",
    name: "512 Slim Taper",
    fitType: "tapered",
    description: "슬림하면서 밑단이 좁아지는 테이퍼드.",
    thighOffset: -3,
    hipOffset: -2,
    inseamCm: 80,
  },
  {
    id: "514",
    name: "514 Straight",
    fitType: "straight",
    description: "무난한 레귤러 스트레이트.",
    thighOffset: 0,
    hipOffset: 0,
    inseamCm: 81,
  },
  {
    id: "517",
    name: "517 Bootcut",
    fitType: "bootcut",
    description: "정석 빈티지 부츠컷. 무릎 아래에서 벌어진다.",
    thighOffset: -1,
    hipOffset: -1,
    inseamCm: 84,
  },
  {
    id: "527",
    name: "527 Slim Bootcut",
    fitType: "bootcut",
    description: "슬림하고 다리가 길어 보이는 부츠컷.",
    thighOffset: -2,
    hipOffset: -1,
    inseamCm: 85,
  },
  {
    id: "550",
    name: "550 Relaxed Fit",
    fitType: "relaxed",
    description: "허벅지가 넉넉한 릴랙스드 핏.",
    thighOffset: 4,
    hipOffset: 4,
    inseamCm: 80,
  },
  {
    id: "559",
    name: "559 Relaxed Straight",
    fitType: "relaxed",
    description: "넓게 떨어지는 릴랙스드 스트레이트.",
    thighOffset: 3,
    hipOffset: 3,
    inseamCm: 81,
  },
  {
    id: "560",
    name: "560 Loose Taper",
    fitType: "loose",
    description: "매우 여유로운 루즈 테이퍼드.",
    thighOffset: 5,
    hipOffset: 5,
    inseamCm: 80,
  },
  {
    id: "569",
    name: "569 Loose Straight",
    fitType: "loose",
    description: "넓은 루즈 스트레이트.",
    thighOffset: 5,
    hipOffset: 5,
    inseamCm: 81,
  },
];

export const MODELS: JeanModel[] = SPECS.map(
  ({ id, name, fitType, description, thighOffset, hipOffset, inseamCm }) => ({
    id,
    name,
    fitType,
    description,
    sizeChart: chart(thighOffset, hipOffset, inseamCm),
  }),
);

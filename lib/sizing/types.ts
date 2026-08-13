export type SizeRow = {
  waistInch: number;
  waistCm: number;
  hipCm: number;
  thighCm: number;
  inseamCm: number;
};

export type SizeChart = {
  unit: "cm";
  /** 공식 사이즈 표 출처 URL */
  source: string;
  /** 출처를 마지막으로 대조한 날짜 (YYYY-MM-DD). 비어 있으면 아직 미검증. */
  checkedAt: string;
  sizes: SizeRow[];
};

export type ModelId =
  | "501"
  | "502"
  | "505"
  | "511"
  | "512"
  | "514"
  | "517"
  | "527"
  | "550"
  | "559"
  | "560"
  | "569";

export type FitType =
  | "straight"
  | "slim"
  | "tapered"
  | "bootcut"
  | "relaxed"
  | "loose";

export type JeanModel = {
  id: ModelId;
  name: string;
  fitType: FitType;
  description: string;
  sizeChart: SizeChart;
};

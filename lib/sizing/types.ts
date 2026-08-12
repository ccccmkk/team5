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
  /** 출처를 마지막으로 대조한 날짜 (YYYY-MM-DD) */
  checkedAt: string;
  sizes: SizeRow[];
};

export type ModelId = "501" | "517";

export type JeanModel = {
  id: ModelId;
  name: string;
  fitType: "straight" | "bootcut";
  description: string;
  sizeChart: SizeChart;
};

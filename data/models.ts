import type { JeanModel } from "@/lib/sizing/types";

const SOURCE = "https://www.levi.com/US/en_US/size-guide/mens";

/**
 * 아래 수치는 일반적인 데님 그레이딩에서 유도한 근사값이며 공식 표와 아직 대조하지 않았다.
 * SOURCE를 열어 숫자를 확인한 뒤 다른 값은 고치고, 이 상수에 대조한 날짜를 채운다.
 * 비어 있다는 것은 "아직 검증 안 됨"을 뜻한다.
 */
const CHECKED_AT = "";

export const MODELS: JeanModel[] = [
  {
    id: "501",
    name: "501 Original Fit",
    fitType: "straight",
    description: "허리에서 밑단까지 직선으로 떨어지는 오리지널 스트레이트 핏.",
    sizeChart: {
      unit: "cm",
      source: SOURCE,
      checkedAt: CHECKED_AT,
      sizes: [
        { waistInch: 28, waistCm: 71, hipCm: 89, thighCm: 55, inseamCm: 81 },
        { waistInch: 29, waistCm: 74, hipCm: 92, thighCm: 56, inseamCm: 81 },
        { waistInch: 30, waistCm: 76, hipCm: 94, thighCm: 57, inseamCm: 81 },
        { waistInch: 31, waistCm: 79, hipCm: 97, thighCm: 58, inseamCm: 81 },
        { waistInch: 32, waistCm: 81, hipCm: 99, thighCm: 59, inseamCm: 81 },
        { waistInch: 33, waistCm: 84, hipCm: 102, thighCm: 60, inseamCm: 81 },
        { waistInch: 34, waistCm: 86, hipCm: 104, thighCm: 61, inseamCm: 81 },
        { waistInch: 36, waistCm: 91, hipCm: 109, thighCm: 63, inseamCm: 81 },
        { waistInch: 38, waistCm: 96, hipCm: 114, thighCm: 65, inseamCm: 81 },
      ],
    },
  },
  {
    id: "517",
    name: "517 Bootcut",
    fitType: "bootcut",
    description: "허벅지는 붙고 무릎 아래에서 벌어지는 부츠컷.",
    sizeChart: {
      unit: "cm",
      source: SOURCE,
      checkedAt: CHECKED_AT,
      sizes: [
        { waistInch: 28, waistCm: 71, hipCm: 88, thighCm: 54, inseamCm: 84 },
        { waistInch: 29, waistCm: 74, hipCm: 91, thighCm: 55, inseamCm: 84 },
        { waistInch: 30, waistCm: 76, hipCm: 93, thighCm: 56, inseamCm: 84 },
        { waistInch: 31, waistCm: 79, hipCm: 96, thighCm: 57, inseamCm: 84 },
        { waistInch: 32, waistCm: 81, hipCm: 98, thighCm: 58, inseamCm: 84 },
        { waistInch: 33, waistCm: 84, hipCm: 101, thighCm: 59, inseamCm: 84 },
        { waistInch: 34, waistCm: 86, hipCm: 103, thighCm: 60, inseamCm: 84 },
        { waistInch: 36, waistCm: 91, hipCm: 108, thighCm: 62, inseamCm: 84 },
        { waistInch: 38, waistCm: 96, hipCm: 113, thighCm: 64, inseamCm: 84 },
      ],
    },
  },
];

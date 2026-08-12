import type { FitIssue, FitPart } from "@/lib/fit-matching";

const FIT_LABELS = ["많이 낌", "살짝 낌", "딱 맞음", "살짝 큼", "많이 큼"];

const PART_LABELS: Record<FitPart, string> = {
  waistFit: "허리",
  thighFit: "허벅지",
  hipFit: "엉덩이",
  lengthFit: "기장",
};

export function fitLabel(level: number): string {
  return FIT_LABELS[level + 2] ?? "—";
}

export function partLabel(part: FitPart): string {
  return PART_LABELS[part];
}

/**
 * 브랜드 가이드: 명사형과 단정으로 쓴다. 감탄사와 2인칭 권유를 쓰지 않는다.
 * "허벅지 많이 낌 8/12" (O) / "허벅지가 좀 낄 수 있어요!" (X)
 */
export function issueLabel(issue: FitIssue): string {
  const level = issue.direction === "tight" ? -2 : 2;
  return `${partLabel(issue.part)} ${fitLabel(level)} ${issue.count}/${issue.total}`;
}

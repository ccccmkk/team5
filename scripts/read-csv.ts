import { readFileSync } from "node:fs";
import type { ReviewSnapshot } from "@/lib/fit-matching";
import type { SyntheticReview } from "./generate-synthetic";

const COLUMNS = [
  "nickname",
  "heightCm",
  "weightKg",
  "waistInch",
  "thighCm",
  "hipCm",
  "inseamCm",
  "modelId",
  "purchasedSize",
  "waistFit",
  "thighFit",
  "hipFit",
  "lengthFit",
  "overall",
  "comment",
] as const;

/**
 * 마지막 컬럼(comment)에는 쉼표가 들어갈 수 있으므로,
 * 앞쪽 컬럼 수만큼만 자르고 나머지는 통째로 마지막 컬럼에 넣는다.
 */
export function splitRow(line: string, columnCount: number): string[] {
  const cells: string[] = [];
  let rest = line;
  for (let i = 0; i < columnCount - 1; i += 1) {
    const comma = rest.indexOf(",");
    if (comma === -1) {
      cells.push(rest);
      rest = "";
    } else {
      cells.push(rest.slice(0, comma));
      rest = rest.slice(comma + 1);
    }
  }
  cells.push(rest);
  return cells;
}

function optionalNumber(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

export function parseSeedCsv(raw: string): SyntheticReview[] {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  return lines.slice(1).flatMap((line, index) => {
    if (line.trim() === "") return [];

    const cells = splitRow(line, COLUMNS.length);
    const get = (name: (typeof COLUMNS)[number]) =>
      cells[COLUMNS.indexOf(name)] ?? "";

    const snapshot: ReviewSnapshot = {
      nickname: get("nickname").trim(),
      heightCm: Number(get("heightCm")),
      weightKg: Number(get("weightKg")),
      waistInch: Number(get("waistInch")),
    };

    const thighCm = optionalNumber(get("thighCm"));
    const hipCm = optionalNumber(get("hipCm"));
    const inseamCm = optionalNumber(get("inseamCm"));
    if (thighCm !== undefined) snapshot.thighCm = thighCm;
    if (hipCm !== undefined) snapshot.hipCm = hipCm;
    if (inseamCm !== undefined) snapshot.inseamCm = inseamCm;

    return [
      {
        modelId: get("modelId").trim(),
        purchasedSize: Number(get("purchasedSize")),
        waistFit: Number(get("waistFit")),
        thighFit: Number(get("thighFit")),
        hipFit: Number(get("hipFit")),
        lengthFit: Number(get("lengthFit")),
        overall: Number(get("overall")),
        comment: get("comment").trim(),
        isSeed: true,
        createdAt: new Date(Date.UTC(2026, 5, 1 + index)).toISOString(),
        snapshot,
      },
    ];
  });
}

/** 파일이 없으면 빈 배열. 실제 후기 수집 전에도 시드가 돌아가야 한다. */
export function readSeedCsv(path: string): SyntheticReview[] {
  try {
    return parseSeedCsv(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const SCAN_DIRS = ["app", "components"];

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: "큰 라운드 (계측기 톤을 해침)", pattern: /\brounded-(lg|xl|2xl|3xl)\b/ },
  { name: "그림자 (경계는 1px 라인으로만)", pattern: /\bshadow-(sm|md|lg|xl|2xl)\b/ },
  { name: "그라데이션", pattern: /\bbg-(gradient|linear|radial|conic)-to-/ },
  {
    name: "UI 이모지",
    pattern: /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u,
  },
];

function collectFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir, { recursive: true }) as string[];
  } catch {
    return [];
  }
  return entries
    .map((entry) => join(dir, entry))
    .filter((path) => [".ts", ".tsx", ".css"].includes(extname(path)));
}

describe("브랜드 가이드 금지 목록", () => {
  const files = SCAN_DIRS.flatMap(collectFiles);

  for (const { name, pattern } of FORBIDDEN) {
    it(`어디에도 없다: ${name}`, () => {
      const offenders = files.filter((file) =>
        pattern.test(readFileSync(file, "utf8")),
      );
      expect(offenders).toEqual([]);
    });
  }
});

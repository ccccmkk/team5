/**
 * 시드가 들어간 DB에서 실제로 추천을 돌려보고 눈으로 확인하는 도구.
 * 후기 읽기는 공개라 publishable key만 있으면 된다 (service_role 불필요).
 *
 *   npx dotenv -e .env.local -- tsx scripts/inspect.ts
 */
import { createBuildClient } from "@/lib/db/client";
import { getReviews } from "@/lib/db/reviews";
import {
  rankReviews,
  recommendSize,
  type BodyMeasurements,
} from "@/lib/fit-matching";
import { MODEL_IDS } from "@/lib/sizing";

const PEOPLE: { label: string; me: BodyMeasurements }[] = [
  {
    label: "평균 체형",
    me: { heightCm: 175, weightKg: 70, waistInch: 32, thighCm: 55 },
  },
  {
    label: "허벅지 굵은 편",
    me: { heightCm: 175, weightKg: 82, waistInch: 32, thighCm: 63 },
  },
  {
    label: "마른 편",
    me: { heightCm: 180, weightKg: 62, waistInch: 29, thighCm: 46 },
  },
];

async function main() {
  const client = createBuildClient();

  for (const modelId of MODEL_IDS) {
    const reviews = await getReviews(modelId, client);
    console.log(`\n===== ${modelId} · 후기 ${reviews.length}건 =====`);

    if (reviews.length === 0) {
      console.log("  후기가 없습니다. `npm run seed:reset`을 먼저 실행하세요.");
      continue;
    }

    for (const { label, me } of PEOPLE) {
      const ranked = rankReviews(me, reviews);
      const rec = recommendSize(ranked, me);

      console.log(`\n[${label}]`);
      for (const r of ranked.slice(0, 3)) {
        const s = r.snapshot;
        console.log(
          `  유사도 ${String(r.similarity.score).padStart(3)} | ${s.heightCm}cm ${s.weightKg}kg ` +
            `허리${s.waistInch} 허벅지${s.thighCm ?? "-"} | ${r.purchasedSize}인치 | ${r.comment}`,
        );
      }
      console.log(
        rec.status === "ok"
          ? `  → 추천 ${rec.size}인치 (지지 ${rec.supportCount}/${rec.totalCount})`
          : `  → 추천 불가 (후기 ${rec.totalCount}건)`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { createClient } from "@supabase/supabase-js";
import { listModels } from "@/lib/sizing";
import {
  generateSyntheticReviews,
  type SyntheticReview,
} from "./generate-synthetic";
import { readSeedCsv } from "./read-csv";

// 모델 12개 × 성별 2로 나뉘므로 모델당 성별당 25건쯤 되도록 잡는다.
// 이보다 적으면 성별 필터를 켰을 때 추천 후보가 부족해진다.
const SYNTHETIC_COUNT = 600;
const SYNTHETIC_SEED = 20260812;
const CSV_PATH = "data/seed-reviews.csv";

function modelRows() {
  return listModels().map((m) => ({
    id: m.id,
    name: m.name,
    fit_type: m.fitType,
    description: m.description,
    size_chart: m.sizeChart,
  }));
}

function reviewRow(review: SyntheticReview) {
  return {
    user_id: null,
    model_id: review.modelId,
    purchased_size: review.purchasedSize,
    waist_fit: review.waistFit,
    thigh_fit: review.thighFit,
    hip_fit: review.hipFit,
    length_fit: review.lengthFit,
    overall: review.overall,
    comment: review.comment,
    snapshot: review.snapshot,
    is_seed: true,
    created_at: review.createdAt,
  };
}

function collectReviews() {
  const csv = readSeedCsv(CSV_PATH);
  const synthetic = generateSyntheticReviews({
    count: SYNTHETIC_COUNT,
    seed: SYNTHETIC_SEED,
  });
  return { csv, synthetic, all: [...csv, ...synthetic] };
}

/* ---------- SQL 출력 모드 ---------- */

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * service_role 키 없이도 시드를 넣을 수 있게 SQL을 찍어준다.
 * Supabase 대시보드 > SQL Editor에 붙여넣으면 된다.
 */
function printSql(reset: boolean) {
  const lines: string[] = ["begin;"];

  for (const m of modelRows()) {
    lines.push(
      `insert into jean_models (id, name, fit_type, description, size_chart) values (` +
        `${quote(m.id)}, ${quote(m.name)}, ${quote(m.fit_type)}, ${quote(m.description)}, ` +
        `${quote(JSON.stringify(m.size_chart))}::jsonb) ` +
        `on conflict (id) do update set name = excluded.name, fit_type = excluded.fit_type, ` +
        `description = excluded.description, size_chart = excluded.size_chart;`,
    );
  }

  if (reset) {
    lines.push("delete from fit_reviews where is_seed = true;");
  }

  for (const review of collectReviews().all) {
    const r = reviewRow(review);
    lines.push(
      `insert into fit_reviews (user_id, model_id, purchased_size, waist_fit, thigh_fit, hip_fit, length_fit, overall, comment, snapshot, is_seed, created_at) values (` +
        `null, ${quote(r.model_id)}, ${r.purchased_size}, ${r.waist_fit}, ${r.thigh_fit}, ` +
        `${r.hip_fit}, ${r.length_fit}, ${r.overall}, ${quote(r.comment)}, ` +
        `${quote(JSON.stringify(r.snapshot))}::jsonb, true, ${quote(r.created_at)});`,
    );
  }

  lines.push("commit;");
  console.log(lines.join("\n"));
}

/* ---------- 직접 적재 모드 ---------- */

async function seedDirect(reset: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.\n" +
        ".env.local을 채우거나, 키 없이 넣으려면 `npm run seed:sql`로 SQL을 뽑아 " +
        "Supabase SQL Editor에 붙여넣으세요.",
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const models = modelRows();
  const modelResult = await admin.from("jean_models").upsert(models);
  if (modelResult.error) throw modelResult.error;
  console.log(`모델 ${models.length}건 적재`);

  if (reset) {
    const { error } = await admin
      .from("fit_reviews")
      .delete()
      .eq("is_seed", true);
    if (error) throw error;
    console.log("기존 시드 후기 삭제");
  }

  const { csv, synthetic, all } = collectReviews();
  const { error } = await admin.from("fit_reviews").insert(all.map(reviewRow));
  if (error) throw error;

  console.log(
    `후기 ${all.length}건 적재 (실제 ${csv.length} / 합성 ${synthetic.length})`,
  );
}

async function main() {
  const reset = process.argv.includes("--reset");

  if (process.argv.includes("--sql")) {
    printSql(reset);
    return;
  }

  await seedDirect(reset);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

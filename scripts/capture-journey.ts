/**
 * 개발 기록(docs/journey)에 쓸 화면을 실제 파일로 남긴다.
 *
 * 손으로 캡처하면 매번 창 크기와 스크롤 위치가 달라져 before/after를 나란히
 * 놓을 수 없다. 같은 뷰포트, 같은 체형, 같은 경로로 찍어야 비교가 성립한다.
 *
 * 사용법:
 *   npx dotenv -e .env.local -- tsx scripts/capture-journey.ts <라벨>
 *
 * 라벨은 파일명 접두사가 된다 (before / after 등).
 * 개발 서버가 http://localhost:3000 에 떠 있어야 한다.
 */
import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const OUT = "docs/journey/images";

/** 개인화 화면을 찍으려면 체형이 필요하다. 매번 같은 값을 넣어야 비교가 된다. */
const BODY = { nickname: "기록용", heightCm: "177", weightKg: "74", waistInch: "32" };

async function fillProfile(page: Page) {
  await page.goto(`${BASE}/onboarding`);
  await page.locator('input[type="text"]').fill(BODY.nickname);

  // 성별은 나중에 생긴 항목이라 없는 버전에서도 돌아가야 한다
  const male = page.getByRole("button", { name: "남성" });
  if (await male.count()) await male.click();

  const numbers = page.locator('input[type="number"]');
  await numbers.nth(0).fill(BODY.heightCm);
  await numbers.nth(1).fill(BODY.weightKg);
  await numbers.nth(2).fill(BODY.waistInch);

  await page.getByRole("button", { name: /저장/ }).click();
  await page.waitForURL(/\/models\/?$/, { timeout: 15_000 });
}

async function shoot(page: Page, path: string, file: string) {
  await page.goto(`${BASE}${path}`);
  // 후기를 클라이언트에서 다시 불러오므로 네트워크가 잠잠해질 때까지 기다린다
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: false });
  console.log(`  ${file}`);
}

async function main() {
  const label = process.argv[2];
  if (!label) throw new Error("라벨이 필요하다: tsx scripts/capture-journey.ts before");

  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const [device, viewport] of [
    ["desktop", { width: 1000, height: 900 }],
    ["mobile", { width: 390, height: 844 }],
  ] as const) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const page = await context.newPage();

    console.log(`${device}:`);
    await shoot(page, "/", `${label}-${device}-home.png`);
    await shoot(page, "/models", `${label}-${device}-models.png`);

    // 프로필이 없으면 추천 카드가 안 나온다. 개인화 화면은 입력 후에 찍는다.
    await fillProfile(page);
    await shoot(page, "/models/501", `${label}-${device}-detail.png`);

    await context.close();
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

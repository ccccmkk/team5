import { expect, test } from "@playwright/test";

/**
 * 핵심 루프 하나만 끝까지 돌린다: 체형 입력 → 추천 확인 → 후기 작성 → 정리.
 *
 * 실제 Supabase에 붙으므로 마지막에 반드시 자기가 만든 후기를 지운다.
 * 지우는 단계 자체가 /me의 삭제 기능 검증을 겸한다.
 *
 * E2E는 이 하나만 둔다. 팀 프로젝트에서 E2E를 늘리면 관리 비용이
 * 개발 시간을 잡아먹는다 (스펙 §12).
 */
test("헤더가 현재 위치를 표시한다", async ({ page }) => {
  await page.goto("/models");

  const active = page.getByRole("link", { name: "모델", exact: true });
  await expect(active).toHaveAttribute("aria-current", "page");

  // 활성 항목의 밑줄이 항목 폭만큼 그려진다
  const underline = active.locator("span");
  const box = await underline.boundingBox();
  const linkBox = await active.boundingBox();
  expect(box!.width).toBeGreaterThan(10);
  expect(Math.round(box!.width)).toBe(Math.round(linkBox!.width));

  // 다른 메뉴는 밑줄이 없다
  const inactive = page.getByRole("link", { name: "체형 입력" });
  await expect(inactive).not.toHaveAttribute("aria-current", "page");
  expect((await inactive.locator("span").boundingBox())!.width).toBeLessThan(1);

  // 서비스명이 메뉴를 밀어내지 않는다
  const brand = page.getByRole("link", { name: /핏 데이터/ });
  expect((await brand.boundingBox())!.width).toBeGreaterThan(50);

  // 이동하면 활성 표시가 따라온다
  await page.getByRole("link", { name: "체형 입력" }).click();
  await expect(page).toHaveURL(/\/onboarding\/?$/);
  await expect(page.getByRole("link", { name: "체형 입력" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(active).not.toHaveAttribute("aria-current", "page");
});

test("로그인 없이 체형 입력부터 후기 작성까지", async ({ page }) => {
  const nickname = `E2E테스터${Date.now() % 10000}`;
  const comment = `E2E 확인용 ${Date.now()}`;

  // 1. 체형 입력 — 로그인 화면을 거치지 않는다
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "체형 입력" })).toBeVisible();

  await page.locator('input[type="text"]').fill(nickname);
  const numbers = page.locator('input[type="number"]');
  await numbers.nth(0).fill("175"); // 키
  await numbers.nth(1).fill("82"); // 몸무게
  await numbers.nth(2).fill("32"); // 허리
  await numbers.nth(3).fill("63"); // 허벅지

  // 선택 항목을 채우면 정확도가 올라간다
  await expect(page.getByText("85%")).toBeVisible();

  await page.getByRole("button", { name: "저장하고 사이즈 보기" }).click();
  await expect(page).toHaveURL(/\/models\/?$/);

  // 2. 모델 상세에서 추천이 나온다
  await page.goto("/models/501");
  await expect(page.getByText("명이 만족")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("나와 비슷한 순")).toBeVisible();

  // 3. 후기 작성
  await page.goto("/reviews/new?model=501");
  await page.locator('input[type="number"]').first().fill("33");
  await page
    .getByRole("button", { name: "많이 낌", exact: true })
    .nth(1) // 허벅지
    .click();
  await page.locator("textarea").fill(comment);
  await page.getByRole("button", { name: "후기 등록" }).click();

  // 4. 내 후기가 목록에 보인다 (샘플 배지 없이)
  await expect(page).toHaveURL(/\/models\/501\/?$/);
  await expect(page.getByText(comment)).toBeVisible({ timeout: 15_000 });

  // 5. 정리 — /me에서 삭제한다
  await page.goto("/me");
  await expect(page.getByText(comment)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "삭제" }).first().click();
  await expect(page.getByText(comment)).toHaveCount(0);
});

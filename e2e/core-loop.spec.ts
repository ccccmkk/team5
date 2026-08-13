import { expect, test } from "@playwright/test";

/**
 * 테스트가 중간에 실패하면 본문 끝의 정리 단계까지 가지 못해
 * 공유 DB에 후기가 남는다. 실제로 세 건이 남았던 적이 있다.
 *
 * 익명 세션은 자기가 쓴 후기만 소유하므로, /me에서 보이는 것을 전부 지우면
 * 정확히 이 테스트가 만든 것만 지워진다.
 */
test.afterEach(async ({ page }) => {
  await page.goto("/me");
  const deleteButtons = page.getByRole("button", { name: "삭제" });
  for (let left = await deleteButtons.count(); left > 0; left -= 1) {
    await deleteButtons.first().click();
    await expect(deleteButtons).toHaveCount(left - 1);
  }
});

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
  const inactive = page.getByRole("link", { name: "내 정보" });
  await expect(inactive).not.toHaveAttribute("aria-current", "page");
  expect((await inactive.locator("span").boundingBox())!.width).toBeLessThan(1);

  // 헤더 왼쪽은 홈 아이콘이다. 서비스명을 넣으면 메뉴를 밀어낸다.
  const home = page.getByRole("link", { name: "홈" });
  await expect(home).toBeVisible();
  expect((await home.boundingBox())!.width).toBeGreaterThan(10);

  // 메뉴는 두 개뿐이다. 체형 입력은 내 정보의 하위 동작이라 메뉴로 두지 않는다.
  await expect(page.locator("header nav li")).toHaveCount(2);

  // 이동하면 활성 표시가 따라온다
  await inactive.click();
  await expect(page).toHaveURL(/\/me\/?$/);
  await expect(page.getByRole("link", { name: "내 정보" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(active).not.toHaveAttribute("aria-current", "page");

  // 체형 입력 화면에서도 내 정보가 활성이다. 위치 감각을 잃지 않게.
  await page.goto("/onboarding");
  await expect(page.getByRole("link", { name: "내 정보" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("로그인 없이 체형 입력부터 후기 작성까지", async ({ page }) => {
  const nickname = `E2E테스터${Date.now() % 10000}`;
  const comment = `E2E 확인용 ${Date.now()}`;

  // 1. 체형 입력 — 로그인 화면을 거치지 않는다
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "체형 입력" })).toBeVisible();

  await page.locator('input[type="text"]').fill(nickname);

  // 성별은 필수다. 고르지 않으면 검증에서 막혀 다음 화면으로 넘어가지 않는다.
  await page.getByRole("button", { name: "남성" }).click();

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

  // 3. 후기 작성 — 사이즈와 만족도는 자유 입력이 아니라 선택이다
  await page.goto("/reviews/new?model=501");

  // 501 사이즈표에 있는 값만 버튼으로 나온다
  await page.getByRole("button", { name: "33", exact: true }).click();

  await page
    .getByRole("button", { name: "많이 낌", exact: true })
    .nth(1) // 허벅지
    .click();

  await page.getByRole("button", { name: /^5좋음$|^5\s*좋음$/ }).click();

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

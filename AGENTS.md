<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 리바이스 데님 핏 데이터 — 작업 규칙

체형 수치가 비슷한 사람들의 후기를 유사도 순으로 보여주는 서비스.
전체 배경은 [README](README.md), 설계는 [스펙](docs/superpowers/specs/2026-08-12-levis-fit-service-design.md).

**스펙이 설계의 단일 출처다.** 코드와 어긋나면 둘 중 하나가 틀린 것이니 그때 맞춘다.
설계를 바꿨으면 스펙도 같은 PR에서 고친다.

## 협업

**PR의 base는 항상 `main`이다.** 다른 작업 브랜치를 base로 열지 않는다.
실제로 그 브랜치가 먼저 main에 머지되면서 PR 하나가 통째로 붕 떠서, 머지됐는데도
배포에 반영되지 않은 적이 있다(#3). 앞선 작업이 필요하면 rebase로 얹는다.

## 절대 하지 말 것

- **`SUPABASE_SERVICE_ROLE_KEY`를 커밋하거나 `NEXT_PUBLIC_` 접두사로 노출하지 않는다.**
  RLS를 통째로 우회하는 키다. `.env.local`과 저장소 시크릿에만 둔다.
  (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`와 GA 측정 ID는 공개 전제 값이라 소스에 있어도 된다.)
- **`out/`, `.next/`를 커밋하지 않는다.**
- **DB의 실사용자 데이터(`is_seed = false`)를 지우지 않는다.** 시드 재적재는 `is_seed = true`만 건드린다.

## 경계 — ESLint와 테스트가 강제한다

어기면 CI가 깨진다. 우회하지 말고 경계 안으로 옮긴다.

1. **`supabase-js` import는 `lib/db` 안에서만.** 이 경계 덕분에 Vercel에서 GitHub Pages
   정적 호스팅으로 옮길 때 `lib/db`만 고치면 됐다.
2. **`gtag` 호출은 `lib/analytics` 안에서만.** 이벤트 이름과 파라미터가 한 곳에 모여야
   스펙 §15의 KPI 정의와 코드가 어긋나지 않는다.
3. **`rounded-lg` 이상 · `shadow-*` · 그라데이션 · UI 이모지 금지.**
   `lib/design/forbidden.test.ts`가 `app/`과 `components/`를 스캔한다.
   이유는 [브랜드 가이드](docs/design/brand-guide.md).

## 자주 틀리는 것

- **문구에 모델 번호나 개수를 하드코딩하지 않는다.** 모델 목록은 `data/models.ts`가 단일 출처다.
  501·517 두 개에서 12종으로 늘렸을 때 랜딩과 메타데이터 문구가 한꺼번에 낡았다.
  개수가 필요하면 `listModels()`에서 가져온다.
- **서비스명에 "(가칭)" 같은 내부 메모를 넣지 않는다.** 탭 제목과 검색 결과에 그대로 나간다.
  확정 전이라는 사실은 주석과 스펙에 적는다.
- **`accent` 색은 `MeasureBar`에서만 쓴다.** "화면당 1~2회"로 뒀더니 세다가 3회가 됐다.
  다른 강조는 검정 반전(`bg-ink text-surface`).
- **생성기를 고쳐도 DB의 시드는 그대로다.** `scripts/generate-synthetic.ts`를 바꿨으면
  [배포 가이드](docs/deploy.md)의 절차로 다시 적재해야 화면에 반영된다.
- **로컬 빌드가 낡은 후기를 구울 수 있다.** `.next` 캐시 때문이다. 빌드 로그의
  `[prerender] 501: 후기 N건`을 확인하고, 숫자가 이상하면 `.next`를 지우고 다시 빌드한다.
  CI는 매번 새로 체크아웃하므로 이 문제가 없다.

## 판단이 필요한 곳

- **추천 임계값**(`MIN_SUPPORT`, `MIN_ISSUE_*`, `MIN_SIMILARITY`)과 **유사도 가중치**는
  감으로 바꾸지 않는다. 시드 데이터로 분포를 재서 근거를 대고, 스펙 §7에 남긴다.
  기존 값들은 그렇게 정해졌다(§7.4.1의 시뮬레이션 표).
- **성별은 유사도 가중치가 아니라 필터다.** 치수가 아니라 범주라 거리 계산에 넣을 근거가 없다.
- **검증의 최종 방어선은 Zod가 아니라 DB의 `CHECK` 제약과 RLS다.** 서버가 없어서
  브라우저 코드는 우회 가능하다. 입력 범위를 바꾸면 Zod와 마이그레이션을 함께 고친다.

## 검증

작업을 끝냈다고 말하기 전에 돌린다. 실패하면 실패했다고 말한다.

```bash
npm run lint && npm run typecheck && npm test
```

```bash
npx dotenv -e .env.local -- npm run build
```

- `npm test`는 DB 자격증명이 없으면 RLS 테스트를 건너뛴다. CI에서는 건너뛰지 않고 실패한다.
- E2E는 실제 Supabase에 붙어 후기를 만든다. `afterEach`가 지우지만, 중간에 죽으면
  남을 수 있으니 `/me`에서 확인한다.
- 화면을 바꿨으면 `npm run dev`로 눈으로 본다. 헤더 활성 표시, 빈 상태, 성별 필터 문구.

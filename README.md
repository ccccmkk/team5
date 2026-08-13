# 리바이스 데님 핏 데이터

나와 비슷한 체형인 사람들이 실제로 입어본 결과로 청바지 사이즈를 고르는 서비스.

🔗 **https://ccccmkk.github.io/team5/**

브랜드 사이즈 표는 평균 체형 기준이라, 골반과 허벅지 비율이 다르면 같은 32인치도 다르게 맞는다.
여기서는 **체형 수치가 비슷한 사람들의 후기를 유사도 순으로** 보여준다.

---

## 빠르게 시작

```bash
npm install
```

`.env.local`을 만들고 Supabase 값을 채운다. 값은 [docs/deploy.md](docs/deploy.md)에 있다.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=          # 시드·RLS 테스트에만 필요
```

```bash
npm run dev
```

http://localhost:3000

---

## 명령어

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 정적 export (`out/`) |
| `npm test` | 전체 테스트 |
| `npm run test:unit` | 단위 테스트만. **DB 없이 수 초** — CI가 이걸 돌린다 |
| `npm run test:db` | RLS 정책 테스트. `service_role` 키 필요 |
| `npm run test:e2e` | Playwright E2E. 브라우저 설치 필요 (`npx playwright install chromium`) |
| `npm run lint` / `npm run typecheck` | 정적 검사 |
| `npm run seed:reset` | 시드 재적재. `service_role` 키 필요 |
| `npm run seed:sql` | 시드 SQL 출력. **키 없이** Supabase SQL Editor에 붙여넣는 용도 |

---

## 구조

```
app/            라우트 (정적 export)
components/     UI
lib/
  sizing/       모델 12종과 사이즈표          ← 순수
  fit-matching/ 유사도·랭킹·추천·성별 필터    ← 순수, DB와 React를 모름
  validation/   Zod 스키마                    ← 순수
  view/         라벨·눈금자·JSON-LD           ← 순수
  analytics/    GA4 이벤트                    ← gtag는 여기서만
  db/           Supabase 접근                 ← supabase-js는 여기서만
data/           모델 정의, 실제 수집 후기 CSV
scripts/        합성 데이터 생성·시드 적재
supabase/       마이그레이션
e2e/            Playwright
docs/           설계·계획·배포·검증 기록
```

### 지켜야 할 경계 세 가지

ESLint와 테스트가 강제한다. 어기면 CI가 깨진다.

1. **`supabase-js` import는 `lib/db` 안에서만.** 이 경계 덕분에 Vercel에서 GitHub Pages 정적
   호스팅으로 옮길 때 `lib/db`만 고치면 됐다.
2. **`gtag` 호출은 `lib/analytics` 안에서만.** 이벤트 이름과 파라미터가 한 곳에 모여야
   KPI 정의와 코드가 어긋나지 않는다.
3. **큰 라운드·그림자·그라데이션·UI 이모지 금지.** `lib/design/forbidden.test.ts`가
   `app/`과 `components/`를 스캔한다. 이유는 [브랜드 가이드](docs/design/brand-guide.md).

### 문구 규칙

**모델 번호나 개수를 문구에 하드코딩하지 않는다.** 모델 목록은 `data/models.ts`가 단일 출처다.
501·517 두 개에서 12종으로 늘렸을 때 랜딩과 메타데이터 문구가 한꺼번에 낡았다.

---

## 알아둘 것

- **로그인 화면이 없다.** 첫 쓰기 시점에 Supabase 익명 세션을 조용히 만든다. 익명 사용자도
  `auth.users` 행이라 RLS가 그대로 적용된다 — 본인 것만 고치고, 남의 체형 프로필은 못 읽는다.
- **서버가 없다.** 정적 export라 브라우저가 Supabase를 직접 호출한다. **검증의 최종 방어선은
  Zod가 아니라 DB의 `CHECK` 제약과 RLS다.**
- **모델 상세는 빌드 시점에 후기를 HTML로 굽는다.** 그래야 검색엔진이 내용을 본다.
  새 후기는 재빌드 전까지 검색에 안 잡히므로 매일 03:00 KST에 자동 재빌드한다.
- **성별은 유사도 가중치가 아니라 필터다.** 치수가 아니라 범주라 거리 계산에 넣을 근거가 없다.
  같은 성별 표본이 5건 미만이면 필터를 풀고 그 사실을 화면에 적는다.
- **얇은 표본으로 단정하지 않는다.** 지지자가 1명이면 사이즈를 추천하지 않고(`MIN_SUPPORT`),
  한 명만 지적한 부위는 경고로 올리지 않는다(`MIN_ISSUE_*`). 값은 감이 아니라 시드 605건
  시뮬레이션으로 정했다 — 지지자 3명을 요구하면 절반 이상이 추천을 못 받아 서비스가 성립하지 않는다.
- **GA4 측정 ID는 `lib/brand.ts`에 소스로 둔다.** 모든 페이지 HTML에 실려 나가는 공개 값이라
  숨겨서 얻을 게 없고, 시크릿에 두면 admin 권한이 없는 팀원이 손댈 수 없다.

---

## 문서

| 문서 | 내용 |
|---|---|
| [설계 스펙](docs/superpowers/specs/2026-08-12-levis-fit-service-design.md) | 문제 정의, 아키텍처, 데이터 모델, 알고리즘, KPI. **단일 출처** |
| [배포 가이드](docs/deploy.md) | GitHub Pages 설정, 시크릿, 시드 적재, 자주 나는 문제 |
| [브랜드 가이드](docs/design/brand-guide.md) | 계측기 방향, 토큰, 금지 목록, 문구 원칙 |
| [검증 기록](docs/experiments/README.md) | 주 1회 가설 검증 템플릿 |
| [구현 계획](docs/superpowers/plans/) | 실행 완료된 계획 기록 |

---

## 남은 일

- [ ] **구글 서치 콘솔** — `sitemap.xml`은 준비됐다. 소유권 확인 후 제출만 하면 된다.
- [ ] **실제 후기 수집** — 구글폼을 입력 폼과 1:1로 맞춰 받아 `data/seed-reviews.csv`에 채운다.
      폼 응답률 자체가 "사람들이 몸 정보를 입력해줄까"의 검증 데이터다.
- [ ] **사이즈표 대조** — 12종 전부 `checkedAt`이 비어 있다. levi.com이 자동 요청을 403으로 막아
      대조하지 못했고, 2차 자료로 확인된 것은 기준표의 허리·엉덩이뿐이다. 모델별 허벅지 보정치는
      추정이다. 다만 **이 표는 화면에 나오지 않는다** — 추천은 후기 데이터만 쓰고, 이 표는 시드
      후기의 핏 값을 유도할 때만 쓰인다. 즉 걸린 것은 합성 데이터의 현실성이다.
- [ ] **`findSizeRow` 정리** — export와 테스트만 있고 앱에서 호출되지 않는다. 쓸 데가 없으면 지운다.

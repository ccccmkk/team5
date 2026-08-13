# 배포 가이드 — GitHub Pages

배포 주소: **https://ccccmkk.github.io/team5/**

GitHub Pages는 정적 파일만 서빙한다. 그래서 이 프로젝트는 Next.js 정적 export(`output: 'export'`)를
쓰고, 데이터는 빌드 시점에 HTML로 굽고 런타임에는 브라우저가 Supabase를 직접 호출한다.

---

## 처음 한 번만 하는 설정

### 1. 저장소 시크릿 등록

저장소 > **Settings > Secrets and variables > Actions > New repository secret** 에서 세 개를 만든다.

| 이름 | 값 | 상태 |
|---|---|---|
| `SUPABASE_URL` | `https://yjjrerbeffcabqifqdhw.supabase.co` | 등록됨 |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_VAAwDRZw1HjtMV9sA05lzw_miTnVXN5` | 등록됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | 대시보드 > Project Settings > API Keys | 등록됨 |

앞의 두 개는 어차피 브라우저에 노출되는 값이라 비밀이 아니지만, 워크플로에서 한 곳으로 모아
쓰려고 시크릿에 둔다. **`SUPABASE_SERVICE_ROLE_KEY`는 진짜 비밀이다.** RLS를 우회하므로
`deploy.yml`에는 넣지 않는다 — 빌드 산출물은 공개되기 때문이다. RLS 테스트 잡에서만 쓴다.

### 1-2. GA4 측정 ID (연결됨)

**측정 ID는 시크릿이 아니라 `lib/brand.ts`에 소스로 둔다.**

```ts
export const GA_MEASUREMENT_ID = "G-SYK7MN1BHR";
```

이유가 두 가지다. 이 값은 모든 페이지 HTML에 그대로 실려 나가는 **공개 값**이라 숨겨서
얻는 게 없고, 저장소 시크릿은 admin 권한이 있어야 등록·수정할 수 있는데 팀원 대부분은
collaborator라 손을 못 댄다. 아무나 고칠 수 있는 곳에 두는 편이 맞다.

`NEXT_PUBLIC_GA_ID` 환경변수를 주면 그쪽이 우선한다. 별도 GA 속성으로 시험할 때 쓴다.

측정하는 가설과 이벤트 정의는 [검증 기록](experiments/README.md)에 있다.

### 1-3. Supabase 익명 로그인 (이미 켜짐)

이 서비스는 로그인 화면이 없고 첫 쓰기 시점에 익명 세션을 만든다. 대시보드 >
Authentication > Sign In / Providers 의 **Allow anonymous sign-ins**가 켜져 있어야 한다.
꺼지면 체형 저장과 후기 작성이 전부 실패한다.

### 2. Pages 활성화

저장소 > **Settings > Pages > Build and deployment > Source** 를 **GitHub Actions** 로 바꾼다.

`Deploy from a branch`를 고르면 빌드 산출물(`out/`)을 저장소에 커밋해야 해서 diff가 지저분해진다.
Actions 방식은 산출물을 커밋하지 않는다.

### 3. 첫 배포

```bash
git push origin main
```

Actions 탭에서 `Deploy to GitHub Pages`가 초록으로 끝나면 위 주소에서 열린다.

---

## 이후 배포

- **`main`에 push하면 자동 배포된다.**
- **매일 03:00 KST에 자동 재빌드된다.** 프리렌더된 HTML은 빌드 시점의 후기만 담기 때문에,
  새 후기가 검색에 노출되려면 재빌드가 필요하다.
- **발표 직전에는 수동으로 한 번 돌린다.** Actions 탭 > `Deploy to GitHub Pages` >
  `Run workflow`.

---

## 시드 데이터 넣기

두 가지 방법이 있다. 둘 중 하나만 하면 된다.

### 방법 A — SQL 붙여넣기 (service_role 키 불필요, 제일 간단)

```bash
npm run seed:sql > seed.sql
```

생성된 `seed.sql`을 Supabase 대시보드 > **SQL Editor** 에 붙여넣고 실행한다.
`--reset`이 기본으로 걸려 있어 기존 시드(`is_seed = true`)만 지우고 다시 넣는다.
실사용자 데이터는 건드리지 않는다.

`seed.sql`은 커밋하지 않는다. 언제든 다시 만들 수 있다.

현재 적재된 양: **모델 12종 · 후기 605건** (실제 수집 5 / 합성 600, 남 333 / 여 272).
모델당 41~66건이라 성별 필터를 켜도 추천 후보가 남는다. 닉네임은 마스킹 아이디(`김**`,
`min**74`) 275종.

> 생성기(`scripts/generate-synthetic.ts`)를 고쳐도 **이미 적재된 데이터는 그대로다.**
> 반영하려면 위 절차로 다시 넣어야 한다.

### 방법 B — 스크립트로 직접 적재

`.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`를 채운 뒤:

```bash
npm run seed:reset
```

적재 후 추천이 말이 되는지 눈으로 확인한다:

```bash
npx dotenv -e .env.local -- tsx scripts/inspect.ts
```

상위 유사 후기의 체형이 실제로 비슷한지, 추천 사이즈가 납득 가능한지 본다.
이상하면 `scripts/generate-synthetic.ts`의 유도 규칙을 고치고 다시 적재한다.

---

## 자주 나는 문제

| 증상 | 원인과 해결 |
|---|---|
| CSS가 전부 깨져 보임 | `next.config.ts`의 `basePath`가 저장소 이름과 다르다. 저장소가 `team5`가 아니면 그 값으로 고친다. |
| `/models/501` 새로고침에서 404 | `trailingSlash: true`가 빠졌다. Pages는 `/models/501/index.html`을 찾는다. |
| 스타일이 하나도 안 먹음 | `out/.nojekyll`이 없다. Jekyll이 언더스코어로 시작하는 `_next`를 통째로 무시한다. `deploy.yml`이 만들어 주므로 워크플로를 확인한다. |
| 배포는 성공했는데 후기가 안 보임 | 시드가 안 들어갔다. 위 "시드 데이터 넣기" 참고. |
| CI의 RLS 테스트가 실패 | `SUPABASE_SERVICE_ROLE_KEY` 시크릿이 없다. 이 테스트는 조용히 건너뛰지 않고 일부러 실패한다. |
| 체형 저장이 "익명 로그인이 꺼져 있습니다"로 실패 | Supabase의 Allow anonymous sign-ins가 꺼졌다. 1-3 참고. |
| 로컬 빌드에 옛날 후기가 구워짐 | `.next` 빌드 캐시가 이전 렌더를 들고 있다. 빌드 로그의 `[prerender] 501: 후기 N건`을 확인하고, 숫자가 낡았으면 `.next`를 지우고 다시 빌드한다. CI는 매번 새로 체크아웃하므로 이 문제가 없다. |

---

## 지금 배포되어 있는 것

화면 7개가 모두 동작한다.

| 경로 | 내용 |
|---|---|
| `/` | 랜딩 |
| `/models` | 모델 12종 목록 |
| `/models/[id]` | 추천 사이즈 · 체형 분포 · 유사도 순 후기 (빌드 시점 프리렌더) |
| `/onboarding` | 체형 입력 |
| `/reviews/new` | 후기 작성 |
| `/me` | 내 프로필·후기 관리, 기록 보관 범위 안내 |
| `/sitemap.xml`, `/robots.txt` | 검색 노출용 |

로그인 화면은 없다. 첫 쓰기 시점에 익명 세션이 만들어진다.

## 아직 안 된 것

- **구글 서치 콘솔 등록** — `sitemap.xml`은 준비됐다. https://search.google.com/search-console
  에서 `https://ccccmkk.github.io/team5/` 소유권을 메타 태그 방식으로 확인한 뒤 사이트맵을
  제출한다. 과제 6단계다.
- **사이즈표 대조** — `data/models.ts`의 12종 전부 `checkedAt`이 비어 있다. levi.com이 자동
  요청을 403으로 막아 대조하지 못했다. 무엇이 확인됐고 무엇이 추정인지는 그 파일 주석에 있다.
- **소셜 로그인** — 지금은 없다(익명 세션만). 붙이려면 Supabase 대시보드 > Authentication >
  URL Configuration 에 `https://ccccmkk.github.io/team5/` 를 Site URL과 Redirect URLs로
  등록하고, 익명 계정을 `linkIdentity`로 승격시키면 된다. 데이터 이전은 없다.

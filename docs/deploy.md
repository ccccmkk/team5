# 배포 가이드 — GitHub Pages

배포 주소: **https://ccccmkk.github.io/team5/**

GitHub Pages는 정적 파일만 서빙한다. 그래서 이 프로젝트는 Next.js 정적 export(`output: 'export'`)를
쓰고, 데이터는 빌드 시점에 HTML로 굽고 런타임에는 브라우저가 Supabase를 직접 호출한다.

---

## 처음 한 번만 하는 설정

### 1. 저장소 시크릿 등록

저장소 > **Settings > Secrets and variables > Actions > New repository secret** 에서 세 개를 만든다.

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | `https://yjjrerbeffcabqifqdhw.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_VAAwDRZw1HjtMV9sA05lzw_miTnVXN5` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 대시보드 > Project Settings > API Keys 에서 복사 |

앞의 두 개는 어차피 브라우저에 노출되는 값이라 비밀이 아니지만, 워크플로에서 한 곳으로 모아
쓰려고 시크릿에 둔다. **`SUPABASE_SERVICE_ROLE_KEY`는 진짜 비밀이다.** RLS를 우회하므로
`deploy.yml`에는 넣지 않는다 — 빌드 산출물은 공개되기 때문이다. RLS 테스트 잡에서만 쓴다.

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

---

## 아직 안 된 것

계획 1은 도메인 로직과 데이터까지다. **화면은 계획 2에서 만든다.**
지금 배포하면 "준비 중"만 적힌 페이지가 뜬다 — 정상이다.

계획 2에서 붙는 것: Supabase OAuth 로그인, 체형 입력, 모델 상세(추천 카드 + 유사도 순 후기),
후기 작성 폼.

계획 2에서 추가로 설정할 것: Supabase 대시보드 > Authentication > URL Configuration 에
`https://ccccmkk.github.io/team5/` 를 Site URL과 Redirect URLs에 등록해야 OAuth가 돌아온다.

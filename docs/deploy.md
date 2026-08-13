# 배포 가이드 — GitHub Pages + Supabase

배포 주소: **https://ccccmkk.github.io/team5/**

GitHub Pages는 정적 파일만 서빙한다. 그래서 이 프로젝트는 Next.js 정적 export(`output: 'export'`)를
쓰고, 데이터는 빌드 시점에 HTML로 굽고 런타임에는 브라우저가 Supabase를 직접 호출한다.
DB 스키마는 `supabase/migrations/`를 단일 출처로 두고 GitHub Actions에서 테스트 Supabase에 적용한다.

---

## 처음 한 번만 하는 설정

### 1. 앱/테스트용 저장소 시크릿

저장소 > **Settings > Secrets and variables > Actions > New repository secret** 에 등록한다.

| 이름 | 값 | 용도 |
|---|---|---|
| `SUPABASE_URL` | 프로젝트 URL | 앱 빌드/테스트 |
| `SUPABASE_PUBLISHABLE_KEY` | publishable key | 브라우저 앱/RLS 테스트 |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings > API Keys | 시드·RLS 테스트 전용 |

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하는 비밀이다. `deploy.yml`의 공개 빌드 산출물에 넣지 않는다.

### 1-1. GitHub에서 DB migration을 적용하기 위한 시크릿

`Supabase Migrate` workflow는 Supabase CLI로 `supabase/migrations/`의 pending migration을 실제
테스트 DB에 적용한다. 다음 세 값을 GitHub Actions secret으로 추가한다.

| 이름 | 값 | 용도 |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase account access token | CLI 인증 |
| `SUPABASE_PROJECT_REF` | 대상 테스트 프로젝트 ref | 프로젝트 연결 |
| `SUPABASE_DB_PASSWORD` | 대상 프로젝트 DB password | DB migration 연결 |

가능하면 GitHub의 `test` Environment에 이 세 secret을 두어 DB 관리 자격증명을 앱 빌드 secret과 분리한다.
관리용 secret은 `NEXT_PUBLIC_*` 이름으로 만들지 않고 앱 코드나 로그에 출력하지 않는다.

### 1-2. GA4 측정 ID

측정 ID는 시크릿이 아니라 `lib/brand.ts`에 소스로 둔다. 공개 값이기 때문이다.

### 1-3. Supabase 익명 로그인

이 서비스는 로그인 화면이 없고 첫 쓰기 시점에 익명 세션을 만든다. Supabase Dashboard >
Authentication > Sign In / Providers의 **Allow anonymous sign-ins**가 켜져 있어야 한다.

### 2. Pages 활성화

저장소 > **Settings > Pages > Build and deployment > Source** 를 **GitHub Actions** 로 바꾼다.

### 3. 첫 배포

```bash
git push origin main
```

Actions에서 `Deploy to GitHub Pages`가 성공하면 배포된다.

---

## DB 스키마 변경 절차

### 원칙

`supabase/migrations/`가 DB 스키마 변경의 단일 출처다. 테이블/컬럼/인덱스/RLS/constraint를 바꿀 때는
기존 migration을 임의로 재작성하기보다 새 timestamp migration을 추가한다.

예:

```sql
-- supabase/migrations/20260813010000_example.sql
alter table body_profiles
  add column if not exists example text;
```

`main`에 migration 파일이 push되면 `.github/workflows/supabase-migrate.yml`이 실행되고:

```text
checkout
  -> Supabase CLI 설치
  -> supabase link
  -> supabase db push
  -> 테스트 Supabase 반영
```

수동 적용이 필요하면 GitHub > Actions > **Supabase Migrate** > **Run workflow**를 사용한다.

### 생성/수정/삭제

테스트 프로젝트이므로 migration에서 `create table`, `alter table`, `drop table`, index/RLS/policy 변경까지
허용한다. 다만 `drop table`, `drop column`, 대량 `delete` 같은 파괴적 작업은 되돌리기 어렵다.
실행 전에 SQL과 대상 프로젝트 ref를 확인한다. 운영 DB가 생기면 별도 Environment/승인 절차로 분리한다.

### Dashboard에서 이미 SQL을 수동 실행한 경우

GitHub migration history와 실제 DB가 어긋날 수 있다. 같은 변경을 migration이 다시 실행할 수 있으므로
가능하면 `if exists` / `if not exists`를 사용해 테스트 단계에서 재실행에 안전하게 작성한다. 장기적으로는
Supabase migration history를 기준으로 맞추고 Dashboard 직접 변경은 예외로 둔다.

---

## 이후 배포

- `main`에 앱 코드가 push되면 Pages가 자동 배포된다.
- `main`의 `supabase/migrations/**`가 바뀌면 Supabase Migrate가 테스트 DB에 pending migration을 적용한다.
- 매일 03:00 KST에 Pages가 자동 재빌드된다.
- 발표 직전에는 Actions에서 Pages workflow를 수동 실행할 수 있다.

---

## 시드 데이터 넣기

### 방법 A — SQL Editor

```bash
npm run seed:sql > seed.sql
```

생성된 SQL을 Supabase SQL Editor에서 실행한다. `seed.sql`은 커밋하지 않는다.

### 방법 B — 스크립트

`.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`를 채운 뒤:

```bash
npm run seed:reset
```

시드와 schema migration은 역할이 다르다. schema는 migration workflow로, 테스트/합성 데이터는 seed
스크립트로 관리한다.

---

## 자주 나는 문제

| 증상 | 원인과 해결 |
|---|---|
| `Supabase Migrate`가 인증 단계에서 실패 | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`가 GitHub `test` Environment 또는 repository secret에 있는지 확인한다. |
| migration은 GitHub에 있는데 DB 컬럼이 없음 | `Supabase Migrate` workflow가 성공했는지 확인한다. migration 파일 존재만으로 DB가 바뀌지는 않는다. |
| `column ... already exists` | Dashboard에서 같은 변경을 먼저 수동 실행했거나 migration history가 어긋났다. SQL의 재실행 안전성과 migration history를 확인한다. |
| 체형 저장이 실패 | `body_profiles` schema와 앱 mapper/select 컬럼이 일치하는지, migration 성공 여부, anonymous sign-in, RLS 순서로 확인한다. |
| CSS가 전부 깨져 보임 | `next.config.ts`의 `basePath`가 저장소 이름과 다른지 확인한다. |
| `/models/501` 새로고침에서 404 | `trailingSlash: true`가 빠졌는지 확인한다. |
| CI의 RLS 테스트가 실패 | `SUPABASE_SERVICE_ROLE_KEY` secret을 확인한다. |

---

## 보안 경계

브라우저에는 `NEXT_PUBLIC_SUPABASE_URL`과 publishable key만 전달한다. `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`는 브라우저 코드/Next.js 공개 환경변수/빌드 산출물에 넣지 않는다.
GitHub Actions의 migration job에서만 관리용 자격증명을 사용한다.

현재는 테스트 프로젝트라 migration을 main push에 자동 적용한다. 실제 운영 사용자 데이터가 생기면
DB migration workflow를 production Environment로 분리하고 required reviewer 또는 수동 승인 단계를 둔다.

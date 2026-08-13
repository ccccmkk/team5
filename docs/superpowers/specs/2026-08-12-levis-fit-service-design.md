# 리바이스 사이즈 핏 정보 서비스 — 설계 문서

- 작성일: 2026-08-12
- 상태: 승인됨 (구현 계획 작성 대기)
- 프로젝트 성격: 단기 팀 프로젝트 / 데모 (2~6주)

---

## 1. 문제와 타겟

온라인으로 청바지를 살 때 브랜드 공식 사이즈 표만으로는 실제로 내 몸에 맞을지 알 수 없다. 같은 501 32사이즈라도 골반·허벅지 두께·다리 길이 비율이 다르면 결과가 갈린다. 결국 매장에 가서 입어보거나, 샀다가 반품하는 식으로 시간을 쓴다.

공식 사이즈 표는 "평균 체형" 기준이라 참고가 잘 안 되고, **"나랑 비슷한 체형인 사람이 이 모델을 입었을 때 어땠는지"** 정보는 어디에도 없다.

**타겟:** 온라인으로 데님을 자주 사는 사람. 매장에 안 가고 사고 싶은데 사이즈 확신이 없어 망설이거나, 반품·교환을 반복하는 사람.

**핵심 가설:** 체형 수치를 기준으로 후기를 정렬해서 보여주면, 공식 사이즈 표보다 사이즈 결정에 더 도움이 된다.

---

## 2. 범위

### 2.1 MVP에 포함

- 체형 프로필 입력 (필수 3개 + 선택 3개)
- 핏 후기 등록 (모델·구매 사이즈·부위별 핏 평가·한줄평)
- 체형 유사도 기반 후기 정렬 및 사이즈 추천 집계
- 대상 모델: 리바이스 **12종** (501·502·505·511·512·514·517·527·550·559·560·569)
- **성별 입력** — 같은 성별끼리만 비교한다 (→ §7.5)
- **익명 인증 기반 무로그인 이용** — 방문 즉시 쓸 수 있다 (→ §3.2)
- 소셜 로그인 버튼은 **목업**(비활성 자리표시자). 실제 OAuth 연동은 MVP 범위 밖
- 시드 데이터(실제 수집분 + 합성분) 적재 파이프라인
- GitHub + Vercel 배포
- GA4 이벤트 계측과 KPI 정의 (→ §15)
- SEO 메타데이터 + 구글 서치 콘솔 등록 (→ §16)
- 디자인 시스템 / 브랜드 가이드 (→ §17)

### 2.2 의도적으로 만들지 않는 것 (YAGNI)

댓글 · 좋아요 · 팔로우 · 검색 · 이미지 업로드 · 관리자 페이지 · 알림 · 501/517 외 모델 · 다른 브랜드 · 무한 스크롤(20개 페이지네이션 고정) · 추천 알고리즘 학습(ML)

팀 프로젝트가 무너지는 1순위 원인은 기술 난이도가 아니라 기능이 새는 것이다. 이 목록은 스펙의 일부이며, 추가하려면 스펙을 먼저 고친다.

---

## 3. 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| DB / 인증 | Supabase (Postgres + Auth **익명 로그인**) |
| 검증 | Zod (클라이언트·서버 공용 스키마) |
| 테스트 | Vitest (단위·통합), Playwright (E2E 1개) |
| 배포 | **GitHub Pages** (Next.js `output: 'export'`, GitHub Actions로 배포) |
| CI | GitHub Actions |

별도 백엔드 서버 없음. GitHub Pages는 정적 파일만 서빙하므로 **서버 컴포넌트의 요청 시점 데이터 페칭·서버 액션·미들웨어를 쓰지 않는다.** 데이터는 빌드 시점에 프리렌더하고, 런타임에는 브라우저가 `supabase-js`로 직접 읽고 쓴다.

### 3.1 인증 — 익명 우선

**사용자는 로그인 화면을 보지 않는다.** 첫 방문 시 `supabase.auth.signInAnonymously()`로 익명
세션을 조용히 만들고, 그 세션으로 프로필 저장과 후기 작성이 모두 이뤄진다.

이 선택의 핵심은 **RLS를 한 줄도 바꾸지 않아도 된다**는 것이다. 익명 사용자도 `auth.users`에
실재하는 행이라 `auth.uid() = user_id`가 그대로 성립한다. 덕분에:

- 내 후기만 수정·삭제할 수 있다
- 남의 체형 프로필은 여전히 못 읽는다
- 나중에 소셜 로그인을 붙일 때 `linkIdentity`로 기존 익명 계정을 승격시키면 되므로 데이터 이전이 없다

대안이었던 "인증 없이 RLS 완화"는 후기에 소유자가 없어 수정·삭제와 어뷰징 차단이 모두 불가능해져
버렸다.

**제약:** Supabase 대시보드에서 `Allow anonymous sign-ins`를 켜야 한다. 꺼져 있으면
`Anonymous sign-ins are disabled` 오류가 난다.

**한계:** 세션이 브라우저 저장소에 묶이므로 기기를 바꾸거나 저장소를 지우면 자기 후기에 대한
소유권을 잃는다. 소셜 로그인이 붙기 전까지는 감수한다. UI에서 이 점을 한 줄로 알린다.

### 3.2 키 취급

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(구 anon key)는 **브라우저에 노출되는 것을 전제로 설계된 키**다. 이 키만으로 할 수 있는 일의 범위를 RLS(§6.4)가 결정하며, 그것이 이 구조의 유일한 보안 경계다.

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회한다. **시드 스크립트에서만 쓰고, 클라이언트 번들·저장소·`NEXT_PUBLIC_` 접두사 어디에도 들어가면 안 된다.** 로컬은 `.env.local`, CI는 저장소 시크릿으로만 공급한다.

---

## 4. 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│  GitHub Pages (정적 파일)                                      │
│  Next.js  output: 'export' · basePath: '/team5'               │
│                                                               │
│  빌드 시점 │ Supabase에서 후기를 읽어 모델 페이지를 HTML로 프리렌더 │
│  런타임    │ 브라우저가 supabase-js로 최신 데이터·인증·쓰기 처리   │
│                                                               │
│  app/          라우트 · 정적 페이지                             │
│  components/   UI (Tailwind)                                  │
│  lib/                                                         │
│    sizing/       리바이스 모델·공식 사이즈표 (정적 데이터)       │
│    fit-matching/ 유사도 계산 · 랭킹 · 집계  ← 순수 TS, 브라우저 실행 │
│    validation/   Zod 스키마                                    │
│    db/           Supabase 쿼리  ← 유일한 DB 접점               │
└──────────────────────────┬───────────────────────────────────┘
                           │ supabase-js (publishable key + RLS)
┌──────────────────────────▼───────────────────────────────────┐
│  Supabase                                                     │
│   Postgres : jean_models · body_profiles · fit_reviews        │
│   Auth     : 익명 로그인 (로그인 화면 없음)                     │
│   RLS      : 유일한 보안 경계                                   │
└───────────────────────────────────────────────────────────────┘
```

`lib/fit-matching`이 순수 TS라 정적 export로 옮겨도 그대로 브라우저에서 돈다. 정적 호스팅 전환에서 실제로 바뀌는 모듈은 `lib/db` 하나다 — §5의 모듈 경계가 값을 하는 지점이다.

### 4.1 정적 호스팅 제약

| 안 쓰는 것 | 대체 |
|---|---|
| 서버 컴포넌트의 요청 시점 페칭 | 빌드 시점 프리렌더 + 브라우저 페칭 |
| 서버 액션 | 클라이언트에서 `supabase-js` 직접 호출 (RLS가 방어) |
| 미들웨어 / `proxy.ts` | 세션은 브라우저 클라이언트가 자체 갱신 |
| 라우트 핸들러(OAuth 콜백) | 익명 로그인은 리다이렉트가 없어 콜백 자체가 불필요 |
| `next/image` 최적화 | `images: { unoptimized: true }` |

추가 설정: `trailingSlash: true` (Pages가 `/models/501/index.html`을 찾게), 산출물 루트에 `.nojekyll` (Jekyll이 `_next`를 무시하지 않게), 프로젝트 페이지면 `basePath: '/team5'`.

### 4.2 조회 흐름

1. 사용자가 `/models/501/` 진입 → 빌드 시점에 프리렌더된 HTML이 즉시 보인다 (후기 본문 포함 → SEO)
2. 하이드레이션 후 브라우저가 `db.getMyProfile()` + `db.getReviews('501')`로 최신 데이터를 받는다
3. `fitMatching.rankReviews(내프로필, 후기목록)` → 유사도 점수를 붙여 정렬
4. `fitMatching.recommendSize(랭킹결과, 내프로필)` → 추천 사이즈와 부위별 이슈
5. 렌더: 추천 사이즈 카드 → 부위별 핏 분포 → 유사도 순 후기 리스트

프로필이 없는 방문자에게는 1번의 프리렌더 결과(최신순 정렬)가 그대로 보인다. 로그인·프로필이 있으면 2~5번이 그 위를 덮는다.

### 4.3 작성 흐름

1. 로그인 → 프로필 없으면 `/onboarding`으로 유도
2. `/reviews/new` 폼 제출
3. **클라이언트에서** Zod 검증 → 현재 프로필을 `snapshot`으로 복사 → `supabase.from('fit_reviews').insert()`
4. 성공 시 로컬 상태를 갱신하고 모델 페이지로 이동

서버가 없으므로 검증의 최종 방어선은 **DB의 `CHECK` 제약과 RLS 정책**이다(§6). Zod는 UX를 위한 1차 검증이며, 신뢰 경계가 아니다. 이 때문에 §6의 `CHECK` 제약은 선택이 아니라 필수다.

---

## 5. 모듈 경계

| 모듈 | 책임 | 의존 | 테스트 |
|---|---|---|---|
| `lib/sizing` | 리바이스 모델 목록·공식 사이즈표 조회 | 없음 (정적 상수) | 순수 단위 |
| `lib/fit-matching` | 체형 유사도, 후기 랭킹, 사이즈 추천 집계 | `sizing`의 **타입만** | 순수 단위 (DB 불필요) |
| `lib/validation` | 프로필·후기 입력 Zod 스키마 | 없음 | 순수 단위 |
| `lib/db` | Supabase 쿼리 전부 (브라우저 클라이언트 + 빌드 시점 조회) | supabase-js | 통합 (dev 프로젝트) |
| `lib/analytics` | GA4 이벤트 전송 (§15에 정의된 이벤트만) | gtag | 단위 (전송 함수 모킹) |

**불변 규칙**

1. `lib/fit-matching`은 Supabase도 React도 모른다. 평범한 객체를 받아 평범한 객체를 돌려주는 순수 함수 묶음이다.
2. `supabase-js` import는 `lib/db` 바깥에서 금지한다. (ESLint `no-restricted-imports`로 강제)
3. `gtag` 직접 호출은 `lib/analytics` 바깥에서 금지한다. 이벤트 이름과 파라미터가 한 파일에 모여 있어야 §15의 KPI 정의와 코드가 어긋나지 않는다.

이 규칙 덕분에 가중치 튜닝이 DB 없이 초 단위로 돌아가고, 팀원 간 작업 충돌 면적이 줄어든다.

---

## 6. 데이터 모델

### 6.1 `jean_models`

```sql
create table jean_models (
  id          text primary key,          -- '501', '517'
  name        text not null,             -- '501 Original Fit'
  fit_type    text not null,             -- 'straight' | 'bootcut'
  description text not null default '',
  size_chart  jsonb not null,
  created_at  timestamptz not null default now()
);
```

`size_chart` 구조:

```json
{
  "unit": "cm",
  "source": "리바이스 공식 사이즈 가이드 URL",
  "checkedAt": "2026-08-12",
  "sizes": [
    { "waistInch": 28, "waistCm": 71, "hipCm": 89, "thighCm": 55, "inseamCm": 81 }
  ]
}
```

### 6.2 `body_profiles`

```sql
create table body_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nickname   text     not null check (char_length(nickname) between 2 and 12),
  height_cm  smallint not null check (height_cm  between 120 and 220),
  weight_kg  smallint not null check (weight_kg  between 30  and 200),
  waist_inch smallint not null check (waist_inch between 22  and 46),
  thigh_cm   smallint          check (thigh_cm   between 30  and 90),
  hip_cm     smallint          check (hip_cm     between 60  and 140),
  inseam_cm  smallint          check (inseam_cm  between 50  and 110),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**필수 3개:** 키, 몸무게, 평소 입는 청바지 허리 사이즈(인치).
**선택 3개:** 허벅지 둘레, 엉덩이 둘레, 인심.

실측 허리둘레 대신 "평소 입는 청바지 사이즈"를 묻는다. 줄자를 꺼내야 하는 순간 입력률이 급락하고, 우리에게 필요한 건 라벨 기준 비교다.

### 6.3 `fit_reviews`

```sql
create table fit_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid     references auth.users(id) on delete cascade,  -- 시드는 null
  model_id       text     not null references jean_models(id),
  purchased_size smallint not null check (purchased_size between 22 and 46),
  waist_fit      smallint not null check (waist_fit  between -2 and 2),
  thigh_fit      smallint not null check (thigh_fit  between -2 and 2),
  hip_fit        smallint not null check (hip_fit    between -2 and 2),
  length_fit     smallint not null check (length_fit between -2 and 2),
  overall        smallint not null check (overall    between  1 and 5),
  comment        text     not null default '' check (char_length(comment) <= 300),
  snapshot       jsonb    not null,
  is_seed        boolean  not null default false,
  created_at     timestamptz not null default now(),
  constraint seed_has_no_user check (
    (is_seed and user_id is null) or (not is_seed and user_id is not null)
  )
);

create unique index fit_reviews_one_per_user_model_size
  on fit_reviews (user_id, model_id, purchased_size)
  where user_id is not null;

create index fit_reviews_by_model on fit_reviews (model_id, created_at desc);
```

**핏 평가는 -2 ~ +2 정수 4개** — 작음 / 약간 작음 / 딱 맞음(0) / 약간 큼 / 큼.
"허리는 맞는데 허벅지가 꽉 낀다"가 자유 텍스트가 아니라 `waist_fit=0, thigh_fit=-2`라는 구조화된 데이터가 되고, 그래야 집계가 가능하다.

**`snapshot`은 후기 작성 시점의 체형 사본이다.**

```json
{ "nickname": "…", "heightCm": 175, "weightKg": 70, "waistInch": 32,
  "thighCm": 56, "hipCm": 95, "inseamCm": 78 }
```

사용자가 3개월 뒤 몸무게를 고치면 과거 후기의 유사도 계산이 전부 틀어지기 때문에 스냅샷을 박아둔다. 부수 효과로 **`body_profiles`를 완전히 비공개로 잠글 수 있다** — 남의 프로필을 읽을 이유가 사라지므로 민감 정보 노출 면적이 0이 된다.

### 6.4 RLS 정책

```sql
alter table jean_models   enable row level security;
alter table body_profiles enable row level security;
alter table fit_reviews   enable row level security;

create policy models_public_read on jean_models
  for select using (true);

create policy profile_own_read   on body_profiles
  for select using (auth.uid() = user_id);
create policy profile_own_insert on body_profiles
  for insert with check (auth.uid() = user_id);
create policy profile_own_update on body_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy reviews_public_read on fit_reviews
  for select using (true);
create policy reviews_own_insert  on fit_reviews
  for insert with check (auth.uid() = user_id and is_seed = false);
create policy reviews_own_update  on fit_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reviews_own_delete  on fit_reviews
  for delete using (auth.uid() = user_id);
```

시드 데이터는 service role 키로 적재하며 RLS를 우회한다.

---

## 7. 유사도 알고리즘

### 7.1 수식

```
diff_i     = min( |내값_i - 상대값_i| / tolerance_i , 1 )     ← 1로 클램프
distance   = sqrt( Σ (w_i · diff_i²) / Σ w_i )               ← 양쪽 다 입력된 항목만
similarity = round( (1 - distance) × 100 )                    ← 0 ~ 100
confidence = Σ(사용된 w_i) / Σ(전체 w_i)                       ← 0 ~ 1
```

### 7.2 상수

```ts
// lib/fit-matching/config.ts
export const MEASUREMENT_CONFIG = {
  waistInch: { tolerance: 3,  weight: 0.30 },
  thighCm:   { tolerance: 6,  weight: 0.25 },
  weightKg:  { tolerance: 12, weight: 0.20 },
  hipCm:     { tolerance: 8,  weight: 0.10 },
  heightCm:  { tolerance: 10, weight: 0.10 },
  inseamCm:  { tolerance: 6,  weight: 0.05 },
} as const;
```

tolerance는 "이만큼 차이나면 체감상 다른 체형"이라는 값이다.

설계 포인트:

- **`min(…, 1)` 클램프** — 한 항목이 극단적으로 달라도 점수가 음수로 폭주하지 않는다.
- **`Σ w_i`로 나누기** — 선택 항목을 안 넣은 사람도 공정하게 비교된다. 결측 처리가 알고리즘에 내장되므로 별도 분기가 필요 없다.
- **`confidence` 분리 반환** — 필수 3개만 넣으면 0.60. UI에서 "허벅지 둘레를 넣으면 정확도가 85%로 올라갑니다"로 추가 입력을 유도한다.

### 7.3 공개 인터페이스

```ts
export type BodyMeasurements = {
  heightCm: number; weightKg: number; waistInch: number;
  thighCm?: number; hipCm?: number; inseamCm?: number;
};

export type SimilarityResult = {
  score: number;       // 0-100
  confidence: number;  // 0-1
  usedFields: MeasurementField[];
};

export function similarity(a: BodyMeasurements, b: BodyMeasurements): SimilarityResult;
export function rankReviews(me: BodyMeasurements, reviews: FitReview[]): RankedReview[];
export function recommendSize(ranked: RankedReview[]): SizeRecommendation;
```

### 7.4 사이즈 추천 집계

유사도를 표의 무게로 쓰는 가중 투표다.

```
후보      = similarity >= 40 인 후기, 유사도 상위 30개
표 무게    = (similarity / 100)² × 만족도계수
만족도계수 = overall >= 4 → 1.0 / overall == 3 → 0.5 / overall <= 2 → 0.0
```

유사도를 제곱해 가까운 사람의 의견에 쏠리게 하고, 불만족 후기(1~2점)는 그 사이즈에 표를 던지지 않는다.

- **추천 사이즈** = 표 합이 가장 큰 사이즈. 동점이면 후기 수가 많은 쪽, 그래도 동점이면 작은 사이즈.
- **표 합이 0이면** 추천 불가 상태를 반환하고 UI가 "후기가 아직 부족합니다"를 띄운다.
- **주요 이슈** = 추천 사이즈 후기 중 특정 부위의 `|fit| >= 2` 비율이 30%를 넘으면 노출. 예: `허벅지 꽉 낌 8/12`.

반환 형태:

```ts
type SizeRecommendation =
  | { status: 'ok'; size: number; supportCount: number; totalCount: number;
      profileConfidence: number; topIssues: FitIssue[] }
  | { status: 'insufficient_data'; totalCount: number };
```

`profileConfidence`는 7.1의 `confidence`(내 프로필 항목 충족도)를 그대로 전달한 값이며, 추천 자체의 신뢰도가 아니라 "내가 입력한 정보가 얼마나 충분한가"를 뜻한다. 두 개념을 한 이름으로 섞지 않는다.

---

### 7.5 성별 처리

팀 피드백: 성별 구분이 없으면 체형 분포가 지나치게 넓어져 "나와 비슷한 사람"의 의미가 흐려진다.

**성별은 유사도 가중치가 아니라 필터다.** 치수가 아니라 범주라서 거리 계산에 넣을 수 없고,
넣더라도 "남녀 사이 거리"를 몇으로 둘지에 근거가 없다.

- 같은 성별 후기만 남겨 랭킹·추천·분포를 계산한다
- 같은 성별 표본이 **5건 미만이면 필터를 풀고** 전체를 보여준다. 정확도보다 빈 화면이 더 나쁘다
- 필터가 풀렸을 때는 화면에 그 사실과 같은 성별 후기 수를 함께 적는다
- 성별이 없는 옛 후기는 같은 성별로 세지 않는다

구현은 `lib/fit-matching/gender.ts`의 `filterByGender`. 순수 함수라 DB 없이 테스트한다.

---

## 8. 데이터 파이프라인 (시드)

```
data/
  models.ts              리바이스 501·517 공식 사이즈표 (수기 입력 + 출처 주석)
  seed-reviews.csv       팀원·지인 실제 후기
scripts/
  generate-synthetic.ts  합성 후기 생성 (고정 시드 PRNG)
  seed.ts                CSV + 합성 → Supabase 적재
supabase/migrations/     스키마
```

3단계 전부를 저장소에 코드로 남긴다. 재현이 안 되는 시드는 데모 전날 밤에 사고가 난다.

### 8.1 공식 사이즈표 (정적 데이터)

501/517 두 개뿐이므로 크롤링하지 않고 `data/models.ts`에 TS 상수로 박는다. 출처 URL과 확인 날짜를 주석과 `size_chart.source`에 남긴다. 표 2개는 손으로 넣는 게 빠르고 사이트 개편에 깨지지 않는다.

### 8.2 실제 후기 수집 (구글폼 → CSV, 20~30건)

**폼 문항을 실제 서비스 입력 폼과 1:1로 맞춘다.** 그러면 두 가지가 따라온다:

- 폼 응답률과 항목별 미응답률이 그대로 *"사람들이 자기 몸 정보를 입력해줄 의향이 있는가"*의 1차 검증 데이터가 된다. 핵심 리스크를 코드 한 줄 없이 검증할 수 있다.
- 어느 항목에서 사람들이 막히는지 보이므로 필수/선택 구분을 재조정할 근거가 생긴다.

CSV는 저장소에 커밋하되 **개인 식별 정보는 넣지 않고** 닉네임은 생성해서 채운다.

### 8.3 합성 증강 (200~300건)

`scripts/generate-synthetic.ts`는 고정 시드 PRNG를 쓴다. 매번 같은 결과가 나와야 버그 재현이 된다.

- **체형**: 한국 성인 신체 치수 분포에서 샘플링하되 상관관계를 유지한다 (키↔인심, 몸무게↔허벅지).
- **핏 평가**: 무작위가 아니라 **공식 사이즈표에서 규칙으로 유도한다.** 허벅지 둘레가 해당 사이즈 기준치를 넘으면 `thigh_fit`을 음수 쪽으로 미는 식. 난수로 채우면 "나와 95% 유사한 사람"의 후기가 서로 모순돼서 데모가 무너진다.
- 여기에 노이즈를 섞어 "체형은 같은데 평가가 갈리는" 현실적 케이스도 만든다.

전부 `is_seed = true`로 들어가고 UI에 회색 **"샘플"** 배지가 붙는다. 발표 때 화면이 스스로 "이건 합성 데이터"라고 말해주니 정직하면서 예상 질문도 막는다.

### 8.4 멱등성

`pnpm seed --reset`은 `is_seed = true` 행만 삭제하고 다시 넣는다. 실사용자 데이터는 건드리지 않는다.

---

## 9. CI/CD 파이프라인

```
로컬                 PR (GitHub Actions)                main push · 스케줄
────                 ───────────────────                ──────────────────
npm run dev      →   lint · typecheck               →   build (Supabase 조회 포함)
npm run test:watch   test:unit (DB 없음, 수 초)             ↓
                     build                                 actions/deploy-pages
                     ───────────────────                   ↓
                     test:db (RLS 정책, 시크릿 필요)          GitHub Pages
```

- **단위 테스트가 DB를 안 쓴다.** `fit-matching`·`sizing`·`validation`이 순수 함수라 CI가 수 초 만에 끝난다. 팀 프로젝트에서 CI가 느리면 아무도 안 기다리고, 안 기다리면 CI가 없는 것과 같다.
- **RLS 정책 자체를 테스트한다.** "A 계정이 B의 체형 프로필을 못 읽는다", "남의 후기를 수정 못 한다"를 테스트로 박아둔다. 정적 호스팅에서는 RLS가 **유일한** 보안 경계라 더더욱 필수다.
- **정기 재빌드.** 프리렌더된 HTML은 빌드 시점의 후기만 담는다. 새 후기가 검색에 노출되려면 재빌드가 필요하므로 `schedule`(하루 1회)과 `workflow_dispatch`(수동)를 함께 건다. 데모 직전에는 수동으로 한 번 돌린다.
- **PR에서는 배포하지 않는다.** GitHub Pages는 환경이 하나뿐이라 프리뷰 URL이 없다. 화면 확인은 로컬 `npm run dev`로 한다.

환경은 Supabase 무료 프로젝트 1개(dev). Pages 환경이 하나이므로 prod를 따로 두지 않고, 시드와 실사용자 데이터는 `is_seed`로 구분해 함께 둔다.

---

## 10. 화면

| 경로 | 내용 |
|---|---|
| `/` | 랜딩 — 문제 제기 + "내 체형으로 사이즈 찾기" CTA |
| ~~`/login`~~ | **삭제.** 익명 로그인이라 로그인 화면이 없다. 소셜 버튼은 `/me`에 목업으로 둔다 |
| `/onboarding` | 닉네임 + 체형 입력 (필수 3개 → 선택 3개, 2단계) |
| `/models` | 501 · 517 카드 |
| `/models/[id]` | **핵심 화면** — ①추천 사이즈 카드(가중 투표 + confidence) ②부위별 핏 분포 ③유사도 순 후기 리스트 |
| `/reviews/new` | 후기 작성 폼 |
| `/me` | 내 프로필 수정 · 내 후기 목록 |

---

## 11. 에러 처리

### 11.1 입력 검증

서버가 없으므로 Zod는 **UX를 위한 1차 검증일 뿐 신뢰 경계가 아니다.** 브라우저에서 도는 코드는 사용자가 우회할 수 있다. 진짜 방어선은 **DB의 `CHECK` 제약과 RLS 정책**이며, 신체 치수 범위는 Zod와 `CHECK` 양쪽에 동일하게 건다. 오타 하나가 유사도 계산 전체를 오염시키므로 DB 쪽 제약은 선택이 아니다.

### 11.2 빈 결과 (가장 흔한 에러 상태)

| 상황 | 화면 |
|---|---|
| 프로필 미입력 | "체형을 입력하면 나와 비슷한 사람 순으로 정렬됩니다" + CTA |
| 후기 0건 모델 | "첫 후기를 남겨주세요" + 작성 CTA |
| 유사도 40 이상 없음 | 낮은 유사도라도 전부 노출 + "유사도 낮음" 경고 배지 |
| 추천 표 합 0 | "후기가 아직 부족합니다" + 후기 리스트만 노출 |

**절대 빈 화면을 주지 않는다.** 콜드스타트 서비스에서 빈 화면은 곧 이탈이다.

### 11.3 시스템 오류

- Supabase 장애·네트워크 오류 → `error.tsx` 라우트 에러 바운더리 + 재시도 버튼
- insert/upsert 실패 → 입력값을 폼 상태에 보존한 채 오류만 표시한다. 체형 6개를 다시 입력하게 만들면 그 사용자는 돌아오지 않는다.
- 브라우저에서 직접 호출하므로 네트워크 실패가 서버 환경보다 잦다. 모든 쓰기 동작에 로딩 상태와 재시도 경로를 둔다.

---

## 12. 테스트 전략

TDD로 진행한다. 순수 모듈 비중이 높아 잘 맞는다.

| 층 | 대상 | 도구 | 실행 |
|---|---|---|---|
| 단위 | fit-matching · sizing · validation | Vitest | 항상 (DB 없음) |
| 통합 | lib/db 쿼리 + RLS 정책 | Vitest + 로컬 Supabase | PR |
| E2E | 가입 → 프로필 → 후기 작성 → 조회 **1개 시나리오** | Playwright | PR |

### `lib/fit-matching` 필수 테스트 케이스

- 동일 체형 → 100
- 전 항목이 tolerance 이상 차이 → 0 (음수 없음)
- 선택 항목 결측 → 필수 3개만으로 계산, `confidence == 0.60`
- 단일 항목만 극단적으로 다름 → 클램프가 동작해 점수가 붕괴하지 않음
- 랭킹 정렬 순서와 동점 처리
- 가중 투표: 유사도 높은 후기가 더 큰 표를 가짐
- 만족도 1~2점 후기는 표를 던지지 않음
- 후보가 없을 때 추천 불가 상태 반환

E2E는 하나만 둔다. 팀 프로젝트에서 E2E를 늘리면 관리 비용이 개발 시간을 잡아먹는다.

---

## 13. 리스크와 검증 계획

| 리스크 | 대응 |
|---|---|
| **가중치에 근거가 없음** (0.30 / 0.25 …는 초기 감으로 정한 값) | 8.2에서 실제 후기 20~30건이 모이면 "같은 사이즈를 추천한 사람들이 실제로 유사도 상위에 오는가"로 검증하고 조정. 순수 함수로 분리한 이유가 이것 — 값 변경 후 테스트까지 수 초. |
| **사람들이 체형 정보를 입력해줄지 미검증** | 8.2 구글폼 응답률·항목별 미응답률이 곧 1차 검증 데이터. 개발 착수와 병행해 가장 먼저 돌린다. |
| **콜드스타트 (후기 0건)** | 시드 200~300건 + 11.2의 빈 결과 화면 설계. |
| **합성 데이터를 실제 데이터로 오인** | `is_seed` 플래그 + UI "샘플" 배지로 화면에서 항상 구분. |
| 데모 직전 시드 손상 | `seed.ts --reset` 멱등 재적재. 고정 시드 PRNG로 결과 재현. |

---

## 14. 결정 기록

| 결정 | 선택 | 버린 안과 이유 |
|---|---|---|
| 백엔드 구조 | 단일 Next.js 앱 + Supabase 직결 | 별도 API 서버 — 2~6주 데모에 배포 2벌·CORS 비용만 늘어남 |
| 배포 | GitHub Pages + Actions (팀 결정) | Vercel — 서버 런타임을 쓸 수 있었으나 팀이 Pages로 정함 |
| 렌더링 | 정적 export + 빌드 시점 프리렌더 | 전량 클라이언트 렌더 — 크롤러에 빈 페이지로 보여 §16이 무의미해짐 |
| 쓰기 경로 | 브라우저 → Supabase 직접 (RLS 방어) | 서버 액션 — 정적 호스팅에서 사용 불가 |
| 유사도 계산 위치 | 앱 내 순수 TS 모듈 | Postgres RPC — 로직이 마이그레이션에 갇혀 테스트가 무거워짐 |
| 매칭 방식 | 정규화 가중 거리 → 점수 정렬 | 범위 필터 — 데이터가 적으면 결과 0건이 뜸 / 체형 타입 버킷 — 기준에 근거가 없음 |
| 요약 방식 | 구조화된 집계 (LLM 없음) | LLM 요약 — 작업량·비용 대비 MVP 검증에 불필요 |
| 시드 확보 | 수기 수집 + 규칙 기반 합성 | 크롤링 — 체형 수치가 없어 핵심 기능에 안 맞고 ToS 리스크 |
| 인증 | 익명 로그인 + 닉네임 (소셜 버튼은 목업) | 소셜 OAuth 실연동 — 로그인 벽이 입력률을 떨어뜨리고 세팅 비용이 큼 / RLS 완화 — 후기 소유자가 사라져 수정·삭제와 어뷰징 차단이 불가능 |
| 프로필 공개 범위 | 비공개, 후기에 스냅샷 복사 | 프로필 공개 — 민감 정보 노출 면적이 커짐 |

---

## 15. KPI와 데이터 측정 (GA4)

과제 평가 기준이 완성도가 아니라 **가설 → 제작 → 데이터 검증 → 재가설** 반복이므로, 계측은 부가 기능이 아니라 산출물의 일부다.

### 15.1 검증 가설과 KPI

| # | 가설 | KPI | 측정 | 성공 기준 |
|---|---|---|---|---|
| H1 | 사람들은 자기 몸 정보를 입력해준다 | 온보딩 완료율 = `profile_complete` / `profile_start` | GA4 퍼널 | 60% |
| H2 | 선택 항목까지 입력할 의향이 있다 | 선택 항목 입력률 = confidence ≥ 0.85 비율 | `profile_complete`의 `confidence` 파라미터 | 30% |
| H3 | 유사도 정렬이 실제로 도움이 된다 | 모델 상세 → 후기 펼침률 | `view_model` → `expand_review` | 40% |
| H4 | 조회만 하지 않고 기여도 한다 | 후기 작성 전환율 = `review_submit` / 프로필 보유자 | GA4 퍼널 | 15% |

H1·H2는 §13에 적은 핵심 리스크("사람들이 몸 정보를 입력해줄지 미검증")를 직접 겨냥한다.

### 15.2 커스텀 이벤트

| 이벤트 | 파라미터 |
|---|---|
| `profile_start` / `profile_complete` | `confidence`, `optional_field_count` |
| `view_model` | `model_id`, `has_profile` |
| `view_recommendation` | `model_id`, `recommended_size`, `support_count` |
| `expand_review` | `model_id`, `similarity_bucket` (`high`/`mid`/`low`) |
| `review_start` / `review_submit` | `model_id`, `purchased_size` |
| `empty_state_shown` | `reason` (§11.2의 4가지 중 하나) |

`empty_state_shown`이 콜드스타트 진단의 핵심이다. 어떤 빈 화면이 얼마나 뜨는지가 곧 다음 가설의 근거가 된다.

### 15.3 구현

`@next/third-parties/google`의 `GoogleAnalytics` 컴포넌트를 루트 레이아웃에 두고, 측정 ID는 `NEXT_PUBLIC_GA_ID` 환경변수로 받는다. 이벤트 전송은 `lib/analytics/track.ts` 한 곳에서만 한다(§5 불변 규칙 3).

### 15.4 재가설 루프

배포 후 주 1회 KPI를 확인하고 `docs/experiments/YYYY-MM-DD-<n>차-검증.md`에 기록한다. 형식은 **관측 → 해석 → 다음 가설 → 바꿀 것** 네 항목. 평가 대상이 과정이므로 이 기록 자체가 제출물이다.

---

## 16. SEO와 검색 노출

정적 export에서 SEO의 관건은 **후기 본문이 빌드 산출물 HTML 안에 실제로 들어 있는가**다. 전부 클라이언트에서 그리면 크롤러에게는 빈 페이지로 보인다.

- **빌드 시점 프리렌더** — 모델 상세 페이지를 `generateStaticParams`로 만들고, 빌드 중에 `service_role` 없이 publishable key로 후기를 읽어 HTML에 박는다. 하이드레이션 후 브라우저가 최신 데이터로 덮는다. 이 구조라야 롱테일 검색어가 실제 본문에 존재한다.
- **메타데이터** — 페이지별 title/description/OG. 모델 상세는 `generateMetadata`(빌드 시점 실행).
- **사이트맵·로봇** — `app/sitemap.ts`, `app/robots.ts`. 정적 export에서도 파일로 출력된다. `basePath`를 포함한 절대 URL로 채운다.
- **구조화 데이터** — 모델 상세에 `Product` + `AggregateRating` JSON-LD.
- **구글 서치 콘솔** — GitHub Pages URL(`https://<계정>.github.io/team5/`)로 소유권 확인(메타 태그 방식) 후 사이트맵 제출.
- **타겟 검색어** — "501 사이즈", "517 사이즈 추천", "청바지 허벅지 꽉 낌" 같은 롱테일. 이 문구가 프리렌더된 본문에 자연스럽게 존재해야 한다.

정적 페이지라 새 후기는 재빌드 전까지 검색에 안 잡힌다. §9의 일일 스케줄 재빌드가 이를 메운다.

---

## 17. 디자인 시스템

**방향: 계측기 / 데이터 도구.** 이 서비스의 가치는 수치 비교이므로, 화면이 감성 카탈로그가 아니라 계측 결과표처럼 보여야 한다. 부수 효과로 흔한 AI 생성 UI 룩과 가장 멀어진다.

브랜드 가이드는 `docs/design/brand-guide.md`로 분리해 작성하고, 화면을 만들 때마다 함께 참조한다.

### 17.1 토큰

```
--ink          #14161A   본문·헤드라인
--ink-muted    #6B7280   보조 텍스트
--line         #E4E4E7   1px 구분선·눈금
--surface      #FFFFFF
--surface-alt  #F7F7F8   측정 패널 배경
--accent       #C8FF00   형광 라임 — 내 위치·추천 사이즈에만
--warn         #E8590C   꽉 낌 / 경고
```

액센트는 **화면당 1~2회만** 쓴다. 남발하는 순간 계측기가 아니라 광고 배너가 된다.

### 17.2 타이포그래피

- 본문·UI: **IBM Plex Sans KR** (`next/font/google`로 자체 호스팅). 시스템 폰트와 Inter는 쓰지 않는다 — 가장 흔한 AI 티다. Pretendard는 국내 프로젝트에 워낙 흔해 변별력이 낮아 쓰지 않는다.
- 수치: **IBM Plex Mono**, `font-variant-numeric: tabular-nums` 필수. 숫자 자릿수가 흔들리면 계측기로 안 보인다. 본문과 같은 패밀리라 리듬이 맞는다.
- 헤드라인: 본문과 같은 폰트, weight 700, `letter-spacing: -0.02em`.

### 17.3 형태 규칙

- 라운드는 **4px 고정.** `rounded-xl` 이상 금지.
- **그림자 없음.** 경계는 1px 라인으로만 만든다.
- 그라데이션 금지. UI 이모지 금지.

### 17.4 시그니처 컴포넌트 3개

| 컴포넌트 | 내용 |
|---|---|
| `<MeasureBar>` | 눈금자. 내 수치를 형광 마커로, 후기 작성자 분포를 점으로 얹는다. **이 서비스의 얼굴.** |
| `<FitScale>` | -2~+2 5단계 가로 스케일. 부위별 핏을 눈금 위 막대로 표현. |
| `<SimilarityBadge>` | 모노스페이스 숫자 + 얇은 링. 배경 채우기 없음. |

### 17.5 금지 목록

보라·파랑 그라데이션 / `shadow-lg` / `rounded-xl` 이상 / 중앙정렬 히어로 + 이모지 / `✨🚀` / "당신만을 위한", "완벽한 핏을 찾아보세요" 류 / 스톡 일러스트 / 3열 카드 그리드 반복.

### 17.6 문구 원칙

명사형과 단정으로 쓴다. **"허벅지가 꽉 낀다는 응답 8건"**(O) / "당신의 완벽한 핏을 찾아보세요!"(X). 문구는 `design:ux-copy` 스킬로 검수한다. AI 생성물의 최대 단서는 색이 아니라 문장이다.

### 17.7 상표 관련

서비스명에 "리바이스"를 넣지 않는다. 공식 서비스로 오인될 소지가 있다. 화면에서는 **"리바이스 501·517 핏 데이터"** 형태로 대상 제품만 지칭한다. 현재 서비스명은 가칭이며, 브랜드 가이드에서 단일 토큰으로 분리해 나중에 한 번에 교체할 수 있게 한다.

---

## 18. 다음 단계

이 문서를 근거로 `writing-plans` 스킬로 구현 계획을 작성한다. 계획에는 작업 순서, 작업별 테스트, 팀원 분배 가능한 단위가 포함되어야 한다.

과제 실행 파이프라인과의 대응:

| 과제 단계 | 이 문서 |
|---|---|
| 1. 문제 정의 | §1 (완료) |
| 2. MVP 제작 | §4~7, §10~12, §17 |
| 3. GitHub + 배포 | §9 (Vercel 대신 GitHub Pages) |
| 4. Supabase DB 연동 | §6 |
| 5. GA 데이터 측정 + KPI | §15 |
| 6. 서치 콘솔 검색 노출 | §16 |
| 7. 데이터 기반 재가설 | §15.4 |

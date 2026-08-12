# 코어 도메인 + 데이터 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 체형 유사도 계산·랭킹·사이즈 추천 도메인 로직과 시드 데이터가 든 Supabase DB를 완성한다. 완료 시 `npm test`가 전부 통과하고 DB에 200건 이상의 후기가 적재되어 있다.

**Architecture:** Next.js 단일 앱. `lib/fit-matching`은 DB와 React를 모르는 순수 TS 모듈이라 DB 없이 테스트한다. `lib/db`만 supabase-js를 import한다. 시드는 스크립트로 재현 가능하게 생성한다.

**Tech Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · Vitest · Zod · Supabase (Postgres + Auth)

**Spec:** [2026-08-12-levis-fit-service-design.md](../specs/2026-08-12-levis-fit-service-design.md)

**이 계획의 범위 밖 (후속 계획):**
- 계획 2 — 인증 · 화면(`/onboarding`, `/models/[id]`, `/reviews/new`) · Vercel 배포
- 계획 3 — GA4 계측 · SEO · 서치 콘솔 · 재가설 기록 루프

**사전 준비 (사람이 직접):**
- Node.js 20 이상
- Supabase 계정 + dev 프로젝트 1개 생성 (Docker 불필요 — 로컬 대신 클라우드 dev 프로젝트를 쓴다)

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `lib/sizing/types.ts` | 모델·사이즈표 타입 |
| `data/models.ts` | 501·517 공식 사이즈표 상수 |
| `lib/sizing/index.ts` | 모델 조회 함수 |
| `lib/fit-matching/types.ts` | 체형·후기·랭킹 타입 |
| `lib/fit-matching/config.ts` | tolerance·가중치 상수 |
| `lib/fit-matching/similarity.ts` | 유사도 점수, 프로필 충족도 |
| `lib/fit-matching/ranking.ts` | 후기 랭킹 |
| `lib/fit-matching/recommendation.ts` | 가중 투표 사이즈 추천, 이슈 집계 |
| `lib/validation/schemas.ts` | Zod 스키마 |
| `lib/db/client.ts` | Supabase 클라이언트 생성 |
| `lib/db/mappers.ts` | DB row → 도메인 객체 변환 |
| `lib/db/reviews.ts` | 후기 쿼리 |
| `lib/db/profile.ts` | 프로필 쿼리 |
| `supabase/migrations/*_init_schema.sql` | 테이블 |
| `supabase/migrations/*_rls_policies.sql` | RLS 정책 |
| `scripts/generate-synthetic.ts` | 합성 후기 생성 |
| `scripts/seed.ts` | 시드 적재 |
| `docs/design/brand-guide.md` | 브랜드 가이드 |

---

## Task 1: 프로젝트 셋업과 테스트 인프라

**Files:**
- Create: 프로젝트 전체 (create-next-app)
- Create: `vitest.config.ts`
- Create: `lib/smoke.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Next.js 앱 생성**

저장소 루트(`docs/`와 `.git`만 있는 상태)에서 실행한다.

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

`docs/`는 create-next-app이 건드리는 경로가 아니므로 충돌하지 않는다. 프롬프트가 뜨면 Turbopack은 Yes로 둔다.

- [ ] **Step 2: Next.js 메이저 버전 확인**

```bash
node -p "require('./package.json').dependencies.next"
```

**결과를 기록해둔다.** 계획 2에서 세션 갱신 파일 이름이 갈린다 — Next.js 16 이상이면 `proxy.ts`, 15면 `middleware.ts`다.

- [ ] **Step 3: 테스트 도구 설치**

```bash
npm install -D vitest vite-tsconfig-paths
```

- [ ] **Step 4: 실패하는 스모크 테스트 작성**

`lib/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('테스트 인프라', () => {
  it('경로 별칭 @/ 가 동작한다', async () => {
    const mod = await import('@/lib/smoke');
    expect(mod.ok()).toBe(true);
  });
});
```

- [ ] **Step 5: 테스트 실패 확인**

`package.json`의 `scripts`에 추가한다:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

`vitest.config.ts` 생성:

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
```

실행:

```bash
npm test
```

Expected: FAIL — `Cannot find module '@/lib/smoke'`

- [ ] **Step 6: 최소 구현**

`lib/smoke.ts`:

```ts
export function ok(): boolean {
  return true;
}
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
npm test
```

Expected: PASS (1 passed)

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "chore: Next.js 앱과 Vitest 테스트 인프라 셋업"
```

---

## Task 2: 디자인 토큰과 브랜드 가이드

스펙 §17의 "계측기 / 데이터 도구" 방향을 코드로 고정한다. 금지 목록은 문서로만 두면 지켜지지 않으므로 **테스트로 강제한다.**

**폰트 변경 사항:** 스펙 §17.2는 Pretendard였으나 **IBM Plex Sans KR + IBM Plex Mono**로 바꾼다. 이유 — 둘이 같은 패밀리라 본문과 수치의 리듬이 맞고, `next/font/google`로 자체 호스팅이 자동 처리되어 CDN 의존이 없어진다. Pretendard는 한국 프로젝트에 워낙 흔해 변별력도 낮다. 이 Task에서 스펙 §17.2도 함께 고친다.

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `lib/design/forbidden.test.ts`
- Create: `docs/design/brand-guide.md`
- Modify: `docs/superpowers/specs/2026-08-12-levis-fit-service-design.md`

- [ ] **Step 1: 금지 규칙 테스트를 먼저 작성**

`lib/design/forbidden.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCAN_DIRS = ['app', 'components'];

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: '큰 라운드 (계측기 톤을 해침)', pattern: /\brounded-(lg|xl|2xl|3xl)\b/ },
  { name: '그림자 (경계는 1px 라인으로만)', pattern: /\bshadow-(sm|md|lg|xl|2xl)\b/ },
  { name: '그라데이션', pattern: /\bbg-(gradient|linear|radial|conic)-to-/ },
  { name: 'UI 이모지', pattern: /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u },
];

function collectFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir, { recursive: true }) as string[];
  } catch {
    return [];
  }
  return entries
    .map((entry) => join(dir, entry))
    .filter((path) => ['.ts', '.tsx', '.css'].includes(extname(path)));
}

describe('브랜드 가이드 금지 목록', () => {
  const files = SCAN_DIRS.flatMap(collectFiles);

  for (const { name, pattern } of FORBIDDEN) {
    it(`어디에도 없다: ${name}`, () => {
      const offenders = files.filter((file) => pattern.test(readFileSync(file, 'utf8')));
      expect(offenders).toEqual([]);
    });
  }
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npm test -- forbidden
```

Expected: create-next-app 기본 템플릿에 걸리는 항목이 있으면 FAIL. 없으면 PASS. **어느 쪽이든 다음 스텝으로 간다** — 이 테스트는 앞으로의 회귀를 막는 것이 목적이다.

- [ ] **Step 3: 폰트와 토큰 설정**

`app/layout.tsx` 전체를 다음으로 교체한다:

```tsx
import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from 'next/font/google';
import './globals.css';

const sansKr = IBM_Plex_Sans_KR({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans-kr',
  display: 'swap',
  preload: false,
});

const mono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-mono-num',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '리바이스 501·517 핏 데이터',
  description: '나와 비슷한 체형인 사람들이 실제로 입어본 결과로 사이즈를 고릅니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${sansKr.variable} ${mono.variable}`}>
      <body className="bg-surface text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
```

`app/globals.css` 전체를 다음으로 교체한다:

```css
@import "tailwindcss";

@theme {
  --color-ink: #14161a;
  --color-ink-muted: #6b7280;
  --color-line: #e4e4e7;
  --color-surface: #ffffff;
  --color-surface-alt: #f7f7f8;
  --color-accent: #c8ff00;
  --color-warn: #e8590c;

  --font-sans: var(--font-sans-kr), sans-serif;
  --font-mono: var(--font-mono-num), monospace;

  --radius-sm: 4px;
}

/* 수치는 항상 자릿수가 고정되어야 계측기로 보인다 */
.tnum {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: 기본 페이지를 토큰만 쓰도록 정리**

`app/page.tsx` 전체를 다음으로 교체한다 (create-next-app 기본 페이지는 그라데이션과 큰 라운드를 쓴다):

```tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">리바이스 501·517 핏 데이터</h1>
      <p className="mt-3 text-ink-muted">
        나와 비슷한 체형인 사람들이 실제로 입어본 결과로 사이즈를 고릅니다.
      </p>
      <div className="mt-8 border-t border-line pt-4">
        <span className="font-mono tnum text-sm text-ink-muted">준비 중</span>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: 금지 규칙 테스트 통과 확인**

```bash
npm test -- forbidden
```

Expected: PASS (4 passed)

- [ ] **Step 6: 브라우저에서 한글 렌더 확인**

```bash
npm run dev
```

`http://localhost:3000`을 열고 개발자도구 > Elements에서 `<body>`의 computed `font-family`가 `IBM Plex Sans KR`로 나오는지 본다. 한글이 기본 고딕으로 보이면 `app/layout.tsx`의 `sansKr` 설정에서 `subsets: ['latin']`을 `subsets: ['korean']`으로 바꾸고 다시 확인한다.

- [ ] **Step 7: 브랜드 가이드 작성**

`docs/design/brand-guide.md`:

```markdown
# 브랜드 가이드 — 리바이스 501·517 핏 데이터 (가칭)

화면을 만들 때 이 문서를 항상 같이 참조한다.

## 방향

**계측기 / 데이터 도구.** 이 서비스의 가치는 수치 비교다. 화면은 감성 카탈로그가 아니라
계측 결과표처럼 보여야 한다.

## 토큰

코드상의 단일 출처는 `app/globals.css`의 `@theme` 블록이다. 색을 하드코딩하지 않는다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `ink` | `#14161A` | 본문·헤드라인 |
| `ink-muted` | `#6B7280` | 보조 텍스트 |
| `line` | `#E4E4E7` | 1px 구분선·눈금 |
| `surface` | `#FFFFFF` | 기본 배경 |
| `surface-alt` | `#F7F7F8` | 측정 패널 배경 |
| `accent` | `#C8FF00` | 내 위치·추천 사이즈 **전용** |
| `warn` | `#E8590C` | 꽉 낌·경고 |

`accent`는 **화면당 1~2회만** 쓴다. 남발하는 순간 계측기가 아니라 광고 배너가 된다.

## 타이포그래피

- 본문·UI: IBM Plex Sans KR (`font-sans`)
- 수치: IBM Plex Mono (`font-mono`) + `tnum` 클래스 필수
- 헤드라인: `font-bold tracking-tight`

수치에 `tnum`을 빼먹으면 자릿수가 흔들려 계측기로 안 보인다.

## 형태

- 라운드는 `rounded-sm`(4px)만. 점 모양이 필요하면 `rounded-full`.
- **그림자 없음.** 경계는 `border border-line`으로만.
- 그라데이션 없음. UI 이모지 없음.

이 규칙들은 `lib/design/forbidden.test.ts`가 CI에서 강제한다.

## 문구

명사형과 단정으로 쓴다. 감탄사와 2인칭 권유를 쓰지 않는다.

| 쓴다 | 쓰지 않는다 |
|---|---|
| 허벅지가 꽉 낀다는 응답 8건 | 당신의 완벽한 핏을 찾아보세요! |
| 32 추천 · 12명 지지 | AI가 딱 맞는 사이즈를 골라드려요 ✨ |
| 후기 4건 · 유사도 낮음 | 아직 데이터가 없어요 😢 |

## 서비스명

현재는 가칭이다. 화면에 노출되는 이름은 `lib/brand.ts`의 `SERVICE_NAME` 한 곳에서만
가져온다. 이름이 정해지면 그 상수만 바꾼다.

상표 문제로 서비스명에 "리바이스"를 넣지 않는다. 대상 제품은 "리바이스 501·517 핏 데이터"
형태로 지칭한다.
```

- [ ] **Step 8: 서비스명 상수 분리**

`lib/brand.ts`:

```ts
/** 가칭. 이름이 정해지면 이 상수만 바꾼다. */
export const SERVICE_NAME = '리바이스 501·517 핏 데이터';
```

- [ ] **Step 9: 스펙의 폰트 항목 수정**

`docs/superpowers/specs/2026-08-12-levis-fit-service-design.md`의 §17.2에서 Pretendard 관련 두 줄을 다음으로 교체한다:

```markdown
- 본문·UI: **IBM Plex Sans KR** (`next/font/google`로 자체 호스팅). 시스템 폰트와 Inter는 쓰지 않는다 — 가장 흔한 AI 티다.
- 수치: **IBM Plex Mono**, `font-variant-numeric: tabular-nums` 필수. 숫자 자릿수가 흔들리면 계측기로 안 보인다. 본문과 같은 패밀리라 리듬이 맞는다.
```

- [ ] **Step 10: 전체 테스트와 빌드 확인**

```bash
npm test
npm run typecheck
npm run build
```

Expected: 셋 다 성공

- [ ] **Step 11: 커밋**

```bash
git add -A
git commit -m "feat: 계측기 방향 디자인 토큰과 브랜드 가이드 추가

금지 목록(큰 라운드·그림자·그라데이션·이모지)을 테스트로 강제한다.
폰트는 IBM Plex Sans KR + Mono로 통일하고 스펙 17.2를 함께 수정."
```

---

## Task 3: `lib/sizing` — 모델과 공식 사이즈표

**Files:**
- Create: `lib/sizing/types.ts`
- Create: `data/models.ts`
- Create: `lib/sizing/index.ts`
- Create: `lib/sizing/index.test.ts`

- [ ] **Step 1: 타입 정의**

`lib/sizing/types.ts`:

```ts
export type SizeRow = {
  waistInch: number;
  waistCm: number;
  hipCm: number;
  thighCm: number;
  inseamCm: number;
};

export type SizeChart = {
  unit: 'cm';
  /** 공식 사이즈 표 출처 URL */
  source: string;
  /** 출처를 마지막으로 대조한 날짜 (YYYY-MM-DD) */
  checkedAt: string;
  sizes: SizeRow[];
};

export type ModelId = '501' | '517';

export type JeanModel = {
  id: ModelId;
  name: string;
  fitType: 'straight' | 'bootcut';
  description: string;
  sizeChart: SizeChart;
};
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/sizing/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MODEL_IDS, findSizeRow, getModel, listModels } from '@/lib/sizing';

describe('listModels', () => {
  it('501과 517 두 모델을 돌려준다', () => {
    expect(listModels().map((m) => m.id)).toEqual(['501', '517']);
  });
});

describe('getModel', () => {
  it('아이디로 모델을 찾는다', () => {
    expect(getModel('501').name).toBe('501 Original Fit');
  });

  it('없는 아이디면 던진다', () => {
    // @ts-expect-error 런타임 방어를 확인하려고 일부러 잘못된 값을 넣는다
    expect(() => getModel('999')).toThrow('알 수 없는 모델: 999');
  });
});

describe('사이즈표 불변식', () => {
  for (const id of MODEL_IDS) {
    it(`${id}의 사이즈표는 비어있지 않고 허리 인치 오름차순이다`, () => {
      const { sizes } = getModel(id).sizeChart;
      expect(sizes.length).toBeGreaterThan(0);
      const waists = sizes.map((s) => s.waistInch);
      expect(waists).toEqual([...waists].sort((a, b) => a - b));
    });

    it(`${id}의 사이즈표는 허리가 커질수록 허벅지도 커진다`, () => {
      const thighs = getModel(id).sizeChart.sizes.map((s) => s.thighCm);
      expect(thighs).toEqual([...thighs].sort((a, b) => a - b));
    });
  }
});

describe('findSizeRow', () => {
  it('정확히 일치하는 행을 찾는다', () => {
    expect(findSizeRow('501', 32)?.waistCm).toBe(81);
  });

  it('없는 사이즈면 undefined', () => {
    expect(findSizeRow('501', 99)).toBeUndefined();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npm test -- sizing
```

Expected: FAIL — `Cannot find module '@/lib/sizing'`

- [ ] **Step 4: 사이즈표 데이터 작성**

`data/models.ts`:

```ts
import type { JeanModel } from '@/lib/sizing/types';

const SOURCE = 'https://www.levi.com/US/en_US/size-guide/mens';
const CHECKED_AT = '2026-08-12';

export const MODELS: JeanModel[] = [
  {
    id: '501',
    name: '501 Original Fit',
    fitType: 'straight',
    description: '허리에서 밑단까지 직선으로 떨어지는 오리지널 스트레이트 핏.',
    sizeChart: {
      unit: 'cm',
      source: SOURCE,
      checkedAt: CHECKED_AT,
      sizes: [
        { waistInch: 28, waistCm: 71, hipCm: 89, thighCm: 55, inseamCm: 81 },
        { waistInch: 29, waistCm: 74, hipCm: 92, thighCm: 56, inseamCm: 81 },
        { waistInch: 30, waistCm: 76, hipCm: 94, thighCm: 57, inseamCm: 81 },
        { waistInch: 31, waistCm: 79, hipCm: 97, thighCm: 58, inseamCm: 81 },
        { waistInch: 32, waistCm: 81, hipCm: 99, thighCm: 59, inseamCm: 81 },
        { waistInch: 33, waistCm: 84, hipCm: 102, thighCm: 60, inseamCm: 81 },
        { waistInch: 34, waistCm: 86, hipCm: 104, thighCm: 61, inseamCm: 81 },
        { waistInch: 36, waistCm: 91, hipCm: 109, thighCm: 63, inseamCm: 81 },
        { waistInch: 38, waistCm: 96, hipCm: 114, thighCm: 65, inseamCm: 81 },
      ],
    },
  },
  {
    id: '517',
    name: '517 Bootcut',
    fitType: 'bootcut',
    description: '허벅지는 붙고 무릎 아래에서 벌어지는 부츠컷.',
    sizeChart: {
      unit: 'cm',
      source: SOURCE,
      checkedAt: CHECKED_AT,
      sizes: [
        { waistInch: 28, waistCm: 71, hipCm: 88, thighCm: 54, inseamCm: 84 },
        { waistInch: 29, waistCm: 74, hipCm: 91, thighCm: 55, inseamCm: 84 },
        { waistInch: 30, waistCm: 76, hipCm: 93, thighCm: 56, inseamCm: 84 },
        { waistInch: 31, waistCm: 79, hipCm: 96, thighCm: 57, inseamCm: 84 },
        { waistInch: 32, waistCm: 81, hipCm: 98, thighCm: 58, inseamCm: 84 },
        { waistInch: 33, waistCm: 84, hipCm: 101, thighCm: 59, inseamCm: 84 },
        { waistInch: 34, waistCm: 86, hipCm: 103, thighCm: 60, inseamCm: 84 },
        { waistInch: 36, waistCm: 91, hipCm: 108, thighCm: 62, inseamCm: 84 },
        { waistInch: 38, waistCm: 96, hipCm: 113, thighCm: 64, inseamCm: 84 },
      ],
    },
  },
];
```

- [ ] **Step 5: 조회 함수 구현**

`lib/sizing/index.ts`:

```ts
import { MODELS } from '@/data/models';
import type { JeanModel, ModelId, SizeRow } from './types';

export type { JeanModel, ModelId, SizeChart, SizeRow } from './types';

export const MODEL_IDS: ModelId[] = ['501', '517'];

export function listModels(): JeanModel[] {
  return MODELS;
}

export function getModel(id: ModelId): JeanModel {
  const model = MODELS.find((m) => m.id === id);
  if (!model) {
    throw new Error(`알 수 없는 모델: ${id}`);
  }
  return model;
}

export function findSizeRow(id: ModelId, waistInch: number): SizeRow | undefined {
  return getModel(id).sizeChart.sizes.find((s) => s.waistInch === waistInch);
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
npm test -- sizing
```

Expected: PASS (9 passed)

- [ ] **Step 7: 공식 사이즈 표 대조**

`data/models.ts`의 `SOURCE` URL을 브라우저로 열어 숫자를 대조한다. 다르면 `sizes` 배열을 실제 값으로 고치고, `CHECKED_AT`을 대조한 날짜로 바꾼다. 표에 인치만 있고 cm가 없으면 인치 × 2.54로 환산해 반올림한다.

수정했다면 `npm test -- sizing`을 다시 돌려 불변식 테스트(오름차순)가 여전히 통과하는지 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: 리바이스 501·517 모델과 공식 사이즈표 추가"
```

---

## Task 4: 유사도 계산

**Files:**
- Create: `lib/fit-matching/types.ts`
- Create: `lib/fit-matching/config.ts`
- Create: `lib/fit-matching/similarity.ts`
- Create: `lib/fit-matching/similarity.test.ts`

- [ ] **Step 1: 타입과 상수 정의**

`lib/fit-matching/types.ts`:

```ts
export type BodyMeasurements = {
  heightCm: number;
  weightKg: number;
  waistInch: number;
  thighCm?: number;
  hipCm?: number;
  inseamCm?: number;
};

export type MeasurementField = keyof BodyMeasurements;

export type SimilarityResult = {
  /** 0~100 */
  score: number;
  /** 양쪽 모두 값이 있어 계산에 쓰인 항목의 가중치 비율 (0~1) */
  confidence: number;
  usedFields: MeasurementField[];
};
```

`lib/fit-matching/config.ts`:

```ts
import type { MeasurementField } from './types';

/**
 * tolerance = "이만큼 차이나면 체감상 다른 체형"인 값.
 * weight 합은 1.00이다.
 *
 * 주의: 이 값들은 초기 추정치다. 실제 후기가 20건 이상 모이면
 * 스펙 §13에 따라 검증하고 조정한다.
 */
export const MEASUREMENT_CONFIG = {
  waistInch: { tolerance: 3, weight: 0.3 },
  thighCm: { tolerance: 6, weight: 0.25 },
  weightKg: { tolerance: 12, weight: 0.2 },
  hipCm: { tolerance: 8, weight: 0.1 },
  heightCm: { tolerance: 10, weight: 0.1 },
  inseamCm: { tolerance: 6, weight: 0.05 },
} as const satisfies Record<MeasurementField, { tolerance: number; weight: number }>;

export const MEASUREMENT_FIELDS = Object.keys(MEASUREMENT_CONFIG) as MeasurementField[];

export const TOTAL_WEIGHT = MEASUREMENT_FIELDS.reduce(
  (sum, field) => sum + MEASUREMENT_CONFIG[field].weight,
  0,
);
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/fit-matching/similarity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TOTAL_WEIGHT } from '@/lib/fit-matching/config';
import { profileConfidence, similarity } from '@/lib/fit-matching/similarity';
import type { BodyMeasurements } from '@/lib/fit-matching/types';

const BASE: BodyMeasurements = { heightCm: 175, weightKg: 70, waistInch: 32 };

describe('가중치 합', () => {
  it('1.00이다', () => {
    expect(TOTAL_WEIGHT).toBeCloseTo(1);
  });
});

describe('similarity', () => {
  it('완전히 같은 체형은 100점', () => {
    expect(similarity(BASE, BASE).score).toBe(100);
  });

  it('필수 3개만 있으면 confidence는 0.6', () => {
    expect(similarity(BASE, BASE).confidence).toBeCloseTo(0.6);
  });

  it('모든 항목이 tolerance 이상 벌어지면 0점이고 음수가 되지 않는다', () => {
    const far: BodyMeasurements = { heightCm: 225, weightKg: 130, waistInch: 44 };
    expect(similarity(BASE, far).score).toBe(0);
  });

  it('한 항목만 극단적으로 달라도 점수가 붕괴하지 않는다', () => {
    // waistInch만 tolerance를 크게 초과 → diff 1로 클램프
    // distance = sqrt(0.30 / 0.60) ≈ 0.7071 → 29점
    const oneOff: BodyMeasurements = { heightCm: 175, weightKg: 70, waistInch: 44 };
    expect(similarity(BASE, oneOff).score).toBe(29);
  });

  it('선택 항목은 양쪽 다 있을 때만 계산에 들어간다', () => {
    const onlyOneHasThigh: BodyMeasurements = { ...BASE, thighCm: 56 };
    const result = similarity(BASE, onlyOneHasThigh);
    expect(result.usedFields).not.toContain('thighCm');
    expect(result.confidence).toBeCloseTo(0.6);
  });

  it('양쪽에 허벅지가 있으면 confidence가 0.85로 오른다', () => {
    const a: BodyMeasurements = { ...BASE, thighCm: 56 };
    const b: BodyMeasurements = { ...BASE, thighCm: 58 };
    expect(similarity(a, b).confidence).toBeCloseTo(0.85);
  });

  it('대칭이다', () => {
    const a: BodyMeasurements = { heightCm: 170, weightKg: 65, waistInch: 30 };
    const b: BodyMeasurements = { heightCm: 180, weightKg: 78, waistInch: 33 };
    expect(similarity(a, b).score).toBe(similarity(b, a).score);
  });
});

describe('profileConfidence', () => {
  it('필수 3개만 채우면 0.6', () => {
    expect(profileConfidence(BASE)).toBeCloseTo(0.6);
  });

  it('여섯 항목을 다 채우면 1', () => {
    const full: BodyMeasurements = {
      ...BASE,
      thighCm: 56,
      hipCm: 95,
      inseamCm: 78,
    };
    expect(profileConfidence(full)).toBeCloseTo(1);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npm test -- similarity
```

Expected: FAIL — `Cannot find module '@/lib/fit-matching/similarity'`

- [ ] **Step 4: 구현**

`lib/fit-matching/similarity.ts`:

```ts
import { MEASUREMENT_CONFIG, MEASUREMENT_FIELDS, TOTAL_WEIGHT } from './config';
import type { BodyMeasurements, MeasurementField, SimilarityResult } from './types';

/**
 * 두 체형의 유사도를 0~100으로 계산한다.
 * 양쪽 모두 값이 있는 항목만 쓰므로 선택 항목이 비어도 공정하게 비교된다.
 */
export function similarity(a: BodyMeasurements, b: BodyMeasurements): SimilarityResult {
  let weightedSquares = 0;
  let usedWeight = 0;
  const usedFields: MeasurementField[] = [];

  for (const field of MEASUREMENT_FIELDS) {
    const av = a[field];
    const bv = b[field];
    if (av === undefined || bv === undefined) continue;

    const { tolerance, weight } = MEASUREMENT_CONFIG[field];
    // 1로 클램프해 한 항목의 극단값이 점수를 붕괴시키지 않게 한다
    const diff = Math.min(Math.abs(av - bv) / tolerance, 1);

    weightedSquares += weight * diff * diff;
    usedWeight += weight;
    usedFields.push(field);
  }

  if (usedWeight === 0) {
    return { score: 0, confidence: 0, usedFields: [] };
  }

  const distance = Math.sqrt(weightedSquares / usedWeight);

  return {
    score: Math.round((1 - distance) * 100),
    confidence: usedWeight / TOTAL_WEIGHT,
    usedFields,
  };
}

/** 내가 입력한 항목이 얼마나 충분한지 (0~1). 추천의 신뢰도가 아니라 입력 충족도다. */
export function profileConfidence(me: BodyMeasurements): number {
  const used = MEASUREMENT_FIELDS.reduce(
    (sum, field) => (me[field] === undefined ? sum : sum + MEASUREMENT_CONFIG[field].weight),
    0,
  );
  return used / TOTAL_WEIGHT;
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npm test -- similarity
```

Expected: PASS (11 passed)

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: 체형 유사도 계산 구현

정규화 가중 거리 기반. 결측 항목은 가중치 합으로 나눠 자연스럽게 처리된다."
```

---

## Task 5: 후기 랭킹

**Files:**
- Modify: `lib/fit-matching/types.ts`
- Create: `lib/fit-matching/ranking.ts`
- Create: `lib/fit-matching/ranking.test.ts`
- Create: `lib/fit-matching/__fixtures__/reviews.ts`

- [ ] **Step 1: 후기 타입 추가**

`lib/fit-matching/types.ts` 끝에 추가한다:

```ts
export type FitPart = 'waistFit' | 'thighFit' | 'hipFit' | 'lengthFit';

export type ReviewSnapshot = BodyMeasurements & { nickname: string };

export type FitReview = {
  id: string;
  modelId: string;
  purchasedSize: number;
  /** -2 아주 작음 ~ 0 딱 맞음 ~ +2 아주 큼 */
  waistFit: number;
  thighFit: number;
  hipFit: number;
  lengthFit: number;
  /** 1~5 만족도 */
  overall: number;
  comment: string;
  isSeed: boolean;
  /** ISO 8601 */
  createdAt: string;
  /** 작성 시점의 체형 사본 */
  snapshot: ReviewSnapshot;
};

export type RankedReview = FitReview & { similarity: SimilarityResult };
```

- [ ] **Step 2: 테스트 픽스처 작성**

`lib/fit-matching/__fixtures__/reviews.ts`:

```ts
import type { BodyMeasurements, FitReview } from '@/lib/fit-matching/types';

export const ME: BodyMeasurements = { heightCm: 175, weightKg: 70, waistInch: 32 };

let counter = 0;

/** 테스트용 후기 하나를 만든다. 지정하지 않은 값은 ME와 같은 체형에 딱 맞는 핏이다. */
export function makeReview(overrides: Partial<FitReview> = {}): FitReview {
  counter += 1;
  return {
    id: `review-${counter}`,
    modelId: '501',
    purchasedSize: 32,
    waistFit: 0,
    thighFit: 0,
    hipFit: 0,
    lengthFit: 0,
    overall: 5,
    comment: '',
    isSeed: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    snapshot: { nickname: '테스터', ...ME },
    ...overrides,
  };
}
```

- [ ] **Step 3: 실패하는 테스트 작성**

`lib/fit-matching/ranking.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ME, makeReview } from '@/lib/fit-matching/__fixtures__/reviews';
import { rankReviews } from '@/lib/fit-matching/ranking';

describe('rankReviews', () => {
  it('유사도가 높은 순으로 정렬한다', () => {
    const far = makeReview({
      id: 'far',
      snapshot: { nickname: 'far', heightCm: 190, weightKg: 95, waistInch: 38 },
    });
    const near = makeReview({
      id: 'near',
      snapshot: { nickname: 'near', heightCm: 176, weightKg: 71, waistInch: 32 },
    });

    const ranked = rankReviews(ME, [far, near]);

    expect(ranked.map((r) => r.id)).toEqual(['near', 'far']);
    expect(ranked[0].similarity.score).toBeGreaterThan(ranked[1].similarity.score);
  });

  it('유사도가 같으면 최신 후기가 앞에 온다', () => {
    const older = makeReview({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' });
    const newer = makeReview({ id: 'newer', createdAt: '2026-03-01T00:00:00.000Z' });

    expect(rankReviews(ME, [older, newer]).map((r) => r.id)).toEqual(['newer', 'older']);
  });

  it('빈 배열은 빈 배열을 돌려준다', () => {
    expect(rankReviews(ME, [])).toEqual([]);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const reviews = [makeReview({ id: 'a' }), makeReview({ id: 'b' })];
    const before = reviews.map((r) => r.id);

    rankReviews(ME, reviews);

    expect(reviews.map((r) => r.id)).toEqual(before);
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

```bash
npm test -- ranking
```

Expected: FAIL — `Cannot find module '@/lib/fit-matching/ranking'`

- [ ] **Step 5: 구현**

`lib/fit-matching/ranking.ts`:

```ts
import { similarity } from './similarity';
import type { BodyMeasurements, FitReview, RankedReview } from './types';

/** 내 체형과의 유사도를 붙여 높은 순으로 정렬한다. 동점이면 최신순. */
export function rankReviews(me: BodyMeasurements, reviews: FitReview[]): RankedReview[] {
  return reviews
    .map((review) => ({ ...review, similarity: similarity(me, review.snapshot) }))
    .sort((a, b) => {
      if (b.similarity.score !== a.similarity.score) {
        return b.similarity.score - a.similarity.score;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
npm test -- ranking
```

Expected: PASS (4 passed)

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 유사도 기반 후기 랭킹 구현"
```

---

## Task 6: 사이즈 추천 집계

**Files:**
- Create: `lib/fit-matching/recommendation.ts`
- Create: `lib/fit-matching/recommendation.test.ts`
- Create: `lib/fit-matching/index.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/fit-matching/recommendation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ME, makeReview } from '@/lib/fit-matching/__fixtures__/reviews';
import { rankReviews } from '@/lib/fit-matching/ranking';
import { recommendSize } from '@/lib/fit-matching/recommendation';
import type { FitReview } from '@/lib/fit-matching/types';

function recommend(reviews: FitReview[]) {
  return recommendSize(rankReviews(ME, reviews), ME);
}

describe('recommendSize', () => {
  it('표를 가장 많이 받은 사이즈를 추천한다', () => {
    const result = recommend([
      makeReview({ purchasedSize: 32 }),
      makeReview({ purchasedSize: 32 }),
      makeReview({ purchasedSize: 34 }),
    ]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.size).toBe(32);
    expect(result.supportCount).toBe(2);
    expect(result.totalCount).toBe(3);
  });

  it('유사도가 높은 후기가 더 큰 표를 가진다', () => {
    // 32는 유사도 58짜리 둘(합 0.58² × 2 ≈ 0.67),
    // 34는 나와 똑같은 사람 하나(1.00).
    // 유사도를 제곱하지 않으면 0.58 × 2 = 1.16으로 32가 이겨버린다.
    const result = recommend([
      makeReview({
        purchasedSize: 32,
        snapshot: { nickname: 'far1', heightCm: 180, weightKg: 76, waistInch: 33 },
      }),
      makeReview({
        purchasedSize: 32,
        snapshot: { nickname: 'far2', heightCm: 180, weightKg: 76, waistInch: 33 },
      }),
      makeReview({ purchasedSize: 34 }),
    ]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.size).toBe(34);
  });

  it('만족도 1~2점 후기는 표를 던지지 않는다', () => {
    const result = recommend([
      makeReview({ purchasedSize: 32, overall: 1 }),
      makeReview({ purchasedSize: 32, overall: 2 }),
      makeReview({ purchasedSize: 34, overall: 5 }),
    ]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.size).toBe(34);
  });

  it('유사도 40 미만만 있으면 후보가 없어 insufficient_data', () => {
    const result = recommend([
      makeReview({
        snapshot: { nickname: 'far', heightCm: 200, weightKg: 120, waistInch: 44 },
      }),
    ]);

    expect(result).toEqual({ status: 'insufficient_data', totalCount: 1 });
  });

  it('후기가 하나도 없으면 insufficient_data', () => {
    expect(recommend([])).toEqual({ status: 'insufficient_data', totalCount: 0 });
  });

  it('모두 불만족이면 insufficient_data', () => {
    const result = recommend([
      makeReview({ overall: 1 }),
      makeReview({ overall: 2 }),
    ]);

    expect(result.status).toBe('insufficient_data');
  });

  it('30% 이상이 같은 부위를 지적하면 이슈로 올린다', () => {
    const result = recommend([
      makeReview({ purchasedSize: 32, thighFit: -2 }),
      makeReview({ purchasedSize: 32, thighFit: -2 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
    ]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.topIssues).toEqual([
      { part: 'thighFit', direction: 'tight', count: 2, total: 3 },
    ]);
  });

  it('30% 미만이면 이슈로 올리지 않는다', () => {
    const result = recommend([
      makeReview({ purchasedSize: 32, thighFit: -2 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
      makeReview({ purchasedSize: 32, thighFit: 0 }),
    ]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.topIssues).toEqual([]);
  });

  it('profileConfidence는 내가 입력한 항목만으로 계산된다', () => {
    const result = recommend([makeReview({ purchasedSize: 32 })]);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    // ME는 필수 3개만 채웠다
    expect(result.profileConfidence).toBeCloseTo(0.6);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test -- recommendation
```

Expected: FAIL — `Cannot find module '@/lib/fit-matching/recommendation'`

- [ ] **Step 3: 구현**

`lib/fit-matching/recommendation.ts`:

```ts
import { profileConfidence } from './similarity';
import type { BodyMeasurements, FitPart, RankedReview } from './types';

/** 이 점수 미만은 참고 가치가 없다고 보고 추천 계산에서 뺀다 */
export const MIN_SIMILARITY = 40;
export const MAX_CANDIDATES = 30;
/** 이 비율 이상이 같은 부위를 지적하면 이슈로 노출한다 */
export const ISSUE_THRESHOLD = 0.3;

const FIT_PARTS: FitPart[] = ['waistFit', 'thighFit', 'hipFit', 'lengthFit'];

export type FitIssue = {
  part: FitPart;
  direction: 'tight' | 'loose';
  count: number;
  total: number;
};

export type SizeRecommendation =
  | {
      status: 'ok';
      size: number;
      /** 추천 사이즈에 실제로 표를 던진(만족한) 후기 수 */
      supportCount: number;
      /** 계산에 쓰인 후보 후기 수 */
      totalCount: number;
      /** 내 프로필 입력 충족도 (0~1). 추천 신뢰도가 아니다. */
      profileConfidence: number;
      topIssues: FitIssue[];
    }
  | { status: 'insufficient_data'; totalCount: number };

function satisfactionFactor(overall: number): number {
  if (overall >= 4) return 1;
  if (overall === 3) return 0.5;
  return 0;
}

function collectIssues(supporters: RankedReview[]): FitIssue[] {
  if (supporters.length === 0) return [];

  const issues: FitIssue[] = [];
  for (const part of FIT_PARTS) {
    for (const direction of ['tight', 'loose'] as const) {
      const count = supporters.filter((r) =>
        direction === 'tight' ? r[part] <= -2 : r[part] >= 2,
      ).length;

      if (count > 0 && count / supporters.length >= ISSUE_THRESHOLD) {
        issues.push({ part, direction, count, total: supporters.length });
      }
    }
  }
  return issues.sort((a, b) => b.count - a.count);
}

/**
 * 유사도를 표의 무게로 쓰는 가중 투표로 사이즈를 추천한다.
 * 유사도를 제곱해 가까운 사람의 의견에 쏠리게 하고, 불만족 후기는 표를 던지지 않는다.
 */
export function recommendSize(
  ranked: RankedReview[],
  me: BodyMeasurements,
): SizeRecommendation {
  const candidates = ranked
    .filter((r) => r.similarity.score >= MIN_SIMILARITY)
    .slice(0, MAX_CANDIDATES);

  const votes = new Map<number, { weight: number; count: number }>();
  for (const review of candidates) {
    const weight = (review.similarity.score / 100) ** 2 * satisfactionFactor(review.overall);
    if (weight <= 0) continue;

    const entry = votes.get(review.purchasedSize) ?? { weight: 0, count: 0 };
    entry.weight += weight;
    entry.count += 1;
    votes.set(review.purchasedSize, entry);
  }

  let best: { size: number; weight: number; count: number } | null = null;
  for (const [size, { weight, count }] of votes) {
    const beats =
      best === null ||
      weight > best.weight ||
      (weight === best.weight && count > best.count) ||
      (weight === best.weight && count === best.count && size < best.size);

    if (beats) best = { size, weight, count };
  }

  if (best === null) {
    return { status: 'insufficient_data', totalCount: ranked.length };
  }

  // const로 옮겨야 콜백 안에서 타입 좁힘이 유지된다
  const winner = best;
  const supporters = candidates.filter(
    (r) => r.purchasedSize === winner.size && satisfactionFactor(r.overall) > 0,
  );

  return {
    status: 'ok',
    size: winner.size,
    supportCount: supporters.length,
    totalCount: candidates.length,
    profileConfidence: profileConfidence(me),
    topIssues: collectIssues(supporters),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- recommendation
```

Expected: PASS (9 passed)

- [ ] **Step 5: 모듈 진입점 정리**

`lib/fit-matching/index.ts`:

```ts
export { MEASUREMENT_CONFIG, MEASUREMENT_FIELDS, TOTAL_WEIGHT } from './config';
export { profileConfidence, similarity } from './similarity';
export { rankReviews } from './ranking';
export {
  ISSUE_THRESHOLD,
  MAX_CANDIDATES,
  MIN_SIMILARITY,
  recommendSize,
} from './recommendation';
export type { FitIssue, SizeRecommendation } from './recommendation';
export type {
  BodyMeasurements,
  FitPart,
  FitReview,
  MeasurementField,
  RankedReview,
  ReviewSnapshot,
  SimilarityResult,
} from './types';
```

- [ ] **Step 6: 전체 테스트와 타입 확인**

```bash
npm test
npm run typecheck
```

Expected: 둘 다 성공

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 가중 투표 기반 사이즈 추천과 부위별 이슈 집계 구현"
```

---

## Task 7: 입력 검증 스키마

**Files:**
- Create: `lib/validation/schemas.ts`
- Create: `lib/validation/schemas.test.ts`

- [ ] **Step 1: Zod 설치**

```bash
npm install zod
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/validation/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bodyProfileSchema, fitReviewSchema } from '@/lib/validation/schemas';

const VALID_PROFILE = {
  nickname: '테스터',
  heightCm: '175',
  weightKg: '70',
  waistInch: '32',
  thighCm: '',
  hipCm: '',
  inseamCm: '',
};

describe('bodyProfileSchema', () => {
  it('문자열 입력을 숫자로 변환한다', () => {
    const parsed = bodyProfileSchema.parse(VALID_PROFILE);
    expect(parsed.heightCm).toBe(175);
    expect(parsed.waistInch).toBe(32);
  });

  it('빈 문자열 선택 항목은 undefined가 된다', () => {
    const parsed = bodyProfileSchema.parse(VALID_PROFILE);
    expect(parsed.thighCm).toBeUndefined();
    expect(parsed.hipCm).toBeUndefined();
    expect(parsed.inseamCm).toBeUndefined();
  });

  it('선택 항목에 값이 있으면 숫자로 들어간다', () => {
    const parsed = bodyProfileSchema.parse({ ...VALID_PROFILE, thighCm: '56' });
    expect(parsed.thighCm).toBe(56);
  });

  it('닉네임 앞뒤 공백을 제거한다', () => {
    const parsed = bodyProfileSchema.parse({ ...VALID_PROFILE, nickname: '  테스터  ' });
    expect(parsed.nickname).toBe('테스터');
  });

  it('닉네임이 1자면 거부한다', () => {
    const result = bodyProfileSchema.safeParse({ ...VALID_PROFILE, nickname: '가' });
    expect(result.success).toBe(false);
  });

  it('키가 범위를 벗어나면 거부한다', () => {
    expect(bodyProfileSchema.safeParse({ ...VALID_PROFILE, heightCm: '119' }).success).toBe(
      false,
    );
    expect(bodyProfileSchema.safeParse({ ...VALID_PROFILE, heightCm: '221' }).success).toBe(
      false,
    );
  });

  it('숫자가 아닌 값은 거부한다', () => {
    expect(bodyProfileSchema.safeParse({ ...VALID_PROFILE, weightKg: '몰라요' }).success).toBe(
      false,
    );
  });
});

const VALID_REVIEW = {
  modelId: '501',
  purchasedSize: '32',
  waistFit: '0',
  thighFit: '-2',
  hipFit: '0',
  lengthFit: '1',
  overall: '4',
  comment: '허리는 맞는데 허벅지가 낀다',
};

describe('fitReviewSchema', () => {
  it('유효한 후기를 통과시킨다', () => {
    const parsed = fitReviewSchema.parse(VALID_REVIEW);
    expect(parsed.thighFit).toBe(-2);
    expect(parsed.overall).toBe(4);
  });

  it('핏 값이 -2~2를 벗어나면 거부한다', () => {
    expect(fitReviewSchema.safeParse({ ...VALID_REVIEW, thighFit: '-3' }).success).toBe(false);
  });

  it('알 수 없는 모델은 거부한다', () => {
    expect(fitReviewSchema.safeParse({ ...VALID_REVIEW, modelId: '999' }).success).toBe(false);
  });

  it('한줄평이 없으면 빈 문자열이 된다', () => {
    const { comment, ...withoutComment } = VALID_REVIEW;
    expect(fitReviewSchema.parse(withoutComment).comment).toBe('');
  });

  it('한줄평이 300자를 넘으면 거부한다', () => {
    const result = fitReviewSchema.safeParse({ ...VALID_REVIEW, comment: 'ㄱ'.repeat(301) });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npm test -- schemas
```

Expected: FAIL — `Cannot find module '@/lib/validation/schemas'`

- [ ] **Step 4: 구현**

`lib/validation/schemas.ts`:

```ts
import { z } from 'zod';

/** 폼에서 오는 문자열을 숫자로 바꾸되, 빈 값은 undefined로 남긴다 */
function numberFromInput(min: number, max: number) {
  return z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    z.number().int().min(min).max(max),
  );
}

function optionalNumberFromInput(min: number, max: number) {
  return numberFromInput(min, max).optional();
}

export const bodyProfileSchema = z.object({
  nickname: z.string().trim().min(2, '2자 이상이어야 합니다').max(12, '12자 이하여야 합니다'),
  heightCm: numberFromInput(120, 220),
  weightKg: numberFromInput(30, 200),
  waistInch: numberFromInput(22, 46),
  thighCm: optionalNumberFromInput(30, 90),
  hipCm: optionalNumberFromInput(60, 140),
  inseamCm: optionalNumberFromInput(50, 110),
});

export type BodyProfileInput = z.infer<typeof bodyProfileSchema>;

const fitLevel = numberFromInput(-2, 2);

export const fitReviewSchema = z.object({
  modelId: z.enum(['501', '517']),
  purchasedSize: numberFromInput(22, 46),
  waistFit: fitLevel,
  thighFit: fitLevel,
  hipFit: fitLevel,
  lengthFit: fitLevel,
  overall: numberFromInput(1, 5),
  comment: z.string().trim().max(300, '300자 이하여야 합니다').default(''),
});

export type FitReviewInput = z.infer<typeof fitReviewSchema>;
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npm test -- schemas
```

Expected: PASS (12 passed)

`.optional()`이 `z.preprocess` 뒤에서 동작하지 않으면 `optionalNumberFromInput`을 다음으로 바꾼다:

```ts
function optionalNumberFromInput(min: number, max: number) {
  return z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    },
    z.number().int().min(min).max(max).optional(),
  );
}
```

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat: 프로필·후기 입력 Zod 스키마 추가

폼 문자열을 숫자로 변환하고 신체 치수 범위를 강제한다."
```

---

## Task 8: Supabase 스키마 마이그레이션

**Files:**
- Create: `supabase/migrations/20260812000001_init_schema.sql`
- Create: `.env.local`
- Modify: `.gitignore`

- [ ] **Step 1: Supabase dev 프로젝트 준비 (사람이 직접)**

1. https://supabase.com/dashboard 에서 새 프로젝트를 만든다. 이름은 `team5-fit-dev`.
2. Project Settings > API 에서 다음 세 값을 복사한다.
   - Project URL
   - `anon` / `publishable` key
   - `service_role` key (**절대 커밋하지 않는다**)

- [ ] **Step 2: 환경변수 파일 작성**

`.env.local` (Step 1에서 복사한 실제 값으로 채운다):

```
NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon 또는 publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

`.gitignore`에 이미 `.env*`가 있는지 확인한다. 없으면 추가한다:

```bash
node -p "require('fs').readFileSync('.gitignore','utf8').includes('.env')"
```

Expected: `true`. `false`면 `.gitignore` 끝에 `.env*.local` 한 줄을 추가한다.

- [ ] **Step 3: Supabase CLI 설치와 연결**

```bash
npm install -D supabase
npx supabase init
npx supabase link --project-ref <프로젝트ref>
```

`supabase init`이 `config.toml`을 만든다. `link`는 대시보드 비밀번호를 물어본다.

- [ ] **Step 4: 스키마 마이그레이션 작성**

`supabase/migrations/20260812000001_init_schema.sql`:

```sql
create table jean_models (
  id          text primary key,
  name        text not null,
  fit_type    text not null,
  description text not null default '',
  size_chart  jsonb not null,
  created_at  timestamptz not null default now()
);

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

create table fit_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid     references auth.users(id) on delete cascade,
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

- [ ] **Step 5: 마이그레이션 적용**

```bash
npx supabase db push
```

Expected: `Finished supabase db push.`

- [ ] **Step 6: 적용 확인**

```bash
npx supabase db diff --schema public
```

Expected: 출력이 비어 있다 (로컬 마이그레이션과 원격 스키마가 일치).

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: Supabase 스키마 마이그레이션 추가

시드 후기는 user_id가 null이며 CHECK 제약으로 is_seed와의 일관성을 강제한다."
```

---

## Task 9: RLS 정책과 정책 테스트

민감 정보를 다루므로 정책 자체를 테스트로 박아둔다.

**Files:**
- Create: `supabase/migrations/20260812000002_rls_policies.sql`
- Create: `lib/db/rls.test.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: RLS 마이그레이션 작성**

`supabase/migrations/20260812000002_rls_policies.sql`:

```sql
alter table jean_models   enable row level security;
alter table body_profiles enable row level security;
alter table fit_reviews   enable row level security;

-- 모델 정보는 누구나 읽는다. 쓰기 정책은 없으므로 시드(service role)만 넣을 수 있다.
create policy models_public_read on jean_models
  for select using (true);

-- 체형 프로필은 본인만 읽고 쓴다. 남의 프로필을 읽을 이유가 없다.
create policy profile_own_read on body_profiles
  for select using (auth.uid() = user_id);
create policy profile_own_insert on body_profiles
  for insert with check (auth.uid() = user_id);
create policy profile_own_update on body_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 후기는 누구나 읽고, 쓰기는 본인 행만. 시드 플래그는 사용자가 켤 수 없다.
create policy reviews_public_read on fit_reviews
  for select using (true);
create policy reviews_own_insert on fit_reviews
  for insert with check (auth.uid() = user_id and is_seed = false);
create policy reviews_own_update on fit_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reviews_own_delete on fit_reviews
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
npx supabase db push
```

Expected: `Finished supabase db push.`

- [ ] **Step 3: 테스트 설정에 환경변수 로딩 추가**

`vitest.config.ts`를 다음으로 교체한다:

```ts
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts'],
    env: loadEnv(mode, process.cwd(), ''),
    // RLS 테스트는 네트워크를 타므로 여유를 준다
    testTimeout: 30_000,
  },
}));
```

- [ ] **Step 4: 실패하는 RLS 테스트 작성**

`lib/db/rls.test.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type TestUser = { id: string; client: SupabaseClient };

async function createTestUser(label: string): Promise<TestUser> {
  const email = `rls-${label}-${Date.now()}@example.test`;
  const password = 'test-password-1234';

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;

  return { id: data.user.id, client };
}

describe('RLS 정책', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser('alice');
    bob = await createTestUser('bob');

    const { error } = await alice.client.from('body_profiles').insert({
      user_id: alice.id,
      nickname: '앨리스',
      height_cm: 175,
      weight_kg: 70,
      waist_inch: 32,
    });
    if (error) throw error;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(alice.id);
    await admin.auth.admin.deleteUser(bob.id);
  });

  it('본인 프로필은 읽을 수 있다', async () => {
    const { data } = await alice.client
      .from('body_profiles')
      .select('nickname')
      .eq('user_id', alice.id);

    expect(data).toEqual([{ nickname: '앨리스' }]);
  });

  it('남의 체형 프로필은 읽히지 않는다', async () => {
    const { data } = await bob.client
      .from('body_profiles')
      .select('nickname')
      .eq('user_id', alice.id);

    expect(data).toEqual([]);
  });

  it('남의 이름으로 프로필을 만들 수 없다', async () => {
    const { error } = await bob.client.from('body_profiles').insert({
      user_id: alice.id,
      nickname: '가짜',
      height_cm: 180,
      weight_kg: 80,
      waist_inch: 34,
    });

    expect(error).not.toBeNull();
  });

  it('is_seed를 켜서 후기를 넣을 수 없다', async () => {
    const { error } = await alice.client.from('fit_reviews').insert({
      user_id: alice.id,
      model_id: '501',
      purchased_size: 32,
      waist_fit: 0,
      thigh_fit: 0,
      hip_fit: 0,
      length_fit: 0,
      overall: 5,
      snapshot: { nickname: '앨리스', heightCm: 175, weightKg: 70, waistInch: 32 },
      is_seed: true,
    });

    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 5: supabase-js 설치 후 테스트 실패 확인**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm test -- rls
```

Expected: FAIL — `insert or update on table "fit_reviews" violates foreign key constraint` (아직 `jean_models`에 501이 없다)

- [ ] **Step 6: 모델 행을 먼저 넣는다**

`lib/db/rls.test.ts`의 `beforeAll` 안, 사용자 생성 다음 줄에 추가한다:

```ts
    const { MODELS } = await import('@/data/models');
    await admin.from('jean_models').upsert(
      MODELS.map((m) => ({
        id: m.id,
        name: m.name,
        fit_type: m.fitType,
        description: m.description,
        size_chart: m.sizeChart,
      })),
    );
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
npm test -- rls
```

Expected: PASS (4 passed)

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: RLS 정책과 정책 테스트 추가

프로필은 본인만 읽고, 시드 플래그는 사용자가 켤 수 없다는 것을 테스트로 고정."
```

---

## Task 10: `lib/db` — DB 접근 계층

`supabase-js`를 import하는 유일한 곳이다. row(snake_case)를 도메인 객체(camelCase)로 바꾸는 책임도 여기 있다.

**Files:**
- Create: `lib/db/client.ts`
- Create: `lib/db/mappers.ts`
- Create: `lib/db/mappers.test.ts`
- Create: `lib/db/reviews.ts`
- Create: `lib/db/profile.ts`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: 실패하는 매퍼 테스트 작성**

`lib/db/mappers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toFitReview, toProfileRow } from '@/lib/db/mappers';

const ROW = {
  id: 'abc',
  model_id: '501',
  purchased_size: 32,
  waist_fit: 0,
  thigh_fit: -2,
  hip_fit: 0,
  length_fit: 1,
  overall: 4,
  comment: '허벅지가 낀다',
  is_seed: false,
  created_at: '2026-03-01T00:00:00.000Z',
  snapshot: { nickname: '테스터', heightCm: 175, weightKg: 70, waistInch: 32 },
};

describe('toFitReview', () => {
  it('snake_case row를 camelCase 도메인 객체로 바꾼다', () => {
    expect(toFitReview(ROW)).toEqual({
      id: 'abc',
      modelId: '501',
      purchasedSize: 32,
      waistFit: 0,
      thighFit: -2,
      hipFit: 0,
      lengthFit: 1,
      overall: 4,
      comment: '허벅지가 낀다',
      isSeed: false,
      createdAt: '2026-03-01T00:00:00.000Z',
      snapshot: { nickname: '테스터', heightCm: 175, weightKg: 70, waistInch: 32 },
    });
  });
});

describe('toProfileRow', () => {
  it('선택 항목이 없으면 null로 넣는다', () => {
    const row = toProfileRow('user-1', {
      nickname: '테스터',
      heightCm: 175,
      weightKg: 70,
      waistInch: 32,
    });

    expect(row.thigh_cm).toBeNull();
    expect(row.hip_cm).toBeNull();
    expect(row.inseam_cm).toBeNull();
    expect(row.user_id).toBe('user-1');
  });

  it('선택 항목이 있으면 그대로 넣는다', () => {
    const row = toProfileRow('user-1', {
      nickname: '테스터',
      heightCm: 175,
      weightKg: 70,
      waistInch: 32,
      thighCm: 56,
    });

    expect(row.thigh_cm).toBe(56);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npm test -- mappers
```

Expected: FAIL — `Cannot find module '@/lib/db/mappers'`

- [ ] **Step 3: 매퍼 구현**

`lib/db/mappers.ts`:

```ts
import type { BodyMeasurements, FitReview, ReviewSnapshot } from '@/lib/fit-matching';

export type FitReviewRow = {
  id: string;
  model_id: string;
  purchased_size: number;
  waist_fit: number;
  thigh_fit: number;
  hip_fit: number;
  length_fit: number;
  overall: number;
  comment: string;
  is_seed: boolean;
  created_at: string;
  snapshot: ReviewSnapshot;
};

export type BodyProfileRow = {
  user_id: string;
  nickname: string;
  height_cm: number;
  weight_kg: number;
  waist_inch: number;
  thigh_cm: number | null;
  hip_cm: number | null;
  inseam_cm: number | null;
};

export type BodyProfile = BodyMeasurements & { nickname: string };

export function toFitReview(row: FitReviewRow): FitReview {
  return {
    id: row.id,
    modelId: row.model_id,
    purchasedSize: row.purchased_size,
    waistFit: row.waist_fit,
    thighFit: row.thigh_fit,
    hipFit: row.hip_fit,
    lengthFit: row.length_fit,
    overall: row.overall,
    comment: row.comment,
    isSeed: row.is_seed,
    createdAt: row.created_at,
    snapshot: row.snapshot,
  };
}

export function toBodyProfile(row: BodyProfileRow): BodyProfile {
  return {
    nickname: row.nickname,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    waistInch: row.waist_inch,
    thighCm: row.thigh_cm ?? undefined,
    hipCm: row.hip_cm ?? undefined,
    inseamCm: row.inseam_cm ?? undefined,
  };
}

export function toProfileRow(userId: string, profile: BodyProfile): BodyProfileRow {
  return {
    user_id: userId,
    nickname: profile.nickname,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    waist_inch: profile.waistInch,
    thigh_cm: profile.thighCm ?? null,
    hip_cm: profile.hipCm ?? null,
    inseam_cm: profile.inseamCm ?? null,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm test -- mappers
```

Expected: PASS (3 passed)

- [ ] **Step 5: 클라이언트와 쿼리 구현**

`lib/db/client.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** 서버 컴포넌트·서버 액션에서 쓰는 클라이언트. RLS가 적용된다. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우. 세션 갱신은 proxy/middleware가 담당한다.
          }
        },
      },
    },
  );
}
```

`lib/db/reviews.ts`:

```ts
import type { FitReview } from '@/lib/fit-matching';
import { createClient } from './client';
import { toFitReview, type FitReviewRow } from './mappers';

const REVIEW_COLUMNS =
  'id, model_id, purchased_size, waist_fit, thigh_fit, hip_fit, length_fit, overall, comment, is_seed, created_at, snapshot';

export async function getReviews(modelId: string): Promise<FitReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fit_reviews')
    .select(REVIEW_COLUMNS)
    .eq('model_id', modelId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as FitReviewRow[]).map(toFitReview);
}
```

`lib/db/profile.ts`:

```ts
import { createClient } from './client';
import { toBodyProfile, toProfileRow, type BodyProfile, type BodyProfileRow } from './mappers';

const PROFILE_COLUMNS =
  'user_id, nickname, height_cm, weight_kg, waist_inch, thigh_cm, hip_cm, inseam_cm';

export async function getMyProfile(): Promise<BodyProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('body_profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? toBodyProfile(data as BodyProfileRow) : null;
}

export async function upsertMyProfile(profile: BodyProfile): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const { error } = await supabase
    .from('body_profiles')
    .upsert({ ...toProfileRow(user.id, profile), updated_at: new Date().toISOString() });

  if (error) throw error;
}
```

- [ ] **Step 6: supabase-js 격리 규칙을 ESLint로 강제**

`eslint.config.mjs`의 export 배열 끝에 다음 객체를 추가한다:

```js
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    ignores: ['lib/db/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/supabase-js', '@supabase/ssr'],
              message: 'Supabase 접근은 lib/db 안에서만 합니다 (스펙 §5 불변 규칙 2).',
            },
          ],
        },
      ],
    },
  },
```

- [ ] **Step 7: 린트와 타입 확인**

```bash
npm run lint
npm run typecheck
```

Expected: 둘 다 통과. 위반이 나오면 해당 import를 `lib/db` 안으로 옮긴다.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: DB 접근 계층과 row 매퍼 추가

supabase-js import를 lib/db 밖에서 금지하는 ESLint 규칙을 함께 건다."
```

---

## Task 11: 합성 후기 생성기

핵심은 **핏 평가를 난수가 아니라 공식 사이즈표에서 규칙으로 유도**하는 것이다. 난수로 채우면 "나와 95% 유사한 사람"의 후기가 서로 모순돼 데모가 무너진다.

**Files:**
- Create: `scripts/random.ts`
- Create: `scripts/generate-synthetic.ts`
- Create: `scripts/generate-synthetic.test.ts`

- [ ] **Step 1: 고정 시드 난수 구현**

`scripts/random.ts`:

```ts
/** mulberry32. 같은 시드면 항상 같은 수열이 나온다. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 평균 mean, 표준편차 sd인 정규분포 표본 (Box-Muller) */
export function normal(random: () => number, mean: number, sd: number): number {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`scripts/generate-synthetic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MEASUREMENT_CONFIG } from '@/lib/fit-matching';
import { generateSyntheticReviews } from '@/scripts/generate-synthetic';

describe('generateSyntheticReviews', () => {
  it('같은 시드면 같은 결과가 나온다', () => {
    const a = generateSyntheticReviews({ count: 20, seed: 42 });
    const b = generateSyntheticReviews({ count: 20, seed: 42 });
    expect(a).toEqual(b);
  });

  it('다른 시드면 다른 결과가 나온다', () => {
    const a = generateSyntheticReviews({ count: 20, seed: 1 });
    const b = generateSyntheticReviews({ count: 20, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('요청한 개수만큼 만든다', () => {
    expect(generateSyntheticReviews({ count: 50, seed: 7 })).toHaveLength(50);
  });

  it('501과 517이 모두 들어간다', () => {
    const models = new Set(
      generateSyntheticReviews({ count: 100, seed: 7 }).map((r) => r.modelId),
    );
    expect(models).toEqual(new Set(['501', '517']));
  });

  it('모든 값이 DB CHECK 제약 범위 안이다', () => {
    for (const review of generateSyntheticReviews({ count: 200, seed: 7 })) {
      expect(review.purchasedSize).toBeGreaterThanOrEqual(22);
      expect(review.purchasedSize).toBeLessThanOrEqual(46);
      expect(review.overall).toBeGreaterThanOrEqual(1);
      expect(review.overall).toBeLessThanOrEqual(5);

      for (const part of ['waistFit', 'thighFit', 'hipFit', 'lengthFit'] as const) {
        expect(review[part]).toBeGreaterThanOrEqual(-2);
        expect(review[part]).toBeLessThanOrEqual(2);
      }

      expect(review.snapshot.heightCm).toBeGreaterThanOrEqual(120);
      expect(review.snapshot.heightCm).toBeLessThanOrEqual(220);
      expect(review.snapshot.waistInch).toBeGreaterThanOrEqual(22);
      expect(review.snapshot.waistInch).toBeLessThanOrEqual(46);
      expect(review.comment.length).toBeLessThanOrEqual(300);
    }
  });

  it('허벅지가 사이즈표 기준보다 굵으면 꽉 낀다고 답한다', () => {
    const reviews = generateSyntheticReviews({ count: 300, seed: 7 });
    const tight = reviews.filter((r) => r.thighFit <= -1);

    // 핏이 난수가 아니라 치수에서 유도되었는지 확인한다
    expect(tight.length).toBeGreaterThan(0);
    for (const review of tight) {
      expect(review.snapshot.thighCm).toBeDefined();
    }
  });

  it('선택 항목이 비어 있는 후기도 섞여 있다', () => {
    const reviews = generateSyntheticReviews({ count: 200, seed: 7 });
    expect(reviews.some((r) => r.snapshot.thighCm === undefined)).toBe(true);
    expect(reviews.some((r) => r.snapshot.thighCm !== undefined)).toBe(true);
  });

  it('설정된 모든 측정 항목이 최소 한 번은 채워진다', () => {
    const reviews = generateSyntheticReviews({ count: 200, seed: 7 });
    for (const field of Object.keys(MEASUREMENT_CONFIG)) {
      expect(
        reviews.some((r) => r.snapshot[field as keyof typeof r.snapshot] !== undefined),
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npm test -- generate-synthetic
```

Expected: FAIL — `Cannot find module '@/scripts/generate-synthetic'`

- [ ] **Step 4: 구현**

`scripts/generate-synthetic.ts`:

```ts
import type { FitReview, ReviewSnapshot } from '@/lib/fit-matching';
import { getModel, listModels, type ModelId, type SizeRow } from '@/lib/sizing';
import { clampInt, createRandom, normal, pick } from './random';

export type SyntheticReview = Omit<FitReview, 'id' | 'createdAt'> & {
  createdAt: string;
};

const NICKNAME_HEADS = ['조용한', '느긋한', '바쁜', '단단한', '무던한', '성실한', '꼼꼼한'];
const NICKNAME_TAILS = ['수달', '오리', '고래', '두더지', '너구리', '올빼미', '거북'];

const COMMENTS_BY_ISSUE: Record<string, string[]> = {
  thighTight: ['허리는 맞는데 허벅지가 꽉 낀다', '앉으면 허벅지가 불편하다'],
  waistLoose: ['허리가 남아서 벨트를 해야 한다', '허리가 조금 뜬다'],
  lengthLong: ['기장이 길어서 밑단을 줄였다', '한 번 접어 입는다'],
  none: ['그냥 무난하다', '평소 사이즈 그대로 맞다', '만족한다'],
};

/** 사이즈표 기준치 대비 얼마나 벌어졌는지를 -2~+2 핏 평가로 바꾼다 */
function toFitLevel(actual: number, reference: number, step: number): number {
  const gap = (actual - reference) / step;
  if (gap >= 1.5) return -2; // 내 치수가 기준보다 크다 = 옷이 작다 = 꽉 낀다
  if (gap >= 0.6) return -1;
  if (gap <= -1.5) return 2;
  if (gap <= -0.6) return 1;
  return 0;
}

function makeNickname(random: () => number): string {
  return `${pick(random, NICKNAME_HEADS)}${pick(random, NICKNAME_TAILS)}`;
}

function nearestSize(sizes: SizeRow[], waistInch: number): SizeRow {
  return sizes.reduce((best, row) =>
    Math.abs(row.waistInch - waistInch) < Math.abs(best.waistInch - waistInch) ? row : best,
  );
}

export function generateSyntheticReviews(options: {
  count: number;
  seed: number;
}): SyntheticReview[] {
  const random = createRandom(options.seed);
  const modelIds = listModels().map((m) => m.id);
  const reviews: SyntheticReview[] = [];

  for (let i = 0; i < options.count; i += 1) {
    // 한국 성인 남성 분포에 가깝게, 상관관계를 유지해 샘플링한다
    const heightCm = clampInt(normal(random, 173, 6), 150, 195);
    const weightKg = clampInt(normal(random, (heightCm - 100) * 0.95, 8), 45, 120);
    const waistInch = clampInt(26 + (weightKg - 60) * 0.22, 26, 40);

    // 선택 항목은 70% 확률로만 채운다 (실제 입력률을 흉내낸다)
    const thighCm = random() < 0.7 ? clampInt(normal(random, weightKg * 0.72, 3), 40, 75) : undefined;
    const hipCm = random() < 0.6 ? clampInt(normal(random, weightKg * 1.28, 5), 75, 125) : undefined;
    const inseamCm = random() < 0.5 ? clampInt(normal(random, heightCm * 0.45, 2), 60, 95) : undefined;

    const modelId = pick(random, modelIds) as ModelId;
    const model = getModel(modelId);

    // 실제 구매 사이즈는 자기 허리에서 한두 인치 흔들린다
    const purchasedSize = clampInt(waistInch + pick(random, [-1, 0, 0, 0, 1]), 22, 46);
    const reference = nearestSize(model.sizeChart.sizes, purchasedSize);

    // 핏은 난수가 아니라 사이즈표 기준치와의 차이에서 유도한다
    const waistFit = toFitLevel(waistInch * 2.54, reference.waistCm, 3);
    const thighFit =
      thighCm === undefined ? pick(random, [0, 0, -1]) : toFitLevel(thighCm, reference.thighCm, 2.5);
    const hipFit =
      hipCm === undefined ? pick(random, [0, 0, 1]) : toFitLevel(hipCm, reference.hipCm, 4);
    const lengthFit =
      inseamCm === undefined
        ? pick(random, [0, 1, 1])
        : toFitLevel(reference.inseamCm, inseamCm, 3);

    const issues = [waistFit, thighFit, hipFit, lengthFit].filter((v) => Math.abs(v) >= 2).length;
    // 노이즈: 같은 치수라도 사람마다 만족도가 갈린다
    const overall = clampInt(5 - issues - (random() < 0.2 ? 1 : 0), 1, 5);

    let commentKey = 'none';
    if (thighFit <= -2) commentKey = 'thighTight';
    else if (waistFit >= 2) commentKey = 'waistLoose';
    else if (lengthFit >= 2) commentKey = 'lengthLong';

    const snapshot: ReviewSnapshot = {
      nickname: makeNickname(random),
      heightCm,
      weightKg,
      waistInch,
      ...(thighCm !== undefined && { thighCm }),
      ...(hipCm !== undefined && { hipCm }),
      ...(inseamCm !== undefined && { inseamCm }),
    };

    reviews.push({
      modelId,
      purchasedSize,
      waistFit,
      thighFit,
      hipFit,
      lengthFit,
      overall,
      comment: pick(random, COMMENTS_BY_ISSUE[commentKey]),
      isSeed: true,
      createdAt: new Date(Date.UTC(2026, 0, 1 + (i % 180))).toISOString(),
      snapshot,
    });
  }

  return reviews;
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npm test -- generate-synthetic
```

Expected: PASS (8 passed)

실패하면 실패 메시지가 가리키는 범위를 보고 `clampInt`의 하한·상한을 조정한다. **테스트를 고치지 말고 생성기를 고친다.**

- [ ] **Step 6: `vitest.config.ts`의 include에 scripts가 있는지 확인**

Task 1에서 이미 `'scripts/**/*.test.ts'`를 넣었다. 테스트가 아예 수집되지 않으면 이 항목을 확인한다.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: 규칙 기반 합성 후기 생성기 추가

핏 평가를 난수가 아니라 공식 사이즈표 기준치와의 차이에서 유도한다.
고정 시드라 같은 입력이면 같은 데이터가 나온다."
```

---

## Task 12: 시드 적재 스크립트

**Files:**
- Create: `data/seed-reviews.csv`
- Create: `scripts/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: 실제 후기 CSV 틀 만들기**

`data/seed-reviews.csv` — 구글폼 응답을 이 헤더에 맞춰 붙여넣는다. 아래 3행은 형식 예시이며, 실제 응답을 받으면 교체한다. **개인 식별 정보는 넣지 않는다.**

```csv
nickname,heightCm,weightKg,waistInch,thighCm,hipCm,inseamCm,modelId,purchasedSize,waistFit,thighFit,hipFit,lengthFit,overall,comment
느긋한수달,178,74,32,58,97,80,501,32,0,-1,0,1,4,허리는 맞는데 허벅지가 살짝 낀다
조용한오리,168,58,29,50,88,,501,30,1,0,0,2,3,기장이 길어서 접어 입는다
단단한고래,182,88,36,64,,84,517,36,0,-2,0,0,3,허벅지가 꽉 낀다
```

- [ ] **Step 2: 적재 스크립트 작성**

`scripts/seed.ts`:

```ts
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { listModels } from '@/lib/sizing';
import { generateSyntheticReviews, type SyntheticReview } from './generate-synthetic';

const SYNTHETIC_COUNT = 250;
const SYNTHETIC_SEED = 20260812;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다');
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function optionalNumber(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value);
}

function readCsvReviews(path: string): SyntheticReview[] {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.log(`${path}가 없어 실제 후기는 건너뜁니다.`);
    return [];
  }

  const [header, ...lines] = raw.trim().split(/\r?\n/);
  const columns = header.split(',');

  return lines
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      const cells = line.split(',');
      const get = (name: string) => cells[columns.indexOf(name)] ?? '';

      return {
        modelId: get('modelId'),
        purchasedSize: Number(get('purchasedSize')),
        waistFit: Number(get('waistFit')),
        thighFit: Number(get('thighFit')),
        hipFit: Number(get('hipFit')),
        lengthFit: Number(get('lengthFit')),
        overall: Number(get('overall')),
        comment: get('comment').trim(),
        isSeed: true,
        createdAt: new Date(Date.UTC(2026, 5, 1 + index)).toISOString(),
        snapshot: {
          nickname: get('nickname'),
          heightCm: Number(get('heightCm')),
          weightKg: Number(get('weightKg')),
          waistInch: Number(get('waistInch')),
          ...(optionalNumber(get('thighCm')) !== undefined && {
            thighCm: Number(get('thighCm')),
          }),
          ...(optionalNumber(get('hipCm')) !== undefined && { hipCm: Number(get('hipCm')) }),
          ...(optionalNumber(get('inseamCm')) !== undefined && {
            inseamCm: Number(get('inseamCm')),
          }),
        },
      } satisfies SyntheticReview;
    });
}

function toRow(review: SyntheticReview) {
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

async function main() {
  const reset = process.argv.includes('--reset');

  // 1. 모델 (항상 최신 사이즈표로 덮어쓴다)
  const models = listModels().map((m) => ({
    id: m.id,
    name: m.name,
    fit_type: m.fitType,
    description: m.description,
    size_chart: m.sizeChart,
  }));
  const modelResult = await admin.from('jean_models').upsert(models);
  if (modelResult.error) throw modelResult.error;
  console.log(`모델 ${models.length}건 적재`);

  // 2. 기존 시드 정리 (실사용자 데이터는 건드리지 않는다)
  if (reset) {
    const { error } = await admin.from('fit_reviews').delete().eq('is_seed', true);
    if (error) throw error;
    console.log('기존 시드 후기 삭제');
  }

  // 3. 실제 수집분 + 합성분
  const csvReviews = readCsvReviews('data/seed-reviews.csv');
  const synthetic = generateSyntheticReviews({
    count: SYNTHETIC_COUNT,
    seed: SYNTHETIC_SEED,
  });
  const rows = [...csvReviews, ...synthetic].map(toRow);

  const { error } = await admin.from('fit_reviews').insert(rows);
  if (error) throw error;

  console.log(`후기 ${rows.length}건 적재 (실제 ${csvReviews.length} / 합성 ${synthetic.length})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 3: 실행 스크립트 등록**

```bash
npm install -D tsx dotenv-cli
```

`package.json`의 `scripts`에 추가한다:

```json
"seed": "dotenv -e .env.local -- tsx scripts/seed.ts",
"seed:reset": "dotenv -e .env.local -- tsx scripts/seed.ts --reset"
```

`tsx`가 `@/` 별칭을 읽으려면 `tsconfig.json`의 `compilerOptions.paths`에 `"@/*": ["./*"]`가 있어야 한다. create-next-app이 이미 넣어둔다.

- [ ] **Step 4: 시드 적재**

```bash
npm run seed:reset
```

Expected:
```
모델 2건 적재
기존 시드 후기 삭제
후기 253건 적재 (실제 3 / 합성 250)
```

- [ ] **Step 5: 멱등성 확인**

```bash
npm run seed:reset
```

Expected: 같은 출력. 두 번 돌려도 후기 수가 늘지 않아야 한다.

Supabase 대시보드 > Table Editor > `fit_reviews`에서 행 수가 253인지 확인한다.

- [ ] **Step 6: 추천 결과가 말이 되는지 확인**

`scripts/inspect.ts`를 만들어 실제 데이터로 추천을 돌려본다:

```ts
import { createClient } from '@supabase/supabase-js';
import { rankReviews, recommendSize, type BodyMeasurements } from '@/lib/fit-matching';
import { toFitReview, type FitReviewRow } from '@/lib/db/mappers';

const ME: BodyMeasurements = { heightCm: 175, weightKg: 70, waistInch: 32, thighCm: 56 };

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const { data, error } = await admin
  .from('fit_reviews')
  .select(
    'id, model_id, purchased_size, waist_fit, thigh_fit, hip_fit, length_fit, overall, comment, is_seed, created_at, snapshot',
  )
  .eq('model_id', '501');

if (error) throw error;

const reviews = (data as FitReviewRow[]).map(toFitReview);
const ranked = rankReviews(ME, reviews);

console.log(`501 후기 ${reviews.length}건`);
console.log('상위 5건:');
for (const review of ranked.slice(0, 5)) {
  console.log(
    `  유사도 ${review.similarity.score} · ${review.purchasedSize}인치 · 허벅지 ${review.thighFit} · ${review.comment}`,
  );
}
console.log('추천:', recommendSize(ranked, ME));
```

```bash
npx dotenv -e .env.local -- tsx scripts/inspect.ts
```

**결과를 눈으로 검증한다.** 상위 5건의 체형이 실제로 `ME`와 비슷한지, 추천 사이즈가 32 근처인지, 허벅지 이슈가 그럴듯하게 나오는지 본다. 이상하면 `scripts/generate-synthetic.ts`의 유도 규칙을 고치고 `npm run seed:reset`을 다시 돌린다.

- [ ] **Step 7: 전체 검증**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: 넷 다 성공

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat: 시드 적재 스크립트와 실제 후기 CSV 틀 추가

--reset은 is_seed=true 행만 지워 실사용자 데이터를 보존한다."
```

---

## 완료 기준

- [ ] `npm test` 전부 통과 (단위 + RLS)
- [ ] `npm run typecheck` 통과
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] Supabase `fit_reviews`에 250건 이상 적재
- [ ] `scripts/inspect.ts` 출력의 상위 유사 후기가 눈으로 봐도 납득 가능

## 다음 계획

계획 2 — 인증(Supabase OAuth), 시그니처 컴포넌트(`MeasureBar`·`FitScale`·`SimilarityBadge`), `/onboarding`·`/models/[id]`·`/reviews/new` 화면, Vercel 배포.

# 핵심 루프 UI 구현 계획 (계획 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 체형을 입력하고, 나와 비슷한 사람들의 후기를 유사도 순으로 보고, 후기를 남길 수 있는 화면을 만든다.

**Architecture:** 정적 export라 모델 페이지는 빌드 시점에 후기를 프리렌더하고(SEO), 하이드레이션 후 브라우저가 최신 데이터와 내 프로필로 덮는다. 쓰기 직전에만 익명 세션을 만들어 RLS를 그대로 쓴다.

**Tech Stack:** Next.js 16 (static export) · React 19 · Tailwind v4 · Supabase 익명 인증 · Vitest

**Spec:** [2026-08-12-levis-fit-service-design.md](../specs/2026-08-12-levis-fit-service-design.md)
**Brand:** [brand-guide.md](../../design/brand-guide.md) — 화면 작업마다 참조한다

**사전 조건:** Supabase 대시보드에서 `Allow anonymous sign-ins`가 켜져 있어야 한다. 꺼져 있으면 Task 1의 테스트가 실패한다.

**범위 밖 (계획 3):** 랜딩 페이지 완성 · `/me` · GA4 계측 · SEO/사이트맵 · E2E

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `lib/db/session.ts` | 익명 세션 확보 (쓰기 직전에만) |
| `lib/db/reviews.ts` | `insertReview` 추가 |
| `lib/db/profile.ts` | `upsertMyProfile`이 세션을 확보하도록 수정 |
| `lib/view/labels.ts` | 핏 수치 → 한글 라벨 (순수 함수) |
| `lib/view/track.ts` | 눈금자 위치 계산 (순수 함수) |
| `components/MeasureBar.tsx` | 눈금자 — 이 서비스의 얼굴 |
| `components/FitScale.tsx` | -2~+2 부위별 핏 스케일 |
| `components/SimilarityBadge.tsx` | 유사도 숫자 + 얇은 링 |
| `components/ProfileForm.tsx` | 체형 입력 폼 |
| `components/ModelDetail.tsx` | 모델 상세 클라이언트 로직 |
| `components/ReviewForm.tsx` | 후기 작성 폼 |
| `app/onboarding/page.tsx` | 체형 입력 |
| `app/models/page.tsx` | 모델 목록 |
| `app/models/[id]/page.tsx` | 모델 상세 (프리렌더) |
| `app/reviews/new/page.tsx` | 후기 작성 |

---

## Task 1: 익명 세션과 쓰기 경로

**Files:**
- Create: `lib/db/session.ts`
- Create: `lib/db/session.test.ts`
- Modify: `lib/db/profile.ts`
- Modify: `lib/db/reviews.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/db/session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getBrowserClient } from "@/lib/db/client";
import { ensureSession } from "@/lib/db/session";

const hasCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!hasCredentials)("ensureSession", () => {
  it("세션이 없으면 익명 세션을 만든다", async () => {
    const user = await ensureSession();
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.is_anonymous).toBe(true);
  });

  it("두 번 불러도 같은 사용자를 돌려준다", async () => {
    const first = await ensureSession();
    const second = await ensureSession();
    expect(second.id).toBe(first.id);
  });

  it("만든 세션으로 본인 프로필을 저장할 수 있다", async () => {
    const user = await ensureSession();
    const supabase = getBrowserClient();

    const { error } = await supabase.from("body_profiles").upsert({
      user_id: user.id,
      nickname: "익명테스터",
      height_cm: 175,
      weight_kg: 70,
      waist_inch: 32,
    });
    expect(error).toBeNull();

    // 정리
    await supabase.from("body_profiles").delete().eq("user_id", user.id);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx dotenv -e .env.local -- npx vitest run lib/db/session
```

Expected: FAIL — `Cannot find package '@/lib/db/session'`

- [ ] **Step 3: 구현**

`lib/db/session.ts`:

```ts
import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "./client";

/**
 * 익명 세션을 확보한다.
 *
 * **쓰기 직전에만 호출한다.** 페이지 로드마다 부르면 그냥 둘러본 사람에게까지
 * auth.users 행이 쌓여서, §15 H1(온보딩 완료율)의 분모가 오염된다.
 */
export async function ensureSession(): Promise<User> {
  const supabase = getBrowserClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    if (error.message.toLowerCase().includes("disabled")) {
      throw new Error(
        "익명 로그인이 꺼져 있습니다. Supabase 대시보드 > Authentication > Sign In / Providers 에서 " +
          "Allow anonymous sign-ins를 켜세요.",
      );
    }
    throw error;
  }

  if (!data.user) throw new Error("익명 세션을 만들지 못했습니다");
  return data.user;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx dotenv -e .env.local -- npx vitest run lib/db/session
```

Expected: PASS (3 passed)

실패 메시지에 `Allow anonymous sign-ins`가 보이면 대시보드 토글이 아직 꺼진 것이다. 켜고 다시 돌린다.

- [ ] **Step 5: 프로필 저장이 세션을 확보하도록 수정**

`lib/db/profile.ts`의 `upsertMyProfile`을 다음으로 교체한다:

```ts
export async function upsertMyProfile(profile: BodyProfile): Promise<void> {
  const supabase = getBrowserClient();
  const user = await ensureSession();

  const { error } = await supabase.from("body_profiles").upsert({
    ...toProfileRow(user.id, profile),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
```

같은 파일 위쪽 import에 추가한다:

```ts
import { ensureSession } from "./session";
```

그리고 화면에서 `BodyProfile` 타입을 쓸 수 있게 파일 맨 위에 재수출을 추가한다. 이게 없으면
`import { getMyProfile, type BodyProfile } from "@/lib/db/profile"`이 컴파일되지 않는다:

```ts
export type { BodyProfile } from "./mappers";
```

- [ ] **Step 6: 후기 작성 함수 추가**

`lib/db/reviews.ts` 끝에 추가한다:

```ts
import type { ReviewSnapshot } from "@/lib/fit-matching";
import type { FitReviewInput } from "@/lib/validation/schemas";
import { ensureSession } from "./session";

/**
 * 후기를 저장한다. 작성 시점의 체형을 snapshot으로 함께 박는다 (스펙 §6.3).
 * 서버가 없으므로 최종 검증은 DB의 CHECK 제약과 RLS가 한다.
 */
export async function insertReview(
  input: FitReviewInput,
  snapshot: ReviewSnapshot,
): Promise<void> {
  const supabase = getBrowserClient();
  const user = await ensureSession();

  const { error } = await supabase.from("fit_reviews").insert({
    user_id: user.id,
    model_id: input.modelId,
    purchased_size: input.purchasedSize,
    waist_fit: input.waistFit,
    thigh_fit: input.thighFit,
    hip_fit: input.hipFit,
    length_fit: input.lengthFit,
    overall: input.overall,
    comment: input.comment,
    snapshot,
    is_seed: false,
  });

  if (error) throw error;
}
```

- [ ] **Step 7: 전체 검증과 커밋**

```bash
npm test
npm run lint
npm run typecheck
```

Expected: 셋 다 통과 (session 테스트는 자격증명 없으면 skip)

```bash
git add -A
git commit -m "feat: 익명 세션과 후기 저장 경로 추가

세션은 쓰기 직전에만 만든다. 방문자마다 계정을 만들면 온보딩 완료율 분모가 오염된다."
```

---

## Task 2: 뷰 모델 순수 함수

컴포넌트에서 로직을 빼내 순수 함수로 만든다. jsdom 없이 테스트되고, 컴포넌트는 얇아진다.

**Files:**
- Create: `lib/view/labels.ts`
- Create: `lib/view/labels.test.ts`
- Create: `lib/view/track.ts`
- Create: `lib/view/track.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/view/labels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fitLabel, issueLabel, partLabel } from "@/lib/view/labels";

describe("fitLabel", () => {
  it("-2부터 +2까지 한글 라벨을 돌려준다", () => {
    expect([-2, -1, 0, 1, 2].map(fitLabel)).toEqual([
      "많이 낌",
      "살짝 낌",
      "딱 맞음",
      "살짝 큼",
      "많이 큼",
    ]);
  });

  it("범위 밖은 대시", () => {
    expect(fitLabel(9)).toBe("—");
  });
});

describe("partLabel", () => {
  it("부위 키를 한글로 바꾼다", () => {
    expect(partLabel("thighFit")).toBe("허벅지");
    expect(partLabel("lengthFit")).toBe("기장");
  });
});

describe("issueLabel", () => {
  it("꽉 낀 이슈를 문장으로 만든다", () => {
    expect(issueLabel({ part: "thighFit", direction: "tight", count: 8, total: 12 })).toBe(
      "허벅지 많이 낌 8/12",
    );
  });

  it("남는 이슈를 문장으로 만든다", () => {
    expect(issueLabel({ part: "lengthFit", direction: "loose", count: 4, total: 10 })).toBe(
      "기장 많이 큼 4/10",
    );
  });
});
```

`lib/view/track.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeTrack, trackPosition } from "@/lib/view/track";

describe("makeTrack", () => {
  it("값 분포에 여유를 붙인 범위를 만든다", () => {
    expect(makeTrack([50, 60], 2)).toEqual({ min: 48, max: 62 });
  });

  it("값이 하나뿐이면 폭이 0이 되지 않는다", () => {
    const track = makeTrack([55], 2);
    expect(track.max).toBeGreaterThan(track.min);
  });

  it("빈 배열이면 기본 범위를 준다", () => {
    const track = makeTrack([], 2);
    expect(track.max).toBeGreaterThan(track.min);
  });
});

describe("trackPosition", () => {
  const track = { min: 0, max: 100 };

  it("중앙값은 0.5", () => {
    expect(trackPosition(50, track)).toBeCloseTo(0.5);
  });

  it("범위를 벗어나면 끝에 붙인다", () => {
    expect(trackPosition(-20, track)).toBe(0);
    expect(trackPosition(150, track)).toBe(1);
  });

  it("폭이 0인 트랙에서도 NaN이 되지 않는다", () => {
    expect(trackPosition(5, { min: 5, max: 5 })).toBe(0);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run lib/view
```

Expected: FAIL — 두 모듈 모두 찾을 수 없음

- [ ] **Step 3: 구현**

`lib/view/labels.ts`:

```ts
import type { FitIssue, FitPart } from "@/lib/fit-matching";

const FIT_LABELS = ["많이 낌", "살짝 낌", "딱 맞음", "살짝 큼", "많이 큼"];

const PART_LABELS: Record<FitPart, string> = {
  waistFit: "허리",
  thighFit: "허벅지",
  hipFit: "엉덩이",
  lengthFit: "기장",
};

export function fitLabel(level: number): string {
  return FIT_LABELS[level + 2] ?? "—";
}

export function partLabel(part: FitPart): string {
  return PART_LABELS[part];
}

/** 브랜드 가이드: 명사형과 단정. 감탄사와 2인칭 권유를 쓰지 않는다. */
export function issueLabel(issue: FitIssue): string {
  const level = issue.direction === "tight" ? -2 : 2;
  return `${partLabel(issue.part)} ${fitLabel(level)} ${issue.count}/${issue.total}`;
}
```

`lib/view/track.ts`:

```ts
export type Track = { min: number; max: number };

const FALLBACK: Track = { min: 0, max: 1 };

/** 값 분포 양쪽에 여유를 붙인 눈금자 범위를 만든다 */
export function makeTrack(values: number[], padding = 2): Track {
  if (values.length === 0) return FALLBACK;

  const min = Math.min(...values) - padding;
  const max = Math.max(...values) + padding;

  return max > min ? { min, max } : { min, max: min + 1 };
}

/** 값을 트랙 위 0~1 위치로 바꾼다. 범위를 벗어나면 끝에 붙인다. */
export function trackPosition(value: number, track: Track): number {
  const width = track.max - track.min;
  if (width <= 0) return 0;
  return Math.min(Math.max((value - track.min) / width, 0), 1);
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run lib/view
```

Expected: PASS (9 passed)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 뷰 모델 순수 함수 추가 (핏 라벨, 눈금자 위치)"
```

---

## Task 3: 시그니처 컴포넌트 3개

브랜드 가이드의 계측기 톤을 실제 픽셀로 옮기는 태스크다. 금지 목록 테스트가 CI에서 이 파일들을 스캔한다.

**Files:**
- Create: `components/SimilarityBadge.tsx`
- Create: `components/FitScale.tsx`
- Create: `components/MeasureBar.tsx`

- [ ] **Step 1: SimilarityBadge**

`components/SimilarityBadge.tsx`:

```tsx
const SIZE = 44;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SimilarityBadge({ score }: { score: number }) {
  const filled = (Math.min(Math.max(score, 0), 100) / 100) * CIRCUMFERENCE;

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      aria-label={`유사도 ${score}`}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-line"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          className="stroke-ink"
        />
      </svg>
      <span className="tnum absolute inset-0 flex items-center justify-center font-mono text-sm font-medium">
        {score}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: FitScale**

`components/FitScale.tsx`:

```tsx
import { fitLabel, partLabel } from "@/lib/view/labels";
import type { FitPart } from "@/lib/fit-matching";

const LEVELS = [-2, -1, 0, 1, 2];

export function FitScale({ part, level }: { part: FitPart; level: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-ink-muted w-12 shrink-0 text-sm">
        {partLabel(part)}
      </span>

      <div className="flex gap-px" role="img" aria-label={`${partLabel(part)} ${fitLabel(level)}`}>
        {LEVELS.map((value) => {
          const active = value === level;
          const extreme = active && Math.abs(value) === 2;
          return (
            <span
              key={value}
              className={`h-4 w-6 rounded-sm border ${
                extreme
                  ? "bg-warn border-warn"
                  : active
                    ? "bg-ink border-ink"
                    : "border-line bg-surface-alt"
              }`}
            />
          );
        })}
      </div>

      <span className="text-ink-muted text-sm">{fitLabel(level)}</span>
    </div>
  );
}
```

- [ ] **Step 3: MeasureBar**

`components/MeasureBar.tsx`:

```tsx
import { makeTrack, trackPosition } from "@/lib/view/track";

type Props = {
  label: string;
  unit: string;
  /** 후기 작성자들의 값 분포 */
  others: number[];
  /** 내 값. 없으면 마커를 그리지 않는다 */
  mine?: number;
};

/**
 * 눈금자. 후기 작성자 분포를 점으로, 내 위치를 형광 마커로 얹는다.
 * 이 서비스의 얼굴이므로 accent 색은 여기서만 쓴다.
 */
export function MeasureBar({ label, unit, others, mine }: Props) {
  const values = mine === undefined ? others : [...others, mine];
  const track = makeTrack(values);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-ink-muted text-sm">{label}</span>
        {mine !== undefined && (
          <span className="tnum font-mono text-sm">
            {mine}
            {unit}
          </span>
        )}
      </div>

      <div className="border-line bg-surface-alt relative h-8 border">
        {others.map((value, index) => (
          <span
            key={index}
            className="bg-ink-muted absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full opacity-40"
            style={{ left: `${trackPosition(value, track) * 100}%` }}
          />
        ))}

        {mine !== undefined && (
          <span
            className="bg-accent border-ink absolute top-0 h-full w-1 border-x"
            style={{ left: `${trackPosition(mine, track) * 100}%` }}
          />
        )}
      </div>

      <div className="text-ink-muted tnum mt-1 flex justify-between font-mono text-xs">
        <span>{Math.round(track.min)}</span>
        <span>{Math.round(track.max)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 금지 목록 통과 확인**

```bash
npx vitest run lib/design
```

Expected: PASS (4 passed) — `rounded-sm`/`rounded-full`만 썼고 그림자·그라데이션·이모지가 없다

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 시그니처 컴포넌트 3개 추가 (MeasureBar, FitScale, SimilarityBadge)"
```

---

## Task 4: 체형 입력 화면

**Files:**
- Create: `components/ProfileForm.tsx`
- Create: `app/onboarding/page.tsx`

- [ ] **Step 1: 폼 컴포넌트**

`components/ProfileForm.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertMyProfile } from "@/lib/db/profile";
import { profileConfidence } from "@/lib/fit-matching";
import { bodyProfileSchema } from "@/lib/validation/schemas";

const REQUIRED = [
  { name: "nickname", label: "닉네임", unit: "", type: "text" },
  { name: "heightCm", label: "키", unit: "cm", type: "number" },
  { name: "weightKg", label: "몸무게", unit: "kg", type: "number" },
  { name: "waistInch", label: "평소 입는 청바지 허리", unit: "인치", type: "number" },
] as const;

const OPTIONAL = [
  { name: "thighCm", label: "허벅지 둘레", unit: "cm" },
  { name: "hipCm", label: "엉덩이 둘레", unit: "cm" },
  { name: "inseamCm", label: "인심(다리 안쪽 길이)", unit: "cm" },
] as const;

export function ProfileForm({ next }: { next: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const parsed = bodyProfileSchema.safeParse(values);
  const confidence = parsed.success ? profileConfidence(parsed.data) : 0.6;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);

    const result = bodyProfileSchema.safeParse(values);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await upsertMyProfile(result.data);
      router.push(next);
    } catch (error) {
      // 입력값은 그대로 둔다. 여섯 개를 다시 치게 만들면 그 사용자는 돌아오지 않는다.
      setFailure(error instanceof Error ? error.message : "저장에 실패했습니다");
      setSaving(false);
    }
  }

  function field(name: string, label: string, unit: string, type = "number") {
    return (
      <label key={name} className="block">
        <span className="text-ink-muted text-sm">
          {label}
          {unit && <span className="text-ink-muted"> ({unit})</span>}
        </span>
        <input
          type={type}
          inputMode={type === "number" ? "numeric" : undefined}
          value={values[name] ?? ""}
          onChange={(e) => setValues({ ...values, [name]: e.target.value })}
          className="border-line focus:border-ink mt-1 w-full rounded-sm border px-3 py-2 font-mono tabular-nums outline-none"
        />
        {errors[name] && (
          <span className="text-warn mt-1 block text-sm">{errors[name]}</span>
        )}
      </label>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold">필수</h2>
        {REQUIRED.map((f) => field(f.name, f.label, f.unit, f.type))}
        <p className="text-ink-muted text-sm">
          줄자 대신 평소 입는 청바지 사이즈를 적습니다.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">선택</h2>
        {OPTIONAL.map((f) => field(f.name, f.label, f.unit))}
        <p className="text-ink-muted text-sm">
          현재 정확도{" "}
          <span className="tnum font-mono">{Math.round(confidence * 100)}%</span>
          {confidence < 1 && " · 허벅지 둘레를 넣으면 85%로 올라갑니다"}
        </p>
      </section>

      {failure && (
        <p className="border-warn text-warn rounded-sm border p-3 text-sm">
          {failure}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-ink text-surface w-full rounded-sm py-3 font-medium disabled:opacity-50"
      >
        {saving ? "저장 중" : "저장하고 사이즈 보기"}
      </button>

      <p className="text-ink-muted text-xs">
        로그인 없이 저장됩니다. 이 브라우저에만 남으므로 기기를 바꾸면 다시 입력해야 합니다.
      </p>
    </form>
  );
}
```

- [ ] **Step 2: 페이지**

`app/onboarding/page.tsx`:

```tsx
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = {
  title: "체형 입력",
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">체형 입력</h1>
      <p className="text-ink-muted mt-2 mb-8">
        입력한 수치로 나와 비슷한 체형인 사람들의 후기를 찾습니다.
      </p>
      <ProfileForm next="/models" />
    </main>
  );
}
```

- [ ] **Step 3: 빌드와 금지 목록 확인**

```bash
npm run build
npx vitest run lib/design
```

Expected: 빌드 성공, 금지 목록 4개 통과

- [ ] **Step 4: 브라우저에서 확인**

```bash
npm run dev
```

`http://localhost:3000/onboarding` 에서 필수 4개를 넣고 저장한다.

확인할 것:
- 저장 후 `/models`로 이동한다
- 정확도 표시가 60%에서 시작해 허벅지를 넣으면 85%가 된다
- 키에 999를 넣으면 그 필드 아래에 오류가 뜨고 다른 입력값은 남아 있다

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 체형 입력 화면 추가

정확도 배지로 선택 항목 입력을 유도한다. 저장 실패 시 입력값을 보존한다."
```

---

## Task 5: 모델 목록

**Files:**
- Create: `app/models/page.tsx`

- [ ] **Step 1: 페이지**

`app/models/page.tsx`:

```tsx
import Link from "next/link";
import { listModels } from "@/lib/sizing";

export const metadata = {
  title: "모델 고르기",
};

export default function ModelsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">모델 고르기</h1>

      <ul className="mt-8 divide-y divide-line border-line border-y">
        {listModels().map((model) => (
          <li key={model.id}>
            <Link
              href={`/models/${model.id}`}
              className="hover:bg-surface-alt flex items-baseline gap-4 py-5"
            >
              <span className="tnum font-mono text-xl font-semibold">
                {model.id}
              </span>
              <span className="flex-1">
                <span className="block font-medium">{model.name}</span>
                <span className="text-ink-muted block text-sm">
                  {model.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: `/models`가 정적 페이지로 생성된다

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "feat: 모델 목록 화면 추가"
```

---

## Task 6: 모델 상세 — 핵심 화면

빌드 시점에 후기를 HTML로 굽고(SEO), 하이드레이션 후 브라우저가 최신 데이터와 내 프로필로 덮는다.

**Files:**
- Create: `components/ModelDetail.tsx`
- Create: `app/models/[id]/page.tsx`

- [ ] **Step 1: 클라이언트 컴포넌트**

`components/ModelDetail.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FitScale } from "@/components/FitScale";
import { MeasureBar } from "@/components/MeasureBar";
import { SimilarityBadge } from "@/components/SimilarityBadge";
import { getMyProfile, type BodyProfile } from "@/lib/db/profile";
import { getReviews } from "@/lib/db/reviews";
import {
  rankReviews,
  recommendSize,
  type FitReview,
  type RankedReview,
} from "@/lib/fit-matching";
import { issueLabel } from "@/lib/view/labels";

const FIT_PARTS = ["waistFit", "thighFit", "hipFit", "lengthFit"] as const;

export function ModelDetail({
  modelId,
  initialReviews,
}: {
  modelId: string;
  initialReviews: FitReview[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [fresh, mine] = await Promise.all([
        getReviews(modelId).catch(() => initialReviews),
        getMyProfile().catch(() => null),
      ]);
      if (!alive) return;
      setReviews(fresh);
      setProfile(mine);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [modelId, initialReviews]);

  const ranked: RankedReview[] = profile
    ? rankReviews(profile, reviews)
    : reviews.map((r) => ({
        ...r,
        similarity: { score: 0, confidence: 0, usedFields: [] },
      }));

  const recommendation = profile ? recommendSize(ranked, profile) : null;

  return (
    <div className="space-y-10">
      {/* 추천 사이즈 */}
      {profile === null ? (
        <section className="border-line rounded-sm border p-5">
          <p className="font-medium">체형을 입력하면 나와 비슷한 사람 순으로 정렬됩니다.</p>
          <p className="text-ink-muted mt-1 text-sm">
            지금은 최신순으로 보고 있습니다. 로그인은 필요 없습니다.
          </p>
          <Link
            href="/onboarding"
            className="bg-ink text-surface mt-4 inline-block rounded-sm px-4 py-2 text-sm font-medium"
          >
            체형 입력
          </Link>
        </section>
      ) : recommendation?.status === "ok" ? (
        <section className="border-ink rounded-sm border p-5">
          <div className="flex items-baseline gap-3">
            <span className="tnum bg-accent rounded-sm px-2 font-mono text-3xl font-bold">
              {recommendation.size}
            </span>
            <span className="text-ink-muted text-sm">
              인치 · 비슷한 체형 {recommendation.supportCount}/
              {recommendation.totalCount}명이 만족
            </span>
          </div>
          {recommendation.topIssues.length > 0 && (
            <ul className="text-warn mt-3 space-y-1 text-sm">
              {recommendation.topIssues.map((issue) => (
                <li key={`${issue.part}-${issue.direction}`}>
                  {issueLabel(issue)}
                </li>
              ))}
            </ul>
          )}
          <p className="text-ink-muted tnum mt-3 font-mono text-xs">
            내 입력 정확도 {Math.round(recommendation.profileConfidence * 100)}%
          </p>
        </section>
      ) : (
        <section className="border-line rounded-sm border p-5">
          <p className="font-medium">비슷한 체형의 후기가 아직 부족합니다.</p>
          <p className="text-ink-muted mt-1 text-sm">
            아래 후기를 유사도 순으로 보여드립니다. 유사도가 낮으니 참고만 하세요.
          </p>
        </section>
      )}

      {/* 체형 분포 */}
      {reviews.length > 0 && (
        <section className="space-y-5">
          <h2 className="text-sm font-semibold">후기 작성자 체형 분포</h2>
          <MeasureBar
            label="허리"
            unit="인치"
            others={reviews.map((r) => r.snapshot.waistInch)}
            mine={profile?.waistInch}
          />
          <MeasureBar
            label="허벅지 둘레"
            unit="cm"
            others={reviews
              .map((r) => r.snapshot.thighCm)
              .filter((v): v is number => v !== undefined)}
            mine={profile?.thighCm}
          />
        </section>
      )}

      {/* 후기 목록 */}
      <section>
        <h2 className="mb-4 flex items-baseline justify-between text-sm font-semibold">
          <span>{profile ? "나와 비슷한 순" : "최신순"}</span>
          <span className="text-ink-muted tnum font-mono font-normal">
            {reviews.length}건{!loaded && " (갱신 중)"}
          </span>
        </h2>

        {reviews.length === 0 ? (
          <div className="border-line rounded-sm border p-5">
            <p className="font-medium">아직 후기가 없습니다.</p>
            <Link
              href={`/reviews/new?model=${modelId}`}
              className="bg-ink text-surface mt-4 inline-block rounded-sm px-4 py-2 text-sm font-medium"
            >
              첫 후기 남기기
            </Link>
          </div>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {ranked.slice(0, 20).map((review) => (
              <li key={review.id} className="flex gap-4 py-5">
                {profile && <SimilarityBadge score={review.similarity.score} />}

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{review.snapshot.nickname}</span>
                    <span className="text-ink-muted tnum font-mono text-xs">
                      {review.snapshot.heightCm}cm · {review.snapshot.weightKg}kg ·
                      허리 {review.snapshot.waistInch}
                    </span>
                    {review.isSeed && (
                      <span className="border-line text-ink-muted rounded-sm border px-1 text-xs">
                        샘플
                      </span>
                    )}
                  </div>

                  <p className="tnum font-mono text-sm">
                    {review.purchasedSize}인치 구매
                  </p>

                  <div className="space-y-1">
                    {FIT_PARTS.map((part) => (
                      <FitScale key={part} part={part} level={review[part]} />
                    ))}
                  </div>

                  {review.comment && <p className="text-sm">{review.comment}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`/reviews/new?model=${modelId}`}
        className="border-ink block rounded-sm border py-3 text-center font-medium"
      >
        내 후기 남기기
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: 프리렌더 페이지**

`app/models/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { ModelDetail } from "@/components/ModelDetail";
import { createBuildClient } from "@/lib/db/client";
import { getReviews } from "@/lib/db/reviews";
import { MODEL_IDS, getModel, type ModelId } from "@/lib/sizing";
import type { FitReview } from "@/lib/fit-matching";

export function generateStaticParams() {
  return MODEL_IDS.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!MODEL_IDS.includes(id as ModelId)) return {};
  const model = getModel(id as ModelId);
  return {
    title: `리바이스 ${model.name} 사이즈`,
    description: `${model.name}을 실제로 입어본 사람들의 체형과 핏 후기. 나와 비슷한 체형 순으로 봅니다.`,
  };
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!MODEL_IDS.includes(id as ModelId)) notFound();

  const model = getModel(id as ModelId);

  // 빌드 시점에 후기를 HTML에 굽는다. 전부 클라이언트에서 그리면
  // 크롤러에게 빈 페이지로 보여 SEO가 무의미해진다 (스펙 §16).
  let reviews: FitReview[] = [];
  try {
    reviews = await getReviews(id, createBuildClient());
  } catch {
    // 빌드 환경에 자격증명이 없으면 빈 상태로 굽고 런타임에 채운다
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">
        리바이스 {model.name}
      </h1>
      <p className="text-ink-muted mt-2 mb-10">{model.description}</p>
      <ModelDetail modelId={id} initialReviews={reviews} />
    </main>
  );
}
```

- [ ] **Step 3: 빌드에서 후기가 실제로 구워지는지 확인**

```bash
npx dotenv -e .env.local -- npm run build
```

```bash
node -e "const h=require('fs').readFileSync('out/models/501/index.html','utf8'); console.log('후기 본문 포함:', h.includes('허벅지')); console.log('HTML 크기(KB):', Math.round(h.length/1024));"
```

Expected: `후기 본문 포함: true`, 크기 100KB 이상

`false`가 나오면 `.env.local`이 빌드에 안 넘어간 것이다. `dotenv -e .env.local --` 접두사를 확인한다.

- [ ] **Step 4: 브라우저에서 확인**

```bash
npm run dev
```

`http://localhost:3000/models/501` 에서 확인할 것:
- 프로필 없이 들어가면 "체형을 입력하면..." 안내가 뜨고 후기는 최신순으로 보인다
- `/onboarding`에서 체형을 넣고 오면 추천 사이즈 카드와 유사도 배지가 뜬다
- 눈금자에 내 위치가 형광으로 표시된다
- 시드 후기에 회색 "샘플" 배지가 붙는다

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 모델 상세 화면 추가

빌드 시점에 후기를 프리렌더해 SEO를 확보하고, 하이드레이션 후
브라우저가 최신 데이터와 내 프로필로 덮는다."
```

---

## Task 7: 후기 작성

**Files:**
- Create: `components/ReviewForm.tsx`
- Create: `app/reviews/new/page.tsx`

- [ ] **Step 1: 폼 컴포넌트**

`components/ReviewForm.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyProfile, type BodyProfile } from "@/lib/db/profile";
import { insertReview } from "@/lib/db/reviews";
import { MODEL_IDS } from "@/lib/sizing";
import { fitLabel, partLabel } from "@/lib/view/labels";
import { fitReviewSchema } from "@/lib/validation/schemas";
import type { FitPart } from "@/lib/fit-matching";

const FIT_PARTS: FitPart[] = ["waistFit", "thighFit", "hipFit", "lengthFit"];
const LEVELS = [-2, -1, 0, 1, 2];

export function ReviewForm({ defaultModelId }: { defaultModelId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [checked, setChecked] = useState(false);

  const [values, setValues] = useState<Record<string, string>>({
    // MODEL_IDS는 ModelId[]라 string으로 includes를 못 부른다. 배열을 넓혀서 비교한다.
    modelId: (MODEL_IDS as string[]).includes(defaultModelId)
      ? defaultModelId
      : "501",
    purchasedSize: "",
    waistFit: "0",
    thighFit: "0",
    hipFit: "0",
    lengthFit: "0",
    overall: "4",
    comment: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setChecked(true));
  }, []);

  if (checked && profile === null) {
    return (
      <div className="border-line rounded-sm border p-5">
        <p className="font-medium">체형을 먼저 입력해야 합니다.</p>
        <p className="text-ink-muted mt-1 text-sm">
          후기에는 작성 시점의 체형이 함께 기록됩니다. 그래야 다른 사람이 자기와 비교할 수 있습니다.
        </p>
        <Link
          href="/onboarding"
          className="bg-ink text-surface mt-4 inline-block rounded-sm px-4 py-2 text-sm font-medium"
        >
          체형 입력
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);

    const result = fitReviewSchema.safeParse(values);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    if (!profile) return;

    setErrors({});
    setSaving(true);
    try {
      await insertReview(result.data, profile);
      router.push(`/models/${result.data.modelId}`);
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "저장에 실패했습니다",
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <label className="block">
        <span className="text-ink-muted text-sm">모델</span>
        <select
          value={values.modelId}
          onChange={(e) => setValues({ ...values, modelId: e.target.value })}
          className="border-line mt-1 w-full rounded-sm border px-3 py-2"
        >
          {MODEL_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-ink-muted text-sm">구매한 허리 사이즈 (인치)</span>
        <input
          type="number"
          inputMode="numeric"
          value={values.purchasedSize}
          onChange={(e) =>
            setValues({ ...values, purchasedSize: e.target.value })
          }
          className="border-line focus:border-ink mt-1 w-full rounded-sm border px-3 py-2 font-mono tabular-nums outline-none"
        />
        {errors.purchasedSize && (
          <span className="text-warn mt-1 block text-sm">
            {errors.purchasedSize}
          </span>
        )}
      </label>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">부위별 핏</legend>
        {FIT_PARTS.map((part) => (
          <div key={part}>
            <span className="text-ink-muted text-sm">{partLabel(part)}</span>
            <div className="mt-1 flex gap-px">
              {LEVELS.map((level) => {
                const active = Number(values[part]) === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      setValues({ ...values, [part]: String(level) })
                    }
                    className={`flex-1 rounded-sm border py-2 text-xs ${
                      active
                        ? "bg-ink text-surface border-ink"
                        : "border-line bg-surface"
                    }`}
                  >
                    {fitLabel(level)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <label className="block">
        <span className="text-ink-muted text-sm">전체 만족도 (1~5)</span>
        <input
          type="number"
          min={1}
          max={5}
          value={values.overall}
          onChange={(e) => setValues({ ...values, overall: e.target.value })}
          className="border-line focus:border-ink mt-1 w-full rounded-sm border px-3 py-2 font-mono tabular-nums outline-none"
        />
      </label>

      <label className="block">
        <span className="text-ink-muted text-sm">한줄평 (선택, 300자)</span>
        <textarea
          rows={3}
          value={values.comment}
          onChange={(e) => setValues({ ...values, comment: e.target.value })}
          className="border-line focus:border-ink mt-1 w-full rounded-sm border px-3 py-2 outline-none"
        />
        {errors.comment && (
          <span className="text-warn mt-1 block text-sm">{errors.comment}</span>
        )}
      </label>

      {failure && (
        <p className="border-warn text-warn rounded-sm border p-3 text-sm">
          {failure}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !profile}
        className="bg-ink text-surface w-full rounded-sm py-3 font-medium disabled:opacity-50"
      >
        {saving ? "저장 중" : "후기 등록"}
      </button>

      {profile && (
        <p className="text-ink-muted text-xs">
          작성 시점의 체형({profile.heightCm}cm · {profile.weightKg}kg · 허리{" "}
          {profile.waistInch}인치)이 함께 저장됩니다.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: 페이지**

정적 export에서는 `useSearchParams`가 Suspense를 요구하므로 감싼다.

`app/reviews/new/page.tsx`:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReviewForm } from "@/components/ReviewForm";

function ReviewFormWithParams() {
  const params = useSearchParams();
  return <ReviewForm defaultModelId={params.get("model") ?? "501"} />;
}

export default function NewReviewPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">후기 남기기</h1>
      <p className="text-ink-muted mt-2 mb-8">
        허리는 맞는데 허벅지가 낀다면, 그 차이가 다음 사람에게 가장 필요한 정보입니다.
      </p>
      <Suspense fallback={<p className="text-ink-muted">불러오는 중</p>}>
        <ReviewFormWithParams />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npx dotenv -e .env.local -- npm run build
```

Expected: 빌드 성공. `useSearchParams` 관련 오류가 나면 Suspense 경계를 확인한다.

- [ ] **Step 4: 실제로 후기를 남겨본다**

```bash
npm run dev
```

`http://localhost:3000/models/501` → "내 후기 남기기" → 폼 작성 → 등록.

확인할 것:
- 체형 미입력 상태로 들어가면 "체형을 먼저 입력해야 합니다"가 뜬다
- 등록 후 모델 상세로 돌아오고, 내 후기가 목록에 **샘플 배지 없이** 보인다
- 같은 모델·같은 사이즈로 한 번 더 등록하면 유니크 제약에 걸려 오류 메시지가 뜨고 입력값이 남는다

- [ ] **Step 5: 남긴 테스트 후기 정리**

실사용자 후기가 DB에 남으면 다음 검증이 헷갈린다. Supabase SQL Editor에서:

```sql
delete from fit_reviews where is_seed = false;
```

- [ ] **Step 6: 전체 검증과 커밋**

```bash
npm test
npm run lint
npm run typecheck
```

```bash
git add -A
git commit -m "feat: 후기 작성 화면 추가

작성 시점 체형을 snapshot으로 함께 저장한다."
```

---

## Task 8: 랜딩과 네비게이션

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 공통 헤더**

`app/layout.tsx`의 `<body>` 안을 다음으로 교체한다:

```tsx
      <body className="bg-surface text-ink font-sans antialiased">
        <header className="border-line border-b">
          <nav className="mx-auto flex max-w-2xl items-baseline gap-6 px-6 py-4">
            <a href="/" className="text-sm font-semibold">
              {SERVICE_NAME}
            </a>
            <a href="/models" className="text-ink-muted text-sm">
              모델
            </a>
            <a href="/onboarding" className="text-ink-muted text-sm">
              체형 입력
            </a>
          </nav>
        </header>
        {children}
      </body>
```

- [ ] **Step 2: 랜딩**

`app/page.tsx`:

```tsx
import Link from "next/link";
import { SERVICE_TAGLINE } from "@/lib/brand";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl leading-snug font-bold tracking-tight">
        같은 32인치인데 <br />
        왜 나한테만 안 맞을까
      </h1>

      <p className="text-ink-muted mt-4">{SERVICE_TAGLINE}</p>

      <div className="border-line mt-10 border-y py-6">
        <p className="text-sm">
          브랜드 사이즈 표는 평균 체형 기준입니다. 골반과 허벅지 비율이 다르면
          같은 사이즈도 다르게 맞습니다. 여기서는 수치가 비슷한 사람들이 실제로
          어땠는지를 봅니다.
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/onboarding"
          className="bg-ink text-surface rounded-sm px-5 py-3 font-medium"
        >
          체형 입력하고 시작
        </Link>
        <Link
          href="/models"
          className="border-line rounded-sm border px-5 py-3 font-medium"
        >
          그냥 둘러보기
        </Link>
      </div>

      <p className="text-ink-muted mt-6 text-sm">
        로그인이 필요 없습니다. 대상은 리바이스 501과 517 두 모델입니다.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: 전체 검증**

```bash
npm test
npm run lint
npm run typecheck
npx dotenv -e .env.local -- npm run build
```

Expected: 전부 통과. 금지 목록 테스트가 새 화면들도 스캔한다.

- [ ] **Step 4: 커밋과 배포**

```bash
git add -A
git commit -m "feat: 랜딩 페이지와 공통 헤더 추가"
git push origin main
```

배포 워크플로가 끝나면 https://ccccmkk.github.io/team5/ 에서 전체 흐름을 확인한다.

---

## 완료 기준

- [ ] `npm test` 통과
- [ ] `npm run lint` · `npm run typecheck` 통과
- [ ] `npm run build` 성공, `out/models/501/index.html`에 후기 본문이 들어 있음
- [ ] 로그인 없이 체형 입력 → 추천 사이즈 확인 → 후기 작성이 끝까지 된다
- [ ] 프로필 없는 방문자에게도 빈 화면이 아니라 최신순 후기가 보인다
- [ ] 배포된 사이트에서 같은 흐름이 동작한다

## 다음 계획

계획 3 — GA4 이벤트 계측과 KPI, SEO/사이트맵/서치 콘솔, `/me`(내 후기 관리 + 소셜 로그인 목업 버튼), E2E 1개, 재가설 기록 루프.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { countOptionalFields, track } from "@/lib/analytics/track";
import { getMyProfile, upsertMyProfile } from "@/lib/db/profile";
import {
  estimateHipCm,
  estimateInseamCm,
  estimateThighCm,
  profileConfidence,
  type EstimatableField,
  type EstimateInput,
  type Gender,
  type ShapeChoice,
} from "@/lib/fit-matching";
import { bodyProfileSchema } from "@/lib/validation/schemas";

const GENDERS = [
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
] as const;

const MEASURE_FIELDS = [
  { name: "heightCm", label: "키", unit: "cm", type: "number" },
  { name: "weightKg", label: "몸무게", unit: "kg", type: "number" },
  {
    name: "waistInch",
    label: "평소 입는 청바지 허리",
    unit: "인치",
    type: "number",
  },
] as const;

/**
 * 선택 항목은 줄자가 있어야 답할 수 있어서 그냥 비워 두는 사람이 많았다
 * (사용자 피드백, GA에서도 profile_start 대비 완료가 적었다).
 * 그래서 각 항목에 "고르기"를 먼저 두고, 아는 사람만 직접 입력하게 한다.
 */
const OPTIONAL = [
  {
    name: "thighCm",
    label: "허벅지 둘레",
    unit: "cm",
    estimate: estimateThighCm,
    choices: ["슬림", "표준", "하체발달"],
  },
  {
    name: "hipCm",
    label: "엉덩이 둘레",
    unit: "cm",
    estimate: estimateHipCm,
    choices: ["작은 편", "표준", "큰 편"],
  },
  {
    name: "inseamCm",
    label: "다리 길이",
    unit: "cm",
    estimate: estimateInseamCm,
    choices: ["짧은 편", "표준", "긴 편"],
  },
] as const;

const CHOICES: ShapeChoice[] = [-1, 0, 1];

function filled(value: string | undefined): boolean {
  return (value ?? "").trim() !== "";
}

/**
 * 저장 전 입력을 브라우저에 남긴다. 저장해야 세션이 생기는 구조라,
 * 그 전에 새로고침하면 여섯 칸을 다시 채워야 했다.
 * 저장에 성공하면 지운다 — 그때부터는 DB가 출처다.
 */
const DRAFT_KEY = "team5:profile-draft";

function readDraft(): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export function ProfileForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // 복원이 끝나기 전에 빈 값으로 초안을 덮어쓰지 않도록 막는다
  const [restored, setRestored] = useState(false);
  /** 어떤 항목을 옵션으로 골랐는지. 값이 아니라 "고른 칸"을 기억한다. */
  const [choices, setChoices] = useState<
    Partial<Record<EstimatableField, ShapeChoice>>
  >({});

  // H1(온보딩 완료율)의 분모
  useEffect(() => {
    track("profile_start", {});
  }, []);

  // 저장된 프로필이 있으면 그것으로, 없으면 작성 중이던 초안으로 채운다
  useEffect(() => {
    let alive = true;

    getMyProfile()
      .then((profile) => {
        if (!alive) return;
        if (profile) {
          setValues({
            nickname: profile.nickname,
            gender: profile.gender ?? "",
            heightCm: String(profile.heightCm),
            weightKg: String(profile.weightKg),
            waistInch: String(profile.waistInch),
            thighCm:
              profile.thighCm === undefined ? "" : String(profile.thighCm),
            hipCm: profile.hipCm === undefined ? "" : String(profile.hipCm),
            inseamCm:
              profile.inseamCm === undefined ? "" : String(profile.inseamCm),
          });
          return;
        }
        setValues(readDraft() ?? {});
      })
      .catch(() => {
        // 세션이 없는 첫 방문. 정상 경로다.
        if (alive) setValues(readDraft() ?? {});
      })
      .finally(() => {
        if (alive) setRestored(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  // 한 칸 채울 때마다 남긴다. 새로고침이나 실수로 뒤로가기를 해도 살아남는다.
  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      // 저장소를 못 쓰는 브라우저면 초안 없이 동작한다
    }
  }, [restored, values]);

  /**
   * 옵션에서 치수를 뽑으려면 성별·몸무게·키가 먼저 있어야 한다.
   * 아직이면 버튼을 잠그고 무엇이 필요한지 알린다.
   */
  const basis: EstimateInput | null =
    values.gender === "male" || values.gender === "female"
      ? {
          gender: values.gender as Gender,
          weightKg: Number(values.weightKg),
          heightCm: Number(values.heightCm),
        }
      : null;
  const canEstimate =
    basis !== null &&
    Number.isFinite(basis.weightKg) &&
    basis.weightKg > 0 &&
    Number.isFinite(basis.heightCm) &&
    basis.heightCm > 0;

  /** 옵션으로 채운 항목. 직접 고쳐 쓰면 목록에서 빠진다. */
  const estimatedFields = OPTIONAL.map((f) => f.name).filter(
    (name) => filled(values[name]) && choices[name] !== undefined,
  ) as EstimatableField[];

  // 검증 통과 여부와 무관하게 항상 맞는 값을 보여준다
  const confidence = profileConfidence(
    {
      heightCm: 0,
      weightKg: 0,
      waistInch: 0,
      ...(filled(values.thighCm) && { thighCm: 1 }),
      ...(filled(values.hipCm) && { hipCm: 1 }),
      ...(filled(values.inseamCm) && { inseamCm: 1 }),
    },
    estimatedFields,
  );

  function pickShape(
    name: EstimatableField,
    estimate: (input: EstimateInput, choice: ShapeChoice) => number,
    choice: ShapeChoice,
  ) {
    if (!canEstimate || !basis) return;
    setValues({ ...values, [name]: String(estimate(basis, choice)) });
    setChoices({ ...choices, [name]: choice });
  }

  /** 숫자를 직접 고치면 더 이상 추정값이 아니다. */
  function typeMeasure(name: string, raw: string) {
    setValues({ ...values, [name]: raw });
    if (name in choices) {
      const next = { ...choices };
      delete next[name as EstimatableField];
      setChoices(next);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);

    const result = bodyProfileSchema.safeParse(values);
    if (!result.success) {
      const found: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!found[key]) found[key] = issue.message;
      }
      setErrors(found);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      // 옵션으로 채운 항목을 함께 남긴다. 나중에 "고른 값"과 "직접 잰 값"을
      // 구분해서 볼 수 있어야 화면의 정확도가 거짓말을 하지 않는다.
      await upsertMyProfile({ ...result.data, estimatedFields });
      // 저장됐으니 초안은 더 필요 없다. 이제 DB가 출처다.
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // 저장소를 못 쓰면 무시한다
      }
      // H1의 분자, H2(선택 항목 입력률)의 원자료
      track("profile_complete", {
        confidence: profileConfidence(result.data),
        optional_field_count: countOptionalFields(result.data),
      });
      router.push(nextPath);
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
          {unit && ` (${unit})`}
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

        {field("nickname", "닉네임", "", "text")}

        <div>
          <span className="text-ink-muted text-sm">성별</span>
          <div className="mt-1 flex gap-px">
            {GENDERS.map(({ value, label }) => {
              const active = values.gender === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValues({ ...values, gender: value })}
                  className={`flex-1 rounded-sm border py-2 text-sm ${
                    active
                      ? "bg-ink text-surface border-ink"
                      : "border-line bg-surface"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {errors.gender && (
            <span className="text-warn mt-1 block text-sm">
              {errors.gender}
            </span>
          )}
          <p className="text-ink-muted mt-2 text-sm">
            같은 성별인 사람들과만 비교합니다. 섞으면 체형 분포가 너무 넓어집니다.
          </p>
        </div>

        {MEASURE_FIELDS.map((f) => field(f.name, f.label, f.unit, f.type))}
        <p className="text-ink-muted text-sm">
          줄자 대신 평소 입는 청바지 사이즈를 적습니다.
        </p>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold">선택</h2>
          <p className="text-ink-muted mt-1 text-sm">
            줄자로 재지 않아도 됩니다. 고르기만 해도 비슷한 체형을 찾는 데
            쓰입니다.
          </p>
        </div>

        {!canEstimate && (
          <p className="text-ink-muted text-sm">
            성별과 키·몸무게를 먼저 채우면 아래에서 고를 수 있습니다.
          </p>
        )}

        {OPTIONAL.map((f) => (
          <div key={f.name}>
            <span className="text-ink-muted text-sm">{f.label}</span>

            <div className="mt-1 flex gap-px">
              {CHOICES.map((choice, index) => (
                <button
                  key={choice}
                  type="button"
                  disabled={!canEstimate}
                  onClick={() => pickShape(f.name, f.estimate, choice)}
                  className={`flex-1 rounded-sm border py-2 text-xs disabled:opacity-40 ${
                    choices[f.name] === choice
                      ? "bg-ink text-surface border-ink"
                      : "border-line bg-surface"
                  }`}
                >
                  {f.choices[index]}
                </button>
              ))}
            </div>

            <label className="mt-2 flex items-center gap-2">
              <span className="text-ink-muted shrink-0 text-xs">
                직접 입력 ({f.unit})
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={values[f.name] ?? ""}
                onChange={(e) => typeMeasure(f.name, e.target.value)}
                className="border-line focus:border-ink w-full rounded-sm border px-3 py-2 font-mono tabular-nums outline-none"
              />
            </label>
            {errors[f.name] && (
              <span className="text-warn mt-1 block text-sm">
                {errors[f.name]}
              </span>
            )}
          </div>
        ))}

        <p className="text-ink-muted text-sm">
          현재 정확도{" "}
          <span className="tnum font-mono">{Math.round(confidence * 100)}%</span>
          {estimatedFields.length > 0 &&
            " · 고른 값은 대략치라 절반만 반영됩니다"}
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
        로그인 없이 저장됩니다. 이 브라우저에만 남으므로 기기를 바꾸면 다시
        입력해야 합니다.
      </p>
    </form>
  );
}

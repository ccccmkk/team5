"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { countOptionalFields, track } from "@/lib/analytics/track";
import { getMyProfile, upsertMyProfile } from "@/lib/db/profile";
import { profileConfidence } from "@/lib/fit-matching";
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

const OPTIONAL = [
  { name: "thighCm", label: "허벅지 둘레", unit: "cm" },
  { name: "hipCm", label: "엉덩이 둘레", unit: "cm" },
  { name: "inseamCm", label: "인심(다리 안쪽 길이)", unit: "cm" },
] as const;

function filled(value: string | undefined): boolean {
  return (value ?? "").trim() !== "";
}

export function ProfileForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // H1(온보딩 완료율)의 분모
  useEffect(() => {
    track("profile_start", {});
  }, []);

  // 이미 입력한 적이 있으면 그 값으로 채운다 (수정 화면 겸용)
  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        if (!profile) return;
        setValues({
          nickname: profile.nickname,
          gender: profile.gender ?? "",
          heightCm: String(profile.heightCm),
          weightKg: String(profile.weightKg),
          waistInch: String(profile.waistInch),
          thighCm: profile.thighCm === undefined ? "" : String(profile.thighCm),
          hipCm: profile.hipCm === undefined ? "" : String(profile.hipCm),
          inseamCm:
            profile.inseamCm === undefined ? "" : String(profile.inseamCm),
        });
      })
      .catch(() => {
        // 세션이 없으면 빈 폼으로 시작한다. 정상 경로다.
      });
  }, []);

  // 검증 통과 여부와 무관하게 항상 맞는 값을 보여준다
  const confidence = profileConfidence({
    heightCm: 0,
    weightKg: 0,
    waistInch: 0,
    ...(filled(values.thighCm) && { thighCm: 1 }),
    ...(filled(values.hipCm) && { hipCm: 1 }),
    ...(filled(values.inseamCm) && { inseamCm: 1 }),
  });

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
      await upsertMyProfile(result.data);
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

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">선택</h2>
        {OPTIONAL.map((f) => field(f.name, f.label, f.unit))}
        <p className="text-ink-muted text-sm">
          현재 정확도{" "}
          <span className="tnum font-mono">{Math.round(confidence * 100)}%</span>
          {!filled(values.thighCm) && " · 허벅지 둘레를 넣으면 85%로 올라갑니다"}
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

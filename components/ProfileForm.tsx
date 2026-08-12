"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyProfile, upsertMyProfile } from "@/lib/db/profile";
import { profileConfidence } from "@/lib/fit-matching";
import { bodyProfileSchema } from "@/lib/validation/schemas";

const REQUIRED = [
  { name: "nickname", label: "닉네임", unit: "", type: "text" },
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

  // 이미 입력한 적이 있으면 그 값으로 채운다 (수정 화면 겸용)
  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        if (!profile) return;
        setValues({
          nickname: profile.nickname,
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

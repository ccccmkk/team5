"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyProfile, type BodyProfile } from "@/lib/db/profile";
import { insertReview } from "@/lib/db/reviews";
import type { FitPart } from "@/lib/fit-matching";
import { MODEL_IDS } from "@/lib/sizing";
import { fitReviewSchema } from "@/lib/validation/schemas";
import { fitLabel, partLabel } from "@/lib/view/labels";

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);

    const result = fitReviewSchema.safeParse(values);
    if (!result.success) {
      const found: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!found[key]) found[key] = issue.message;
      }
      setErrors(found);
      return;
    }
    if (!profile) return;

    setErrors({});
    setSaving(true);
    try {
      await insertReview(result.data, profile);
      router.push(`/models/${result.data.modelId}`);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "저장에 실패했습니다");
      setSaving(false);
    }
  }

  if (checked && profile === null) {
    return (
      <div className="border-line rounded-sm border p-5">
        <p className="font-medium">체형을 먼저 입력해야 합니다.</p>
        <p className="text-ink-muted mt-1 text-sm">
          후기에는 작성 시점의 체형이 함께 기록됩니다. 그래야 다른 사람이
          자기와 비교할 수 있습니다.
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
        <span className="text-ink-muted text-sm">
          구매한 허리 사이즈 (인치)
        </span>
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
        {errors.overall && (
          <span className="text-warn mt-1 block text-sm">{errors.overall}</span>
        )}
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

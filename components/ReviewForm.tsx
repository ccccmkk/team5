"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/track";
import { getMyProfile, type BodyProfile } from "@/lib/db/profile";
import { insertReview } from "@/lib/db/reviews";
import type { FitPart } from "@/lib/fit-matching";
import { MODEL_IDS, getModel, isModelId } from "@/lib/sizing";
import { fitReviewSchema } from "@/lib/validation/schemas";
import { fitLabel, partLabel } from "@/lib/view/labels";

const FIT_PARTS: FitPart[] = ["waistFit", "thighFit", "hipFit", "lengthFit"];
const LEVELS = [-2, -1, 0, 1, 2];

const OVERALL_LEVELS = [
  { value: 1, label: "별로" },
  { value: 2, label: "아쉬움" },
  { value: 3, label: "보통" },
  { value: 4, label: "괜찮음" },
  { value: 5, label: "좋음" },
];

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
    // H4(후기 작성 전환율)의 분모
    track("review_start", { model_id: defaultModelId });

    getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setChecked(true));
  }, [defaultModelId]);

  const availableSizes = isModelId(values.modelId)
    ? getModel(values.modelId).sizeChart.sizes.map((s) => s.waistInch)
    : [];

  function selectModel(modelId: string) {
    // 모델을 바꾸면 그 모델에 없는 사이즈는 지운다. 남겨두면 잘못된 값이 제출된다.
    const sizes = isModelId(modelId)
      ? getModel(modelId).sizeChart.sizes.map((s) => s.waistInch)
      : [];
    const keep = sizes.includes(Number(values.purchasedSize));
    setValues({
      ...values,
      modelId,
      purchasedSize: keep ? values.purchasedSize : "",
    });
  }

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
      // H4의 분자
      track("review_submit", {
        model_id: result.data.modelId,
        purchased_size: result.data.purchasedSize,
      });
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
          onChange={(e) => selectModel(e.target.value)}
          className="border-line mt-1 w-full rounded-sm border px-3 py-2"
        >
          {MODEL_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="text-ink-muted text-sm">구매한 허리 사이즈 (인치)</span>
        {/* 해당 모델이 실제로 나오는 사이즈만 고르게 한다. 자유 입력이면
            존재하지 않는 사이즈가 들어와 추천 집계가 흩어진다. */}
        <div className="mt-1 flex flex-wrap gap-1">
          {availableSizes.map((size) => {
            const active = Number(values.purchasedSize) === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() =>
                  setValues({ ...values, purchasedSize: String(size) })
                }
                className={`tnum min-w-11 rounded-sm border px-3 py-2 font-mono text-sm ${
                  active
                    ? "bg-ink text-surface border-ink"
                    : "border-line bg-surface"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
        {errors.purchasedSize && (
          <span className="text-warn mt-1 block text-sm">
            {errors.purchasedSize}
          </span>
        )}
      </div>

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

      <div>
        <span className="text-ink-muted text-sm">전체 만족도</span>
        <div className="mt-1 flex gap-px">
          {OVERALL_LEVELS.map(({ value, label }) => {
            const active = Number(values.overall) === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValues({ ...values, overall: String(value) })}
                className={`flex-1 rounded-sm border py-2 text-xs ${
                  active
                    ? "bg-ink text-surface border-ink"
                    : "border-line bg-surface"
                }`}
              >
                <span className="tnum block font-mono text-sm">{value}</span>
                <span className="mt-0.5 block">{label}</span>
              </button>
            );
          })}
        </div>
        {errors.overall && (
          <span className="text-warn mt-1 block text-sm">{errors.overall}</span>
        )}
      </div>

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

      {/* 폼이 길어서 맨 아래에 두면 스크롤을 끝까지 내려야 한다.
          화면 하단에 붙여 어디서든 누를 수 있게 한다. */}
      <div className="border-line bg-surface sticky bottom-0 -mx-6 border-t px-6 py-3">
        <button
          type="submit"
          disabled={saving || !profile}
          className="bg-ink text-surface w-full rounded-sm py-3 font-medium disabled:opacity-50"
        >
          {saving ? "저장 중" : "후기 등록"}
        </button>
      </div>

      {profile && (
        <p className="text-ink-muted text-xs">
          작성 시점의 체형({profile.heightCm}cm · {profile.weightKg}kg · 허리{" "}
          {profile.waistInch}인치)이 함께 저장됩니다.
        </p>
      )}
    </form>
  );
}

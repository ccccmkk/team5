const SIZE = 44;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 유사도를 숫자와 얇은 링으로 보여준다. 배경을 채우지 않는다 (브랜드 가이드). */
export function SimilarityBadge({ score }: { score: number }) {
  const clamped = Math.min(Math.max(score, 0), 100);
  const filled = (clamped / 100) * CIRCUMFERENCE;

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      aria-label={`유사도 ${clamped}`}
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
        {clamped}
      </span>
    </div>
  );
}

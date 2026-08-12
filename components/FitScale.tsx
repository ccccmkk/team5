import type { FitPart } from "@/lib/fit-matching";
import { fitLabel, partLabel } from "@/lib/view/labels";

const LEVELS = [-2, -1, 0, 1, 2];

/** -2~+2 부위별 핏을 눈금 위 한 칸으로 표현한다. */
export function FitScale({ part, level }: { part: FitPart; level: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-ink-muted w-12 shrink-0 text-sm">
        {partLabel(part)}
      </span>

      <div
        className="flex gap-px"
        role="img"
        aria-label={`${partLabel(part)} ${fitLabel(level)}`}
      >
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

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
 * 이 서비스의 얼굴이므로 accent 색은 여기서만 쓴다 (브랜드 가이드).
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

export type Track = { min: number; max: number };

const FALLBACK: Track = { min: 0, max: 1 };

/** 값 분포 양쪽에 여유를 붙인 눈금자 범위를 만든다 */
export function makeTrack(values: number[], padding = 2): Track {
  if (values.length === 0) return FALLBACK;

  const min = Math.min(...values) - padding;
  const max = Math.max(...values) + padding;

  // 값이 하나뿐이고 padding이 0이면 폭이 0이 되어 위치 계산이 무너진다
  return max > min ? { min, max } : { min, max: min + 1 };
}

/** 값을 트랙 위 0~1 위치로 바꾼다. 범위를 벗어나면 끝에 붙인다. */
export function trackPosition(value: number, track: Track): number {
  const width = track.max - track.min;
  if (width <= 0) return 0;
  return Math.min(Math.max((value - track.min) / width, 0), 1);
}

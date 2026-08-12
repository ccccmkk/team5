import { describe, expect, it } from "vitest";
import { makeTrack, trackPosition } from "@/lib/view/track";

describe("makeTrack", () => {
  it("값 분포에 여유를 붙인 범위를 만든다", () => {
    expect(makeTrack([50, 60], 2)).toEqual({ min: 48, max: 62 });
  });

  it("값이 하나뿐이면 폭이 0이 되지 않는다", () => {
    const track = makeTrack([55], 0);
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

  it("makeTrack이 만든 트랙 안에서는 값이 항상 0과 1 사이", () => {
    const values = [42, 55, 61, 78];
    const t = makeTrack(values);
    for (const v of values) {
      const p = trackPosition(v, t);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    }
  });
});

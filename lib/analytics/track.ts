import type { EventMap, EventName } from "./events";

export type {
  EmptyStateReason,
  EventMap,
  EventName,
  ShopDestination,
} from "./events";
export { countOptionalFields, similarityBucket } from "./events";

type Gtag = (
  command: "event",
  name: string,
  params?: Record<string, unknown>,
) => void;

/**
 * GA4로 이벤트를 보낸다. gtag 직접 호출은 이 파일 밖에서 금지한다
 * (스펙 §5 불변 규칙 3). 이벤트 이름과 파라미터가 한 곳에 모여 있어야
 * §15의 KPI 정의와 코드가 어긋나지 않는다.
 *
 * 측정 ID가 없거나 서버에서 호출되면 조용히 무시한다.
 */
export function track<K extends EventName>(name: K, params: EventMap[K]): void {
  if (typeof window === "undefined") return;

  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;

  gtag("event", name, params);
}

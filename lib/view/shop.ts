import type { ShopDestination } from "@/lib/analytics/track";

/**
 * 추천 사이즈를 받은 다음 실제로 사러 가는 링크를 만든다.
 *
 * 무신사로 보내는 이유: 우리 페르소나는 온라인으로 청바지를 사는 사람이고,
 * 그 사람들이 실제로 쓰는 곳이다. 리바이스 공식몰은 모델 페이지가 정확하지만
 * 가격대가 높아 링크를 눌러도 이탈할 가능성이 크다.
 *
 * 제휴(어필리에이트) 관계가 아니므로 추적 파라미터를 붙이지 않는다.
 * 클릭 수는 우리 쪽 GA(`outbound_click`)로만 센다.
 */
const DESTINATION_LABELS: Record<ShopDestination, string> = {
  musinsa: "무신사",
};

export function shopLabel(destination: ShopDestination): string {
  return DESTINATION_LABELS[destination];
}

/**
 * 무신사에는 모델별 고정 상품 페이지가 없다. 상품이 계속 바뀌므로
 * 특정 상품 URL을 박아두면 금방 죽은 링크가 된다. 검색 결과로 보낸다.
 */
export function shopSearchUrl(modelId: string, size: number): string {
  const keyword = `리바이스 ${modelId} ${size}`;
  return `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(keyword)}`;
}

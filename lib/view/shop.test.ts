import { describe, expect, it } from "vitest";
import { shopLabel, shopSearchUrl } from "@/lib/view/shop";

describe("shopSearchUrl", () => {
  it("모델과 사이즈를 검색어에 넣는다", () => {
    const url = new URL(shopSearchUrl("501", 32));
    expect(url.searchParams.get("keyword")).toBe("리바이스 501 32");
  });

  it("한글이 인코딩돼 링크가 깨지지 않는다", () => {
    // 인코딩을 빼먹으면 브라우저마다 다르게 처리해 검색이 어긋난다
    expect(shopSearchUrl("511", 30)).not.toContain("리바이스");
    expect(shopSearchUrl("511", 30)).toContain("keyword=");
  });

  it("무신사 도메인으로만 보낸다", () => {
    expect(new URL(shopSearchUrl("517", 34)).hostname).toBe("www.musinsa.com");
  });
});

describe("shopLabel", () => {
  it("화면에 쓰는 이름을 돌려준다", () => {
    expect(shopLabel("musinsa")).toBe("무신사");
  });
});

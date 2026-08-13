import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 개인 작업 화면은 색인할 내용이 없다
      disallow: ["/me/", "/reviews/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

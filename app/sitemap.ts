import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { MODEL_IDS } from "@/lib/sizing";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // 색인시킬 공개 페이지만 넣는다. /me와 /reviews/new는 개인 작업 화면이라 뺀다.
  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/models", priority: 0.8 },
    { path: "/onboarding", priority: 0.5 },
  ];

  return [
    ...staticRoutes.map(({ path, priority }) => ({
      url: `${SITE_URL}${path}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority,
    })),
    ...MODEL_IDS.map((id) => ({
      url: `${SITE_URL}/models/${id}/`,
      lastModified: now,
      // 후기가 쌓이면 내용이 바뀐다. 일일 재빌드 주기와 맞춘다.
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];
}

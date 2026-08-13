import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import { PageTransition } from "@/components/PageTransition";
import { SiteHeader } from "@/components/SiteHeader";
import { SERVICE_NAME, SERVICE_TAGLINE } from "@/lib/brand";
import "./globals.css";

const sansKr = IBM_Plex_Sans_KR({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans-kr",
  display: "swap",
  preload: false,
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono-num",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: SERVICE_NAME, template: `%s · ${SERVICE_NAME}` },
  description: SERVICE_TAGLINE,
};

const gaId = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${sansKr.variable} ${mono.variable}`}>
      <body className="bg-surface text-ink font-sans antialiased">
        <SiteHeader />
        <PageTransition>{children}</PageTransition>
        {/* 측정 ID가 없으면 아무것도 렌더하지 않는다 (로컬 개발에서 조용히 꺼짐) */}
        {gaId && <GoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  );
}

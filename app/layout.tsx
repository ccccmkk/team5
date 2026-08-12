import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${sansKr.variable} ${mono.variable}`}>
      <body className="bg-surface text-ink font-sans antialiased">
        <header className="border-line border-b">
          <nav className="mx-auto flex max-w-2xl items-baseline gap-6 px-6 py-4">
            <Link href="/" className="text-sm font-semibold">
              {SERVICE_NAME}
            </Link>
            <Link href="/models" className="text-ink-muted text-sm">
              모델
            </Link>
            <Link href="/onboarding" className="text-ink-muted text-sm">
              체형 입력
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

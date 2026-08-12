import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
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
  title: SERVICE_NAME,
  description: SERVICE_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${sansKr.variable} ${mono.variable}`}>
      <body className="bg-surface text-ink font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

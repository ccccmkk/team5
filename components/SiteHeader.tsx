"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SERVICE_NAME } from "@/lib/brand";

const NAV = [
  { href: "/models", label: "모델" },
  { href: "/onboarding", label: "체형 입력" },
  { href: "/me", label: "내 정보" },
];

export function SiteHeader() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    // trailingSlash: true라 경로 끝에 슬래시가 붙는다
    const current = pathname.replace(/\/$/, "") || "/";
    return current === href || current.startsWith(`${href}/`);
  }

  return (
    <header className="border-line bg-surface sticky top-0 z-10 border-b">
      <nav className="mx-auto flex max-w-2xl items-center gap-6 px-6">
        {/* 좁아지면 서비스명이 줄어든다. 메뉴는 항상 읽을 수 있어야 한다. */}
        <Link
          href="/"
          className="hover:text-ink-muted min-w-0 flex-1 truncate py-4 text-sm font-semibold transition-colors duration-150 active:opacity-60"
        >
          {SERVICE_NAME}
        </Link>

        <ul className="flex shrink-0 gap-5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative block py-4 text-sm whitespace-nowrap transition-colors duration-150 active:opacity-60 ${
                    active ? "text-ink font-medium" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                  {/* 눈금 같은 밑줄로 현재 위치를 표시한다 */}
                  <span
                    className={`bg-ink absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-200 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 체형 입력은 메뉴에 두지 않는다. 랜딩 CTA·모델 상세 안내·내 정보 세 군데에
 * 이미 진입점이 있고, 내 정보의 하위 동작이라 메뉴로 또 두면 중복이다.
 * 대신 /onboarding에서는 "내 정보"를 활성으로 표시해 위치 감각을 유지한다.
 */
const NAV = [
  { href: "/models", label: "모델", alsoActiveOn: [] as string[] },
  { href: "/me", label: "내 정보", alsoActiveOn: ["/onboarding"] },
];

export function SiteHeader() {
  const pathname = usePathname();

  // trailingSlash: true라 경로 끝에 슬래시가 붙는다
  const current = pathname.replace(/\/$/, "") || "/";

  function isActive(href: string, alsoActiveOn: string[]): boolean {
    const under = (base: string) =>
      current === base || current.startsWith(`${base}/`);
    return under(href) || alsoActiveOn.some(under);
  }

  return (
    <header className="border-line bg-surface sticky top-0 z-10 border-b">
      <nav className="mx-auto flex max-w-2xl items-center gap-6 px-6">
        {/* 제목은 랜딩 상단에 있다. 헤더에서는 홈으로 돌아가는 아이콘만 둔다. */}
        <Link
          href="/"
          aria-label="홈"
          title="홈"
          className={`hover:text-ink -ml-1 flex-1 py-4 transition-colors duration-150 active:opacity-60 ${
            current === "/" ? "text-ink" : "text-ink-muted"
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="square"
            strokeLinejoin="miter"
            aria-hidden="true"
          >
            <path d="M3 10.5 12 3.5l9 7" />
            <path d="M5.5 9.5V20h13V9.5" />
            <path d="M10 20v-5.5h4V20" />
          </svg>
        </Link>

        <ul className="flex shrink-0 gap-5">
          {NAV.map((item) => {
            const active = isActive(item.href, item.alsoActiveOn);
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

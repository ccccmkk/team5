"use client";

import { usePathname } from "next/navigation";

/**
 * 경로가 바뀔 때마다 key가 바뀌어 진입 애니메이션이 다시 돈다.
 * 정적 export라 페이지 전환이 거의 즉시 끝나서, 이게 없으면
 * 화면이 툭 바뀌기만 하고 이동했다는 감각이 없다.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

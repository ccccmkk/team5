import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "./client";

/**
 * 익명 세션을 확보한다.
 *
 * **쓰기 직전에만 호출한다.** 페이지 로드마다 부르면 그냥 둘러본 사람에게까지
 * auth.users 행이 쌓여서, 스펙 §15 H1(온보딩 완료율)의 분모가 오염된다.
 *
 * 익명 사용자도 authenticated 롤을 쓰므로 기존 RLS 정책이 그대로 적용된다.
 * 즉 본인 행만 쓰고 남의 체형 프로필은 못 읽는다 (session.test.ts에서 확인).
 */
export async function ensureSession(): Promise<User> {
  const supabase = getBrowserClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    if (error.message.toLowerCase().includes("disabled")) {
      throw new Error(
        "익명 로그인이 꺼져 있습니다. Supabase 대시보드 > Authentication > " +
          "Sign In / Providers 에서 Allow anonymous sign-ins를 켜세요.",
      );
    }
    throw error;
  }

  if (!data.user) throw new Error("익명 세션을 만들지 못했습니다");
  return data.user;
}

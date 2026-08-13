import { getBrowserClient } from "./client";

/**
 * 익명 세션을 구글 계정에 연결한다.
 *
 * 핵심은 `linkIdentity`가 **`user_id`를 그대로 둔다**는 것이다. 새 계정을 만들고
 * 데이터를 옮기는 게 아니라 기존 익명 계정에 구글 신원을 얹는다. 그래서 이미 쓴
 * 후기가 그대로 따라온다 (스펙 §3.1).
 *
 * 왜 연결이 필요한가:
 * `fit_reviews.user_id`는 `on delete cascade`다. 익명 계정이 정리되면 그 사람의
 * 후기가 통째로 같이 지워진다. 연결해두면 계정이 영구화되어 그 위험이 사라진다.
 * 기기를 바꿔도 자기 후기를 관리할 수 있는 것은 그다음 이득이다.
 */

export type IdentityState =
  | { kind: "none" }
  | { kind: "anonymous" }
  | { kind: "linked"; email: string | null };

export async function getIdentityState(): Promise<IdentityState> {
  const supabase = getBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { kind: "none" };

  // 익명 사용자도 auth.users에 실재하는 행이라 is_anonymous로만 구분된다
  if (user.is_anonymous) return { kind: "anonymous" };

  return { kind: "linked", email: user.email ?? null };
}

/**
 * 돌아올 주소. basePath('/team5')가 붙는 배포와 안 붙는 로컬을 모두 맞춰야 하는데,
 * 이 함수는 항상 /me에서 불리므로 현재 주소를 그대로 쓰면 양쪽이 자동으로 맞는다.
 */
function returnUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

/**
 * 익명 세션이 있으면 그 계정에 구글을 얹는다.
 *
 * Supabase 대시보드에서 **Manual linking을 켜야** 동작한다.
 * 꺼져 있으면 422가 떨어지므로 그 경우를 따로 안내한다.
 */
export async function linkGoogle(): Promise<void> {
  const supabase = getBrowserClient();
  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: returnUrl() },
  });

  if (error) throw asReadableError(error.message);
}

/**
 * 세션이 아예 없는 기기에서 쓴다. 이미 연결해둔 계정으로 들어오면
 * 같은 `user_id`를 받으므로 지난 후기가 그대로 보인다.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getBrowserClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: returnUrl() },
  });

  if (error) throw asReadableError(error.message);
}

/**
 * 세션이 자리잡는 순간을 알려준다.
 *
 * 구글에서 돌아오면 URL의 코드를 세션으로 바꾸는 일이 비동기로 일어난다
 * (client.ts의 `detectSessionInUrl`). 첫 렌더가 그보다 빠르면 방금 연결한
 * 사람에게 "연결 안 됨"이 보이므로, 화면이 이 시점을 잡아 다시 읽어야 한다.
 *
 * 반환값은 구독 해제 함수다.
 */
export function onIdentitySettled(callback: () => void): () => void {
  const { data } = getBrowserClient().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "USER_UPDATED") callback();
  });

  return () => data.subscription.unsubscribe();
}

/**
 * 화면이 부르는 단일 진입점. 지금 세션이 무엇이냐에 따라 연결과 로그인이
 * 갈리는데, 그 판단을 화면마다 되풀이하면 한쪽만 고쳐져 어긋난다.
 *
 * 익명 세션이 있으면 **반드시 연결**이어야 한다. 여기서 `signInWithGoogle`을
 * 부르면 익명 계정이 버려지면서 그 사람이 방금 쓴 후기가 같이 사라진다.
 */
export async function continueWithGoogle(): Promise<void> {
  const state = await getIdentityState();
  if (state.kind === "anonymous") return linkGoogle();
  return signInWithGoogle();
}

export async function signOut(): Promise<void> {
  const supabase = getBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** 설정이 안 된 상태의 오류는 원문만 봐서는 무엇을 켜야 하는지 알 수 없다. */
function asReadableError(message: string): Error {
  const lower = message.toLowerCase();

  if (lower.includes("manual linking") || lower.includes("not enabled")) {
    return new Error(
      "계정 연결이 꺼져 있습니다. Supabase 대시보드 > Authentication > " +
        "Sign In / Providers 에서 Manual linking을 켜세요.",
    );
  }
  if (lower.includes("provider") && lower.includes("not enabled")) {
    return new Error(
      "구글 로그인이 꺼져 있습니다. Supabase 대시보드 > Authentication > " +
        "Sign In / Providers 에서 Google을 켜세요.",
    );
  }
  return new Error(message);
}

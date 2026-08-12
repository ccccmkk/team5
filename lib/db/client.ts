import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let browserClient: SupabaseClient | null = null;

/**
 * 브라우저용 싱글턴. 세션을 유지하고 자동 갱신한다.
 *
 * publishable key는 브라우저에 노출되는 것을 전제로 설계된 키다.
 * 이 키로 할 수 있는 일의 범위는 RLS 정책이 결정한다.
 * service_role key는 절대 이쪽으로 들어오면 안 된다.
 */
export function getBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createSupabaseClient(url, publishableKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        // OAuth 콜백 URL의 코드를 자동으로 세션과 교환한다.
        // 정적 호스팅이라 라우트 핸들러를 못 쓰므로 이 옵션이 콜백 처리를 대신한다.
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

/** 빌드 시점 프리렌더용. 세션이 필요 없고 저장소도 없다. */
export function createBuildClient(): SupabaseClient {
  return createSupabaseClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

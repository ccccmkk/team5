"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  continueWithGoogle,
  getIdentityState,
  onIdentitySettled,
  type IdentityState,
} from "@/lib/db/identity";
import { getMyProfile } from "@/lib/db/profile";

/**
 * 첫 화면의 시작 버튼들. 로그인 화면처럼 보이지만 **로그인은 선택**이다.
 *
 * 후기를 쓰기 전에 로그인을 요구하면 스텝이 늘어 이탈이 커진다 (스펙 §3.1).
 * 그래서 구글은 권하기만 하고, 옆에 로그인 없이 들어가는 길을 같은 크기로 둔다.
 */

/** 구글에서 돌아온 사람을 어디로 보낼지. 체형이 없으면 입력이 먼저다. */
async function destinationAfterSignIn(): Promise<string> {
  const profile = await getMyProfile().catch(() => null);
  return profile ? "/models" : "/onboarding";
}

export function StartActions() {
  const router = useRouter();
  const [identity, setIdentity] = useState<IdentityState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  /**
   * 직전 상태. 세션이 이미 있으면 화면을 열 때도 `SIGNED_IN`이 한 번 오기 때문에,
   * 이벤트만 보고 넘기면 **로그인 화면을 보러 온 사람이 그대로 튕겨 나간다.**
   * 지금 막 연결된 경우, 즉 상태가 바뀐 경우에만 넘긴다.
   */
  const previousKind = useRef<IdentityState["kind"] | null>(null);

  useEffect(() => {
    getIdentityState()
      .catch((): IdentityState => ({ kind: "none" }))
      .then((state) => {
        previousKind.current = state.kind;
        setIdentity(state);
      });
  }, []);

  useEffect(
    () =>
      onIdentitySettled(async () => {
        const next = await getIdentityState().catch(
          (): IdentityState => ({ kind: "none" }),
        );
        const before = previousKind.current;
        previousKind.current = next.kind;
        setIdentity(next);

        if (next.kind === "linked" && before !== null && before !== "linked") {
          router.replace(await destinationAfterSignIn());
        }
      }),
    [router],
  );

  async function handleGoogle() {
    setFailure(null);
    setBusy(true);
    try {
      await continueWithGoogle();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "로그인에 실패했습니다");
      setBusy(false);
    }
  }

  // 판별 전에 버튼을 그리면 이미 로그인한 사람에게 로그인 버튼이 잠깐 보인다
  if (identity === null) {
    return (
      <div
        aria-hidden="true"
        className="bg-line mt-8 h-12 w-full max-w-sm animate-pulse rounded-sm"
      />
    );
  }

  if (identity.kind === "linked") {
    return (
      <div className="mt-8">
        <Link
          href="/models"
          className="bg-ink text-surface inline-block rounded-sm px-5 py-3 font-medium"
        >
          이어서 시작하기
        </Link>
        <p className="text-ink-muted mt-3 text-sm">
          구글 계정으로 로그인되어 있습니다
          {identity.email && (
            <>
              {" — "}
              <span className="font-mono text-xs">{identity.email}</span>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={handleGoogle}
          className="bg-ink text-surface rounded-sm px-5 py-3 font-medium disabled:opacity-50"
        >
          {busy ? "이동 중" : "구글로 시작하기"}
        </button>
        <Link
          href="/onboarding"
          className="border-line rounded-sm border px-5 py-3 font-medium"
        >
          로그인 없이 시작
        </Link>
      </div>

      {failure && (
        <p className="border-warn text-warn mt-4 rounded-sm border p-3 text-sm">
          {failure}
        </p>
      )}

      <p className="text-ink-muted mt-4 text-sm">
        구글로 시작하면 남긴 후기가 계정에 남아 기기를 바꿔도 그대로 따라옵니다.
        로그인 없이 시작해도 나중에 연결할 수 있습니다.
      </p>
    </div>
  );
}

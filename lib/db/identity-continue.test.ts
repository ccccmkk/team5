import { beforeEach, describe, expect, it, vi } from "vitest";
import { continueWithGoogle } from "@/lib/db/identity";

/**
 * 첫 화면과 `/me`가 같은 버튼 하나를 부르게 되면서, 어느 쪽을 쓸지 고르는 판단이
 * `continueWithGoogle` 한 곳으로 모였다. 여기서 갈림길이 틀리면 익명 계정이
 * 버려지고 그 사람이 방금 쓴 후기가 cascade로 같이 지워진다. 그래서 테스트한다.
 *
 * 실제 Supabase에 붙는 identity.test.ts와 달리 클라이언트를 갈아끼우므로
 * 자격증명 없이도 돈다.
 */
const auth = {
  getUser: vi.fn(),
  linkIdentity: vi.fn(async () => ({ error: null })),
  signInWithOAuth: vi.fn(async () => ({ error: null })),
};

vi.mock("@/lib/db/client", () => ({
  getBrowserClient: () => ({ auth }),
}));

// returnUrl()이 현재 주소를 읽는다. node 환경에는 window가 없다.
vi.stubGlobal("window", {
  location: { origin: "http://localhost:3000", pathname: "/" },
});

describe("continueWithGoogle", () => {
  beforeEach(() => {
    auth.getUser.mockReset();
    auth.linkIdentity.mockClear();
    auth.signInWithOAuth.mockClear();
  });

  it("익명 세션이면 연결한다 — 새 로그인은 후기를 버린다", async () => {
    auth.getUser.mockResolvedValue({
      data: { user: { id: "u1", is_anonymous: true } },
    });

    await continueWithGoogle();

    expect(auth.linkIdentity).toHaveBeenCalledTimes(1);
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("세션이 없으면 로그인한다", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null } });

    await continueWithGoogle();

    expect(auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(auth.linkIdentity).not.toHaveBeenCalled();
  });

  it("이미 연결된 계정이면 로그인 쪽으로 간다", async () => {
    auth.getUser.mockResolvedValue({
      data: { user: { id: "u1", is_anonymous: false, email: "a@b.c" } },
    });

    await continueWithGoogle();

    expect(auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(auth.linkIdentity).not.toHaveBeenCalled();
  });

  it("돌아올 주소로 지금 보고 있는 화면을 넘긴다", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null } });

    await continueWithGoogle();

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/" },
    });
  });
});

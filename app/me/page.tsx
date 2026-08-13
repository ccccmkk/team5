import { MyPage } from "@/components/MyPage";

export const metadata = {
  title: "내 정보",
  description: "내 체형과 남긴 후기를 관리합니다.",
};

export default function MePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">내 정보</h1>
      <p className="text-ink-muted mt-2 mb-10">
        입력한 체형과 남긴 후기를 확인하고 고칠 수 있습니다.
      </p>
      <MyPage />
    </main>
  );
}

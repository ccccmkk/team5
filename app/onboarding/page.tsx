import { ProfileForm } from "@/components/ProfileForm";

export const metadata = {
  title: "체형 입력",
  description:
    "키, 몸무게, 평소 입는 청바지 허리 사이즈를 넣으면 비슷한 체형인 사람들의 후기를 찾습니다.",
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">체형 입력</h1>
      <p className="text-ink-muted mt-2 mb-8">
        입력한 수치로 나와 비슷한 체형인 사람들의 후기를 찾습니다.
      </p>
      <ProfileForm nextPath="/models" />
    </main>
  );
}

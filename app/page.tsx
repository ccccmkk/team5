import { SERVICE_NAME, SERVICE_TAGLINE } from "@/lib/brand";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{SERVICE_NAME}</h1>
      <p className="text-ink-muted mt-3">{SERVICE_TAGLINE}</p>
      <div className="border-line mt-8 border-t pt-4">
        <span className="tnum text-ink-muted font-mono text-sm">준비 중</span>
      </div>
    </main>
  );
}

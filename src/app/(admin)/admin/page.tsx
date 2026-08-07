export const metadata = {
  title: "管理者ダッシュボード",
};

const FUTURE_SECTIONS = [
  "犬猫掲載審査",
  "ブリーダー審査",
  "問い合わせ管理",
  "会員管理",
] as const;

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">AD-00</p>
      <h1 className="mt-2 text-3xl font-bold">管理者ダッシュボード</h1>
      <p className="mt-3 text-neutral-600">管理者としてログインしています。</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">今後追加予定</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-neutral-600">
          {FUTURE_SECTIONS.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

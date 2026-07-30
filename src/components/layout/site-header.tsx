import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold">WithTama</Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/pets">犬猫を探す</Link>
          <Link href="/login">ログイン</Link>
          <Link href="/signup" className="rounded-full bg-[var(--primary)] px-4 py-2 text-white">無料会員登録</Link>
        </nav>
      </div>
    </header>
  );
}

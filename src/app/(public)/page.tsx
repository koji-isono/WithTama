import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto grid min-h-[72vh] max-w-6xl place-items-center px-4 py-20 text-center">
      <div className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold tracking-widest text-[var(--primary)]">
          WITH TAMA
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
          出会ったその日から、
          <br />
          命は家族になる。
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-neutral-600">
          性格、健康状態、育った環境、そしてブリーダーの想いまで。大切な家族との誠実な出会いを支えます。
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/pets"
            className="rounded-full bg-[var(--primary)] px-6 py-3 font-semibold text-white"
          >
            犬猫を探す
          </Link>
          <Link href="/signup" className="rounded-full border bg-white px-6 py-3 font-semibold">
            会員登録する
          </Link>
        </div>
      </div>
    </section>
  );
}

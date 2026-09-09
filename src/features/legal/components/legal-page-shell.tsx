import Link from "next/link";

import { LEGAL_DOCUMENT_LAST_UPDATED } from "../constants";

type LegalPageShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function LegalPageShell({ title, description, children }: LegalPageShellProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 pb-16 sm:py-12">
      <header className="space-y-3 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">WithTama</p>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">{title}</h1>
        {description ? (
          <p className="text-sm leading-relaxed text-neutral-600">{description}</p>
        ) : null}
        <p className="text-xs text-neutral-500">最終更新日: {LEGAL_DOCUMENT_LAST_UPDATED}</p>
      </header>
      <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-neutral-800 sm:text-base">
        {children}
      </div>
      <footer className="mt-12 border-t border-[var(--border)] pt-6 text-sm text-neutral-600">
        <p>
          関連ページ:{" "}
          <Link href="/terms" className="text-[var(--primary)] underline-offset-4 hover:underline">
            利用規約
          </Link>
          {" · "}
          <Link
            href="/privacy"
            className="text-[var(--primary)] underline-offset-4 hover:underline"
          >
            プライバシーポリシー
          </Link>
          {" · "}
          <Link href="/legal" className="text-[var(--primary)] underline-offset-4 hover:underline">
            特定商取引法に基づく表記
          </Link>
          {" · "}
          <Link
            href="/company"
            className="text-[var(--primary)] underline-offset-4 hover:underline"
          >
            運営会社
          </Link>
        </p>
      </footer>
    </article>
  );
}

type LegalSectionProps = {
  id?: string;
  title: string;
  children: React.ReactNode;
};

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold text-neutral-900 sm:text-xl">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

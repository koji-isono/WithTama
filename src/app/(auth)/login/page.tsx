import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
          <h1 className="text-2xl font-bold sm:text-3xl">ログイン</h1>
          <p className="mt-3 text-sm text-neutral-600 sm:text-base">読み込み中...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

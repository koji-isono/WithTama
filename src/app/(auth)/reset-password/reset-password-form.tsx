"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/lib/supabase/update-password";

const INVALID_LINK_MESSAGE =
  "パスワード再設定リンクが無効、または期限切れです。再度パスワード再設定をお試しください。";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invalidLinkError =
    searchParams.get("error") === "invalid_link" ? INVALID_LINK_MESSAGE : null;

  useEffect(() => {
    if (invalidLinkError) {
      return;
    }

    const supabase = createClient();
    let isActive = true;

    async function resolveRecoverySession() {
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (code) {
        router.replace(`/auth/callback?next=/reset-password&code=${encodeURIComponent(code)}`);
        return;
      }

      if (tokenHash && type) {
        const params = new URLSearchParams({
          token_hash: tokenHash,
          type,
          next: "/reset-password",
        });
        router.replace(`/auth/confirm?${params.toString()}`);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (session) {
        setHasRecoverySession(true);
        setIsCheckingSession(false);
        return;
      }

      setSessionError(INVALID_LINK_MESSAGE);
      setIsCheckingSession(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setSessionError(null);
        setIsCheckingSession(false);
      }
    });

    void resolveRecoverySession();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [invalidLinkError, router, searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMismatchError(null);
    setFormError(null);

    if (password !== confirmPassword) {
      setMismatchError("パスワードが一致しません。");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await updatePassword(password);

      if (error) {
        setFormError(error.message);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();

      setSuccessMessage("パスワードを変更しました。");
      setPassword("");
      setConfirmPassword("");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
        <h1 className="text-2xl font-bold sm:text-3xl">パスワード再設定</h1>
        <p className="mt-3 text-sm text-neutral-600 sm:text-base">確認中...</p>
      </main>
    );
  }

  if (invalidLinkError || sessionError) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
        <h1 className="text-2xl font-bold sm:text-3xl">パスワード再設定</h1>
        <Alert variant="destructive" className="mt-8 border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" />
          <AlertDescription>{invalidLinkError ?? sessionError}</AlertDescription>
        </Alert>
        <p className="mt-6 text-sm text-neutral-600">
          <Link
            href="/login"
            className="font-medium text-[var(--primary)] underline-offset-4 hover:underline"
          >
            ログイン画面へ戻る
          </Link>
        </p>
      </main>
    );
  }

  if (successMessage) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
        <h1 className="text-2xl font-bold sm:text-3xl">パスワード再設定</h1>
        <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
        <Button asChild className="mt-6 w-full">
          <Link href="/login">ログイン画面へ</Link>
        </Button>
      </main>
    );
  }

  if (!hasRecoverySession) {
    return null;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">パスワード再設定</h1>
      <p className="mt-3 text-sm text-neutral-600 sm:text-base">
        新しいパスワードを入力してください。
      </p>

      <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            新しいパスワード
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="confirm_password" className="text-sm font-medium">
            新しいパスワード（確認）
          </label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        {mismatchError ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription>{mismatchError}</AlertDescription>
          </Alert>
        ) : null}

        {formError ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "パスワードを変更する"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-neutral-600">
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] underline-offset-4 hover:underline"
        >
          ログイン画面へ戻る
        </Link>
      </p>
    </main>
  );
}

export function ResetPasswordPageContent() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
          <h1 className="text-2xl font-bold sm:text-3xl">パスワード再設定</h1>
          <p className="mt-3 text-sm text-neutral-600 sm:text-base">読み込み中...</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

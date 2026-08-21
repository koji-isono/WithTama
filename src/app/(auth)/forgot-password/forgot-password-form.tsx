"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordForEmail } from "@/lib/supabase/reset-password-email";

const SUCCESS_MESSAGE = "パスワード再設定用のメールを送信しました。メールをご確認ください。";

const GENERIC_ERROR_MESSAGE =
  "送信処理中にエラーが発生しました。しばらくしてから再度お試しください。";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const { error } = await resetPasswordForEmail(email.trim());

      if (error) {
        console.error(error);
      }

      setSuccessMessage(SUCCESS_MESSAGE);
    } catch (error) {
      console.error(error);
      setFormError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
        <h1 className="text-2xl font-bold sm:text-3xl">パスワードをお忘れの方</h1>
        <Alert className="mt-8 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertDescription>{successMessage}</AlertDescription>
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

  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">パスワードをお忘れの方</h1>
      <p className="mt-3 text-sm text-neutral-600 sm:text-base">
        ご登録のメールアドレスを入力してください。
        <br />
        パスワード再設定用のメールをお送りします。
      </p>

      <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            メールアドレス
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="example@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        {formError ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "送信中..." : "再設定メールを送信する"}
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

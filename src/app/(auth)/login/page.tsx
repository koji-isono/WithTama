"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ensureUserProfile,
  getPostLoginPath,
  InvalidUserRoleError,
  isAdminUser,
} from "@/features/auth";
import { signInWithPassword } from "@/lib/supabase/sign-in";

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error);
}

function formatLoginProcessError(error: unknown): string {
  const genericMessage = "ログイン処理中にエラーが発生しました。";

  if (process.env.NODE_ENV === "production") {
    return genericMessage;
  }

  return `${genericMessage}\n\nDetails:\n${extractErrorMessage(error)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await signInWithPassword(email, password);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.user) {
        setErrorMessage("ログインに失敗しました。");
        return;
      }

      if (isAdminUser(data.user)) {
        router.push("/admin");
        return;
      }

      const { role } = await ensureUserProfile(data.user);
      router.push(getPostLoginPath(role));
    } catch (error) {
      console.error(error);

      if (error instanceof InvalidUserRoleError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage(formatLoginProcessError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">ログイン</h1>
      <p className="mt-3 text-sm text-neutral-600 sm:text-base">
        登録済みのメールアドレスとパスワードでログインしてください。
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

        <div className="grid gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            パスワード
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        {errorMessage ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription className="whitespace-pre-wrap">{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "ログイン中..." : "ログインする"}
        </Button>
      </form>
    </main>
  );
}

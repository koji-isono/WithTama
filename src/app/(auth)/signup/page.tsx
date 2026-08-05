"use client";

import { FormEvent, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  signUpWithRole,
  type SignupRole,
} from "@/lib/supabase/sign-up";

const roleOptions: {
  role: SignupRole;
  emoji: string;
  title: string;
  description: string;
  badgeLabel: string;
}[] = [
  {
    role: "buyer",
    emoji: "🐶",
    title: "犬猫を迎えたい",
    description: "犬猫を家族として迎えたい方はこちら",
    badgeLabel: "購入希望者",
  },
  {
    role: "breeder",
    emoji: "🐾",
    title: "ブリーダー",
    description: "犬猫を掲載したいブリーダーはこちら",
    badgeLabel: "ブリーダー",
  },
];

export default function SignupPage() {
  const [role, setRole] = useState<SignupRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedOption = roleOptions.find((option) => option.role === role);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!role) {
      setErrorMessage("会員種別を選択してください");
      return;
    }

    setIsSubmitting(true);

    const { error } = await signUpWithRole(email, password, role);

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      "確認メールを送信しました。メール内のリンクから登録を完了してください。",
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">無料会員登録</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold sm:text-xl">
          あなたはどちらですか？
        </h2>
        <div className="mt-4 grid gap-4">
          {roleOptions.map((option) => {
            const isSelected = role === option.role;

            return (
              <Card
                key={option.role}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                className={cn(
                  "cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected &&
                    "border-primary bg-secondary/60 ring-2 ring-primary/20"
                )}
                onClick={() => {
                  setRole(option.role);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setRole(option.role);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }
                }}
              >
                <CardHeader className="space-y-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <span aria-hidden="true">{option.emoji}</span>
                    {option.title}
                  </CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {role ? (
        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{selectedOption?.badgeLabel}</Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRole(null);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
            >
              種類を変更
            </Button>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
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
                autoComplete="new-password"
                placeholder="8文字以上"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                disabled={isSubmitting}
              />
            </div>

            {errorMessage ? (
              <Alert
                variant="destructive"
                className="border-red-200 bg-red-50 text-red-800"
              >
                <AlertCircle className="size-4 text-red-600" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            {successMessage ? (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "登録中..." : "無料会員登録する"}
            </Button>
          </form>
        </section>
      ) : null}
    </main>
  );
}

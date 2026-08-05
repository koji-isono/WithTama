"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SignupRole = "buyer" | "breeder";

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

  const selectedOption = roleOptions.find((option) => option.role === role);

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
                onClick={() => setRole(option.role)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setRole(option.role);
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
              onClick={() => setRole(null)}
            >
              種類を変更
            </Button>
          </div>

          <p className="mt-6 text-sm text-neutral-600 sm:text-base">
            購入希望者・ブリーダー申請の入口をここに実装します。
          </p>
        </section>
      ) : null}
    </main>
  );
}

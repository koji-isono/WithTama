"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createPetAction, type CreatePetFormState } from "@/app/breeder/pets/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const initialState: CreatePetFormState = {};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-700">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}

export function PetRegistrationForm() {
  const [state, formAction, isPending] = useActionState(createPetAction, initialState);
  const [sex, setSex] = useState("");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-6 space-y-1">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BR-08</p>
        <h1 className="text-2xl font-bold sm:text-3xl">犬猫新規登録</h1>
        <p className="text-sm text-neutral-600">基本情報を入力して登録してください</p>
      </div>

      <Card className="border-[var(--border)] bg-white shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            {state.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <FieldLabel htmlFor="management_name">管理名</FieldLabel>
              <Input
                id="management_name"
                name="management_name"
                placeholder="例: タマちゃん"
                className={cn(
                  "h-11 rounded-xl border-[var(--border)] bg-white",
                  state.fieldErrors?.management_name && "border-red-400",
                )}
                disabled={isPending}
              />
              <FieldError message={state.fieldErrors?.management_name} />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="breed">犬種</FieldLabel>
              <Input
                id="breed"
                name="breed"
                placeholder="例: ラグドール"
                className={cn(
                  "h-11 rounded-xl border-[var(--border)] bg-white",
                  state.fieldErrors?.breed && "border-red-400",
                )}
                disabled={isPending}
              />
              <FieldError message={state.fieldErrors?.breed} />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="sex">性別</FieldLabel>
              <input type="hidden" name="sex" value={sex} />
              <Select value={sex} onValueChange={setSex} disabled={isPending}>
                <SelectTrigger
                  id="sex"
                  className={cn(
                    "h-11 rounded-xl border-[var(--border)] bg-white",
                    state.fieldErrors?.sex && "border-red-400",
                  )}
                >
                  <SelectValue placeholder="性別を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">女の子</SelectItem>
                  <SelectItem value="male">男の子</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={state.fieldErrors?.sex} />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="birthday">誕生日</FieldLabel>
              <Input
                id="birthday"
                name="birthday"
                type="date"
                className={cn(
                  "h-11 rounded-xl border-[var(--border)] bg-white",
                  state.fieldErrors?.birthday && "border-red-400",
                )}
                disabled={isPending}
              />
              <FieldError message={state.fieldErrors?.birthday} />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                asChild
                disabled={isPending}
              >
                <Link href="/breeder/pets">キャンセル</Link>
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                disabled={isPending}
              >
                {isPending ? "登録中..." : "登録する"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

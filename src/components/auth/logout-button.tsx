"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/sign-out";
import { cn } from "@/lib/utils";

export const LOGOUT_ERROR_MESSAGE =
  "ログアウトできませんでした。時間をおいてもう一度お試しください。";

type LogoutButtonProps = {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
};

export function LogoutButton({
  variant = "outline",
  size = "sm",
  className,
  showLabel = true,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signOutError } = await signOut();

      if (signOutError) {
        setError(LOGOUT_ERROR_MESSAGE);
        setLoading(false);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError(LOGOUT_ERROR_MESSAGE);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error ? (
        <p className="max-w-[12rem] text-right text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(className)}
        onClick={handleLogout}
        disabled={loading}
        aria-busy={loading}
        aria-label="ログアウト"
      >
        <LogOut className={cn("size-3.5", showLabel && "sm:mr-1")} />
        {showLabel ? <span className="hidden sm:inline">ログアウト</span> : null}
      </Button>
    </div>
  );
}

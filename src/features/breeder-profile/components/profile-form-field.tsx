import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ProfileFormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  description?: string;
  error?: string;
  children: ReactNode;
};

export function ProfileFormField({
  id,
  label,
  required = false,
  optional = false,
  description,
  error,
  children,
}: ProfileFormFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = description ? `${id}-description` : undefined;
  const describedBy =
    [error ? errorId : null, descriptionId].filter(Boolean).join(" ") || undefined;

  const fieldControl =
    isValidElement(children) && describedBy
      ? cloneElement(
          children as ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>,
          {
            "aria-describedby": describedBy,
            "aria-invalid": Boolean(error),
          },
        )
      : isValidElement(children)
        ? cloneElement(children as ReactElement<{ "aria-invalid"?: boolean }>, {
            "aria-invalid": Boolean(error),
          })
        : children;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {required ? (
          <Badge className="border-transparent bg-[var(--primary)]/10 px-2 py-0 text-[10px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10">
            必須
          </Badge>
        ) : null}
        {optional ? <span className="text-xs text-neutral-500">任意</span> : null}
      </div>

      {description ? (
        <p id={descriptionId} className="text-sm text-neutral-600">
          {description}
        </p>
      ) : null}

      <div
        className={cn(
          error &&
            "[&_input]:border-red-400 [&_input]:focus-visible:ring-red-400 [&_[data-slot=select-trigger]]:border-red-500 [&_[data-slot=select-trigger]]:focus-visible:ring-red-500",
        )}
      >
        {fieldControl}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

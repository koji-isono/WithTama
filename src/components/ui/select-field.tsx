"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectFieldOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectFieldOption[];
  placeholder?: string;
  error?: string;
  hints?: string[];
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function SelectField({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  error,
  hints = [],
  disabled = false,
  required = false,
  className,
}: SelectFieldProps) {
  const errorId = `${id}-error`;
  const hintId = hints.length > 0 ? `${id}-hints` : undefined;
  const describedBy = [hintId, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
        {required ? <span className="sr-only">（必須）</span> : null}
      </Label>

      {hints.length > 0 ? (
        <div id={hintId} className="space-y-1.5">
          {hints.map((hint) => (
            <p key={hint} className="text-xs leading-relaxed text-neutral-500 sm:text-sm">
              {hint}
            </p>
          ))}
        </div>
      ) : null}

      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled}
        required={required}
      >
        <SelectTrigger
          id={id}
          error={Boolean(error)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

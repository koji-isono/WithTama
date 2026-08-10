import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("relative h-2 w-full overflow-hidden rounded-full bg-neutral-100", className)}
        {...props}
      >
        <div
          className="h-full bg-[var(--primary)] transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };

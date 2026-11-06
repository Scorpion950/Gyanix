import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Spark / sparkle icon for the AI badge
const SparkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn("h-3 w-3 shrink-0", className)}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" />
  </svg>
);

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
    "text-xs font-medium leading-none",
    "transition-colors duration-micro",
    "select-none",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary",
        secondary:
          "bg-surface-raised text-text-secondary border border-border",
        success:
          "bg-success/10 text-success",
        warning:
          "bg-warning/10 text-warning",
        danger:
          "bg-danger/10 text-danger",
        ai:
          "bg-ai/10 text-ai",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => {
    const isAi = variant === "ai";

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      >
        {isAi && <SparkIcon />}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };

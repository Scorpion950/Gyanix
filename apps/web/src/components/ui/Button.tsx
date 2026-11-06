import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 font-medium",
    "transition-colors duration-micro",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none whitespace-nowrap",
    // Minimum 44px touch target on mobile
    "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 active:bg-primary/80",
        ],
        secondary: [
          "bg-surface text-text-default border border-border",
          "hover:bg-surface-raised active:bg-surface-raised/80",
        ],
        ghost: [
          "bg-transparent text-text-default",
          "hover:bg-surface active:bg-surface-raised",
        ],
        danger: [
          "bg-danger text-white",
          "hover:bg-danger/90 active:bg-danger/80",
        ],
        outline: [
          "bg-transparent text-primary border border-primary",
          "hover:bg-primary/10 active:bg-primary/20",
        ],
        link: [
          "bg-transparent text-primary underline-offset-4",
          "hover:underline active:opacity-80",
          "h-auto px-0 py-0 min-h-0 min-w-0",
        ],
      },
      size: {
        sm: "h-8 rounded-control px-3 text-sm",
        md: "h-10 rounded-control px-4 text-sm",
        lg: "h-12 rounded-control px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn("animate-spin h-4 w-4 shrink-0", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        aria-label={isLoading ? "Loading" : props["aria-label"]}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <Spinner />
        ) : leftIcon ? (
          <span className="shrink-0 inline-flex" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        {children}

        {!isLoading && rightIcon && (
          <span className="shrink-0 inline-flex" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputWrapperVariants = cva(
  [
    "relative flex items-center w-full",
    "rounded-control border bg-surface",
    "transition-colors duration-micro",
    "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0",
  ],
  {
    variants: {
      variant: {
        default: "border-border focus-within:border-primary",
        error: "border-danger focus-within:border-danger focus-within:ring-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id">,
    VariantProps<typeof inputWrapperVariants> {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      id,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      disabled,
      required,
      type = "text",
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const resolvedVariant = error ? "error" : variant;

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium text-text-default",
              disabled && "opacity-50"
            )}
          >
            {label}
            {required && (
              <span
                className="text-danger ml-0.5"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </label>
        )}

        <div
          className={cn(
            inputWrapperVariants({ variant: resolvedVariant }),
            disabled && "opacity-50 pointer-events-none",
            className
          )}
        >
          {leftIcon && (
            <span
              className="pl-3 shrink-0 text-text-muted inline-flex"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            required={required}
            className={cn(
              "flex-1 h-10 bg-transparent px-3 py-2",
              "text-sm text-text-default placeholder:text-text-muted",
              "outline-none border-none ring-0",
              "disabled:cursor-not-allowed",
              leftIcon && "pl-2",
              rightIcon && "pr-2"
            )}
            aria-describedby={
              [error && errorId, hint && hintId]
                .filter(Boolean)
                .join(" ") || undefined
            }
            aria-invalid={error ? "true" : undefined}
            {...props}
          />

          {rightIcon && (
            <span
              className="pr-3 shrink-0 text-text-muted inline-flex"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>

        {hint && !error && (
          <p id={hintId} className="text-xs text-text-muted">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-danger flex items-center gap-1"
          >
            <svg
              className="h-3 w-3 shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 5h2v5H7V5zm0 6h2v2H7v-2z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };

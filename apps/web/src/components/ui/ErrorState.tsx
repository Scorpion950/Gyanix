import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

// Inline SVG: simple "broken page" illustration
const ErrorIllustration: React.FC = () => (
  <svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    {/* Page outline */}
    <rect
      x="12"
      y="8"
      width="56"
      height="64"
      rx="6"
      className="fill-surface-raised stroke-border"
      strokeWidth="2"
    />
    {/* Crack / lightning bolt indicating error */}
    <path
      d="M42 20 L36 40 H42 L38 60 L52 36 H44 L50 20 Z"
      className="fill-danger opacity-80"
    />
  </svg>
);

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  description = "We couldn't complete your request. Please try again or contact support if the issue persists.",
  onRetry,
  className,
}) => (
  <div
    role="alert"
    aria-live="assertive"
    className={cn(
      "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
      className
    )}
  >
    <div aria-hidden="true">
      <ErrorIllustration />
    </div>

    <div className="flex flex-col gap-2 max-w-sm">
      <h3 className="text-base font-semibold text-text-default">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>

    {onRetry && (
      <Button
        variant="secondary"
        size="md"
        onClick={onRetry}
        leftIcon={
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1.5 8A6.5 6.5 0 1 0 8 1.5a6.48 6.48 0 0 0-4.6 1.9L1 1" />
            <path d="M1 4.5V1h3.5" />
          </svg>
        }
      >
        Try again
      </Button>
    )}
  </div>
);

ErrorState.displayName = "ErrorState";

export { ErrorState };

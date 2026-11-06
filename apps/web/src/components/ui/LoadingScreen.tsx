import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingScreenProps {
  /** Optional override message */
  message?: string;
  className?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading…",
  className,
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-label={message}
    className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6",
      "bg-background",
      className
    )}
  >
    {/* Gyanix logomark — stylised "G" */}
    <div className="motion-safe:animate-pulse">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        {/* Outer circle */}
        <circle cx="28" cy="28" r="27" className="stroke-primary" strokeWidth="2" />
        {/* G letterform */}
        <path
          d="M38 22a12 12 0 1 0 0 12h-6v-6h6"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    <p className="text-sm font-medium text-text-secondary tracking-wide">
      {message}
    </p>
  </div>
);

LoadingScreen.displayName = "LoadingScreen";

export { LoadingScreen };

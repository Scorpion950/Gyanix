import * as React from "react";
import { cn } from "@/lib/utils";
import { GyanixLogoMark } from "@/assets/Logo.tsx";

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
    {/* Gyanix signature logomark with glowing pulse */}
    <div className="motion-safe:animate-pulse">
      <GyanixLogoMark size={64} />
    </div>

    <p className="text-sm font-medium text-text-secondary tracking-wide">
      {message}
    </p>
  </div>
);

LoadingScreen.displayName = "LoadingScreen";

export { LoadingScreen };

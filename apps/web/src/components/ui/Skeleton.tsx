import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva(
  [
    // Base shimmer — respects prefers-reduced-motion
    "bg-surface-raised",
    "motion-safe:animate-pulse",
  ],
  {
    variants: {
      variant: {
        /** Rectangular block — set width/height via className or style */
        rectangle: "rounded-control",
        /** Circle — equal width and height expected */
        circle: "rounded-full",
        /** Short text line with rounded ends */
        text: "rounded-full h-4",
      },
    },
    defaultVariants: {
      variant: "rectangle",
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-label="Loading…"
      aria-busy="true"
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
);

Skeleton.displayName = "Skeleton";

// ─── Convenience composites ───────────────────────────────────────────────────

/** A block of skeleton text lines */
const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 3, className, lastLineWidth = "w-3/5" }) => (
  <div className={cn("flex flex-col gap-2", className)} aria-label="Loading…" role="status">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={cn("w-full", i === lines - 1 && lastLineWidth)}
        aria-hidden="true"
      />
    ))}
  </div>
);
SkeletonText.displayName = "SkeletonText";

/** Skeleton card matching a typical content card */
const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "rounded-card border border-border bg-surface p-5 flex flex-col gap-4",
      className
    )}
    role="status"
    aria-label="Loading…"
  >
    <div className="flex items-center gap-3">
      <Skeleton variant="circle" className="h-10 w-10 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton variant="text" className="w-2/5" aria-hidden="true" />
        <Skeleton variant="text" className="w-1/3 h-3" aria-hidden="true" />
      </div>
    </div>
    <SkeletonText lines={3} aria-hidden="true" />
  </div>
);
SkeletonCard.displayName = "SkeletonCard";

export { Skeleton, SkeletonText, SkeletonCard };

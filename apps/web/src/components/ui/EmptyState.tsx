import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

// Default inline SVG illustration — single colour + one accent
const DefaultIllustration: React.FC = () => (
  <svg
    width="96"
    height="80"
    viewBox="0 0 96 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    {/* Folder body */}
    <rect
      x="8"
      y="24"
      width="80"
      height="48"
      rx="6"
      className="fill-surface-raised stroke-border"
      strokeWidth="2"
    />
    {/* Folder tab */}
    <path
      d="M8 30 Q8 24 14 24 H38 L44 30"
      className="fill-surface-raised stroke-border"
      strokeWidth="2"
    />
    {/* Accent dot */}
    <circle cx="48" cy="52" r="8" className="fill-primary opacity-30" />
    <circle cx="48" cy="52" r="4" className="fill-primary" />
  </svg>
);

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** Optional Lucide-compatible icon component (overrides default illustration) */
  icon?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
  className,
}) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      "flex flex-col items-center justify-center gap-4 py-16 px-6 text-center",
      className
    )}
  >
    <div
      className="text-text-muted"
      aria-hidden="true"
    >
      {icon ? (
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised text-text-secondary">
          {icon}
        </span>
      ) : (
        <DefaultIllustration />
      )}
    </div>

    <div className="flex flex-col gap-1 max-w-xs">
      <h3 className="text-base font-semibold text-text-default">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary">{description}</p>
      )}
    </div>

    {action && (
      <Button onClick={action.onClick} size="md">
        {action.label}
      </Button>
    )}
  </div>
);

EmptyState.displayName = "EmptyState";

export { EmptyState };

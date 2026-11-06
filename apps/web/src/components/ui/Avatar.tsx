import * as React from "react";
import * as RadixAvatar from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  [
    "relative inline-flex shrink-0 overflow-hidden rounded-full",
    "bg-surface-raised",
  ],
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-14 w-14 text-base",
        xl: "h-20 w-20 text-xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof RadixAvatar.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string | undefined;
  alt?: string | undefined;
  /** Fallback initials (up to 2 chars shown). Auto-derived from `alt` if omitted. */
  fallback?: string | undefined;
}

function deriveInitials(text?: string): string {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  if (!parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0];
  const last = parts[parts.length - 1];
  return ((first[0] || "") + (last ? last[0] || "" : "")).toUpperCase() || "?";
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof RadixAvatar.Root>,
  AvatarProps
>(({ className, size, src, alt, fallback, ...props }, ref) => {
  const initials = fallback ?? deriveInitials(alt);

  return (
    <RadixAvatar.Root
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      <RadixAvatar.Image
        src={src}
        alt={alt ?? "User avatar"}
        className="h-full w-full object-cover"
      />
      <RadixAvatar.Fallback
        className={cn(
          "flex h-full w-full items-center justify-center",
          "bg-primary/10 text-primary font-semibold",
          "select-none"
        )}
        delayMs={300}
        aria-label={alt ?? "User avatar"}
      >
        {initials}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
});

Avatar.displayName = "Avatar";

export { Avatar, avatarVariants };

/**
 * Gyanix Brand Assets — SVG Logo Mark and Wordmark
 * Hand-crafted with free tools. No external dependencies.
 * License: Proprietary — Gyanix project.
 *
 * LogoMark: A stylised "G" that doubles as a path/journey symbol.
 * Wordmark: "Gyanix" in Plus Jakarta Sans (approximated as SVG text).
 */

interface LogoProps {
  className?: string;
  'aria-hidden'?: boolean;
}

/** Logomark — the "G" icon, square aspect ratio */
export function GyanixLogoMark({ className, 'aria-hidden': ariaHidden }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden ?? true}
      role="img"
    >
      {/* Outer ring */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* G letterform */}
      <path
        d="M22 12.5C20.5 10.5 18.4 9.5 16 9.5C11.86 9.5 8.5 12.86 8.5 17C8.5 21.14 11.86 24.5 16 24.5C19.5 24.5 22.4 22.3 23.2 19H17V16.5H26V17.5C26 22.75 21.52 27 16 27C10.48 27 6 22.52 6 17C6 11.48 10.48 7 16 7C19.2 7 22.08 8.5 24 10.8L22 12.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Wordmark — "Gyanix" text, horizontal */
export function GyanixWordmark({ className, 'aria-hidden': ariaHidden }: LogoProps) {
  return (
    <svg
      viewBox="0 0 120 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={ariaHidden ?? true}
      aria-label="Gyanix"
      role="img"
    >
      <text
        x="0"
        y="18"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="700"
        fontSize="20"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        Gyanix
      </text>
    </svg>
  );
}

/** Full brand lockup — logomark + wordmark */
export function GyanixBrand({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <GyanixLogoMark className="h-7 w-7" />
      <GyanixWordmark className="h-5" />
    </div>
  );
}

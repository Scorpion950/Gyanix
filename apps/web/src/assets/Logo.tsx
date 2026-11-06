import type { SVGProps } from 'react';

/**
 * Gyanix Brand Assets — Professional Vector Logo Mark and Wordmark
 * Signature identity:
 * - Geometric G with blue-to-violet gradient arc and circular terminal
 * - Central golden 4-point knowledge spark (Gyan / wisdom)
 * - Modern Plus Jakarta Sans wordmark
 */

export interface LogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  monochrome?: boolean;
}

/**
 * Gyanix Signature Logomark (The "G" icon with central knowledge spark)
 */
export function GyanixLogoMark({
  className,
  size = 32,
  monochrome = false,
  ...props
}: LogoProps) {
  const gradientId = 'gyanix-arc-grad';
  const sparkGradId = 'gyanix-spark-grad';

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Gyanix Logo"
      {...props}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="32"
          y1="24"
          x2="104"
          y2="104"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>

        <linearGradient
          id={sparkGradId}
          x1="48"
          y1="48"
          x2="80"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Main G arc with terminal circle */}
      <path
        d="M92.28 35.72 A40 40 0 1 0 104 64 H76"
        fill="none"
        stroke={monochrome ? 'currentColor' : `url(#${gradientId})`}
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Terminal Node */}
      <circle
        cx="92.28"
        cy="35.72"
        r="8.5"
        fill={monochrome ? 'currentColor' : '#3B82F6'}
      />

      {/* Central 4-point Knowledge Spark */}
      <path
        d="M64 47 C65.8 56.8 71.2 62.2 81 64 C71.2 65.8 65.8 71.2 64 81 C62.2 71.2 56.8 65.8 47 64 C56.8 62.2 62.2 56.8 64 47 Z"
        fill={monochrome ? 'currentColor' : `url(#${sparkGradId})`}
      />
    </svg>
  );
}

/**
 * Gyanix Horizontal Wordmark
 */
export function GyanixWordmark({
  className,
  size = 28,
  ...props
}: LogoProps) {
  return (
    <svg
      viewBox="0 0 140 36"
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Gyanix"
      {...props}
    >
      <text
        x="2"
        y="28"
        fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="30"
        fill="currentColor"
        letterSpacing="-0.035em"
      >
        Gyanix
      </text>
    </svg>
  );
}

/**
 * Full Brand Lockup (Logomark + Wordmark)
 */
export function GyanixBrand({
  className,
  markSize = 34,
  wordmarkSize = 26,
  monochrome = false,
}: {
  className?: string;
  markSize?: number | string;
  wordmarkSize?: number | string;
  monochrome?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <GyanixLogoMark size={markSize} monochrome={monochrome} className="flex-shrink-0" />
      <GyanixWordmark size={wordmarkSize} className="text-text-default flex-shrink-0" />
    </div>
  );
}

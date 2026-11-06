import { Outlet } from 'react-router-dom';
import { GyanixLogoMark, GyanixWordmark } from '@/assets/Logo.tsx';

/**
 * AuthLayout — split layout for login/register.
 * Desktop: brand panel left + form right
 * Mobile: form only
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <GyanixLogoMark size={36} monochrome className="text-primary-foreground" />
          <GyanixWordmark size={28} className="text-primary-foreground" />
        </div>

        <div>
          <blockquote className="text-2xl font-heading font-semibold leading-snug mb-4">
            "Learn together,<br />grow together."
          </blockquote>
          <p className="text-sm opacity-80 max-w-sm leading-relaxed">
            An AI-powered learning platform combining the productivity of a great notes app
            with the community energy of your favourite chat. Build real skills, with real people.
          </p>
        </div>

        <div className="text-xs opacity-60">
          © 2026 Gyanix. Free for learners.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col flex-1 items-center justify-center p-6 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <GyanixLogoMark size={36} />
          <GyanixWordmark size={26} className="text-text-default" />
        </div>

        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

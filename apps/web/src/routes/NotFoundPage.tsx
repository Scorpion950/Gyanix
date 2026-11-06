import { Link } from 'react-router-dom';
import { GyanixLogoMark } from '@/assets/Logo.tsx';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <GyanixLogoMark size={56} className="mb-6 opacity-80" />
      <h1 className="text-3xl font-heading font-bold text-text-default mb-2">Page not found</h1>
      <p className="text-sm text-text-secondary mb-8 max-w-sm">
        The page you're looking for doesn't exist or has moved. Let's get you back on track.
      </p>
      <Link
        to="/dashboard"
        className="h-10 px-5 rounded-control bg-primary text-primary-foreground text-sm font-medium flex items-center hover:bg-primary/90 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

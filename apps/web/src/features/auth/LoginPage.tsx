import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Github, Eye, EyeOff, Loader2 } from 'lucide-react';
import { LoginSchema, type LoginInput } from '@gyanix/shared';
import { supabase } from '@/lib/supabase.ts';
import { cn } from '@/lib/utils.ts';

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    mode: 'onBlur',
  });

  async function handleEmailLogin(data: LoginInput) {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      // Plain-language error messages — no internal details
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Incorrect email or password. Please check your details and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Please verify your email address before signing in. Check your inbox.');
      } else if (error.message.includes('rate limit')) {
        toast.error('Too many sign-in attempts. Please wait a few minutes and try again.');
      } else {
        toast.error('Sign-in failed. Please try again.');
      }
      return;
    }

    navigate('/dashboard', { replace: true });
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(`Could not sign in with ${provider === 'google' ? 'Google' : 'GitHub'}. Please try again.`);
      setOauthLoading(null);
    }
    // On success, Supabase redirects — no need to handle
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-text-default mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-text-secondary">
          Pick up where you left off.
        </p>
      </div>

      {/* OAuth buttons — first */}
      <div className="space-y-3 mb-6">
        <OAuthButton
          provider="google"
          loading={oauthLoading === 'google'}
          onClick={() => handleOAuth('google')}
        />
        <OAuthButton
          provider="github"
          loading={oauthLoading === 'github'}
          onClick={() => handleOAuth('github')}
        />
      </div>

      <Divider />

      {/* Email form */}
      <form onSubmit={handleSubmit(handleEmailLogin)} noValidate className="space-y-4">
        <FormField label="Email address" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass(!!errors.email)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-xs text-danger" role="alert">
              {errors.email.message}
            </p>
          )}
        </FormField>

        <FormField label="Password" error={errors.password?.message}>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              className={cn(inputClass(!!errors.password), 'pr-10')}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-default transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1 text-xs text-danger" role="alert">
              {errors.password.message}
            </p>
          )}
        </FormField>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full h-10 rounded-control font-medium text-sm',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 active:bg-primary/80',
            'transition-colors duration-micro',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2',
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-text-muted">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="text-primary hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Create one — it's free
        </Link>
      </p>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return cn(
    'w-full h-10 px-3 rounded-control text-sm bg-background border',
    'text-text-default placeholder:text-text-muted',
    'transition-colors duration-micro focus:outline-none',
    'focus:ring-2 focus:ring-primary focus:ring-offset-0',
    hasError
      ? 'border-danger focus:ring-danger'
      : 'border-border focus:border-primary',
  );
}

function FormField({
  label,
  error: _error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="px-3 bg-background text-xs text-text-muted">or continue with email</span>
      </div>
    </div>
  );
}

function OAuthButton({
  provider,
  loading,
  onClick,
}: {
  provider: 'google' | 'github';
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'w-full h-10 rounded-control border border-border bg-surface',
        'text-sm text-text-default font-medium',
        'flex items-center justify-center gap-2.5',
        'hover:bg-surface-subtle transition-colors duration-micro',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
      aria-label={`Continue with ${provider === 'google' ? 'Google' : 'GitHub'}`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : provider === 'google' ? (
        <GoogleIcon />
      ) : (
        <Github size={16} strokeWidth={1.5} />
      )}
      Continue with {provider === 'google' ? 'Google' : 'GitHub'}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

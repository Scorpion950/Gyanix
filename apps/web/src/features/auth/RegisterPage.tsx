import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Github, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { RegisterSchema, type RegisterInput } from '@gyanix/shared';
import { supabase } from '@/lib/supabase.ts';
import { cn } from '@/lib/utils.ts';
import { useQuery } from '@tanstack/react-query';

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [usernameInput, setUsernameInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    mode: 'onBlur',
  });

  const password = watch('password', '');
  const username = watch('username', '');

  // Debounced username availability check
  const { data: usernameCheck, isFetching: checkingUsername } = useQuery({
    queryKey: ['username-check', username],
    queryFn: async () => {
      if (!username || username.length < 3) return null;
      const apiUrl = import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001/api';
      const res = await fetch(`${apiUrl}/users/check-username/${username}`);
      const json = await res.json() as { success: boolean; data?: { available: boolean } };
      return json.data?.available ?? null;
    },
    enabled: username.length >= 3,
    staleTime: 10_000,
  });

  const passwordStrength = getPasswordStrength(password);

  async function handleEmailRegister(data: RegisterInput) {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.displayName,
          preferred_username: data.username,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        toast.error('An account with this email already exists. Try signing in instead.');
      } else if (error.message.includes('rate limit')) {
        toast.error('Too many sign-up attempts. Please wait a few minutes and try again.');
      } else {
        toast.error('Account creation failed. Please try again.');
      }
      return;
    }

    toast.success('Account created! Check your email to verify your address.');
    navigate('/dashboard', { replace: true });
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error(`Could not sign up with ${provider === 'google' ? 'Google' : 'GitHub'}. Please try again.`);
      setOauthLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-text-default mb-2">
          Create your account
        </h1>
        <p className="text-sm text-text-secondary">
          Free forever. No credit card required.
        </p>
      </div>

      {/* OAuth first */}
      <div className="space-y-3 mb-6">
        <OAuthButton provider="google" loading={oauthLoading === 'google'} onClick={() => handleOAuth('google')} />
        <OAuthButton provider="github" loading={oauthLoading === 'github'} onClick={() => handleOAuth('github')} />
      </div>

      <Divider />

      <form onSubmit={handleSubmit(handleEmailRegister)} noValidate className="space-y-4">
        {/* Display name */}
        <FormField label="Your name" error={errors.displayName?.message}>
          <input
            {...register('displayName')}
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
            className={inputClass(!!errors.displayName)}
          />
        </FormField>

        {/* Username */}
        <FormField label="Username" error={errors.username?.message}>
          <div className="relative">
            <input
              {...register('username')}
              type="text"
              autoComplete="username"
              placeholder="ada_lovelace"
              className={cn(inputClass(!!errors.username), 'pr-9')}
            />
            {/* Availability indicator */}
            {username.length >= 3 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {checkingUsername ? (
                  <Loader2 size={14} className="animate-spin text-text-muted" />
                ) : usernameCheck === true ? (
                  <Check size={14} className="text-success" />
                ) : usernameCheck === false ? (
                  <X size={14} className="text-danger" />
                ) : null}
              </span>
            )}
          </div>
          {username.length >= 3 && !checkingUsername && usernameCheck === false && (
            <p className="mt-1 text-xs text-danger">That username is taken. Try another.</p>
          )}
        </FormField>

        {/* Email */}
        <FormField label="Email address" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass(!!errors.email)}
          />
        </FormField>

        {/* Password */}
        <FormField label="Password" error={errors.password?.message}>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a strong password"
              className={cn(inputClass(!!errors.password), 'pr-10')}
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
          {/* Password strength indicator */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-200',
                      passwordStrength.score >= level
                        ? strengthColor(passwordStrength.score)
                        : 'bg-border',
                    )}
                  />
                ))}
              </div>
              <p className="text-2xs text-text-muted">{passwordStrength.label}</p>
            </div>
          )}
        </FormField>

        <button
          type="submit"
          disabled={isSubmitting || usernameCheck === false}
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
            <><Loader2 size={16} className="animate-spin" />Creating account…</>
          ) : (
            'Create account'
          )}
        </button>

        <p className="text-2xs text-center text-text-muted">
          By creating an account, you agree to our{' '}
          <a href="/terms" className="text-primary hover:underline">Terms</a> and{' '}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
      </form>

      <p className="mt-6 text-center text-xs text-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return cn(
    'w-full h-10 px-3 rounded-control text-sm bg-background border',
    'text-text-default placeholder:text-text-muted',
    'transition-colors duration-micro focus:outline-none',
    'focus:ring-2 focus:ring-primary focus:ring-offset-0',
    hasError ? 'border-danger focus:ring-danger' : 'border-border focus:border-primary',
  );
}

function FormField({ label, error: _err, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
      {_err && <p className="mt-1 text-xs text-danger" role="alert">{_err}</p>}
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
        <span className="px-3 bg-background text-xs text-text-muted">or sign up with email</span>
      </div>
    </div>
  );
}

function OAuthButton({ provider, loading, onClick }: { provider: 'google' | 'github'; loading: boolean; onClick: () => void }) {
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
      aria-label={`Sign up with ${provider === 'google' ? 'Google' : 'GitHub'}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : provider === 'github' ? <Github size={16} strokeWidth={1.5} /> : <GoogleIcon />}
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

interface PasswordStrength { score: number; label: string; }
function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score - 1] ?? 'Too short' };
}
function strengthColor(score: number) {
  return score <= 1 ? 'bg-danger' : score === 2 ? 'bg-warning' : score === 3 ? 'bg-success' : 'bg-primary';
}

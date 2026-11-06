/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ─── Design Tokens (match globals.css CSS variables) ──────────────────
      colors: {
        // Surface
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        'surface-raised': 'hsl(var(--surface-raised))',
        'surface-subtle': 'hsl(var(--surface-subtle))',
        border: 'hsl(var(--border))',
        // Text
        'text-default': 'hsl(var(--text))',
        'text-secondary': 'hsl(var(--text-secondary))',
        'text-muted': 'hsl(var(--text-muted))',
        // Brand
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // AI
        ai: {
          DEFAULT: 'hsl(var(--ai))',
          foreground: 'hsl(var(--ai-foreground))',
        },
        // Status
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
        },
        // Progress metrics
        'progress-learning': 'hsl(var(--progress-learning))',
        'progress-knowledge': 'hsl(var(--progress-knowledge))',
        'progress-practical': 'hsl(var(--progress-practical))',
        // Streak/achievement
        streak: 'hsl(var(--streak))',
        // shadcn compatibility aliases
        card: {
          DEFAULT: 'hsl(var(--surface))',
          foreground: 'hsl(var(--text))',
        },
        popover: {
          DEFAULT: 'hsl(var(--surface-raised))',
          foreground: 'hsl(var(--text))',
        },
        muted: {
          DEFAULT: 'hsl(var(--surface-subtle))',
          foreground: 'hsl(var(--text-muted))',
        },
        accent: {
          DEFAULT: 'hsl(var(--surface-subtle))',
          foreground: 'hsl(var(--text))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
        },
        input: 'hsl(var(--border))',
        ring: 'hsl(var(--primary))',
      },

      // ─── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta SansVariable"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px - captions only
        xs:   ['0.875rem', { lineHeight: '1.25rem' }],   // 14px - min UI text
        sm:   ['1rem', { lineHeight: '1.5rem' }],         // 16px - base
        md:   ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
        lg:   ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        xl:   ['1.5rem', { lineHeight: '2rem' }],         // 24px
        '2xl': ['1.875rem', { lineHeight: '2.25rem' }],  // 30px
        '3xl': ['2.25rem', { lineHeight: '2.5rem' }],    // 36px
        '4xl': ['3rem', { lineHeight: '1' }],             // 48px
      },

      // ─── Spacing (4px base grid) ──────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',  // 18px
        '13': '3.25rem',    // 52px
        '15': '3.75rem',    // 60px
        '18': '4.5rem',     // 72px (collapsed sidebar)
        '33': '8.25rem',    // 132px
        '66': '16.5rem',    // 264px (expanded sidebar)
        '80': '20rem',      // 320px (right panel min)
        '100': '25rem',     // 400px (right panel max)
      },

      // ─── Border Radius ────────────────────────────────────────────────────
      borderRadius: {
        'control': '0.5rem',   // 8px — controls, inputs
        'card': '0.75rem',     // 12px — cards
        'modal': '1rem',       // 16px — modals, sheets
        lg: '0.75rem',         // shadcn alias → card
        md: '0.5rem',          // shadcn alias → control
        sm: '0.375rem',        // 6px
      },

      // ─── Breakpoints ──────────────────────────────────────────────────────
      screens: {
        'xs': '360px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },

      // ─── Box Shadow ───────────────────────────────────────────────────────
      // Minimal — use surface layering in dark mode
      boxShadow: {
        'popover': '0 4px 24px -4px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        'card': 'none',       // cards use border only
        'none': 'none',
      },

      // ─── Animation ────────────────────────────────────────────────────────
      transitionDuration: {
        'micro': '120ms',
        'default': '200ms',
        'panel': '320ms',
      },
      transitionTimingFunction: {
        'enter': 'cubic-bezier(0, 0, 0.2, 1)',  // ease-out
        'exit': 'cubic-bezier(0.4, 0, 1, 1)',   // ease-in
      },

      // ─── Max width for reading ────────────────────────────────────────────
      maxWidth: {
        'page': '1280px',
        'reading': '720px',
        'feed': '680px',
      },
    },
  },
  plugins: [],
};

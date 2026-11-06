import { useThemeStore } from '@/stores/themeStore.ts';
import { GyanixLogoMark, GyanixWordmark, GyanixBrand } from '@/assets/Logo.tsx';

/**
 * Design System route — /design-system
 * Shows all tokens and components in both themes.
 * Dev-only; optionally admin-only in production.
 */
export function DesignSystemPage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-background p-8 space-y-12">
      <div className="max-w-page mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-heading font-bold text-text-default">Design System</h1>
            <p className="text-sm text-text-secondary mt-1">Gyanix — tokens, components and states</p>
          </div>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-3 h-8 rounded-control text-xs font-medium border transition-colors ${
                  theme === t
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-surface text-text-secondary border-border hover:bg-surface-subtle'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Brand & Logo Assets */}
        <Section title="Brand Assets & Logo Identity">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl border border-border bg-surface">
            {/* Full Brand Lockup */}
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-surface-subtle border border-border space-y-3">
              <GyanixBrand markSize={44} wordmarkSize={30} />
              <p className="text-2xs font-mono text-text-muted">Primary Brand Lockup</p>
            </div>

            {/* Signature Logomark */}
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-surface-subtle border border-border space-y-3">
              <div className="flex items-center gap-4">
                <GyanixLogoMark size={32} />
                <GyanixLogoMark size={44} />
                <GyanixLogoMark size={56} />
              </div>
              <p className="text-2xs font-mono text-text-muted">Signature Logomark (Multi-Scale)</p>
            </div>

            {/* Dark & Monochrome Variations */}
            <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-[#0B0E14] text-white border border-[#232B3B] space-y-3">
              <div className="flex items-center gap-4">
                <GyanixLogoMark size={40} />
                <GyanixWordmark size={26} className="text-white" />
              </div>
              <p className="text-2xs font-mono text-slate-400">Dark Container Contrast</p>
            </div>
          </div>
        </Section>

        {/* Colour tokens */}
        <Section title="Colour Tokens">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { name: 'background', cls: 'bg-background border border-border' },
              { name: 'surface', cls: 'bg-surface border border-border' },
              { name: 'surface-raised', cls: 'bg-surface-raised border border-border' },
              { name: 'surface-subtle', cls: 'bg-surface-subtle border border-border' },
              { name: 'primary', cls: 'bg-primary' },
              { name: 'ai (violet)', cls: 'bg-ai' },
              { name: 'success', cls: 'bg-success' },
              { name: 'warning', cls: 'bg-warning' },
              { name: 'danger', cls: 'bg-danger' },
              { name: 'progress-learning', cls: 'bg-progress-learning' },
              { name: 'progress-knowledge', cls: 'bg-progress-knowledge' },
              { name: 'progress-practical', cls: 'bg-progress-practical' },
              { name: 'streak', cls: 'bg-streak' },
            ].map((token) => (
              <div key={token.name} className="space-y-1.5">
                <div className={`h-12 rounded-card ${token.cls}`} />
                <p className="text-2xs font-mono text-text-secondary">{token.name}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="space-y-3 max-w-reading">
            {[
              { size: 'text-4xl font-heading', label: '48px heading' },
              { size: 'text-3xl font-heading', label: '36px heading' },
              { size: 'text-2xl font-heading', label: '30px heading' },
              { size: 'text-xl font-heading', label: '24px heading' },
              { size: 'text-lg', label: '20px body large' },
              { size: 'text-md', label: '18px body medium' },
              { size: 'text-sm', label: '16px body base' },
              { size: 'text-xs', label: '14px UI text (minimum)' },
              { size: 'text-2xs font-mono', label: '12px mono — captions only' },
            ].map((t) => (
              <div key={t.label} className="flex items-baseline gap-4">
                <span className={`${t.size} text-text-default`}>Aa</span>
                <span className="text-2xs text-text-muted font-mono">{t.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Lecture status icons */}
        <Section title="Lecture Status Icons">
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Not Started', color: 'text-text-muted' },
              { label: 'Watching', color: 'text-primary' },
              { label: 'Completed', color: 'text-success' },
              { label: 'On Hold', color: 'text-streak' },
              { label: 'Skipped', color: 'text-text-secondary' },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-2 text-xs ${s.color}`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                {s.label}
              </div>
            ))}
          </div>
        </Section>

        {/* Difficulty dots */}
        <Section title="Difficulty Levels">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <div key={level} className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <span
                      key={dot}
                      className={`difficulty-dot ${dot <= level ? 'difficulty-dot-filled' : 'difficulty-dot-empty'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-text-secondary">
                  {['Absolute Beginner', 'Beginner', 'Intermediate', 'Advanced', 'Expert'][level - 1]}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Timestamp chip */}
        <Section title="Timestamp Chip">
          <div className="flex flex-wrap gap-2">
            {['12:34', '1:05:22', '00:45', '23:59'].map((ts) => (
              <button key={ts} className="timestamp-chip">{ts}</button>
            ))}
          </div>
        </Section>

        {/* AI surface */}
        <Section title="AI Surface">
          <div className="ai-surface border rounded-card p-4 max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-ai">✦ AI-generated</span>
              <span className="text-2xs text-text-muted">— may contain errors</span>
            </div>
            <p className="text-sm text-text-default">
              This surface is used for all AI-generated content. It uses a faint violet background
              and always shows the AI label.
            </p>
          </div>
        </Section>

        {/* Progress bars */}
        <Section title="Progress Metrics">
          <div className="space-y-3 max-w-sm">
            {[
              { label: 'Learning Progress', cls: 'bg-progress-learning', value: 65 },
              { label: 'Knowledge Progress', cls: 'bg-progress-knowledge', value: 48 },
              { label: 'Practical Progress', cls: 'bg-progress-practical', value: 30 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-text-secondary">{m.label}</span>
                  <span className="text-xs tabular-nums text-text-muted">{m.value}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-bar-fill ${m.cls}`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-heading font-semibold text-text-default mb-4 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
  );
}

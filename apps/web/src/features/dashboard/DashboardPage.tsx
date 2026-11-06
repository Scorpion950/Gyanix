import { useAuthStore } from '@/stores/authStore.ts';

/**
 * Dashboard shell — Phase 1A skeleton.
 * Full dashboard (Continue Learning, stats, AI recommendations) is built in Phase 1B.
 */
export function DashboardPage() {
  const { session } = useAuthStore();
  const email = session?.user.email ?? 'learner';
  const firstName = email.split('@')[0] ?? 'learner';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-text-default">
          Good morning, {firstName} 👋
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Your learning dashboard is being set up. More features arrive in Phase 1B.
        </p>
      </div>

      {/* Placeholder cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Continue Learning', desc: 'Pick up where you left off.', soon: true },
          { label: 'Learning Paths', desc: 'Manage your YouTube-based courses.', soon: true },
          { label: 'Notes', desc: 'Your lecture-linked notes library.', soon: true },
          { label: 'Practice', desc: 'Coding environment and tracker.', soon: true },
          { label: 'Community', desc: 'Feed, communities and projects.', soon: true },
          { label: 'Study Rooms', desc: 'Watch together and collaborate.', soon: true },
        ].map((card) => (
          <div
            key={card.label}
            className="p-5 rounded-card border border-border bg-surface"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-sm font-semibold text-text-default">{card.label}</h2>
              {card.soon && (
                <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted">
                  Coming soon
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

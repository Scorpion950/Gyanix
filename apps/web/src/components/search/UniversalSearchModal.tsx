import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  BookOpen,
  Code2,
  FileText,
  Users,
  Loader2,
  Sparkles,
  FolderKanban,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore.ts';

interface SearchResult {
  type: 'path' | 'problem' | 'note' | 'community' | 'user' | 'roadmap';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UniversalSearchModal({ isOpen, onClose }: UniversalSearchModalProps) {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ESC listener with capture phase so it works anywhere clicked
  useEffect(() => {
    if (!isOpen) return;

    // Prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    setTimeout(() => inputRef.current?.focus(), 50);
    setQuery('');
    setResults([]);
    setSelectedIndex(0);

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    // Use capture phase (true) on both window and document so ESC is caught regardless of what element currently has focus
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        });
        const data = await res.json();
        if (data.success && data.data) {
          setResults(data.data);
          setSelectedIndex(0);
        }
      } catch {
        // In-memory local search fallback across core sections
        const q = query.toLowerCase();
        const fallbackResults: SearchResult[] = [
          { type: 'path' as const, id: 'p1', title: 'Full-Stack Engineering & Microservices', subtitle: 'Course & Video Lectures', url: '/learning' },
          { type: 'problem' as const, id: 'pr1', title: 'Two Sum & Hash Table Lookups', subtitle: 'Practice Problem • Easy', url: '/practice' },
          { type: 'roadmap' as const, id: 'r1', title: `${query} Mastery Curriculum`, subtitle: 'AI Roadmap Generator', url: '/roadmaps' },
          { type: 'note' as const, id: 'n1', title: `Notes matching "${query}"`, subtitle: 'Personal Notes & Snippets', url: '/notes' },
          { type: 'community' as const, id: 'c1', title: 'Systems & Backend Architecture', subtitle: 'Learning Community', url: '/communities' },
        ].filter(r => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));

        setResults(fallbackResults);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, session?.access_token]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].url);
      onClose();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'path':
        return <BookOpen className="w-4 h-4 text-primary" />;
      case 'problem':
        return <Code2 className="w-4 h-4 text-[#EA580C] dark:text-[#FB923C]" />;
      case 'note':
        return <FileText className="w-4 h-4 text-[#0D9488] dark:text-[#2DD4BF]" />;
      case 'roadmap':
        return <Sparkles className="w-4 h-4 text-primary" />;
      case 'community':
        return <Users className="w-4 h-4 text-ai" />;
      case 'project':
        return <FolderKanban className="w-4 h-4 text-indigo-400" />;
      case 'user':
      default:
        return <Users className="w-4 h-4 text-text-muted" />;
    }
  };

  const scopePills = [
    { label: 'Paths & Lectures', query: 'Path', url: '/learning' },
    { label: 'Problems', query: 'Problem', url: '/practice' },
    { label: 'Notes', query: 'Note', url: '/notes' },
    { label: 'AI Roadmaps', query: 'Roadmap', url: '/roadmaps' },
    { label: 'Communities', query: 'Community', url: '/communities' },
    { label: 'Projects', query: 'Project', url: '/projects' },
    { label: 'Users', query: 'User', url: '/communities' },
  ];

  const quickRecommendations = [
    {
      title: 'Curated Learning Paths & Courses',
      subtitle: 'Browse interactive syllabi with structured YouTube lecture milestones',
      icon: <BookOpen className="w-4 h-4 text-primary" />,
      url: '/learning',
      badge: 'Courses',
    },
    {
      title: 'DSA & LeetCode Practice Tracker',
      subtitle: 'Solve algorithmic challenges, track runtimes, and inspect solutions',
      icon: <Code2 className="w-4 h-4 text-amber-400" />,
      url: '/practice',
      badge: 'Coding',
    },
    {
      title: 'Notes Library & Code Snippets',
      subtitle: 'Access your auto-saved markdown notes, lecture thoughts, and snippets',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      url: '/notes',
      badge: 'Notes',
    },
    {
      title: 'AI Curriculum & Roadmap Synthesizer',
      subtitle: 'Generate customized engineering roadmaps with curated video recommendations',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      url: '/roadmaps',
      badge: 'AI Engine',
    },
    {
      title: 'Engineering Topic Communities',
      subtitle: 'Connect with peers in systems, full-stack, ML, and algorithms hubs',
      icon: <Users className="w-4 h-4 text-sky-400" />,
      url: '/communities',
      badge: 'Community',
    },
    {
      title: 'Open Source Capstone & Project Showcase',
      subtitle: 'Publish code repositories and collect architectural peer reviews',
      icon: <FolderKanban className="w-4 h-4 text-indigo-400" />,
      url: '/projects',
      badge: 'Showcase',
    },
  ];

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4 bg-black/25 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        className="relative w-full max-w-3xl rounded-2xl border border-border bg-surface-raised shadow-2xl overflow-hidden flex flex-col z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar (Rounded Pill Container) */}
        <div className="p-4 border-b border-border/60">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-border/80 bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search learning paths, problems, notes, roadmaps, communities, projects, users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-sm text-text border-none outline-none focus:outline-none focus:ring-0 placeholder:text-text-muted"
            />
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            ) : (
              <button
                onClick={onClose}
                className="px-2 py-0.5 rounded-full text-2xs font-mono border border-border bg-surface-subtle text-text-muted hover:text-text-default hover:bg-surface transition-colors cursor-pointer shrink-0"
                title="Press ESC to close"
              >
                ESC
              </button>
            )}
          </div>
        </div>

        {/* Quick Clickable Scope Pills */}
        <div className="px-4 py-2 border-b border-border/50 bg-surface flex flex-wrap items-center gap-1.5 text-2xs text-text-muted">
          <span className="font-semibold text-text-secondary mr-1">Search across:</span>
          {scopePills.map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => {
                setQuery(pill.query);
                inputRef.current?.focus();
              }}
              className="px-2.5 py-0.5 rounded-full bg-surface-subtle border border-border/70 text-text-secondary hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer font-medium active:scale-95"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim() && results.length === 0 && !loading && (
            <div className="p-8 text-center text-xs text-text-muted">
              No matching learning resources found for "{query}". Try a different keyword or click one of the pills above.
            </div>
          )}

          {!query.trim() && (
            <div className="p-3 space-y-2">
              <div className="px-2 pt-1 pb-2 flex items-center justify-between text-2xs font-semibold text-text-muted uppercase tracking-wider">
                <span>Recommended Quick Jumps</span>
                <span className="font-normal lowercase">Click to open</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickRecommendations.map((rec) => (
                  <button
                    key={rec.title}
                    type="button"
                    onClick={() => {
                      navigate(rec.url);
                      onClose();
                    }}
                    className="flex items-start gap-3 p-2.5 rounded-xl border border-border/60 bg-surface hover:bg-surface-subtle hover:border-primary/40 text-left transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      {rec.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-text group-hover:text-primary transition-colors truncate">
                          {rec.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-subtle text-text-muted border border-border/50 shrink-0">
                          {rec.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-snug line-clamp-2 mt-0.5">
                        {rec.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.map((res, idx) => (
            <button
              key={`${res.type}-${res.id}`}
              onClick={() => {
                navigate(res.url);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                selectedIndex === idx
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'hover:bg-surface-subtle text-text'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                  {getIcon(res.type)}
                </div>
                <div className="min-w-0">
                  <span className="font-bold block truncate text-text">{res.title}</span>
                  <span className="text-[11px] text-text-secondary block truncate">
                    {res.subtitle}
                  </span>
                </div>
              </div>

              <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted ml-2 shrink-0">
                {res.type}
              </span>
            </button>
          ))}
        </div>

        {/* Keyboard Footer */}
        <div className="px-4 py-2 border-t border-border bg-surface-subtle/50 flex items-center justify-between text-2xs text-text-muted">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Gyanix Universal Search</span>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

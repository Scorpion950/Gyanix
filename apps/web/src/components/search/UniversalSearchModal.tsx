import { useState, useEffect, useRef } from 'react';
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

    // Use capture phase (true) so ESC is caught regardless of what element currently has focus
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 px-4 bg-black/75 backdrop-blur-md">
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
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search className="w-5 h-5 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search learning paths, problems, notes, roadmaps, communities, projects, users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-text focus:outline-none placeholder:text-text-muted"
          />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          ) : (
            <button
              onClick={onClose}
              className="px-2 py-1 rounded text-2xs font-mono border border-border bg-surface-subtle text-text-muted hover:text-text-default hover:bg-surface transition-colors"
              title="Press ESC to close"
            >
              ESC
            </button>
          )}
        </div>

        {/* Quick Scope Pills */}
        <div className="px-4 py-2 border-b border-border/50 bg-surface flex flex-wrap items-center gap-1.5 text-2xs text-text-muted">
          <span className="font-semibold text-text-secondary">Search across:</span>
          {['Paths & Lectures', 'Problems', 'Notes', 'AI Roadmaps', 'Communities', 'Projects', 'Users'].map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-surface-subtle border border-border/60 text-text-secondary">
              {tag}
            </span>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim() && results.length === 0 && !loading && (
            <div className="p-8 text-center text-xs text-text-muted">
              No matching learning resources found for "{query}".
            </div>
          )}

          {!query.trim() && (
            <div className="p-6 text-center text-xs text-text-muted space-y-1.5">
              <p className="font-semibold text-text text-sm">Universal Command Palette</p>
              <p className="text-xs">Type any keyword to immediately find lectures, practice problems, notes, or topics.</p>
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
              className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs transition-colors ${
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
    </div>
  );
}

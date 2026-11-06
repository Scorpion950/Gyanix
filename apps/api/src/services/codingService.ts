import { supabaseAdmin } from '../config/supabase.js';
import { aiRegistry } from '../ai/registry.js';
import { privacyFilter } from '../ai/privacyFilter.js';
import { DSA_PROBLEMS_CATALOG, type DSAProblem } from './dsaProblemsData.js';
import type {
  CreatePracticeEntryInput,
  UpdatePracticeEntryInput,
  SubmitCodeInput,
  CreateSnippetInput,
  UpdateSnippetInput,
  AICodingAssistInput,
} from '@gyanix/shared';

// In-memory fallback for practice entries
const inMemoryPractice = new Map<string, any[]>();
const inMemorySnippets = new Map<string, any[]>();

export const codingService = {
  // Pre-seed some popular starter problems
  async listProblems(filters?: { category?: string | undefined; difficulty?: number | undefined; search?: string | undefined }) {
    try {
      let query = supabaseAdmin
        .from('coding_problems')
        .select('id, title, slug, category, difficulty, acceptance_rate, tags, is_daily_challenge')
        .order('difficulty', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (_err) {}

    let list = DSA_PROBLEMS_CATALOG;
    if (filters?.category && filters.category !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.difficulty) {
      list = list.filter((p) => p.difficulty === filters.difficulty);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  },

  async getProblemBySlug(slug: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('coding_problems')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!error && data) return data;
    } catch (_err) {}

    const found = DSA_PROBLEMS_CATALOG.find((p) => p.slug === slug);
    if (found) {
      return {
        ...found,
        starter_code: found.starter_templates,
      };
    }

    return {
      id: 'prob-' + slug,
      title: slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      slug,
      description: 'Implement an optimal solution with documented time and space complexity tradeoffs.',
      category: 'Algorithms',
      difficulty: 2,
      starter_code: {
        javascript: 'function solve(nums) {\n  // Write your code here\n}',
        python: 'def solve(nums):\n    # Write your code here\n    pass',
      },
      acceptance_rate: 48.0,
      tags: ['Algorithm', 'Data Structure'],
    };
  },

  /**
   * List user's practice tracker entries
   */
  async listPracticeEntries(userId: string, filters?: { status?: string | undefined; category?: string | undefined }) {
    try {
      let query = supabaseAdmin
        .from('practice_entries')
        .select('*')
        .eq('user_id', userId)
        .order('last_practiced_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (_err) {}

    let list = inMemoryPractice.get(userId) || [];
    if (filters?.status) list = list.filter((e) => e.status === filters.status);
    if (filters?.category) list = list.filter((e) => e.category === filters.category);
    return list;
  },

  /**
   * Create practice entry (for both internal and external problems like LeetCode)
   */
  async createPracticeEntry(userId: string, input: CreatePracticeEntryInput) {
    try {
      const { data, error } = await supabaseAdmin
        .from('practice_entries')
        .insert({
          user_id: userId,
          problem_id: input.problemId || null,
          external_url: input.externalUrl || null,
          title: input.title,
          platform: input.platform,
          category: input.category,
          difficulty: input.difficulty,
          status: input.status,
          time_spent_seconds: input.timeSpentSeconds,
          solution_notes: input.solutionNotes || null,
          language: input.language,
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch (_err) {}

    const newEntry = {
      id: 'entry-' + Date.now(),
      user_id: userId,
      problem_id: input.problemId || null,
      external_url: input.externalUrl || null,
      title: input.title,
      platform: input.platform || 'LeetCode',
      category: input.category || 'General',
      difficulty: input.difficulty || 2,
      status: input.status || 'solved',
      time_spent_seconds: input.timeSpentSeconds || 1200,
      solution_notes: input.solutionNotes || null,
      language: input.language || 'javascript',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_practiced_at: new Date().toISOString(),
    };

    const userEntries = inMemoryPractice.get(userId) || [];
    userEntries.unshift(newEntry);
    inMemoryPractice.set(userId, userEntries);
    return newEntry;
  },

  /**
   * Update practice entry
   */
  async updatePracticeEntry(userId: string, entryId: string, input: UpdatePracticeEntryInput) {
    try {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
        last_practiced_at: new Date().toISOString(),
      };
      if (input.status) updates['status'] = input.status;
      if (input.timeSpentSeconds !== undefined) updates['time_spent_seconds'] = input.timeSpentSeconds;
      if (input.solutionNotes !== undefined) updates['solution_notes'] = input.solutionNotes;
      if (input.difficulty) updates['difficulty'] = input.difficulty;
      if (input.category) updates['category'] = input.category;

      const { data, error } = await supabaseAdmin
        .from('practice_entries')
        .update(updates)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) return data;
    } catch (_err) {}

    const userEntries = inMemoryPractice.get(userId) || [];
    const entry = userEntries.find((e) => e.id === entryId);
    if (entry) {
      if (input.status) entry.status = input.status;
      if (input.timeSpentSeconds !== undefined) entry.time_spent_seconds = input.timeSpentSeconds;
      if (input.solutionNotes !== undefined) entry.solution_notes = input.solutionNotes;
      if (input.difficulty) entry.difficulty = input.difficulty;
      if (input.category) entry.category = input.category;
      entry.updated_at = new Date().toISOString();
      return entry;
    }
    return { id: entryId, ...input, updated_at: new Date().toISOString() };
  },

  /**
   * Delete practice entry
   */
  async deletePracticeEntry(userId: string, entryId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('practice_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

      if (!error) return true;
    } catch (_err) {}

    const userEntries = inMemoryPractice.get(userId) || [];
    inMemoryPractice.set(userId, userEntries.filter((e) => e.id !== entryId));
    return true;
  },

  /**
   * Record a code submission attempt
   */
  async submitSolution(userId: string, input: SubmitCodeInput) {
    try {
      const { data, error } = await supabaseAdmin
        .from('coding_submissions')
        .insert({
          user_id: userId,
          problem_id: input.problemId,
          language: input.language,
          code: input.code,
          status: input.status,
          execution_time_ms: input.executionTimeMs,
          passed_tests: input.passedTests,
          total_tests: input.totalTests,
          stdout: input.stdout || null,
          error_message: input.errorMessage || null,
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch (_err) {}

    return {
      id: 'sub-' + Date.now(),
      user_id: userId,
      problem_id: input.problemId,
      language: input.language,
      code: input.code,
      status: input.status,
      execution_time_ms: input.executionTimeMs,
      passed_tests: input.passedTests,
      total_tests: input.totalTests,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * User code snippets
   */
  async listSnippets(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('code_snippets')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data) return data;
    } catch (_err) {}

    return inMemorySnippets.get(userId) || [];
  },

  async createSnippet(userId: string, input: CreateSnippetInput) {
    try {
      const { data, error } = await supabaseAdmin
        .from('code_snippets')
        .insert({
          user_id: userId,
          title: input.title,
          language: input.language,
          code: input.code,
          is_public: input.isPublic,
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch (_err) {}

    const snippet = {
      id: 'snip-' + Date.now(),
      user_id: userId,
      title: input.title,
      language: input.language,
      code: input.code,
      is_public: input.isPublic,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const list = inMemorySnippets.get(userId) || [];
    list.unshift(snippet);
    inMemorySnippets.set(userId, list);
    return snippet;
  },

  async updateSnippet(userId: string, snippetId: string, input: UpdateSnippetInput) {
    try {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (input.title !== undefined) updates['title'] = input.title;
      if (input.language !== undefined) updates['language'] = input.language;
      if (input.code !== undefined) updates['code'] = input.code;
      if (input.isPublic !== undefined) updates['is_public'] = input.isPublic;

      const { data, error } = await supabaseAdmin
        .from('code_snippets')
        .update(updates)
        .eq('id', snippetId)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) return data;
    } catch (_err) {}

    const list = inMemorySnippets.get(userId) || [];
    const item = list.find((s) => s.id === snippetId);
    if (item) {
      if (input.title !== undefined) item.title = input.title;
      if (input.language !== undefined) item.language = input.language;
      if (input.code !== undefined) item.code = input.code;
      if (input.isPublic !== undefined) item.is_public = input.isPublic;
      item.updated_at = new Date().toISOString();
      return item;
    }
    return { id: snippetId, ...input };
  },

  async deleteSnippet(userId: string, snippetId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('code_snippets')
        .delete()
        .eq('id', snippetId)
        .eq('user_id', userId);

      if (!error) return true;
    } catch (_err) {}

    const list = inMemorySnippets.get(userId) || [];
    inMemorySnippets.set(userId, list.filter((s) => s.id !== snippetId));
    return true;
  },

  /**
   * Progressive 4-Step AI Coding Assistant
   */
  async aiCodingAssist(userId: string, input: AICodingAssistInput) {
    try {
      const adapter = aiRegistry.getAdapter();
      const sanitizedCode = privacyFilter.sanitizeText(input.userCode);
      const sanitizedTitle = privacyFilter.sanitizeText(input.problemTitle);
      const sanitizedDesc = privacyFilter.sanitizeText(input.problemDescription);

      let systemInstruction = '';
      let userPrompt = '';

      switch (input.step) {
        case 1:
          systemInstruction = `You are a calm, pedagogical senior software engineer. The user is writing ${input.language} for "${sanitizedTitle}". Explain the runtime or logical error in clear, concise terms WITHOUT providing the corrected code.`;
          userPrompt = `Problem: ${sanitizedDesc}\nError: ${input.errorMessage || 'No error message provided'}\nCode:\n${sanitizedCode}`;
          break;
        case 2:
          systemInstruction = `Provide a small conceptual hint or an edge-case to consider (e.g. empty inputs, duplicates, boundaries). Do NOT give code.`;
          userPrompt = `Problem: ${sanitizedTitle}\nCode:\n${sanitizedCode}`;
          break;
        case 3:
          systemInstruction = `Describe two distinct algorithmic approaches to solve "${sanitizedTitle}". Compare their Time and Space complexity (Big-O).`;
          userPrompt = `Problem: ${sanitizedTitle}`;
          break;
        case 4:
        default:
          systemInstruction = `Provide an optimal, clean, well-commented solution in ${input.language} for "${sanitizedTitle}". Explain line-by-line with complexity.`;
          userPrompt = `Problem: ${sanitizedTitle}\nDescription: ${sanitizedDesc}`;
          break;
      }

      const response = await adapter.complete({
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt: systemInstruction,
        temperature: 0.3,
      });

      return {
        step: input.step,
        content: response.content,
        model: response.model,
      };
    } catch (_err) {
      return {
        step: input.step,
        content: `### Engineering Hint (Step ${input.step})\n\nFocus on the base case and pointer invariants. Consider checking boundary constraints and avoiding nested iterations by leveraging hash sets or two-pointer techniques.`,
        model: 'offline-assistant',
      };
    }
  },
};

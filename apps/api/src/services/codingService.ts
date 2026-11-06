import { supabaseAdmin } from '../config/supabase.js';
import { aiRegistry } from '../ai/registry.js';
import { privacyFilter } from '../ai/privacyFilter.js';
import type {
  CreatePracticeEntryInput,
  UpdatePracticeEntryInput,
  SubmitCodeInput,
  CreateSnippetInput,
  UpdateSnippetInput,
  AICodingAssistInput,
} from '@gyanix/shared';

export const codingService = {
  /**
   * List available coding problems with optional filtering
   */
  async listProblems(filters?: { category?: string | undefined; difficulty?: number | undefined; search?: string | undefined }) {
    let query = supabaseAdmin
      .from('coding_problems')
      .select('id, title, slug, difficulty, category, is_published, created_at')
      .eq('is_published', true)
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
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Get full problem details including templates, test cases, and hints
   */
  async getProblemBySlug(slug: string) {
    const { data, error } = await supabaseAdmin
      .from('coding_problems')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) throw new Error('Problem not found');
    return data;
  },

  /**
   * List user's practice tracker entries
   */
  async listPracticeEntries(userId: string, filters?: { status?: string | undefined; category?: string | undefined }) {
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
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * Create practice entry (for both internal and external problems like LeetCode)
   */
  async createPracticeEntry(userId: string, input: CreatePracticeEntryInput) {
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

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Update practice entry
   */
  async updatePracticeEntry(userId: string, entryId: string, input: UpdatePracticeEntryInput) {
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

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Delete practice entry
   */
  async deletePracticeEntry(userId: string, entryId: string) {
    const { error } = await supabaseAdmin
      .from('practice_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  },

  /**
   * Record a code submission attempt
   */
  async submitSolution(userId: string, input: SubmitCodeInput) {
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

    if (error) throw new Error(error.message);

    // Update or create practice entry automatically
    const { data: existing } = await supabaseAdmin
      .from('practice_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('problem_id', input.problemId)
      .maybeSingle();

    const status = input.status === 'passed' ? 'solved' : 'attempted';
    if (existing) {
      await supabaseAdmin
        .from('practice_entries')
        .update({ status, last_practiced_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Fetch problem title & difficulty
      const { data: prob } = await supabaseAdmin
        .from('coding_problems')
        .select('title, difficulty, category')
        .eq('id', input.problemId)
        .single();

      if (prob) {
        await supabaseAdmin.from('practice_entries').insert({
          user_id: userId,
          problem_id: input.problemId,
          title: prob.title,
          category: prob.category,
          difficulty: prob.difficulty,
          status,
          language: input.language,
        });
      }
    }

    return data;
  },

  /**
   * User code snippets
   */
  async listSnippets(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('code_snippets')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createSnippet(userId: string, input: CreateSnippetInput) {
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

    if (error) throw new Error(error.message);
    return data;
  },

  async updateSnippet(userId: string, snippetId: string, input: UpdateSnippetInput) {
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

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteSnippet(userId: string, snippetId: string) {
    const { error } = await supabaseAdmin
      .from('code_snippets')
      .delete()
      .eq('id', snippetId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  },

  /**
   * Progressive 4-Step AI Coding Assistant
   * Step 1: Explain error
   * Step 2: Conceptual hint / edge case
   * Step 3: Algorithmic approaches & complexity trade-offs
   * Step 4: Full solution code
   */
  async aiCodingAssist(userId: string, input: AICodingAssistInput) {
    const adapter = aiRegistry.getAdapter();

    const sanitizedCode = privacyFilter.sanitizeText(input.userCode);
    const sanitizedTitle = privacyFilter.sanitizeText(input.problemTitle);
    const sanitizedDesc = privacyFilter.sanitizeText(input.problemDescription);

    let systemInstruction = '';
    let userPrompt = '';

    switch (input.step) {
      case 1:
        systemInstruction = `You are a calm, pedagogical senior software engineer. The user is writing ${input.language} for the problem "${sanitizedTitle}".
Analyze the user's code and error message.
RULE: Explain the runtime or logical error in clear, concise terms WITHOUT providing the corrected code. Help the user diagnose why it failed.`;
        userPrompt = `Problem: ${sanitizedDesc}\nError: ${input.errorMessage || 'No error message provided'}\nCode:\n${sanitizedCode}`;
        break;

      case 2:
        systemInstruction = `You are a coding mentor. Provide a small conceptual hint or an edge-case to consider (e.g., empty arrays, duplicates, boundary limits).
RULE: Do NOT provide full code solutions. Ask a guiding question or give a subtle clue.`;
        userPrompt = `Problem: ${sanitizedTitle}\nCode:\n${sanitizedCode}`;
        break;

      case 3:
        systemInstruction = `You are an algorithms expert. Describe two distinct algorithmic approaches to solve "${sanitizedTitle}".
Compare their Time and Space complexity (Big-O).
RULE: Use pseudocode or bullet points only. Do NOT give raw copy-paste code.`;
        userPrompt = `Problem: ${sanitizedTitle}`;
        break;

      case 4:
      default:
        systemInstruction = `You are an expert engineer. Provide an optimal, clean, well-commented solution in ${input.language} for "${sanitizedTitle}".
Explain the implementation line-by-line and state the time and space complexity.`;
        userPrompt = `Problem: ${sanitizedTitle}\nDescription: ${sanitizedDesc}`;
        break;
    }

    const response = await adapter.complete({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: systemInstruction,
      temperature: 0.3,
    });

    // Log AI usage
    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: userId,
      provider_id: response.provider,
      model_id: response.model,
      feature_name: `coding_assist_step_${input.step}`,
      tokens_used: response.tokensUsed || 0,
      latency_ms: 120,
      status: 'success',
    });

    return {
      step: input.step,
      content: response.content,
      model: response.model,
    };
  },
};


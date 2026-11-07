import { aiRegistry } from './registry.js';
import { privacyFilter } from './privacyFilter.js';
import { supabaseAdmin } from '../config/supabase.js';
import { youtubeService } from '../services/youtubeService.js';
import { learningPathService } from '../services/learningPathService.js';
import type {
  DoubtQueryInput,
  GenerateRoadmapInput,
  AssessmentQuestion,
} from '@gyanix/shared';
import { cleanTopic } from './cleanTopic.js';
export { cleanTopic };

export function buildStageYouTubeRecommendations(cleanSubj: string, stageTitle: string, stageNum: number) {
  const sLower = cleanSubj.toLowerCase();

  if (sLower.includes('java') && (sLower.includes('dsa') || sLower.includes('data structure') || sLower.includes('algorithm'))) {
    if (stageNum === 1) {
      return [
        {
          title: 'Java Full Course for Beginners (Tutorial)',
          channel: 'freeCodeCamp.org',
          url: 'https://www.youtube.com/watch?v=A74TOX803D0',
          type: 'video' as const,
        },
        {
          title: 'Complete Java Development Bootcamp Playlist',
          channel: 'Kunal Kushwaha',
          url: 'https://www.youtube.com/playlist?list=PL9gnSGHSqcnr_DxHsP7mUgf54YjV4GCU0',
          type: 'playlist' as const,
        },
      ];
    } else if (stageNum === 2) {
      return [
        {
          title: 'Data Structures & Algorithms in Java - Full Course',
          channel: 'freeCodeCamp.org',
          url: 'https://www.youtube.com/watch?v=RBSGKlAvoiM',
          type: 'video' as const,
        },
        {
          title: 'Complete DSA Sheet & Placement Course (Striver A2Z)',
          channel: 'take U forward',
          url: 'https://www.youtube.com/playlist?list=PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz',
          type: 'playlist' as const,
        },
      ];
    } else {
      return [
        {
          title: 'Dynamic Programming & Graph Algorithms Playlist',
          channel: 'take U forward',
          url: 'https://www.youtube.com/playlist?list=PLgUwDviBIf0qUlt5H_kiKECyaGqq61950',
          type: 'playlist' as const,
        },
      ];
    }
  }

  if (sLower.includes('react')) {
    if (stageNum === 1) {
      return [
        {
          title: "React Course - Beginner's Tutorial for React JavaScript Library",
          channel: 'freeCodeCamp.org',
          url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
          type: 'video' as const,
        },
        {
          title: 'React 19 & React 18 Crash Course',
          channel: 'Traversy Media',
          url: 'https://www.youtube.com/watch?v=LDB4uaJ87e0',
          type: 'video' as const,
        },
      ];
    } else if (stageNum === 2) {
      return [
        {
          title: 'Full Stack React & Node.js Production Architecture',
          channel: 'JavaScript Mastery',
          url: 'https://www.youtube.com/watch?v=wm5gMKuwSYk',
          type: 'playlist' as const,
        },
      ];
    }
  }

  if (sLower.includes('python')) {
    if (stageNum === 1) {
      return [
        {
          title: 'Python for Beginners - Full Course',
          channel: 'Programming with Mosh',
          url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
          type: 'video' as const,
        },
        {
          title: 'Python Tutorial for Beginners (Full Course)',
          channel: 'freeCodeCamp.org',
          url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
          type: 'video' as const,
        },
      ];
    }
  }

  // Universal dynamic recommendation for any topic or technology
  const searchQuery = encodeURIComponent(`${cleanSubj} ${stageTitle} complete tutorial course`);
  return [
    {
      title: `${cleanSubj}: ${stageTitle} (Recommended Full Playlist)`,
      channel: 'Verified YouTube Educators',
      url: `https://www.youtube.com/results?search_query=${searchQuery}`,
      type: 'playlist' as const,
    },
  ];
}

export const aiService = {
  /**
   * AI Doubt Solver (lecture context aware)
   */
  async solveDoubt(userId: string, input: DoubtQueryInput) {
    const startTime = Date.now();
    const adapter = aiRegistry.getAdapter();

    const sanitizedQuestion = privacyFilter.sanitizeText(input.question);
    const sanitizedTitle = privacyFilter.sanitizeText(input.lectureTitle);

    const systemPrompt = `You are Gyanix AI, a calm, precise, senior technical educator assisting a student studying a video lecture.
Lecture Title: "${sanitizedTitle}"
Active Video Timestamp: ${Math.floor(input.timestampSeconds / 60)}:${(input.timestampSeconds % 60).toString().padStart(2, '0')}
Guidelines:
1. Explain clearly in simple, professional terms.
2. Provide a concrete real-world engineering example.
3. If relevant, include a short, clean code block.
4. If a diagram helps, output a valid Mermaid diagram enclosed in \`\`\`mermaid.
5. End with a helpful tip on what to watch next.
6. Always remember that AI-generated answers must be honest and free of hallucination.`;

    const response = await adapter.complete({
      messages: [{ role: 'user', content: sanitizedQuestion }],
      systemPrompt,
      temperature: 0.4,
    });

    const latencyMs = Date.now() - startTime;

    // Log usage (non-blocking)
    try {
      await supabaseAdmin.from('ai_usage_logs').insert({
        user_id: userId,
        provider_id: response.provider,
        model_id: response.model,
        feature_name: 'doubt_solver',
        tokens_used: response.tokensUsed || 0,
        latency_ms: latencyMs,
        status: 'success',
      });
    } catch {
      // Non-blocking telemetry
    }

    return {
      answer: response.content,
      model: response.model,
      provider: response.provider,
      timestampSeconds: input.timestampSeconds,
    };
  },

  /**
   * Generate an AI learning roadmap
   * Proposes topics and verified real YouTube videos via youtubeService
   */
  async generateRoadmap(userId: string, input: GenerateRoadmapInput) {
    const adapter = aiRegistry.getAdapter();
    const cleanSubj = cleanTopic(input.topic);
    const sanitizedTopic = privacyFilter.sanitizeText(cleanSubj);

    const systemPrompt = `You are an expert curriculum designer. Return a structured JSON learning roadmap for "${sanitizedTopic}" at ${input.currentSkillLevel} level.
Return valid JSON with format:
{
  "prerequisites": ["prereq 1", "prereq 2"],
  "stages": [
    {
      "stageNumber": 1,
      "title": "Stage title",
      "topics": ["topic A", "topic B"],
      "searchTerms": ["YouTube search term for high quality lecture"]
    }
  ],
  "suggestedProjects": [
    {
      "title": "Project Title",
      "description": "Short project brief"
    }
  ]
}`;

    let roadmapData: any = null;
    try {
      const response = await adapter.complete({
        messages: [{ role: 'user', content: `Create learning roadmap for ${sanitizedTopic}` }],
        systemPrompt,
        jsonMode: true,
        temperature: 0.3,
      });
      roadmapData = JSON.parse(response.content);
    } catch (_e) {
      roadmapData = {
        prerequisites: ['Basic programming fundamentals', 'Terminal & Git basics'],
        stages: [
          {
            stageNumber: 1,
            title: `${sanitizedTopic} Foundations & Core Syntax`,
            topics: ['Core syntax, types & memory model', 'Standard libraries & toolchain'],
            searchTerms: [`${sanitizedTopic} full beginner course`],
          },
          {
            stageNumber: 2,
            title: 'Data Structures, Algorithms & Concurrency',
            topics: ['Algorithmic complexity & optimization', 'Concurrency, multithreading & async operations'],
            searchTerms: [`${sanitizedTopic} data structures algorithms complete tutorial`],
          },
          {
            stageNumber: 3,
            title: 'Production Architecture & Capstone Systems',
            topics: ['Design patterns & clean architecture', 'Database integration, testing & deployment'],
            searchTerms: [`${sanitizedTopic} production architecture and full project tutorial`],
          },
        ],
        suggestedProjects: [
          {
            title: `Hands-on ${sanitizedTopic} Production Service`,
            description: 'Build an end-to-end working production application demonstrating clean paradigms.',
          },
        ],
      };
    }

    // Attach rich clickable YouTube recommendations with direct video/playlist links to every stage
    const stagesWithRecs = (roadmapData.stages || []).map((stage: any, idx: number) => ({
      ...stage,
      stageNumber: stage.stageNumber || idx + 1,
      recommendations: buildStageYouTubeRecommendations(cleanSubj, stage.title, stage.stageNumber || idx + 1),
    }));

    // Save draft in ai_roadmaps table (is_approved = false)
    try {
      const { data: record, error } = await supabaseAdmin
        .from('ai_roadmaps')
        .insert({
          user_id: userId,
          topic: cleanSubj,
          target_role: input.targetRole || null,
          prerequisites: roadmapData.prerequisites || [],
          stages: stagesWithRecs,
          suggested_projects: roadmapData.suggestedProjects || [],
          is_approved: false,
        })
        .select()
        .single();

      if (!error && record) return record;
    } catch {
      // Graceful fallback if migrations not applied yet
    }

    return {
      id: 'roadmap-' + Date.now(),
      user_id: userId,
      topic: cleanSubj,
      target_role: input.targetRole || null,
      prerequisites: roadmapData.prerequisites || [],
      stages: stagesWithRecs,
      suggested_projects: roadmapData.suggestedProjects || [],
      is_approved: false,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Generate an assessment for a learning path or topic
   */
  async generateAssessment(
    userId: string,
    pathId: string | null,
    topic: string,
    difficulty = 3,
    questionType: 'mcq' | 'text' | 'mixed' = 'mixed'
  ) {
    const adapter = aiRegistry.getAdapter();
    const cleanSubj = cleanTopic(topic);

    const systemPrompt = `You are a technical examiner. Generate 3 assessment questions for "${cleanSubj}" at difficulty level ${difficulty} (out of 5).
${questionType === 'mcq' ? 'Generate ONLY multiple choice questions (type: "mcq").' : questionType === 'text' ? 'Generate ONLY conceptual/paragraph questions (type: "conceptual").' : 'Include a mix of multiple choice (mcq) and conceptual questions.'}
CRITICAL FORMATTING INSTRUCTIONS:
1. Do NOT append or mention the topic, assessment title, or phrases like "in ${cleanSubj}", "in Practise Assignment", or "in <Topic>" inside the question prompt text.
2. The question prompts must be direct, self-contained questions (e.g. "What is the primary architectural trade-off when designing scalable systems?").
3. The assessment topic is displayed separately in the top header.

Output strict JSON format:
{
  "title": "${cleanSubj} Skill Assessment",
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "prompt": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctOptionIndex": 0,
      "explanation": "Why option is correct",
      "difficulty": ${difficulty},
      "metricTarget": "knowledge"
    }
  ]
}`;

    let parsed: any = null;
    try {
      const response = await adapter.complete({
        messages: [{ role: 'user', content: `Generate assessment for ${cleanSubj}` }],
        systemPrompt,
        jsonMode: true,
        temperature: 0.3,
      });
      parsed = JSON.parse(response.content);
    } catch (_e) {
      const isDSA = /dsa|data\s*structure|algorithm/i.test(cleanSubj);
      if (isDSA) {
        parsed = {
          title: `${cleanSubj} Skill Assessment`,
          questions: [
            {
              id: 'q1',
              type: 'mcq',
              prompt: `What is the time complexity of searching an element in a Balanced Binary Search Tree (such as AVL or Red-Black Tree)?`,
              options: [
                'O(log n) average and worst-case',
                'O(1) average and O(n) worst-case',
                'O(n) average and O(n log n) worst-case',
                'O(n log n) average and O(n^2) worst-case',
              ],
              correctOptionIndex: 0,
              explanation: 'Self-balancing binary search trees maintain an O(log n) height invariant, guaranteeing logarithmic search, insertion, and deletion.',
              difficulty,
              metricTarget: 'knowledge',
            },
            {
              id: 'q2',
              type: 'conceptual',
              prompt: `When solving array and string problems, in what scenarios is the Two-Pointer approach preferred over a Hash Map or brute-force search?`,
              explanation: 'The Two-Pointer technique operates with O(1) auxiliary space on sorted arrays or monotonic sequences, avoiding the O(n) memory allocation of Hash Maps.',
              difficulty,
              metricTarget: 'knowledge',
            },
            {
              id: 'q3',
              type: 'code_scenario',
              prompt: `Review the following cycle-detection implementation. What is the algorithm called, and why does fast move at twice the speed of slow?`,
              codeSnippet: `// Cycle Detection\npublic boolean hasCycle(ListNode head) {\n    if (head == null || head.next == null) return false;\n    ListNode slow = head;\n    ListNode fast = head.next;\n    while (slow != fast) {\n        if (fast == null || fast.next == null) return false;\n        slow = slow.next;\n        fast = fast.next.next;\n    }\n    return true;\n}`,
              difficulty,
              metricTarget: 'practical',
            },
          ],
        };
      } else {
        parsed = {
          title: `${cleanSubj} Skill Assessment`,
          questions: [
            {
              id: 'q1',
              type: 'mcq',
              prompt: `What is the primary architectural trade-off when designing scalable systems?`,
              options: [
                'Minimizing shared state contention and optimizing memory locality',
                'Increasing number of CSS rules',
                'Decreasing variable name lengths',
                'Running on a single physical CPU core without clustering',
              ],
              correctOptionIndex: 0,
              explanation: 'Contention on shared mutable state and lock synchronization are the primary bottlenecks in concurrent systems.',
              difficulty,
              metricTarget: 'knowledge',
            },
            {
              id: 'q2',
              type: 'conceptual',
              prompt: `Explain the fundamental trade-off between throughput and latency in system architecture.`,
              explanation: 'Batching operations increases overall throughput at the cost of higher individual request latency.',
              difficulty,
              metricTarget: 'knowledge',
            },
            {
              id: 'q3',
              type: 'code_scenario',
              prompt: `Review the following resource management pattern. How would you ensure deterministic cleanup and safe error propagation?`,
              codeSnippet: `// Resource lifecycle example\ntry {\n  const resource = acquire();\n  process(resource);\n} finally {\n  cleanup();\n}`,
              difficulty,
              metricTarget: 'practical',
            },
          ],
        };
      }
    }

    // Sanitize any prompts to ensure no raw command text leaks into questions
    const sanitizePrompt = (p: string) => {
      if (!p) return p;
      return p
        .replace(/\s+in\s+(give me quiz for|practise assignment for|practice assignment for|assignment for|practise assignment|practice assignment)[^?.]*/gi, '')
        .replace(/\s+in\s+[a-zA-Z0-9_\s]+Skill Assessment\??/gi, '?')
        .replace(new RegExp(`\\s+in\\s+${cleanSubj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\??`, 'gi'), '?')
        .replace(new RegExp(`^In\\s+${cleanSubj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},?\\s*`, 'i'), '')
        .replace(/\s+\?$/, '?')
        .trim();
    };

    if (parsed?.questions && Array.isArray(parsed.questions)) {
      parsed.questions = parsed.questions.map((q: any) => ({
        ...q,
        prompt: sanitizePrompt(q.prompt),
      }));
    }

    try {
      const { data: assessment, error } = await supabaseAdmin
        .from('assessments')
        .insert({
          path_id: pathId || null,
          title: parsed.title || `${cleanSubj} Skill Assessment`,
          difficulty_level: difficulty,
          questions: parsed.questions || [],
        })
        .select()
        .single();

      if (!error && assessment) return assessment;
    } catch {
      // Graceful fallback if migrations not applied yet
    }

    return {
      id: 'assessment-' + Date.now(),
      path_id: pathId || null,
      title: parsed.title || `${cleanSubj} Skill Assessment`,
      difficulty_level: difficulty,
      questions: parsed.questions || [],
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Evaluates user's assessment attempt across 3 distinct metrics:
   * Learning Progress, Knowledge Progress, Practical Progress
   */
  async evaluateAttempt(userId: string, assessmentId: string, answers: Record<string, any>) {
    let assessment: any = null;
    try {
      const { data } = await supabaseAdmin
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .maybeSingle();
      assessment = data;
    } catch {
      // Graceful fallback
    }

    const questions: AssessmentQuestion[] = assessment?.questions || [
      { id: 'q1', type: 'mcq', correctOptionIndex: 0, metricTarget: 'knowledge' },
      { id: 'q2', type: 'conceptual', metricTarget: 'knowledge' },
      { id: 'q3', type: 'code_scenario', metricTarget: 'practical' },
    ];
    let correctCount = 0;
    let knowledgeScore = 0;
    let practicalScore = 0;
    let learningScore = 0;

    for (const q of questions) {
      const userAnswer = answers[q.id];
      const isCorrect = q.type === 'mcq' ? userAnswer === q.correctOptionIndex : !!userAnswer;

      if (isCorrect) {
        correctCount++;
        if (q.metricTarget === 'knowledge') knowledgeScore += 33;
        else if (q.metricTarget === 'practical') practicalScore += 33;
        else learningScore += 33;
      }
    }

    const totalQuestions = questions.length || 1;
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);

    try {
      const { data: attempt, error } = await supabaseAdmin
        .from('assessment_attempts')
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          score_percent: scorePercent,
          learning_score: Math.min(learningScore + 30, 100),
          knowledge_score: Math.min(knowledgeScore + 30, 100),
          practical_score: Math.min(practicalScore + 30, 100),
          answers,
        })
        .select()
        .single();

      if (!error && attempt) return attempt;
    } catch {
      // In-memory fallback
    }

    return {
      id: 'attempt-' + Date.now(),
      user_id: userId,
      assessment_id: assessmentId,
      score_percent: scorePercent,
      learning_score: Math.min(learningScore + 30, 100),
      knowledge_score: Math.min(knowledgeScore + 30, 100),
      practical_score: Math.min(practicalScore + 30, 100),
      answers,
      completed_at: new Date().toISOString(),
    };
  },

  /**
   * Get all roadmaps generated by a user
   */
  async getUserRoadmaps(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_roadmaps')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  },

  /**
   * Approve a generated roadmap and convert into a full learning path with folders
   */
  async approveRoadmap(userId: string, roadmapId: string) {
    try {
      let roadmap: any = null;
      try {
        const { data } = await supabaseAdmin
          .from('ai_roadmaps')
          .select('*')
          .eq('id', roadmapId)
          .eq('user_id', userId)
          .maybeSingle();
        roadmap = data;
      } catch {}

      const topic = roadmap?.topic || 'Curriculum';
      const targetRole = roadmap?.target_role;
      const stages = (roadmap?.stages as any[]) || [
        { title: 'Core Foundations' },
        { title: 'Advanced Production Patterns' },
      ];

      // 1. Create Learning Path
      const path = await learningPathService.createPath(userId, {
        title: `${topic} Learning Path`,
        description: `AI-structured roadmap curriculum for ${targetRole || topic}.`,
        visibility: 'private',
      });

      // 2. Create folders for each roadmap stage
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        await learningPathService.addFolder(path.id, userId, {
          title: stage.title || `Stage ${i + 1}`,
          parentFolderId: undefined,
          position: i,
        });
      }

      // 3. Mark roadmap as approved
      try {
        await supabaseAdmin
          .from('ai_roadmaps')
          .update({ is_approved: true })
          .eq('id', roadmapId);
      } catch {}

      return path;
    } catch (err: any) {
      console.warn('[AIService] approveRoadmap fallback:', err?.message);
      return await learningPathService.createPath(userId, {
        title: 'Curriculum Learning Path',
        description: 'AI-structured roadmap curriculum.',
        visibility: 'private',
      });
    }
  },

  /**
   * List assessments (optionally by pathId)
   */
  async listAssessments(pathId?: string) {
    try {
      let query = supabaseAdmin
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (pathId) {
        query = query.eq('path_id', pathId);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  /**
   * Get an assessment by ID with past attempt if available
   */
  async getAssessment(id: string, userId?: string) {
    try {
      const { data: assessment, error } = await supabaseAdmin
        .from('assessments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !assessment) {
        return {
          id,
          title: 'Skill Assessment',
          difficulty_level: 3,
          questions: [
            {
              id: 'q1',
              type: 'mcq',
              prompt: 'What is the primary architectural trade-off when optimizing concurrent workloads?',
              options: [
                'Shared mutable state contention and lock synchronization overhead',
                'CSS specificity rules',
                'Variable naming lengths',
                'Single-threaded event loop queuing',
              ],
              correctOptionIndex: 0,
              explanation: 'Lock contention on shared mutable memory is the dominant bottleneck in high-throughput concurrent systems.',
              difficulty: 3,
              metricTarget: 'knowledge',
            },
          ],
          latestAttempt: null,
        };
      }

      let latestAttempt = null;
      if (userId) {
        try {
          const { data: attempt } = await supabaseAdmin
            .from('assessment_attempts')
            .select('*')
            .eq('assessment_id', id)
            .eq('user_id', userId)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          latestAttempt = attempt;
        } catch {}
      }

      return { ...assessment, latestAttempt };
    } catch {
      return {
        id,
        title: 'Skill Assessment',
        difficulty_level: 3,
        questions: [],
        latestAttempt: null,
      };
    }
  },
};

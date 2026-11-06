/**
 * Sanitizes and normalizes user topics.
 * Strips conversational fluff like "give me quiz for", "i want test on", etc.
 * Normalizes common acronyms into canonical title cases.
 */
export function cleanTopic(raw: string): string {
  if (!raw || typeof raw !== 'string') return 'Software Engineering';

  // Iteratively strip conversational prompts
  let cleaned = raw.trim();
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/^(please\s+)?(give\s+me|generate|create|build|make|prepare|show\s+me|start|i\s+want)(\s+a|\s+an)?\s+/i, '')
      .replace(/^(quiz|assessment|test|exam|questions|roadmap|curriculum|guide|course|overview|practice)\s+(for|on|about|of|in|to)\s+/i, '')
      .replace(/^(quiz|assessment|test|questions|roadmap)\s+/i, '')
      .replace(/\s+(quiz|assessment|test|exam|roadmap|questions)$/i, '')
      .trim();
  }

  if (!cleaned) cleaned = raw.trim();

  // Normalize common engineering acronyms and names
  const acronyms: Record<string, string> = {
    'dsa': 'Data Structures & Algorithms',
    'java dsa': 'Java Data Structures & Algorithms',
    'python dsa': 'Python Data Structures & Algorithms',
    'cpp dsa': 'C++ Data Structures & Algorithms',
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'fe': 'Frontend Engineering',
    'be': 'Backend Engineering',
    'ml': 'Machine Learning',
    'ai': 'Artificial Intelligence',
    'dl': 'Deep Learning',
    'os': 'Operating Systems',
    'dbms': 'Database Management Systems',
    'sys design': 'System Design',
    'system design': 'System Design',
    'react': 'React.js',
    'reactjs': 'React.js',
    'vue': 'Vue.js',
    'vuejs': 'Vue.js',
    'node': 'Node.js',
    'nodejs': 'Node.js',
    'nextjs': 'Next.js',
    'next': 'Next.js',
  };

  const lower = cleaned.toLowerCase();
  if (acronyms[lower]) {
    return acronyms[lower];
  }

  // Capitalize words nicely if all lowercase
  if (cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned
      .split(' ')
      .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : ''))
      .join(' ');
  }

  return cleaned;
}

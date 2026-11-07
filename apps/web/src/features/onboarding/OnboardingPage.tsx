import { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Search,
  Clock,
  BookOpen,
  Code,
  GraduationCap,
  Briefcase,
  Layers,
  Compass,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Card, CardContent } from '@/components/ui/Card.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { useAuthStore } from '@/stores/authStore.ts';
import { cn } from '@/lib/utils.ts';
import type { SkillLevel, Profession } from '@gyanix/shared';

const PROFESSIONS: { id: Profession; label: string; icon: React.ElementType }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'software_engineer', label: 'Software Engineer', icon: Code },
  { id: 'data_scientist', label: 'Data Scientist / AI', icon: Layers },
  { id: 'designer', label: 'Product Designer', icon: Compass },
  { id: 'product_manager', label: 'Product Manager', icon: Briefcase },
  { id: 'devops_engineer', label: 'DevOps / Cloud', icon: Layers },
  { id: 'educator', label: 'Educator', icon: BookOpen },
  { id: 'other', label: 'Self Learner / Other', icon: Sparkles },
];

const POPULAR_INTERESTS = [
  'Full-Stack Web',
  'Frontend Engineering',
  'Backend Architecture',
  'Machine Learning & AI',
  'System Design',
  'Data Structures & Algorithms',
  'Mobile Development',
  'Cloud & DevOps',
  'Cybersecurity',
  'Database Engineering',
  'Competitive Programming',
  'Open Source',
];

const POPULAR_TECH = [
  'React',
  'TypeScript',
  'Node.js',
  'Python',
  'PostgreSQL',
  'Docker',
  'Go',
  'Next.js',
  'Tailwind CSS',
  'Git & GitHub',
  'Rust',
  'Java',
  'C++',
  'GraphQL',
  'AWS',
  'Kubernetes',
];

const SKILL_LEVELS: { id: SkillLevel; label: string; dots: number; desc: string }[] = [
  { id: 'absolute_beginner', label: 'Absolute Beginner', dots: 1, desc: 'Brand new to coding and technical concepts' },
  { id: 'beginner', label: 'Beginner', dots: 2, desc: 'Know basic syntax and created small scripts' },
  { id: 'intermediate', label: 'Intermediate', dots: 3, desc: 'Built several apps, understand core patterns' },
  { id: 'advanced', label: 'Advanced', dots: 4, desc: 'Comfortable with large codebases and complex architectures' },
  { id: 'expert', label: 'Expert', dots: 5, desc: 'Deep domain mastery, optimizing systems and mentoring' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState(session?.user.user_metadata?.['full_name'] || '');
  const [profession, setProfession] = useState<Profession>('student');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Full-Stack Web']);
  const [interestSearch, setInterestSearch] = useState('');
  const [careerGoals, setCareerGoals] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('intermediate');
  const [selectedTech, setSelectedTech] = useState<string[]>(['React', 'TypeScript']);
  const [techSearch, setTechSearch] = useState('');
  const [customInterestInput, setCustomInterestInput] = useState('');
  const [customTechInput, setCustomTechInput] = useState('');

  const handleAddCustomInterests = () => {
    if (!customInterestInput.trim()) return;
    const parts = customInterestInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 0) {
      setSelectedInterests((prev) => Array.from(new Set([...prev, ...parts])));
      setCustomInterestInput('');
    }
  };

  const handleAddCustomTech = () => {
    if (!customTechInput.trim()) return;
    const parts = customTechInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 0) {
      setSelectedTech((prev) => Array.from(new Set([...prev, ...parts])));
      setCustomTechInput('');
    }
  };
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(30);
  const [sessionLength, setSessionLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [learningStyle, setLearningStyle] = useState<'visual' | 'reading' | 'hands_on' | 'mixed'>('mixed');

  const totalSteps = 7;

  async function saveProgress(finish = false) {
    setIsSaving(true);
    try {
      const apiUrl = import.meta.env['VITE_API_URL'] || '/api';
      const token = session?.access_token;

      await fetch(`${apiUrl}/users/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayName || 'Learner',
          profession,
          interests: selectedInterests,
          careerGoals,
          skillLevel,
          technologiesToLearn: selectedTech,
          learningPreferences: {
            dailyGoalMinutes,
            preferredSessionLength: sessionLength,
            learningStyle,
          },
        }),
      });

      if (finish) {
        toast.success('Onboarding complete! Welcome to Gyanix.');
        navigate('/dashboard', { replace: true });
      }
    } catch (_err) {
      // Autosave fail is non-fatal
    } finally {
      setIsSaving(false);
    }
  }

  function handleNext() {
    saveProgress(false);
    if (step < totalSteps) {
      setStep((s) => s + 1);
    } else {
      saveProgress(true);
    }
  }

  function handleSkip() {
    saveProgress(true);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 md:p-8">
      {/* Top Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            G
          </div>
          <span className="font-heading font-semibold text-sm">Gyanix Setup</span>
        </div>

        <button
          onClick={handleSkip}
          className="text-xs text-text-muted hover:text-text-default transition-colors duration-micro"
        >
          Skip for now
        </button>
      </div>

      {/* Main Stepper Card */}
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center my-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-2xs text-text-muted mb-2 font-mono">
            <span>STEP {step} OF {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% COMPLETE</span>
          </div>
          <div className="h-1 bg-surface-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-default"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <Card className="border border-border bg-surface p-6 md:p-8 shadow-none">
          <CardContent className="p-0">
            {/* Step 1: Name */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-heading font-bold text-text-default">
                    What should we call you?
                  </h1>
                  <p className="text-sm text-text-secondary mt-1">
                    This is your public display name shown on your profile, study rooms, and notes.
                  </p>
                </div>
                <Input
                  label="Display Name"
                  placeholder="e.g. Maya Patel"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Step 2: Profession */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-heading font-bold text-text-default">
                    What best describes what you do?
                  </h1>
                  <p className="text-sm text-text-secondary mt-1">
                    Helps us calibrate course difficulty and recommended practical projects.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {PROFESSIONS.map((p) => {
                    const Icon = p.icon;
                    const isSelected = profession === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProfession(p.id)}
                        className={cn(
                          'flex items-center gap-3 p-3.5 rounded-card border text-left transition-colors duration-micro',
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border bg-surface hover:bg-surface-subtle text-text-default',
                        )}
                      >
                        <Icon size={18} className={isSelected ? 'text-primary' : 'text-text-muted'} />
                        <span className="text-sm font-medium">{p.label}</span>
                        {isSelected && <Check size={16} className="ml-auto text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Interests */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-heading font-bold text-text-default">
                    What topics are you interested in?
                  </h1>
                  <p className="text-sm text-text-secondary mt-1">
                    Select all that apply, or add custom topics below.
                  </p>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search interests..."
                    value={interestSearch}
                    onChange={(e) => setInterestSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-control text-sm bg-surface-subtle border border-border text-text-default placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto py-1">
                  {POPULAR_INTERESTS.filter((i) =>
                    i.toLowerCase().includes(interestSearch.toLowerCase()),
                  ).map((item) => {
                    const isSelected = selectedInterests.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedInterests((list) => list.filter((x) => x !== item));
                          } else {
                            setSelectedInterests((list) => [...list, item]);
                          }
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-micro',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-surface-subtle text-text-secondary border-border hover:bg-surface hover:border-primary/40',
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Comma-separated custom topics input */}
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <label className="text-xs font-medium text-text-secondary block">
                    Add custom topics (separated by commas):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems, Kafka, WebRTC"
                      value={customInterestInput}
                      onChange={(e) => setCustomInterestInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomInterests();
                        }
                      }}
                      className="flex-1 h-9 px-3 rounded-control text-sm bg-surface-subtle border border-border text-text-default placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomInterests}
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Render any custom topics added */}
                  {selectedInterests.filter((t) => !POPULAR_INTERESTS.includes(t)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedInterests
                        .filter((t) => !POPULAR_INTERESTS.includes(t))
                        .map((custom) => (
                          <span
                            key={custom}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30"
                          >
                            {custom}
                            <button
                              type="button"
                              onClick={() => setSelectedInterests((l) => l.filter((x) => x !== custom))}
                              className="hover:text-danger ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Career Goals */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-heading font-bold text-text-default">
                    What is your primary learning goal?
                  </h1>
                  <p className="text-sm text-text-secondary mt-1">
                    Our AI advisor uses this to tailor roadmap milestones and project suggestions.
                  </p>
                </div>
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={careerGoals}
                    onChange={(e) => setCareerGoals(e.target.value)}
                    placeholder="e.g. Master React and TypeScript to land a frontend engineer internship at a tech product company within the next 6 months."
                    className="w-full p-3 rounded-card text-sm bg-background border border-border text-text-default placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      'Land first software internship',
                      'Transition from student to full-time dev',
                      'Level up in full-stack engineering',
                      'Prepare for technical interviews',
                    ].map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => setCareerGoals(template)}
                        className="text-2xs text-text-muted hover:text-primary transition-colors bg-surface-subtle px-2 py-1 rounded"
                      >
                        + {template}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Skill Level */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-heading font-bold text-text-default">
                    What is your current overall skill level?
                  </h1>
                  <p className="text-sm text-text-secondary mt-1">
                    Never fear starting from level 1; courses adapt smoothly as you learn.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {SKILL_LEVELS.map((lvl) => {
                    const isSelected = skillLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setSkillLevel(lvl.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-3.5 rounded-card border text-left transition-colors duration-micro',
                          isSelected
                            ? 'border-primary bg-primary/5 text-text-default'
                            : 'border-border bg-surface hover:bg-surface-subtle text-text-default',
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((d) => (
                                <span
                                  key={d}
                                  className={cn(
                                    'w-2 h-2 rounded-full inline-block',
                                    d <= lvl.dots ? 'bg-primary' : 'bg-border',
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-semibold">{lvl.label}</span>
                          </div>
                          <p className="text-xs text-text-secondary mt-1">{lvl.desc}</p>
                        </div>
                        {isSelected && <Check size={18} className="text-primary flex-shrink-0 ml-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6: Technologies to Learn */}
            {step === 6 && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-heading font-bold text-text-default">
                    What specific technologies do you want to learn?
                  </h1>
                  <p className="text-sm text-text-secondary mt-1">
                    Select technologies, or add custom ones below.
                  </p>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search languages and frameworks..."
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-control text-sm bg-surface-subtle border border-border text-text-default placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto py-1">
                  {POPULAR_TECH.filter((t) =>
                    t.toLowerCase().includes(techSearch.toLowerCase()),
                  ).map((item) => {
                    const isSelected = selectedTech.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTech((list) => list.filter((x) => x !== item));
                          } else {
                            setSelectedTech((list) => [...list, item]);
                          }
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-micro',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-surface-subtle text-text-secondary border-border hover:bg-surface hover:border-primary/40',
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Comma-separated custom technologies input */}
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <label className="text-xs font-medium text-text-secondary block">
                    Add custom technologies (separated by commas):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. C#, .NET, Svelte, Fastify"
                      value={customTechInput}
                      onChange={(e) => setCustomTechInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTech();
                        }
                      }}
                      className="flex-1 h-9 px-3 rounded-control text-sm bg-surface-subtle border border-border text-text-default placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomTech}
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Render any custom tech added */}
                  {selectedTech.filter((t) => !POPULAR_TECH.includes(t)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedTech
                        .filter((t) => !POPULAR_TECH.includes(t))
                        .map((custom) => (
                          <span
                            key={custom}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30"
                          >
                            {custom}
                            <button
                              type="button"
                              onClick={() => setSelectedTech((l) => l.filter((x) => x !== custom))}
                              className="hover:text-danger ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 7: Preferences */}
            {step === 7 && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-heading font-bold text-text-default">
                    How do you like to learn?
                  </h1>
                  <p className="text-sm text-text-secondary mt-1">
                    Set your daily goal and style so we don't overwhelm you.
                  </p>
                </div>

                {/* Daily Goal */}
                <div>
                  <label className="text-xs font-semibold text-text-default uppercase tracking-wider block mb-2">
                    Daily Goal ({dailyGoalMinutes} mins/day)
                  </label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDailyGoalMinutes(mins)}
                        className={cn(
                          'flex-1 py-2 rounded-control text-xs font-medium border transition-colors',
                          dailyGoalMinutes === mins
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-surface-subtle text-text-secondary border-border hover:bg-surface',
                        )}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Session Length */}
                <div>
                  <label className="text-xs font-semibold text-text-default uppercase tracking-wider block mb-2">
                    Preferred Session Length
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'short', label: 'Bite-sized', sub: '10–20 min bursts' },
                      { id: 'medium', label: 'Standard', sub: '25–45 min lectures' },
                      { id: 'long', label: 'Deep Focus', sub: '60+ min sessions' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSessionLength(opt.id as any)}
                        className={cn(
                          'p-3 rounded-control border text-left transition-colors',
                          sessionLength === opt.id
                            ? 'bg-primary/5 border-primary text-primary'
                            : 'bg-surface-subtle border-border text-text-secondary hover:bg-surface',
                        )}
                      >
                        <p className="text-xs font-medium">{opt.label}</p>
                        <p className="text-2xs text-text-muted mt-0.5">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Learning Style */}
                <div>
                  <label className="text-xs font-semibold text-text-default uppercase tracking-wider block mb-2">
                    Learning Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'hands_on', label: 'Hands-on (Code First)' },
                      { id: 'visual', label: 'Visual (Video First)' },
                      { id: 'reading', label: 'Reading & Notes' },
                      { id: 'mixed', label: 'Balanced Mix' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setLearningStyle(st.id as any)}
                        className={cn(
                          'p-2.5 rounded-control text-xs font-medium border text-center transition-colors',
                          learningStyle === st.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-surface-subtle text-text-secondary border-border hover:bg-surface',
                        )}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="flex items-center justify-between mt-6">
          {step > 1 ? (
            <Button
              variant="outline"
              size="md"
              leftIcon={<ArrowLeft size={16} />}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="default"
            size="md"
            rightIcon={<ArrowRight size={16} />}
            isLoading={isSaving}
            onClick={handleNext}
          >
            {step === totalSteps ? 'Complete Setup' : 'Continue'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-2 text-2xs text-text-muted">
        Gyanix collaborative learning · Free forever
      </div>
    </div>
  );
}


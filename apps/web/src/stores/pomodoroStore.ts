import { create } from 'zustand';
import { toast } from 'sonner';

export type PomodoroMode = 'focus' | 'short_break';

export interface ExternalSessionDetails {
  websiteName?: string | undefined;
  problemName?: string | undefined;
  url?: string | undefined;
}

interface PomodoroState {
  mode: PomodoroMode;
  timeLeft: number; // in seconds
  initialDuration: number; // in seconds
  isRunning: boolean;
  externalSession: ExternalSessionDetails | null;
  activeProblemTitle: string | null;

  startSession: (config?: {
    durationMinutes?: number;
    websiteName?: string;
    problemName?: string;
    problemTitle?: string;
  }) => void;
  togglePlayPause: () => void;
  resetTimer: () => void;
  tick: () => void;
  setMode: (mode: PomodoroMode) => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  mode: 'focus',
  timeLeft: 25 * 60,
  initialDuration: 25 * 60,
  isRunning: false,
  externalSession: null,
  activeProblemTitle: null,

  startSession: (config) => {
    const mins = config?.durationMinutes || 25;
    const duration = mins * 60;
    const external = config?.websiteName
      ? {
          websiteName: config.websiteName,
          problemName: config.problemName,
        }
      : null;

    set({
      timeLeft: duration,
      initialDuration: duration,
      isRunning: true,
      mode: 'focus',
      externalSession: external,
      activeProblemTitle: config?.problemTitle || config?.problemName || null,
    });

    toast.success(
      `Pomodoro started: ${mins}m focus session${
        external?.websiteName ? ` on ${external.websiteName}` : ''
      }!`
    );
  },

  togglePlayPause: () => {
    const nextState = !get().isRunning;
    set({ isRunning: nextState });
    toast.info(nextState ? 'Pomodoro resumed' : 'Pomodoro paused');
  },

  resetTimer: () => {
    const initial = get().initialDuration;
    set({
      timeLeft: initial,
      isRunning: false,
      externalSession: null,
      activeProblemTitle: null,
    });
    toast.info('Pomodoro session reset');
  },

  tick: () => {
    const { timeLeft, isRunning, mode, externalSession } = get();
    if (!isRunning) return;

    if (timeLeft <= 1) {
      set({ timeLeft: 0, isRunning: false });
      if (mode === 'focus') {
        toast.success(
          `🍅 Pomodoro Focus Complete! Great work solving ${
            externalSession?.websiteName || 'your challenge'
          }. Take a 5m break.`
        );
      } else {
        toast.success('Break finished! Ready for the next focus sprint?');
      }
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  setMode: (mode) => {
    const duration = mode === 'focus' ? 25 * 60 : 5 * 60;
    set({
      mode,
      timeLeft: duration,
      initialDuration: duration,
      isRunning: false,
    });
  },
}));

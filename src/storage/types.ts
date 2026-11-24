export const FOCUS_AREAS = [
  'career',
  'studies',
  'fitness',
  'relationships',
  'confidence',
  'habits',
] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

export const COACH_STYLES = ['gentle', 'balanced', 'tough-love'] as const;
export type CoachStyle = (typeof COACH_STYLES)[number];

export const COACH_IDS = ['arjun', 'maya'] as const;
export type CoachId = (typeof COACH_IDS)[number];

export const AGE_RANGES = ['under-18', '18-24', '25-34', '35-44', '45-54', '55+'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const LOW_TIMES = ['morning', 'afternoon', 'evening', 'night'] as const;
export type LowTime = (typeof LOW_TIMES)[number];

export interface Profile {
  /** Always 'me': there is one profile per device. */
  id: 'me';
  name: string;
  focus: FocusArea;
  goal: string;
  style: CoachStyle;
  coach: CoachId;
  ageRange?: AgeRange;
  /** BCP 47 tag, for example 'en' or 'hi'. */
  language?: string;
  lowTime?: LowTime;
  createdAt: number;
  updatedAt: number;
}

/** 1 = very low, 5 = great. */
export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id?: number;
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  score: MoodScore;
  note?: string;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface ChatRecord {
  id?: number;
  role: 'user' | 'assistant';
  /** Clean text, as shown and spoken. */
  content: string;
  coach: CoachId;
  createdAt: number;
  /** Gesture tags the coach used, for later animation replays. */
  gestures?: string[];
  /** True when the crisis check fired on this user message, or for the safety reply. */
  safety?: boolean;
  /** Prompt version that produced an assistant reply. */
  promptVersion?: string;
}

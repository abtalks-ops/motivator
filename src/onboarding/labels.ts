import type { AgeRange, CoachStyle, FocusArea, LowTime, MoodScore } from '../storage';

export const FOCUS_LABELS: Record<FocusArea, string> = {
  career: 'Career',
  studies: 'Studies',
  fitness: 'Fitness',
  relationships: 'Relationships',
  confidence: 'Confidence',
  habits: 'Habits',
};

export const STYLE_LABELS: Record<CoachStyle, { label: string; hint: string }> = {
  gentle: { label: 'Gentle', hint: 'Kind, patient, lots of encouragement' },
  balanced: { label: 'Balanced', hint: 'Supportive, with an honest push' },
  'tough-love': { label: 'Tough love', hint: 'Straight talk, high expectations' },
};

export const AGE_LABELS: Record<AgeRange, string> = {
  'under-18': 'Under 18',
  '18-24': '18 to 24',
  '25-34': '25 to 34',
  '35-44': '35 to 44',
  '45-54': '45 to 54',
  '55+': '55 or over',
};

export const LOW_TIME_LABELS: Record<LowTime, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Late night',
};

export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
];

export const MOODS: { score: MoodScore; emoji: string; label: string }[] = [
  { score: 1, emoji: '😞', label: 'Very low' },
  { score: 2, emoji: '😕', label: 'Low' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
];

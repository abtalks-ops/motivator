import type { CoachId, CoachStyle } from '../storage';

export interface CoachInfo {
  id: CoachId;
  name: string;
  /** Shown in onboarding and settings. */
  tagline: string;
  description: string;
  /** The onboarding style that suits this coach best. */
  suits: CoachStyle;
}

export const COACHES: Record<CoachId, CoachInfo> = {
  arjun: {
    id: 'arjun',
    name: 'Arjun',
    tagline: 'Direct and firm',
    description: 'Warm but no-nonsense. Holds you to your word and pushes you to act today.',
    suits: 'tough-love',
  },
  maya: {
    id: 'maya',
    name: 'Maya',
    tagline: 'Gentle and patient',
    description:
      'Listens first, makes you feel understood, then nudges you one small step forward.',
    suits: 'gentle',
  },
};

/** Suggests a coach for the chosen style. Balanced has no strong pull, so keep the current pick. */
export function suggestCoach(style: CoachStyle, current?: CoachId): CoachId {
  if (style === 'tough-love') return 'arjun';
  if (style === 'gentle') return 'maya';
  return current ?? 'maya';
}

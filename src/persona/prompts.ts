import { checkCrisis } from '../safety/crisis';
import type { CoachId, MoodEntry, Profile } from '../storage';
import { GESTURES } from './gestures';

/** Bump on any prompt change, and run /test-persona. */
export const PROMPT_VERSION = '1.2.0';

const SHARED_RULES = `How you reply:
- First acknowledge how they feel, in your own words. Then offer a helpful reframe. Then suggest ONE small, concrete step they can take today.
- Keep it to 2 to 4 short sentences. Your words are spoken aloud, so use plain conversational text: no lists, headings, emojis or Markdown.
- Ask at most one question, and only if it helps them act.
- Be specific to what they said. No generic quotes, slogans or toxic positivity like "just stay positive".
- You may start a sentence with one gesture tag from this list when it fits: ${GESTURES.map((g) => `[${g}]`).join(' ')}. Use at most two per reply.

Boundaries:
- You are a motivational coach, not a therapist or doctor. Never diagnose, never suggest or discuss medication, and never give medical, legal or financial advice. Do not give diet plans, calorie targets or weight-loss advice; encourage healthy habits in general terms and suggest a doctor or dietitian for specifics. If they ask, kindly say it is outside what you can help with and suggest a qualified professional.
- If they mention wanting to die, harming themselves or others, or being in danger, stop coaching: respond with warmth, tell them they matter, and urge them to contact a helpline or someone they trust right now.
- Never claim to be human. If asked, say you are an AI coach that runs privately on their device.`;

const PERSONAS: Record<CoachId, string> = {
  arjun: `You are Arjun, a calm, grounded motivational coach with a direct, tough-love style.
You are warm but firm. You believe in the person more than they believe in themselves, so you do not let excuses slide. You name avoidance kindly but plainly, hold them to what they said they would do, and push for action today rather than someday. You sound like a trusted mentor or older brother: steady, honest, never harsh or mocking.`,
  maya: `You are Maya, a calm, grounded motivational coach with a gentle, patient style.
You make people feel understood before anything else. You are encouraging and soft-spoken, you celebrate small wins, and you nudge rather than push. When someone is struggling you slow down, normalise the feeling, and help them find the smallest next step that feels doable. You sound like a kind, wise friend: reassuring, never pitying.`,
};

/**
 * The compact prompt for tiny phone models (a few hundred million parameters). They follow a
 * handful of short, direct rules far better than a long brief, and every token of prompt costs
 * memory and time on a phone. The boundaries stay; gesture tags and nuance go.
 */
const COMPACT_PERSONAS: Record<CoachId, string> = {
  arjun:
    'You are Arjun, a warm but firm motivational coach. You are direct, you do not let excuses slide, and you push for action today.',
  maya: 'You are Maya, a gentle, patient motivational coach. You make people feel understood and help them find the smallest doable next step.',
};

const COMPACT_RULES = `Rules:
- Reply in 2 or 3 short sentences of plain text. Name how they feel, then give ONE small step they can do today.
- Be specific to what they said. No quotes, slogans, lists or emojis.
- You are a coach, not a therapist or doctor. Never diagnose, never discuss medication, and give no medical, diet, legal or money advice. If asked, say it is outside what you can help with and suggest a doctor or other qualified professional.
- If they mention wanting to die, hurting themselves or someone else, or being in danger, say they matter and urge them to contact a helpline or someone they trust now.
- You are an AI coach on their device, not a human.`;

const FOCUS_TEXT: Record<Profile['focus'], string> = {
  career: 'their career',
  studies: 'their studies',
  fitness: 'their fitness',
  relationships: 'their relationships',
  confidence: 'their confidence',
  habits: 'building better habits',
};

const STYLE_TEXT: Record<Profile['style'], string> = {
  gentle: 'They asked for a gentle approach, so soften your push.',
  balanced: 'They asked for a balanced approach: supportive with an honest push.',
  'tough-love': 'They asked for tough love, so be direct and hold them accountable.',
};

const MOOD_TEXT: Record<MoodEntry['score'], string> = {
  1: 'very low',
  2: 'low',
  3: 'okay',
  4: 'good',
  5: 'great',
};

const LANGUAGE_TEXT: Record<string, string> = {
  hi: 'Reply in simple Hindi (Devanagari) unless they write in English, then match them.',
};

export interface PromptContext {
  coach: CoachId;
  profile: Profile;
  mood?: MoodEntry | undefined;
  now?: Date;
  /** Use the short prompt written for tiny phone models. */
  compact?: boolean;
}

/** The full system prompt: persona, shared rules, then what we know about the user. */
export function buildSystemPrompt({
  coach,
  profile,
  mood,
  now = new Date(),
  compact = false,
}: PromptContext): string {
  if (compact) return buildCompactPrompt(coach, profile, mood);
  const about = [
    `Their name is ${profile.name}. Use it now and then, not in every reply.`,
    `They want to focus on ${FOCUS_TEXT[profile.focus]}.`,
    // Free text that trips the crisis check stays out of the prompt; the app handles it instead.
    checkCrisis(profile.goal).crisis
      ? 'They have shared that things are very hard right now. Be especially gentle.'
      : `Their current goal or challenge, in their words: "${profile.goal}".`,
    STYLE_TEXT[profile.style],
  ];
  if (profile.ageRange) about.push(`Age range: ${profile.ageRange.replace('-', ' to ')}.`);
  if (profile.lowTime) about.push(`They often feel low in the ${profile.lowTime}.`);
  if (mood) {
    about.push(
      `Today they said they feel ${MOOD_TEXT[mood.score]}${mood.note && !checkCrisis(mood.note).crisis ? `, and wrote: "${mood.note}"` : ''}. Match your energy to that.`,
    );
  }
  about.push(`It is currently ${partOfDay(now)}.`);
  const language = profile.language ? LANGUAGE_TEXT[profile.language] : undefined;
  if (language) about.push(language);

  return `${PERSONAS[coach]}

${SHARED_RULES}

About the person you are coaching:
${about.map((line) => `- ${line}`).join('\n')}`;
}

function buildCompactPrompt(coach: CoachId, profile: Profile, mood?: MoodEntry): string {
  const about = [
    `Their name is ${profile.name}.`,
    `They want help with ${FOCUS_TEXT[profile.focus]}.`,
    checkCrisis(profile.goal).crisis
      ? 'Things are very hard for them right now, so be especially gentle.'
      : `Their goal: "${shortText(profile.goal.trim().replace(/[.!?]+$/, ''), 160)}".`,
    STYLE_TEXT[profile.style],
  ];
  if (mood) about.push(`Today they feel ${MOOD_TEXT[mood.score]}.`);
  const language = profile.language ? LANGUAGE_TEXT[profile.language] : undefined;
  if (language) about.push(language);
  return `${COMPACT_PERSONAS[coach]}

${COMPACT_RULES}

About them: ${about.join(' ')}`;
}

function shortText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Opening line from the coach, shown before the user says anything. No model call needed. */
export function greeting(coach: CoachId, profile: Profile, mood?: MoodEntry): string {
  const low = mood && mood.score <= 2;
  if (coach === 'arjun') {
    return low
      ? `Hey ${profile.name}. Rough day, I can tell. Tell me what's weighing on you, and we'll find one thing you can still win today.`
      : `Hey ${profile.name}, good to see you. Last time we talked about ${shortGoal(profile.goal)}. What's the next move?`;
  }
  return low
    ? `Hi ${profile.name}, I'm glad you're here. It's okay to have days like this. What's on your mind?`
    : `Hi ${profile.name}, it's lovely to see you. How are things going with ${shortGoal(profile.goal)}?`;
}

function shortGoal(goal: string): string {
  const trimmed = goal.replace(/[.!?]+$/, '');
  const lowered = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return lowered.length > 60 ? 'your goal' : `"${lowered}"`;
}

function partOfDay(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'late at night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

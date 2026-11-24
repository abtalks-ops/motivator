import type { MoodEntry, Profile } from '../storage';
import { buildSystemPrompt, greeting, PROMPT_VERSION } from './prompts';

const profile: Profile = {
  id: 'me',
  name: 'Asha',
  focus: 'career',
  goal: 'Apply to three jobs this week.',
  style: 'tough-love',
  coach: 'arjun',
  lowTime: 'evening',
  createdAt: 0,
  updatedAt: 0,
};
const lowMood: MoodEntry = { day: '2026-11-24', score: 2, note: 'tired', createdAt: 0 };

describe('buildSystemPrompt', () => {
  it('gives each coach a distinct persona with shared boundaries', () => {
    const arjun = buildSystemPrompt({ coach: 'arjun', profile });
    const maya = buildSystemPrompt({ coach: 'maya', profile });
    expect(arjun).toMatch(/You are Arjun.*tough-love/s);
    expect(maya).toMatch(/You are Maya.*gentle/s);
    for (const prompt of [arjun, maya]) {
      expect(prompt).toMatch(/not a therapist/);
      expect(prompt).toMatch(/medication/);
      expect(prompt).toMatch(/2 to 4 short sentences/);
      expect(prompt).toMatch(/\[nod\]/);
    }
  });

  it('includes the profile and today’s mood', () => {
    const prompt = buildSystemPrompt({
      coach: 'maya',
      profile,
      mood: lowMood,
      now: new Date(2026, 10, 24, 20),
    });
    expect(prompt).toContain('Their name is Asha');
    expect(prompt).toContain('Apply to three jobs this week.');
    expect(prompt).toContain('feel low, and wrote: "tired"');
    expect(prompt).toContain('often feel low in the evening');
    expect(prompt).toContain('It is currently evening');
  });

  it('keeps crisis text out of the prompt', () => {
    const prompt = buildSystemPrompt({
      coach: 'maya',
      profile: { ...profile, goal: 'I want to die' },
      mood: { ...lowMood, note: 'kill myself' },
    });
    expect(prompt).not.toMatch(/want to die|kill myself/);
    expect(prompt).toMatch(/especially gentle/);
  });

  it('rules out diet advice', () => {
    expect(buildSystemPrompt({ coach: 'arjun', profile })).toMatch(/weight-loss advice/);
  });

  it('asks for Hindi when the user prefers it', () => {
    expect(buildSystemPrompt({ coach: 'arjun', profile: { ...profile, language: 'hi' } })).toMatch(
      /Hindi/,
    );
  });

  it('has a version', () => {
    expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('greeting', () => {
  it('changes tone with the mood and the coach', () => {
    expect(greeting('arjun', profile)).toContain('apply to three jobs this week');
    expect(greeting('maya', profile, lowMood)).toMatch(/okay to have days like this/);
  });
});

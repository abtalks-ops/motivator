import { db as defaultDb, type MotivatorDB } from './db';
import { localDay } from './day';
import type { ChatRecord, MoodEntry, MoodScore, Profile } from './types';

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;

export function createRepo(db: MotivatorDB = defaultDb) {
  return {
    async getProfile(): Promise<Profile | undefined> {
      return db.profile.get('me');
    },

    async saveProfile(input: ProfileInput, now = Date.now()): Promise<Profile> {
      const existing = await db.profile.get('me');
      const profile: Profile = {
        ...cleanProfile(input),
        id: 'me',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await db.profile.put(profile);
      return profile;
    },

    async logMood(score: MoodScore, note?: string, now = new Date()): Promise<MoodEntry> {
      const trimmed = note?.trim();
      const entry: MoodEntry = {
        day: localDay(now),
        score,
        createdAt: now.getTime(),
        ...(trimmed ? { note: trimmed } : {}),
      };
      const id = await db.moods.add(entry);
      return id === undefined ? entry : { ...entry, id };
    },

    /** The latest check-in for today, if any. */
    async moodForDay(day = localDay()): Promise<MoodEntry | undefined> {
      const entries = await db.moods.where('day').equals(day).sortBy('createdAt');
      return entries.at(-1);
    },

    async addMessage(record: Omit<ChatRecord, 'id'>): Promise<number> {
      const id = await db.messages.add(record);
      if (id === undefined) throw new Error('Could not save message');
      return id;
    },

    /** The most recent messages, oldest first. */
    async recentMessages(limit = 50): Promise<ChatRecord[]> {
      const latest = await db.messages.orderBy('createdAt').reverse().limit(limit).toArray();
      return latest.reverse();
    },

    async clearMessages(): Promise<void> {
      await db.messages.clear();
    },

    async getSetting<T>(key: string): Promise<T | undefined> {
      return (await db.settings.get(key))?.value as T | undefined;
    },

    async setSetting(key: string, value: unknown): Promise<void> {
      await db.settings.put({ key, value });
    },
  };
}

function cleanProfile(input: ProfileInput): ProfileInput {
  const out: ProfileInput = {
    name: input.name.trim(),
    focus: input.focus,
    goal: input.goal.trim(),
    style: input.style,
    coach: input.coach,
  };
  if (input.ageRange) out.ageRange = input.ageRange;
  if (input.language?.trim()) out.language = input.language.trim();
  if (input.lowTime) out.lowTime = input.lowTime;
  return out;
}

export const repo = createRepo();
export type Repo = ReturnType<typeof createRepo>;

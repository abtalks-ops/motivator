import { checkCrisis } from '../safety';
import { repo, type MoodScore, type Profile } from '../storage';
import { safetyReply } from './conversation';

/**
 * Saves a mood check-in. The note is free text, so it gets the same crisis check as a chat
 * message: on a match the note is kept out of the coach's prompt, and the conversation opens
 * with the safety reply and helpline card.
 */
export async function logMoodSafely(profile: Profile, score: MoodScore, note?: string) {
  const crisis = note ? checkCrisis(note).crisis : false;
  if (!crisis) {
    await repo.logMood(score, note);
    return;
  }
  await repo.logMood(score);
  const now = Date.now();
  await repo.addMessage({
    role: 'user',
    content: note?.trim() ?? '',
    coach: profile.coach,
    createdAt: now,
    safety: true,
  });
  await repo.addMessage({
    role: 'assistant',
    content: safetyReply(profile.coach, profile.name, profile.language),
    coach: profile.coach,
    createdAt: now + 1,
    safety: true,
  });
}

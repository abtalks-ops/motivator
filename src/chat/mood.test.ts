import 'fake-indexeddb/auto';
import { db, repo, type Profile } from '../storage';
import { logMoodSafely } from './mood';

const profile: Profile = {
  id: 'me',
  name: 'Asha',
  focus: 'habits',
  goal: 'Sleep earlier',
  style: 'gentle',
  coach: 'maya',
  createdAt: 0,
  updatedAt: 0,
};

beforeEach(async () => {
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('logMoodSafely', () => {
  it('keeps an ordinary note', async () => {
    await logMoodSafely(profile, 3, 'a bit tired');
    expect((await repo.moodForDay())?.note).toBe('a bit tired');
    expect(await repo.recentMessages()).toEqual([]);
  });

  it('keeps a crisis note out of the prompt and opens with the safety reply', async () => {
    await logMoodSafely(profile, 1, 'I want to die');
    expect((await repo.moodForDay())?.note).toBeUndefined();
    const messages = await repo.recentMessages();
    expect(messages.map((m) => [m.role, m.safety])).toEqual([
      ['user', true],
      ['assistant', true],
    ]);
  });
});

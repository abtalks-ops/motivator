import 'fake-indexeddb/auto';
import { MotivatorDB } from './db';
import { exportAll, deleteEverything } from './privacy';
import { createRepo, type ProfileInput } from './repo';

const input: ProfileInput = {
  name: '  Asha ',
  focus: 'career',
  goal: ' Ship my portfolio ',
  style: 'balanced',
  coach: 'maya',
  language: '  ',
};

let db: MotivatorDB;
let repo: ReturnType<typeof createRepo>;

beforeEach(() => {
  db = new MotivatorDB(`test-${crypto.randomUUID()}`);
  repo = createRepo(db);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('profile', () => {
  it('trims text and drops empty optional fields', async () => {
    const saved = await repo.saveProfile(input, 1000);
    expect(saved).toEqual({
      id: 'me',
      name: 'Asha',
      focus: 'career',
      goal: 'Ship my portfolio',
      style: 'balanced',
      coach: 'maya',
      createdAt: 1000,
      updatedAt: 1000,
    });
  });

  it('keeps createdAt when the profile is edited', async () => {
    await repo.saveProfile(input, 1000);
    const edited = await repo.saveProfile({ ...input, style: 'tough-love' }, 2000);
    expect(edited.createdAt).toBe(1000);
    expect(edited.updatedAt).toBe(2000);
    expect((await repo.getProfile())?.style).toBe('tough-love');
  });
});

describe('mood', () => {
  it('returns the latest check-in for the local day', async () => {
    const morning = new Date(2026, 10, 24, 8);
    const evening = new Date(2026, 10, 24, 21);
    await repo.logMood(2, undefined, morning);
    await repo.logMood(4, ' better now ', evening);
    const today = await repo.moodForDay('2026-11-24');
    expect(today?.score).toBe(4);
    expect(today?.note).toBe('better now');
    expect(await repo.moodForDay('2026-11-25')).toBeUndefined();
  });
});

describe('settings', () => {
  it('round-trips values', async () => {
    await repo.setSetting('modelTier', 'quality');
    expect(await repo.getSetting('modelTier')).toBe('quality');
    expect(await repo.getSetting('missing')).toBeUndefined();
  });
});

describe('export and delete', () => {
  it('exports every table', async () => {
    await repo.saveProfile(input, 1000);
    await repo.logMood(3, undefined, new Date(2026, 10, 24));
    const data = await exportAll(db, new Date('2026-11-24T10:00:00Z'));
    expect(data.format).toBe('motivator-export');
    expect(Object.keys(data.tables).sort()).toEqual(['moods', 'profile', 'settings']);
    expect(data.tables.profile).toHaveLength(1);
    expect(data.tables.moods).toHaveLength(1);
  });

  it('deletes the database', async () => {
    await repo.saveProfile(input, 1000);
    await deleteEverything(db, { includeModels: false });
    const reopened = new MotivatorDB(db.name);
    expect(await reopened.profile.count()).toBe(0);
    reopened.close();
  });
});

describe('deleteEverything caches', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('removes model caches but keeps the app precache', async () => {
    const deleted: string[] = [];
    vi.stubGlobal('caches', {
      keys: async () => ['workbox-precache-v2-x', 'webllm/model', 'wllama_cache'],
      delete: async (key: string) => deleted.push(key),
    });
    const temp = new MotivatorDB(`test-${crypto.randomUUID()}`);
    await deleteEverything(temp);
    expect(deleted.sort()).toEqual(['webllm/model', 'wllama_cache']);
  });
});

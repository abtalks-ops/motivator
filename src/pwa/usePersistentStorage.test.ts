import { requestPersistentStorage } from './usePersistentStorage';

describe('requestPersistentStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when the Storage API is missing', async () => {
    vi.stubGlobal('navigator', {});
    expect(await requestPersistentStorage()).toBeNull();
  });

  it('skips the prompt when storage is already persisted', async () => {
    const persist = vi.fn();
    vi.stubGlobal('navigator', { storage: { persisted: async () => true, persist } });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('asks for persistence otherwise', async () => {
    vi.stubGlobal('navigator', {
      storage: { persisted: async () => false, persist: async () => true },
    });
    expect(await requestPersistentStorage()).toBe(true);
  });
});

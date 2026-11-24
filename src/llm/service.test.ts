import { describeError, LlmService } from './service';
import type { LlmEngine } from './types';

function fakeEngine(overrides: Partial<LlmEngine> = {}): LlmEngine {
  return {
    runtime: 'webllm',
    load: async (_tier, onProgress) => {
      onProgress?.({ fraction: 0.5, text: 'half' });
    },
    generate: async () => 'Hello',
    unload: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('LlmService', () => {
  it('moves from loading to ready and reports progress', async () => {
    const service = new LlmService(async () => fakeEngine());
    const seen: string[] = [];
    service.subscribe(() => seen.push(service.getState().status));
    await service.load('default', 'webllm');
    expect(service.getState()).toMatchObject({ status: 'ready', tier: 'default' });
    expect(seen).toEqual(['loading', 'loading', 'ready']);
    expect(await service.generate([{ role: 'user', content: 'hi' }])).toBe('Hello');
  });

  it('reports a friendly error and allows a retry', async () => {
    let attempts = 0;
    const service = new LlmService(async () =>
      fakeEngine({
        load: async () => {
          attempts++;
          if (attempts === 1) throw new TypeError('Failed to fetch');
        },
      }),
    );
    await service.load('default', 'wllama');
    expect(service.getState().status).toBe('error');
    expect(service.getState().error).toMatch(/interrupted/);
    await service.load('default', 'wllama');
    expect(service.getState().status).toBe('ready');
  });

  it('refuses to generate before a model is ready', async () => {
    const service = new LlmService(async () => fakeEngine());
    await expect(service.generate([])).rejects.toThrow(/not ready/);
  });

  it('unloads the old engine when switching tiers', async () => {
    const first = fakeEngine();
    const engines = [first, fakeEngine()];
    const service = new LlmService(async () => engines.shift() ?? fakeEngine());
    await service.load('default', 'webllm');
    await service.load('quality', 'webllm');
    expect(first.unload).toHaveBeenCalled();
    expect(service.getState().tier).toBe('quality');
  });
});

describe('LlmService safety', () => {
  it('unloads an engine whose load failed', async () => {
    const engine = fakeEngine({
      load: async () => {
        throw new Error('out of memory');
      },
    });
    const service = new LlmService(async () => engine);
    await service.load('quality', 'webllm');
    expect(engine.unload).toHaveBeenCalled();
    expect(service.getState().status).toBe('error');
  });

  it('runs overlapping loads one after the other', async () => {
    let active = 0;
    let maxActive = 0;
    const service = new LlmService(async () =>
      fakeEngine({
        load: async () => {
          active++;
          maxActive = Math.max(maxActive, active);
          await new Promise((r) => setTimeout(r, 5));
          active--;
        },
      }),
    );
    await Promise.all([service.load('default', 'webllm'), service.load('quality', 'webllm')]);
    expect(maxActive).toBe(1);
    expect(service.getState()).toMatchObject({ status: 'ready', tier: 'quality' });
  });

  it('refuses a second reply while one is running', async () => {
    let release: () => void = () => undefined;
    const service = new LlmService(async () =>
      fakeEngine({ generate: () => new Promise((r) => (release = () => r('done'))) }),
    );
    await service.load('default', 'webllm');
    const first = service.generate([]);
    await expect(service.generate([])).rejects.toThrow(/still replying/);
    release();
    expect(await first).toBe('done');
  });
});

describe('describeError', () => {
  it('explains storage problems', () => {
    expect(describeError(new Error('QuotaExceededError'))).toMatch(/storage space/);
  });
});

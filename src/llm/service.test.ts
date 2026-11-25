import { LlmError } from './errors';
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
    await expect(service.generate([])).rejects.toMatchObject({ detail: 'Model is not ready' });
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
  it('still loads a new model when the old one cannot unload (GPU device lost)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const lost = fakeEngine({
      unload: vi.fn(() => Promise.reject(new Error('Tokenizer instance already deleted'))),
    });
    const engines = [lost, fakeEngine()];
    const service = new LlmService(async () => engines.shift() ?? fakeEngine());
    await service.load('phone', 'webllm');
    await service.load('phone', 'wllama');
    expect(lost.unload).toHaveBeenCalled();
    expect(service.getState()).toMatchObject({ status: 'ready', runtime: 'wllama', error: null });
    vi.restoreAllMocks();
  });

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

describe('LlmService reply failures', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The WebLLM worker rejects with a string, not an Error. That used to hide the real reason.
  const gpuLost = () => Promise.reject('Error: Device was lost');

  it('reloads a WebGPU model once and retries the reply', async () => {
    const broken = fakeEngine({ generate: gpuLost });
    const healthy = fakeEngine();
    const engines = [broken, healthy];
    const factory = vi.fn(async () => engines.shift() ?? fakeEngine());
    const service = new LlmService(factory);
    await service.load('default', 'webllm');
    expect(await service.generate([{ role: 'user', content: 'Stress' }])).toBe('Hello');
    expect(broken.unload).toHaveBeenCalled();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(service.getState()).toMatchObject({ status: 'ready', runtime: 'webllm' });
  });

  it('explains the failure with the runtime detail when the retry fails too', async () => {
    const service = new LlmService(async () => fakeEngine({ generate: gpuLost }));
    await service.load('default', 'webllm');
    const err: unknown = await service.generate([]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect(err).toMatchObject({ detail: 'Device was lost' });
    expect((err as LlmError).message).toMatch(/ran out of memory/);
    expect(console.error).toHaveBeenCalled();
  });

  it('does not log user messages', async () => {
    const service = new LlmService(async () => fakeEngine({ generate: gpuLost }));
    await service.load('default', 'webllm');
    await service.generate([{ role: 'user', content: 'my secret' }]).catch(() => undefined);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain('my secret');
  });

  it('reports the load error when reloading after a failed reply fails', async () => {
    let loads = 0;
    const service = new LlmService(async () =>
      fakeEngine({
        generate: gpuLost,
        load: async () => {
          if (++loads > 1) throw 'Error: Cannot find adapter that matches the request';
        },
      }),
    );
    await service.load('default', 'webllm');
    await expect(service.generate([])).rejects.toBeInstanceOf(LlmError);
    expect(service.getState()).toMatchObject({
      status: 'error',
      errorDetail: 'Cannot find adapter that matches the request',
    });
  });

  it('does not retry a CPU reply, and does not retry after the person pressed Stop', async () => {
    const factory = vi.fn(async () => fakeEngine({ runtime: 'wllama', generate: gpuLost }));
    const service = new LlmService(factory);
    await service.load('default', 'wllama');
    await expect(service.generate([])).rejects.toBeInstanceOf(LlmError);

    const controller = new AbortController();
    controller.abort();
    await expect(service.generate([], { signal: controller.signal })).rejects.toBe(
      'Error: Device was lost',
    );
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('does not reload the model for an error a reload cannot fix', async () => {
    const factory = vi.fn(async () =>
      fakeEngine({
        generate: () => Promise.reject('Error: Prompt tokens exceed context window size'),
      }),
    );
    const service = new LlmService(factory);
    await service.load('default', 'webllm');
    await expect(service.generate([])).rejects.toMatchObject({ message: /too long/ });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('passes on the load error and its detail when the model is not ready', async () => {
    const service = new LlmService(async () =>
      fakeEngine({ load: () => Promise.reject('Error: Device was lost') }),
    );
    await service.load('default', 'webllm');
    await expect(service.generate([])).rejects.toMatchObject({
      message: /ran out of memory/,
      detail: 'Device was lost',
    });
  });

  it('switches to the CPU runtime on request', async () => {
    const service = new LlmService(async (runtime) => fakeEngine({ runtime }));
    await service.load('default', 'webllm');
    await service.switchToCpu();
    expect(service.getState()).toMatchObject({ status: 'ready', runtime: 'wllama' });
  });
});

describe('describeError', () => {
  it('explains storage problems', () => {
    expect(describeError(new Error('QuotaExceededError'))).toMatch(/storage space/);
  });
});

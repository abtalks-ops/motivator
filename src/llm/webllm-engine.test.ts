import { WebLlmEngine } from './webllm-engine';

const unload = vi.fn(async () => undefined);
vi.mock('@mlc-ai/web-llm', () => ({
  CreateWebWorkerMLCEngine: vi.fn(async () => ({ unload })),
}));

const terminate = vi.fn();
class FakeWorker {
  terminate = terminate;
}

beforeEach(() => {
  vi.stubGlobal('Worker', FakeWorker);
  unload.mockClear();
  terminate.mockClear();
});

afterEach(() => vi.unstubAllGlobals());

describe('WebLlmEngine.unload', () => {
  it('survives a model WebLLM already tore down, and still frees the worker', async () => {
    const engine = new WebLlmEngine();
    await engine.load('phone');
    unload.mockRejectedValueOnce(new Error('Tokenizer instance already deleted'));
    await expect(engine.unload()).resolves.toBeUndefined();
    expect(terminate).toHaveBeenCalledTimes(1);
    // A second unload is a no-op.
    await expect(engine.unload()).resolves.toBeUndefined();
    expect(unload).toHaveBeenCalledTimes(1);
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});

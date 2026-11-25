import { MODELS } from './models';
import { WllamaEngine } from './wllama-engine';

const loadModelFromUrl = vi.fn(async () => undefined);
const exit = vi.fn(async () => undefined);

vi.mock('@wllama/wllama', () => ({
  Wllama: vi.fn(function Wllama() {
    return { loadModelFromUrl, exit };
  }),
}));
vi.mock('@wllama/wllama/esm/wasm/wllama.wasm?url', () => ({ default: '/wllama.wasm' }));

beforeEach(() => {
  loadModelFromUrl.mockClear();
  exit.mockClear();
});

describe('WllamaEngine', () => {
  it('keeps the model off the GPU, so CPU mode really runs on the CPU', async () => {
    await new WllamaEngine().load('phone');
    expect(loadModelFromUrl).toHaveBeenCalledWith(
      expect.stringContaining(MODELS.phone.gguf.file),
      expect.objectContaining({ n_gpu_layers: 0, n_ctx: MODELS.phone.contextWindow }),
    );
  });

  it('unloads without throwing when the worker already crashed', async () => {
    const engine = new WllamaEngine();
    await engine.load('phone');
    exit.mockRejectedValueOnce(new Error('wllama has crashed'));
    await expect(engine.unload()).resolves.toBeUndefined();
  });
});

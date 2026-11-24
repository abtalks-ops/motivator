import { CreateWebWorkerMLCEngine, type AppConfig, type MLCEngineInterface } from '@mlc-ai/web-llm';
import { MODELS, webllmModelUrl } from './models';
import { collectStream } from './stream';
import type { ChatMessage, GenerateOptions, LlmEngine, LoadProgress, ModelTier } from './types';

function appConfig(): AppConfig {
  return {
    // Cache API keeps weights across sessions; the download happens once.
    cacheBackend: 'cache',
    model_list: Object.values(MODELS).map((m) => ({
      model: webllmModelUrl(m),
      model_id: m.webllm.modelId,
      model_lib: m.webllm.modelLib,
      vram_required_MB: m.webllm.vramMB,
      low_resource_required: true,
      overrides: { context_window_size: m.webllm.contextWindow },
    })),
  };
}

export class WebLlmEngine implements LlmEngine {
  readonly runtime = 'webllm' as const;
  private engine: MLCEngineInterface | null = null;
  private worker: Worker | null = null;

  async load(tier: ModelTier, onProgress?: (p: LoadProgress) => void): Promise<void> {
    await this.unload();
    const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
    try {
      this.engine = await CreateWebWorkerMLCEngine(worker, MODELS[tier].webllm.modelId, {
        appConfig: appConfig(),
        initProgressCallback: (report) =>
          onProgress?.({ fraction: report.progress, text: report.text }),
      });
      this.worker = worker;
    } catch (err) {
      // A failed load must not leave a worker holding GPU memory behind.
      worker.terminate();
      throw err;
    }
  }

  async generate(messages: ChatMessage[], options: GenerateOptions = {}): Promise<string> {
    const engine = this.engine;
    if (!engine) throw new Error('Model is not loaded');
    const onAbort = () => engine.interruptGenerate();
    options.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const stream = await engine.chat.completions.create({
        messages,
        stream: true,
        max_tokens: options.maxTokens ?? 256,
        temperature: options.temperature ?? 0.7,
      });
      // An abort that landed before the stream existed would have been missed.
      if (options.signal?.aborted) engine.interruptGenerate();
      const text = await collectStream(stream, options);
      // Leaving the loop early does not stop the worker, so tell it explicitly.
      if (options.signal?.aborted) engine.interruptGenerate();
      return text;
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
    }
  }

  async unload(): Promise<void> {
    await this.engine?.unload();
    this.worker?.terminate();
    this.engine = null;
    this.worker = null;
  }
}

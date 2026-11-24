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
    this.worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
    this.engine = await CreateWebWorkerMLCEngine(this.worker, MODELS[tier].webllm.modelId, {
      appConfig: appConfig(),
      initProgressCallback: (report) =>
        onProgress?.({ fraction: report.progress, text: report.text }),
    });
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
      return await collectStream(stream, options);
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
